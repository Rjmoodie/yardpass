import { supabase } from '@/integrations/supabase/client';
import { EventWithDetails } from './EventService';

export interface AdvancedSearchFilters {
  query?: string;
  categories?: string[];
  cities?: string[];
  themes?: string[];
  date_range?: { start: string; end: string; };
  price_range?: { min: number; max: number; };
  access_level?: 'general' | 'vip' | 'crew';
  organization_verified?: boolean;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'date' | 'price' | 'popularity';
  fuzzy?: boolean;
  include_facets?: boolean;
}

export interface SearchResult {
  events: (EventWithDetails & { search_score?: number })[];
  total_count: number;
  filtered_count: number;
  suggestions: string[];
  facets?: {
    categories: Array<{ name: string; count: number }>;
    cities: Array<{ name: string; count: number }>;
    themes: Array<{ name: string; count: number }>;
  };
  search_metadata: {
    query?: string;
    sort: string;
    fuzzy_enabled: boolean;
    execution_time: number;
  };
}

export interface UserSearchResult {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  verified: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  search_score?: number;
}

export interface OrganizationSearchResult {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar_url?: string;
  verified: boolean;
  website_url?: string;
  search_score?: number;
}

export interface UniversalSearchResult {
  events: (EventWithDetails & { search_score?: number })[];
  users: UserSearchResult[];
  organizations: OrganizationSearchResult[];
  total_count: number;
  suggestions: string[];
  popular_searches: string[];
}

class EnhancedSearchService {
  private searchCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Advanced event search using the edge function
  async searchEvents(
    filters: AdvancedSearchFilters,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const cacheKey = JSON.stringify({ filters, options });
    
    // Check cache first
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase.functions.invoke('advanced-search', {
        body: { filters, options }
      });
      
      if (error) throw error;
      
      // Cache the result
      this.searchCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Enhanced search error:', error);
      // Fallback to basic search
      return this.fallbackSearch(filters, options);
    }
  }

  // Enhanced user search with ranking
  async searchUsers(query: string, limit: number = 20): Promise<UserSearchResult[]> {
    if (!query || query.length < 2) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, user_id, username, display_name, bio, avatar_url, verified, followers_count, following_count, posts_count
        `)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .limit(limit * 2); // Get more for ranking

      if (error) throw error;

      // Rank results by relevance
      const queryLower = query.toLowerCase();
      const results = (data || [])
        .map(user => {
          let score = 0;
          const usernameLower = (user.username || '').toLowerCase();
          const displayNameLower = (user.display_name || '').toLowerCase();
          const bioLower = (user.bio || '').toLowerCase();

          // Exact matches get higher scores
          if (usernameLower === queryLower) score += 100;
          else if (usernameLower.includes(queryLower)) score += 50;
          
          if (displayNameLower === queryLower) score += 80;
          else if (displayNameLower.includes(queryLower)) score += 40;
          
          if (bioLower.includes(queryLower)) score += 20;

          // Boost verified users
          if (user.verified) score += 15;

          // Boost users with more followers
          score += Math.min(user.followers_count * 0.1, 20);

          return { ...user, search_score: score };
        })
        .filter(user => user.search_score > 0)
        .sort((a, b) => b.search_score - a.search_score)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  // Enhanced organization search
  async searchOrganizations(query: string, limit: number = 20): Promise<OrganizationSearchResult[]> {
    if (!query || query.length < 2) return [];

    try {
      const { data, error } = await supabase
        .from('orgs')
        .select(`
          id, name, slug, description, avatar_url, verified, website_url
        `)
        .or(`name.ilike.%${query}%,slug.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit * 2);

      if (error) throw error;

      // Rank organizations
      const queryLower = query.toLowerCase();
      const results = (data || [])
        .map(org => {
          let score = 0;
          const nameLower = (org.name || '').toLowerCase();
          const slugLower = (org.slug || '').toLowerCase();
          const descLower = (org.description || '').toLowerCase();

          // Exact matches
          if (nameLower === queryLower) score += 100;
          else if (nameLower.includes(queryLower)) score += 60;
          
          if (slugLower.includes(queryLower)) score += 40;
          
          if (descLower.includes(queryLower)) score += 20;

          // Boost verified organizations
          if (org.verified) score += 25;

          return { ...org, search_score: score };
        })
        .filter(org => org.search_score > 0)
        .sort((a, b) => b.search_score - a.search_score)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error('Error searching organizations:', error);
      return [];
    }
  }

  // Universal search across all content types
  async universalSearch(query: string, limit: number = 10): Promise<UniversalSearchResult> {
    if (!query || query.length < 2) {
      return {
        events: [],
        users: [],
        organizations: [],
        total_count: 0,
        suggestions: [],
        popular_searches: await this.getPopularSearches()
      };
    }

    try {
      const [eventsResult, users, organizations] = await Promise.all([
        this.searchEvents({ query }, { limit, fuzzy: true }),
        this.searchUsers(query, limit),
        this.searchOrganizations(query, limit)
      ]);

      return {
        events: eventsResult.events,
        users,
        organizations,
        total_count: eventsResult.events.length + users.length + organizations.length,
        suggestions: eventsResult.suggestions,
        popular_searches: await this.getPopularSearches()
      };
    } catch (error) {
      console.error('Universal search error:', error);
      return {
        events: [],
        users: [],
        organizations: [],
        total_count: 0,
        suggestions: [],
        popular_searches: []
      };
    }
  }

  // Get intelligent search suggestions
  async getSearchSuggestions(query: string, limit: number = 8): Promise<string[]> {
    if (!query || query.length < 2) return [];

    try {
      // Get suggestions from multiple sources
      const [eventData, userData, orgData] = await Promise.all([
        supabase
          .from('events')
          .select('title, city, category')
          .eq('status', 'published')
          .eq('visibility', 'public')
          .limit(20),
        supabase
          .from('profiles')
          .select('username, display_name')
          .limit(10),
        supabase
          .from('orgs')
          .select('name')
          .limit(10)
      ]);

      const suggestions = new Set<string>();
      const queryLower = query.toLowerCase();

      // Add event-based suggestions
      eventData.data?.forEach(event => {
        [event.title, event.city, event.category].forEach(field => {
          if (field && field.toLowerCase().includes(queryLower) && field.length > query.length) {
            suggestions.add(field);
          }
        });
      });

      // Add user suggestions
      userData.data?.forEach(user => {
        [user.username, user.display_name].forEach(field => {
          if (field && field.toLowerCase().includes(queryLower) && field.length > query.length) {
            suggestions.add(field);
          }
        });
      });

      // Add organization suggestions
      orgData.data?.forEach(org => {
        if (org.name && org.name.toLowerCase().includes(queryLower) && org.name.length > query.length) {
          suggestions.add(org.name);
        }
      });

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  // Get popular/trending searches
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    try {
      // Return some default trending searches since analytics table doesn't exist yet
      return [
        'music festival',
        'food truck',
        'art gallery',
        'community event',
        'cultural celebration',
        'outdoor concert',
        'workshop',
        'networking'
      ].slice(0, limit);
    } catch (error) {
      console.error('Error getting popular searches:', error);
      return [];
    }
  }

  // Fallback search when edge function fails
  private async fallbackSearch(
    filters: AdvancedSearchFilters,
    options: SearchOptions
  ): Promise<SearchResult> {
    const { limit = 20, offset = 0 } = options;

    let query = supabase
      .from('events')
      .select(`
        *,
        cultural_guides(*),
        ticket_tiers(*),
        orgs(name, slug, verified)
      `, { count: 'exact' })
      .eq('status', 'published')
      .eq('visibility', 'public');

    // Apply basic filters
    if (filters.query) {
      query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%,city.ilike.%${filters.query}%,category.ilike.%${filters.query}%`);
    }

    if (filters.categories && filters.categories.length > 0) {
      query = query.in('category', filters.categories);
    }

    if (filters.cities && filters.cities.length > 0) {
      query = query.in('city', filters.cities);
    }

    if (filters.date_range) {
      query = query
        .gte('start_at', filters.date_range.start)
        .lte('start_at', filters.date_range.end);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      events: (data || []).map(event => ({
        ...event,
        visibility: event.visibility as any
      })) as (EventWithDetails & { search_score?: number })[],
      total_count: count || 0,
      filtered_count: (data || []).length,
      suggestions: [],
      search_metadata: {
        query: filters.query,
        sort: options.sort || 'relevance',
        fuzzy_enabled: false,
        execution_time: Date.now()
      }
    };
  }

  // Clear search cache
  clearCache(): void {
    this.searchCache.clear();
  }
}

export const enhancedSearchService = new EnhancedSearchService();
