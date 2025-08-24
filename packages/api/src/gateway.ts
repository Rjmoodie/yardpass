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
  
  async search(params: {
    q: string;
    types?: string[];
    lat?: number;
    lng?: number;
    radius_km?: number;
    page?: number;
    limit?: number;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('search', { method: 'GET', params });
  }
  
  async getDiscoverFeed(params: {
    lat?: number;
    lng?: number;
    radius_km?: number;
    categories?: string[];
    date_range?: string;
    page?: number;
    limit?: number;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('discover-feed', { method: 'GET', params });
  }
  
  async getSmartRecommendations(params: {
    user_id?: string;
    event_id?: string;
    limit?: number;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('smart-recommendations', { method: 'GET', params });
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
  
  // ===== ANALYTICS & INSIGHTS =====
  
  async getEventAnalytics(eventId: string): Promise<EdgeFunctionResponse<any>> {
    return this.call('event-analytics', { method: 'GET', params: { event_id: eventId } });
  }
  
  async getEventInsights(eventId: string): Promise<EdgeFunctionResponse<any>> {
    return this.call('event-insights', { method: 'GET', params: { event_id: eventId } });
  }
  
  async getFinancialReports(params: {
    type: string;
    event_id?: string;
    organization_id?: string;
    start_date?: string;
    end_date?: string;
    period?: string;
  }): Promise<EdgeFunctionResponse<any>> {
    return this.call('financial-reports', { method: 'GET', params });
  }
  
  async getEnterpriseAnalytics(organizationId: string): Promise<EdgeFunctionResponse<any>> {
    return this.call('enterprise-analytics', { method: 'GET', params: { organization_id: organizationId } });
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
}

// Create singleton instance
export const apiGateway = new ApiGateway();

// Export for backward compatibility
export default apiGateway;

