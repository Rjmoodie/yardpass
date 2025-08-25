import { supabase } from './supabase';
import { RootState } from '@/store';

// Types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Base API class with common functionality
class BaseApi {
  protected async handleError(error: any): Promise<ApiResponse<any>> {
    console.error('API Error:', error);
    return {
      data: null,
      error: error.message || 'An unexpected error occurred',
      success: false,
    };
  }

  protected async handleSuccess<T>(data: T): Promise<ApiResponse<T>> {
    return {
      data,
      error: null,
      success: true,
    };
  }
}

// User Profile API
export class UserApi extends BaseApi {
  async getUserProfile(userId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          events_attended:events!events_attendees_fkey(count),
          posts_created:posts!posts_author_id_fkey(count),
          followers:follows!follows_followed_id_fkey(count),
          following:follows!follows_follower_id_fkey(count)
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;
      return this.handleSuccess(data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateUserProfile(userId: string, updates: any): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return this.handleSuccess(data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async uploadAvatar(userId: string, file: File): Promise<ApiResponse<string>> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return this.handleSuccess(publicUrl);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Events API
export class EventsApi extends BaseApi {
  async getEvents(params: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        search,
        location,
        dateFrom,
        dateTo,
      } = params;

      let query = supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!events_organizer_id_fkey(
            id,
            display_name,
            avatar_url,
            handle
          ),
          attendees:events_attendees(count),
          posts:posts(count)
        `, { count: 'exact' })
        .eq('visibility', 'public')
        .eq('status', 'published')
        .order('start_at', { ascending: true });

      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (location) {
        query = query.ilike('location', `%${location}%`);
      }

      if (dateFrom) {
        query = query.gte('start_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('start_at', dateTo);
      }

      const { data, error, count } = await query
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / limit);
      const response: PaginatedResponse<any> = {
        data: data || [],
        count: count || 0,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      return this.handleSuccess(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getEventById(eventId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!events_organizer_id_fkey(
            id,
            display_name,
            avatar_url,
            handle,
            bio
          ),
          attendees:events_attendees(
            user:profiles!events_attendees_user_id_fkey(
              id,
              display_name,
              avatar_url
            )
          ),
          posts:posts(
            id,
            content,
            media_urls,
            created_at,
            author:profiles!posts_author_id_fkey(
              id,
              display_name,
              avatar_url
            )
          ),
          ticket_tiers:ticket_tiers(*)
        `)
        .eq('id', eventId)
        .single();

      if (error) throw error;
      return this.handleSuccess(data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createEvent(eventData: any): Promise<ApiResponse<any>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('events')
        .insert({
          ...eventData,
          organizer_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return this.handleSuccess(data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateEvent(eventId: string, updates: any): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      return this.handleSuccess(data);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Posts API
export class PostsApi extends BaseApi {
  async getPosts(params: {
    page?: number;
    limit?: number;
    eventId?: string;
    authorId?: string;
    type?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const { page = 1, limit = 20, eventId, authorId, type } = params;

      let query = supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey(
            id,
            display_name,
            avatar_url,
            handle
          ),
          event:events!posts_event_id_fkey(
            id,
            title,
            slug
          ),
          likes:post_likes(count),
          comments:post_comments(count)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      if (authorId) {
        query = query.eq('author_id', authorId);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error, count } = await query
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / limit);
      const response: PaginatedResponse<any> = {
        data: data || [],
        count: count || 0,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      return this.handleSuccess(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createPost(postData: any): Promise<ApiResponse<any>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('posts')
        .insert({
          ...postData,
          author_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(`
          *,
          author:profiles!posts_author_id_fkey(
            id,
            display_name,
            avatar_url,
            handle
          )
        `)
        .single();

      if (error) throw error;
      return this.handleSuccess(data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async likePost(postId: string): Promise<ApiResponse<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('id', existingLike.id);
        return this.handleSuccess(false);
      } else {
        // Like
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          });
        return this.handleSuccess(true);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Wallet/Tickets API
export class WalletApi extends BaseApi {
  async getUserTickets(): Promise<ApiResponse<any[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('tickets_owned')
        .select(`
          *,
          ticket:tickets!tickets_owned_ticket_id_fkey(
            *,
            event:events!tickets_event_id_fkey(
              id,
              title,
              start_at,
              location,
              cover_image_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return this.handleSuccess(data || []);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getTransactionHistory(): Promise<ApiResponse<any[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            ticket:tickets(
              *,
              event:events(
                id,
                title
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return this.handleSuccess(data || []);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async purchaseTickets(eventId: string, ticketData: any[]): Promise<ApiResponse<any>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Start transaction
      const { data, error } = await supabase.rpc('purchase_tickets', {
        p_event_id: eventId,
        p_user_id: user.id,
        p_ticket_data: ticketData,
      });

      if (error) throw error;
      return this.handleSuccess(data);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Analytics API
export class AnalyticsApi extends BaseApi {
  async trackUserBehavior(behaviorData: any): Promise<ApiResponse<any>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_behavior_logs')
        .insert({
          user_id: user.id,
          behavior_type: behaviorData.type,
          behavior_data: behaviorData.data,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return this.handleSuccess(data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getEventAnalytics(eventId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('event_analytics')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (error) throw error;
      return this.handleSuccess(data);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Export API instances
export const userApi = new UserApi();
export const eventsApi = new EventsApi();
export const postsApi = new PostsApi();
export const walletApi = new WalletApi();
export const analyticsApi = new AnalyticsApi();

// Main API class that combines all services
export class ApiService {
  static user = userApi;
  static events = eventsApi;
  static posts = postsApi;
  static wallet = walletApi;
  static analytics = analyticsApi;

  // Utility method to get current user
  static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // Utility method to check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }
}
