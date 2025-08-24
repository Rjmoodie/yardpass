import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';

    switch (action) {
      case 'join':
        return await joinWaitlist(supabaseClient, user, req);
      case 'leave':
        return await leaveWaitlist(supabaseClient, user, req);
      case 'list':
        return await getWaitlist(supabaseClient, user, req);
      case 'notify':
        return await notifyWaitlist(supabaseClient, user, req);
      case 'convert':
        return await convertWaitlistToTicket(supabaseClient, user, req);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Waitlist management error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function joinWaitlist(supabase: any, user: any, req: Request) {
  const { event_id, ticket_tier_id, quantity = 1 } = await req.json();

  if (!event_id || !ticket_tier_id) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if event is sold out
  const { data: ticketTier, error: tierError } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticket_tier_id)
    .eq('is_active', true)
    .single();

  if (tierError || !ticketTier) {
    return new Response(
      JSON.stringify({ error: 'Ticket tier not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (ticketTier.quantity_available > ticketTier.quantity_sold) {
    return new Response(
      JSON.stringify({ error: 'Event is not sold out' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if user is already on waitlist
  const { data: existingWaitlist } = await supabase
    .from('event_waitlists')
    .select('*')
    .eq('event_id', event_id)
    .eq('user_id', user.id)
    .eq('ticket_tier_id', ticket_tier_id)
    .single();

  if (existingWaitlist) {
    return new Response(
      JSON.stringify({ error: 'Already on waitlist for this event' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Add to waitlist
  const { data: waitlistEntry, error: waitlistError } = await supabase
    .from('event_waitlists')
    .insert({
      event_id,
      user_id: user.id,
      ticket_tier_id,
      quantity_requested: quantity,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    })
    .select()
    .single();

  if (waitlistError) {
    return new Response(
      JSON.stringify({ error: 'Failed to join waitlist' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update waitlist positions
  await updateWaitlistPositions(supabase, event_id);

  return new Response(
    JSON.stringify({ 
      success: true, 
      waitlist_entry: waitlistEntry,
      message: 'Successfully joined waitlist'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function leaveWaitlist(supabase: any, user: any, req: Request) {
  const { waitlist_id } = await req.json();

  if (!waitlist_id) {
    return new Response(
      JSON.stringify({ error: 'Missing waitlist ID' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get waitlist entry to check ownership and get event_id
  const { data: waitlistEntry, error: fetchError } = await supabase
    .from('event_waitlists')
    .select('event_id')
    .eq('id', waitlist_id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !waitlistEntry) {
    return new Response(
      JSON.stringify({ error: 'Waitlist entry not found or access denied' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Remove from waitlist
  const { error: deleteError } = await supabase
    .from('event_waitlists')
    .delete()
    .eq('id', waitlist_id)
    .eq('user_id', user.id);

  if (deleteError) {
    return new Response(
      JSON.stringify({ error: 'Failed to leave waitlist' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update waitlist positions
  await updateWaitlistPositions(supabase, waitlistEntry.event_id);

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Successfully left waitlist'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getWaitlist(supabase: any, user: any, req: Request) {
  const url = new URL(req.url);
  const event_id = url.searchParams.get('event_id');
  const user_id = url.searchParams.get('user_id');

  let query = supabase
    .from('event_waitlists')
    .select(`
      *,
      events (
        id,
        title,
        slug,
        start_at,
        end_at,
        venue,
        city
      ),
      tickets (
        id,
        name,
        price,
        currency
      )
    `);

  if (event_id) {
    query = query.eq('event_id', event_id);
  }

  if (user_id) {
    query = query.eq('user_id', user_id);
  } else {
    // If no specific user_id, only show user's own waitlist entries
    query = query.eq('user_id', user.id);
  }

  const { data: waitlistEntries, error } = await query
    .order('created_at', { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch waitlist' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      waitlist_entries: waitlistEntries
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function notifyWaitlist(supabase: any, user: any, req: Request) {
  const { event_id, ticket_tier_id } = await req.json();

  if (!event_id || !ticket_tier_id) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if user is event organizer
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('org_id')
    .eq('id', event_id)
    .single();

  if (eventError || !event) {
    return new Response(
      JSON.stringify({ error: 'Event not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: orgMember } = await supabase
    .from('org_members')
    .select('*')
    .eq('org_id', event.org_id)
    .eq('user_id', user.id)
    .single();

  if (!orgMember) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - not event organizer' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get waitlist entries to notify
  const { data: waitlistEntries, error: waitlistError } = await supabase
    .from('event_waitlists')
    .select(`
      *,
      users (id, email, name)
    `)
    .eq('event_id', event_id)
    .eq('ticket_tier_id', ticket_tier_id)
    .eq('status', 'waiting')
    .order('position', { ascending: true });

  if (waitlistError) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch waitlist' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update status to notified
  const { error: updateError } = await supabase
    .from('event_waitlists')
    .update({ 
      status: 'notified',
      notification_sent_at: new Date().toISOString()
    })
    .eq('event_id', event_id)
    .eq('ticket_tier_id', ticket_tier_id)
    .eq('status', 'waiting');

  if (updateError) {
    return new Response(
      JSON.stringify({ error: 'Failed to update waitlist status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      notified_count: waitlistEntries.length,
      message: `Notified ${waitlistEntries.length} waitlist entries`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function convertWaitlistToTicket(supabase: any, user: any, req: Request) {
  const { waitlist_id } = await req.json();

  if (!waitlist_id) {
    return new Response(
      JSON.stringify({ error: 'Missing waitlist ID' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get waitlist entry
  const { data: waitlistEntry, error: fetchError } = await supabase
    .from('event_waitlists')
    .select(`
      *,
      events (id, title, slug),
      tickets (id, name, price, currency, quantity_available, quantity_sold)
    `)
    .eq('id', waitlist_id)
    .eq('user_id', user.id)
    .eq('status', 'notified')
    .single();

  if (fetchError || !waitlistEntry) {
    return new Response(
      JSON.stringify({ error: 'Waitlist entry not found or not eligible for conversion' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if tickets are available
  if (waitlistEntry.tickets.quantity_sold >= waitlistEntry.tickets.quantity_available) {
    return new Response(
      JSON.stringify({ error: 'No tickets available for conversion' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      event_id: waitlistEntry.event_id,
      total: waitlistEntry.tickets.price * waitlistEntry.quantity_requested,
      currency: waitlistEntry.tickets.currency,
      status: 'paid',
      metadata: { 
        source: 'waitlist_conversion',
        waitlist_id: waitlist_id
      }
    })
    .select()
    .single();

  if (orderError) {
    return new Response(
      JSON.stringify({ error: 'Failed to create order' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create tickets
  const tickets = [];
  for (let i = 0; i < waitlistEntry.quantity_requested; i++) {
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        event_id: waitlistEntry.event_id,
        tier_id: waitlistEntry.ticket_tier_id,
        user_id: user.id,
        order_id: order.id,
        status: 'active',
        price: waitlistEntry.tickets.price
      })
      .select()
      .single();

    if (ticketError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create ticket' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    tickets.push(ticket);
  }

  // Update ticket tier sold count
  await supabase
    .from('tickets')
    .update({ quantity_sold: waitlistEntry.tickets.quantity_sold + waitlistEntry.quantity_requested })
    .eq('id', waitlistEntry.ticket_tier_id);

  // Update waitlist status
  await supabase
    .from('event_waitlists')
    .update({ status: 'converted' })
    .eq('id', waitlist_id);

  return new Response(
    JSON.stringify({ 
      success: true, 
      order: order,
      tickets: tickets,
      message: 'Successfully converted waitlist to tickets'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateWaitlistPositions(supabase: any, event_id: string) {
  // Update positions for all waitlist entries for this event
  const { data: waitlistEntries } = await supabase
    .from('event_waitlists')
    .select('id, ticket_tier_id, created_at')
    .eq('event_id', event_id)
    .eq('status', 'waiting')
    .order('created_at', { ascending: true });

  if (waitlistEntries) {
    let position = 1;
    for (const entry of waitlistEntries) {
      await supabase
        .from('event_waitlists')
        .update({ position })
        .eq('id', entry.id);
      position++;
    }
  }
}

