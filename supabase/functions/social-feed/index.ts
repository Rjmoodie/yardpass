import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'No authorization header'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'Invalid token'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const eventId = url.searchParams.get('event_id');
    const userId = url.searchParams.get('user_id');

    if (req.method === 'POST') {
      // Create new post
      const requestBody = await req.json();
      const { content, event_id, media_urls, post_type } = requestBody;

      if (!content || !event_id) {
        return new Response(JSON.stringify({
          error: 'Content and event_id are required'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          event_id,
          content,
          media_urls: media_urls || [],
          post_type: post_type || 'general'
        })
        .select(`
          *,
          user_profiles!inner(
            id,
            display_name,
            avatar_url,
            username
          ),
          events!inner(
            id,
            title,
            slug,
            cover_image_url
          )
        `)
        .single();

      if (postError) {
        console.error('Error creating post:', postError);
        return new Response(JSON.stringify({
          error: 'Failed to create post'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      return new Response(JSON.stringify({
        post
      }), {
        status: 201,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // GET - Fetch social feed
    let query = supabase
      .from('posts')
      .select(`
        *,
        user_profiles!inner(
          id,
          display_name,
          avatar_url,
          username
        ),
        events!inner(
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
          user_profiles!inner(
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
      return new Response(JSON.stringify({
        error: 'Failed to fetch posts'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
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
    const { count: totalCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    return new Response(JSON.stringify({
      posts: processedPosts,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        total_pages: Math.ceil((totalCount || 0) / limit)
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Social feed error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
