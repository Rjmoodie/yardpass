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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const query = url.searchParams.get('q') || '';
    const types = url.searchParams.get('types')?.split(',') || ['events', 'users', 'organizations'];
    const category = url.searchParams.get('category');
    const location = url.searchParams.get('location');
    const radius = parseInt(url.searchParams.get('radius') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!query.trim()) {
      return new Response(JSON.stringify({
        error: 'Search query is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results = {
      events: [],
      users: [],
      organizations: [],
      categories: [],
      tags: [],
      total_results: 0,
      search_time_ms: 0
    };

    const startTime = performance.now();

    // Search events with full-text search
    if (types.includes('events')) {
      const { data: events, error: eventsError } = await searchEvents(
        supabaseClient, 
        query, 
        category, 
        location, 
        radius, 
        offset, 
        limit
      );
      if (!eventsError && events) {
        results.events = events;
      }
    }

    // Search users with full-text search
    if (types.includes('users')) {
      const { data: users, error: usersError } = await searchUsers(
        supabaseClient, 
        query, 
        offset, 
        limit
      );
      if (!usersError && users) {
        results.users = users;
      }
    }

    // Search organizations with full-text search
    if (types.includes('organizations')) {
      const { data: organizations, error: orgsError } = await searchOrganizations(
        supabaseClient, 
        query, 
        offset, 
        limit
      );
      if (!orgsError && organizations) {
        results.organizations = organizations;
      }
    }

    // Search categories
    if (types.includes('categories')) {
      const { data: categories, error: categoriesError } = await searchCategories(
        supabaseClient, 
        query, 
        offset, 
        limit
      );
      if (!categoriesError && categories) {
        results.categories = categories;
      }
    }

    // Search tags
    if (types.includes('tags')) {
      const { data: tags, error: tagsError } = await searchTags(
        supabaseClient, 
        query, 
        offset, 
        limit
      );
      if (!tagsError && tags) {
        results.tags = tags;
      }
    }

    const endTime = performance.now();
    results.search_time_ms = Math.round(endTime - startTime);
    results.total_results = results.events.length + results.users.length + 
                           results.organizations.length + results.categories.length + 
                           results.tags.length;

    // Log search for analytics
    await logSearch(supabaseClient, user.id, query, types, results.total_results, results.search_time_ms);

    return new Response(JSON.stringify({
      query,
      results,
      pagination: {
        page,
        limit,
        offset,
        has_more: results.total_results >= limit
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Enhanced search error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function searchEvents(supabase: any, query: string, category: string | null, location: string | null, radius: number, offset: number, limit: number) {
  let searchQuery = supabase
    .from('events')
    .select(`
      id,
      title,
      description,
      slug,
      venue,
      city,
      start_at,
      end_at,
      cover_image_url,
      category,
      tags,
      visibility,
      status,
      event_categories (
        id,
        name,
        slug,
        icon_url,
        color_hex
      )
    `)
    .eq('status', 'published')
    .eq('visibility', 'public');

  // Full-text search
  if (query.trim()) {
    searchQuery = searchQuery.textSearch('title', query, {
      type: 'websearch',
      config: 'english'
    });
  }

  // Category filter
  if (category) {
    searchQuery = searchQuery.eq('category_id', category);
  }

  // Location filter
  if (location) {
    // Parse location (assuming format: "lat,lng")
    const [lat, lng] = location.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      searchQuery = searchQuery.rpc('nearby_events', {
        lat: lat,
        lng: lng,
        radius_meters: radius * 1000
      });
    }
  }

  return await searchQuery
    .order('start_at', { ascending: true })
    .range(offset, offset + limit - 1);
}

async function searchUsers(supabase: any, query: string, offset: number, limit: number) {
  let searchQuery = supabase
    .from('users')
    .select(`
      id,
      name,
      handle,
      bio,
      avatar_url,
      is_verified,
      role,
      created_at
    `)
    .eq('is_active', true);

  // Full-text search
  if (query.trim()) {
    searchQuery = searchQuery.textSearch('name', query, {
      type: 'websearch',
      config: 'english'
    });
  }

  return await searchQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
}

async function searchOrganizations(supabase: any, query: string, offset: number, limit: number) {
  let searchQuery = supabase
    .from('orgs')
    .select(`
      id,
      name,
      slug,
      description,
      logo_url,
      website_url,
      is_verified,
      created_at
    `)
    .eq('is_active', true);

  // Full-text search
  if (query.trim()) {
    searchQuery = searchQuery.textSearch('name', query, {
      type: 'websearch',
      config: 'english'
    });
  }

  return await searchQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
}

async function searchCategories(supabase: any, query: string, offset: number, limit: number) {
  let searchQuery = supabase
    .from('event_categories')
    .select(`
      id,
      name,
      slug,
      description,
      icon_url,
      color_hex,
      sort_order
    `)
    .eq('is_active', true);

  // Full-text search
  if (query.trim()) {
    searchQuery = searchQuery.textSearch('name', query, {
      type: 'websearch',
      config: 'english'
    });
  }

  return await searchQuery
    .order('sort_order', { ascending: true })
    .range(offset, offset + limit - 1);
}

async function searchTags(supabase: any, query: string, offset: number, limit: number) {
  let searchQuery = supabase
    .from('event_tags')
    .select(`
      id,
      name,
      slug,
      description,
      color_hex,
      usage_count
    `);

  // Full-text search
  if (query.trim()) {
    searchQuery = searchQuery.textSearch('name', query, {
      type: 'websearch',
      config: 'english'
    });
  }

  return await searchQuery
    .order('usage_count', { ascending: false })
    .range(offset, offset + limit - 1);
}

async function logSearch(supabase: any, userId: string, query: string, types: string[], resultCount: number, searchTime: number) {
  try {
    await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        query: query.toLowerCase(),
        search_type: types.join(','),
        results_count: resultCount,
        search_duration_ms: searchTime,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log search:', error);
    // Don't fail the search if logging fails
  }
}
