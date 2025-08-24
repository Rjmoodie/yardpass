import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateEventRequest {
  event_id: string
  title?: string
  description?: string
  slug?: string
  start_at?: string
  end_at?: string
  venue?: string
  address?: string
  city?: string
  state?: string
  country?: string
  latitude?: number
  longitude?: number
  cover_image_url?: string
  visibility?: 'public' | 'private'
  status?: 'draft' | 'published' | 'cancelled'
  category?: string
  max_attendees?: number
  settings?: Record<string, any>
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
    const body: UpdateEventRequest = await req.json()

    // Validate required fields
    if (!body.event_id) {
      return new Response(
        JSON.stringify({ error: 'Event ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the existing event
    const { data: existingEvent, error: fetchError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', body.event_id)
      .single()

    if (fetchError || !existingEvent) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check permissions
    let hasPermission = false

    // User can edit if they created the event
    if (existingEvent.created_by === user.id) {
      hasPermission = true
    }

    // User can edit if they're an admin/owner of the organization that owns the event
    if (existingEvent.owner_context_type === 'organization') {
      const { data: orgMembership } = await supabaseClient
        .from('org_members')
        .select('role')
        .eq('org_id', existingEvent.owner_context_id)
        .eq('user_id', user.id)
        .in('role', ['admin', 'owner'])
        .single()

      if (orgMembership) {
        hasPermission = true
      }
    }

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to edit this event' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate slug if it's being updated
    if (body.slug && body.slug !== existingEvent.slug) {
      const slugRegex = /^[a-z0-9-]+$/
      if (!slugRegex.test(body.slug)) {
        return new Response(
          JSON.stringify({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if new slug is unique
      const { data: slugConflict, error: slugCheckError } = await supabaseClient
        .from('events')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', body.event_id)
        .single()

      if (slugCheckError && slugCheckError.code !== 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Error checking slug uniqueness' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (slugConflict) {
        return new Response(
          JSON.stringify({ error: 'Event slug already exists' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate dates if they're being updated
    if (body.start_at || body.end_at) {
      const startAt = body.start_at ? new Date(body.start_at) : new Date(existingEvent.start_at)
      const endAt = body.end_at ? new Date(body.end_at) : (existingEvent.end_at ? new Date(existingEvent.end_at) : null)
      
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
    }

    // Prepare update data
    const updateData: any = {}
    
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.slug !== undefined) updateData.slug = body.slug
    if (body.start_at !== undefined) updateData.start_at = body.start_at
    if (body.end_at !== undefined) updateData.end_at = body.end_at
    if (body.venue !== undefined) updateData.venue = body.venue
    if (body.address !== undefined) updateData.address = body.address
    if (body.city !== undefined) updateData.city = body.city
    if (body.state !== undefined) updateData.state = body.state
    if (body.country !== undefined) updateData.country = body.country
    if (body.latitude !== undefined) updateData.latitude = body.latitude
    if (body.longitude !== undefined) updateData.longitude = body.longitude
    if (body.cover_image_url !== undefined) updateData.cover_image_url = body.cover_image_url
    if (body.visibility !== undefined) updateData.visibility = body.visibility
    if (body.status !== undefined) updateData.status = body.status
    if (body.category !== undefined) updateData.category = body.category
    if (body.max_attendees !== undefined) updateData.max_attendees = body.max_attendees
    if (body.settings !== undefined) updateData.settings = body.settings

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    // Update the event
    const { data: updatedEvent, error: updateError } = await supabaseClient
      .from('events')
      .update(updateData)
      .eq('id', body.event_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating event:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the event update
    await supabaseClient
      .from('user_behavior_logs')
      .insert({
        user_id: user.id,
        event_id: body.event_id,
        behavior_type: 'update',
        behavior_data: { 
          updated_fields: Object.keys(updateData).filter(key => key !== 'updated_at'),
          event_title: updatedEvent.title,
          event_slug: updatedEvent.slug
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        event: updatedEvent,
        message: 'Event updated successfully' 
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
