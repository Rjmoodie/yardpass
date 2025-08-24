import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS'
};

interface WaitlistRequest {
  event_id: string;
  tier_id?: string;
  action: 'join' | 'leave' | 'notify_available';
  quantity?: number;
  priority?: 'high' | 'normal' | 'low';
}

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

    if (req.method === 'POST') {
      const { event_id, tier_id, action, quantity = 1, priority = 'normal' }: WaitlistRequest = await req.json();

      if (!event_id || !action) {
        return new Response(
          JSON.stringify({ error: 'event_id and action are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if event exists and is sold out
      const { data: event } = await supabaseClient
        .from('events')
        .select('*')
        .eq('id', event_id)
        .single();

      if (!event) {
        return new Response(
          JSON.stringify({ error: 'Event not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'join') {
        // Check if user is already on waitlist
        const { data: existingWaitlist } = await supabaseClient
          .from('event_waitlist')
          .select('*')
          .eq('event_id', event_id)
          .eq('user_id', user.id)
          .eq('tier_id', tier_id)
          .single();

        if (existingWaitlist) {
          return new Response(
            JSON.stringify({ error: 'Already on waitlist for this event/tier' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Add to waitlist
        const { data: waitlistEntry, error: waitlistError } = await supabaseClient
          .from('event_waitlist')
          .insert({
            event_id: event_id,
            user_id: user.id,
            tier_id: tier_id,
            quantity: quantity,
            priority: priority,
            status: 'waiting',
            joined_at: new Date().toISOString()
          })
          .select()
          .single();

        if (waitlistError) {
          console.error('Error adding to waitlist:', waitlistError);
          return new Response(
            JSON.stringify({ error: 'Failed to join waitlist' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            waitlist_entry: waitlistEntry,
            position: await getWaitlistPosition(supabaseClient, event_id, tier_id, user.id),
            message: 'Successfully joined waitlist'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else if (action === 'leave') {
        // Remove from waitlist
        const { error: removeError } = await supabaseClient
          .from('event_waitlist')
          .delete()
          .eq('event_id', event_id)
          .eq('user_id', user.id)
          .eq('tier_id', tier_id);

        if (removeError) {
          console.error('Error removing from waitlist:', removeError);
          return new Response(
            JSON.stringify({ error: 'Failed to leave waitlist' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Successfully left waitlist'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else if (action === 'notify_available') {
        // Check if user has permission (event organizer)
        if (event.created_by !== user.id && 
            !(event.owner_context_type === 'organization' && 
              await checkOrgAccess(supabaseClient, user.id, event.owner_context_id))) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Notify waitlist members about available tickets
        await notifyWaitlistMembers(supabaseClient, event_id, tier_id);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Waitlist notifications sent'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      const eventId = url.searchParams.get('event_id');
      const tierId = url.searchParams.get('tier_id');

      if (eventId) {
        // Get waitlist for specific event/tier
        let query = supabaseClient
          .from('event_waitlist')
          .select(`
            *,
            user_profiles!inner(name, email),
            ticket_tiers(name)
          `)
          .eq('event_id', eventId)
          .order('priority', { ascending: false })
          .order('joined_at', { ascending: true });

        if (tierId) {
          query = query.eq('tier_id', tierId);
        }

        const { data: waitlist } = await query;

        // Get user's position if they're on the waitlist
        let userPosition = null;
        if (tierId) {
          userPosition = await getWaitlistPosition(supabaseClient, eventId, tierId, user.id);
        }

        return new Response(
          JSON.stringify({
            event_id: eventId,
            tier_id: tierId,
            waitlist: waitlist || [],
            total_waiting: waitlist?.length || 0,
            user_position: userPosition
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Get user's waitlist entries
        const { data: userWaitlist } = await supabaseClient
          .from('event_waitlist')
          .select(`
            *,
            events!inner(title, start_at, venue),
            ticket_tiers(name, price)
          `)
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false });

        return new Response(
          JSON.stringify({
            user_waitlist: userWaitlist || [],
            total_entries: userWaitlist?.length || 0
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

  } catch (error) {
    console.error('Waitlist management error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getWaitlistPosition(supabaseClient: any, eventId: string, tierId: string, userId: string) {
  const { data: waitlist } = await supabaseClient
    .from('event_waitlist')
    .select('id, priority, joined_at')
    .eq('event_id', eventId)
    .eq('tier_id', tierId)
    .order('priority', { ascending: false })
    .order('joined_at', { ascending: true });

  if (!waitlist) return null;

  const userIndex = waitlist.findIndex(entry => entry.id === userId);
  return userIndex >= 0 ? userIndex + 1 : null;
}

async function notifyWaitlistMembers(supabaseClient: any, eventId: string, tierId?: string) {
  // Get waitlist members
  let query = supabaseClient
    .from('event_waitlist')
    .select(`
      user_id,
      quantity,
      priority,
      user_profiles!inner(email, name)
    `)
    .eq('event_id', eventId)
    .eq('status', 'waiting')
    .order('priority', { ascending: false })
    .order('joined_at', { ascending: true });

  if (tierId) {
    query = query.eq('tier_id', tierId);
  }

  const { data: waitlistMembers } = await query;

  if (!waitlistMembers || waitlistMembers.length === 0) return;

  // Get event details
  const { data: event } = await supabaseClient
    .from('events')
    .select('title, start_at, venue')
    .eq('id', eventId)
    .single();

  // Create notifications for waitlist members
  const notifications = waitlistMembers.map(member => ({
    user_id: member.user_id,
    type: 'waitlist_notification',
    title: 'Tickets Available!',
    message: `Tickets are now available for ${event.title}. You're on the waitlist!`,
    data: {
      event_id: eventId,
      tier_id: tierId,
      priority: member.priority,
      quantity: member.quantity
    },
    status: 'unread'
  }));

  await supabaseClient
    .from('notifications')
    .insert(notifications);

  // Update waitlist status to notified
  const memberIds = waitlistMembers.map(m => m.user_id);
  await supabaseClient
    .from('event_waitlist')
    .update({ status: 'notified' })
    .in('user_id', memberIds)
    .eq('event_id', eventId);
}

async function checkOrgAccess(supabaseClient: any, userId: string, orgId: string): Promise<boolean> {
  const { data: membership } = await supabaseClient
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .single();

  return membership && ['owner', 'admin'].includes(membership.role);
}

