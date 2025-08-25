import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const body = await req.json()
    const { ticket_id, recipient_email, message } = body

    // Validate required fields
    if (!ticket_id || !recipient_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: ticket_id, recipient_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get ticket with event details using proper join
    const { data: ticketData, error: ticketError } = await supabaseClient
      .from('ticket_wallet')
      .select(`
        id,
        status,
        tickets!inner (
          id,
          name,
          price,
          events!inner (
            id,
            title,
            start_at,
            end_at,
            venue,
            city
          )
        )
      `)
      .eq('id', ticket_id)
      .eq('user_id', user.id)
      .single()

    if (ticketError || !ticketData) {
      return new Response(
        JSON.stringify({ error: 'Ticket not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if ticket is active
    if (ticketData.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Ticket is not active and cannot be transferred' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if event has already started
    const now = new Date()
    const eventStart = new Date(ticketData.tickets.events.start_at)
    
    if (now >= eventStart) {
      return new Response(
        JSON.stringify({ 
          error: 'Event has already started. Tickets cannot be transferred.',
          details: `Event started at: ${ticketData.tickets.events.start_at}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find recipient user
    const { data: recipient, error: recipientError } = await supabaseClient
      .from('profiles')
      .select('id, display_name, email')
      .eq('email', recipient_email)
      .single()

    if (recipientError || !recipient) {
      return new Response(
        JSON.stringify({ error: 'Recipient not found. They must have a YardPass account.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if recipient is the same as sender
    if (recipient.id === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot transfer ticket to yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if there's already a pending transfer for this ticket
    const { data: existingTransfer, error: transferCheckError } = await supabaseClient
      .from('ticket_transfers')
      .select('*')
      .eq('ticket_id', ticket_id)
      .eq('status', 'pending')
      .single()

    if (existingTransfer) {
      return new Response(
        JSON.stringify({ error: 'Ticket already has a pending transfer' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create transfer record
    const transferData = {
      ticket_id: ticket_id,
      from_user_id: user.id,
      to_user_id: recipient.id,
      status: 'pending',
      message: message || '',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      created_at: new Date().toISOString()
    }

    const { data: transfer, error: transferError } = await supabaseClient
      .from('ticket_transfers')
      .insert(transferData)
      .select()
      .single()

    if (transferError) {
      console.error('Error creating transfer:', transferError)
      return new Response(
        JSON.stringify({ error: 'Failed to create transfer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create notification for recipient
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: recipient.id,
        type: 'ticket_transfer',
        title: 'Ticket Transfer Request',
        message: `${user.email} wants to transfer a ticket to you for ${ticketData.tickets.events.title}`,
        data: {
          transfer_id: transfer.id,
          ticket_id: ticket_id,
          event_title: ticketData.tickets.events.title,
          sender_email: user.email,
          message: message
        },
        status: 'unread',
        created_at: new Date().toISOString()
      })

    // Log the transfer request
    await supabaseClient
      .from('user_behavior_logs')
      .insert({
        user_id: user.id,
        action_type: 'ticket_transfer_requested',
        metadata: {
          ticket_id: ticket_id,
          recipient_email: recipient_email,
          transfer_id: transfer.id,
          event_title: ticketData.tickets.events.title
        },
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({
        success: true,
        transfer_id: transfer.id,
        message: 'Transfer request created successfully. Recipient will be notified.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
