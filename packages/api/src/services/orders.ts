import { supabase } from '../lib/supabase';
import { Order, Ticket, CheckoutRequest, CheckoutResponse, ApiResponse } from '@yardpass/types';

export class OrderService {
  /**
   * Create checkout session for ticket purchase
   */
  static async createCheckout(request: CheckoutRequest): Promise<CheckoutResponse> {
    try {
      // Validate ticket availability
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', request.ticket_id)
        .single();

      if (ticketError || !ticket) {
        throw new Error('Ticket not found');
      }

      if (ticket.quantity_available < request.quantity) {
        throw new Error('Insufficient ticket quantity available');
      }

      // Calculate total amount
      const totalAmount = ticket.price * request.quantity;

      // Create order record
      const orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'> = {
        user_id: request.customer_email, // Using customer_email as user identifier
                  ticket_id: request.ticket_id,
        quantity: request.quantity,
        unit_price: ticket.price,
        total_amount: totalAmount,
        currency: 'usd',
        status: 'pending',
        payment_intent_id: null,
        metadata: {
          event_id: ticket.event_id,
          ticket_name: ticket.name,
          ...request.metadata,
        },
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      // TODO: Integrate with Stripe to create payment intent
      // For now, return mock checkout response
      const checkoutResponse: CheckoutResponse = {
        success: true,
        orderId: order.id,
        checkoutUrl: `https://checkout.stripe.com/pay/${order.id}#fid=${order.id}`,
        paymentIntentId: `pi_${order.id}_mock`,
        amount: totalAmount,
        currency: 'usd',
      };

      return checkoutResponse;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Checkout creation failed',
      };
    }
  }

  /**
   * Get order by ID
   */
  static async getById(id: string): Promise<ApiResponse<Order>> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          tickets!orders_ticket_id_fkey(
            *,
            events!tickets_event_id_fkey(
              id,
              name,
              slug,
              start_time,
              end_time,
              location
            )
          ),
          users!orders_user_id_fkey(
            id,
            handle,
            display_name,
            avatar_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch order: ${error.message}`);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch order',
      };
    }
  }

  /**
   * Get orders by user ID
   */
  static async getByUserId(userId: string, limit: number = 50): Promise<ApiResponse<Order[]>> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          tickets!orders_ticket_id_fkey(
            *,
            events!tickets_event_id_fkey(
              id,
              name,
              slug,
              start_time,
              end_time,
              location
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch user orders: ${error.message}`);
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user orders',
      };
    }
  }

  /**
   * Update order status
   */
  static async updateStatus(id: string, status: Order['status'], paymentIntentId?: string): Promise<ApiResponse<Order>> {
    try {
      const updates: Partial<Order> = { status };
      if (paymentIntentId) {
        updates.payment_intent_id = paymentIntentId;
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update order status: ${error.message}`);
      }

      // If order is completed, create ticket ownership records
      if (status === 'completed' && data) {
        await this.createTicketOwnership(data);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update order status',
      };
    }
  }

  /**
   * Cancel order
   */
  static async cancel(id: string): Promise<ApiResponse<Order>> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to cancel order: ${error.message}`);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel order',
      };
    }
  }

  /**
   * Process webhook from payment provider
   */
  static async processWebhook(event: any): Promise<ApiResponse<boolean>> {
    try {
      // TODO: Implement proper webhook processing for Stripe
      // This is a placeholder for webhook handling
      
      const { type, data } = event;
      
      switch (type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(data.object);
          break;
        default:
          console.log(`Unhandled event type: ${type}`);
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      };
    }
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSuccess(paymentIntent: any): Promise<void> {
    const orderId = paymentIntent.metadata?.order_id;
    if (orderId) {
      await this.updateStatus(orderId, 'completed', paymentIntent.id);
    }
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailure(paymentIntent: any): Promise<void> {
    const orderId = paymentIntent.metadata?.order_id;
    if (orderId) {
      await this.updateStatus(orderId, 'failed', paymentIntent.id);
    }
  }

  /**
   * Create ticket ownership records for completed order
   */
  private static async createTicketOwnership(order: Order): Promise<void> {
    try {
      const ticketOwnershipRecords = [];
      
      for (let i = 0; i < order.quantity; i++) {
        ticketOwnershipRecords.push({
          user_id: order.user_id,
          ticket_id: order.ticket_id,
          order_id: order.id,
          qr_code: this.generateQRCode(order.id, i),
          status: 'active',
          used_at: null,
        });
      }

      const { error } = await supabase
        .from('tickets_owned')
        .insert(ticketOwnershipRecords);

      if (error) {
        console.error('Failed to create ticket ownership records:', error);
      }
    } catch (error) {
      console.error('Error creating ticket ownership records:', error);
    }
  }

  /**
   * Generate unique QR code for ticket
   */
  private static generateQRCode(orderId: string, index: number): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${orderId}_${index}_${timestamp}_${random}`;
  }

  /**
   * Get order statistics for user
   */
  static async getUserStats(userId: string): Promise<ApiResponse<{
    totalOrders: number;
    totalSpent: number;
    completedOrders: number;
    pendingOrders: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('status, total_amount')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to fetch user stats: ${error.message}`);
      }

      const stats = {
        totalOrders: data?.length || 0,
        totalSpent: data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0,
        completedOrders: data?.filter(order => order.status === 'completed').length || 0,
        pendingOrders: data?.filter(order => order.status === 'pending').length || 0,
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user stats',
      };
    }
  }
}


