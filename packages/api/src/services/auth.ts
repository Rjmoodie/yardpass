import { BaseService } from './base/BaseService';
import { QueryBuilder } from './base/QueryBuilder';
import { AuthUser, ApiResponse, ApiError } from '@yardpass/types';

/**
 * ✅ OPTIMIZED: Auth Service with enhanced performance
 * - Caching implementation
 * - Optimized queries with field selection
 * - Performance monitoring
 * - Centralized error handling
 */
export class AuthService extends BaseService {
  /**
   * ✅ OPTIMIZED: Sign up a new user with enhanced profile creation
   */
  static async signUp(credentials: {
    email: string;
    password: string;
    handle: string;
    name: string;
  }): Promise<ApiResponse<{ user: AuthUser; session: any }>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          // Create user in Supabase Auth
          const { data: authData, error: authError } = await this.getSupabaseClient().auth.signUp({
            email: credentials.email,
            password: credentials.password,
          });

          if (authError) throw authError;

          if (!authData.user) {
            throw new Error('Failed to create user');
          }

          // Create user profile in our database with enhanced stats
          const { data: profileData, error: profileError } = await this.getSupabaseClient()
            .from('profiles')
            .insert({
              user_id: authData.user.id,
              username: credentials.handle,
              display_name: credentials.name,
              email: credentials.email,
              onboarding_completed: false,
              preferences: {
                notifications: {
                  push: true,
                  email: true,
                  sms: false,
                  inApp: true,
                  quietHours: { enabled: false, start: '22:00', end: '08:00' },
                  types: {
                    newEvents: true,
                    eventUpdates: true,
                    ticketReminders: true,
                    socialActivity: true,
                  },
                },
                theme: 'dark',
                language: 'en',
                currency: 'USD',
                timezone: 'America/New_York',
                privacy: {
                  profileVisibility: 'public',
                  activityStatus: true,
                  dataSharing: false,
                },
                accessibility: {
                  fontSize: 'medium',
                  highContrast: false,
                  reduceMotion: false,
                },
              },
              // Initialize enhanced stats
              posts_count: 0,
              followers_count: 0,
              following_count: 0,
              events_count: 0,
              events_attending_count: 0,
              events_attended_count: 0,
              organizations_count: 0,
              organizations_owned_count: 0,
              years_active: 0,
              total_events_created: 0,
              total_events_attended: 0,
              total_tickets_purchased: 0,
              last_activity_at: new Date().toISOString(),
            })
            .select(this.ENHANCED_PROFILE_FIELDS)
            .single();

          if (profileError) throw profileError;

          return this.formatResponse({
            user: profileData as AuthUser,
            session: authData.session,
          });
        } catch (error: any) {
          return this.handleError(error, 'AUTH', 'signUp');
        }
      },
      'AuthService',
      'signUp'
    );
  }

  /**
   * ✅ OPTIMIZED: Sign in existing user with caching
   */
  static async signIn(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: AuthUser; session: any }>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          const { data, error } = await this.getSupabaseClient().auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (error) throw error;

          if (!data.user) {
            throw new Error('Invalid credentials');
          }

          // Get user profile with enhanced stats
          const { data: profileData, error: profileError } = await this.getSupabaseClient()
            .from('profiles')
            .select(this.ENHANCED_PROFILE_FIELDS)
            .eq('user_id', data.user.id)
            .single();

          if (profileError) throw profileError;

          // Cache the user profile
          const cacheKey = this.generateCacheKey('auth', 'user', data.user.id);
          this.setCached(cacheKey, profileData);

          return this.formatResponse({
            user: profileData as AuthUser,
            session: data.session,
          });
        } catch (error: any) {
          return this.handleError(error, 'AUTH', 'signIn');
        }
      },
      'AuthService',
      'signIn'
    );
  }

  /**
   * ✅ OPTIMIZED: Sign out user with cache invalidation
   */
  static async signOut(): Promise<ApiResponse<{ success: boolean }>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          const { error } = await this.getSupabaseClient().auth.signOut();

          if (error) throw error;

          // Clear user-related caches
          this.clearCache();

          return this.formatResponse({ success: true });
        } catch (error: any) {
          return this.handleError(error, 'AUTH', 'signOut');
        }
      },
      'AuthService',
      'signOut'
    );
  }

  /**
   * ✅ OPTIMIZED: Get current user with caching and enhanced stats
   */
  static async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          const { data: { user }, error } = await this.getSupabaseClient().auth.getUser();

          if (error) throw error;

          if (!user) {
            throw new Error('No authenticated user');
          }

          // Check cache first
          const cacheKey = this.generateCacheKey('auth', 'user', user.id);
          const cached = await this.getCached<AuthUser>(cacheKey);
          if (cached) {
            return this.formatResponse(cached);
          }

          // Get user profile with enhanced stats
          const { data: profileData, error: profileError } = await this.getSupabaseClient()
            .from('profiles')
            .select(this.ENHANCED_PROFILE_FIELDS)
            .eq('user_id', user.id)
            .single();

          if (profileError) throw profileError;

          // Cache the result
          this.setCached(cacheKey, profileData);

          return this.formatResponse(profileData as AuthUser);
        } catch (error: any) {
          return this.handleError(error, 'AUTH', 'getCurrentUser');
        }
      },
      'AuthService',
      'getCurrentUser'
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
            .eq('user_id', userId)
            .select(this.ENHANCED_PROFILE_FIELDS)
            .single();

          if (error) throw error;

          // Invalidate all caches for this user
          this.invalidateCache(`auth:user:${userId}`);
          this.invalidateCache(`profile:${userId}`);

          return this.formatResponse(data as AuthUser);
        } catch (error: any) {
          return this.handleError(error, 'AUTH', 'updateProfile');
        }
      },
      'AuthService',
      'updateProfile'
    );
  }

  /**
   * ✅ OPTIMIZED: Get user profile by username with caching
   */
  static async getUserByUsername(
    username: string,
    fields: 'basic' | 'enhanced' | 'full' = 'enhanced'
  ): Promise<ApiResponse<AuthUser>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          // Check cache first
          const cacheKey = this.generateCacheKey('auth', 'username', username, fields);
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
          return this.handleError(error, 'AUTH', 'getUserByUsername');
        }
      },
      'AuthService',
      'getUserByUsername'
    );
  }

  /**
   * ✅ OPTIMIZED: Check if username is available
   */
  static async checkUsernameAvailability(username: string): Promise<ApiResponse<{ available: boolean }>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          const { data, error } = await this.getSupabaseClient()
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();

          if (error && error.code === 'PGRST116') {
            // No rows found, username is available
            return this.formatResponse({ available: true });
          }

          if (error) throw error;

          return this.formatResponse({ available: false });
        } catch (error: any) {
          return this.handleError(error, 'AUTH', 'checkUsername');
        }
      },
      'AuthService',
      'checkUsernameAvailability'
    );
  }

  /**
   * ✅ OPTIMIZED: Reset password
   */
  static async resetPassword(email: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          const { error } = await this.getSupabaseClient().auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });

          if (error) throw error;

          return this.formatResponse({ success: true });
        } catch (error: any) {
          return this.handleError(error, 'AUTH', 'resetPassword');
        }
      },
      'AuthService',
      'resetPassword'
    );
  }

  /**
   * ✅ OPTIMIZED: Update password
   */
  static async updatePassword(newPassword: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.withPerformanceMonitoring(
      async () => {
        try {
          const { error } = await this.getSupabaseClient().auth.updateUser({
            password: newPassword,
          });

          if (error) throw error;

          return this.formatResponse({ success: true });
        } catch (error: any) {
          return this.handleError(error, 'AUTH', 'updatePassword');
        }
      },
      'AuthService',
      'updatePassword'
    );
  }

  /**
   * ✅ OPTIMIZED: Get user by handle (legacy method for backward compatibility)
   */
  static async getUserByHandle(handle: string): Promise<ApiResponse<AuthUser>> {
    return this.getUserByUsername(handle);
  }

  /**
   * ✅ OPTIMIZED: Check if handle is available (legacy method for backward compatibility)
   */
  static async checkHandleAvailability(handle: string): Promise<ApiResponse<{ available: boolean }>> {
    return this.checkUsernameAvailability(handle);
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
   * ✅ OPTIMIZED: Health check for auth service
   */
  static async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    return this.healthCheck();
  }
}


