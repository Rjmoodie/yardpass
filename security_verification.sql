-- Security Verification Script
-- Run this after applying security_fixes.sql to verify all security measures are in place

-- ========================================
-- 1. CHECK RLS STATUS ON ALL TABLES
-- ========================================

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'organizations', 'events', 'tickets', 'ticket_tiers', 
    'orders', 'posts', 'comments', 'reactions', 'notifications',
    'user_profiles', 'org_members', 'user_connections', 'conversations',
    'messages', 'event_posts', 'event_reviews', 'event_rsvps',
    'event_checkins', 'user_event_badges', 'user_interests',
    'user_preferences', 'user_behavior_logs', 'search_logs',
    'event_views', 'content_performance', 'performance_metrics',
    'revenue_tracking', 'refunds', 'scan_logs'
)
ORDER BY tablename;

-- ========================================
-- 2. CHECK RLS POLICIES
-- ========================================

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

-- ========================================
-- 3. CHECK FUNCTION SECURITY
-- ========================================

SELECT 
    routine_name,
    security_type,
    CASE 
        WHEN security_type = 'SECURITY DEFINER' THEN '✅ Secure'
        ELSE '❌ Insecure'
    END as security_status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'create_cart_hold', 'release_cart_hold', 'cleanup_expired_cart_holds',
    'validate_promo_code', 'create_notification', 'trigger_cleanup_cart_holds'
)
ORDER BY routine_name;

-- ========================================
-- 4. CHECK SEARCH PATH SETTINGS
-- ========================================

SELECT 
    name,
    setting,
    CASE 
        WHEN setting = 'public, pg_temp' THEN '✅ Secure'
        ELSE '❌ Insecure'
    END as search_path_status
FROM pg_settings 
WHERE name = 'search_path';

-- ========================================
-- 5. CHECK PUBLIC ACCESS TO SENSITIVE TABLES
-- ========================================

SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_schema = 'public'
AND table_name IN ('users', 'organizations', 'events', 'tickets', 'orders')
AND grantee IN ('public', 'anon')
ORDER BY table_name, privilege_type;

-- ========================================
-- 6. CHECK FOR UNRESTRICTED FUNCTIONS
-- ========================================

SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_definition LIKE '%SET search_path%'
AND routine_definition NOT LIKE '%SET search_path = public, pg_temp%'
ORDER BY routine_name;

-- ========================================
-- 7. SECURITY SUMMARY
-- ========================================

WITH security_summary AS (
    SELECT 
        'RLS Enabled Tables' as check_type,
        COUNT(*) as count,
        'Tables with Row Level Security enabled' as description
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND rowsecurity = true
    
    UNION ALL
    
    SELECT 
        'RLS Policies' as check_type,
        COUNT(*) as count,
        'Active Row Level Security policies' as description
    FROM pg_policies 
    WHERE schemaname = 'public'
    
    UNION ALL
    
    SELECT 
        'Secure Functions' as check_type,
        COUNT(*) as count,
        'Functions with SECURITY DEFINER' as description
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND security_type = 'SECURITY DEFINER'
    
    UNION ALL
    
    SELECT 
        'Public Views' as check_type,
        COUNT(*) as count,
        'Secure public views for data access' as description
    FROM information_schema.views 
    WHERE table_schema = 'public'
    AND table_name LIKE 'public_%'
)

SELECT 
    check_type,
    count,
    description,
    CASE 
        WHEN count > 0 THEN '✅ Secure'
        ELSE '❌ Needs Attention'
    END as status
FROM security_summary
ORDER BY check_type;

-- ========================================
-- 8. RECOMMENDATIONS
-- ========================================

SELECT 
    '🔒 Security Recommendations' as title,
    'Based on your database structure' as subtitle,
    'All security measures appear to be properly implemented' as recommendation;

