import { supabase } from './lib/supabase';

// Standard Edge Function Response Format
export interface EdgeFunctionResponse<T> {
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}

// Call Options Interface
interface CallOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, any>;
  body?: any;
}

// API Gateway for Edge Functions
export class ApiGateway {
  private baseUrl: string;
  
  constructor(baseUrl: string = '/functions/v1') {
    this.baseUrl = baseUrl;
  }
  
  private async getToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  }
  
  private async call<T>(endpoint: string, options: CallOptions): Promise<EdgeFunctionResponse<T>> {
    try {
      const token = await this.getToken();
      const url = new URL(`${this.baseUrl}/${endpoint}`, window.location.origin);
      
      // Add query parameters for GET requests
      if (options.method === 'GET' && options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }
      
      const response = await fetch(url.toString(), {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error: any) {
      return {
        error: {
          message: error.message || 'Network error occurred',
          code: 'NETWORK_ERROR',
          details: error
        }
      };
    }
  }
  
  // ===== EVENTS =====
  
  async getEvents(params: {
    page?: number;
    limit?: number;
    category?: string;
    city?: string;
    status?: string;
    visibility?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    user_id?: string;
    organization_id?: string;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('get-events', { method: 'GET', params });
  }
  
  async createEvent(eventData: {
    title: string;
    description: string;
    start_at: string;
    end_at: string;
    venue: string;
    city: string;
    category: string;
    visibility: string;
    ticket_tiers?: any[];
    owner_context_type?: string;
    owner_context_id?: string;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('create-event', { method: 'POST', body: eventData });
  }
  
  async updateEvent(eventId: string, updateData: any): Promise<EdgeFunctionResponse<any>> {
    return this.call('update-event', { method: 'PUT', body: { event_id: eventId, ...updateData } });
  }
  
  async uploadEventImage(eventId: string, imageData: string, imageType: string): Promise<EdgeFunctionResponse<any>> {
    return this.call('upload-event-image', { 
      method: 'POST', 
      body: { event_id: eventId, image_data: imageData, image_type: imageType } 
    });
  }
  
  // ===== TICKETS =====
  
  async purchaseTickets(purchaseData: {
    event_id: string;
    tickets: Array<{
      tier_id: string;
      quantity: number;
    }>;
    promo_code?: string;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('purchase-tickets', { method: 'POST', body: purchaseData });
  }
  
  async generateTickets(orderId: string): Promise<EdgeFunctionResponse<any>> {
    return this.call('generate-tickets', { method: 'POST', body: { order_id: orderId } });
  }
  
  async scanTicket(scanData: {
    qr_code: string;
    event_id: string;
    scanner_location?: string;
    scanner_notes?: string;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('scan-ticket', { method: 'POST', body: scanData });
  }
  
  async transferTicket(transferData: {
    ticket_id: string;
    recipient_email: string;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('transfer-ticket', { method: 'POST', body: transferData });
  }
  
  // ===== PAYMENTS =====
  
  async createCheckoutSession(checkoutData: {
    event_id: string;
    items: Array<{
      tier_id: string;
      quantity: number;
    }>;
    success_url: string;
    cancel_url: string;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('checkout-session', { method: 'POST', body: checkoutData });
  }
  
  async processRefund(refundData: {
    order_id: string;
    ticket_ids?: string[];
    refund_amount?: number;
    reason: string;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('process-refund', { method: 'POST', body: refundData });
  }
  
  async managePayouts(action: 'get_history' | 'request_payout' | 'get_balance', data?: any): Promise<EdgeFunctionResponse<any>> {
    return this.call('manage-payouts', { method: 'POST', body: { action, ...data } });
  }
  
  // ===== SEARCH & DISCOVERY =====
  
  // ✅ ENHANCED: Unified Search with Full-Text Capabilities
  async search(params: {
    q: string;
    types?: string[];
    category?: string;
    location?: string;
    radius_km?: number;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
    sort_by?: 'relevance' | 'date' | 'popularity' | 'distance';
    price_range?: { min: number; max: number };
    tags?: string[];
    organizer_id?: string;
    verified_only?: boolean;
    include_past_events?: boolean;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('enhanced-search', { 
      method: 'POST', 
      body: params 
    });
  }

  // ✅ ENHANCED: Search Suggestions (separate endpoint for better UX)
  async getSearchSuggestions(params: {
    q: string;
    limit?: number;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('enhanced-search', { 
      method: 'POST', 
      body: { ...params, types: ['suggestions'] }
    });
  }

  // ✅ ENHANCED: Trending Searches
  async getTrendingSearches(params: {
    hours_back?: number;
    limit?: number;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('enhanced-search', { 
      method: 'POST', 
      body: { ...params, types: ['trending'] }
    });
  }
  
  // ✅ ENHANCED: Discover Feed with Personalized Recommendations
  async getDiscoverFeed(params: {
    user_id?: string;
    location?: string;
    radius_km?: number;
    categories?: string[];
    limit?: number;
    offset?: number;
    include_trending?: boolean;
    include_recommendations?: boolean;
    include_nearby?: boolean;
    include_following?: boolean;
    price_range?: { min: number; max: number };
    date_range?: { from: string; to: string };
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('discover-feed', { 
      method: 'POST', 
      body: params 
    });
  }
  
  async getSmartRecommendations(params: {
    user_id?: string;
    event_id?: string;
    limit?: number;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('smart-recommendations', { method: 'GET', params });
  }
  


  // Waitlist Management
  async joinWaitlist(params: {
    event_id: string;
    ticket_tier_id: string;
    quantity?: number;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('waitlist-management?action=join', {
      method: 'POST',
      body: params
    });
  }

  async leaveWaitlist(params: { waitlist_id: string }): Promise<EdgeFunctionResponse<any>> {
    return this.call('waitlist-management?action=leave', {
      method: 'POST',
      body: params
    });
  }

  async getWaitlist(params?: {
    event_id?: string;
    user_id?: string;
  }): Promise<EdgeFunctionResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params?.event_id) searchParams.append('event_id', params.event_id);
    if (params?.user_id) searchParams.append('user_id', params.user_id);

    return this.call(`waitlist-management?action=list&${searchParams}`, { method: 'GET' });
  }

  async notifyWaitlist(params: {
    event_id: string;
    ticket_tier_id: string;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('waitlist-management?action=notify', {
      method: 'POST',
      body: params
    });
  }

  async convertWaitlistToTicket(params: { waitlist_id: string }): Promise<EdgeFunctionResponse<any>> {
    return this.call('waitlist-management?action=convert', {
      method: 'POST',
      body: params
    });
  }

  // Event Series Management
  async createEventSeries(params: {
    name: string;
    description?: string;
    org_id?: string;
    recurrence_pattern: any;
    start_date: string;
    end_date?: string;
    max_occurrences?: number;
    settings?: any;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('event-series?action=create', {
      method: 'POST',
      body: params
    });
  }

  async updateEventSeries(params: {
    series_id: string;
    name?: string;
    description?: string;
    recurrence_pattern?: any;
    end_date?: string;
    max_occurrences?: number;
    settings?: any;
    is_active?: boolean;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('event-series?action=update', {
      method: 'POST',
      body: params
    });
  }

  async deleteEventSeries(params: { series_id: string }): Promise<EdgeFunctionResponse<any>> {
    return this.call('event-series?action=delete', {
      method: 'POST',
      body: params
    });
  }

  async generateSeriesEvents(params: {
    series_id: string;
    template_event_data: any;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('event-series?action=generate', {
      method: 'POST',
      body: params
    });
  }

  async getEventSeries(params?: {
    series_id?: string;
    org_id?: string;
    organizer_id?: string;
  }): Promise<EdgeFunctionResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params?.series_id) searchParams.append('series_id', params.series_id);
    if (params?.org_id) searchParams.append('org_id', params.org_id);
    if (params?.organizer_id) searchParams.append('organizer_id', params.organizer_id);

    return this.call(`event-series?action=list&${searchParams}`, { method: 'GET' });
  }

  async getSeriesEvents(params: { series_id: string }): Promise<EdgeFunctionResponse<any>> {
    return this.call(`event-series?action=events&series_id=${params.series_id}`, { method: 'GET' });
  }

  // ===== SOCIAL & COMMUNITY =====
  
  async getSocialFeed(params: {
    event_id?: string;
    user_id?: string;
    page?: number;
    limit?: number;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('social-feed', { method: 'GET', params });
  }
  
  async createPost(postData: {
    event_id: string;
    content: string;
    media_urls?: string[];
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('social-feed', { method: 'POST', body: postData });
  }
  
  async getUserConnections(params: {
    user_id?: string;
    connection_type?: string;
    page?: number;
    limit?: number;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('user-connections', { method: 'GET', params });
  }
  
  async getNotifications(params: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('notifications', { method: 'GET', params });
  }
  
  async markNotificationRead(notificationId: string): Promise<EdgeFunctionResponse<any>> {
    return this.call('notifications', { method: 'PUT', body: { notification_id: notificationId, status: 'read' } });
  }
  
  // ===== ENHANCED ANALYTICS & INSIGHTS =====
  
  async getEnhancedAnalytics(params: {
    analytics_type: 'event' | 'enterprise' | 'performance' | 'comprehensive' | 'revenue' | 'attendance' | 'engagement' | 'user_behavior' | 'content_performance' | 'real_time';
    event_id?: string;
    owner_context_id?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    metrics?: string[];
    filters?: Record<string, any>;
    force_refresh?: boolean;
    include_insights?: boolean;
    include_predictions?: boolean;
    include_comparisons?: boolean;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('enhanced-analytics', { method: 'POST', body: params });
  }
  
  // ===== LEGACY METHODS FOR BACKWARD COMPATIBILITY =====
  // These methods now use the unified enhanced-analytics endpoint
  
  async getEventAnalytics(params: {
    event_id: string;
    start_date?: string;
    end_date?: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    include_insights?: boolean;
    include_predictions?: boolean;
    include_comparisons?: boolean;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.getEnhancedAnalytics({ 
      analytics_type: 'event',
      ...params
    });
  }
  
  async getEnterpriseAnalytics(params: {
    owner_context_id: string;
    start_date?: string;
    end_date?: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    include_insights?: boolean;
    include_predictions?: boolean;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.getEnhancedAnalytics({ 
      analytics_type: 'enterprise',
      ...params
    });
  }
  
  async getPerformanceAnalytics(params: {
    event_id?: string;
    owner_context_id?: string;
    start_date?: string;
    end_date?: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    include_insights?: boolean;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.getEnhancedAnalytics({ 
      analytics_type: 'performance',
      ...params
    });
  }
  
  async getRevenueAnalytics(params: {
    event_id?: string;
    owner_context_id?: string;
    start_date?: string;
    end_date?: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  }): Promise<EdgeFunctionResponse<any>> {
    return this.getEnhancedAnalytics({ 
      analytics_type: 'revenue',
      ...params
    });
  }
  
  async getAttendanceAnalytics(params: {
    event_id: string;
    start_date?: string;
    end_date?: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  }): Promise<EdgeFunctionResponse<any>> {
    return this.getEnhancedAnalytics({ 
      analytics_type: 'attendance',
      ...params
    });
  }
  
  async getEngagementAnalytics(params: {
    event_id: string;
    start_date?: string;
    end_date?: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  }): Promise<EdgeFunctionResponse<any>> {
    return this.getEnhancedAnalytics({ 
      analytics_type: 'engagement',
      ...params
    });
  }
  
  async getUserBehaviorAnalytics(params: {
    event_id?: string;
    owner_context_id?: string;
    start_date?: string;
    end_date?: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  }): Promise<EdgeFunctionResponse<any>> {
    return this.getEnhancedAnalytics({ 
      analytics_type: 'user_behavior',
      ...params
    });
  }
  
  async getContentPerformanceAnalytics(params: {
    event_id: string;
    start_date?: string;
    end_date?: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  }): Promise<EdgeFunctionResponse<any>> {
    return this.getEnhancedAnalytics({ 
      analytics_type: 'content_performance',
      ...params
    });
  }
  
  async getRealTimeAnalytics(params: {
    event_id: string;
    filters?: Record<string, any>;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.getEnhancedAnalytics({ 
      analytics_type: 'real_time',
      ...params
    });
  }
  
  async getComprehensiveAnalytics(params: {
    event_id?: string;
    owner_context_id?: string;
    start_date?: string;
    end_date?: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    include_insights?: boolean;
    include_predictions?: boolean;
    include_comparisons?: boolean;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.getEnhancedAnalytics({ 
      analytics_type: 'comprehensive',
      ...params
    });
  }
  
  // ===== EVENT MANAGEMENT =====
  
  async scheduleEvent(schedulingData: {
    event_id: string;
    action: 'schedule' | 'reschedule' | 'cancel' | 'check_conflicts';
    new_start_at?: string;
    new_end_at?: string;
    reason?: string;
    notify_participants?: boolean;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('event-scheduling', { method: 'POST', body: schedulingData });
  }
  
  async manageWaitlist(waitlistData: {
    event_id: string;
    tier_id?: string;
    action: 'join' | 'leave' | 'notify_available';
    quantity?: number;
    priority?: 'high' | 'normal' | 'low';
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('waitlist-management', { method: 'POST', body: waitlistData });
  }
  
  // ===== MOBILE & REAL-TIME =====
  
  async syncData(params: {
    last_sync: string;
    tables: string[];
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('realtime-sync', { method: 'POST', body: params });
  }
  
  async sendPushNotification(notificationData: {
    user_ids?: string[];
    event_id?: string;
    organization_id?: string;
    title: string;
    message: string;
    data?: any;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('push-notifications', { method: 'POST', body: notificationData });
  }
  
  // ===== CONTENT OPTIMIZATION =====
  
  async optimizeContent(contentData: {
    content_id: string;
    content_type: string;
    action: 'track_performance' | 'ab_test' | 'get_recommendations';
    data?: any;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('content-optimization', { method: 'POST', body: contentData });
  }

  // Profile Management
  async getProfile(params?: { user_id?: string }): Promise<EdgeFunctionResponse<any>> {
    const searchParams = params?.user_id ? `?user_id=${params.user_id}` : '';
    return this.call(`profiles${searchParams}`, { method: 'GET' });
  }

  async updateProfile(params: {
    handle?: string;
    display_name?: string;
    bio?: string;
    website_url?: string;
    location?: string;
    interests?: string[];
    social_links?: any;
    privacy_settings?: any;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('profiles', {
      method: 'PUT',
      body: params
    });
  }

  // Event Categories
  async getEventCategories(): Promise<EdgeFunctionResponse<any>> {
    return this.call('event-categories', { method: 'GET' });
  }

  async createEventCategory(params: {
    name: string;
    slug: string;
    description?: string;
    icon_url?: string;
    color_hex?: string;
    sort_order?: number;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('event-categories', {
      method: 'POST',
      body: params
    });
  }

  // Event Tags
  async getEventTags(): Promise<EdgeFunctionResponse<any>> {
    return this.call('event-tags', { method: 'GET' });
  }

  async addEventTags(params: {
    event_id: string;
    tag_ids: string[];
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('event-tags', {
      method: 'POST',
      body: params
    });
  }

  async removeEventTags(params: {
    event_id: string;
    tag_ids: string[];
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('event-tags', {
      method: 'DELETE',
      body: params
    });
  }
}

// Create singleton instance
export const apiGateway = new ApiGateway();

// Export for backward compatibility
export default apiGateway;

