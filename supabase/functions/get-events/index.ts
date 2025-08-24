import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GetEventsRequest {
  page?: number
  limit?: number
  category?: string
  city?: string
  status?: 'draft' | 'published' | 'cancelled'
  visibility?: 'public' | 'private'
  start_date?: string
  end_date?: string
  search?: string
  user_id?: string
  organization_id?: string
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

    // Get the authenticated user (optional for public events)
    const { data: { user } } = await supabaseClient.auth.getUser()

    // Parse query parameters
    const url = new URL(req.url)
    const params: GetEventsRequest = {
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: Math.min(parseInt(url.searchParams.get('limit') || '20'), 100), // Max 100 per page
      category: url.searchParams.get('category') || undefined,
      city: url.searchParams.get('city') || undefined,
      status: url.searchParams.get('status') as any || undefined,
      visibility: url.searchParams.get('visibility') as any || undefined,
      start_date: url.searchParams.get('start_date') || undefined,
      end_date: url.searchParams.get('end_date') || undefined,
      search: url.searchParams.get('search') || undefined,
      user_id: url.searchParams.get('user_id') || undefined,
      organization_id: url.searchParams.get('organization_id') || undefined,
    }

    // Build the query
    let query = supabaseClient
      .from('events')
      .select(`
        *,
        user_profiles!events_created_by_fkey (
          id,
          display_name,
          username,
          avatar_url
        ),
        organizations!events_owner_context_id_fkey (
          id,
          name,
          slug,
          logo_url
        )
      `)

    // Apply filters
    if (params.category) {
      query = query.eq('category', params.category)
    }

    if (params.city) {
      query = query.ilike('city', `%${params.city}%`)
    }

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.visibility) {
      query = query.eq('visibility', params.visibility)
    }

    if (params.start_date) {
      query = query.gte('start_at', params.start_date)
    }

    if (params.end_date) {
      query = query.lte('start_at', params.end_date)
    }

    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%,venue.ilike.%${params.search}%`)
    }

    if (params.user_id) {
      query = query.eq('created_by', params.user_id)
    }

    if (params.organization_id) {
      query = query.eq('owner_context_id', params.organization_id)
        .eq('owner_context_type', 'organization')
    }

    // If user is authenticated, show their private events too
    if (user) {
      // Show public events + user's private events + org events where user is member
      query = query.or(`
        visibility.eq.public,
        and(visibility.eq.private,created_by.eq.${user.id}),
        and(owner_context_type.eq.organization,owner_context_id.in.(
          select org_id from org_members where user_id = ${user.id}
        ))
      `)
    } else {
      // Show only public events for unauthenticated users
      query = query.eq('visibility', 'public')
    }

    // Order by start date (upcoming first)
    query = query.order('start_at', { ascending: true })

    // Apply pagination
    const offset = (params.page - 1) * params.limit
    query = query.range(offset, offset + params.limit - 1)

    // Execute the query
    const { data: events, error: eventsError, count } = await query

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch events' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get total count for pagination
    let totalCount = count
    if (!totalCount) {
      const { count: total } = await supabaseClient
        .from('events')
        .select('*', { count: 'exact', head: true })
      totalCount = total || 0
    }

    // Log the search/view behavior if user is authenticated
    if (user) {
      await supabaseClient
        .from('user_behavior_logs')
        .insert({
          user_id: user.id,
          behavior_type: 'search',
          behavior_data: {
            search_params: params,
            results_count: events?.length || 0
          }
        })
    }

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / params.limit)
    const hasNextPage = params.page < totalPages
    const hasPrevPage = params.page > 1

    return new Response(
      JSON.stringify({
        success: true,
        events: events || [],
        pagination: {
          page: params.page,
          limit: params.limit,
          total: totalCount,
          total_pages: totalPages,
          has_next: hasNextPage,
          has_prev: hasPrevPage
        },
        filters: params
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
