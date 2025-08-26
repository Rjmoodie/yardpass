-- Check Auth Schema in Supabase
-- Run this to see what's in your auth schema and auth.users table

-- ========================================
-- 1. CHECK AUTH SCHEMA TABLES
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
-- 2. CHECK AUTH.USERS TABLE STRUCTURE
-- ========================================

-- Show detailed structure of auth.users table
SELECT 
    'auth.users table structure' as section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- ========================================
-- 3. CHECK AUTH.USERS SAMPLE DATA
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
    aud,
    role,
    confirmation_token,
    confirmation_sent_at,
    confirmed_at,
    last_sign_in_with_password,
    banned_until,
    phone,
    phone_confirmed_at
FROM auth.users
LIMIT 5;

-- ========================================
-- 4. CHECK AUTH.USERS COUNT
-- ========================================

-- Count total users in auth.users
SELECT 
    'auth.users count' as section,
    COUNT(*) as total_users
FROM auth.users;

-- ========================================
-- 5. CHECK AUTH.USERS BY STATUS
-- ========================================

-- Count users by confirmation status
SELECT 
    'auth.users by confirmation status' as section,
    CASE 
        WHEN confirmed_at IS NOT NULL THEN 'confirmed'
        WHEN confirmation_sent_at IS NOT NULL THEN 'pending_confirmation'
        ELSE 'not_confirmed'
    END as status,
    COUNT(*) as user_count
FROM auth.users
GROUP BY 
    CASE 
        WHEN confirmed_at IS NOT NULL THEN 'confirmed'
        WHEN confirmation_sent_at IS NOT NULL THEN 'pending_confirmation'
        ELSE 'not_confirmed'
    END;

-- ========================================
-- 6. CHECK AUTH.USERS BY ROLE
-- ========================================

-- Count users by role
SELECT 
    'auth.users by role' as section,
    COALESCE(role, 'no_role') as role,
    COUNT(*) as user_count
FROM auth.users
GROUP BY role
ORDER BY user_count DESC;

-- ========================================
-- 7. CHECK AUTH.USERS RECENT ACTIVITY
-- ========================================

-- Show recent user activity
SELECT 
    'auth.users recent activity' as section,
    COUNT(*) as users_created_last_30_days
FROM auth.users
WHERE created_at >= NOW() - INTERVAL '30 days';

SELECT 
    'auth.users recent activity' as section,
    COUNT(*) as users_signed_in_last_7_days
FROM auth.users
WHERE last_sign_in_at >= NOW() - INTERVAL '7 days';

-- ========================================
-- 8. CHECK AUTH SCHEMA VIEWS
-- ========================================

-- List all views in auth schema
SELECT 
    'auth schema views' as section,
    table_name as view_name,
    'exists' as status
FROM information_schema.views 
WHERE table_schema = 'auth'
ORDER BY table_name;

-- ========================================
-- 9. CHECK AUTH SCHEMA FUNCTIONS
-- ========================================

-- List all functions in auth schema
SELECT 
    'auth schema functions' as section,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'auth'
ORDER BY p.proname;

-- ========================================
-- 10. SUMMARY
-- ========================================

SELECT 
    'Summary' as section,
    'Auth Schema Check Complete' as message,
    'Review the output above to understand your auth data structure' as next_step;

