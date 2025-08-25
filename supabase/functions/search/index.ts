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

    // Parse query parameters
    const url = new URL(req.url);
    const query = url.searchParams.get('q') || '';
    const types = url.searchParams.get('types')?.split(',') || ['events', 'organizations', 'venues'];
    const lat = parseFloat(url.searchParams.get('lat') || '0');
    const lng = parseFloat(url.searchParams.get('lng') || '0');
    const radiusKm = parseFloat(url.searchParams.get('radius_km') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!query.trim()) {
      return new Response(JSON.stringify({
        error: 'Search query is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const results = {
      events: [],
      organizations: [],
      venues: [],
      highlights: []
    };

    // Search events
    if (types.includes('events')) {
      const { data: events, error: eventsError } = await searchEvents(supabaseClient, query, lat, lng, radiusKm, offset, limit);
      if (!eventsError && events) {
        results.events = events;
      }
    }

    // Search organizations
    if (types.includes('organizations')) {
      const { data: organizations, error: orgsError } = await searchOrganizations(supabaseClient, query, offset, limit);
      if (!orgsError && organizations) {
        results.organizations = organizations;
      }
    }

    // Search venues
    if (types.includes('venues')) {
      const { data: venues, error: venuesError } = await searchVenues(supabaseClient, query, lat, lng, radiusKm, offset, limit);
      if (!venuesError && venues) {
        results.venues = venues;
      }
    }

    // Generate search highlights
    results.highlights = generateHighlights(query, results);

    // Log search for analytics
    await logSearch(supabaseClient, user.id, query, types, lat, lng, radiusKm);

    return new Response(JSON.stringify({
      query,
      results,
      pagination: {
        page,
        limit,
        total: results.events.length + results.organizations.length + results.venues.length
      },
      filters: {
        types,
        lat,
        lng,
        radius_km: radiusKm
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Search error:', error);
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

async function searchEvents(supabase, query, lat, lng, radiusKm, offset, limit) {
  // Build search query with text search
  let searchQuery = supabase
    .from('events')
    .select(`
      *,
      ticket_tiers(
        id,
        name,
        price,
        currency,
        max_quantity,
        sold_quantity,
        status
      ),
      organizations!events_owner_context_id_fkey(
        id,
        name,
        slug,
        logo_url
      )
    `)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .gte('start_at', new Date().toISOString())
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,venue.ilike.%${query}%,city.ilike.%${query}%,category.ilike.%${query}%`)
    .order('start_at', { ascending: true });

  // Add location filter if coordinates provided
  if (lat !== 0 && lng !== 0) {
    const latRange = radiusKm / 111;
    const lngRange = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
    searchQuery = searchQuery.gte('latitude', lat - latRange);
    searchQuery = searchQuery.lte('latitude', lat + latRange);
    searchQuery = searchQuery.gte('longitude', lng - lngRange);
    searchQuery = searchQuery.lte('longitude', lng + lngRange);
  }

  // Add pagination
  searchQuery = searchQuery.range(offset, offset + limit - 1);

  const { data: events, error } = await searchQuery;

  if (error) {
    console.error('Error searching events:', error);
    return { data: null, error };
  }

  // Process events with highlights and scoring
  const processedEvents = events?.map((event) => {
    const activeTiers = event.ticket_tiers?.filter((tier) => tier.status === 'active' && tier.sold_quantity < tier.max_quantity) || [];
    const fromPrice = activeTiers.length > 0 ? Math.min(...activeTiers.map((tier) => tier.price)) : null;

    let distance = null;
    if (lat !== 0 && lng !== 0 && event.latitude && event.longitude) {
      distance = calculateDistance(lat, lng, event.latitude, event.longitude);
    }

    // Calculate relevance score
    const relevanceScore = calculateEventRelevance(event, query);

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      slug: event.slug,
      start_at: event.start_at,
      end_at: event.end_at,
      venue: event.venue,
      address: event.address,
      city: event.city,
      state: event.state,
      country: event.country,
      cover_image_url: event.cover_image_url,
      category: event.category,
      from_price: fromPrice,
      from_price_currency: fromPrice ? activeTiers.find((tier) => tier.price === fromPrice)?.currency : null,
      distance_km: distance,
      organization: event.organizations ? {
        id: event.organizations.id,
        name: event.organizations.name,
        slug: event.organizations.slug,
        logo_url: event.organizations.logo_url
      } : null,
      relevance_score: relevanceScore,
      highlights: generateEventHighlights(event, query)
    };
  }) || [];

  // Sort by relevance score
  processedEvents.sort((a, b) => b.relevance_score - a.relevance_score);

  return { data: processedEvents, error: null };
}

async function searchOrganizations(supabase, query, offset, limit) {
  const { data: organizations, error } = await supabase
    .from('orgs')
    .select('*')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error searching organizations:', error);
    return { data: null, error };
  }

  const processedOrgs = organizations?.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    description: org.description,
    logo_url: org.logo_url,
    relevance_score: calculateOrgRelevance(org, query),
    highlights: generateOrgHighlights(org, query)
  })) || [];

  processedOrgs.sort((a, b) => b.relevance_score - a.relevance_score);

  return { data: processedOrgs, error: null };
}

async function searchVenues(supabase, query, lat, lng, radiusKm, offset, limit) {
  // For now, we'll search venues within events
  // In a real implementation, you'd have a separate venues table
  const { data: events, error } = await supabase
    .from('events')
    .select('venue, address, city, state, country, latitude, longitude')
    .not('venue', 'is', null)
    .or(`venue.ilike.%${query}%,address.ilike.%${query}%,city.ilike.%${query}%`)
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error searching venues:', error);
    return { data: null, error };
  }

  // Deduplicate venues
  const venueMap = new Map();
  events?.forEach((event) => {
    const venueKey = `${event.venue}-${event.city}`;
    if (!venueMap.has(venueKey)) {
      let distance = null;
      if (lat !== 0 && lng !== 0 && event.latitude && event.longitude) {
        distance = calculateDistance(lat, lng, event.latitude, event.longitude);
      }

      venueMap.set(venueKey, {
        name: event.venue,
        address: event.address,
        city: event.city,
        state: event.state,
        country: event.country,
        latitude: event.latitude,
        longitude: event.longitude,
        distance_km: distance,
        relevance_score: calculateVenueRelevance(event, query),
        highlights: generateVenueHighlights(event, query)
      });
    }
  });

  const venues = Array.from(venueMap.values());
  venues.sort((a, b) => b.relevance_score - a.relevance_score);

  return { data: venues, error: null };
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateEventRelevance(event, query) {
  const queryLower = query.toLowerCase();
  let score = 0;

  // Title match (highest weight)
  if (event.title.toLowerCase().includes(queryLower)) score += 10;
  
  // Category match
  if (event.category.toLowerCase().includes(queryLower)) score += 8;
  
  // Venue match
  if (event.venue?.toLowerCase().includes(queryLower)) score += 6;
  
  // City match
  if (event.city?.toLowerCase().includes(queryLower)) score += 5;
  
  // Description match
  if (event.description?.toLowerCase().includes(queryLower)) score += 3;

  // Time proximity (closer events get higher scores)
  const now = new Date();
  const eventDate = new Date(event.start_at);
  const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const timeScore = Math.max(0, 5 - daysUntilEvent / 7); // Max 5 points for events within a week

  return score + timeScore;
}

function calculateOrgRelevance(org, query) {
  const queryLower = query.toLowerCase();
  let score = 0;
  if (org.name.toLowerCase().includes(queryLower)) score += 10;
  if (org.description?.toLowerCase().includes(queryLower)) score += 5;
  return score;
}

function calculateVenueRelevance(venue, query) {
  const queryLower = query.toLowerCase();
  let score = 0;
  if (venue.venue?.toLowerCase().includes(queryLower)) score += 10;
  if (venue.city?.toLowerCase().includes(queryLower)) score += 8;
  if (venue.address?.toLowerCase().includes(queryLower)) score += 5;
  return score;
}

function generateEventHighlights(event, query) {
  const highlights = [];
  const queryLower = query.toLowerCase();
  
  if (event.title.toLowerCase().includes(queryLower)) {
    highlights.push(`**${event.title}**`);
  }
  if (event.venue?.toLowerCase().includes(queryLower)) {
    highlights.push(`Venue: ${event.venue}`);
  }
  if (event.category.toLowerCase().includes(queryLower)) {
    highlights.push(`Category: ${event.category}`);
  }
  
  return highlights;
}

function generateOrgHighlights(org, query) {
  const highlights = [];
  const queryLower = query.toLowerCase();
  
  if (org.name.toLowerCase().includes(queryLower)) {
    highlights.push(`**${org.name}**`);
  }
  
  return highlights;
}

function generateVenueHighlights(venue, query) {
  const highlights = [];
  const queryLower = query.toLowerCase();
  
  if (venue.venue?.toLowerCase().includes(queryLower)) {
    highlights.push(`**${venue.venue}**`);
  }
  if (venue.city?.toLowerCase().includes(queryLower)) {
    highlights.push(`Location: ${venue.city}`);
  }
  
  return highlights;
}

function generateHighlights(query, results) {
  const highlights = [];
  const queryLower = query.toLowerCase();
  
  // Add event highlights
  results.events.slice(0, 3).forEach((event) => {
    if (event.title.toLowerCase().includes(queryLower)) {
      highlights.push(`Event: ${event.title}`);
    }
  });
  
  // Add organization highlights
  results.organizations.slice(0, 2).forEach((org) => {
    if (org.name.toLowerCase().includes(queryLower)) {
      highlights.push(`Organization: ${org.name}`);
    }
  });
  
  return highlights;
}

async function logSearch(supabaseClient, userId, query, types, lat, lng, radiusKm) {
  try {
    await supabaseClient
      .from('user_behavior_logs')
      .insert({
        user_id: userId,
        behavior_type: 'search',
        behavior_data: {
          query,
          search_types: types,
          location_lat: lat || null,
          location_lng: lng || null,
          radius_km: radiusKm,
          results_count: 0
        }
      });
  } catch (error) {
    console.error('Failed to log search:', error);
  }
}
