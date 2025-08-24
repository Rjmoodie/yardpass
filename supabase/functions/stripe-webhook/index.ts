import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
    });

    // Initialize Supabase with service role (required for webhooks)
    // Note: Webhooks don't have user authentication, so service role is necessary
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the webhook secret
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

    // Get the request body
    const body = await req.text();
    const signature = req.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the webhook event
    const { data: webhookEvent, error: webhookError } = await supabase
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        event_data: event.data.object,
        processed: false
      })
      .select()
      .single();

    if (webhookError) {
      console.error('Error logging webhook event:', webhookError);
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(supabase, event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(supabase, event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(supabase, event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(supabase, event.data.object as Stripe.Charge);
        break;

      case 'customer.created':
        await handleCustomerCreated(supabase, event.data.object as Stripe.Customer);
        break;

      case 'customer.updated':
        await handleCustomerUpdated(supabase, event.data.object as Stripe.Customer);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark webhook as processed
    if (webhookEvent) {
      await supabase
        .from('stripe_webhook_events')
        .update({ 
          processed: true, 
          processed_at: new Date().toISOString() 
        })
        .eq('id', webhookEvent.id);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Handle successful checkout session completion
async function handleCheckoutSessionCompleted(supabase: any, session: Stripe.Checkout.Session) {
  console.log('Processing checkout session completed:', session.id);

  try {
    // Get the order from metadata
    const orderId = session.metadata?.order_id;
    if (!orderId) {
      throw new Error('No order_id in session metadata');
    }

    // Update order status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderError) {
      throw new Error(`Failed to update order: ${orderError.message}`);
    }

    // Create tickets for the order
    await createTicketsForOrder(supabase, order);

    // Send confirmation notification
    await sendOrderConfirmation(supabase, order);

    console.log(`Successfully processed checkout session ${session.id} for order ${orderId}`);

  } catch (error) {
    console.error('Error processing checkout session:', error);
    throw error;
  }
}

// Handle successful payment intent
async function handlePaymentIntentSucceeded(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing payment intent succeeded:', paymentIntent.id);

  try {
    // Update payment intent record
    const { error: updateError } = await supabase
      .from('stripe_payment_intents')
      .update({
        status: paymentIntent.status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (updateError) {
      console.error('Error updating payment intent:', updateError);
    }

    // If this is a standalone payment intent (not from checkout), process it
    if (paymentIntent.metadata?.order_id && paymentIntent.status === 'succeeded') {
      const orderId = paymentIntent.metadata.order_id;
      
      // Update order status
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          stripe_payment_intent_id: paymentIntent.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (orderError) {
        throw new Error(`Failed to update order: ${orderError.message}`);
      }

      // Create tickets for the order
      await createTicketsForOrder(supabase, order);

      // Send confirmation notification
      await sendOrderConfirmation(supabase, order);
    }

  } catch (error) {
    console.error('Error processing payment intent:', error);
    throw error;
  }
}

// Handle failed payment intent
async function handlePaymentIntentFailed(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing payment intent failed:', paymentIntent.id);

  try {
    // Update payment intent record
    const { error: updateError } = await supabase
      .from('stripe_payment_intents')
      .update({
        status: paymentIntent.status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (updateError) {
      console.error('Error updating payment intent:', updateError);
    }

    // Update order status if order_id is in metadata
    if (paymentIntent.metadata?.order_id) {
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentIntent.metadata.order_id);

      if (orderError) {
        console.error('Error updating order status:', orderError);
      }
    }

  } catch (error) {
    console.error('Error processing failed payment intent:', error);
    throw error;
  }
}

// Handle charge refunded
async function handleChargeRefunded(supabase: any, charge: Stripe.Charge) {
  console.log('Processing charge refunded:', charge.id);

  try {
    // Find the order associated with this charge
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_payment_intent_id', charge.payment_intent)
      .single();

    if (orderError) {
      console.error('Error finding order for refund:', orderError);
      return;
    }

    // Update order refund status
    const refundAmount = charge.amount_refunded;
    const totalAmount = charge.amount;
    const refundStatus = refundAmount >= totalAmount ? 'full' : 'partial';

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        refund_status: refundStatus,
        refund_amount: refundAmount,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Error updating order refund status:', updateError);
    }

    // Handle ticket refunds
    if (refundStatus === 'full') {
      await refundAllTickets(supabase, order.id);
    } else if (refundStatus === 'partial') {
      // For partial refunds, you might want to implement a more complex logic
      // based on your business rules
      console.log('Partial refund - implement business logic as needed');
    }

  } catch (error) {
    console.error('Error processing charge refund:', error);
    throw error;
  }
}

// Handle customer created
async function handleCustomerCreated(supabase: any, customer: Stripe.Customer) {
  console.log('Processing customer created:', customer.id);

  try {
    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', customer.email)
      .single();

    if (userError) {
      console.error('Error finding user for customer:', userError);
      return;
    }

    // Create or update stripe customer record
    const { error: customerError } = await supabase
      .from('stripe_customers')
      .upsert({
        user_id: user.id,
        stripe_customer_id: customer.id,
        email: customer.email || '',
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || {},
        metadata: customer.metadata || {},
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (customerError) {
      console.error('Error creating stripe customer record:', customerError);
    }

  } catch (error) {
    console.error('Error processing customer created:', error);
    throw error;
  }
}

// Handle customer updated
async function handleCustomerUpdated(supabase: any, customer: Stripe.Customer) {
  console.log('Processing customer updated:', customer.id);

  try {
    // Update stripe customer record
    const { error: customerError } = await supabase
      .from('stripe_customers')
      .update({
        email: customer.email || '',
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || {},
        metadata: customer.metadata || {},
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customer.id);

    if (customerError) {
      console.error('Error updating stripe customer record:', customerError);
    }

  } catch (error) {
    console.error('Error processing customer updated:', error);
    throw error;
  }
}

// Helper function to create tickets for an order
async function createTicketsForOrder(supabase: any, order: any) {
  console.log('Creating tickets for order:', order.id);

  try {
    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        ticket_tiers!order_items_tier_id_fkey(
          id,
          name,
          event_id
        )
      `)
      .eq('order_id', order.id);

    if (itemsError) {
      throw new Error(`Failed to get order items: ${itemsError.message}`);
    }

    // Create tickets for each order item
    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        // Create ticket
        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .insert({
            event_id: item.ticket_tiers.event_id,
            tier_id: item.tier_id,
            user_id: order.user_id,
            order_id: order.id,
            status: 'active',
            price: item.unit_price
          })
          .select()
          .single();

        if (ticketError) {
          throw new Error(`Failed to create ticket: ${ticketError.message}`);
        }

        // Generate QR code for the ticket
        const qrCode = await generateTicketQRCode(supabase, ticket.id, order.user_id);
        
        // Update ticket with QR code
        const { error: qrUpdateError } = await supabase
          .from('tickets')
          .update({ qr_code: qrCode })
          .eq('id', ticket.id);

        if (qrUpdateError) {
          console.error('Failed to update ticket with QR code:', qrUpdateError);
        }
      }
    }

    console.log(`Successfully created tickets for order ${order.id}`);

  } catch (error) {
    console.error('Error creating tickets for order:', error);
    throw error;
  }
}

// Helper function to generate QR code
async function generateTicketQRCode(supabase: any, ticketId: string, userId: string): Promise<string> {
  const { data, error } = await supabase.rpc('generate_ticket_qr_code', {
    ticket_id: ticketId,
    user_id: userId
  });

  if (error) {
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }

  return data;
}

// Helper function to refund all tickets for an order
async function refundAllTickets(supabase: any, orderId: string) {
  console.log('Refunding all tickets for order:', orderId);

  try {
    // Update all tickets in the order to refunded status
    const { error: ticketError } = await supabase
      .from('tickets')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    if (ticketError) {
      console.error('Error updating tickets for refund:', ticketError);
    }

    console.log(`Successfully refunded tickets for order ${orderId}`);

  } catch (error) {
    console.error('Error refunding tickets:', error);
    throw error;
  }
}

// Helper function to send order confirmation
async function sendOrderConfirmation(supabase: any, order: any) {
  try {
    // Create notification for order confirmation
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: order.user_id,
        type: 'order_confirmed',
        title: 'Order Confirmed!',
        message: `Your order #${order.id.slice(0, 8)} has been confirmed. Check your tickets in the wallet.`,
        data: {
          order_id: order.id,
          order_total: order.total
        },
        status: 'unread'
      });

    if (notificationError) {
      console.error('Error creating order confirmation notification:', notificationError);
    }

  } catch (error) {
    console.error('Error sending order confirmation:', error);
    // Don't throw error for notification failures
  }
}
