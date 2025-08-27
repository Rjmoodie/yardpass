import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyticsRequest {
  analytics_type: 'event' | 'enterprise' | 'performance' | 'comprehensive' | 'revenue' | 'attendance' | 'engagement' | 'user_behavior' | 'content_performance' | 'real_time';
  event_id?: string;
  owner_context_id?: string; // Changed from organization_id to match schema
  user_id?: string;
  start_date?: string;
  end_date?: string;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  metrics?: string[];
  filters?: Record<string, any>;
  force_refresh?: boolean;
  include_insights?: boolean;
  include_predictions?: boolean;
  include_comparisons?: boolean;
}

interface AnalyticsResponse {
  data: any;
  insights?: any;
  predictions?: any;
  comparisons?: any;
  meta: {
    generated_at: string;
    source: 'live' | 'cache';
    processing_time_ms: number;
    data_points: number;
    period: {
      start: string;
      end: string;
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const startTime = performance.now()
    const request: AnalyticsRequest = await req.json()

    // Validate request
    if (!request.analytics_type) {
      return new Response(
        JSON.stringify({ error: 'analytics_type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Set default period if not provided
    const period = request.period || 'month'
    const endDate = request.end_date || new Date().toISOString().split('T')[0] // Use date only
    const startDate = request.start_date || getStartDate(period)

    // Generate cache key
    const cacheKey = `${request.analytics_type}_${request.event_id || 'all'}_${request.owner_context_id || 'all'}_${startDate}_${endDate}_${JSON.stringify(request.filters || {})}`

    // Check cache first (unless force refresh is requested)
    if (!request.force_refresh) {
      const { data: cachedData, error: cacheError } = await supabaseClient
        .rpc('get_cached_analytics', { 
          p_cache_key: cacheKey
        })

      if (!cacheError && cachedData) {
        return new Response(
          JSON.stringify({
            data: cachedData,
            meta: {
              generated_at: new Date().toISOString(),
              source: 'cache',
              processing_time_ms: Math.round(performance.now() - startTime),
              data_points: cachedData.data_points || 0,
              period: { start: startDate, end: endDate }
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Generate analytics based on type using our customized database functions
    let analyticsData: any = {}
    let insights: any = {}
    let predictions: any = {}
    let comparisons: any = {}

    switch (request.analytics_type) {
      case 'event':
        const { data: eventAnalytics, error: eventError } = await supabaseClient
          .rpc('get_enhanced_event_analytics', {
            p_event_id: request.event_id,
            p_owner_context_id: request.owner_context_id,
            p_start_date: startDate,
            p_end_date: endDate,
            p_include_insights: request.include_insights || false,
            p_include_predictions: request.include_predictions || false,
            p_include_comparisons: request.include_comparisons || false
          })

        if (eventError) {
          throw new Error(`Event analytics error: ${eventError.message}`)
        }

        analyticsData = eventAnalytics
        insights = eventAnalytics?.insights
        predictions = eventAnalytics?.predictions
        comparisons = eventAnalytics?.comparisons
        break

      case 'enterprise':
        const { data: enterpriseAnalytics, error: enterpriseError } = await supabaseClient
          .rpc('get_enhanced_enterprise_analytics', {
            p_owner_context_id: request.owner_context_id,
            p_start_date: startDate,
            p_end_date: endDate,
            p_include_insights: request.include_insights || false,
            p_include_predictions: request.include_predictions || false
          })

        if (enterpriseError) {
          throw new Error(`Enterprise analytics error: ${enterpriseError.message}`)
        }

        analyticsData = enterpriseAnalytics
        insights = enterpriseAnalytics?.insights
        predictions = enterpriseAnalytics?.predictions
        break

      case 'performance':
        const { data: performanceAnalytics, error: performanceError } = await supabaseClient
          .rpc('get_enhanced_performance_analytics', {
            p_event_id: request.event_id,
            p_owner_context_id: request.owner_context_id,
            p_start_date: startDate,
            p_end_date: endDate,
            p_include_insights: request.include_insights || false
          })

        if (performanceError) {
          throw new Error(`Performance analytics error: ${performanceError.message}`)
        }

        analyticsData = performanceAnalytics
        insights = performanceAnalytics?.insights
        break

      case 'comprehensive':
        // For comprehensive analytics, we'll combine multiple types
        const [eventData, enterpriseData, performanceData] = await Promise.all([
          supabaseClient.rpc('get_enhanced_event_analytics', {
            p_event_id: request.event_id,
            p_owner_context_id: request.owner_context_id,
            p_start_date: startDate,
            p_end_date: endDate,
            p_include_insights: request.include_insights || false,
            p_include_predictions: request.include_predictions || false,
            p_include_comparisons: request.include_comparisons || false
          }),
          supabaseClient.rpc('get_enhanced_enterprise_analytics', {
            p_owner_context_id: request.owner_context_id,
            p_start_date: startDate,
            p_end_date: endDate,
            p_include_insights: request.include_insights || false,
            p_include_predictions: request.include_predictions || false
          }),
          supabaseClient.rpc('get_enhanced_performance_analytics', {
            p_event_id: request.event_id,
            p_owner_context_id: request.owner_context_id,
            p_start_date: startDate,
            p_end_date: endDate,
            p_include_insights: request.include_insights || false
          })
        ])

        analyticsData = {
          event: eventData.data,
          enterprise: enterpriseData.data,
          performance: performanceData.data
        }

        if (request.include_insights) {
          insights = {
            event: eventData.data?.insights,
            enterprise: enterpriseData.data?.insights,
            performance: performanceData.data?.insights
          }
        }

        if (request.include_predictions) {
          predictions = {
            event: eventData.data?.predictions,
            enterprise: enterpriseData.data?.predictions
          }
        }

        if (request.include_comparisons) {
          comparisons = {
            event: eventData.data?.comparisons
          }
        }
        break

      // For other analytics types, we'll use the database functions directly
      case 'revenue':
        // Use event analytics and extract revenue data
        const { data: revenueData, error: revenueError } = await supabaseClient
          .rpc('get_enhanced_event_analytics', {
            p_event_id: request.event_id,
            p_owner_context_id: request.owner_context_id,
            p_start_date: startDate,
            p_end_date: endDate,
            p_include_insights: false,
            p_include_predictions: false,
            p_include_comparisons: false
          })

        if (revenueError) {
          throw new Error(`Revenue analytics error: ${revenueError.message}`)
        }

        analyticsData = revenueData?.revenue || {}
        break

      case 'attendance':
        // Use event analytics and extract attendance data
        const { data: attendanceData, error: attendanceError } = await supabaseClient
          .rpc('get_enhanced_event_analytics', {
            p_event_id: request.event_id,
            p_owner_context_id: request.owner_context_id,
            p_start_date: startDate,
            p_end_date: endDate,
            p_include_insights: false,
            p_include_predictions: false,
            p_include_comparisons: false
          })

        if (attendanceError) {
          throw new Error(`Attendance analytics error: ${attendanceError.message}`)
        }

        analyticsData = attendanceData?.attendance || {}
        break

      case 'engagement':
        // Use event analytics and extract engagement data
        const { data: engagementData, error: engagementError } = await supabaseClient
          .rpc('get_enhanced_event_analytics', {
            p_event_id: request.event_id,
            p_owner_context_id: request.owner_context_id,
            p_start_date: startDate,
            p_end_date: endDate,
            p_include_insights: false,
            p_include_predictions: false,
            p_include_comparisons: false
          })

        if (engagementError) {
          throw new Error(`Engagement analytics error: ${engagementError.message}`)
        }

        analyticsData = engagementData?.engagement || {}
        break

      case 'user_behavior':
        // Use performance analytics and extract user behavior data
        const { data: behaviorData, error: behaviorError } = await supabaseClient
          .rpc('get_enhanced_performance_analytics', {
            p_event_id: request.event_id,
            p_owner_context_id: request.owner_context_id,
            p_start_date: startDate,
            p_end_date: endDate,
            p_include_insights: false
          })

        if (behaviorError) {
          throw new Error(`User behavior analytics error: ${behaviorError.message}`)
        }

        analyticsData = behaviorData?.user_behavior || {}
        break

      case 'content_performance':
        // For content performance, we'll use event analytics
        const { data: contentData, error: contentError } = await supabaseClient
          .rpc('get_enhanced_event_analytics', {
            p_event_id: request.event_id,
            p_owner_context_id: request.owner_context_id,
            p_start_date: startDate,
            p_end_date: endDate,
            p_include_insights: false,
            p_include_predictions: false,
            p_include_comparisons: false
          })

        if (contentError) {
          throw new Error(`Content performance analytics error: ${contentError.message}`)
        }

        analyticsData = {
          engagement: contentData?.engagement,
          performance: contentData?.performance
        }
        break

      case 'real_time':
        // For real-time analytics, we'll use a simplified approach
        const now = new Date()
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

        const { data: realTimeData, error: realTimeError } = await supabaseClient
          .rpc('get_enhanced_event_analytics', {
            p_event_id: request.event_id,
            p_owner_context_id: request.owner_context_id,
            p_start_date: oneHourAgo.split('T')[0],
            p_end_date: now.toISOString().split('T')[0],
            p_include_insights: false,
            p_include_predictions: false,
            p_include_comparisons: false
          })

        if (realTimeError) {
          throw new Error(`Real-time analytics error: ${realTimeError.message}`)
        }

        analyticsData = {
          current_time: now.toISOString(),
          last_hour: realTimeData,
          type: 'real_time'
        }
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid analytics_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Cache the results using our customized cache function
    if (analyticsData) {
      await supabaseClient.rpc('cache_analytics', {
        p_cache_key: cacheKey,
        p_analytics_data: {
          data: analyticsData,
          insights,
          predictions,
          comparisons,
          data_points: countDataPoints(analyticsData)
        },
        p_analytics_type: request.analytics_type,
        p_parameters: {
          event_id: request.event_id,
          owner_context_id: request.owner_context_id,
          start_date: startDate,
          end_date: endDate,
          filters: request.filters
        },
        p_ttl_hours: 6
      })
    }

    const processingTime = Math.round(performance.now() - startTime)

    const response: AnalyticsResponse = {
      data: analyticsData,
      insights: request.include_insights ? insights : undefined,
      predictions: request.include_predictions ? predictions : undefined,
      comparisons: request.include_comparisons ? comparisons : undefined,
      meta: {
        generated_at: new Date().toISOString(),
        source: 'live',
        processing_time_ms: processingTime,
        data_points: countDataPoints(analyticsData),
        period: { start: startDate, end: endDate }
      }
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Enhanced analytics error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to get start date based on period
function getStartDate(period: string): string {
  const now = new Date()
  switch (period) {
    case 'day':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    case 'quarter':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }
}

// Helper function to count data points
function countDataPoints(data: any): number {
  if (Array.isArray(data)) return data.length
  if (typeof data === 'object' && data !== null) {
    return Object.values(data).reduce((sum: number, value: any) => sum + countDataPoints(value), 0)
  }
  return 1
}
