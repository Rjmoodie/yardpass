-- Check Existing Functions in YardPass Database
-- Run this to see what functions currently exist before making changes

-- ========================================
-- 1. CHECK ALL FUNCTIONS IN PUBLIC SCHEMA
-- ========================================

SELECT 
    'ALL PUBLIC FUNCTIONS' as section,
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
-- 2. CHECK FUNCTIONS WITH SECURITY DEFINER
-- ========================================

SELECT 
    'SECURITY DEFINER FUNCTIONS' as section,
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type,
    CASE 
        WHEN prosrc LIKE '%search_path%' THEN 'Has search_path'
        ELSE 'MISSING search_path'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND prosecdef = true
ORDER BY proname;

-- ========================================
-- 3. CHECK FUNCTIONS WITHOUT SEARCH_PATH
-- ========================================

SELECT 
    'FUNCTIONS WITHOUT SEARCH_PATH' as section,
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type,
    CASE 
        WHEN prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND prosecdef = true
AND prosrc NOT LIKE '%search_path%'
ORDER BY proname;

-- ========================================
-- 4. CHECK SPECIFIC FUNCTIONS WE WANT TO FIX
-- ========================================

SELECT 
    'TARGET FUNCTIONS TO FIX' as section,
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type,
    CASE 
        WHEN prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type,
    CASE 
        WHEN prosrc LIKE '%search_path%' THEN 'Has search_path'
        ELSE 'MISSING search_path'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND prosecdef = true
AND proname IN (
    'generate_ticket_qr_code',
    'validate_ticket_qr_code',
    'process_ticket_scan',
    'create_ticket_transfer',
    'accept_ticket_transfer',
    'update_order_total',
    'cleanup_expired_transfers',
    'trigger_cleanup_cart_holds',
    'is_org_role',
    'has_verified_payout_account',
    'update_badge_cache',
    'update_verification_status',
    'update_promo_usage',
    'update_tier_availability',
    'update_user_interest',
    'log_event_view',
    'remove_post_reaction',
    'update_post_engagement',
    'create_cart_hold',
    'release_cart_hold',
    'cleanup_expired_cart_holds',
    'validate_promo_code',
    'create_notification'
)
ORDER BY proname;

-- ========================================
-- 5. CHECK VIEWS
-- ========================================

SELECT 
    'EXISTING VIEWS' as section,
    viewname as view_name,
    schemaname as schema_name,
    CASE 
        WHEN viewowner = 'postgres' THEN 'SECURITY DEFINER'
        ELSE 'Regular View'
    END as view_type
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- ========================================
-- 6. SUMMARY
-- ========================================

SELECT 
    'SUMMARY' as section,
    COUNT(*) as total_functions,
    COUNT(CASE WHEN prosecdef THEN 1 END) as security_definer_functions,
    COUNT(CASE WHEN prosecdef AND prosrc NOT LIKE '%search_path%' THEN 1 END) as functions_needing_fix
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

