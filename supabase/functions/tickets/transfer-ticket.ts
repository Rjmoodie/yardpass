import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TransferTicketRequest {
  ticket_id: string
  recipient_email: string
  message?: string
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
    const body: TransferTicketRequest = await req.json()

    // Validate required fields
    if (!body.ticket_id || !body.recipient_email) {
      return new Response(
        JSON.stringify({ error: 'Ticket ID and recipient email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.recipient_email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid recipient email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the ticket
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select(`
        *,
        events (
          id,
          title,
          slug,
          start_at,
          venue
        ),
        ticket_tiers (
          id,
          name,
          description
        )
      `)
      .eq('id', body.ticket_id)
      .eq('user_id', user.id)
      .single()

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ error: 'Ticket not found or you do not own this ticket' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check ticket status
    if (ticket.status !== 'active') {
      return new Response(
        JSON.stringify({ 
          error: 'Ticket cannot be transferred',
          details: `Ticket status: ${ticket.status}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if ticket has been scanned
    if (ticket.scanned_at) {
      return new Response(
        JSON.stringify({ 
          error: 'Ticket has already been used and cannot be transferred',
          details: `Scanned at: ${ticket.scanned_at}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if event has already started
    const now = new Date()
    const eventStart = new Date(ticket.events.start_at)
    
    if (now >= eventStart) {
      return new Response(
        JSON.stringify({ 
          error: 'Event has already started. Tickets cannot be transferred.',
          details: `Event started at: ${ticket.events.start_at}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find recipient user
    const { data: recipient, error: recipientError } = await supabaseClient
      .from('user_profiles')
      .select('id, display_name, email')
      .eq('email', body.recipient_email)
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
      .eq('ticket_id', body.ticket_id)
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
      ticket_id: body.ticket_id,
      from_user_id: user.id,
      to_user_id: recipient.id,
      status: 'pending',
      message: body.message,
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
        message: `${user.email} wants to transfer a ticket to you for ${ticket.events.title}`,
        data: {
          transfer_id: transfer.id,
          ticket_id: ticket.id,
          event_title: ticket.events.title,
          sender_email: user.email,
          message: body.message
        },
        status: 'unread',
        created_at: new Date().toISOString()
      })

    // Log the transfer request
    await supabaseClient
      .from('user_behavior_logs')
      .insert({
        user_id: user.id,
        event_id: ticket.event_id,
        behavior_type: 'ticket_transfer_request',
        behavior_data: {
          ticket_id: ticket.id,
          recipient_email: body.recipient_email,
          transfer_id: transfer.id
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        transfer: {
          id: transfer.id,
          status: transfer.status,
          expires_at: transfer.expires_at
        },
        ticket: {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          event_title: ticket.events.title,
          tier_name: ticket.ticket_tiers.name
        },
        recipient: {
          email: recipient.email,
          display_name: recipient.display_name
        },
        message: 'Transfer request sent successfully. Recipient will be notified.'
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

