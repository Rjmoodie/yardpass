import { BaseService } from './base/BaseService';
import { QueryBuilder } from './base/QueryBuilder';
import { AuthUser, ApiResponse, ApiError } from '@yardpass/types';

/**
 * ✅ OPTIMIZED: Profile Service with enhanced performance
 * - Caching implementation
 * - Optimized queries with field selection
 * - Performance monitoring
 * - Centralized error handling
 */
export class ProfileService extends BaseService {
  /**
   * ✅ OPTIMIZED: Get user profile by ID with caching and field selection
   */
  static async getProfileById(
    userId: string, 
    fields: 'basic' | 'enhanced' | 'full' = 'enhanced'
  ): Promise<ApiResponse<AuthUser>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          // Check cache first
          const cacheKey = this.generateCacheKey('profile', userId, fields);
          const cached = await this.getCached<AuthUser>(cacheKey);
          if (cached) {
            return this.formatResponse(cached);
          }

          // Select appropriate fields based on use case
          const fieldSelection = this.getFieldSelection(fields);
          
          const { data, error } = await this.getSupabaseClient()
            .from('profiles')
            .select(fieldSelection)
            .eq('id', userId)
            .single();

          if (error) throw error;

          // Cache the result
          this.setCached(cacheKey, data);

          return this.formatResponse(data as AuthUser);
        } catch (error: any) {
          return this.handleError(error, 'PROFILE', 'getById');
        }
      },
      'ProfileService',
      'getProfileById'
    );
  }

  /**
   * ✅ OPTIMIZED: Get user profile by username with caching
   */
  static async getProfileByUsername(
    username: string,
    fields: 'basic' | 'enhanced' | 'full' = 'enhanced'
  ): Promise<ApiResponse<AuthUser>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          // Check cache first
          const cacheKey = this.generateCacheKey('profile', 'username', username, fields);
          const cached = await this.getCached<AuthUser>(cacheKey);
          if (cached) {
            return this.formatResponse(cached);
          }

          const fieldSelection = this.getFieldSelection(fields);
          
          const { data, error } = await this.getSupabaseClient()
            .from('profiles')
            .select(fieldSelection)
            .eq('username', username)
            .single();

          if (error) throw error;

          // Cache the result
          this.setCached(cacheKey, data);

          return this.formatResponse(data as AuthUser);
        } catch (error: any) {
          return this.handleError(error, 'PROFILE', 'getByUsername');
        }
      },
      'ProfileService',
      'getProfileByUsername'
    );
  }

  /**
   * ✅ OPTIMIZED: Update user profile with cache invalidation
   */
  static async updateProfile(
    userId: string,
    updates: Partial<AuthUser>
  ): Promise<ApiResponse<AuthUser>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          const { data, error } = await this.getSupabaseClient()
            .from('profiles')
            .update({
              ...updates,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .select(this.ENHANCED_PROFILE_FIELDS)
            .single();

          if (error) throw error;

          // Invalidate all profile caches for this user
          this.invalidateCache(`profile:${userId}`);

          return this.formatResponse(data as AuthUser);
        } catch (error: any) {
          return this.handleError(error, 'PROFILE', 'update');
        }
      },
      'ProfileService',
      'updateProfile'
    );
  }

  /**
   * ✅ OPTIMIZED: Get user stats only (lightweight query)
   */
  static async getUserStats(userId: string): Promise<ApiResponse<{
    posts_count: number;
    followers_count: number;
    following_count: number;
    events_count: number;
    events_attending_count: number;
    events_attended_count: number;
    organizations_count: number;
    organizations_owned_count: number;
    years_active: number;
    total_events_created: number;
    total_events_attended: number;
    total_tickets_purchased: number;
    last_activity_at: string;
  }>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          // Check cache first
          const cacheKey = this.generateCacheKey('profile', 'stats', userId);
          const cached = await this.getCached(cacheKey);
          if (cached) {
            return this.formatResponse(cached);
          }

          const { data, error } = await this.getSupabaseClient()
            .from('profiles')
            .select(this.PROFILE_STATS_FIELDS)
            .eq('id', userId)
            .single();

          if (error) throw error;

          // Cache the result
          this.setCached(cacheKey, data);

          return this.formatResponse(data);
        } catch (error: any) {
          return this.handleError(error, 'PROFILE', 'getStats');
        }
      },
      'ProfileService',
      'getUserStats'
    );
  }

  /**
   * ✅ OPTIMIZED: Search profiles with optimized field selection
   */
  static async searchProfiles(
    query: string, 
    limit: number = 10,
    fields: 'basic' | 'search' | 'social' = 'search'
  ): Promise<ApiResponse<AuthUser[]>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          // Check cache first
          const cacheKey = this.generateCacheKey('profile', 'search', query, limit, fields);
          const cached = await this.getCached<AuthUser[]>(cacheKey);
          if (cached) {
            return this.formatResponse(cached);
          }

          const fieldSelection = this.getSearchFieldSelection(fields);
          const searchQuery = this.validateQuery(query);
          
          const { data, error } = await this.getSupabaseClient()
            .from('profiles')
            .select(fieldSelection)
            .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`)
            .limit(limit)
            .order('followers_count', { ascending: false });

          if (error) throw error;

          // Cache the result
          this.setCached(cacheKey, data);

          return this.formatResponse(data as AuthUser[]);
        } catch (error: any) {
          return this.handleError(error, 'PROFILE', 'search');
        }
      },
      'ProfileService',
      'searchProfiles'
    );
  }

  /**
   * ✅ OPTIMIZED: Get trending profiles with caching
   */
  static async getTrendingProfiles(
    limit: number = 10,
    fields: 'basic' | 'search' | 'social' = 'search'
  ): Promise<ApiResponse<AuthUser[]>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          // Check cache first
          const cacheKey = this.generateCacheKey('profile', 'trending', limit, fields);
          const cached = await this.getCached<AuthUser[]>(cacheKey);
          if (cached) {
            return this.formatResponse(cached);
          }

          const fieldSelection = this.getSearchFieldSelection(fields);
          
          const { data, error } = await this.getSupabaseClient()
            .from('profiles')
            .select(fieldSelection)
            .gte('followers_count', 10)
            .order('followers_count', { ascending: false })
            .order('last_activity_at', { ascending: false })
            .limit(limit);

          if (error) throw error;

          // Cache the result
          this.setCached(cacheKey, data);

          return this.formatResponse(data as AuthUser[]);
        } catch (error: any) {
          return this.handleError(error, 'PROFILE', 'getTrending');
        }
      },
      'ProfileService',
      'getTrendingProfiles'
    );
  }

  /**
   * ✅ OPTIMIZED: Get user's followers with optimized field selection
   */
  static async getFollowers(
    userId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ApiResponse<AuthUser[]>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          const { data, error } = await this.getSupabaseClient()
            .from('follows')
            .select(`
              follower:profiles!follows_follower_id_fkey(
                ${QueryBuilder.ProfileQueryBuilder.getSocialProfile()}
              )
            `)
            .eq('following_id', userId)
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

          if (error) throw error;

          const followers = data?.map(item => item.follower).filter(Boolean) || [];

          return this.formatResponse(followers as AuthUser[]);
        } catch (error: any) {
          return this.handleError(error, 'PROFILE', 'getFollowers');
        }
      },
      'ProfileService',
      'getFollowers'
    );
  }

  /**
   * ✅ OPTIMIZED: Get user's following with optimized field selection
   */
  static async getFollowing(
    userId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ApiResponse<AuthUser[]>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          const { data, error } = await this.getSupabaseClient()
            .from('follows')
            .select(`
              following:profiles!follows_following_id_fkey(
                ${QueryBuilder.ProfileQueryBuilder.getSocialProfile()}
              )
            `)
            .eq('follower_id', userId)
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

          if (error) throw error;

          const following = data?.map(item => item.following).filter(Boolean) || [];

          return this.formatResponse(following as AuthUser[]);
        } catch (error: any) {
          return this.handleError(error, 'PROFILE', 'getFollowing');
        }
      },
      'ProfileService',
      'getFollowing'
    );
  }

  /**
   * ✅ OPTIMIZED: Follow a user with cache invalidation
   */
  static async followUser(followerId: string, followingId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          const { error } = await this.getSupabaseClient()
            .from('follows')
            .insert({
              follower_id: followerId,
              following_id: followingId,
            });

          if (error) throw error;

          // Invalidate follower/following caches
          this.invalidateCache(`profile:${followerId}`);
          this.invalidateCache(`profile:${followingId}`);

          return this.formatResponse({ success: true });
        } catch (error: any) {
          return this.handleError(error, 'PROFILE', 'follow');
        }
      },
      'ProfileService',
      'followUser'
    );
  }

  /**
   * ✅ OPTIMIZED: Unfollow a user with cache invalidation
   */
  static async unfollowUser(followerId: string, followingId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          const { error } = await this.getSupabaseClient()
            .from('follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('following_id', followingId);

          if (error) throw error;

          // Invalidate follower/following caches
          this.invalidateCache(`profile:${followerId}`);
          this.invalidateCache(`profile:${followingId}`);

          return this.formatResponse({ success: true });
        } catch (error: any) {
          return this.handleError(error, 'PROFILE', 'unfollow');
        }
      },
      'ProfileService',
      'unfollowUser'
    );
  }

  /**
   * ✅ OPTIMIZED: Check if user is following another user
   */
  static async isFollowing(followerId: string, followingId: string): Promise<ApiResponse<{ isFollowing: boolean }>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          const { data, error } = await this.getSupabaseClient()
            .from('follows')
            .select('id')
            .eq('follower_id', followerId)
            .eq('following_id', followingId)
            .single();

          if (error && error.code === 'PGRST116') {
            return this.formatResponse({ isFollowing: false });
          }

          if (error) throw error;

          return this.formatResponse({ isFollowing: true });
        } catch (error: any) {
          return this.handleError(error, 'PROFILE', 'checkFollowing');
        }
      },
      'ProfileService',
      'isFollowing'
    );
  }

  /**
   * ✅ OPTIMIZED: Helper method to get field selection based on use case
   */
  private static getFieldSelection(fields: 'basic' | 'enhanced' | 'full'): string {
    switch (fields) {
      case 'basic':
        return QueryBuilder.ProfileQueryBuilder.getBasicProfile();
      case 'enhanced':
        return QueryBuilder.ProfileQueryBuilder.getEnhancedProfile();
      case 'full':
        return QueryBuilder.ProfileQueryBuilder.getFullProfile();
      default:
        return QueryBuilder.ProfileQueryBuilder.getEnhancedProfile();
    }
  }

  /**
   * ✅ OPTIMIZED: Helper method to get search field selection
   */
  private static getSearchFieldSelection(fields: 'basic' | 'search' | 'social'): string {
    switch (fields) {
      case 'basic':
        return QueryBuilder.ProfileQueryBuilder.getBasicProfile();
      case 'search':
        return QueryBuilder.ProfileQueryBuilder.getSearchProfile();
      case 'social':
        return QueryBuilder.ProfileQueryBuilder.getSocialProfile();
      default:
        return QueryBuilder.ProfileQueryBuilder.getSearchProfile();
    }
  }

  /**
   * ✅ OPTIMIZED: Health check for profile service
   */
  static async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    return this.healthCheck();
  }
}
