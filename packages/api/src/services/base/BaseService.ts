import { supabase } from '../../lib/supabase';
import { ApiResponse, ApiError, AuthUser } from '@yardpass/types';

/**
 * ✅ OPTIMIZED: Base service class with shared functionality
 * Provides common patterns for all services including:
 * - Centralized error handling
 * - Caching strategies
 * - Query builders
 * - Performance monitoring
 */
export abstract class BaseService {
  // Cache configuration
  protected static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static cache = new Map<string, { data: any; timestamp: number }>();

  // Common query field patterns
  protected static readonly ENHANCED_PROFILE_FIELDS = `
    id,
    user_id,
    username,
    display_name,
    avatar_url,
    bio,
    phone,
    verified,
    date_of_birth,
    gender,
    onboarding_completed,
    interests,
    tags,
    user_role,
    account_type,
    badge,
    verification_level,
    business_verified,
    tier_level,
    posts_count,
    followers_count,
    following_count,
    events_count,
    events_attending_count,
    events_attended_count,
    organizations_count,
    organizations_owned_count,
    years_active,
    total_events_created,
    total_events_attended,
    total_tickets_purchased,
    last_activity_at,
    created_at,
    updated_at
  `;

  protected static readonly BASIC_PROFILE_FIELDS = `
    id,
    user_id,
    username,
    display_name,
    avatar_url,
    bio,
    verified,
    created_at
  `;

  protected static readonly PROFILE_STATS_FIELDS = `
    posts_count,
    followers_count,
    following_count,
    events_count,
    events_attending_count,
    events_attended_count,
    organizations_count,
    organizations_owned_count,
    years_active,
    total_events_created,
    total_events_attended,
    total_tickets_purchased,
    last_activity_at
  `;

  /**
   * ✅ OPTIMIZED: Centralized error handling with consistent patterns
   */
  protected static handleError(error: any, context: string, operation?: string): never {
    const errorCode = operation 
      ? `${context.toUpperCase()}_${operation.toUpperCase()}_FAILED`
      : `${context.toUpperCase()}_FAILED`;

    const apiError: ApiError = {
      code: errorCode,
      message: error.message || `Failed to ${operation || context}`,
      details: error,
      timestamp: new Date().toISOString(),
      context,
      operation
    };

    // Log error for debugging (in production, use proper logging service)
    console.error(`[${context}] Error:`, {
      code: apiError.code,
      message: apiError.message,
      context,
      operation,
      timestamp: apiError.timestamp
    });

    throw apiError;
  }

  /**
   * ✅ OPTIMIZED: Caching service with TTL and pattern invalidation
   */
  protected static async getCached<T>(key: string): Promise<T | null> {
    try {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data as T;
      }
      return null;
    } catch (error) {
      console.warn(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  protected static setCached<T>(key: string, data: T): void {
    try {
      this.cache.set(key, { data, timestamp: Date.now() });
    } catch (error) {
      console.warn(`Cache set error for key ${key}:`, error);
    }
  }

  protected static invalidateCache(pattern: string): void {
    try {
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
    } catch (error) {
      console.warn(`Cache invalidation error for pattern ${pattern}:`, error);
    }
  }

  protected static clearCache(): void {
    try {
      this.cache.clear();
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * ✅ OPTIMIZED: Performance monitoring wrapper
   */
  protected static async withPerformanceMonitoring<T>(
    operation: () => Promise<T>,
    context: string,
    operationName: string
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Log performance metrics
      this.logPerformance(context, operationName, duration, 'success');

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Log performance metrics for failed operations
      this.logPerformance(context, operationName, duration, 'error');

      throw error;
    }
  }

  /**
   * ✅ OPTIMIZED: Performance logging
   */
  private static logPerformance(
    context: string,
    operation: string,
    duration: number,
    status: 'success' | 'error'
  ): void {
    const logData = {
      context,
      operation,
      duration: Math.round(duration),
      status,
      timestamp: new Date().toISOString()
    };

    // Log slow operations
    if (duration > 1000) {
      console.warn(`⚠️ Slow operation detected:`, logData);
    }

    // Log all performance data (in production, send to monitoring service)
    console.log(`📊 Performance:`, logData);
  }

  /**
   * ✅ OPTIMIZED: Database connection management
   */
  protected static getSupabaseClient() {
    return supabase;
  }

  /**
   * ✅ OPTIMIZED: Query validation and sanitization
   */
  protected static validateQuery(query: string): string {
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }
    
    // Basic SQL injection prevention (Supabase handles most of this)
    if (query.includes(';') || query.includes('--') || query.includes('/*')) {
      throw new Error('Invalid query characters detected');
    }

    return query.trim();
  }

  /**
   * ✅ OPTIMIZED: Pagination helper
   */
  protected static buildPagination(limit: number = 20, offset: number = 0) {
    return {
      from: offset,
      to: offset + limit - 1,
      limit
    };
  }

  /**
   * ✅ OPTIMIZED: Response formatting
   */
  protected static formatResponse<T>(data: T, meta?: any): ApiResponse<T> {
    return {
      data,
      meta: meta || {},
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ✅ OPTIMIZED: Cache key generation
   */
  protected static generateCacheKey(prefix: string, ...params: any[]): string {
    const paramString = params
      .filter(param => param !== undefined && param !== null)
      .map(param => String(param))
      .join(':');
    
    return `${prefix}:${paramString}`;
  }

  /**
   * ✅ OPTIMIZED: Health check for service
   */
  protected static async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const startTime = performance.now();
      
      // Test database connection
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      const endTime = performance.now();
      const duration = endTime - startTime;

      if (error) {
        return {
          status: 'unhealthy',
          details: {
            error: error.message,
            duration: Math.round(duration),
            timestamp: new Date().toISOString()
          }
        };
      }

      return {
        status: 'healthy',
        details: {
          duration: Math.round(duration),
          cacheSize: this.cache.size,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
