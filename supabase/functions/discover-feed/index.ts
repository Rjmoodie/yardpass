import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('YARDPASS_SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('YARDPASS_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Extract user from JWT token
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse query parameters
    const url = new URL(req.url)
    const lat = parseFloat(url.searchParams.get('lat') || '0')
    const lng = parseFloat(url.searchParams.get('lng') || '0')
    const radiusKm = parseFloat(url.searchParams.get('radius_km') || '50')
    const categories = url.searchParams.get('categories')?.split(',') || []
    const dateRange = url.searchParams.get('date_range') || 'upcoming'
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build the base query
    let query = supabase
      .from('events')
      .select(`
        *,
        ticket_tiers!inner(
          id,
          name,
          price_cents,
          currency,
          available_quantity,
          is_active
        ),
        organizations!inner(
          id,
          name,
          slug,
          verification_status
        ),
        user_event_badges!inner(
          badge_kind,
          access_level
        )
      `)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .gte('start_at', new Date().toISOString())
      .order('start_at', { ascending: true })

    // Add category filter if specified
    if (categories.length > 0) {
      query = query.in('category', categories)
    }

    // Add date range filter
    if (dateRange === 'today') {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      query = query.gte('start_at', today.toISOString())
      query = query.lt('start_at', tomorrow.toISOString())
    } else if (dateRange === 'week') {
      const today = new Date()
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      query = query.gte('start_at', today.toISOString())
      query = query.lt('start_at', nextWeek.toISOString())
    } else if (dateRange === 'month') {
      const today = new Date()
      const nextMonth = new Date(today)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      query = query.gte('start_at', today.toISOString())
      query = query.lt('start_at', nextMonth.toISOString())
    }

    // Add location-based filtering if coordinates provided
    if (lat !== 0 && lng !== 0) {
      // For now, we'll use a simple bounding box approach
      // In production, you'd use PostGIS for proper geo queries
      const latRange = radiusKm / 111 // Rough conversion to degrees
      const lngRange = radiusKm / (111 * Math.cos(lat * Math.PI / 180))
      
      query = query.gte('latitude', lat - latRange)
      query = query.lte('latitude', lat + latRange)
      query = query.gte('longitude', lng - lngRange)
      query = query.lte('longitude', lng + lngRange)
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1)

    const { data: events, error: eventsError } = await query

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch events' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user interests for personalization
    const { data: userInterests } = await supabase
      .from('user_interests')
      .select('category, interest_score')
      .eq('user_id', user.id)
      .order('interest_score', { ascending: false })

    // Get user's friends (for social proof)
    const { data: userFriends } = await supabase
      .from('user_connections')
      .select('connected_user_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted')

    // Process and rank events
    const processedEvents = events?.map(event => {
      // Calculate from price
      const activeTiers = event.ticket_tiers?.filter(tier => tier.is_active && tier.available_quantity > 0) || []
      const fromPrice = activeTiers.length > 0 ? Math.min(...activeTiers.map(tier => tier.price_cents)) : null

      // Calculate distance if coordinates provided
      let distance = null
      if (lat !== 0 && lng !== 0 && event.latitude && event.longitude) {
        distance = calculateDistance(lat, lng, event.latitude, event.longitude)
      }

      // Calculate social proof score
      const socialScore = calculateSocialScore(event, userFriends)

      // Calculate interest match score
      const interestScore = calculateInterestScore(event, userInterests)

      // Calculate trending score (based on views, tickets sold, etc.)
      const trendingScore = calculateTrendingScore(event)

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
        from_price_cents: fromPrice,
        from_price_currency: fromPrice ? activeTiers.find(tier => tier.price_cents === fromPrice)?.currency : null,
        distance_km: distance,
        organization: {
          id: event.organizations.id,
          name: event.organizations.name,
          slug: event.organizations.slug,
          verification_status: event.organizations.verification_status
        },
        user_badge: event.user_event_badges?.[0] || null,
        social_score: socialScore,
        interest_score: interestScore,
        trending_score: trendingScore,
        total_score: (socialScore + interestScore + trendingScore) / 3
      }
    }) || []

    // Sort by total score (personalization)
    processedEvents.sort((a, b) => b.total_score - a.total_score)

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('visibility', 'public')
      .gte('start_at', new Date().toISOString())

    return new Response(
      JSON.stringify({
        events: processedEvents,
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          total_pages: Math.ceil((totalCount || 0) / limit)
        },
        filters: {
          lat,
          lng,
          radius_km: radiusKm,
          categories,
          date_range: dateRange
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Discover feed error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Helper function to calculate social proof score
function calculateSocialScore(event: any, userFriends: any[]): number {
  if (!userFriends || userFriends.length === 0) return 0.5

  // In a real implementation, you'd check if friends are attending
  // For now, we'll use a simple random score based on event popularity
  const baseScore = 0.3
  const friendMultiplier = Math.min(userFriends.length * 0.1, 0.7)
  return Math.min(baseScore + friendMultiplier, 1.0)
}

// Helper function to calculate interest match score
function calculateInterestScore(event: any, userInterests: any[]): number {
  if (!userInterests || userInterests.length === 0) return 0.5

  const matchingInterest = userInterests.find(interest => 
    interest.category.toLowerCase() === event.category.toLowerCase()
  )

  if (matchingInterest) {
    return Math.min(matchingInterest.interest_score, 1.0)
  }

  return 0.3 // Default score for non-matching interests
}

// Helper function to calculate trending score
function calculateTrendingScore(event: any): number {
  // In a real implementation, you'd calculate this based on:
  // - Recent views
  // - Ticket sales velocity
  // - Social media mentions
  // - Time until event (closer events get higher scores)
  
  const now = new Date()
  const eventDate = new Date(event.start_at)
  const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  
  // Closer events get higher scores
  const timeScore = Math.max(0.1, 1.0 - (daysUntilEvent / 30))
  
  // Random trending factor (replace with real metrics)
  const trendingFactor = 0.5 + Math.random() * 0.5
  
  return (timeScore + trendingFactor) / 2
}
