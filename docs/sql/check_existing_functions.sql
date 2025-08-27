-- Check Existing Search Functions in Detail
-- This will show us the structure of your existing functions

-- Check the structure of existing search functions
SELECT 
    'FUNCTION_DETAILS' as check_type,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    p.prosrc as source_code
FROM pg_proc p
WHERE p.proname IN (
    'cache_search_results',
    'get_cached_search_results', 
    'search_public_events'
)
AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check if any of our target functions already exist
SELECT 
    'TARGET_FUNCTIONS' as check_type,
    p.proname as function_name,
    CASE 
        WHEN p.proname IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
FROM (
    SELECT unnest(ARRAY[
        'enhanced_search_v2',
        'get_search_suggestions',
        'get_trending_searches', 
        'get_search_facets',
        'calculate_search_relevance_v2',
        'log_search_analytics_v2',
        'get_related_searches'
    ]) as proname
) target_functions
LEFT JOIN pg_proc p ON p.proname = target_functions.proname 
    AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check what tables are available for search
SELECT 
    'SEARCH_TABLES' as check_type,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('events', 'search_cache', 'search_logs')
ORDER BY table_name, ordinal_position;

-- Check existing indexes on events table
SELECT 
    'EVENTS_INDEXES' as check_type,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'events'
ORDER BY indexname;

