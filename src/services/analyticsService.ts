import { supabase } from '@/services/supabase';
import { UserAnalytics, EventAnalytics } from '@/types';

export class AnalyticsService {
  /**
   * Track user action
   */
  static async trackUserAction(
    actionType: string,
    eventId?: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_analytics')
        .insert({
          action_type: actionType,
          event_id: eventId,
          metadata
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error tracking user action:', error);
      return false;
    }
  }

  /**
   * Track event metric
   */
  static async trackEventMetric(
    eventId: string,
    metricType: string,
    metricValue?: number,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('event_analytics')
        .insert({
          event_id: eventId,
          metric_type: metricType,
          metric_value: metricValue,
          metadata
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error tracking event metric:', error);
      return false;
    }
  }

  /**
   * Get event analytics
   */
  static async getEventAnalytics(
    eventId: string,
    metricType?: string,
    dateRange?: string
  ): Promise<EventAnalytics[]> {
    try {
      let query = supabase
        .from('event_analytics')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (metricType) {
        query = query.eq('metric_type', metricType);
      }

      if (dateRange) {
        // Add date range filtering logic here
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(dateRange));
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching event analytics:', error);
      return [];
    }
  }

  /**
   * Get user analytics
   */
  static async getUserAnalytics(
    userId: string,
    eventId?: string,
    actionType?: string
  ): Promise<UserAnalytics[]> {
    try {
      let query = supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      if (actionType) {
        query = query.eq('action_type', actionType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      return [];
    }
  }

  /**
   * Track common user actions
   */
  static async trackEventView(eventId: string): Promise<boolean> {
    return this.trackUserAction('event_view', eventId);
  }

  static async trackEventLike(eventId: string): Promise<boolean> {
    return this.trackUserAction('event_like', eventId);
  }

  static async trackEventShare(eventId: string): Promise<boolean> {
    return this.trackUserAction('event_share', eventId);
  }

  static async trackTicketPurchase(eventId: string, ticketId: string): Promise<boolean> {
    return this.trackUserAction('ticket_purchase', eventId, { ticket_id: ticketId });
  }

  static async trackPostView(postId: string, eventId: string): Promise<boolean> {
    return this.trackUserAction('post_view', eventId, { post_id: postId });
  }

  static async trackPostLike(postId: string, eventId: string): Promise<boolean> {
    return this.trackUserAction('post_like', eventId, { post_id: postId });
  }

  /**
   * Track common event metrics
   */
  static async trackEventViews(eventId: string, viewCount: number): Promise<boolean> {
    return this.trackEventMetric(eventId, 'views', viewCount);
  }

  static async trackEventLikes(eventId: string, likeCount: number): Promise<boolean> {
    return this.trackEventMetric(eventId, 'likes', likeCount);
  }

  static async trackEventShares(eventId: string, shareCount: number): Promise<boolean> {
    return this.trackEventMetric(eventId, 'shares', shareCount);
  }

  static async trackTicketSales(eventId: string, salesCount: number): Promise<boolean> {
    return this.trackEventMetric(eventId, 'ticket_sales', salesCount);
  }
}
