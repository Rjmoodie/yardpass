import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS'
}

interface PostReactionRequest {
  post_id: string
  reaction_type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with proper authentication
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

    const url = new URL(req.url)
    const postId = url.searchParams.get('post_id')

    if (req.method === 'POST') {
      const body: PostReactionRequest = await req.json()

      if (!body.post_id || !body.reaction_type) {
        return new Response(
          JSON.stringify({ error: 'Post ID and reaction type are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate reaction type
      const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry']
      if (!validReactions.includes(body.reaction_type)) {
        return new Response(
          JSON.stringify({ error: 'Invalid reaction type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if post exists and user has access
      const { data: post, error: postError } = await supabaseClient
        .from('posts')
        .select('id, user_id, events!posts_event_id_fkey(visibility, created_by, owner_context_type, owner_context_id)')
        .eq('id', body.post_id)
        .eq('is_active', true)
        .single()

      if (postError || !post) {
        return new Response(
          JSON.stringify({ error: 'Post not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if user has access to the post's event
      const event = post.events
      let hasAccess = false

      if (event.visibility === 'public') {
        hasAccess = true
      } else if (event.created_by === user.id) {
        hasAccess = true
      } else if (event.owner_context_type === 'organization') {
        const { data: orgMembership } = await supabaseClient
          .from('org_members')
          .select('id')
          .eq('org_id', event.owner_context_id)
          .eq('user_id', user.id)
          .single()
        hasAccess = !!orgMembership
      }

      if (!hasAccess) {
        return new Response(
          JSON.stringify({ error: 'You do not have access to this post' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if user already reacted to this post
      const { data: existingReaction, error: reactionCheckError } = await supabaseClient
        .from('post_reactions')
        .select('*')
        .eq('post_id', body.post_id)
        .eq('user_id', user.id)
        .single()

      if (existingReaction) {
        // Update existing reaction
        const { data: updatedReaction, error: updateError } = await supabaseClient
          .from('post_reactions')
          .update({
            reaction_type: body.reaction_type,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReaction.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating reaction:', updateError)
          return new Response(
            JSON.stringify({ error: 'Failed to update reaction' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            reaction: updatedReaction,
            message: 'Reaction updated successfully'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Create new reaction
        const { data: newReaction, error: createError } = await supabaseClient
          .from('post_reactions')
          .insert({
            post_id: body.post_id,
            user_id: user.id,
            reaction_type: body.reaction_type
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating reaction:', createError)
          return new Response(
            JSON.stringify({ error: 'Failed to create reaction' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Log the reaction
        await supabaseClient
          .from('user_behavior_logs')
          .insert({
            user_id: user.id,
            behavior_type: 'post_reaction',
            behavior_data: {
              post_id: body.post_id,
              reaction_type: body.reaction_type
            }
          })

        return new Response(
          JSON.stringify({
            success: true,
            reaction: newReaction,
            message: 'Reaction added successfully'
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (req.method === 'DELETE' && postId) {
      // Remove reaction
      const { error: deleteError } = await supabaseClient
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Error deleting reaction:', deleteError)
        return new Response(
          JSON.stringify({ error: 'Failed to remove reaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Reaction removed successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET - Get reactions for a post
    if (req.method === 'GET' && postId) {
      const { data: reactions, error: reactionsError } = await supabaseClient
        .from('post_reactions')
        .select(`
          *,
          user_profiles!post_reactions_user_id_fkey(
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false })

      if (reactionsError) {
        console.error('Error fetching reactions:', reactionsError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch reactions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Group reactions by type
      const reactionCounts = reactions?.reduce((acc, reaction) => {
        acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      // Check if current user has reacted
      const userReaction = reactions?.find(r => r.user_id === user.id)?.reaction_type || null

      return new Response(
        JSON.stringify({
          success: true,
          reactions: reactions || [],
          reaction_counts: reactionCounts,
          user_reaction: userReaction
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Post reactions error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

