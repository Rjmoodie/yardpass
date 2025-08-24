import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

interface RefundRequest {
  order_id: string;
  ticket_ids?: string[];
  refund_reason: string;
  refund_amount?: number;
  partial_refund?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with proper authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_id, ticket_ids, refund_reason, refund_amount, partial_refund }: RefundRequest = await req.json();

    // Validate required fields
    if (!order_id || !refund_reason) {
      return new Response(
        JSON.stringify({ error: 'order_id and refund_reason are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        order_items(
          id,
          tier_id,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission to refund this order
    if (order.user_id !== user.id) {
      // Check if user is event organizer
      const { data: event } = await supabaseClient
        .from('events')
        .select('created_by, owner_context_type, owner_context_id')
        .eq('id', order.event_id)
        .single();

      if (!event || (event.created_by !== user.id && 
          !(event.owner_context_type === 'organization' && 
            await checkOrgAccess(supabaseClient, user.id, event.owner_context_id)))) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if order is eligible for refund
    if (order.status !== 'paid' && order.status !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'Order is not eligible for refund' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-12-18.acacia'
    });

    let refundAmount = refund_amount;
    let ticketsToRefund = [];

    if (partial_refund && ticket_ids) {
      // Partial refund - specific tickets
      const { data: tickets } = await supabaseClient
        .from('tickets')
        .select('*')
        .in('id', ticket_ids)
        .eq('order_id', order_id)
        .eq('status', 'active');

      if (!tickets || tickets.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No valid tickets found for refund' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      ticketsToRefund = tickets;
      if (!refundAmount) {
        refundAmount = tickets.reduce((sum, ticket) => sum + ticket.price, 0);
      }
    } else {
      // Full refund
      const { data: tickets } = await supabaseClient
        .from('tickets')
        .select('*')
        .eq('order_id', order_id)
        .eq('status', 'active');

      ticketsToRefund = tickets || [];
      refundAmount = order.total;
    }

    // Process refund through Stripe
    let stripeRefund;
    try {
      stripeRefund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          order_id: order_id,
          refund_reason: refund_reason,
          refunded_by: user.id,
          partial_refund: partial_refund ? 'true' : 'false'
        }
      });
    } catch (stripeError) {
      console.error('Stripe refund error:', stripeError);
      return new Response(
        JSON.stringify({ error: 'Failed to process refund with Stripe' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order status
    const refundStatus = partial_refund ? 'partially_refunded' : 'refunded';
    const { error: orderUpdateError } = await supabaseClient
      .from('orders')
      .update({
        status: refundStatus,
        refund_amount: refundAmount,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id);

    if (orderUpdateError) {
      console.error('Error updating order:', orderUpdateError);
    }

    // Update tickets status
    if (ticketsToRefund.length > 0) {
      const ticketIds = ticketsToRefund.map(t => t.id);
      const { error: ticketUpdateError } = await supabaseClient
        .from('tickets')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .in('id', ticketIds);

      if (ticketUpdateError) {
        console.error('Error updating tickets:', ticketUpdateError);
      }
    }

    // Create refund record
    const { error: refundRecordError } = await supabaseClient
      .from('refunds')
      .insert({
        order_id: order_id,
        stripe_refund_id: stripeRefund.id,
        amount: refundAmount,
        reason: refund_reason,
        status: stripeRefund.status,
        processed_by: user.id,
        ticket_ids: ticketsToRefund.map(t => t.id)
      });

    if (refundRecordError) {
      console.error('Error creating refund record:', refundRecordError);
    }

    // Send notification to user
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: order.user_id,
        type: 'refund_processed',
        title: 'Refund Processed',
        message: `Your refund of $${refundAmount.toFixed(2)} has been processed.`,
        data: {
          order_id: order_id,
          refund_amount: refundAmount,
          refund_id: stripeRefund.id
        },
        status: 'unread'
      });

    return new Response(
      JSON.stringify({
        success: true,
        refund_id: stripeRefund.id,
        amount: refundAmount,
        status: stripeRefund.status,
        message: 'Refund processed successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Refund processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkOrgAccess(supabaseClient: any, userId: string, orgId: string): Promise<boolean> {
  const { data: membership } = await supabaseClient
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .single();

  return membership && ['owner', 'admin'].includes(membership.role);
}

