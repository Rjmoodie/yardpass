import { supabase } from '@/services/supabase';
import { 
  SmartSearchRequest, 
  SmartSearchResponse, 
  LocationIntelligenceRequest, 
  LocationIntelligenceResponse,
  ContentRecommendationRequest,
  ContentRecommendationResponse,
  SearchAnalytics,
  SearchSuggestion,
  GeoPoint,
  LocationInsights,
  GeographicAudience,
  ContentRecommendation,
  TrendingContent,
  EventContent
} from '@yardpass/types';

// Smart Services API Client
export class SmartServicesAPI {
  private static baseUrl = 'https://jysyzpgbrretxsvjvqmp.supabase.co';

  /**
   * Smart Search with AI-powered semantic search
   */
  static async smartSearch(request: SmartSearchRequest): Promise<SmartSearchResponse> {
    try {
      // For now, we'll use the existing search service but enhance it with smart features
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          org:orgs(name, slug, is_verified),
          tickets(id, name, price, quantity_available)
        `)
        .or(`title.ilike.%${request.query}%,description.ilike.%${request.query}%,city.ilike.%${request.query}%`)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .order('start_at', { ascending: true })
        .limit(request.limit || 20);

      if (error) throw error;

      // Track search analytics
      await this.trackSearchAnalytics({
        query: request.query,
        query_length: request.query.length,
        search_type: request.type || 'global',
        results_count: data?.length || 0,
        has_results: (data?.length || 0) > 0,
        filters_applied: request.filters || {}
      });

      return {
        success: true,
        data: {
          events: data || [],
          meta: {
            total: data?.length || 0,
            query: request.query,
            searchTime: 0
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Smart search failed'
      };
    }
  }

  /**
   * Track search analytics for personalization
   */
  static async trackSearchAnalytics(analytics: Omit<SearchAnalytics, 'id' | 'user_id' | 'session_id' | 'timestamp'>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('search_analytics')
        .insert({
          user_id: user?.id,
          session_id: `session_${Date.now()}`,
          query: analytics.query,
          query_length: analytics.query_length,
          search_type: analytics.search_type,
          results_count: analytics.results_count,
          has_results: analytics.has_results,
          filters_applied: analytics.filters_applied
        });
    } catch (error) {
      console.error('Failed to track search analytics:', error);
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  static async getSearchSuggestions(query: string, limit: number = 5): Promise<SearchSuggestion[]> {
    try {
      const { data, error } = await supabase
        .from('search_suggestions')
        .select('*')
        .or(`query.ilike.%${query}%`)
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * Location Intelligence - Find nearby events
   */
  static async getNearbyEvents(location: GeoPoint, radius: number = 10): Promise<LocationIntelligenceResponse> {
    try {
      const { data, error } = await supabase
        .rpc('nearby_events', {
          lat_param: location.latitude,
          lng_param: location.longitude,
          radius_param: radius * 1000 // Convert km to meters
        });

      if (error) throw error;

      return {
        success: true,
        data: {
          events: data || [],
          insights: {
            totalEvents: data?.length || 0,
            averageDistance: this.calculateAverageDistance(data),
            popularCategories: this.getPopularCategories(data)
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Location intelligence failed'
      };
    }
  }

  /**
   * Content Recommendations - Personalized content
   */
  static async getPersonalizedRecommendations(userId: string, limit: number = 10): Promise<ContentRecommendationResponse> {
    try {
      // Get user's search history and preferences
      const { data: searchHistory } = await supabase
        .from('search_analytics')
        .select('query, filters_applied')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(10);

      // Get trending content
      const { data: trendingEvents } = await supabase
        .from('events')
        .select(`
          *,
          org:orgs(name, slug, is_verified)
        `)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(limit);

      return {
        success: true,
        data: {
          recommendations: trendingEvents?.map(event => ({
            id: event.id,
            type: 'event',
            title: event.title,
            description: event.description,
            relevanceScore: this.calculatePersonalizedScore(event, searchHistory),
            metadata: {
              category: event.category,
              startDate: event.start_at,
              location: event.city
            }
          })) || [],
          trending: trendingEvents?.slice(0, 5) || []
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Content recommendations failed'
      };
    }
  }

  // Helper methods
  private static calculateAverageDistance(events: any[]): number {
    if (!events || events.length === 0) return 0;
    const totalDistance = events.reduce((sum, event) => sum + (event.distance_meters || 0), 0);
    return totalDistance / events.length;
  }

  private static getPopularCategories(events: any[]): string[] {
    if (!events || events.length === 0) return [];
    const categoryCount = events.reduce((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);
  }

  private static calculatePersonalizedScore(event: any, searchHistory: any[]): number {
    let score = 0.5; // Base score

    // Boost based on search history
    if (searchHistory) {
      const relevantSearches = searchHistory.filter(search => 
        search.query.toLowerCase().includes(event.category?.toLowerCase()) ||
        search.query.toLowerCase().includes(event.city?.toLowerCase())
      );
      score += relevantSearches.length * 0.1;
    }

    // Boost for recent events
    const daysUntilEvent = Math.ceil((new Date(event.start_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilEvent <= 7) score += 0.2;
    else if (daysUntilEvent <= 30) score += 0.1;

    return Math.min(score, 1.0);
  }
}
