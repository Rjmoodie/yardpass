import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
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
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const eventId = url.searchParams.get('event_id');
    const userId = url.searchParams.get('user_id');
    const postId = url.searchParams.get('post_id');

    if (req.method === 'POST') {
      const requestBody = await req.json();
      const { content, event_id, media_urls, post_type } = requestBody;

      if (!content || !event_id) {
        return new Response(
          JSON.stringify({ error: 'Content and event_id are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user has access to the event
      const { data: event, error: eventError } = await supabaseClient
        .from('events')
        .select('id, visibility, created_by, owner_context_type, owner_context_id')
        .eq('id', event_id)
        .single();

      if (eventError || !event) {
        return new Response(
          JSON.stringify({ error: 'Event not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user can post to this event
      let canPost = false;
      if (event.visibility === 'public') {
        canPost = true;
      } else if (event.created_by === user.id) {
        canPost = true;
      } else if (event.owner_context_type === 'organization') {
        const { data: orgMembership } = await supabaseClient
          .from('org_members')
          .select('id')
          .eq('org_id', event.owner_context_id)
          .eq('user_id', user.id)
          .single();
        canPost = !!orgMembership;
      }

      if (!canPost) {
        return new Response(
          JSON.stringify({ error: 'You do not have permission to post to this event' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: post, error: postError } = await supabaseClient
        .from('posts')
        .insert({
          user_id: user.id,
          event_id,
          content,
          media_urls: media_urls || [],
          post_type: post_type || 'general',
          is_active: true
        })
        .select(`
          *,
          user_profiles!posts_user_id_fkey(
            id,
            display_name,
            avatar_url,
            username
          ),
          events!posts_event_id_fkey(
            id,
            title,
            slug,
            cover_image_url
          )
        `)
        .single();

      if (postError) {
        console.error('Error creating post:', postError);
        return new Response(
          JSON.stringify({ error: 'Failed to create post' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the post creation
      await supabaseClient
        .from('user_behavior_logs')
        .insert({
          user_id: user.id,
          event_id: event_id,
          behavior_type: 'create_post',
          behavior_data: { post_id: post.id, post_type: post_type }
        });

      return new Response(
        JSON.stringify({ success: true, post }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'PUT' && postId) {
      // Update post (only by author)
      const requestBody = await req.json();
      const { content, media_urls } = requestBody;

      if (!content) {
        return new Response(
          JSON.stringify({ error: 'Content is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: post, error: updateError } = await supabaseClient
        .from('posts')
        .update({
          content,
          media_urls: media_urls || [],
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError || !post) {
        return new Response(
          JSON.stringify({ error: 'Post not found or you do not have permission to edit it' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, post }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'DELETE' && postId) {
      // Delete post (only by author)
      const { error: deleteError } = await supabaseClient
        .from('posts')
        .update({ is_active: false })
        .eq('id', postId)
        .eq('user_id', user.id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: 'Post not found or you do not have permission to delete it' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Post deleted successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET - Fetch social feed
    let query = supabaseClient
      .from('posts')
      .select(`
        *,
        user_profiles!posts_user_id_fkey(
          id,
          display_name,
          avatar_url,
          username
        ),
        events!posts_event_id_fkey(
          id,
          title,
          slug,
          cover_image_url,
          start_at
        ),
        post_reactions(
          id,
          reaction_type,
          user_id
        ),
        post_comments(
          id,
          content,
          created_at,
          user_profiles!post_comments_user_id_fkey(
            id,
            display_name,
            avatar_url,
            username
          )
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Filter by event if specified
    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    // Filter by user if specified
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch posts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process posts with engagement metrics
    const processedPosts = posts?.map((post) => {
      const reactions = post.post_reactions || [];
      const comments = post.post_comments || [];
      
      const reactionCounts = reactions.reduce((acc, reaction) => {
        acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1;
        return acc;
      }, {});

      const userReaction = reactions.find((r) => r.user_id === user.id)?.reaction_type || null;

      return {
        id: post.id,
        content: post.content,
        media_urls: post.media_urls,
        post_type: post.post_type,
        created_at: post.created_at,
        updated_at: post.updated_at,
        user: {
          id: post.user_profiles.id,
          display_name: post.user_profiles.display_name,
          avatar_url: post.user_profiles.avatar_url,
          username: post.user_profiles.username
        },
        event: {
          id: post.events.id,
          title: post.events.title,
          slug: post.events.slug,
          cover_image_url: post.events.cover_image_url,
          start_at: post.events.start_at
        },
        engagement: {
          reaction_counts: reactionCounts,
          comment_count: comments.length,
          user_reaction: userReaction
        },
        comments: comments.slice(0, 3) // Show first 3 comments
      };
    }) || [];

    // Get total count for pagination
    const { count: totalCount } = await supabaseClient
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    return new Response(
      JSON.stringify({
        success: true,
        posts: processedPosts,
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          total_pages: Math.ceil((totalCount || 0) / limit)
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Social feed error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
