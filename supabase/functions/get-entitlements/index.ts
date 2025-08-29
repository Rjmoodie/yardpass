import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
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
    const eventId = url.searchParams.get('eventId');

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'Event ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has tickets for this event
    const { data: tickets, error: ticketsError } = await supabaseClient
      .from('tickets_owned')
      .select(`
        access_level,
        tickets (
          id,
          event_id,
          access_level
        )
      `)
      .eq('user_id', user.id)
      .eq('tickets.event_id', eventId);

    if (ticketsError || !tickets || tickets.length === 0) {
      return new Response(
        JSON.stringify({ access: 'none' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine highest access level
    let highestAccess = 'none';
    
    for (const ticket of tickets) {
      const ticketAccess = ticket.access_level || ticket.tickets?.access_level || 'general';
      
      if (ticketAccess === 'crew') {
        highestAccess = 'crew';
        break;
      } else if (ticketAccess === 'vip' && highestAccess !== 'crew') {
        highestAccess = 'vip';
      } else if (ticketAccess === 'general' && highestAccess === 'none') {
        highestAccess = 'general';
      }
    }

    return new Response(
      JSON.stringify({ access: highestAccess }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get entitlements error:', error);
    return new Response(
      JSON.stringify({ access: 'none' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
