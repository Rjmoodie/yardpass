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
    facets: {
      categories: { name: string; count: number }[]
      locations: { name: string; count: number }[]
      price_ranges: { range: string; count: number }[]
      dates: { range: string; count: number }[]
    }
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

    if (!q || q.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Search query must be at least 2 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const startTime = performance.now()
    const searchQuery = q.trim()

    // ✅ ENHANCED: Parallel execution for better performance
    const [suggestions, trending, searchResults, facets] = await Promise.all([
      // Get search suggestions
      supabaseClient.rpc('get_search_suggestions', {
        partial_query: searchQuery,
        suggestion_limit: 8
      }).then(r => r.data || []),

      // Get trending searches
      supabaseClient.rpc('get_trending_searches', {
        hours_back: 24,
        limit_count: 6
      }).then(r => r.data || []),

      // Perform enhanced search with all filters
      supabaseClient.rpc('enhanced_search_v2', {
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
      }).then(r => r.data || []),

      // Get search facets for filtering
      supabaseClient.rpc('get_search_facets', {
        search_query: searchQuery,
        search_types: types,
        category_filter: category,
        location_filter: location,
        radius_km: radius_km
      }).then(r => r.data || {})
    ])

    // ✅ ENHANCED: Process results with better organization
    const results = {
      events: [],
      organizations: [],
      users: [],
      posts: []
    }

    searchResults?.forEach((result: any) => {
      const enhancedResult = {
        ...result.result_data,
        relevance_score: result.relevance_score,
        distance_km: result.distance_km,
        search_highlights: result.search_highlights || [],
        quick_actions: result.quick_actions || []
      }

      switch (result.result_type) {
        case 'event':
          results.events.push({
            ...enhancedResult,
            ticket_availability: result.ticket_availability,
            organizer_info: result.organizer_info
          })
          break
        case 'organization':
          results.organizations.push({
            ...enhancedResult,
            event_count: result.event_count,
            follower_count: result.follower_count
          })
          break
        case 'user':
          results.users.push({
            ...enhancedResult,
            event_count: result.event_count,
            connection_status: result.connection_status
          })
          break
        case 'post':
          results.posts.push({
            ...enhancedResult,
            engagement_metrics: result.engagement_metrics,
            author_info: result.author_info
          })
          break
      }
    })

    // ✅ ENHANCED: Smart sorting with multiple criteria
    const sortResults = (items: any[], type: string) => {
      return items.sort((a, b) => {
        switch (sort_by) {
          case 'relevance':
            return b.relevance_score - a.relevance_score
          case 'date':
            return new Date(b.created_at || b.start_at).getTime() - new Date(a.created_at || a.start_at).getTime()
          case 'popularity':
            return (b.likes_count || b.followers_count || 0) - (a.likes_count || a.followers_count || 0)
          case 'distance':
            return (a.distance_km || Infinity) - (b.distance_km || Infinity)
          default:
            return b.relevance_score - a.relevance_score
        }
      })
    }

    results.events = sortResults(results.events, 'events')
    results.organizations = sortResults(results.organizations, 'organizations')
    results.users = sortResults(results.users, 'users')
    results.posts = sortResults(results.posts, 'posts')

    const searchTime = performance.now() - startTime
    const totalResults = results.events.length + results.organizations.length + results.users.length + results.posts.length

    // ✅ ENHANCED: Log comprehensive search analytics
    if (user) {
      try {
        await supabaseClient.rpc('log_search_analytics_v2', {
          p_user_id: user.id,
          p_query: searchQuery,
          p_search_types: types,
          p_results_count: totalResults,
          p_search_time_ms: Math.round(searchTime),
          p_filters_applied: {
            category,
            location,
            radius_km,
            date_from,
            date_to,
            sort_by,
            price_range,
            tags,
            verified_only
          }
        })
      } catch (analyticsError) {
        console.error('Analytics logging error:', analyticsError)
      }
    }

    // ✅ ENHANCED: Smart caching with better cache keys
    const cacheKey = btoa(JSON.stringify({
      query: searchQuery,
      types,
      category,
      location,
      radius_km,
      date_from,
      date_to,
      sort_by,
      price_range,
      tags,
      organizer_id,
      verified_only,
      include_past_events
    }))

    const { data: cachedResult } = await supabaseClient
      .from('search_cache')
      .select('results, created_at')
      .eq('query_hash', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!cachedResult) {
      try {
        await supabaseClient
          .from('search_cache')
          .upsert({
            query_hash: cacheKey,
            search_query: searchQuery,
            search_types: types,
            results: results,
            facets: facets,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
          })
      } catch (cacheError) {
        console.error('Cache error:', cacheError)
      }
    }

    // ✅ ENHANCED: Generate related searches
    const relatedSearches = await generateRelatedSearches(searchQuery, results, supabaseClient)

    // ✅ ENHANCED: Build filters applied object
    const filtersApplied = {
      category,
      location,
      radius_km,
      date_range: date_from && date_to ? { from: date_from, to: date_to } : null,
      price_range,
      tags: tags.length > 0 ? tags : null,
      verified_only,
      include_past_events
    }

    const response: SearchResponse = {
      query: searchQuery,
      results,
      meta: {
        total: totalResults,
        search_time_ms: Math.round(searchTime),
        has_more: totalResults >= limit,
        facets
      },
      suggestions: suggestions?.map((s: any) => s.suggestion) || [],
      trending: trending || [],
      related_searches: relatedSearches,
      filters_applied: filtersApplied
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Enhanced search error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ✅ NEW: Generate related searches based on results
async function generateRelatedSearches(query: string, results: any, supabaseClient: any): Promise<string[]> {
  try {
    const relatedTerms = new Set<string>()
    
    // Extract terms from event titles and categories
    results.events.forEach((event: any) => {
      if (event.title) {
        const words = event.title.toLowerCase().split(' ').filter((w: string) => w.length > 3)
        words.forEach((word: string) => {
          if (word !== query.toLowerCase() && !query.toLowerCase().includes(word)) {
            relatedTerms.add(word)
          }
        })
      }
      if (event.category && event.category !== query) {
        relatedTerms.add(event.category)
      }
    })

    // Extract terms from organization names
    results.organizations.forEach((org: any) => {
      if (org.name) {
        const words = org.name.toLowerCase().split(' ').filter((w: string) => w.length > 3)
        words.forEach((word: string) => {
          if (word !== query.toLowerCase() && !query.toLowerCase().includes(word)) {
            relatedTerms.add(word)
          }
        })
      }
    })

    // Get trending related searches from database
    const { data: trendingRelated } = await supabaseClient.rpc('get_related_searches', {
      base_query: query,
      limit_count: 3
    })

    if (trendingRelated) {
      trendingRelated.forEach((item: any) => {
        relatedTerms.add(item.related_query)
      })
    }

    return Array.from(relatedTerms).slice(0, 6)
  } catch (error) {
    console.error('Error generating related searches:', error)
    return []
  }
}
