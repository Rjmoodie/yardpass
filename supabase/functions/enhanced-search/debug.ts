import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchRequest {
  q: string
  types?: string[]
  category?: string
  location?: string
  radius_km?: number
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
  sort_by?: 'relevance' | 'date' | 'popularity' | 'distance'
  price_range?: { min: number; max: number }
  tags?: string[]
  organizer_id?: string
  verified_only?: boolean
  include_past_events?: boolean
}

interface SearchResponse {
  query: string
  results: {
    events: any[]
    organizations: any[]
    users: any[]
    posts: any[]
  }
  meta: {
    total: number
    search_time_ms: number
    has_more: boolean
    debug_info?: any
  }
  suggestions?: string[]
  trending?: any[]
  related_searches?: string[]
  filters_applied?: any
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Enhanced Search Debug - Starting request')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    console.log('✅ Supabase client created')

    const { data: { user } } = await supabaseClient.auth.getUser()
    console.log('👤 User auth status:', user ? 'Authenticated' : 'Anonymous')

    const { 
      q, 
      types = ['events', 'organizations', 'users', 'posts'], 
      category, 
      location, 
      radius_km = 50, 
      date_from, 
      date_to, 
      limit = 20, 
      offset = 0,
      sort_by = 'relevance',
      price_range,
      tags = [],
      organizer_id,
      verified_only = false,
      include_past_events = false
    }: SearchRequest = await req.json()

    console.log('📝 Search parameters:', {
      query: q,
      types,
      category,
      location,
      radius_km,
      limit,
      offset,
      sort_by
    })

    if (!q || q.trim().length < 2) {
      console.log('❌ Query too short')
      return new Response(
        JSON.stringify({ error: 'Search query must be at least 2 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const startTime = performance.now()
    const searchQuery = q.trim()

    console.log('🔍 Starting parallel search operations')

    // ✅ DEBUG: Test each database function individually
    const debugInfo: any = {}

    try {
      // Test 1: Check if enhanced_search_v2 function exists
      console.log('🧪 Testing enhanced_search_v2 function...')
      const { data: searchResults, error: searchError } = await supabaseClient.rpc('enhanced_search_v2', {
        search_query: searchQuery,
        search_types: types,
        category_filter: category,
        location_filter: location,
        radius_km: radius_km,
        date_from: date_from ? new Date(date_from).toISOString() : null,
        date_to: date_to ? new Date(date_to).toISOString() : null,
        limit_count: limit,
        offset_count: offset,
        sort_by: sort_by,
        price_min: price_range?.min || null,
        price_max: price_range?.max || null,
        tags_filter: tags.length > 0 ? tags : null,
        organizer_filter: organizer_id || null,
        verified_only: verified_only,
        include_past_events: include_past_events
      })

      if (searchError) {
        console.error('❌ enhanced_search_v2 error:', searchError)
        debugInfo.search_error = searchError
      } else {
        console.log('✅ enhanced_search_v2 success, results:', searchResults?.length || 0)
        debugInfo.search_results_count = searchResults?.length || 0
      }
    } catch (error) {
      console.error('❌ enhanced_search_v2 exception:', error)
      debugInfo.search_exception = error.message
    }

    try {
      // Test 2: Check if get_search_suggestions function exists
      console.log('🧪 Testing get_search_suggestions function...')
      const { data: suggestions, error: suggestionsError } = await supabaseClient.rpc('get_search_suggestions', {
        partial_query: searchQuery,
        suggestion_limit: 8
      })

      if (suggestionsError) {
        console.error('❌ get_search_suggestions error:', suggestionsError)
        debugInfo.suggestions_error = suggestionsError
      } else {
        console.log('✅ get_search_suggestions success, suggestions:', suggestions?.length || 0)
        debugInfo.suggestions_count = suggestions?.length || 0
      }
    } catch (error) {
      console.error('❌ get_search_suggestions exception:', error)
      debugInfo.suggestions_exception = error.message
    }

    try {
      // Test 3: Check if get_trending_searches function exists
      console.log('🧪 Testing get_trending_searches function...')
      const { data: trending, error: trendingError } = await supabaseClient.rpc('get_trending_searches', {
        hours_back: 24,
        limit_count: 6
      })

      if (trendingError) {
        console.error('❌ get_trending_searches error:', trendingError)
        debugInfo.trending_error = trendingError
      } else {
        console.log('✅ get_trending_searches success, trending:', trending?.length || 0)
        debugInfo.trending_count = trending?.length || 0
      }
    } catch (error) {
      console.error('❌ get_trending_searches exception:', error)
      debugInfo.trending_exception = error.message
    }

    try {
      // Test 4: Check if get_search_facets function exists
      console.log('🧪 Testing get_search_facets function...')
      const { data: facets, error: facetsError } = await supabaseClient.rpc('get_search_facets', {
        search_query: searchQuery,
        search_types: types,
        category_filter: category,
        location_filter: location,
        radius_km: radius_km
      })

      if (facetsError) {
        console.error('❌ get_search_facets error:', facetsError)
        debugInfo.facets_error = facetsError
      } else {
        console.log('✅ get_search_facets success, facets:', Object.keys(facets || {}).length)
        debugInfo.facets_keys = Object.keys(facets || {})
      }
    } catch (error) {
      console.error('❌ get_search_facets exception:', error)
      debugInfo.facets_exception = error.message
    }

    // ✅ DEBUG: Fallback to basic search if functions don't exist
    console.log('🔄 Attempting fallback search...')
    
    let fallbackResults: any[] = []
    try {
      // Basic search fallback
      const { data: basicResults, error: basicError } = await supabaseClient
        .from('events')
        .select(`
          id,
          title,
          description,
          slug,
          start_at,
          end_at,
          venue,
          city,
          state,
          country,
          category,
          tags,
          cover_image_url,
          status,
          visibility,
          max_attendees,
          created_at,
          updated_at
        `)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .gte('start_at', new Date().toISOString())
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
        .limit(limit)
        .order('start_at', { ascending: true })

      if (basicError) {
        console.error('❌ Basic search error:', basicError)
        debugInfo.basic_search_error = basicError
      } else {
        console.log('✅ Basic search success, results:', basicResults?.length || 0)
        fallbackResults = basicResults || []
        debugInfo.basic_search_count = basicResults?.length || 0
      }
    } catch (error) {
      console.error('❌ Basic search exception:', error)
      debugInfo.basic_search_exception = error.message
    }

    // ✅ DEBUG: Process results
    const results = {
      events: fallbackResults.map(event => ({
        ...event,
        relevance_score: 0.8,
        distance_km: null,
        search_highlights: [event.title],
        quick_actions: {
          buy_tickets: event.status === 'published',
          share_event: true,
          follow_organizer: true,
          add_to_calendar: true
        },
        ticket_availability: {
          available_tickets: event.max_attendees || 0,
          total_tickets: event.max_attendees || 0,
          ticket_tiers: []
        },
        organizer_info: {
          id: null,
          name: 'Unknown',
          slug: 'unknown',
          logo_url: null,
          is_verified: false
        }
      })),
      organizations: [],
      users: [],
      posts: []
    }

    const searchTime = performance.now() - startTime
    const totalResults = results.events.length + results.organizations.length + results.users.length + results.posts.length

    console.log('📊 Search completed:', {
      totalResults,
      searchTime: Math.round(searchTime),
      eventsFound: results.events.length
    })

    // ✅ DEBUG: Check database tables
    try {
      console.log('🧪 Checking database tables...')
      const { data: tableCheck, error: tableError } = await supabaseClient
        .from('events')
        .select('count', { count: 'exact', head: true })

      if (tableError) {
        console.error('❌ Table check error:', tableError)
        debugInfo.table_check_error = tableError
      } else {
        console.log('✅ Events table accessible, count:', tableCheck)
        debugInfo.events_table_count = tableCheck
      }
    } catch (error) {
      console.error('❌ Table check exception:', error)
      debugInfo.table_check_exception = error.message
    }

    const response: SearchResponse = {
      query: searchQuery,
      results,
      meta: {
        total: totalResults,
        search_time_ms: Math.round(searchTime),
        has_more: totalResults >= limit,
        debug_info: debugInfo
      },
      suggestions: [],
      trending: [],
      related_searches: [],
      filters_applied: {
        category,
        location,
        radius_km,
        date_range: date_from && date_to ? { from: date_from, to: date_to } : null,
        price_range,
        tags: tags.length > 0 ? tags : null,
        verified_only,
        include_past_events
      }
    }

    console.log('✅ Response prepared, sending...')

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Enhanced search debug error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
