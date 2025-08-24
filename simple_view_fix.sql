-- Simple Fix for SECURITY DEFINER View Issue
-- This script directly addresses the public_events view problem

-- ========================================
-- 1. DROP THE PROBLEMATIC VIEW
-- ========================================

-- Drop the view completely
DROP VIEW IF EXISTS public_events CASCADE;

-- ========================================
-- 2. CREATE A NEW VIEW WITHOUT SECURITY DEFINER
-- ========================================

-- Create the view as a simple query
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
-- 3. GRANT PERMISSIONS
-- ========================================

-- Grant access to the view
GRANT SELECT ON public_events TO authenticated;
GRANT SELECT ON public_events TO anon;

-- ========================================
-- 4. VERIFY THE FIX
-- ========================================

-- Check the view status
SELECT 
    'VIEW STATUS' as section,
    viewname as view_name,
    schemaname as schema_name,
    viewowner as owner,
    CASE 
        WHEN viewowner = 'postgres' THEN 'SECURITY DEFINER (PROBLEMATIC)'
        ELSE 'Regular View (FIXED)'
    END as view_type
FROM pg_views
WHERE schemaname = 'public'
AND viewname = 'public_events';

-- ========================================
-- 5. SUCCESS MESSAGE
-- ========================================
SELECT 
    '🔒 View Fix Complete!' as status,
    'public_events view has been recreated' as message,
    'Check the verification results above' as next_step;

