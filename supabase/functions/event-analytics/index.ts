import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    // Get request data
    const { event_id, analytics_type, start_date, end_date, force_refresh } = await req.json()

    // Validate required parameters
    if (!event_id) {
      return new Response(
        JSON.stringify({ error: 'event_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has access to this event
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('id, created_by, owner_context_type, owner_context_id')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is event manager
    const isEventManager = event.created_by === user.id || 
      (event.owner_context_type === 'organization' && 
       await checkOrgAccess(supabaseClient, user.id, event.owner_context_id))

    if (!isEventManager) {
      return new Response(
        JSON.stringify({ error: 'Access denied. You must be an event manager.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate cache key
    const cacheKey = `${analytics_type}_${start_date || 'default'}_${end_date || 'default'}`

    // Check cache first (unless force refresh is requested)
    if (!force_refresh) {
      const { data: cachedData, error: cacheError } = await supabase
        .rpc('get_cached_analytics', { p_event_id: event_id, p_cache_key: cacheKey })

      if (!cacheError && cachedData) {
        return new Response(
          JSON.stringify({ 
            data: cachedData, 
            source: 'cache',
            cached_at: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Generate analytics based on type
    let analyticsData: any = {}

    switch (analytics_type) {
      case 'revenue':
        analyticsData = await generateRevenueAnalytics(supabase, event_id, start_date, end_date)
        break
      case 'attendance':
        analyticsData = await generateAttendanceAnalytics(supabase, event_id, start_date, end_date)
        break
      case 'engagement':
        analyticsData = await generateEngagementAnalytics(supabase, event_id, start_date, end_date)
        break
      case 'performance':
        analyticsData = await generatePerformanceAnalytics(supabase, event_id, start_date, end_date)
        break
      case 'comprehensive':
        analyticsData = await generateComprehensiveAnalytics(supabase, event_id, start_date, end_date)
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid analytics_type. Use: revenue, attendance, engagement, performance, or comprehensive' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Cache the results
    await supabase.rpc('cache_event_analytics', {
      p_event_id: event_id,
      p_cache_key: cacheKey,
      p_cache_data: analyticsData,
      p_ttl_hours: 24
    })

    return new Response(
      JSON.stringify({ 
        data: analyticsData, 
        source: 'live',
        cached_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in event-analytics function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to check organization access
async function checkOrgAccess(supabase: any, userId: string, orgId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .in('role', ['admin', 'owner'])
    .single()

  return !error && data !== null
}

// Generate revenue analytics
async function generateRevenueAnalytics(supabase: any, eventId: string, startDate?: string, endDate?: string) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const end = endDate || new Date().toISOString().split('T')[0]

  // Use the database function for revenue calculation
  const { data: revenueData, error } = await supabase
    .rpc('calculate_revenue_for_event', {
      p_event_id: eventId,
      p_start_date: start,
      p_end_date: end
    })

  if (error) {
    throw new Error(`Revenue calculation failed: ${error.message}`)
  }

  return {
    type: 'revenue',
    period: { start, end },
    summary: {
      total_revenue: revenueData.total_revenue || 0,
      total_sales: revenueData.total_sales || 0,
      total_tickets: revenueData.total_tickets || 0,
      avg_daily_revenue: revenueData.avg_daily_revenue || 0
    },
    daily_breakdown: revenueData.daily_breakdown || [],
    generated_at: new Date().toISOString()
  }
}

// Generate attendance analytics
async function generateAttendanceAnalytics(supabase: any, eventId: string, startDate?: string, endDate?: string) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const end = endDate || new Date().toISOString().split('T')[0]

  // Get ticket sales data
  const { data: ticketData, error: ticketError } = await supabase
    .from('tickets')
    .select(`
      id,
      created_at,
      status,
      ticket_tier_id,
      ticket_tiers!inner(name, price)
    `)
    .eq('event_id', eventId)
    .gte('created_at', start)
    .lte('created_at', end)

  if (ticketError) throw new Error(`Ticket data fetch failed: ${ticketError.message}`)

  // Get check-in data
  const { data: checkinData, error: checkinError } = await supabase
    .from('event_checkins')
    .select('id, created_at, ticket_id')
    .eq('event_id', eventId)
    .gte('created_at', start)
    .lte('created_at', end)

  if (checkinError) throw new Error(`Check-in data fetch failed: ${checkinError.message}`)

  // Calculate metrics
  const totalTickets = ticketData?.length || 0
  const soldTickets = ticketData?.filter(t => t.status === 'active').length || 0
  const checkedInTickets = checkinData?.length || 0
  const attendanceRate = totalTickets > 0 ? (checkedInTickets / totalTickets) * 100 : 0

  // Daily breakdown
  const dailyBreakdown = generateDailyBreakdown(ticketData, 'created_at', 'tickets_sold')
  const dailyCheckins = generateDailyBreakdown(checkinData, 'created_at', 'checkins')

  return {
    type: 'attendance',
    period: { start, end },
    summary: {
      total_tickets: totalTickets,
      sold_tickets: soldTickets,
      checked_in_tickets: checkedInTickets,
      attendance_rate: Math.round(attendanceRate * 100) / 100
    },
    daily_breakdown: {
      sales: dailyBreakdown,
      checkins: dailyCheckins
    },
    generated_at: new Date().toISOString()
  }
}

// Generate engagement analytics
async function generateEngagementAnalytics(supabase: any, eventId: string, startDate?: string, endDate?: string) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const end = endDate || new Date().toISOString().split('T')[0]

  // Get event views
  const { data: viewData, error: viewError } = await supabase
    .from('event_views')
    .select('id, created_at')
    .eq('event_id', eventId)
    .gte('created_at', start)
    .lte('created_at', end)

  if (viewError) throw new Error(`View data fetch failed: ${viewError.message}`)

  // Get event posts and reactions
  const { data: postData, error: postError } = await supabase
    .from('event_posts')
    .select(`
      id,
      created_at,
      engagement_score,
      post_reactions(id, reaction_type),
      post_comments(id)
    `)
    .eq('event_id', eventId)
    .gte('created_at', start)
    .lte('created_at', end)

  if (postError) throw new Error(`Post data fetch failed: ${postError.message}`)

  // Calculate metrics
  const totalViews = viewData?.length || 0
  const totalPosts = postData?.length || 0
  const totalReactions = postData?.reduce((sum, post) => sum + (post.post_reactions?.length || 0), 0) || 0
  const totalComments = postData?.reduce((sum, post) => sum + (post.post_comments?.length || 0), 0) || 0
  const avgEngagementScore = postData?.length > 0 
    ? postData.reduce((sum, post) => sum + (post.engagement_score || 0), 0) / postData.length 
    : 0

  // Daily breakdown
  const dailyViews = generateDailyBreakdown(viewData, 'created_at', 'views')
  const dailyPosts = generateDailyBreakdown(postData, 'created_at', 'posts')

  return {
    type: 'engagement',
    period: { start, end },
    summary: {
      total_views: totalViews,
      total_posts: totalPosts,
      total_reactions: totalReactions,
      total_comments: totalComments,
      avg_engagement_score: Math.round(avgEngagementScore * 100) / 100
    },
    daily_breakdown: {
      views: dailyViews,
      posts: dailyPosts
    },
    generated_at: new Date().toISOString()
  }
}

// Generate performance analytics
async function generatePerformanceAnalytics(supabase: any, eventId: string, startDate?: string, endDate?: string) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const end = endDate || new Date().toISOString().split('T')[0]

  // Get performance metrics from the database
  const { data: metricsData, error: metricsError } = await supabase
    .from('performance_metrics')
    .select('*')
    .eq('event_id', eventId)
    .gte('metric_date', start)
    .lte('metric_date', end)
    .order('metric_date', { ascending: true })

  if (metricsError) throw new Error(`Performance metrics fetch failed: ${metricsError.message}`)

  // Calculate summary metrics
  const metricsByType = metricsData?.reduce((acc, metric) => {
    if (!acc[metric.metric_type]) {
      acc[metric.metric_type] = []
    }
    acc[metric.metric_type].push(metric)
    return acc
  }, {}) || {}

  const summary = Object.keys(metricsByType).reduce((acc, type) => {
    const metrics = metricsByType[type]
    acc[type] = {
      total: metrics.reduce((sum, m) => sum + m.metric_value, 0),
      average: metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.metric_value, 0) / metrics.length : 0,
      count: metrics.length
    }
    return acc
  }, {})

  return {
    type: 'performance',
    period: { start, end },
    summary,
    metrics: metricsData || [],
    generated_at: new Date().toISOString()
  }
}

// Generate comprehensive analytics (combines all types)
async function generateComprehensiveAnalytics(supabase: any, eventId: string, startDate?: string, endDate?: string) {
  const [revenue, attendance, engagement, performance] = await Promise.all([
    generateRevenueAnalytics(supabase, eventId, startDate, endDate),
    generateAttendanceAnalytics(supabase, eventId, startDate, endDate),
    generateEngagementAnalytics(supabase, eventId, startDate, endDate),
    generatePerformanceAnalytics(supabase, eventId, startDate, endDate)
  ])

  return {
    type: 'comprehensive',
    period: revenue.period,
    revenue: revenue.summary,
    attendance: attendance.summary,
    engagement: engagement.summary,
    performance: performance.summary,
    daily_breakdown: {
      revenue: revenue.daily_breakdown,
      attendance: attendance.daily_breakdown,
      engagement: engagement.daily_breakdown
    },
    generated_at: new Date().toISOString()
  }
}

// Helper function to generate daily breakdown
function generateDailyBreakdown(data: any[], dateField: string, valueField: string) {
  if (!data || data.length === 0) return []

  const dailyMap = new Map()
  
  data.forEach(item => {
    const date = item[dateField].split('T')[0]
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
  })

  return Array.from(dailyMap.entries()).map(([date, count]) => ({
    date,
    [valueField]: count
  })).sort((a, b) => a.date.localeCompare(b.date))
}
