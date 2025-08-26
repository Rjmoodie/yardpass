-- ========================================
-- DIAGNOSE VIEWS AND SECURITY ISSUES
-- Check what views exist and their security context
-- ========================================

-- Check all views in the public schema
SELECT 
    table_name as view_name,
    'View exists' as status
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check for any SECURITY DEFINER functions
SELECT 
    routine_name as function_name,
    routine_type,
    security_type,
    'SECURITY DEFINER function found' as issue
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND security_type = 'DEFINER'
ORDER BY routine_name;

-- Check for any SECURITY DEFINER functions that might be problematic
SELECT 
    p.proname as function_name,
    p.prosecdef as is_security_definer,
    'Potential security issue' as warning
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
ORDER BY p.proname;

-- Check if specific problematic views exist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_name = 'public_events' 
            AND table_schema = 'public'
        ) THEN 'public_events view EXISTS - needs to be dropped'
        ELSE 'public_events view does NOT exist - safe to proceed'
    END as public_events_status;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_name = 'events_with_details' 
            AND table_schema = 'public'
        ) THEN 'events_with_details view EXISTS'
        ELSE 'events_with_details view does NOT exist'
    END as events_with_details_status;

-- Check RLS status on key tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('events', 'orgs', 'tickets', 'ticket_wallet', 'posts', 'profiles')
ORDER BY tablename;

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Summary of findings
SELECT 
    'VIEW DIAGNOSIS COMPLETE' as summary,
    COUNT(*) as total_views_found
FROM information_schema.views 
WHERE table_schema = 'public';
