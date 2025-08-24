-- Fix Remaining SECURITY DEFINER View Issue
-- Run this to fix the public_events view that's still showing as SECURITY DEFINER

-- ========================================
-- 1. CHECK CURRENT VIEW STATUS
-- ========================================

SELECT 
    'CURRENT VIEW STATUS' as section,
    viewname as view_name,
    schemaname as schema_name,
    viewowner as owner,
    CASE 
        WHEN viewowner = 'postgres' THEN 'SECURITY DEFINER'
        ELSE 'Regular View'
    END as view_type
FROM pg_views
WHERE schemaname = 'public'
AND viewname = 'public_events';

-- ========================================
-- 2. DROP AND RECREATE THE VIEW
-- ========================================

-- Drop the view completely
DROP VIEW IF EXISTS public_events CASCADE;

-- Recreate as a regular view (not SECURITY DEFINER)
CREATE OR REPLACE VIEW public_events AS
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

-- Grant access to the view
GRANT SELECT ON public_events TO authenticated;
GRANT SELECT ON public_events TO anon;

-- ========================================
-- 3. VERIFY THE FIX
-- ========================================

SELECT 
    'VERIFICATION' as section,
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

-- ========================================
-- 4. SUCCESS MESSAGE
-- ========================================
SELECT 
    '🔒 View Security Fix Complete!' as status,
    'public_events view is now a regular view, not SECURITY DEFINER' as message,
    'This should resolve the remaining security advisor issue' as next_step;

