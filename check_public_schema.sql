-- Check Public Schema in Supabase
-- Run this to see what's in your public schema and user-related tables

-- ========================================
-- 1. CHECK ALL PUBLIC SCHEMA TABLES
-- ========================================

-- List all tables in public schema
SELECT 
    'public schema tables' as section,
    table_name,
    'exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ========================================
-- 2. CHECK USER-RELATED TABLES
-- ========================================

-- List all tables that start with 'user_'
SELECT 
    'user-related tables' as section,
    table_name,
    'exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'user_%'
ORDER BY table_name;

-- ========================================
-- 3. CHECK USER_PROFILES TABLE
-- ========================================

-- Check if user_profiles table exists and its structure
SELECT 
    'user_profiles table structure' as section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check if user_profiles has data
SELECT 
    'user_profiles data count' as section,
    COUNT(*) as total_records
FROM public.user_profiles;

-- Show sample user_profiles data
SELECT 
    'user_profiles sample data' as section,
    id,
    user_id,
    first_name,
    last_name,
    avatar_url,
    bio,
    location,
    website,
    created_at,
    updated_at
FROM public.user_profiles
LIMIT 5;

-- ========================================
-- 4. CHECK OTHER USER-RELATED TABLES
-- ========================================

-- Check user_behavior_logs
SELECT 
    'user_behavior_logs structure' as section,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_behavior_logs'
ORDER BY ordinal_position;

-- Check user_preferences
SELECT 
    'user_preferences structure' as section,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_preferences'
ORDER BY ordinal_position;

-- Check user_interests
SELECT 
    'user_interests structure' as section,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_interests'
ORDER BY ordinal_position;

-- Check user_connections
SELECT 
    'user_connections structure' as section,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_connections'
ORDER BY ordinal_position;

-- Check user_recommendations
SELECT 
    'user_recommendations structure' as section,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_recommendations'
ORDER BY ordinal_position;

-- ========================================
-- 5. CHECK USER DATA COUNTS
-- ========================================

-- Count records in user-related tables
SELECT 
    'user data counts' as section,
    'user_profiles' as table_name,
    COUNT(*) as record_count
FROM public.user_profiles
UNION ALL
SELECT 
    'user data counts' as section,
    'user_behavior_logs' as table_name,
    COUNT(*) as record_count
FROM public.user_behavior_logs
UNION ALL
SELECT 
    'user data counts' as section,
    'user_preferences' as table_name,
    COUNT(*) as record_count
FROM public.user_preferences
UNION ALL
SELECT 
    'user data counts' as section,
    'user_interests' as table_name,
    COUNT(*) as record_count
FROM public.user_interests
UNION ALL
SELECT 
    'user data counts' as section,
    'user_connections' as table_name,
    COUNT(*) as record_count
FROM public.user_connections
UNION ALL
SELECT 
    'user data counts' as section,
    'user_recommendations' as table_name,
    COUNT(*) as record_count
FROM public.user_recommendations;

-- ========================================
-- 6. CHECK ORGANIZATION TABLES
-- ========================================

-- Check organizations table
SELECT 
    'organizations structure' as section,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'organizations'
ORDER BY ordinal_position;

-- Check org_members table
SELECT 
    'org_members structure' as section,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'org_members'
ORDER BY ordinal_position;

-- ========================================
-- 7. CHECK EVENT TABLES
-- ========================================

-- Check events table
SELECT 
    'events structure' as section,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'events'
ORDER BY ordinal_position;

-- Check event-related tables
SELECT 
    'event-related tables' as section,
    table_name,
    'exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'event_%'
ORDER BY table_name;

-- ========================================
-- 8. CHECK TICKET TABLES
-- ========================================

-- Check ticket-related tables
SELECT 
    'ticket-related tables' as section,
    table_name,
    'exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'ticket_%'
ORDER BY table_name;

-- ========================================
-- 9. CHECK ORDER TABLES
-- ========================================

-- Check order-related tables
SELECT 
    'order-related tables' as section,
    table_name,
    'exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%order%'
ORDER BY table_name;

-- ========================================
-- 10. CHECK POST TABLES
-- ========================================

-- Check post-related tables
SELECT 
    'post-related tables' as section,
    table_name,
    'exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%post%'
ORDER BY table_name;

-- ========================================
-- 11. CHECK PAYMENT TABLES
-- ========================================

-- Check payment-related tables
SELECT 
    'payment-related tables' as section,
    table_name,
    'exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%stripe%'
ORDER BY table_name;

-- ========================================
-- 12. CHECK PUBLIC SCHEMA VIEWS
-- ========================================

-- List all views in public schema
SELECT 
    'public schema views' as section,
    table_name as view_name,
    'exists' as status
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ========================================
-- 13. CHECK PUBLIC SCHEMA FUNCTIONS
-- ========================================

-- List all functions in public schema
SELECT 
    'public schema functions' as section,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- ========================================
-- 14. CHECK RLS POLICIES
-- ========================================

-- List all RLS policies
SELECT 
    'RLS policies' as section,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- 15. SUMMARY
-- ========================================

SELECT 
    'Summary' as section,
    'Public Schema Check Complete' as message,
    'Review the output above to understand your public schema structure' as next_step;

