import { supabase } from '../lib/supabase';
import { Event, ApiResponse, ApiError, GeoPoint } from '@yardpass/types';

export class EventsService {
  /**
   * Get events with filters
   */
  static async getEvents(params: {
    near?: string; // "lat,lng"
    when?: 'today' | 'week' | 'month';
    category?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ApiResponse<{ events: Event[]; meta: any }>> {
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
   * Get event by ID
   */
  static async getEvent(id: string): Promise<ApiResponse<Event>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          org:orgs(*),
          tickets(*),
          posts(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        data: data as Event,
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'GET_EVENT_FAILED',
        message: error.message || 'Failed to get event',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Get event by slug
   */
  static async getEventBySlug(slug: string): Promise<ApiResponse<Event>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          org:orgs(*),
          tickets(*),
          posts(*)
        `)
        .eq('slug', slug)
        .single();

      if (error) throw error;

      return {
        data: data as Event,
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'GET_EVENT_BY_SLUG_FAILED',
        message: error.message || 'Failed to get event by slug',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Create new event
   */
  static async createEvent(eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Event>> {
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
   * Update event
   */
  static async updateEvent(
    id: string,
    updates: Partial<Omit<Event, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ApiResponse<Event>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
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
   * Delete event
   */
  static async deleteEvent(id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        data: { success: true },
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'DELETE_EVENT_FAILED',
        message: error.message || 'Failed to delete event',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Get events by organizer
   */
  static async getEventsByOrganizer(orgId: string): Promise<ApiResponse<Event[]>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          org:orgs(*),
          tickets(*)
        `)
        .eq('org_id', orgId)
        .order('start_at', { ascending: true });

      if (error) throw error;

      return {
        data: data as Event[],
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'GET_EVENTS_BY_ORGANIZER_FAILED',
        message: error.message || 'Failed to get events by organizer',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Search events
   */
  static async searchEvents(query: string): Promise<ApiResponse<Event[]>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          org:orgs(*),
          tickets(*)
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,city.ilike.%${query}%`)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .order('start_at', { ascending: true });

      if (error) throw error;

      return {
        data: data as Event[],
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'SEARCH_EVENTS_FAILED',
        message: error.message || 'Failed to search events',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Get trending events
   */
  static async getTrendingEvents(limit: number = 10): Promise<ApiResponse<Event[]>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          org:orgs(*),
          tickets(*)
        `)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .gte('start_at', new Date().toISOString())
        .order('viewCount', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        data: data as Event[],
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'GET_TRENDING_EVENTS_FAILED',
        message: error.message || 'Failed to get trending events',
        details: error,
      };

      throw apiError;
    }
  }
}


