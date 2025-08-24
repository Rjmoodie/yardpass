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
    const status = url.searchParams.get('status'); // pending, accepted, declined, expired, cancelled

    if (req.method === 'GET') {
      // Get transfer history
      return await getTransferHistory(supabase, user.id, { page, limit, offset, status });
    }

    if (req.method === 'POST') {
      // Create transfer request
      const { to_user_id, ticket_wallet_id, expires_in_hours, message } = await req.json();
      return await createTransferRequest(supabase, user.id, to_user_id, ticket_wallet_id, expires_in_hours, message);
    }

    if (req.method === 'PUT') {
      // Accept/decline transfer
      const { transfer_id, action, message } = await req.json();
      return await handleTransferAction(supabase, user.id, transfer_id, action, message);
    }

    if (req.method === 'DELETE') {
      // Cancel transfer
      const { transfer_id } = await req.json();
      return await cancelTransfer(supabase, user.id, transfer_id);
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Tickets-transfer error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Get transfer history
async function getTransferHistory(supabase: any, userId: string, params: any) {
  try {
    // Get transfers where user is sender or recipient
    let query = supabase
      .from('ticket_transfers')
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
            description,
            start_at,
            end_at,
            venue,
            city,
            cover_image_url,
            organizations!inner(
              id,
              name,
              slug,
              logo_url
            )
          )
        ),
        from_user:users!inner(
          id,
          display_name,
          username,
          avatar_url
        ),
        to_user:users!inner(
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (params.status) {
      query = query.eq('status', params.status);
    }

    // Apply pagination
    query = query.range(params.offset, params.offset + params.limit - 1);

    const { data: transfers, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch transfers: ${error.message}`);
    }

    // Separate incoming and outgoing transfers
    const incomingTransfers = transfers?.filter(t => t.to_user_id === userId) || [];
    const outgoingTransfers = transfers?.filter(t => t.from_user_id === userId) || [];

    // Calculate transfer statistics
    const stats = {
      total: count || 0,
      incoming: incomingTransfers.length,
      outgoing: outgoingTransfers.length,
      pending_incoming: incomingTransfers.filter(t => t.status === 'pending').length,
      pending_outgoing: outgoingTransfers.filter(t => t.status === 'pending').length,
      accepted: transfers?.filter(t => t.status === 'accepted').length || 0,
      declined: transfers?.filter(t => t.status === 'declined').length || 0,
      expired: transfers?.filter(t => t.status === 'expired').length || 0,
      cancelled: transfers?.filter(t => t.status === 'cancelled').length || 0
    };

    return new Response(
      JSON.stringify({
        transfers: transfers || [],
        incoming_transfers: incomingTransfers,
        outgoing_transfers: outgoingTransfers,
        stats,
        meta: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          has_more: (transfers?.length || 0) === params.limit
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error getting transfer history:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get transfer history', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Create transfer request
async function createTransferRequest(supabase: any, fromUserId: string, toUserId: string, ticketWalletId: string, expiresInHours: number = 24, message?: string) {
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
      .select('id, display_name, username, email')
      .eq('id', toUserId)
      .single();

    if (userError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is trying to transfer to themselves
    if (fromUserId === toUserId) {
      return new Response(
        JSON.stringify({ error: 'Cannot transfer ticket to yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get ticket details to validate ownership
    const { data: ticketWallet, error: ticketError } = await supabase
      .from('ticket_wallet')
      .select(`
        *,
        tickets!inner(
          id,
          event_id,
          access_level,
          events!inner(
            id,
            title,
            start_at,
            end_at
          )
        )
      `)
      .eq('id', ticketWalletId)
      .eq('user_id', fromUserId)
      .eq('status', 'active')
      .single();

    if (ticketError || !ticketWallet) {
      return new Response(
        JSON.stringify({ error: 'Ticket not found or not available for transfer' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if event has already started
    if (new Date(ticketWallet.tickets.events.start_at) <= new Date()) {
      return new Response(
        JSON.stringify({ error: 'Cannot transfer tickets for events that have already started' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if there's already a pending transfer for this ticket
    const { data: existingTransfer, error: existingError } = await supabase
      .from('ticket_transfers')
      .select('id')
      .eq('ticket_wallet_id', ticketWalletId)
      .eq('status', 'pending')
      .single();

    if (!existingError && existingTransfer) {
      return new Response(
        JSON.stringify({ error: 'This ticket already has a pending transfer request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Update transfer with message if provided
    if (message) {
      await supabase
        .from('ticket_transfers')
        .update({ metadata: { message } })
        .eq('id', transferId);
    }

    // Get complete transfer details
    const { data: transfer, error: getTransferError } = await supabase
      .from('ticket_transfers')
      .select(`
        *,
        ticket_wallet!inner(
          id,
          qr_code,
          tickets!inner(
            id,
            event_id,
            access_level,
            events!inner(
              id,
              title,
              start_at,
              end_at,
              venue,
              city
            )
          )
        ),
        from_user:users!inner(
          id,
          display_name,
          username,
          avatar_url
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
        p_title: 'Ticket Transfer Request',
        p_message: `${targetUser.display_name || targetUser.username} wants to transfer a ticket for "${ticketWallet.tickets.events.title}" to you.`,
        p_data: {
          transfer_id: transferId,
          from_user_id: fromUserId,
          ticket_wallet_id: ticketWalletId,
          event_title: ticketWallet.tickets.events.title,
          message: message
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
    console.error('Error creating transfer request:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create transfer', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Handle transfer action (accept/decline)
async function handleTransferAction(supabase: any, userId: string, transferId: string, action: 'accept' | 'decline', message?: string) {
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
        to_user:users!inner(
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
              start_at,
              end_at
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

      // Update transfer metadata with response message
      if (message) {
        await supabase
          .from('ticket_transfers')
          .update({ metadata: { ...transfer.metadata, response_message: message } })
          .eq('id', transferId);
      }

      // Send notification to sender
      try {
        await supabase.rpc('create_notification', {
          p_user_id: transfer.from_user_id,
          p_notification_type: 'ticket_transfer_accepted',
          p_title: 'Ticket Transfer Accepted',
          p_message: `${transfer.to_user.display_name || transfer.to_user.username} accepted your ticket transfer for "${transfer.ticket_wallet.tickets.events.title}".`,
          p_data: {
            transfer_id: transferId,
            to_user_id: userId,
            event_title: transfer.ticket_wallet.tickets.events.title,
            response_message: message
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
          updated_at: new Date().toISOString(),
          metadata: { ...transfer.metadata, response_message: message }
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
          p_message: `${transfer.to_user.display_name || transfer.to_user.username} declined your ticket transfer for "${transfer.ticket_wallet.tickets.events.title}".`,
          p_data: {
            transfer_id: transferId,
            to_user_id: userId,
            event_title: transfer.ticket_wallet.tickets.events.title,
            response_message: message
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
    console.error('Error handling transfer action:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to handle transfer', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Cancel transfer
async function cancelTransfer(supabase: any, userId: string, transferId: string) {
  try {
    // Get transfer details
    const { data: transfer, error: getError } = await supabase
      .from('ticket_transfers')
      .select(`
        *,
        to_user:users!inner(
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
              title
            )
          )
        )
      `)
      .eq('id', transferId)
      .eq('from_user_id', userId)
      .eq('status', 'pending')
      .single();

    if (getError || !transfer) {
      return new Response(
        JSON.stringify({ error: 'Transfer not found or not authorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cancel the transfer
    const { error: cancelError } = await supabase
      .from('ticket_transfers')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', transferId);

    if (cancelError) {
      return new Response(
        JSON.stringify({ error: 'Failed to cancel transfer', details: cancelError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send notification to recipient
    try {
      await supabase.rpc('create_notification', {
        p_user_id: transfer.to_user_id,
        p_notification_type: 'ticket_transfer_cancelled',
        p_title: 'Ticket Transfer Cancelled',
        p_message: `${transfer.to_user.display_name || transfer.to_user.username} cancelled the ticket transfer for "${transfer.ticket_wallet.tickets.events.title}".`,
        p_data: {
          transfer_id: transferId,
          from_user_id: userId,
          event_title: transfer.ticket_wallet.tickets.events.title
        }
      });
    } catch (notificationError) {
      console.error('Error sending cancellation notification:', notificationError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transfer cancelled successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error cancelling transfer:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to cancel transfer', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

