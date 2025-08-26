-- Check Functions Across All Schemas in YardPass Database
-- Run this to see what functions exist in all schemas

-- ========================================
-- 1. CHECK ALL SCHEMAS IN THE DATABASE
-- ========================================

SELECT 
    'ALL SCHEMAS' as section,
    nspname as schema_name,
    nspowner::regrole as owner,
    CASE 
        WHEN nspname IN ('information_schema', 'pg_catalog', 'pg_toast') THEN 'System Schema'
        WHEN nspname = 'auth' THEN 'Auth Schema'
        WHEN nspname = 'public' THEN 'Public Schema'
        WHEN nspname = 'storage' THEN 'Storage Schema'
        WHEN nspname LIKE 'pg_%' THEN 'PostgreSQL Schema'
        ELSE 'Custom Schema'
    END as schema_type
FROM pg_namespace
ORDER BY 
    CASE 
        WHEN nspname IN ('information_schema', 'pg_catalog', 'pg_toast') THEN 1
        WHEN nspname = 'auth' THEN 2
        WHEN nspname = 'public' THEN 3
        WHEN nspname = 'storage' THEN 4
        ELSE 5
    END,
    nspname;

-- ========================================
-- 2. CHECK FUNCTIONS IN PUBLIC SCHEMA
-- ========================================

SELECT 
    'PUBLIC SCHEMA FUNCTIONS' as section,
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type,
    CASE 
        WHEN prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type,
    CASE 
        WHEN prosrc LIKE '%search_path%' THEN 'Has search_path'
        ELSE 'No search_path'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY proname;

-- ========================================
-- 3. CHECK FUNCTIONS IN AUTH SCHEMA
-- ========================================

SELECT 
    'AUTH SCHEMA FUNCTIONS' as section,
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type,
    CASE 
        WHEN prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type,
    CASE 
        WHEN prosrc LIKE '%search_path%' THEN 'Has search_path'
        ELSE 'No search_path'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'auth'
ORDER BY proname;

-- ========================================
-- 4. CHECK FUNCTIONS IN STORAGE SCHEMA
-- ========================================

SELECT 
    'STORAGE SCHEMA FUNCTIONS' as section,
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type,
    CASE 
        WHEN prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type,
    CASE 
        WHEN prosrc LIKE '%search_path%' THEN 'Has search_path'
        ELSE 'No search_path'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'storage'
ORDER BY proname;

-- ========================================
-- 5. CHECK ALL SECURITY DEFINER FUNCTIONS
-- ========================================

SELECT 
    'ALL SECURITY DEFINER FUNCTIONS' as section,
    n.nspname as schema_name,
    proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    CASE 
        WHEN prosrc LIKE '%search_path%' THEN 'Has search_path'
        ELSE 'MISSING search_path'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE prosecdef = true
AND n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY n.nspname, proname;

-- ========================================
-- 6. CHECK PROBLEMATIC FUNCTIONS (SECURITY DEFINER WITHOUT SEARCH_PATH)
-- ========================================

SELECT 
    'PROBLEMATIC FUNCTIONS' as section,
    n.nspname as schema_name,
    proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE prosecdef = true
AND prosrc NOT LIKE '%search_path%'
AND n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY n.nspname, proname;

-- ========================================
-- 7. CHECK VIEWS ACROSS ALL SCHEMAS
-- ========================================

SELECT 
    'ALL VIEWS' as section,
    schemaname as schema_name,
    viewname as view_name,
    CASE 
        WHEN viewowner = 'postgres' THEN 'SECURITY DEFINER'
        ELSE 'Regular View'
    END as view_type
FROM pg_views
WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY schemaname, viewname;

-- ========================================
-- 8. SUMMARY BY SCHEMA
-- ========================================

SELECT 
    'SUMMARY BY SCHEMA' as section,
    n.nspname as schema_name,
    COUNT(*) as total_functions,
    COUNT(CASE WHEN prosecdef THEN 1 END) as security_definer_functions,
    COUNT(CASE WHEN prosecdef AND prosrc NOT LIKE '%search_path%' THEN 1 END) as functions_needing_fix
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
GROUP BY n.nspname
ORDER BY 
    CASE 
        WHEN n.nspname = 'auth' THEN 1
        WHEN n.nspname = 'public' THEN 2
        WHEN n.nspname = 'storage' THEN 3
        ELSE 4
    END,
    n.nspname;

