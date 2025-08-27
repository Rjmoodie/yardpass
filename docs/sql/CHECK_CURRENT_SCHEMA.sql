-- Check Current Database Schema for YardPass
-- This script will show us what already exists so we can fix the debug script

-- Check existing extensions
SELECT 'EXTENSIONS' as check_type, extname as name, extversion as version
FROM pg_extension 
WHERE extname IN ('pg_trgm', 'postgis', 'uuid-ossp');

-- Check existing tables
SELECT 'TABLES' as check_type, table_name as name, table_schema as schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('events', 'orgs', 'users', 'posts', 'search_cache', 'search_logs', 'search_suggestions');

-- Check existing functions
SELECT 'FUNCTIONS' as check_type, proname as name, prosrc as source
FROM pg_proc 
WHERE proname IN (
    'enhanced_search_v2',
    'get_search_suggestions', 
    'get_trending_searches',
    'get_search_facets',
    'calculate_search_relevance_v2',
    'log_search_analytics_v2',
    'get_related_searches'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check existing indexes
SELECT 'INDEXES' as check_type, indexname as name, tablename as table_name
FROM pg_indexes 
WHERE schemaname = 'public' 
AND (
    indexname LIKE '%search%' 
    OR indexname LIKE '%events%' 
    OR indexname LIKE '%title%'
    OR indexname LIKE '%description%'
    OR indexname LIKE '%fts%'
    OR indexname LIKE '%trgm%'
);

-- Check if events table has data
SELECT 'EVENTS_DATA' as check_type, COUNT(*) as event_count
FROM public.events;

-- Check events table structure
SELECT 'EVENTS_STRUCTURE' as check_type, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'events'
ORDER BY ordinal_position;

-- Check for any existing search-related tables
SELECT 'SEARCH_TABLES' as check_type, table_name, table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%search%';

-- Check for any existing search-related functions
SELECT 'SEARCH_FUNCTIONS' as check_type, proname as function_name
FROM pg_proc 
WHERE proname LIKE '%search%'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
