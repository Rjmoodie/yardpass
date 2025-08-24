import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const recommendationType = url.searchParams.get('type') || 'all'; // all, collaborative, content_based, popularity

    if (req.method === 'POST') {
      // Track user behavior for recommendations
      const { event_id, behavior_type, behavior_data, session_id } = await req.json();
      
      if (!event_id || !behavior_type) {
        return new Response(JSON.stringify({
          error: 'event_id and behavior_type are required'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: behaviorId, error: behaviorError } = await supabaseClient.rpc('track_user_behavior', {
        p_user_id: user.id,
        p_event_id: event_id,
        p_behavior_type: behavior_type,
        p_behavior_data: behavior_data || {},
        p_session_id: session_id
      });

      if (behaviorError) {
        console.error('Error tracking behavior:', behaviorError);
        return new Response(JSON.stringify({
          error: 'Failed to track behavior'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        behavior_id: behaviorId,
        message: 'Behavior tracked successfully'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET - Generate recommendations
    const recommendations = await generateRecommendations(supabaseClient, user.id, limit, recommendationType);

    return new Response(JSON.stringify({
      recommendations,
      user_id: user.id,
      generated_at: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Smart recommendations error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generateRecommendations(supabaseClient: any, userId: string, limit: number, type: string) {
  const recommendations = {
    collaborative: [],
    content_based: [],
    popularity: [],
    location: [],
    category: [],
    social: []
  };

  try {
    // Get user preferences
    const { data: userPrefs } = await supabaseClient
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get user behavior history
    const { data: userBehavior } = await supabaseClient
      .from('user_behavior_logs')
      .select('event_id, behavior_type, timestamp')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100);

    // 1. Collaborative Filtering Recommendations
    if (type === 'all' || type === 'collaborative') {
      recommendations.collaborative = await generateCollaborativeRecommendations(supabaseClient, userId, limit);
    }

    // 2. Content-Based Recommendations
    if (type === 'all' || type === 'content_based') {
      recommendations.content_based = await generateContentBasedRecommendations(supabaseClient, userId, userPrefs, limit);
    }

    // 3. Popularity-Based Recommendations
    if (type === 'all' || type === 'popularity') {
      recommendations.popularity = await generatePopularityRecommendations(supabase, limit);
    }

    // 4. Location-Based Recommendations
    if (type === 'all' || type === 'location') {
      recommendations.location = await generateLocationRecommendations(supabase, userId, userPrefs, limit);
    }

    // 5. Category-Based Recommendations
    if (type === 'all' || type === 'category') {
      recommendations.category = await generateCategoryRecommendations(supabase, userId, userPrefs, limit);
    }

    // 6. Social-Based Recommendations
    if (type === 'all' || type === 'social') {
      recommendations.social = await generateSocialRecommendations(supabase, userId, limit);
    }

    // Cache recommendations in database
    await cacheRecommendations(supabase, userId, recommendations);

    return recommendations;

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return recommendations;
  }
}

async function generateCollaborativeRecommendations(supabase: any, userId: string, limit: number) {
  // Find users with similar behavior patterns
  const { data: similarUsers } = await supabase
    .from('user_behavior_logs')
    .select('user_id, event_id, behavior_type')
    .neq('user_id', userId)
    .in('behavior_type', ['purchase', 'attend', 'like'])
    .limit(1000);

  if (!similarUsers || similarUsers.length === 0) {
    return [];
  }

  // Get events that similar users liked but current user hasn't seen
  const similarUserIds = [...new Set(similarUsers.map(u => u.user_id))];
  const { data: recommendedEvents } = await supabase
    .from('events')
    .select(`
      *,
      ticket_tiers!inner(id, name, price_cents, currency, available_quantity, is_active),
      organizations!inner(id, name, slug, verification_status)
    `)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .gte('start_at', new Date().toISOString())
    .in('id', similarUsers.map(u => u.event_id))
    .not('id', 'in', `(SELECT event_id FROM user_behavior_logs WHERE user_id = '${userId}')`)
    .order('start_at', { ascending: true })
    .limit(limit);

  return recommendedEvents?.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description,
    start_at: event.start_at,
    venue: event.venue,
    city: event.city,
    cover_image_url: event.cover_image_url,
    category: event.category,
    organization: event.organizations,
    recommendation_score: 0.8,
    recommendation_type: 'collaborative',
    reason: 'Based on similar users'
  })) || [];
}

async function generateContentBasedRecommendations(supabase: any, userId: string, userPrefs: any, limit: number) {
  if (!userPrefs?.favorite_categories || userPrefs.favorite_categories.length === 0) {
    return [];
  }

  const { data: events } = await supabase
    .from('events')
    .select(`
      *,
      ticket_tiers!inner(id, name, price_cents, currency, available_quantity, is_active),
      organizations!inner(id, name, slug, verification_status)
    `)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .gte('start_at', new Date().toISOString())
    .in('category', userPrefs.favorite_categories)
    .not('id', 'in', `(SELECT event_id FROM user_behavior_logs WHERE user_id = '${userId}')`)
    .order('start_at', { ascending: true })
    .limit(limit);

  return events?.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description,
    start_at: event.start_at,
    venue: event.venue,
    city: event.city,
    cover_image_url: event.cover_image_url,
    category: event.category,
    organization: event.organizations,
    recommendation_score: 0.9,
    recommendation_type: 'content_based',
    reason: `Based on your interest in ${event.category}`
  })) || [];
}

async function generatePopularityRecommendations(supabase: any, limit: number) {
  const { data: events } = await supabase
    .from('events')
    .select(`
      *,
      ticket_tiers!inner(id, name, price_cents, currency, available_quantity, is_active),
      organizations!inner(id, name, slug, verification_status),
      content_performance!inner(engagement_score, views_count)
    `)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .gte('start_at', new Date().toISOString())
    .order('content_performance.engagement_score', { ascending: false })
    .limit(limit);

  return events?.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description,
    start_at: event.start_at,
    venue: event.venue,
    city: event.city,
    cover_image_url: event.cover_image_url,
    category: event.category,
    organization: event.organizations,
    recommendation_score: event.content_performance?.engagement_score || 0.7,
    recommendation_type: 'popularity',
    reason: 'Popular event with high engagement'
  })) || [];
}

async function generateLocationRecommendations(supabase: any, userId: string, userPrefs: any, limit: number) {
  // Get user's recent event locations
  const { data: recentEvents } = await supabase
    .from('user_behavior_logs')
    .select(`
      events!inner(city, state, country)
    `)
    .eq('user_id', userId)
    .in('behavior_type', ['purchase', 'attend'])
    .order('timestamp', { ascending: false })
    .limit(10);

  if (!recentEvents || recentEvents.length === 0) {
    return [];
  }

  const preferredCities = [...new Set(recentEvents.map(e => e.events?.city).filter(Boolean))];
  
  const { data: events } = await supabase
    .from('events')
    .select(`
      *,
      ticket_tiers!inner(id, name, price_cents, currency, available_quantity, is_active),
      organizations!inner(id, name, slug, verification_status)
    `)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .gte('start_at', new Date().toISOString())
    .in('city', preferredCities)
    .not('id', 'in', `(SELECT event_id FROM user_behavior_logs WHERE user_id = '${userId}')`)
    .order('start_at', { ascending: true })
    .limit(limit);

  return events?.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description,
    start_at: event.start_at,
    venue: event.venue,
    city: event.city,
    cover_image_url: event.cover_image_url,
    category: event.category,
    organization: event.organizations,
    recommendation_score: 0.8,
    recommendation_type: 'location',
    reason: `Near your preferred location: ${event.city}`
  })) || [];
}

async function generateCategoryRecommendations(supabase: any, userId: string, userPrefs: any, limit: number) {
  // Get user's most viewed categories
  const { data: categoryStats } = await supabase
    .from('user_behavior_logs')
    .select(`
      events!inner(category)
    `)
    .eq('user_id', userId)
    .eq('behavior_type', 'view');

  if (!categoryStats || categoryStats.length === 0) {
    return [];
  }

  const categoryCounts = categoryStats.reduce((acc, stat) => {
    const category = stat.events?.category;
    if (category) {
      acc[category] = (acc[category] || 0) + 1;
    }
    return acc;
  }, {});

  const topCategories = Object.entries(categoryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category);

  const { data: events } = await supabase
    .from('events')
    .select(`
      *,
      ticket_tiers!inner(id, name, price_cents, currency, available_quantity, is_active),
      organizations!inner(id, name, slug, verification_status)
    `)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .gte('start_at', new Date().toISOString())
    .in('category', topCategories)
    .not('id', 'in', `(SELECT event_id FROM user_behavior_logs WHERE user_id = '${userId}')`)
    .order('start_at', { ascending: true })
    .limit(limit);

  return events?.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description,
    start_at: event.start_at,
    venue: event.venue,
    city: event.city,
    cover_image_url: event.cover_image_url,
    category: event.category,
    organization: event.organizations,
    recommendation_score: 0.85,
    recommendation_type: 'category',
    reason: `Based on your interest in ${event.category} events`
  })) || [];
}

async function generateSocialRecommendations(supabase: any, userId: string, limit: number) {
  // Get events that user's connections are attending
  const { data: connections } = await supabase
    .from('user_connections')
    .select('connected_user_id')
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (!connections || connections.length === 0) {
    return [];
  }

  const connectionIds = connections.map(c => c.connected_user_id);
  
  const { data: socialEvents } = await supabase
    .from('user_behavior_logs')
    .select(`
      event_id,
      events!inner(
        id, title, description, start_at, venue, city, cover_image_url, category,
        ticket_tiers!inner(id, name, price_cents, currency, available_quantity, is_active),
        organizations!inner(id, name, slug, verification_status)
      )
    `)
    .in('user_id', connectionIds)
    .in('behavior_type', ['purchase', 'attend'])
    .not('event_id', 'in', `(SELECT event_id FROM user_behavior_logs WHERE user_id = '${userId}')`)
    .order('timestamp', { ascending: false })
    .limit(limit);

  return socialEvents?.map(item => ({
    id: item.events.id,
    title: item.events.title,
    description: item.events.description,
    start_at: item.events.start_at,
    venue: item.events.venue,
    city: item.events.city,
    cover_image_url: item.events.cover_image_url,
    category: item.events.category,
    organization: item.events.organizations,
    recommendation_score: 0.9,
    recommendation_type: 'social',
    reason: 'Your connections are attending this event'
  })) || [];
}

async function cacheRecommendations(supabase: any, userId: string, recommendations: any) {
  try {
    // Clear existing recommendations
    await supabase
      .from('user_recommendations')
      .delete()
      .eq('user_id', userId);

    // Insert new recommendations
    const allRecommendations = [
      ...recommendations.collaborative,
      ...recommendations.content_based,
      ...recommendations.popularity,
      ...recommendations.location,
      ...recommendations.category,
      ...recommendations.social
    ];

    for (const rec of allRecommendations) {
      await supabase
        .from('user_recommendations')
        .insert({
          user_id: userId,
          event_id: rec.id,
          recommendation_score: rec.recommendation_score,
          recommendation_type: rec.recommendation_type,
          recommendation_factors: { reason: rec.reason }
        });
    }
  } catch (error) {
    console.error('Error caching recommendations:', error);
  }
}
