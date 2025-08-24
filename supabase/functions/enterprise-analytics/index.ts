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
    const organizationId = url.searchParams.get('organization_id');

    // Check enterprise access
    if (organizationId) {
      const { data: membership } = await supabaseClient
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single();

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return new Response(
          JSON.stringify({ error: 'Enterprise access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get enterprise metrics
    const [eventsData, revenueData, ordersData] = await Promise.all([
      supabaseClient.from('events').select('*').eq('owner_context_id', organizationId),
      supabaseClient.from('revenue_tracking').select('*').eq('organization_id', organizationId),
      supabaseClient.from('orders').select('*').eq('organization_id', organizationId)
    ]);

    const totalEvents = eventsData.data?.length || 0;
    const totalRevenue = revenueData.data?.reduce((sum, r) => sum + r.amount, 0) || 0;
    const totalOrders = ordersData.data?.length || 0;
    const completedOrders = ordersData.data?.filter(o => o.status === 'completed').length || 0;

    const analytics = {
      total_events: totalEvents,
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      completed_orders: completedOrders,
      conversion_rate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      average_revenue_per_event: totalEvents > 0 ? totalRevenue / totalEvents : 0,
      organization_id: organizationId
    };

    return new Response(
      JSON.stringify({
        generated_at: new Date().toISOString(),
        data: analytics
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Enterprise analytics error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
