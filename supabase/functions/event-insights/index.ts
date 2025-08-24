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
    const eventId = url.searchParams.get('event_id');

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'event_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get event insights
    const [ticketsData, ordersData, revenueData] = await Promise.all([
      supabaseClient.from('tickets').select('status, price').eq('event_id', eventId),
      supabaseClient.from('orders').select('total, status').eq('event_id', eventId),
      supabaseClient.from('revenue_tracking').select('amount').eq('event_id', eventId)
    ]);

    const totalTickets = ticketsData.data?.length || 0;
    const soldTickets = ticketsData.data?.filter(t => t.status === 'active').length || 0;
    const totalRevenue = revenueData.data?.reduce((sum, r) => sum + r.amount, 0) || 0;
    const totalOrders = ordersData.data?.length || 0;
    const completedOrders = ordersData.data?.filter(o => o.status === 'completed').length || 0;

    const insights = {
      total_tickets: totalTickets,
      sold_tickets: soldTickets,
      available_tickets: totalTickets - soldTickets,
      sell_through_rate: totalTickets > 0 ? (soldTickets / totalTickets) * 100 : 0,
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      completed_orders: completedOrders,
      average_order_value: completedOrders > 0 ? totalRevenue / completedOrders : 0,
      conversion_rate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
    };

    return new Response(
      JSON.stringify({
        event_id: eventId,
        generated_at: new Date().toISOString(),
        data: insights
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Event insights error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
