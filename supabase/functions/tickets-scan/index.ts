import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      // Scan ticket
      const { qr_code, location_lat, location_lng, device_info } = await req.json();
      return await scanTicket(supabase, user.id, qr_code, location_lat, location_lng, device_info);
    }

    if (req.method === 'GET') {
      // Get scan history for event
      const url = new URL(req.url);
      const eventId = url.searchParams.get('event_id');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;
      
      return await getScanHistory(supabase, user.id, eventId, { page, limit, offset });
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Tickets-scan error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Scan ticket function
async function scanTicket(supabase: any, scannerId: string, qrCode: string, locationLat?: number, locationLng?: number, deviceInfo?: any) {
  try {
    // Validate input
    if (!qrCode) {
      return new Response(
        JSON.stringify({ error: 'QR code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process the scan using database function
    const { data: scanResult, error: scanError } = await supabase.rpc('process_ticket_scan', {
      qr_code: qrCode,
      scanned_by: scannerId,
      location_lat: locationLat,
      location_lng: locationLng,
      device_info: deviceInfo || {}
    });

    if (scanError) {
      return new Response(
        JSON.stringify({ error: 'Failed to process scan', details: scanError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get detailed ticket information for response
    let ticketDetails = null;
    if (scanResult.success && scanResult.ticket_wallet_id) {
      const { data: ticket, error: ticketError } = await supabase
        .from('ticket_wallet')
        .select(`
          *,
          tickets!inner(
            id,
            event_id,
            access_level,
            ticket_tiers!inner(
              id,
              name,
              description,
              access_level
            )
          ),
          events!inner(
            id,
            title,
            description,
            start_at,
            end_at,
            venue,
            city,
            organizations!inner(
              id,
              name,
              slug,
              logo_url
            )
          ),
          users!inner(
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('id', scanResult.ticket_wallet_id)
        .single();

      if (!ticketError && ticket) {
        ticketDetails = ticket;
      }
    }

    // Check if scanner has permission to scan for this event
    if (scanResult.success && ticketDetails) {
      const hasPermission = await checkScannerPermission(supabase, scannerId, ticketDetails.tickets.event_id);
      if (!hasPermission) {
        return new Response(
          JSON.stringify({ 
            error: 'You do not have permission to scan tickets for this event',
            scan_result: 'unauthorized'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Prepare response
    const response = {
      success: scanResult.success,
      scan_result: scanResult.scan_result,
      error_message: scanResult.error_message,
      ticket: ticketDetails,
      scanned_at: new Date().toISOString(),
      scanner_id: scannerId
    };

    // Send notification to ticket holder if scan was successful
    if (scanResult.success && ticketDetails) {
      try {
        await supabase.rpc('create_notification', {
          p_user_id: ticketDetails.user_id,
          p_notification_type: 'ticket_used',
          p_title: 'Ticket Used',
          p_message: `Your ticket for "${ticketDetails.events.title}" has been used.`,
          p_data: {
            event_id: ticketDetails.tickets.event_id,
            ticket_wallet_id: scanResult.ticket_wallet_id,
            scanned_at: response.scanned_at
          }
        });
      } catch (notificationError) {
        console.error('Error sending ticket used notification:', notificationError);
      }
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error scanning ticket:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to scan ticket', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Get scan history for an event
async function getScanHistory(supabase: any, userId: string, eventId: string, params: any) {
  try {
    // Check if user has permission to view scan history for this event
    if (eventId) {
      const hasPermission = await checkScannerPermission(supabase, userId, eventId);
      if (!hasPermission) {
        return new Response(
          JSON.stringify({ error: 'You do not have permission to view scan history for this event' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Build query for scan history
    let query = supabase
      .from('ticket_scans')
      .select(`
        *,
        ticket_wallet!inner(
          id,
          qr_code,
          status,
          tickets!inner(
            id,
            event_id,
            access_level,
            ticket_tiers!inner(
              id,
              name,
              description,
              access_level
            )
          ),
          events!inner(
            id,
            title,
            start_at,
            end_at,
            venue,
            city
          ),
          users!inner(
            id,
            display_name,
            username,
            avatar_url
          )
        ),
        scanner:users!inner(
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .order('scanned_at', { ascending: false });

    // Filter by event if specified
    if (eventId) {
      query = query.eq('ticket_wallet.tickets.event_id', eventId);
    }

    // Apply pagination
    query = query.range(params.offset, params.offset + params.limit - 1);

    const { data: scans, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch scan history: ${error.message}`);
    }

    // Get scan statistics
    const stats = {
      total_scans: count || 0,
      valid_scans: scans?.filter(s => s.scan_result === 'valid').length || 0,
      invalid_scans: scans?.filter(s => s.scan_result !== 'valid').length || 0,
      duplicate_scans: scans?.filter(s => s.scan_result === 'already_used').length || 0
    };

    // Group scans by date for analytics
    const scansByDate = scans?.reduce((acc: any, scan: any) => {
      const date = new Date(scan.scanned_at).toDateString();
      if (!acc[date]) {
        acc[date] = {
          date,
          total: 0,
          valid: 0,
          invalid: 0,
          duplicate: 0
        };
      }
      acc[date].total++;
      if (scan.scan_result === 'valid') {
        acc[date].valid++;
      } else if (scan.scan_result === 'already_used') {
        acc[date].duplicate++;
      } else {
        acc[date].invalid++;
      }
      return acc;
    }, {}) || {};

    return new Response(
      JSON.stringify({
        scans: scans || [],
        stats,
        analytics: Object.values(scansByDate),
        meta: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          has_more: (scans?.length || 0) === params.limit
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error getting scan history:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get scan history', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Check if user has permission to scan tickets for an event
async function checkScannerPermission(supabase: any, userId: string, eventId: string): Promise<boolean> {
  try {
    // Check if user is the event creator
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('created_by')
      .eq('id', eventId)
      .single();

    if (!eventError && event && event.created_by === userId) {
      return true;
    }

    // Check if user is an organization member with scan permissions
    const { data: orgMember, error: orgError } = await supabase
      .from('org_members')
      .select(`
        role,
        orgs!inner(
          id,
          events!inner(id)
        )
      `)
      .eq('user_id', userId)
      .eq('orgs.events.id', eventId)
      .in('role', ['admin', 'owner'])
      .single();

    if (!orgError && orgMember) {
      return true;
    }

    // Check if user has been granted scan permissions for this event
    const { data: scanPermission, error: permissionError } = await supabase
      .from('event_scanners')
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('is_active', true)
      .single();

    if (!permissionError && scanPermission) {
      return true;
    }

    return false;

  } catch (error) {
    console.error('Error checking scanner permission:', error);
    return false;
  }
}

