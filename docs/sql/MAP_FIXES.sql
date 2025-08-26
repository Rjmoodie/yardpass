-- ========================================
-- MAP FIXES - RESOLVE FUNCTION OVERLOADING
-- Fix the get_public_events function conflicts
-- ========================================

-- ========================================
-- 1. CLEAN UP ALL EXISTING FUNCTIONS
-- ========================================

-- Drop all existing get_public_events functions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_public_events() CASCADE;
DROP FUNCTION IF EXISTS public.get_public_events(TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_public_events(INTEGER, INTEGER, TEXT, TEXT) CASCADE;

-- Drop problematic views
DROP VIEW IF EXISTS public.public_events CASCADE;
DROP VIEW IF EXISTS public.events_with_details CASCADE;

-- ========================================
-- 2. CREATE SINGLE, CLEAR FUNCTION
-- ========================================

-- Create a single, clear function for getting public events
CREATE OR REPLACE FUNCTION public.get_public_events(
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0,
    category_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    slug TEXT,
    venue TEXT,
    city TEXT,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    visibility TEXT,
    status TEXT,
    category TEXT,
    cover_image_url TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    organizer_name TEXT,
    organizer_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.slug,
        e.venue,
        e.city,
        e.start_at,
        e.end_at,
        e.visibility,
        e.status,
        e.category,
        e.cover_image_url,
        e.latitude,
        e.longitude,
        e.created_at,
        COALESCE(o.name, 'Individual Organizer') as organizer_name,
        COALESCE(o.is_verified, false) as organizer_verified
    FROM public.events e
    LEFT JOIN public.organizations o ON e.organizer_id = o.id
    WHERE e.visibility = 'public' 
    AND e.status = 'published'
    AND e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
    AND (
        category_filter IS NULL 
        OR e.category = category_filter
    )
    AND (
        search_query IS NULL 
        OR search_query = ''
        OR e.title ILIKE '%' || search_query || '%'
        OR e.description ILIKE '%' || search_query || '%'
        OR e.venue ILIKE '%' || search_query || '%'
        OR e.city ILIKE '%' || search_query || '%'
    )
    ORDER BY e.start_at ASC
    LIMIT limit_count OFFSET offset_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_public_events(INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_events(INTEGER, INTEGER, TEXT, TEXT) TO anon;

-- ========================================
-- 3. CREATE SEARCH FUNCTION WITH DIFFERENT NAME
-- ========================================

-- Create a separate search function to avoid conflicts
CREATE OR REPLACE FUNCTION public.search_public_events(
    search_term TEXT DEFAULT '',
    category_filter TEXT DEFAULT NULL,
    location_filter TEXT DEFAULT NULL,
    date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    short_description TEXT,
    category TEXT,
    city TEXT,
    venue TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    cover_image TEXT,
    price_range JSONB,
    currency TEXT,
    capacity INTEGER,
    waitlist_enabled BOOLEAN,
    organizer_name TEXT,
    organizer_verified BOOLEAN,
    total_views BIGINT,
    total_likes BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.short_description,
        e.category,
        e.city,
        e.venue,
        e.start_date,
        e.end_date,
        e.cover_image,
        e.price_range,
        e.currency,
        e.capacity,
        e.waitlist_enabled,
        COALESCE(o.name, 'Individual Organizer') as organizer_name,
        COALESCE(o.is_verified, false) as organizer_verified,
        COALESCE(stats.total_views, 0) as total_views,
        COALESCE(stats.total_likes, 0) as total_likes
    FROM events e
    LEFT JOIN organizations o ON e.organizer_id = o.id
    LEFT JOIN public_event_stats stats ON e.id = stats.event_id
    WHERE e.visibility = 'public' 
    AND e.status = 'published' 
    AND e.is_active = true
    AND (
        search_term = '' 
        OR e.title ILIKE '%' || search_term || '%'
        OR e.description ILIKE '%' || search_term || '%'
        OR e.tags::text ILIKE '%' || search_term || '%'
    )
    AND (
        category_filter IS NULL 
        OR e.category = category_filter
    )
    AND (
        location_filter IS NULL 
        OR e.city ILIKE '%' || location_filter || '%'
    )
    AND (
        date_from IS NULL 
        OR e.start_date >= date_from
    )
    AND (
        date_to IS NULL 
        OR e.start_date <= date_to
    )
    ORDER BY e.is_featured DESC, e.start_date ASC
    LIMIT limit_count OFFSET offset_count;
END;
$$;

-- Grant access to search function
GRANT EXECUTE ON FUNCTION public.search_public_events(TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_events(TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER, INTEGER) TO anon;

-- ========================================
-- 4. CREATE RECOMMENDATIONS FUNCTION
-- ========================================

-- Create recommendations function
CREATE OR REPLACE FUNCTION public.get_public_event_recommendations(
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    city TEXT,
    venue TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    cover_image TEXT,
    price_range JSONB,
    organizer_name TEXT,
    organizer_verified BOOLEAN,
    total_views BIGINT,
    total_likes BIGINT,
    recommendation_score NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.category,
        e.city,
        e.venue,
        e.start_date,
        e.cover_image,
        e.price_range,
        COALESCE(o.name, 'Individual Organizer') as organizer_name,
        COALESCE(o.is_verified, false) as organizer_verified,
        COALESCE(stats.total_views, 0) as total_views,
        COALESCE(stats.total_likes, 0) as total_likes,
        (
            COALESCE(stats.total_views, 0) * 0.3 +
            COALESCE(stats.total_likes, 0) * 0.5 +
            CASE WHEN e.is_featured THEN 100 ELSE 0 END +
            CASE WHEN o.is_verified THEN 50 ELSE 0 END
        ) as recommendation_score
    FROM events e
    LEFT JOIN organizations o ON e.organizer_id = o.id
    LEFT JOIN public_event_stats stats ON e.id = stats.event_id
    WHERE e.visibility = 'public' 
    AND e.status = 'published' 
    AND e.is_active = true
    AND e.start_date > NOW()
    ORDER BY recommendation_score DESC, e.start_date ASC
    LIMIT limit_count;
END;
$$;

-- Grant access to recommendations function
GRANT EXECUTE ON FUNCTION public.get_public_event_recommendations(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_event_recommendations(INTEGER) TO anon;

-- ========================================
-- 5. ENSURE PROPER RLS POLICIES
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Users can view their own events" ON events;

-- Create simple public access policy
CREATE POLICY "Public events are viewable by everyone" 
ON events 
FOR SELECT 
USING (
    visibility = 'public' AND 
    status = 'published'
);

CREATE POLICY "Users can view their own events" 
ON events 
FOR SELECT 
USING (organizer_id = auth.uid());

-- ========================================
-- 6. CREATE PUBLIC EVENTS STATS VIEW
-- ========================================

-- Create public event stats view if it doesn't exist
CREATE OR REPLACE VIEW public_event_stats AS
SELECT 
    event_id,
    COUNT(DISTINCT user_id) as total_views,
    COUNT(DISTINCT CASE WHEN action = 'like' THEN user_id END) as total_likes,
    COUNT(DISTINCT CASE WHEN action = 'share' THEN user_id END) as total_shares
FROM event_analytics
WHERE event_id IN (SELECT id FROM events WHERE visibility = 'public')
GROUP BY event_id;

-- Grant access to stats view
GRANT SELECT ON public_event_stats TO authenticated;
GRANT SELECT ON public_event_stats TO anon;

-- ========================================
-- 7. VERIFICATION QUERIES
-- ========================================

-- Test the main function
SELECT 'Testing get_public_events function...' as test;
SELECT COUNT(*) as public_events_count FROM public.get_public_events(10, 0, NULL, NULL);

-- Test search function
SELECT 'Testing search_public_events function...' as test;
SELECT COUNT(*) as search_results FROM public.search_public_events('', NULL, NULL, NULL, NULL, 10, 0);

-- Test recommendations function
SELECT 'Testing get_public_event_recommendations function...' as test;
SELECT COUNT(*) as recommendations_count FROM public.get_public_event_recommendations(5);

-- Show function signatures
SELECT 'Available function signatures:' as info;
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname LIKE '%public_events%'
ORDER BY p.proname;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT '✅ MAP FIXES COMPLETED SUCCESSFULLY!' as status,
       'Function overloading conflicts resolved:' as details,
       '- Single get_public_events function created' as fix1,
       '- Separate search_public_events function' as fix2,
       '- Separate get_public_event_recommendations function' as fix3,
       '- Proper RLS policies in place' as fix4,
       '- Public event stats view created' as fix5,
       'Map should now work without function conflicts!' as result;
