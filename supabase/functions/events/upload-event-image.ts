import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UploadEventImageRequest {
  event_id: string
  image_data: string // base64 encoded image
  image_type: 'cover' | 'gallery'
  filename?: string
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
    const body: UploadEventImageRequest = await req.json()

    // Validate required fields
    if (!body.event_id || !body.image_data || !body.image_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: event_id, image_data, image_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the event to check permissions
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', body.event_id)
      .single()

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check permissions
    let hasPermission = false

    // User can upload if they created the event
    if (event.created_by === user.id) {
      hasPermission = true
    }

    // User can upload if they're an admin/owner of the organization that owns the event
    if (event.owner_context_type === 'organization') {
      const { data: orgMembership } = await supabaseClient
        .from('org_members')
        .select('role')
        .eq('org_id', event.owner_context_id)
        .eq('user_id', user.id)
        .in('role', ['admin', 'owner'])
        .single()

      if (orgMembership) {
        hasPermission = true
      }
    }

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to upload images for this event' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate image data
    if (!body.image_data.startsWith('data:image/')) {
      return new Response(
        JSON.stringify({ error: 'Invalid image data format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract image format and data
    const matches = body.image_data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/)
    if (!matches) {
      return new Response(
        JSON.stringify({ error: 'Invalid image data format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const [, imageFormat, base64Data] = matches
    const allowedFormats = ['jpeg', 'jpg', 'png', 'webp']
    
    if (!allowedFormats.includes(imageFormat.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'Unsupported image format. Use JPEG, PNG, or WebP' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decode base64 data
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (imageBytes.length > maxSize) {
      return new Response(
        JSON.stringify({ error: 'Image file too large. Maximum size is 5MB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = body.filename || `${body.event_id}-${body.image_type}-${timestamp}.${imageFormat}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('event-images')
      .upload(`events/${body.event_id}/${filename}`, imageBytes, {
        contentType: `image/${imageFormat}`,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('event-images')
      .getPublicUrl(`events/${body.event_id}/${filename}`)

    // Update event with cover image URL if it's a cover image
    if (body.image_type === 'cover') {
      const { error: updateError } = await supabaseClient
        .from('events')
        .update({ 
          cover_image_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', body.event_id)

      if (updateError) {
        console.error('Error updating event cover image:', updateError)
        // Don't fail the upload, just log the error
      }
    }

    // Log the image upload
    await supabaseClient
      .from('user_behavior_logs')
      .insert({
        user_id: user.id,
        event_id: body.event_id,
        behavior_type: 'upload',
        behavior_data: { 
          image_type: body.image_type,
          filename: filename,
          file_size: imageBytes.length
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        image_url: publicUrl,
        filename: filename,
        file_size: imageBytes.length,
        message: 'Image uploaded successfully'
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

