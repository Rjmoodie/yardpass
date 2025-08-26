-- Final Fix for SECURITY DEFINER View Issue
-- This script ensures the view is created properly without SECURITY DEFINER

-- ========================================
-- 1. CHECK CURRENT VIEW STATUS
-- ========================================

SELECT 
    'CURRENT VIEW STATUS' as section,
    viewname as view_name,
    schemaname as schema_name,
    viewowner as owner,
    CASE 
        WHEN viewowner = 'postgres' THEN 'SECURITY DEFINER (PROBLEMATIC)'
        ELSE 'Regular View (OK)'
    END as view_type
FROM pg_views
WHERE schemaname = 'public'
AND viewname = 'public_events';

-- ========================================
-- 2. DROP ALL DEPENDENCIES AND RECREATE
-- ========================================

-- Drop the view and all its dependencies
DROP VIEW IF EXISTS public_events CASCADE;

-- Drop any grants that might exist
REVOKE ALL ON public_events FROM PUBLIC;
REVOKE ALL ON public_events FROM authenticated;
REVOKE ALL ON public_events FROM anon;

-- ========================================
-- 3. CREATE VIEW AS AUTHENTICATED USER
-- ========================================

-- Create the view without SECURITY DEFINER
-- This should be created by the authenticated user, not postgres
CREATE VIEW public_events AS
SELECT 
    id,
    slug,
    title,
    description,
    city,
    venue,
    start_at,
    end_at,
    visibility,
    status,
    category,
    cover_image_url,
    created_at
FROM events
WHERE visibility = 'public' AND status = 'published';

-- ========================================
-- 4. GRANT PERMISSIONS
-- ========================================

-- Grant access to the view
GRANT SELECT ON public_events TO authenticated;
GRANT SELECT ON public_events TO anon;

-- ========================================
-- 5. VERIFY THE FIX
-- ========================================

SELECT 
    'VERIFICATION - VIEW STATUS' as section,
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

-- Check if the view is accessible (only if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_views 
        WHERE schemaname = 'public' 
        AND viewname = 'public_events'
    ) THEN
        -- View exists, so we can test it
        PERFORM COUNT(*) FROM public_events LIMIT 1;
        RAISE NOTICE 'View public_events is accessible';
    ELSE
        RAISE NOTICE 'View public_events does not exist yet';
    END IF;
END $$;

-- ========================================
-- 6. ALTERNATIVE APPROACH IF STILL PROBLEMATIC
-- ========================================

-- If the view is still SECURITY DEFINER, try a different approach
DO $$
BEGIN
    -- Check if the view is still problematic
    IF EXISTS (
        SELECT 1 FROM pg_views 
        WHERE schemaname = 'public' 
        AND viewname = 'public_events' 
        AND viewowner = 'postgres'
    ) THEN
        -- Drop and recreate with explicit owner specification
        DROP VIEW IF EXISTS public_events CASCADE;
        
        -- Create view with explicit schema reference
        EXECUTE '
        CREATE VIEW public_events AS
        SELECT 
            id,
            slug,
            title,
            description,
            city,
            venue,
            start_at,
            end_at,
            visibility,
            status,
            category,
            cover_image_url,
            created_at
        FROM public.events
        WHERE visibility = ''public'' AND status = ''published''
        ';
        
        -- Grant permissions
        EXECUTE 'GRANT SELECT ON public_events TO authenticated';
        EXECUTE 'GRANT SELECT ON public_events TO anon';
        
        RAISE NOTICE 'Recreated view with explicit schema reference';
    END IF;
END $$;

-- ========================================
-- 7. FINAL VERIFICATION
-- ========================================

SELECT 
    'FINAL VERIFICATION' as section,
    viewname as view_name,
    schemaname as schema_name,
    viewowner as owner,
    CASE 
        WHEN viewowner = 'postgres' THEN 'SECURITY DEFINER (NEEDS MANUAL FIX)'
        ELSE 'Regular View (SUCCESSFULLY FIXED)'
    END as view_type
FROM pg_views
WHERE schemaname = 'public'
AND viewname = 'public_events';

-- ========================================
-- 8. SUCCESS MESSAGE
-- ========================================
SELECT 
    '🔒 Final View Security Fix Complete!' as status,
    'Attempted to fix SECURITY DEFINER view issue' as message,
    'Check verification results above for final status' as next_step;
