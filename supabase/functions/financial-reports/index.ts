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
    // Create Supabase client with proper authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const reportType = url.searchParams.get('type') || 'overview';
    const eventId = url.searchParams.get('event_id');
    const orgId = url.searchParams.get('organization_id');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const period = url.searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y, custom

    let reportData: any = {};

    if (reportType === 'overview') {
      reportData = await generateOverviewReport(supabaseClient, user.id, eventId, orgId, period, startDate, endDate);
    } else if (reportType === 'revenue') {
      reportData = await generateRevenueReport(supabaseClient, user.id, eventId, orgId, period, startDate, endDate);
    } else if (reportType === 'tickets') {
      reportData = await generateTicketReport(supabaseClient, user.id, eventId, orgId, period, startDate, endDate);
    } else if (reportType === 'payouts') {
      reportData = await generatePayoutReport(supabaseClient, user.id, eventId, orgId, period, startDate, endDate);
    } else if (reportType === 'refunds') {
      reportData = await generateRefundReport(supabaseClient, user.id, eventId, orgId, period, startDate, endDate);
    }

    return new Response(
      JSON.stringify({
        report_type: reportType,
        generated_at: new Date().toISOString(),
        data: reportData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Financial report error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateOverviewReport(supabaseClient: any, userId: string, eventId?: string, orgId?: string, period?: string, startDate?: string, endDate?: string) {
  const dateFilter = buildDateFilter(period, startDate, endDate);
  
  let revenueQuery = supabaseClient
    .from('revenue_tracking')
    .select('amount, created_at')
    .gte('created_at', dateFilter.start)
    .lte('created_at', dateFilter.end);

  let ordersQuery = supabaseClient
    .from('orders')
    .select('total, status, created_at')
    .gte('created_at', dateFilter.start)
    .lte('created_at', dateFilter.end);

  if (eventId) {
    revenueQuery = revenueQuery.eq('event_id', eventId);
    ordersQuery = ordersQuery.eq('event_id', eventId);
  } else if (orgId) {
    revenueQuery = revenueQuery.eq('organization_id', orgId);
    ordersQuery = ordersQuery.eq('organization_id', orgId);
  }

  const [revenueData, ordersData] = await Promise.all([
    revenueQuery,
    ordersQuery
  ]);

  const totalRevenue = revenueData.data?.reduce((sum, r) => sum + r.amount, 0) || 0;
  const totalOrders = ordersData.data?.length || 0;
  const completedOrders = ordersData.data?.filter(o => o.status === 'completed').length || 0;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    total_revenue: totalRevenue,
    total_orders: totalOrders,
    completed_orders: completedOrders,
    average_order_value: averageOrderValue,
    conversion_rate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
    period: period,
    date_range: {
      start: dateFilter.start,
      end: dateFilter.end
    }
  };
}

async function generateRevenueReport(supabaseClient: any, userId: string, eventId?: string, orgId?: string, period?: string, startDate?: string, endDate?: string) {
  const dateFilter = buildDateFilter(period, startDate, endDate);
  
  let query = supabaseClient
    .from('revenue_tracking')
    .select(`
      amount,
      created_at,
      events!inner(title, category),
      ticket_tiers!inner(name, price)
    `)
    .gte('created_at', dateFilter.start)
    .lte('created_at', dateFilter.end);

  if (eventId) {
    query = query.eq('event_id', eventId);
  } else if (orgId) {
    query = query.eq('organization_id', orgId);
  }

  const { data: revenueData } = await query;

  // Group by date for time series
  const dailyRevenue = revenueData?.reduce((acc, r) => {
    const date = r.created_at.split('T')[0];
    acc[date] = (acc[date] || 0) + r.amount;
    return acc;
  }, {}) || {};

  // Group by event category
  const categoryRevenue = revenueData?.reduce((acc, r) => {
    const category = r.events?.category || 'Unknown';
    acc[category] = (acc[category] || 0) + r.amount;
    return acc;
  }, {}) || {};

  // Group by ticket tier
  const tierRevenue = revenueData?.reduce((acc, r) => {
    const tierName = r.ticket_tiers?.name || 'Unknown';
    acc[tierName] = (acc[tierName] || 0) + r.amount;
    return acc;
  }, {}) || {};

  return {
    total_revenue: revenueData?.reduce((sum, r) => sum + r.amount, 0) || 0,
    daily_revenue: dailyRevenue,
    category_revenue: categoryRevenue,
    tier_revenue: tierRevenue,
    revenue_count: revenueData?.length || 0
  };
}

async function generateTicketReport(supabaseClient: any, userId: string, eventId?: string, orgId?: string, period?: string, startDate?: string, endDate?: string) {
  const dateFilter = buildDateFilter(period, startDate, endDate);
  
  let query = supabaseClient
    .from('tickets')
    .select(`
      status,
      price,
      created_at,
      events!inner(title, category),
      ticket_tiers!inner(name)
    `)
    .gte('created_at', dateFilter.start)
    .lte('created_at', dateFilter.end);

  if (eventId) {
    query = query.eq('event_id', eventId);
  } else if (orgId) {
    query = query.eq('organization_id', orgId);
  }

  const { data: ticketsData } = await query;

  // Group by status
  const statusBreakdown = ticketsData?.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {}) || {};

  // Group by event
  const eventBreakdown = ticketsData?.reduce((acc, t) => {
    const eventTitle = t.events?.title || 'Unknown';
    acc[eventTitle] = (acc[eventTitle] || 0) + 1;
    return acc;
  }, {}) || {};

  // Group by ticket tier
  const tierBreakdown = ticketsData?.reduce((acc, t) => {
    const tierName = t.ticket_tiers?.name || 'Unknown';
    acc[tierName] = (acc[tierName] || 0) + 1;
    return acc;
  }, {}) || {};

  return {
    total_tickets: ticketsData?.length || 0,
    status_breakdown: statusBreakdown,
    event_breakdown: eventBreakdown,
    tier_breakdown: tierBreakdown,
    total_value: ticketsData?.reduce((sum, t) => sum + t.price, 0) || 0
  };
}

async function generatePayoutReport(supabaseClient: any, userId: string, eventId?: string, orgId?: string, period?: string, startDate?: string, endDate?: string) {
  const dateFilter = buildDateFilter(period, startDate, endDate);
  
  let query = supabaseClient
    .from('payouts')
    .select('*')
    .gte('created_at', dateFilter.start)
    .lte('created_at', dateFilter.end);

  if (eventId) {
    query = query.eq('event_id', eventId);
  } else if (orgId) {
    query = query.eq('organization_id', orgId);
  }

  const { data: payoutsData } = await query;

  const totalPayouts = payoutsData?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const pendingPayouts = payoutsData?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0;
  const completedPayouts = payoutsData?.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0) || 0;

  return {
    total_payouts: totalPayouts,
    pending_payouts: pendingPayouts,
    completed_payouts: completedPayouts,
    payout_count: payoutsData?.length || 0,
    average_payout: payoutsData?.length > 0 ? totalPayouts / payoutsData.length : 0
  };
}

async function generateRefundReport(supabaseClient: any, userId: string, eventId?: string, orgId?: string, period?: string, startDate?: string, endDate?: string) {
  const dateFilter = buildDateFilter(period, startDate, endDate);
  
  let query = supabaseClient
    .from('refunds')
    .select('*')
    .gte('created_at', dateFilter.start)
    .lte('created_at', dateFilter.end);

  if (eventId) {
    query = query.eq('event_id', eventId);
  } else if (orgId) {
    query = query.eq('organization_id', orgId);
  }

  const { data: refundsData } = await query;

  const totalRefunds = refundsData?.reduce((sum, r) => sum + r.amount, 0) || 0;
  const refundRate = refundsData?.length || 0;

  return {
    total_refunds: totalRefunds,
    refund_count: refundsData?.length || 0,
    average_refund: refundsData?.length > 0 ? totalRefunds / refundsData.length : 0,
    refund_rate: refundRate
  };
}

function buildDateFilter(period?: string, startDate?: string, endDate?: string) {
  const now = new Date();
  let start = new Date();
  let end = now;

  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    switch (period) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setDate(now.getDate() - 30);
    }
  }

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

