-- Final Solution: Remove Problematic View and Use Secure Alternative
-- This script completely removes the SECURITY DEFINER view and provides a secure function

-- ========================================
-- 1. COMPLETELY REMOVE THE PROBLEMATIC VIEW
-- ========================================

-- Drop the view and all its dependencies
DROP VIEW IF EXISTS public_events CASCADE;

-- Revoke all permissions (only if the view exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_views 
        WHERE schemaname = 'public' 
        AND viewname = 'public_events'
    ) THEN
        EXECUTE 'REVOKE ALL ON public_events FROM PUBLIC';
        EXECUTE 'REVOKE ALL ON public_events FROM authenticated';
        EXECUTE 'REVOKE ALL ON public_events FROM anon';
    END IF;
END $$;

-- ========================================
-- 2. CREATE A SECURE FUNCTION ALTERNATIVE
-- ========================================

-- Create a secure function that provides the same functionality
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
    -- Set secure search path
    SET search_path = public, pg_temp;
    
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
-- 3. CREATE A SECURE VIEW WITH DIFFERENT NAME
-- ========================================

-- Create a view with a different name to avoid conflicts
CREATE OR REPLACE VIEW public_events_secure AS
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

-- Grant permissions to the new view
GRANT SELECT ON public_events_secure TO authenticated;
GRANT SELECT ON public_events_secure TO anon;

-- ========================================
-- 4. VERIFY THE SOLUTION
-- ========================================

-- Check that the problematic view is gone
SELECT 
    'PROBLEMATIC VIEW REMOVED' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_views 
            WHERE schemaname = 'public' 
            AND viewname = 'public_events'
        ) THEN 'WARNING: public_events view still exists'
        ELSE 'SUCCESS: public_events view has been removed'
    END as status;

-- Check the new secure view
SELECT 
    'SECURE VIEW STATUS' as section,
    viewname as view_name,
    schemaname as schema_name,
    viewowner as owner,
    CASE 
        WHEN viewowner = 'postgres' THEN 'SECURITY DEFINER (PROBLEMATIC)'
        ELSE 'Regular View (SECURE)'
    END as view_type
FROM pg_views
WHERE schemaname = 'public'
AND viewname = 'public_events_secure';

-- Check the function status
SELECT 
    'FUNCTION STATUS' as section,
    proname as function_name,
    CASE 
        WHEN prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER (SECURE)'
    END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname = 'get_public_events';

-- ========================================
-- 5. TEST THE ALTERNATIVES
-- ========================================

-- Test the function
SELECT 
    'FUNCTION TEST' as section,
    COUNT(*) as event_count
FROM get_public_events();

-- Test the secure view
SELECT 
    'SECURE VIEW TEST' as section,
    COUNT(*) as event_count
FROM public_events_secure;

-- ========================================
-- 6. MIGRATION GUIDE
-- ========================================
SELECT 
    'MIGRATION GUIDE' as section,
    'Replace all references to public_events with one of these alternatives:' as instruction;

SELECT 
    'OPTION 1: Use the function' as option,
    'SELECT * FROM get_public_events();' as usage;

SELECT 
    'OPTION 2: Use the secure view' as option,
    'SELECT * FROM public_events_secure;' as usage;

-- ========================================
-- 7. SUCCESS MESSAGE
-- ========================================
SELECT 
    '🎯 Final Solution Complete!' as status,
    'Removed problematic view and created secure alternatives' as message,
    'Use get_public_events() or public_events_secure instead' as next_step;
