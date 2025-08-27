import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DiscoverRequest {
  user_id?: string
  location?: string
  radius_km?: number
  categories?: string[]
  limit?: number
  offset?: number
  include_trending?: boolean
  include_recommendations?: boolean
  include_nearby?: boolean
  include_following?: boolean
  price_range?: { min: number; max: number }
  date_range?: { from: string; to: string }
}

interface DiscoverResponse {
  events: any[]
  trending_events: any[]
  recommended_events: any[]
  nearby_events: any[]
  following_events: any[]
  meta: {
    total: number
    has_more: boolean
    user_location?: { lat: number; lng: number }
    categories_available: string[]
  }
  insights: {
    popular_categories: { name: string; count: number }[]
    trending_topics: string[]
    price_distribution: { range: string; count: number }[]
  }
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

    const {
      location,
      radius_km = 50,
      categories = [],
      limit = 20,
      offset = 0,
      include_trending = true,
      include_recommendations = true,
      include_nearby = true,
      include_following = true,
      price_range,
      date_range
    }: DiscoverRequest = await req.json()

    const startTime = performance.now()

    // ✅ ENHANCED: Parallel execution for better performance
    const [
      trendingEvents,
      recommendedEvents,
      nearbyEvents,
      followingEvents,
      insights,
      userPreferences
    ] = await Promise.all([
      // Get trending events
      include_trending ? supabaseClient.rpc('get_trending_events', {
        hours_back: 24,
        limit_count: Math.ceil(limit * 0.3),
        location_filter: location,
        radius_km: radius_km,
        categories_filter: categories.length > 0 ? categories : null,
        price_min: price_range?.min || null,
        price_max: price_range?.max || null,
        date_from: date_range?.from ? new Date(date_range.from).toISOString() : null,
        date_to: date_range?.to ? new Date(date_range.to).toISOString() : null
      }).then(r => r.data || []) : [],

      // Get personalized recommendations
      include_recommendations && user ? supabaseClient.rpc('get_personalized_recommendations', {
        p_user_id: user.id,
        limit_count: Math.ceil(limit * 0.4),
        location_filter: location,
        radius_km: radius_km,
        categories_filter: categories.length > 0 ? categories : null,
        price_min: price_range?.min || null,
        price_max: price_range?.max || null,
        date_from: date_range?.from ? new Date(date_range.from).toISOString() : null,
        date_to: date_range?.to ? new Date(date_range.to).toISOString() : null
      }).then(r => r.data || []) : [],

      // Get nearby events
      include_nearby ? supabaseClient.rpc('get_nearby_events', {
        location_filter: location,
        radius_km: radius_km,
        limit_count: Math.ceil(limit * 0.3),
        categories_filter: categories.length > 0 ? categories : null,
        price_min: price_range?.min || null,
        price_max: price_range?.max || null,
        date_from: date_range?.from ? new Date(date_range.from).toISOString() : null,
        date_to: date_range?.to ? new Date(date_range.to).toISOString() : null
      }).then(r => r.data || []) : [],

      // Get events from followed organizers
      include_following && user ? supabaseClient.rpc('get_following_events', {
        p_user_id: user.id,
        limit_count: Math.ceil(limit * 0.2),
        location_filter: location,
        radius_km: radius_km,
        categories_filter: categories.length > 0 ? categories : null,
        price_min: price_range?.min || null,
        price_max: price_range?.max || null,
        date_from: date_range?.from ? new Date(date_range.from).toISOString() : null,
        date_to: date_range?.to ? new Date(date_range.to).toISOString() : null
      }).then(r => r.data || []) : [],

      // Get discovery insights
      supabaseClient.rpc('get_discovery_insights', {
        location_filter: location,
        radius_km: radius_km,
        categories_filter: categories.length > 0 ? categories : null
      }).then(r => r.data || {}),

      // Get user preferences for personalization
      user ? supabaseClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(r => r.data || {}) : {}
    ])

    // ✅ ENHANCED: Merge and deduplicate events
    const allEvents = [...trendingEvents, ...recommendedEvents, ...nearbyEvents, ...followingEvents]
    const uniqueEvents = deduplicateEvents(allEvents)
    
    // Sort by relevance score and recency
    uniqueEvents.sort((a, b) => {
      const scoreA = (a.relevance_score || 0) * 0.7 + (a.trending_score || 0) * 0.3
      const scoreB = (b.relevance_score || 0) * 0.7 + (b.trending_score || 0) * 0.3
      return scoreB - scoreA
    })

    const finalEvents = uniqueEvents.slice(offset, offset + limit)
    const searchTime = performance.now() - startTime

    // ✅ ENHANCED: Log discovery analytics
    if (user) {
      try {
        await supabaseClient.rpc('log_discovery_analytics', {
          p_user_id: user.id,
          p_location: location,
          p_categories: categories,
          p_results_count: finalEvents.length,
          p_search_time_ms: Math.round(searchTime),
          p_filters_applied: {
            radius_km,
            price_range,
            date_range,
            include_trending,
            include_recommendations,
            include_nearby,
            include_following
          }
        })
      } catch (analyticsError) {
        console.error('Discovery analytics error:', analyticsError)
      }
    }

    const response: DiscoverResponse = {
      events: finalEvents,
      trending_events: trendingEvents,
      recommended_events: recommendedEvents,
      nearby_events: nearbyEvents,
      following_events: followingEvents,
      meta: {
        total: uniqueEvents.length,
        has_more: uniqueEvents.length > offset + limit,
        user_location: location ? parseLocation(location) : undefined,
        categories_available: insights.categories_available || []
      },
      insights: {
        popular_categories: insights.popular_categories || [],
        trending_topics: insights.trending_topics || [],
        price_distribution: insights.price_distribution || []
      }
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Discover feed error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ✅ NEW: Deduplicate events while preserving best scores
function deduplicateEvents(events: any[]): any[] {
  const eventMap = new Map()
  
  events.forEach(event => {
    const existing = eventMap.get(event.id)
    if (!existing || (event.relevance_score || 0) > (existing.relevance_score || 0)) {
      eventMap.set(event.id, {
        ...event,
        relevance_score: Math.max(
          existing?.relevance_score || 0,
          event.relevance_score || 0
        ),
        trending_score: Math.max(
          existing?.trending_score || 0,
          event.trending_score || 0
        )
      })
    }
  })
  
  return Array.from(eventMap.values())
}

// ✅ NEW: Parse location string to coordinates
function parseLocation(location: string): { lat: number; lng: number } | undefined {
  try {
    const coords = location.split(',').map(coord => parseFloat(coord.trim()))
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      return { lat: coords[0], lng: coords[1] }
    }
  } catch (error) {
    console.error('Error parsing location:', error)
  }
  return undefined
}
