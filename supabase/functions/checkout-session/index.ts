import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-12-18.acacia'
    });

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

    const requestBody = await req.json();
    console.log('Checkout request:', requestBody);
    
    const { event_id, items, promo_code, success_url, cancel_url } = requestBody;

    // Validate required fields
    if (!event_id || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({
        error: 'Event ID and items are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return new Response(JSON.stringify({
        error: 'Event not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Fetch ticket tiers and validate availability
    const tierIds = items.map((item) => item.tier_id);
    const { data: tiers, error: tiersError } = await supabaseClient
      .from('ticket_tiers')
      .select('*')
      .in('id', tierIds)
      .eq('event_id', event_id)
      .eq('status', 'active');

    if (tiersError || !tiers) {
      return new Response(JSON.stringify({
        error: 'Failed to fetch ticket tiers'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate quantities and availability
    const tierMap = new Map(tiers.map((tier) => [tier.id, tier]));
    let totalAmount = 0;
    const lineItems = [];

    for (const item of items) {
      const tier = tierMap.get(item.tier_id);
      if (!tier) {
        return new Response(JSON.stringify({
          error: `Ticket tier ${item.tier_id} not found`
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      if ((tier.max_quantity - tier.sold_quantity) < item.quantity) {
        return new Response(JSON.stringify({
          error: `Insufficient availability for ${tier.name}`
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // Create cart hold
      try {
        await supabaseClient.rpc('create_cart_hold', {
          user_id: user.id,
          tier_id: item.tier_id,
          quantity: item.quantity,
          hold_duration_minutes: 10
        });
      } catch (holdError) {
        return new Response(JSON.stringify({
          error: 'Failed to reserve tickets'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      const itemTotal = tier.price * item.quantity;
      totalAmount += itemTotal;
      
      lineItems.push({
        price_data: {
          currency: tier.currency.toLowerCase(),
          product_data: {
            name: `${tier.name} - ${event.title}`,
            description: tier.description || `Ticket for ${event.title}`,
            metadata: {
              tier_id: tier.id,
              event_id: event_id,
              access_level: tier.access_level
            }
          },
          unit_amount: Math.round(tier.price * 100)
        },
        quantity: item.quantity
      });
    }

    // Validate promo code if provided
    let promoDiscount = 0;
    let promoCodeId = null;
    
    if (promo_code) {
      const { data: promoValidation } = await supabaseClient.rpc('validate_promo_code', {
        promo_code: promo_code,
        event_id: event_id,
        user_id: user.id
      });
      
      if (promoValidation && promoValidation.length > 0) {
        const promo = promoValidation[0];
        if (promo.is_valid) {
          if (promo.discount_type === 'percentage') {
            promoDiscount = Math.round(totalAmount * (promo.discount_value / 100));
          } else {
            promoDiscount = promo.discount_value;
          }
          totalAmount -= promoDiscount;
        } else {
          return new Response(JSON.stringify({
            error: promo.error_message
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      }
    }

    // Add platform fee (e.g., 5%)
    const platformFee = Math.round(totalAmount * 0.05);
    const finalAmount = totalAmount + platformFee;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: success_url || `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/cancel`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        event_id: event_id,
        promo_code: promo_code || '',
        platform_fee: platformFee.toString(),
        total_items: items.length.toString()
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          event_id: event_id
        }
      }
    });

    // Create pending order in database
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: user.id,
        event_id: event_id,
        stripe_session_id: session.id,
        total: finalAmount,
        currency: 'USD',
        status: 'pending',
        promo_code_id: promoCodeId
      })
      .select()
      .single();

    if (orderError) {
      console.error('Failed to create order:', orderError);
      // Clean up cart holds
      for (const item of items) {
        await supabaseClient.rpc('release_cart_hold', {
          hold_id: item.tier_id
        });
      }
      return new Response(JSON.stringify({
        error: 'Failed to create order'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Create order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      tier_id: item.tier_id,
      quantity: item.quantity,
      unit_price: tierMap.get(item.tier_id).price,
      total_price: tierMap.get(item.tier_id).price * item.quantity
    }));

    const { error: orderItemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItems);

    if (orderItemsError) {
      console.error('Failed to create order items:', orderItemsError);
    }

    return new Response(JSON.stringify({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      order_id: order.id,
      total_amount: finalAmount,
      platform_fee: platformFee,
      promo_discount: promoDiscount
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Checkout session error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
