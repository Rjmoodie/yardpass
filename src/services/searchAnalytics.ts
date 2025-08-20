// ✅ NEW: Search Analytics Service for tracking and optimizing search performance
import { supabase } from './supabase';

export interface SearchAnalyticsData {
  query: string;
  queryLength: number;
  searchType: string;
  resultsCount: number;
  hasResults: boolean;
  searchTimeMs: number;
  filtersApplied: Record<string, any>;
  clickedResultId?: string;
  clickedResultType?: string;
  positionClicked?: number;
  userId?: string;
  sessionId: string;
  timestamp: string;
}

export interface SearchAnalyticsSummary {
  totalSearches: number;
  averageSearchTime: number;
  zeroResultRate: number;
  popularQueries: Array<{ query: string; count: number; avgResults: number }>;
  searchTrends: Array<{ date: string; searches: number }>;
  clickThroughRate: number;
  averagePositionClicked: number;
  topResultTypes: Array<{ type: string; count: number }>;
}

export interface SearchSuggestion {
  query: string;
  suggestionType: 'trending' | 'popular' | 'related';
  targetId?: string;
  targetType?: string;
  relevanceScore: number;
  usageCount: number;
}

export class SearchAnalyticsService {
  private static instance: SearchAnalyticsService;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): SearchAnalyticsService {
    if (!SearchAnalyticsService.instance) {
      SearchAnalyticsService.instance = new SearchAnalyticsService();
    }
    return SearchAnalyticsService.instance;
  }

  /**
   * ✅ TRACK: Record search analytics data
   */
  async trackSearch(analyticsData: Omit<SearchAnalyticsData, 'sessionId' | 'timestamp'>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const data: SearchAnalyticsData = {
        ...analyticsData,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        userId: user?.id
      };

      await supabase
        .from('search_analytics')
        .insert(data);

    } catch (error) {
      console.error('Failed to track search analytics:', error);
      // Don't throw error - analytics failure shouldn't break search
    }
  }

  /**
   * ✅ TRACK: Record search result click
   */
  async trackResultClick(
    query: string,
    resultId: string,
    resultType: string,
    position: number
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const clickData = {
        user_id: user?.id || null,
        session_id: this.sessionId,
        query: query.toLowerCase(),
        clicked_result_id: resultId,
        clicked_result_type: resultType,
        position_clicked: position,
        timestamp: new Date().toISOString()
      };

      // Update analytics with click data
      await supabase
        .from('search_analytics')
        .update(clickData)
        .eq('query', query.toLowerCase())
        .eq('session_id', this.sessionId)
        .is('clicked_result_id', null);

    } catch (error) {
      console.error('Failed to track result click:', error);
    }
  }

  /**
   * ✅ ANALYZE: Get search analytics summary
   */
  async getSearchAnalyticsSummary(
    timeRange: 'day' | 'week' | 'month' = 'week',
    userId?: string
  ): Promise<SearchAnalyticsSummary> {
    try {
      let query = supabase
        .from('search_analytics')
        .select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Add time range filter
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      query = query.gte('timestamp', startDate.toISOString());

      const { data, error } = await query;

      if (error) throw error;

      return this.processAnalyticsData(data || []);
    } catch (error) {
      console.error('Failed to get search analytics:', error);
      throw error;
    }
  }

  /**
   * ✅ ANALYZE: Get popular search queries
   */
  async getPopularQueries(limit: number = 10): Promise<Array<{ query: string; count: number; avgResults: number }>> {
    try {
      const { data, error } = await supabase
        .from('search_analytics')
        .select('query, results_count')
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const queryStats: { [key: string]: { count: number; totalResults: number } } = {};
      
      data?.forEach(item => {
        if (item.query) {
          if (!queryStats[item.query]) {
            queryStats[item.query] = { count: 0, totalResults: 0 };
          }
          queryStats[item.query].count++;
          queryStats[item.query].totalResults += item.results_count || 0;
        }
      });

      return Object.entries(queryStats)
        .map(([query, stats]) => ({
          query,
          count: stats.count,
          avgResults: Math.round(stats.totalResults / stats.count)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get popular queries:', error);
      return [];
    }
  }

  /**
   * ✅ ANALYZE: Get search trends over time
   */
  async getSearchTrends(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<Array<{ date: string; searches: number }>> {
    try {
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const { data, error } = await supabase
        .from('search_analytics')
        .select('timestamp')
        .gte('timestamp', startDate.toISOString());

      if (error) throw error;

      const dailyCounts: { [key: string]: number } = {};
      
      data?.forEach(item => {
        const date = new Date(item.timestamp).toISOString().split('T')[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });

      return Object.entries(dailyCounts)
        .map(([date, searches]) => ({ date, searches }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Failed to get search trends:', error);
      return [];
    }
  }

  /**
   * ✅ ANALYZE: Get search performance metrics
   */
  async getSearchPerformanceMetrics(): Promise<{
    averageSearchTime: number;
    zeroResultRate: number;
    clickThroughRate: number;
    averagePositionClicked: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('search_analytics')
        .select('search_time_ms, has_results, clicked_result_id, position_clicked')
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          averageSearchTime: 0,
          zeroResultRate: 0,
          clickThroughRate: 0,
          averagePositionClicked: 0
        };
      }

      const totalSearches = data.length;
      const searchesWithResults = data.filter(item => item.has_results).length;
      const searchesWithClicks = data.filter(item => item.clicked_result_id).length;
      
      const totalSearchTime = data.reduce((sum, item) => sum + (item.search_time_ms || 0), 0);
      const totalPositionClicked = data
        .filter(item => item.position_clicked)
        .reduce((sum, item) => sum + (item.position_clicked || 0), 0);
      const clicksCount = data.filter(item => item.position_clicked).length;

      return {
        averageSearchTime: Math.round(totalSearchTime / totalSearches),
        zeroResultRate: ((totalSearches - searchesWithResults) / totalSearches) * 100,
        clickThroughRate: (searchesWithClicks / totalSearches) * 100,
        averagePositionClicked: clicksCount > 0 ? Math.round(totalPositionClicked / clicksCount) : 0
      };
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {
        averageSearchTime: 0,
        zeroResultRate: 0,
        clickThroughRate: 0,
        averagePositionClicked: 0
      };
    }
  }

  /**
   * ✅ ANALYZE: Get top result types by clicks
   */
  async getTopResultTypes(limit: number = 5): Promise<Array<{ type: string; count: number }>> {
    try {
      const { data, error } = await supabase
        .from('search_analytics')
        .select('clicked_result_type')
        .not('clicked_result_type', 'is', null)
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const typeCounts: { [key: string]: number } = {};
      
      data?.forEach(item => {
        if (item.clicked_result_type) {
          typeCounts[item.clicked_result_type] = (typeCounts[item.clicked_result_type] || 0) + 1;
        }
      });

      return Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get top result types:', error);
      return [];
    }
  }

  /**
   * ✅ SUGGEST: Add search suggestion
   */
  async addSearchSuggestion(suggestion: Omit<SearchSuggestion, 'usageCount'>): Promise<void> {
    try {
      await supabase
        .from('search_suggestions')
        .upsert({
          query: suggestion.query.toLowerCase(),
          suggestion_type: suggestion.suggestionType,
          target_id: suggestion.targetId,
          target_type: suggestion.targetType,
          relevance_score: suggestion.relevanceScore,
          usage_count: 0,
          last_used: new Date().toISOString()
        }, {
          onConflict: 'query'
        });
    } catch (error) {
      console.error('Failed to add search suggestion:', error);
    }
  }

  /**
   * ✅ SUGGEST: Update suggestion usage count
   */
  async updateSuggestionUsage(query: string): Promise<void> {
    try {
      await supabase
        .from('search_suggestions')
        .update({
          usage_count: supabase.rpc('increment', { row: 1 }),
          last_used: new Date().toISOString()
        })
        .eq('query', query.toLowerCase());
    } catch (error) {
      console.error('Failed to update suggestion usage:', error);
    }
  }

  /**
   * ✅ SUGGEST: Get search suggestions
   */
  async getSearchSuggestions(partialQuery: string, limit: number = 5): Promise<string[]> {
    try {
      if (!partialQuery || partialQuery.trim().length < 1) {
        return [];
      }

      const query = partialQuery.trim().toLowerCase();

      const { data, error } = await supabase
        .rpc('get_search_suggestions', {
          partial_query: query,
          suggestion_limit: limit
        });

      if (error) throw error;

      return data?.map(s => s.suggestion) || [];
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * ✅ ANALYZE: Process analytics data into summary
   */
  private processAnalyticsData(data: any[]): SearchAnalyticsSummary {
    if (data.length === 0) {
      return {
        totalSearches: 0,
        averageSearchTime: 0,
        zeroResultRate: 0,
        popularQueries: [],
        searchTrends: [],
        clickThroughRate: 0,
        averagePositionClicked: 0,
        topResultTypes: []
      };
    }

    const totalSearches = data.length;
    const searchesWithResults = data.filter(item => item.has_results).length;
    const searchesWithClicks = data.filter(item => item.clicked_result_id).length;
    
    const totalSearchTime = data.reduce((sum, item) => sum + (item.search_time_ms || 0), 0);
    const totalPositionClicked = data
      .filter(item => item.position_clicked)
      .reduce((sum, item) => sum + (item.position_clicked || 0), 0);
    const clicksCount = data.filter(item => item.position_clicked).length;

    // Popular queries
    const queryStats: { [key: string]: { count: number; totalResults: number } } = {};
    data.forEach(item => {
      if (item.query) {
        if (!queryStats[item.query]) {
          queryStats[item.query] = { count: 0, totalResults: 0 };
        }
        queryStats[item.query].count++;
        queryStats[item.query].totalResults += item.results_count || 0;
      }
    });

    const popularQueries = Object.entries(queryStats)
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgResults: Math.round(stats.totalResults / stats.count)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Search trends
    const dailyCounts: { [key: string]: number } = {};
    data.forEach(item => {
      const date = new Date(item.timestamp).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    const searchTrends = Object.entries(dailyCounts)
      .map(([date, searches]) => ({ date, searches }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top result types
    const typeCounts: { [key: string]: number } = {};
    data.forEach(item => {
      if (item.clicked_result_type) {
        typeCounts[item.clicked_result_type] = (typeCounts[item.clicked_result_type] || 0) + 1;
      }
    });

    const topResultTypes = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSearches,
      averageSearchTime: Math.round(totalSearchTime / totalSearches),
      zeroResultRate: ((totalSearches - searchesWithResults) / totalSearches) * 100,
      popularQueries,
      searchTrends,
      clickThroughRate: (searchesWithClicks / totalSearches) * 100,
      averagePositionClicked: clicksCount > 0 ? Math.round(totalPositionClicked / clicksCount) : 0,
      topResultTypes
    };
  }

  /**
   * ✅ UTILITY: Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * ✅ UTILITY: Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * ✅ UTILITY: Reset session ID
   */
  resetSession(): void {
    this.sessionId = this.generateSessionId();
  }
}

// Export singleton instance
export const searchAnalytics = SearchAnalyticsService.getInstance();
