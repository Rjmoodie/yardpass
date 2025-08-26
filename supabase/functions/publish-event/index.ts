import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PublishEventRequest {
  event_id: string
  organization_id?: string
  publish_data: {
    title: string
    description: string
    slug: string
    venue: string
    city: string
    start_at: string
    end_at: string
    visibility: 'public' | 'private'
    category: string
    cover_image_url?: string
    price_range?: any
    max_attendees?: number
    waitlist_enabled?: boolean
    tags?: string[]
    settings?: any
  }
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
      console.error('Authentication error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Publishing event for user:', user.id)

    // Parse request body
    const { event_id, organization_id, publish_data }: PublishEventRequest = await req.json()

    if (!event_id || !publish_data) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: event_id and publish_data are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate user permissions
    let hasPermission = false

    if (organization_id) {
      // Check if user is admin/editor of the organization
      const { data: orgMember, error: orgError } = await supabaseClient
        .from('org_members')
        .select('role')
        .eq('org_id', organization_id)
        .eq('user_id', user.id)
        .single()

      if (!orgError && orgMember && ['admin', 'owner'].includes(orgMember.role)) {
        hasPermission = true
        console.log('User has organization admin permissions')
      }
    }

    if (!hasPermission) {
      // Check if user owns the event
      const { data: event, error: eventError } = await supabaseClient
        .from('events')
        .select('created_by')
        .eq('id', event_id)
        .single()

      if (!eventError && event && event.created_by === user.id) {
        hasPermission = true
        console.log('User has event ownership permissions')
      }
    }

    if (!hasPermission) {
      console.error('User lacks permission to publish event:', {
        user_id: user.id,
        event_id,
        organization_id
      })
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions to publish this event' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhanced validation
    const validationErrors = []
    
    if (!publish_data.title?.trim()) {
      validationErrors.push('Event title is required')
    } else if (publish_data.title.trim().length < 3) {
      validationErrors.push('Event title must be at least 3 characters long')
    }
    
    if (!publish_data.description?.trim()) {
      validationErrors.push('Event description is required')
    } else if (publish_data.description.trim().length < 10) {
      validationErrors.push('Event description must be at least 10 characters long')
    }
    
    if (!publish_data.venue?.trim()) {
      validationErrors.push('Venue is required')
    }
    
    if (!publish_data.city?.trim()) {
      validationErrors.push('City is required')
    }
    
    if (!publish_data.start_at) {
      validationErrors.push('Start date and time is required')
    }
    
    if (!publish_data.end_at) {
      validationErrors.push('End date and time is required')
    }

    // Date validations
    const startDate = new Date(publish_data.start_at)
    const endDate = new Date(publish_data.end_at)
    const now = new Date()

    if (isNaN(startDate.getTime())) {
      validationErrors.push('Invalid start date format')
    } else if (startDate <= now) {
      validationErrors.push('Start date must be in the future')
    }

    if (isNaN(endDate.getTime())) {
      validationErrors.push('Invalid end date format')
    } else if (endDate <= startDate) {
      validationErrors.push('End date must be after start date')
    }

    // Category validation
    const allowedCategories = [
      'music', 'sports', 'arts', 'food', 'technology', 'business', 
      'health', 'education', 'community', 'entertainment', 'other'
    ]
    
    if (!publish_data.category || !allowedCategories.includes(publish_data.category)) {
      validationErrors.push(`Category must be one of: ${allowedCategories.join(', ')}`)
    }

    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors)
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: validationErrors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate unique slug if not provided
    let finalSlug = publish_data.slug?.trim()
    if (!finalSlug) {
      finalSlug = publish_data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50) // Limit slug length
    }

    // Ensure slug uniqueness
    const { data: existingEvent, error: slugError } = await supabaseClient
      .from('events')
      .select('id')
      .eq('slug', finalSlug)
      .neq('id', event_id)
      .maybeSingle()

    if (existingEvent) {
      finalSlug = `${finalSlug}-${Date.now()}`
      console.log('Slug already exists, using:', finalSlug)
    }

    // Prepare event data for update
    const eventData = {
      title: publish_data.title.trim(),
      description: publish_data.description.trim(),
      slug: finalSlug,
      venue: publish_data.venue.trim(),
      city: publish_data.city.trim(),
      start_at: publish_data.start_at,
      end_at: publish_data.end_at,
      visibility: publish_data.visibility,
      category: publish_data.category,
      status: 'published',
      published_at: new Date().toISOString(),
      cover_image_url: publish_data.cover_image_url,
      price_range: publish_data.price_range || {
        min: 0,
        max: 0,
        currency: 'USD'
      },
      max_attendees: publish_data.max_attendees,
      waitlist_enabled: publish_data.waitlist_enabled || false,
      tags: publish_data.tags || [],
      settings: publish_data.settings || {},
      updated_at: new Date().toISOString()
    }

    console.log('Updating event with data:', { event_id, eventData })

    // Update the event
    const { data: updatedEvent, error: updateError } = await supabaseClient
      .from('events')
      .update(eventData)
      .eq('id', event_id)
      .select(`
        *,
        organizations:owner_context_id (
          name,
          slug,
          verification_status
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating event:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to publish event',
          details: updateError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Event published successfully:', updatedEvent.id)

    // Create notifications for event publication
    try {
      if (organization_id && updatedEvent.visibility === 'public') {
        // Create notification using the existing notification function
        await supabaseClient.rpc('create_notification', {
          p_user_id: user.id,
          p_notification_type: 'event_published',
          p_title: 'Event Published Successfully',
          p_message: `Your event "${publish_data.title}" has been published and is now live!`,
          p_data: {
            event_id: event_id,
            organization_id: organization_id,
            event_title: publish_data.title,
            event_slug: finalSlug
          }
        })
        console.log('Publisher notification created')
      }
    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError)
      // Don't fail the entire operation for notification errors
    }

    // Log the publish action in event views
    try {
      await supabaseClient.rpc('log_event_view', {
        event_id: event_id,
        user_id: user.id,
        source: 'publish_action'
      })
    } catch (logError) {
      console.error('Error logging event view:', logError)
      // Don't fail for logging errors
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        event: updatedEvent,
        message: 'Event published successfully!',
        slug: finalSlug,
        published_at: eventData.published_at
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error in publish-event function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
