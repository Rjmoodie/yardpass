-- Alternative Approach to Fix SECURITY DEFINER View Issue
-- Since the view keeps being created as SECURITY DEFINER, let's try a different strategy

-- ========================================
-- 1. CHECK WHY THE VIEW IS SECURITY DEFINER
-- ========================================

SELECT 
    'DIAGNOSTIC INFO' as section,
    viewname as view_name,
    schemaname as schema_name,
    viewowner as owner,
    CASE 
        WHEN viewowner = 'postgres' THEN 'Created by postgres user (SECURITY DEFINER)'
        ELSE 'Created by regular user (OK)'
    END as explanation
FROM pg_views
WHERE schemaname = 'public'
AND viewname = 'public_events';

-- ========================================
-- 2. ALTERNATIVE APPROACH: USE A FUNCTION INSTEAD
-- ========================================

-- Drop the problematic view
DROP VIEW IF EXISTS public_events CASCADE;

-- Create a function that returns the same data
CREATE OR REPLACE FUNCTION get_public_events()
RETURNS TABLE(
    id UUID,
    slug TEXT,
    title TEXT,
    description TEXT,
    city TEXT,
    venue TEXT,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    visibility TEXT,
    status TEXT,
    category TEXT,
    cover_image_url TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.slug,
        e.title,
        e.description,
        e.city,
        e.venue,
        e.start_at,
        e.end_at,
        e.visibility,
        e.status,
        e.category,
        e.cover_image_url,
        e.created_at
    FROM events e
    WHERE e.visibility = 'public' AND e.status = 'published';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_public_events() TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_events() TO anon;

-- ========================================
-- 3. CREATE A SIMPLE VIEW WITH EXPLICIT OWNER
-- ========================================

-- Try creating the view with explicit schema references
CREATE OR REPLACE VIEW public_events AS
SELECT 
    e.id,
    e.slug,
    e.title,
    e.description,
    e.city,
    e.venue,
    e.start_at,
    e.end_at,
    e.visibility,
    e.status,
    e.category,
    e.cover_image_url,
    e.created_at
FROM public.events e
WHERE e.visibility = 'public' AND e.status = 'published';

-- Grant permissions
GRANT SELECT ON public_events TO authenticated;
GRANT SELECT ON public_events TO anon;

-- ========================================
-- 4. VERIFY BOTH APPROACHES
-- ========================================

-- Check the view status
SELECT 
    'VIEW STATUS' as section,
    viewname as view_name,
    schemaname as schema_name,
    viewowner as owner,
    CASE 
        WHEN viewowner = 'postgres' THEN 'SECURITY DEFINER (STILL PROBLEMATIC)'
        ELSE 'Regular View (FIXED)'
    END as view_type
FROM pg_views
WHERE schemaname = 'public'
AND viewname = 'public_events';

-- Check the function status
SELECT 
    'FUNCTION STATUS' as section,
    proname as function_name,
    CASE 
        WHEN prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname = 'get_public_events';

-- ========================================
-- 5. TEST BOTH APPROACHES
-- ========================================

-- Test the function
SELECT 
    'FUNCTION TEST' as section,
    COUNT(*) as event_count
FROM get_public_events();

-- Test the view (if it exists and is accessible)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_views 
        WHERE schemaname = 'public' 
        AND viewname = 'public_events'
        AND viewowner != 'postgres'
    ) THEN
        RAISE NOTICE 'View is accessible and not SECURITY DEFINER';
    ELSE
        RAISE NOTICE 'View is still SECURITY DEFINER or not accessible';
    END IF;
END $$;

-- ========================================
-- 6. RECOMMENDATION
-- ========================================
SELECT 
    'RECOMMENDATION' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_views 
            WHERE schemaname = 'public' 
            AND viewname = 'public_events'
            AND viewowner != 'postgres'
        ) THEN 'Use the view: SELECT * FROM public_events'
        ELSE 'Use the function: SELECT * FROM get_public_events()'
    END as recommended_approach;

-- ========================================
-- 7. SUCCESS MESSAGE
-- ========================================
SELECT 
    '🔒 Alternative Fix Complete!' as status,
    'Created both view and function approaches' as message,
    'Check recommendations above for best approach' as next_step;

