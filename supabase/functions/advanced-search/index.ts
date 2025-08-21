import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdvancedSearchFilters {
  query?: string;
  categories?: string[];
  cities?: string[];
  themes?: string[];
  date_range?: { start: string; end: string; };
  price_range?: { min: number; max: number; };
  access_level?: 'general' | 'vip' | 'crew';
  organization_verified?: boolean;
}

interface SearchOptions {
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'date' | 'price' | 'popularity';
  fuzzy?: boolean;
  include_facets?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with fallback values
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://jysyzpgbrretxsvjvqmp.supabase.co'
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { filters, options }: { filters: AdvancedSearchFilters; options: SearchOptions } = await req.json()

    const { limit = 20, offset = 0, sort = 'relevance' } = options

    // Build the base query
    let query = supabase
      .from('events')
      .select(`
        *,
        orgs(name, slug, verified),
        ticket_tiers(id, name, price, quantity_available, quantity_sold)
      `, { count: 'exact' })
      .eq('status', 'published')
      .eq('visibility', 'public')

    // Apply filters
    if (filters.query) {
      query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%,city.ilike.%${filters.query}%,category.ilike.%${filters.query}%`)
    }

    if (filters.categories && filters.categories.length > 0) {
      query = query.in('category', filters.categories)
    }

    if (filters.cities && filters.cities.length > 0) {
      query = query.in('city', filters.cities)
    }

    if (filters.date_range) {
      query = query
        .gte('start_at', filters.date_range.start)
        .lte('start_at', filters.date_range.end)
    }

    if (filters.organization_verified) {
      query = query.eq('orgs.verified', true)
    }

    // Apply sorting
    switch (sort) {
      case 'date':
        query = query.order('start_at', { ascending: true })
        break
      case 'price':
        // Note: Price sorting would need to be handled differently since ticket_tiers.price doesn't exist
        // For now, fall back to date sorting
        query = query.order('start_at', { ascending: true })
        break
      case 'popularity':
        query = query.order('created_at', { ascending: false })
        break
      default: // relevance
        query = query.order('start_at', { ascending: true })
    }

    // Execute query
    const { data: events, error, count } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database query error:', error)
      throw error
    }

    // Calculate facets if requested
    let facets = undefined
    if (options.include_facets) {
      try {
        const [categoryFacets, cityFacets] = await Promise.all([
          supabase
            .from('events')
            .select('category')
            .eq('status', 'published')
            .eq('visibility', 'public')
            .not('category', 'is', null),
          supabase
            .from('events')
            .select('city')
            .eq('status', 'published')
            .eq('visibility', 'public')
            .not('city', 'is', null)
        ])

        // Process facets
        const categoryCounts = categoryFacets.data?.reduce((acc, event) => {
          acc[event.category] = (acc[event.category] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}

        const cityCounts = cityFacets.data?.reduce((acc, event) => {
          acc[event.city] = (acc[event.city] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}

        facets = {
          categories: Object.entries(categoryCounts).map(([name, count]) => ({ name, count })),
          cities: Object.entries(cityCounts).map(([name, count]) => ({ name, count }))
        }
      } catch (facetError) {
        console.error('Facet calculation error:', facetError)
        // Continue without facets if there's an error
      }
    }

    // Get search suggestions
    const suggestions = filters.query ? await getSearchSuggestions(supabase, filters.query) : []

    const result = {
      events: events || [],
      total_count: count || 0,
      filtered_count: events?.length || 0,
      suggestions,
      facets,
      search_metadata: {
        query: filters.query,
        sort,
        fuzzy_enabled: options.fuzzy || false,
        execution_time: Date.now()
      }
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Advanced search error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function getSearchSuggestions(supabase: any, query: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('search_suggestions')
      .select('query')
      .ilike('query', `%${query}%`)
      .order('usage_count', { ascending: false })
      .limit(5)

    return data?.map(s => s.query) || []
  } catch (error) {
    console.error('Error getting search suggestions:', error)
    return []
  }
}
