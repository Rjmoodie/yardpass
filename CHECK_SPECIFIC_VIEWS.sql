-- ========================================
-- CHECK SPECIFIC VIEWS AND THEIR SECURITY CONTEXT
-- Identify the 2 views that exist and their security issues
-- ========================================

-- Get detailed information about the 2 existing views
SELECT 
    table_name as view_name,
    table_type,
    'View details' as info_type
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check the view definitions to understand their structure
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- Check if these views have any security context issues
SELECT 
    v.table_name as view_name,
    CASE 
        WHEN v.table_name IN ('public_events', 'events_with_details') THEN 'Potentially problematic view'
        ELSE 'Standard view'
    END as security_assessment
FROM information_schema.views v
WHERE v.table_schema = 'public'
ORDER BY v.table_name;

-- Check if any functions reference these views
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) LIKE '%public_events%'
   OR pg_get_functiondef(p.oid) LIKE '%events_with_details%'
ORDER BY p.proname;

-- Check RLS policies that might reference these views
SELECT 
    schemaname,
    tablename,
    policyname,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
AND (qual LIKE '%public_events%' OR qual LIKE '%events_with_details%')
ORDER BY tablename, policyname;

-- Summary of what needs to be done
SELECT 
    'ANALYSIS COMPLETE' as status,
    'Found 2 views that need security review' as message,
    'Check output above for specific view names and security context' as next_step;
