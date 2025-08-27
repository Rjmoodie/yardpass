import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS'
};

interface SchedulingRequest {
  event_id: string;
  action: 'schedule' | 'reschedule' | 'cancel' | 'check_conflicts';
  new_start_at?: string;
  new_end_at?: string;
  reason?: string;
  notify_participants?: boolean;
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
      const { event_id, action, new_start_at, new_end_at, reason, notify_participants }: SchedulingRequest = await req.json();

      if (!event_id || !action) {
        return new Response(
          JSON.stringify({ error: 'event_id and action are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get event details
      const { data: event, error: eventError } = await supabaseClient
        .from('events')
        .select('*')
        .eq('id', event_id)
        .single();

      if (eventError || !event) {
        return new Response(
          JSON.stringify({ error: 'Event not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check permissions
      if (event.created_by !== user.id && 
          !(event.owner_context_type === 'organization' && 
            await checkOrgAccess(supabaseClient, user.id, event.owner_context_id))) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'check_conflicts') {
        // Check for scheduling conflicts
        const conflicts = await checkSchedulingConflicts(supabaseClient, event_id, new_start_at, new_end_at);
        
        return new Response(
          JSON.stringify({
            has_conflicts: conflicts.length > 0,
            conflicts: conflicts
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'reschedule' && (!new_start_at || !new_end_at)) {
        return new Response(
          JSON.stringify({ error: 'new_start_at and new_end_at are required for rescheduling' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update event
      const updateData: any = {};
      if (action === 'reschedule') {
        updateData.start_at = new_start_at;
        updateData.end_at = new_end_at;
        updateData.status = 'rescheduled';
      } else if (action === 'cancel') {
        updateData.status = 'cancelled';
      }

      updateData.updated_at = new Date().toISOString();

      const { error: updateError } = await supabaseClient
        .from('events')
        .update(updateData)
        .eq('id', event_id);

      if (updateError) {
        console.error('Error updating event:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update event' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create scheduling log
      await supabaseClient
        .from('event_scheduling_logs')
        .insert({
          event_id: event_id,
          action: action,
          previous_start_at: event.start_at,
          previous_end_at: event.end_at,
          new_start_at: new_start_at,
          new_end_at: new_end_at,
          reason: reason,
          performed_by: user.id
        });

      // Notify participants if requested
      if (notify_participants) {
        await notifyEventParticipants(supabaseClient, event_id, action, reason);
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: action,
          event_id: event_id,
          message: `Event ${action} successful`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (req.method === 'GET') {
      // Get scheduling information
      const url = new URL(req.url);
      const eventId = url.searchParams.get('event_id');

      if (eventId) {
        // Get specific event scheduling info
        const { data: event } = await supabaseClient
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        const { data: schedulingLogs } = await supabaseClient
          .from('event_scheduling_logs')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });

        return new Response(
          JSON.stringify({
            event: event,
            scheduling_history: schedulingLogs || [],
            total_changes: schedulingLogs?.length || 0
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Get user's event scheduling overview
        const { data: userEvents } = await supabaseClient
          .from('events')
          .select('id, title, start_at, end_at, status')
          .eq('created_by', user.id)
          .order('start_at', { ascending: true });

        return new Response(
          JSON.stringify({
            user_events: userEvents || [],
            upcoming_events: userEvents?.filter(e => new Date(e.start_at) > new Date()) || [],
            total_events: userEvents?.length || 0
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

  } catch (error) {
    console.error('Event scheduling error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkSchedulingConflicts(supabaseClient: any, eventId: string, newStartAt: string, newEndAt: string) {
  const conflicts = [];

  // Check for venue conflicts
  const { data: event } = await supabaseClient
    .from('events')
    .select('venue, city')
    .eq('id', eventId)
    .single();

  if (event?.venue) {
    const { data: venueConflicts } = await supabaseClient
      .from('events')
      .select('id, title, start_at, end_at')
      .eq('venue', event.venue)
      .eq('city', event.city)
      .neq('id', eventId)
      .neq('status', 'cancelled')
      .or(`start_at.lt.${newEndAt},end_at.gt.${newStartAt}`);

    if (venueConflicts && venueConflicts.length > 0) {
      conflicts.push({
        type: 'venue_conflict',
        conflicts: venueConflicts
      });
    }
  }

  // Check for organizer conflicts
  const { data: organizerConflicts } = await supabaseClient
    .from('events')
    .select('id, title, start_at, end_at')
    .eq('created_by', user.id)
    .neq('id', eventId)
    .neq('status', 'cancelled')
    .or(`start_at.lt.${newEndAt},end_at.gt.${newStartAt}`);

  if (organizerConflicts && organizerConflicts.length > 0) {
    conflicts.push({
      type: 'organizer_conflict',
      conflicts: organizerConflicts
    });
  }

  return conflicts;
}

async function notifyEventParticipants(supabaseClient: any, eventId: string, action: string, reason?: string) {
  // Get all ticket holders
  const { data: tickets } = await supabaseClient
    .from('tickets')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('status', 'active');

  if (!tickets || tickets.length === 0) return;

  const userIds = [...new Set(tickets.map(t => t.user_id))];
  const actionMessages = {
    'reschedule': 'Event has been rescheduled',
    'cancel': 'Event has been cancelled',
    'schedule': 'Event has been scheduled'
  };

  // Create communications for all participants using the new unified system
  const communications = userIds.map(userId => ({
    user_id: userId,
    title: 'Event Update',
    body: `${actionMessages[action]}. ${reason ? `Reason: ${reason}` : ''}`,
    communication_type: 'in_app',
    notification_type: 'event_update',
    data: {
      event_id: eventId,
      action: action,
      reason: reason
    },
    status: 'pending',
    related_entity_type: 'event',
    related_entity_id: eventId
  }));

  await supabaseClient
    .from('communications')
    .insert(communications);
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
