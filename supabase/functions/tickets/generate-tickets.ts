import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateTicketsRequest {
  order_id: string
  payment_intent_id?: string
  transaction_hash?: string
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
    const body: GenerateTicketsRequest = await req.json()

    // Validate required fields
    if (!body.order_id) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          ticket_tiers (
            *,
            events (
              id,
              title,
              slug,
              start_at,
              venue,
              city
            )
          )
        )
      `)
      .eq('id', body.order_id)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if order is already processed
    if (order.status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Order already processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update order with payment information
    const updateData: any = {
      status: 'completed',
      updated_at: new Date().toISOString()
    }

    if (body.payment_intent_id) {
      updateData.payment_intent_id = body.payment_intent_id
    }

    if (body.transaction_hash) {
      updateData.transaction_hash = body.transaction_hash
    }

    const { error: updateError } = await supabaseClient
      .from('orders')
      .update(updateData)
      .eq('id', body.order_id)

    if (updateError) {
      console.error('Error updating order:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate tickets for each order item
    const generatedTickets = []

    for (const item of order.order_items) {
      const tier = item.ticket_tiers
      const event = tier.events

      // Generate individual tickets for the quantity
      for (let i = 0; i < item.quantity; i++) {
        // Generate unique QR code
        const qrCodeData = {
          ticket_id: crypto.randomUUID(),
          event_id: event.id,
          tier_id: tier.id,
          order_id: order.id,
          user_id: user.id
        }

        const qrCode = await generateQRCode(JSON.stringify(qrCodeData))

        // Create ticket
        const ticketData = {
          id: qrCodeData.ticket_id,
          order_id: order.id,
          user_id: user.id,
          event_id: event.id,
          tier_id: tier.id,
          status: 'active',
          qr_code: qrCode,
          qr_code_data: qrCodeData,
          ticket_number: `${event.slug}-${tier.name}-${Date.now()}-${i + 1}`,
          price: item.unit_price,
          created_at: new Date().toISOString()
        }

        const { data: ticket, error: ticketError } = await supabaseClient
          .from('tickets')
          .insert(ticketData)
          .select()
          .single()

        if (ticketError) {
          console.error('Error creating ticket:', ticketError)
          continue
        }

        generatedTickets.push({
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          tier_name: tier.name,
          price: ticket.price,
          qr_code: ticket.qr_code
        })
      }
    }

    // Create revenue tracking entry
    await supabaseClient
      .from('revenue_tracking')
      .insert({
        order_id: order.id,
        event_id: order.event_id,
        amount: order.total,
        revenue_type: 'ticket_sales',
        payment_method: order.payment_method,
        created_at: new Date().toISOString()
      })

    // Log the ticket generation
    await supabaseClient
      .from('user_behavior_logs')
      .insert({
        user_id: user.id,
        event_id: order.event_id,
        behavior_type: 'ticket_generation',
        behavior_data: {
          order_id: order.id,
          ticket_count: generatedTickets.length,
          total_amount: order.total
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          status: order.status,
          total: order.total
        },
        tickets: generatedTickets,
        message: `${generatedTickets.length} tickets generated successfully`
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

// Helper function to generate QR code
async function generateQRCode(data: string): Promise<string> {
  // For now, return a simple hash. In production, you'd use a QR code library
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex.substring(0, 32)
}

