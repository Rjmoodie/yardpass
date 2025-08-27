/**
 * @deprecated This service is deprecated. Use Edge Functions instead.
 * 
 * MIGRATION GUIDE:
 * OLD: import { EventsService } from '@yardpass/api';
 *      const events = await EventsService.getEvents(params);
 * 
 * NEW: import { apiGateway } from '@yardpass/api';
 *      const events = await apiGateway.getEvents(params);
 * 
 * Edge Functions provide:
 * - Better security (RLS enforcement)
 * - Serverless auto-scaling
 * - Real-time capabilities
 * - Consistent response formats
 */

import { supabase } from '../lib/supabase';
import { Event, ApiResponse, ApiError, GeoPoint } from '@yardpass/types';

export class EventsService {
  /**
   * @deprecated Use apiGateway.getEvents() instead
   */
  static async getEvents(params: {
    near?: string; // "lat,lng"
    when?: 'today' | 'week' | 'month';
    category?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ApiResponse<{ events: Event[]; meta: any }>> {
    console.warn('EventsService.getEvents is deprecated. Use apiGateway.getEvents() instead.');
    
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          org:orgs(*),
          tickets(*)
        `)
        .eq('status', 'published')
        .eq('visibility', 'public');

      // Apply filters
      if (params.category) {
        query = query.eq('category', params.category);
      }

      if (params.when) {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        switch (params.when) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
          case 'week':
            startDate = now;
            endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = now;
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            break;
          default:
            startDate = now;
            endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }

        query = query
          .gte('start_at', startDate.toISOString())
          .lte('start_at', endDate.toISOString());
      }

      // Location-based filtering (if near parameter provided)
      if (params.near) {
        const [lat, lng] = params.near.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          // Use PostGIS for location-based queries
          query = query.filter('location', 'st_dwithin', `POINT(${lng} ${lat}), 50000`); // 50km radius
        }
      }

      // Pagination
      const limit = params.limit || 20;
      const from = params.cursor ? parseInt(params.cursor) : 0;
      const to = from + limit - 1;

      query = query
        .range(from, to)
        .order('start_at', { ascending: true });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: {
          events: data as Event[],
          meta: {
            total: count || 0,
            page: Math.floor(from / limit) + 1,
            limit,
            hasMore: (data?.length || 0) === limit,
            cursor: (from + limit).toString(),
          },
        },
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'GET_EVENTS_FAILED',
        message: error.message || 'Failed to get events',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * @deprecated Use apiGateway.createEvent() instead
   */
  static async createEvent(eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Event>> {
    console.warn('EventsService.createEvent is deprecated. Use apiGateway.createEvent() instead.');
    
    try {
      const { data, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (error) throw error;

      return {
        data: data as Event,
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'CREATE_EVENT_FAILED',
        message: error.message || 'Failed to create event',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * @deprecated Use apiGateway.updateEvent() instead
   */
  static async updateEvent(eventId: string, updates: Partial<Event>): Promise<ApiResponse<Event>> {
    console.warn('EventsService.updateEvent is deprecated. Use apiGateway.updateEvent() instead.');
    
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      return {
        data: data as Event,
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'UPDATE_EVENT_FAILED',
        message: error.message || 'Failed to update event',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * @deprecated Use apiGateway.getEnhancedAnalytics() instead
   */
  static async getEventAnalytics(eventId: string): Promise<ApiResponse<any>> {
    console.warn('EventsService.getEventAnalytics is deprecated. Use apiGateway.getEnhancedAnalytics() instead.');
    
    try {
      // This method is now handled by Edge Functions
      throw new Error('Use apiGateway.getEnhancedAnalytics() instead');
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'GET_EVENT_ANALYTICS_FAILED',
        message: error.message || 'Failed to get event analytics',
        details: error,
      };

      throw apiError;
    }
  }
}


