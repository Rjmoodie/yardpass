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
  }
  suggestions?: string[]
  trending?: any[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user (optional for search)
    const { data: { user } } = await supabaseClient.auth.getUser()

    // Parse request
    const { q, types = ['events', 'organizations', 'users', 'posts'], category, location, radius_km = 50, date_from, date_to, limit = 20, offset = 0 }: SearchRequest = await req.json()

    if (!q || q.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Search query must be at least 2 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const startTime = performance.now()
    const searchQuery = q.trim()

    // Get search suggestions
    const { data: suggestions } = await supabaseClient.rpc('get_search_suggestions', {
      partial_query: searchQuery,
      suggestion_limit: 5
    })

    // Get trending searches
    const { data: trending } = await supabaseClient.rpc('get_trending_searches', {
      hours_back: 24,
      limit_count: 5
    })

    // Perform enhanced search
    const { data: searchResults, error: searchError } = await supabaseClient.rpc('enhanced_search', {
      search_query: searchQuery,
      search_types: types,
      category_filter: category,
      location_filter: location,
      radius_km: radius_km,
      date_from: date_from ? new Date(date_from).toISOString() : null,
      date_to: date_to ? new Date(date_to).toISOString() : null,
      limit_count: limit,
      offset_count: offset
    })

    if (searchError) {
      console.error('Search error:', searchError)
      return new Response(
        JSON.stringify({ error: 'Search failed', details: searchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process and organize results
    const results = {
      events: [],
      organizations: [],
      users: [],
      posts: []
    }

    searchResults?.forEach((result: any) => {
      switch (result.result_type) {
        case 'event':
          results.events.push({
            ...result.result_data,
            relevance_score: result.relevance_score,
            distance_km: result.distance_km
          })
          break
        case 'organization':
          results.organizations.push({
            ...result.result_data,
            relevance_score: result.relevance_score
          })
          break
        case 'user':
          results.users.push({
            ...result.result_data,
            relevance_score: result.relevance_score
          })
          break
        case 'post':
          results.posts.push({
            ...result.result_data,
            relevance_score: result.relevance_score
          })
          break
      }
    })

    // Sort results by relevance score
    results.events.sort((a, b) => b.relevance_score - a.relevance_score)
    results.organizations.sort((a, b) => b.relevance_score - a.relevance_score)
    results.users.sort((a, b) => b.relevance_score - a.relevance_score)
    results.posts.sort((a, b) => b.relevance_score - a.relevance_score)

    const searchTime = performance.now() - startTime
    const totalResults = results.events.length + results.organizations.length + results.users.length + results.posts.length

    // Log search analytics
    if (user) {
      try {
        await supabaseClient.rpc('log_search_analytics', {
          p_user_id: user.id,
          p_query: searchQuery,
          p_search_types: types,
          p_results_count: totalResults,
          p_search_time_ms: Math.round(searchTime)
        })
      } catch (analyticsError) {
        console.error('Analytics logging error:', analyticsError)
        // Don't fail the search for analytics errors
      }
    }

    // Check cache for this query
    const queryHash = btoa(searchQuery + JSON.stringify({ types, category, location, radius_km }))
    const { data: cachedResult } = await supabaseClient
      .from('search_cache')
      .select('results')
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!cachedResult) {
      // Cache the results for future requests
      try {
        await supabaseClient
          .from('search_cache')
          .upsert({
            query_hash: queryHash,
            search_query: searchQuery,
            search_types: types,
            results: results,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
          })
      } catch (cacheError) {
        console.error('Cache error:', cacheError)
        // Don't fail the search for cache errors
      }
    }

    const response: SearchResponse = {
      query: searchQuery,
      results,
      meta: {
        total: totalResults,
        search_time_ms: Math.round(searchTime),
        has_more: totalResults >= limit
      },
      suggestions: suggestions?.map((s: any) => s.suggestion) || [],
      trending: trending || []
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
