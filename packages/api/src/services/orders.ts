import { supabase } from '../lib/supabase';
import { Order, Ticket, CheckoutRequest, CheckoutResponse, ApiResponse } from '@yardpass/types';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class OrderService {
  /**
   * Create checkout session for ticket purchase
   */
  static async createCheckout(request: CheckoutRequest): Promise<CheckoutResponse> {
    try {
      // Get user from auth context
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Validate ticket availability
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          event:events(
            id,
            title,
            slug,
            start_at,
            venue,
            cover_image_url
          )
        `)
        .eq('id', request.ticket_id)
        .eq('is_active', true)
        .single();

      if (ticketError || !ticket) {
        throw new Error('Ticket not found or inactive');
      }

      if (ticket.quantity_available < request.quantity) {
        throw new Error('Insufficient ticket quantity available');
      }

      // Calculate total amount with fees
      const subtotal = ticket.price * request.quantity;
      const serviceFee = subtotal * 0.05; // 5% service fee
      const tax = subtotal * 0.08; // 8% tax (adjust based on location)
      const totalAmount = subtotal + serviceFee + tax;

      // Create order record
      const orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        event_id: ticket.event_id,
        total: totalAmount,
        currency: 'USD',
        status: 'pending',
        provider_ref: null,
        metadata: {
          ticket_id: request.ticket_id,
          ticket_name: ticket.name,
          quantity: request.quantity,
          subtotal,
          service_fee: serviceFee,
          tax,
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

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${ticket.name} - ${ticket.event.title}`,
                description: `Ticket for ${ticket.event.title} on ${new Date(ticket.event.start_at).toLocaleDateString()}`,
                images: ticket.event.cover_image_url ? [ticket.event.cover_image_url] : [],
              },
              unit_amount: Math.round(totalAmount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?order_id=${order.id}`,
        customer_email: user.email,
        metadata: {
          order_id: order.id,
          event_id: ticket.event_id,
          ticket_id: request.ticket_id,
          user_id: user.id,
        },
        payment_intent_data: {
          metadata: {
            order_id: order.id,
            event_id: ticket.event_id,
            ticket_id: request.ticket_id,
            user_id: user.id,
          },
        },
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
      });

      // Update order with Stripe session ID
      await supabase
        .from('orders')
        .update({ provider_ref: session.id })
        .eq('id', order.id);

      const checkoutResponse: CheckoutResponse = {
        success: true,
        checkout_url: session.url!,
        session_id: session.id,
        order_id: order.id,
        amount: totalAmount,
        currency: 'USD',
        expires_at: new Date(session.expires_at! * 1000).toISOString(),
      };

      return checkoutResponse;
    } catch (error) {
      console.error('Checkout creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Checkout creation failed',
      };
    }
  }

  /**
   * Handle Stripe webhook for payment confirmation
   */
  static async handlePaymentSuccess(sessionId: string): Promise<void> {
    try {
      // Retrieve the session to get order details
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });

      if (session.payment_status !== 'paid') {
        throw new Error('Payment not completed');
      }

      const orderId = session.metadata?.order_id;
      if (!orderId) {
        throw new Error('Order ID not found in session metadata');
      }

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'paid',
          provider_ref: session.payment_intent?.id || sessionId,
        })
        .eq('id', orderId);

      if (orderError) {
        throw new Error(`Failed to update order: ${orderError.message}`);
      }

      // Get order details
      const { data: order, error: orderFetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderFetchError || !order) {
        throw new Error('Order not found');
      }

      // Create tickets for the user
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', order.metadata.ticket_id)
        .single();

      if (ticketError || !ticket) {
        throw new Error('Ticket not found');
      }

      // Create tickets in batch
      const ticketData = Array.from({ length: order.metadata.quantity }, (_, i) => ({
        order_id: orderId,
        ticket_id: order.metadata.ticket_id,
        user_id: order.user_id,
        qr_code: `ticket_${orderId}_${Date.now()}_${i}`,
        access_level: ticket.access_level,
        is_used: false,
      }));

      const { error: ticketsError } = await supabase
        .from('tickets_owned')
        .insert(ticketData);

      if (ticketsError) {
        throw new Error(`Failed to create tickets: ${ticketsError.message}`);
      }

      // Update ticket availability
      await supabase
        .from('tickets')
        .update({ 
          quantity_sold: ticket.quantity_sold + order.metadata.quantity 
        })
        .eq('id', order.metadata.ticket_id);

    } catch (error) {
      console.error('Payment success handling error:', error);
      throw error;
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
          event:events(*),
          user:users(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        data: data as Order,
      };
    } catch (error: any) {
      const apiError: any = {
        code: 'GET_ORDER_FAILED',
        message: error.message || 'Failed to get order',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Get user's orders
   */
  static async getUserOrders(userId: string): Promise<ApiResponse<Order[]>> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          event:events(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data as Order[],
      };
    } catch (error: any) {
      const apiError: any = {
        code: 'GET_USER_ORDERS_FAILED',
        message: error.message || 'Failed to get user orders',
        details: error,
      };

      throw apiError;
    }
  }
}


