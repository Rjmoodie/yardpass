import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateEventRequest {
  title: string
  description?: string
  slug: string
  start_at: string
  end_at?: string
  venue?: string
  address?: string
  city?: string
  state?: string
  country?: string
  latitude?: number
  longitude?: number
  cover_image_url?: string
  visibility: 'public' | 'private'
  status: 'draft' | 'published'
  category?: string
  max_attendees?: number
  settings?: Record<string, any>
  owner_context_type: 'individual' | 'organization'
  owner_context_id: string
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

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: CreateEventRequest = await req.json()

    // Validate required fields
    if (!body.title || !body.slug || !body.start_at || !body.owner_context_type || !body.owner_context_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: title, slug, start_at, owner_context_type, owner_context_id' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(body.slug)) {
      return new Response(
        JSON.stringify({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if slug is unique
    const { data: existingEvent, error: slugCheckError } = await supabaseClient
      .from('events')
      .select('id')
      .eq('slug', body.slug)
      .single()

    if (slugCheckError && slugCheckError.code !== 'PGRST116') {
      return new Response(
        JSON.stringify({ error: 'Error checking slug uniqueness' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingEvent) {
      return new Response(
        JSON.stringify({ error: 'Event slug already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate owner context
    if (body.owner_context_type === 'organization') {
      // Check if user is a member of the organization with admin/owner role
      const { data: orgMembership, error: orgError } = await supabaseClient
        .from('org_members')
        .select('role')
        .eq('org_id', body.owner_context_id)
        .eq('user_id', user.id)
        .in('role', ['admin', 'owner'])
        .single()

      if (orgError || !orgMembership) {
        return new Response(
          JSON.stringify({ error: 'You do not have permission to create events for this organization' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (body.owner_context_type === 'individual') {
      // For individual events, owner_context_id should be the user's ID
      if (body.owner_context_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Individual events must be owned by the authenticated user' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate dates
    const startAt = new Date(body.start_at)
    const endAt = body.end_at ? new Date(body.end_at) : null
    
    if (isNaN(startAt.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid start_at date format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (endAt && (isNaN(endAt.getTime()) || endAt <= startAt)) {
      return new Response(
        JSON.stringify({ error: 'end_at must be after start_at' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the event
    const eventData = {
      title: body.title,
      description: body.description,
      slug: body.slug,
      start_at: body.start_at,
      end_at: body.end_at,
      venue: body.venue,
      address: body.address,
      city: body.city,
      state: body.state,
      country: body.country,
      latitude: body.latitude,
      longitude: body.longitude,
      cover_image_url: body.cover_image_url,
      visibility: body.visibility,
      status: body.status,
      category: body.category,
      max_attendees: body.max_attendees,
      settings: body.settings || {},
      owner_context_type: body.owner_context_type,
      owner_context_id: body.owner_context_id,
      created_by: user.id
    }

    const { data: event, error: createError } = await supabaseClient
      .from('events')
      .insert(eventData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating event:', createError)
      return new Response(
        JSON.stringify({ error: 'Failed to create event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the event creation
    await supabaseClient
      .from('user_behavior_logs')
      .insert({
        user_id: user.id,
        event_id: event.id,
        behavior_type: 'create',
        behavior_data: { event_title: event.title, event_slug: event.slug }
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        event,
        message: 'Event created successfully' 
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

