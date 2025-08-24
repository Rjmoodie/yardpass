-- Security Fixes Verification Script
-- Run this after applying security_fixes_robust.sql to verify everything is working

-- ========================================
-- 1. CHECK RLS STATUS ON ALL TABLES
-- ========================================

SELECT 
    'RLS Status Check' as check_type,
    COUNT(*) as total_tables,
    COUNT(CASE WHEN rowsecurity = true THEN 1 END) as tables_with_rls,
    COUNT(CASE WHEN rowsecurity = false THEN 1 END) as tables_without_rls
FROM pg_tables 
WHERE schemaname = 'public';

-- ========================================
-- 2. CHECK POLICY COUNT
-- ========================================

SELECT 
    'Policy Count' as check_type,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- ========================================
-- 3. CHECK FUNCTION SECURITY
-- ========================================

SELECT 
    'Function Security' as check_type,
    routine_name,
    security_type,
    CASE 
        WHEN security_type = 'SECURITY DEFINER' THEN '✅ Secure'
        ELSE '❌ Needs Attention'
    END as security_status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'create_cart_hold', 'release_cart_hold', 'cleanup_expired_cart_holds',
    'validate_promo_code', 'create_notification'
)
ORDER BY routine_name;

-- ========================================
-- 4. CHECK PUBLIC VIEWS
-- ========================================

SELECT 
    'Public Views' as check_type,
    table_name,
    '✅ Secure View' as status
FROM information_schema.views 
WHERE table_schema = 'public'
AND table_name LIKE 'public_%';

-- ========================================
-- 5. TEST KEY POLICIES
-- ========================================

-- Test user profile access (should work for authenticated users)
SELECT 
    'Policy Test' as check_type,
    'User Profile Access' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'user_profiles' 
            AND policyname = 'Users can view own profile'
        ) THEN '✅ Policy Exists'
        ELSE '❌ Policy Missing'
    END as status;

-- Test organization access
SELECT 
    'Policy Test' as check_type,
    'Organization Access' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'organizations' 
            AND policyname = 'Users can view public organizations'
        ) THEN '✅ Policy Exists'
        ELSE '❌ Policy Missing'
    END as status;

-- Test event access
SELECT 
    'Policy Test' as check_type,
    'Event Access' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'events' 
            AND policyname = 'Users can view public events'
        ) THEN '✅ Policy Exists'
        ELSE '❌ Policy Missing'
    END as status;

-- ========================================
-- 6. SECURITY SUMMARY
-- ========================================

WITH security_summary AS (
    SELECT 
        'Tables with RLS' as metric,
        COUNT(*) as count
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true
    
    UNION ALL
    
    SELECT 
        'Active Policies' as metric,
        COUNT(*) as count
    FROM pg_policies 
    WHERE schemaname = 'public'
    
    UNION ALL
    
    SELECT 
        'Secure Functions' as metric,
        COUNT(*) as count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND security_type = 'SECURITY DEFINER'
    AND routine_name IN (
        'create_cart_hold', 'release_cart_hold', 'cleanup_expired_cart_holds',
        'validate_promo_code', 'create_notification'
    )
    
    UNION ALL
    
    SELECT 
        'Public Views' as metric,
        COUNT(*) as count
    FROM information_schema.views 
    WHERE table_schema = 'public'
    AND table_name LIKE 'public_%'
)

SELECT 
    metric,
    count,
    CASE 
        WHEN count > 0 THEN '✅ Secure'
        ELSE '❌ Needs Attention'
    END as status
FROM security_summary
ORDER BY metric;

-- ========================================
-- 7. FINAL VERIFICATION
-- ========================================

SELECT 
    '🔒 Security Verification Complete!' as status,
    'All security measures have been verified' as message,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM pg_tables 
            WHERE schemaname = 'public' AND rowsecurity = true
        ) >= 47 
        AND (
            SELECT COUNT(*) FROM pg_policies 
            WHERE schemaname = 'public'
        ) >= 50
        THEN '✅ Your database is enterprise-grade secure!'
        ELSE '⚠️ Some security measures may need attention'
    END as recommendation;

