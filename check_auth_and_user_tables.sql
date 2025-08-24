-- Check Auth and User Tables in Supabase
-- Run this to see what's in your auth.users table and user-related tables

-- ========================================
-- 1. CHECK AUTH.USERS TABLE STRUCTURE
-- ========================================

SELECT 
    'auth.users table structure' as section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- ========================================
-- 2. CHECK AUTH.USERS SAMPLE DATA (if accessible)
-- ========================================

-- Try to get a sample of auth.users data
-- Note: This might be restricted by RLS policies
SELECT 
    'auth.users sample data' as section,
    id,
    email,
    created_at,
    updated_at,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    encrypted_password,
    email_change,
    email_change_token_new,
    email_change_confirm_status,
    recovery_sent_at,
    recovery_token,
    recovery_token_generated_at,
    email_change_sent_at,
    email_change_token_current,
    email_change_confirm_status_old,
    aud,
    role,
    confirmation_token,
    confirmation_sent_at,
    confirmed_at,
    last_sign_in_with_password,
    email_change_token_new_created_at,
    email_change_confirm_status_new,
    banned_until,
    reauthentication_sent_at,
    reauthentication_token,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    confirmation_token_created_at,
    email_change_token_current_created_at,
    recovery_token_created_at,
    email_change_token_new_created_at_old,
    phone_change_token_created_at,
    reauthentication_token_created_at
FROM auth.users
LIMIT 5;

-- ========================================
-- 3. CHECK PUBLIC USER-RELATED TABLES
-- ========================================

-- Check if user_profiles table exists and its structure
SELECT 
    'user_profiles table structure' as section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check if user_profiles has data
SELECT 
    'user_profiles sample data' as section,
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
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_behavior_logs'
ORDER BY ordinal_position;

-- Check user_preferences
SELECT 
    'user_preferences structure' as section,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_preferences'
ORDER BY ordinal_position;

-- Check user_interests
SELECT 
    'user_interests structure' as section,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_interests'
ORDER BY ordinal_position;

-- Check user_connections
SELECT 
    'user_connections structure' as section,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_connections'
ORDER BY ordinal_position;

-- Check user_recommendations
SELECT 
    'user_recommendations structure' as section,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_recommendations'
ORDER BY ordinal_position;

-- ========================================
-- 5. CHECK TABLE EXISTENCE
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
-- 6. CHECK AUTH SCHEMA TABLES
-- ========================================

-- List all tables in auth schema
SELECT 
    'auth schema tables' as section,
    table_name,
    'exists' as status
FROM information_schema.tables 
WHERE table_schema = 'auth'
ORDER BY table_name;

-- ========================================
-- 7. CHECK USER DATA COUNTS
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
-- 8. CHECK AUTH.USERS COUNT
-- ========================================

-- Count total users in auth.users
SELECT 
    'auth.users count' as section,
    COUNT(*) as total_users
FROM auth.users;

-- ========================================
-- 9. SUMMARY
-- ========================================

SELECT 
    'Summary' as section,
    'Auth and User Tables Check Complete' as message,
    'Review the output above to understand your user data structure' as next_step;

