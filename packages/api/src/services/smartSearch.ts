import { supabase } from '../lib/supabase';
import { ApiResponse, ApiError } from '@yardpass/types';

export interface SmartSearchFilters {
  category_id?: string;
  location?: { lat: number; lng: number; radius?: number };
  date_range?: { start: string; end: string };
  price_range?: { min: number; max: number };
  tags?: string[];
  access_level?: string;
}

export interface SearchAnalytics {
  user_id?: string;
  session_id: string;
  query: string;
  search_type: 'global' | 'events' | 'users' | 'organizations';
  results_count: number;
  has_results: boolean;
  search_time_ms: number;
  filters_applied: Record<string, any>;
  clicked_result_id?: string;
  clicked_result_type?: string;
  position_clicked?: number;
}

export interface SearchSuggestion {
  query: string;
  suggestion_type: 'trending' | 'popular' | 'related';
  target_id?: string;
  target_type?: string;
  relevance_score: number;
  usage_count: number;
}

export class SmartSearchService {
  /**
   * Enhanced semantic search with personalization
   */
  static async semanticSearch(
    query: string,
    userId?: string,
    filters: SmartSearchFilters = {},
    limit: number = 20
  ): Promise<ApiResponse<{
    events: any[];
    users: any[];
    organizations: any[];
    suggestions: SearchSuggestion[];
    meta: {
      total_results: number;
      search_time_ms: number;
      personalized: boolean;
    };
  }>> {
    const startTime = Date.now();
    
    try {
      // Track search analytics
      const searchAnalytics: SearchAnalytics = {
        session_id: this.generateSessionId(),
        query,
        search_type: 'global',
        results_count: 0,
        has_results: false,
        search_time_ms: 0,
        filters_applied: filters,
        user_id: userId,
      };

      // Get personalized preferences if user is logged in
      let userPreferences = null;
      if (userId) {
        userPreferences = await this.getUserPreferences(userId);
      }

      // Perform multi-table search
      const [events, users, organizations] = await Promise.all([
        this.searchEvents(query, filters, userPreferences, limit),
        this.searchUsers(query, filters, limit),
        this.searchOrganizations(query, filters, limit),
      ]);

      // Get smart suggestions
      const suggestions = await this.getSearchSuggestions(query, userId);

      const totalResults = events.length + users.length + organizations.length;
      const searchTime = Date.now() - startTime;

      // Update analytics
      searchAnalytics.results_count = totalResults;
      searchAnalytics.has_results = totalResults > 0;
      searchAnalytics.search_time_ms = searchTime;

      // Store search analytics
      await this.trackSearchAnalytics(searchAnalytics);

      return {
        success: true,
        data: {
          events,
          users,
          organizations,
          suggestions,
          meta: {
            total_results: totalResults,
            search_time_ms: searchTime,
            personalized: !!userPreferences,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Smart search failed',
      };
    }
  }

  /**
   * Search events with semantic understanding and personalization
   */
  private static async searchEvents(
    query: string,
    filters: SmartSearchFilters,
    userPreferences: any,
    limit: number
  ): Promise<any[]> {
    let searchQuery = supabase
      .from('events')
      .select(`
        *,
        org:orgs(name, slug, is_verified),
        tickets(id, name, price, quantity_available)
      `)
      .eq('status', 'published')
      .eq('visibility', 'public');

    // Apply semantic search using full-text search
    const searchTerms = this.expandSearchTerms(query);
    const searchVector = searchTerms.map(term => `%${term}%`).join('|');
    
    searchQuery = searchQuery.or(
      `title.ilike.${searchVector},description.ilike.${searchVector},city.ilike.${searchVector},venue.ilike.${searchVector}`
    );

    // Apply filters
    if (filters.category_id) {
      searchQuery = searchQuery.eq('category_id', filters.category_id);
    }

    if (filters.location) {
      const { lat, lng, radius = 50 } = filters.location;
      searchQuery = searchQuery.rpc('nearby_events', {
        lat_param: lat,
        lng_param: lng,
        radius_param: radius * 1609.34, // Convert miles to meters
      });
    }

    if (filters.date_range) {
      searchQuery = searchQuery
        .gte('start_at', filters.date_range.start)
        .lte('end_at', filters.date_range.end);
    }

    if (filters.price_range) {
      searchQuery = searchQuery
        .gte('tickets.price', filters.price_range.min)
        .lte('tickets.price', filters.price_range.max);
    }

    // Apply personalization if user preferences exist
    if (userPreferences?.preferred_categories?.length > 0) {
      searchQuery = searchQuery.in('category_id', userPreferences.preferred_categories);
    }

    const { data, error } = await searchQuery
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Score and sort results based on relevance
    const scoredResults = data?.map(event => ({
      ...event,
      relevance_score: this.calculateEventRelevance(event, query, userPreferences),
    })).sort((a, b) => b.relevance_score - a.relevance_score) || [];

    return scoredResults;
  }

  /**
   * Search users with enhanced matching
   */
  private static async searchUsers(
    query: string,
    filters: SmartSearchFilters,
    limit: number
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        user_id,
        username,
        display_name,
        bio,
        avatar_url,
        verified,
        followers_count,
        following_count
      `)
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;

    return data?.map(user => ({
      ...user,
      relevance_score: this.calculateUserRelevance(user, query),
    })).sort((a, b) => b.relevance_score - a.relevance_score) || [];
  }

  /**
   * Search organizations with enhanced matching
   */
  private static async searchOrganizations(
    query: string,
    filters: SmartSearchFilters,
    limit: number
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('orgs')
      .select(`
        id,
        name,
        slug,
        description,
        logo_url,
        website_url,
        is_verified,
        created_at
      `)
      .or(`name.ilike.%${query}%,slug.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;

    return data?.map(org => ({
      ...org,
      relevance_score: this.calculateOrgRelevance(org, query),
    })).sort((a, b) => b.relevance_score - a.relevance_score) || [];
  }

  /**
   * Get smart search suggestions
   */
  static async getSearchSuggestions(
    query: string,
    userId?: string
  ): Promise<SearchSuggestion[]> {
    try {
      // Get trending suggestions
      const { data: trending } = await supabase
        .from('search_suggestions')
        .select('*')
        .eq('suggestion_type', 'trending')
        .order('usage_count', { ascending: false })
        .limit(5);

      // Get popular suggestions
      const { data: popular } = await supabase
        .from('search_suggestions')
        .select('*')
        .eq('suggestion_type', 'popular')
        .order('usage_count', { ascending: false })
        .limit(5);

      // Get related suggestions based on query
      const { data: related } = await supabase
        .from('search_suggestions')
        .select('*')
        .eq('suggestion_type', 'related')
        .ilike('query', `%${query}%`)
        .order('relevance_score', { ascending: false })
        .limit(3);

      // Combine and deduplicate suggestions
      const allSuggestions = [...(trending || []), ...(popular || []), ...(related || [])];
      const uniqueSuggestions = this.deduplicateSuggestions(allSuggestions);

      return uniqueSuggestions.slice(0, 8);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Track search analytics for ML training
   */
  static async trackSearchAnalytics(analytics: SearchAnalytics): Promise<void> {
    try {
      await supabase
        .from('search_analytics')
        .insert(analytics);
    } catch (error) {
      console.error('Error tracking search analytics:', error);
    }
  }

  /**
   * Track search result clicks
   */
  static async trackSearchClick(
    sessionId: string,
    resultId: string,
    resultType: string,
    position: number
  ): Promise<void> {
    try {
      await supabase
        .from('search_analytics')
        .update({
          clicked_result_id: resultId,
          clicked_result_type: resultType,
          position_clicked: position,
        })
        .eq('session_id', sessionId);
    } catch (error) {
      console.error('Error tracking search click:', error);
    }
  }

  /**
   * Get user preferences for personalization
   */
  private static async getUserPreferences(userId: string): Promise<any> {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('preferences, stats')
        .eq('user_id', userId)
        .single();

      return data;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  /**
   * Expand search terms for semantic understanding
   */
  private static expandSearchTerms(query: string): string[] {
    const terms = [query.toLowerCase()];
    
    // Add common variations
    const variations: Record<string, string[]> = {
      'concert': ['music', 'live', 'show', 'performance'],
      'festival': ['event', 'celebration', 'gathering'],
      'conference': ['meeting', 'summit', 'workshop'],
      'workshop': ['class', 'training', 'session'],
      'party': ['celebration', 'gathering', 'social'],
    };

    const queryLower = query.toLowerCase();
    for (const [key, values] of Object.entries(variations)) {
      if (queryLower.includes(key)) {
        terms.push(...values);
      }
    }

    return [...new Set(terms)];
  }

  /**
   * Calculate event relevance score
   */
  private static calculateEventRelevance(event: any, query: string, userPreferences: any): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    // Title match (highest weight)
    if (event.title?.toLowerCase().includes(queryLower)) score += 10;
    
    // Description match
    if (event.description?.toLowerCase().includes(queryLower)) score += 5;
    
    // Category match
    if (event.category?.name?.toLowerCase().includes(queryLower)) score += 8;
    
    // Location match
    if (event.city?.toLowerCase().includes(queryLower)) score += 6;
    if (event.venue?.toLowerCase().includes(queryLower)) score += 6;

    // Personalization bonus
    if (userPreferences?.preferred_categories?.includes(event.category_id)) {
      score += 3;
    }

    // Recency bonus (events starting soon get higher score)
    const daysUntilEvent = Math.ceil((new Date(event.start_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilEvent >= 0 && daysUntilEvent <= 7) score += 2;
    if (daysUntilEvent >= 8 && daysUntilEvent <= 30) score += 1;

    return score;
  }

  /**
   * Calculate user relevance score
   */
  private static calculateUserRelevance(user: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    if (user.username?.toLowerCase().includes(queryLower)) score += 10;
    if (user.display_name?.toLowerCase().includes(queryLower)) score += 8;
    if (user.bio?.toLowerCase().includes(queryLower)) score += 5;

    // Verified users get bonus
    if (user.verified) score += 2;

    return score;
  }

  /**
   * Calculate organization relevance score
   */
  private static calculateOrgRelevance(org: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    if (org.name?.toLowerCase().includes(queryLower)) score += 10;
    if (org.slug?.toLowerCase().includes(queryLower)) score += 8;
    if (org.description?.toLowerCase().includes(queryLower)) score += 5;

    // Verified organizations get bonus
    if (org.is_verified) score += 2;

    return score;
  }

  /**
   * Generate unique session ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Deduplicate search suggestions
   */
  private static deduplicateSuggestions(suggestions: SearchSuggestion[]): SearchSuggestion[] {
    const seen = new Set();
    return suggestions.filter(suggestion => {
      const key = suggestion.query.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
