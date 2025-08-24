import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS'
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

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status'); // active, used, expired, transferred, refunded
    const eventId = url.searchParams.get('event_id');

    if (req.method === 'GET') {
      // Get user's tickets
      return await getUserTickets(supabase, user.id, { page, limit, offset, status, eventId });
    }

    if (req.method === 'POST') {
      // Create ticket transfer
      const { to_user_id, ticket_wallet_id, expires_in_hours } = await req.json();
      return await createTicketTransfer(supabase, user.id, to_user_id, ticket_wallet_id, expires_in_hours);
    }

    if (req.method === 'PUT') {
      // Accept/decline ticket transfer
      const { transfer_id, action } = await req.json();
      return await handleTicketTransfer(supabase, user.id, transfer_id, action);
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Tickets-my error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Get user's tickets
async function getUserTickets(supabase: any, userId: string, params: any) {
  try {
    let query = supabase
      .from('ticket_wallet')
      .select(`
        *,
        tickets!inner(
          id,
          event_id,
          ticket_tier_id,
          access_level,
          created_at,
          ticket_tiers!inner(
            id,
            name,
            description,
            price_cents,
            currency,
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
          cover_image_url,
          status,
          organizations!inner(
            id,
            name,
            slug,
            logo_url
          )
        ),
        orders!inner(
          id,
          total,
          currency,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (params.status) {
      query = query.eq('status', params.status);
    }

    // Apply event filter
    if (params.eventId) {
      query = query.eq('tickets.event_id', params.eventId);
    }

    // Apply pagination
    query = query.range(params.offset, params.offset + params.limit - 1);

    const { data: tickets, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch tickets: ${error.message}`);
    }

    // Get pending transfers for this user
    const { data: pendingTransfers, error: transfersError } = await supabase
      .from('ticket_transfers')
      .select(`
        *,
        ticket_wallet!inner(
          id,
          qr_code,
          tickets!inner(
            id,
            events!inner(
              id,
              title,
              start_at
            )
          )
        ),
        from_user:users!inner(
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .eq('to_user_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (transfersError) {
      console.error('Error fetching pending transfers:', transfersError);
    }

    // Get sent transfers
    const { data: sentTransfers, error: sentTransfersError } = await supabase
      .from('ticket_transfers')
      .select(`
        *,
        ticket_wallet!inner(
          id,
          qr_code,
          tickets!inner(
            id,
            events!inner(
              id,
              title,
              start_at
            )
          )
        ),
        to_user:users!inner(
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .eq('from_user_id', userId)
      .in('status', ['pending', 'accepted', 'declined'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (sentTransfersError) {
      console.error('Error fetching sent transfers:', sentTransfersError);
    }

    // Calculate ticket statistics
    const stats = {
      total: count || 0,
      active: tickets?.filter(t => t.status === 'active').length || 0,
      used: tickets?.filter(t => t.status === 'used').length || 0,
      expired: tickets?.filter(t => t.status === 'expired').length || 0,
      transferred: tickets?.filter(t => t.status === 'transferred').length || 0,
      refunded: tickets?.filter(t => t.status === 'refunded').length || 0,
      pending_transfers: pendingTransfers?.length || 0
    };

    return new Response(
      JSON.stringify({
        tickets: tickets || [],
        pending_transfers: pendingTransfers || [],
        sent_transfers: sentTransfers || [],
        stats,
        meta: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          has_more: (tickets?.length || 0) === params.limit
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error getting user tickets:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get tickets', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Create ticket transfer
async function createTicketTransfer(supabase: any, fromUserId: string, toUserId: string, ticketWalletId: string, expiresInHours: number = 24) {
  try {
    // Validate input
    if (!toUserId || !ticketWalletId) {
      return new Response(
        JSON.stringify({ error: 'to_user_id and ticket_wallet_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if target user exists
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, display_name, username')
      .eq('id', toUserId)
      .single();

    if (userError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create transfer using database function
    const { data: transferId, error: transferError } = await supabase.rpc('create_ticket_transfer', {
      from_user_id: fromUserId,
      to_user_id: toUserId,
      ticket_wallet_id: ticketWalletId,
      expires_in_hours: expiresInHours
    });

    if (transferError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create transfer', details: transferError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get transfer details
    const { data: transfer, error: getTransferError } = await supabase
      .from('ticket_transfers')
      .select(`
        *,
        ticket_wallet!inner(
          id,
          qr_code,
          tickets!inner(
            id,
            events!inner(
              id,
              title,
              start_at
            )
          )
        ),
        to_user:users!inner(
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .eq('id', transferId)
      .single();

    if (getTransferError) {
      console.error('Error getting transfer details:', getTransferError);
    }

    // Send notification to recipient
    try {
      await supabase.rpc('create_notification', {
        p_user_id: toUserId,
        p_notification_type: 'ticket_transfer_received',
        p_title: 'Ticket Transfer Received',
        p_message: `${targetUser.display_name || targetUser.username} wants to transfer a ticket to you.`,
        p_data: {
          transfer_id: transferId,
          from_user_id: fromUserId,
          ticket_wallet_id: ticketWalletId
        }
      });
    } catch (notificationError) {
      console.error('Error sending transfer notification:', notificationError);
    }

    return new Response(
      JSON.stringify({
        transfer_id: transferId,
        transfer: transfer,
        message: 'Transfer request created successfully'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating ticket transfer:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create transfer', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Handle ticket transfer (accept/decline)
async function handleTicketTransfer(supabase: any, userId: string, transferId: string, action: 'accept' | 'decline') {
  try {
    // Validate action
    if (!['accept', 'decline'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Action must be "accept" or "decline"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get transfer details
    const { data: transfer, error: getError } = await supabase
      .from('ticket_transfers')
      .select(`
        *,
        from_user:users!inner(
          id,
          display_name,
          username,
          avatar_url
        ),
        ticket_wallet!inner(
          id,
          tickets!inner(
            id,
            events!inner(
              id,
              title,
              start_at
            )
          )
        )
      `)
      .eq('id', transferId)
      .eq('to_user_id', userId)
      .eq('status', 'pending')
      .single();

    if (getError || !transfer) {
      return new Response(
        JSON.stringify({ error: 'Transfer not found or not authorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (transfer.expires_at < new Date().toISOString()) {
      return new Response(
        JSON.stringify({ error: 'Transfer has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'accept') {
      // Accept transfer using database function
      const { data: success, error: acceptError } = await supabase.rpc('accept_ticket_transfer', {
        transfer_id: transferId,
        to_user_id: userId
      });

      if (acceptError) {
        return new Response(
          JSON.stringify({ error: 'Failed to accept transfer', details: acceptError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send notification to sender
      try {
        await supabase.rpc('create_notification', {
          p_user_id: transfer.from_user_id,
          p_notification_type: 'ticket_transfer_accepted',
          p_title: 'Ticket Transfer Accepted',
          p_message: `${transfer.from_user.display_name || transfer.from_user.username} accepted your ticket transfer.`,
          p_data: {
            transfer_id: transferId,
            to_user_id: userId
          }
        });
      } catch (notificationError) {
        console.error('Error sending acceptance notification:', notificationError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Transfer accepted successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Decline transfer
      const { error: declineError } = await supabase
        .from('ticket_transfers')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', transferId);

      if (declineError) {
        return new Response(
          JSON.stringify({ error: 'Failed to decline transfer', details: declineError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send notification to sender
      try {
        await supabase.rpc('create_notification', {
          p_user_id: transfer.from_user_id,
          p_notification_type: 'ticket_transfer_declined',
          p_title: 'Ticket Transfer Declined',
          p_message: `${transfer.from_user.display_name || transfer.from_user.username} declined your ticket transfer.`,
          p_data: {
            transfer_id: transferId,
            to_user_id: userId
          }
        });
      } catch (notificationError) {
        console.error('Error sending decline notification:', notificationError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Transfer declined successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error handling ticket transfer:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to handle transfer', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

