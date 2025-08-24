import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TicketPurchaseRequest {
  event_id: string
  tickets: Array<{
    tier_id: string
    quantity: number
  }>
  promo_code?: string
  customer_email?: string
  customer_name?: string
  payment_method: 'stripe' | 'wallet'
  wallet_address?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: TicketPurchaseRequest = await req.json()

    // Validate required fields
    if (!body.event_id || !body.tickets || body.tickets.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Event ID and tickets are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the event
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', body.event_id)
      .eq('status', 'published')
      .single()

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found or not published' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check event visibility
    if (event.visibility === 'private') {
      // Check if user has access to private event
      const hasAccess = event.created_by === user.id || 
        (event.owner_context_type === 'organization' && 
         await checkOrgMembership(supabaseClient, event.owner_context_id, user.id))
      
      if (!hasAccess) {
        return new Response(
          JSON.stringify({ error: 'You do not have access to this private event' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate and get ticket tiers
    const tierIds = body.tickets.map(t => t.tier_id)
    const { data: tiers, error: tiersError } = await supabaseClient
      .from('ticket_tiers')
      .select('*')
      .eq('event_id', body.event_id)
      .in('id', tierIds)

    if (tiersError || !tiers || tiers.length !== body.tickets.length) {
      return new Response(
        JSON.stringify({ error: 'Invalid ticket tiers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate quantities and availability
    for (const ticket of body.tickets) {
      const tier = tiers.find(t => t.id === ticket.tier_id)
      if (!tier) {
        return new Response(
          JSON.stringify({ error: `Invalid tier ID: ${ticket.tier_id}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (ticket.quantity <= 0) {
        return new Response(
          JSON.stringify({ error: `Invalid quantity for tier ${tier.name}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (tier.max_quantity && tier.sold_quantity + ticket.quantity > tier.max_quantity) {
        return new Response(
          JSON.stringify({ error: `Not enough tickets available for ${tier.name}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (tier.status !== 'active') {
        return new Response(
          JSON.stringify({ error: `Tier ${tier.name} is not available for purchase` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate promo code if provided
    let promoDiscount = 0
    if (body.promo_code) {
      const { data: promo, error: promoError } = await supabaseClient
        .from('promo_codes')
        .select('*')
        .eq('code', body.promo_code.toUpperCase())
        .eq('status', 'active')
        .single()

      if (promoError || !promo) {
        return new Response(
          JSON.stringify({ error: 'Invalid promo code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if promo code is valid for this event
      if (promo.event_id && promo.event_id !== body.event_id) {
        return new Response(
          JSON.stringify({ error: 'Promo code not valid for this event' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check usage limits
      const { count: usageCount } = await supabaseClient
        .from('promo_usage')
        .select('*', { count: 'exact', head: true })
        .eq('promo_id', promo.id)
        .eq('user_id', user.id)

      if (usageCount && usageCount >= promo.max_uses_per_user) {
        return new Response(
          JSON.stringify({ error: 'Promo code usage limit exceeded' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      promoDiscount = promo.discount_amount || 0
    }

    // Calculate totals
    let subtotal = 0
    const ticketDetails = []

    for (const ticket of body.tickets) {
      const tier = tiers.find(t => t.id === ticket.tier_id)!
      const tierTotal = tier.price * ticket.quantity
      subtotal += tierTotal
      
      ticketDetails.push({
        tier_id: tier.id,
        tier_name: tier.name,
        price: tier.price,
        quantity: ticket.quantity,
        total: tierTotal
      })
    }

    const discount = Math.min(promoDiscount, subtotal)
    const total = subtotal - discount

    // Create order
    const orderData = {
      user_id: user.id,
      event_id: body.event_id,
      status: 'pending',
      subtotal: subtotal,
      discount: discount,
      total: total,
      payment_method: body.payment_method,
      customer_email: body.customer_email || user.email,
      customer_name: body.customer_name,
      wallet_address: body.wallet_address,
      promo_code: body.promo_code?.toUpperCase()
    }

    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create order items
    const orderItems = ticketDetails.map(detail => ({
      order_id: order.id,
      tier_id: detail.tier_id,
      quantity: detail.quantity,
      unit_price: detail.price,
      total_price: detail.total
    }))

    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      return new Response(
        JSON.stringify({ error: 'Failed to create order items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update tier sold quantities
    for (const ticket of body.tickets) {
      const { error: updateError } = await supabaseClient
        .from('ticket_tiers')
        .update({ 
          sold_quantity: supabaseClient.rpc('increment', { 
            table_name: 'ticket_tiers', 
            column_name: 'sold_quantity', 
            row_id: ticket.tier_id, 
            increment_value: ticket.quantity 
          })
        })
        .eq('id', ticket.tier_id)

      if (updateError) {
        console.error('Error updating tier quantity:', updateError)
      }
    }

    // Log promo code usage if applicable
    if (body.promo_code) {
      await supabaseClient
        .from('promo_usage')
        .insert({
          promo_id: (await supabaseClient
            .from('promo_codes')
            .select('id')
            .eq('code', body.promo_code.toUpperCase())
            .single()).data!.id,
          user_id: user.id,
          order_id: order.id,
          discount_amount: discount
        })
    }

    // Log the purchase
    await supabaseClient
      .from('user_behavior_logs')
      .insert({
        user_id: user.id,
        event_id: body.event_id,
        behavior_type: 'purchase',
        behavior_data: {
          order_id: order.id,
          total_amount: total,
          ticket_count: body.tickets.reduce((sum, t) => sum + t.quantity, 0),
          payment_method: body.payment_method
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          total: order.total,
          status: order.status,
          payment_method: order.payment_method
        },
        tickets: ticketDetails,
        message: 'Order created successfully. Proceed to payment.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to check organization membership
async function checkOrgMembership(supabaseClient: any, orgId: string, userId: string): Promise<boolean> {
  const { data: membership } = await supabaseClient
    .from('org_members')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single()
  
  return !!membership
}
