import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import QRCode from 'https://esm.sh/qrcode@1.5.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

// Helper function to generate QR code image
async function generateQRCodeImage(data: string): Promise<string> {
  try {
    const qrDataURL = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    return qrDataURL;
  } catch (error) {
    console.error('QR code generation error:', error);
    // Fallback to text-only QR code
    return data;
  }
}

// Helper function to generate secure QR code data
function generateQRCodeData(ticketId: string, orderId: string, eventId: string, userId: string): string {
  const qrData = {
    ticket_id: ticketId,
    order_id: orderId,
    event_id: eventId,
    user_id: userId,
    timestamp: Date.now(),
    // Add a simple signature for security
    signature: btoa(`${ticketId}_${orderId}_${Date.now()}`).substring(0, 8)
  };
  return JSON.stringify(qrData);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-12-18.acacia'
    });

    // Create Supabase client
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

    const { session_id, order_id } = await req.json();

    if (!session_id && !order_id) {
      return new Response(
        JSON.stringify({ error: 'Session ID or Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let orderId = order_id;
    let sessionId = session_id;

    // If only session_id provided, get order_id from session
    if (session_id && !order_id) {
      try {
        const session = await stripe.checkout.sessions.retrieve(session_id);
        orderId = session.metadata?.order_id;
        
        if (!orderId) {
          return new Response(
            JSON.stringify({ error: 'Order ID not found in session metadata' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.error('Error retrieving session:', error);
        return new Response(
          JSON.stringify({ error: 'Invalid session ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        events (
          id,
          title,
          slug,
          start_at,
          venue,
          city
        )
      `)
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment status
    let paymentVerified = false;
    let paymentDetails = null;

    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        paymentVerified = session.payment_status === 'paid';
        paymentDetails = {
          session_id: session.id,
          payment_intent_id: session.payment_intent,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency
        };
      } catch (error) {
        console.error('Error verifying session:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to verify payment session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Check order status directly
      paymentVerified = order.status === 'paid' || order.status === 'completed';
      paymentDetails = {
        order_id: order.id,
        status: order.status,
        total: order.total,
        currency: order.currency
      };
    }

    if (!paymentVerified) {
      return new Response(
        JSON.stringify({ 
          error: 'Payment not completed',
          payment_status: paymentDetails?.payment_status || order.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order status if needed
    if (order.status !== 'paid' && order.status !== 'completed') {
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order status:', updateError);
      }
    }

    // Check if tickets already exist for this order
    const { data: existingTickets, error: ticketsError } = await supabaseClient
      .from('tickets_owned')
      .select('id')
      .eq('order_id', orderId);

    if (ticketsError) {
      console.error('Error checking existing tickets:', ticketsError);
    }

    let ticketsGenerated = false;
    let generatedTickets = [];

    // Generate tickets if they don't exist
    if (!existingTickets || existingTickets.length === 0) {
      try {
        // Get order items to generate tickets
        const { data: orderItems, error: itemsError } = await supabaseClient
          .from('order_items')
          .select(`
            *,
            tickets (
              id,
              name,
              description,
              price_cents,
              access_level
            )
          `)
          .eq('order_id', orderId);

        if (itemsError) {
          throw new Error(`Failed to get order items: ${itemsError.message}`);
        }

        if (!orderItems || orderItems.length === 0) {
          throw new Error('No order items found');
        }

        // Generate tickets for each order item
        for (const item of orderItems) {
          const ticketCount = item.quantity || 1;
          
          for (let i = 0; i < ticketCount; i++) {
            // Generate unique ticket ID
            const ticketId = crypto.randomUUID();
            
            // Generate QR code data
            const qrCodeData = generateQRCodeData(ticketId, orderId, order.events.id, user.id);
            
            // Generate QR code image
            const qrCodeImage = await generateQRCodeImage(qrCodeData);
            
            // Create simple QR code string for database
            const qrCode = `ticket_${orderId}_${Date.now()}_${i}`;
            
            const { data: ticket, error: ticketError } = await supabaseClient
              .from('tickets_owned')
              .insert({
                id: ticketId,
                user_id: user.id,
                ticket_id: item.ticket_id,
                order_id: orderId,
                qr_code: qrCode,
                qr_code_data: qrCodeData,
                qr_code_image: qrCodeImage,
                access_level: item.tickets?.access_level || 'general',
                is_used: false
              })
              .select(`
                id,
                qr_code,
                qr_code_image,
                access_level,
                created_at,
                tickets (
                  name,
                  description,
                  price_cents
                )
              `)
              .single();

            if (ticketError) {
              console.error('Error creating ticket:', ticketError);
              continue;
            }

            generatedTickets.push(ticket);
          }
        }

        ticketsGenerated = true;

      } catch (error) {
        console.error('Error generating tickets:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Payment verified but failed to generate tickets',
            details: error.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Tickets already exist, get them
      const { data: tickets, error: getTicketsError } = await supabaseClient
        .from('tickets_owned')
        .select(`
          id,
          qr_code,
          qr_code_image,
          access_level,
          created_at,
          tickets (
            name,
            description,
            price_cents
          )
        `)
        .eq('order_id', orderId);

      if (!getTicketsError && tickets) {
        generatedTickets = tickets;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_verified: paymentVerified,
        order_id: orderId,
        tickets_generated: ticketsGenerated,
        tickets: generatedTickets,
        payment_details: paymentDetails,
        event: order.events
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verify payment error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Payment verification failed',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
