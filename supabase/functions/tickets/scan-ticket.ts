import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScanTicketRequest {
  qr_code: string
  event_id: string
  scanner_location?: string
  scanner_notes?: string
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

    // Get the authenticated user (scanner)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: ScanTicketRequest = await req.json()

    // Validate required fields
    if (!body.qr_code || !body.event_id) {
      return new Response(
        JSON.stringify({ error: 'QR code and event ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the event
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', body.event_id)
      .single()

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if scanner has permission to scan for this event
    let hasScanPermission = false

    // Event creator can scan
    if (event.created_by === user.id) {
      hasScanPermission = true
    }

    // Organization admins/owners can scan
    if (event.owner_context_type === 'organization') {
      const { data: orgMembership } = await supabaseClient
        .from('org_members')
        .select('role')
        .eq('org_id', event.owner_context_id)
        .eq('user_id', user.id)
        .in('role', ['admin', 'owner'])
        .single()

      if (orgMembership) {
        hasScanPermission = true
      }
    }

    // Check if user is assigned as a scanner for this event
    const { data: scannerAssignment } = await supabaseClient
      .from('event_scanners')
      .select('*')
      .eq('event_id', body.event_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (scannerAssignment) {
      hasScanPermission = true
    }

    if (!hasScanPermission) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to scan tickets for this event' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the ticket by QR code
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
        ),
        user_profiles!tickets_user_id_fkey (
          id,
          display_name,
          email
        )
      `)
      .eq('qr_code', body.qr_code)
      .eq('event_id', body.event_id)
      .single()

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid ticket',
          details: 'QR code not found or ticket not valid for this event'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check ticket status
    if (ticket.status !== 'active') {
      return new Response(
        JSON.stringify({ 
          error: 'Ticket not valid',
          details: `Ticket status: ${ticket.status}`,
          ticket_status: ticket.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if ticket has already been scanned
    if (ticket.scanned_at) {
      return new Response(
        JSON.stringify({ 
          error: 'Ticket already scanned',
          details: `Scanned at: ${ticket.scanned_at}`,
          scanned_at: ticket.scanned_at,
          scanned_by: ticket.scanned_by
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if event has started
    const now = new Date()
    const eventStart = new Date(event.start_at)
    
    if (now < eventStart) {
      return new Response(
        JSON.stringify({ 
          error: 'Event has not started yet',
          details: `Event starts at: ${event.start_at}`,
          event_start: event.start_at
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update ticket as scanned
    const { error: scanError } = await supabaseClient
      .from('tickets')
      .update({
        status: 'scanned',
        scanned_at: new Date().toISOString(),
        scanned_by: user.id,
        scanner_location: body.scanner_location,
        scanner_notes: body.scanner_notes
      })
      .eq('id', ticket.id)

    if (scanError) {
      console.error('Error updating ticket scan:', scanError)
      return new Response(
        JSON.stringify({ error: 'Failed to record ticket scan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create scan record
    await supabaseClient
      .from('ticket_scans')
      .insert({
        ticket_id: ticket.id,
        event_id: body.event_id,
        scanner_id: user.id,
        scan_location: body.scanner_location,
        scan_notes: body.scanner_notes,
        scan_timestamp: new Date().toISOString()
      })

    // Log the scan
    await supabaseClient
      .from('user_behavior_logs')
      .insert({
        user_id: user.id,
        event_id: body.event_id,
        behavior_type: 'ticket_scan',
        behavior_data: {
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          attendee_name: ticket.user_profiles?.display_name,
          scan_location: body.scanner_location
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        ticket: {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          tier_name: ticket.ticket_tiers.name,
          attendee_name: ticket.user_profiles?.display_name,
          attendee_email: ticket.user_profiles?.email,
          price: ticket.price
        },
        event: {
          title: ticket.events.title,
          venue: ticket.events.venue
        },
        scan: {
          timestamp: new Date().toISOString(),
          location: body.scanner_location,
          scanner: user.id
        },
        message: 'Ticket scanned successfully'
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

