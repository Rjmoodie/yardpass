-- Fix Smart Services Schema Issues
-- Run this in Supabase SQL Editor

-- 1. Add missing query_length column to search_analytics
ALTER TABLE public.search_analytics 
ADD COLUMN IF NOT EXISTS query_length INTEGER NOT NULL DEFAULT 0;

-- 2. Update existing records to have query_length
UPDATE public.search_analytics 
SET query_length = LENGTH(query) 
WHERE query_length = 0;

-- 3. Ensure event_categories table exists in public schema (not reference)
CREATE TABLE IF NOT EXISTS public.event_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    color_hex VARCHAR(7),
    parent_id UUID REFERENCES public.event_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Ensure event_tags table exists in public schema
CREATE TABLE IF NOT EXISTS public.event_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    is_trending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Add category_id column to events table if it doesn't exist
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.event_categories(id);

-- 6. Create nearby_events function for PostGIS spatial queries
CREATE OR REPLACE FUNCTION nearby_events(
    lat_param DOUBLE PRECISION,
    lng_param DOUBLE PRECISION,
    radius_param DOUBLE PRECISION
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(200),
    description TEXT,
    city VARCHAR(100),
    venue VARCHAR(200),
    location GEOGRAPHY,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.city,
        e.venue,
        e.location,
        e.start_at,
        e.end_at,
        ST_Distance(
            e.location::geography,
            ST_SetSRID(ST_MakePoint(lng_param, lat_param), 4326)::geography
        ) as distance_meters
    FROM public.events e
    WHERE e.location IS NOT NULL
    AND ST_DWithin(
        e.location::geography,
        ST_SetSRID(ST_MakePoint(lng_param, lat_param), 4326)::geography,
        radius_param
    )
    AND e.status = 'published'
    AND e.visibility = 'public'
    ORDER BY distance_meters;
END;
$$;

-- 7. Ensure search_suggestions table exists
CREATE TABLE IF NOT EXISTS public.search_suggestions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    query TEXT NOT NULL,
    suggestion_type VARCHAR(20) NOT NULL CHECK (suggestion_type IN ('trending', 'popular', 'related')),
    target_id UUID,
    target_type VARCHAR(20),
    relevance_score DECIMAL(3,2) DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Add unique constraint to search_suggestions if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'search_suggestions_query_type_unique'
    ) THEN
        ALTER TABLE public.search_suggestions 
        ADD CONSTRAINT search_suggestions_query_type_unique 
        UNIQUE (query, suggestion_type);
    END IF;
END $$;

-- 9. Enable RLS on new tables
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tags ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for public read access
DROP POLICY IF EXISTS "Event Categories: public read" ON public.event_categories;
CREATE POLICY "Event Categories: public read" ON public.event_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Event Tags: public read" ON public.event_tags;
CREATE POLICY "Event Tags: public read" ON public.event_tags
    FOR SELECT USING (true);

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_category_id ON public.events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_tags ON public.events USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON public.search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON public.search_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_type ON public.search_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_usage ON public.search_suggestions(usage_count DESC);

-- 12. Verify the fixes
SELECT 'Schema fixes completed successfully!' as status;
