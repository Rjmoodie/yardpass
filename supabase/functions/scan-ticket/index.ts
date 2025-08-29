import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

interface ScanTicketRequest {
  qr_code: string;
  event_id: string;
  scanner_location?: string;
  scanner_notes?: string;
  device_info?: {
    device_id?: string;
    app_version?: string;
    platform?: string;
  };
}

interface QRCodeData {
  ticket_id: string;
  order_id: string;
  event_id: string;
  user_id: string;
  timestamp: number;
  signature: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    );

    // Get the authenticated user (scanner)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: ScanTicketRequest = await req.json();

    // Validate required fields
    if (!body.qr_code || !body.event_id) {
      return new Response(
        JSON.stringify({ error: 'QR code and event ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the event
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', body.event_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if scanner has permission to scan for this event
    let hasScanPermission = false;

    // Event creator can scan
    if (event.created_by === user.id) {
      hasScanPermission = true;
    }

    // Organization admins/owners can scan
    if (event.owner_context_type === 'organization') {
      const { data: orgMembership } = await supabaseClient
        .from('org_members')
        .select('role')
        .eq('org_id', event.owner_context_id)
        .eq('user_id', user.id)
        .in('role', ['admin', 'owner'])
        .single();

      if (orgMembership) {
        hasScanPermission = true;
      }
    }

    // Check if user is assigned as a scanner for this event
    const { data: scannerAssignment } = await supabaseClient
      .from('event_scanners')
      .select('*')
      .eq('event_id', body.event_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (scannerAssignment) {
      hasScanPermission = true;
    }

    if (!hasScanPermission) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to scan tickets for this event' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the ticket by QR code
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets_owned')
      .select(`
        *,
        tickets (
          id,
          name,
          description,
          price_cents,
          access_level
        ),
        events!tickets_event_id_fkey (
          id,
          title,
          slug,
          start_at,
          end_at,
          venue,
          city
        ),
        users!tickets_owned_user_id_fkey (
          id,
          display_name,
          email
        )
      `)
      .eq('qr_code', body.qr_code)
      .single();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid ticket',
          details: 'QR code not found'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify QR code data if available
    if (ticket.qr_code_data) {
      try {
        const qrData: QRCodeData = ticket.qr_code_data;
        
        // Verify signature
        const expectedSignature = btoa(`${qrData.ticket_id}_${qrData.order_id}_${qrData.timestamp}`).substring(0, 8);
        if (qrData.signature !== expectedSignature) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid ticket',
              details: 'QR code signature verification failed'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if QR code is expired (24 hours)
        const now = Date.now();
        const qrAge = now - qrData.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (qrAge > maxAge) {
          return new Response(
            JSON.stringify({ 
              error: 'Expired ticket',
              details: 'QR code has expired'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify event ID matches
        if (qrData.event_id !== body.event_id) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid ticket for this event',
              details: 'QR code is for a different event'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.error('QR code data verification error:', error);
        // Continue with basic validation if QR data is corrupted
      }
    }

    // Check if ticket is already used
    if (ticket.is_used) {
      return new Response(
        JSON.stringify({
          error: 'Ticket already used',
          details: `Ticket was used at ${new Date(ticket.used_at!).toLocaleString()}`,
          ticket: {
            id: ticket.id,
            used_at: ticket.used_at,
            access_level: ticket.access_level
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check event timing
    const now = new Date();
    const eventStart = new Date(ticket.events.start_at);
    const eventEnd = new Date(ticket.events.end_at);

    if (now < eventStart) {
      return new Response(
        JSON.stringify({
          error: 'Event has not started',
          details: `Event starts at ${eventStart.toLocaleString()}`,
          ticket: {
            id: ticket.id,
            access_level: ticket.access_level,
            event_start: ticket.events.start_at
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (now > eventEnd) {
      return new Response(
        JSON.stringify({
          error: 'Event has ended',
          details: `Event ended at ${eventEnd.toLocaleString()}`,
          ticket: {
            id: ticket.id,
            access_level: ticket.access_level,
            event_end: ticket.events.end_at
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark ticket as used
    const { error: updateError } = await supabaseClient
      .from('tickets_owned')
      .update({
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', ticket.id);

    if (updateError) {
      console.error('Error updating ticket status:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to process ticket scan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create check-in record
    const { error: checkinError } = await supabaseClient
      .from('checkins')
      .insert({
        tickets_owned_id: ticket.id,
        scanned_by: user.id,
        location: body.scanner_location ? `POINT(${body.scanner_location})` : null,
        metadata: {
          scanner_notes: body.scanner_notes,
          device_info: body.device_info,
          scan_timestamp: new Date().toISOString()
        }
      });

    if (checkinError) {
      console.error('Error creating check-in record:', checkinError);
      // Don't fail the scan if check-in record creation fails
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Ticket scanned successfully',
        ticket: {
          id: ticket.id,
          access_level: ticket.access_level,
          ticket_name: ticket.tickets.name,
          ticket_description: ticket.tickets.description,
          user_name: ticket.users.display_name,
          user_email: ticket.users.email,
          scanned_at: new Date().toISOString()
        },
        event: {
          id: ticket.events.id,
          title: ticket.events.title,
          venue: ticket.events.venue,
          city: ticket.events.city
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scan ticket error:', error);
    return new Response(
      JSON.stringify({
        error: 'Ticket scanning failed',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
