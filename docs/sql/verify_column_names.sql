-- Verify Column Names Before Applying Security Policies
-- Run this first to check what columns actually exist in your tables

-- ========================================
-- 1. CHECK ALL TABLE COLUMNS
-- ========================================

-- Check user-related tables
SELECT 
    'user_profiles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;

SELECT 
    'user_behavior_logs' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_behavior_logs'
ORDER BY ordinal_position;

SELECT 
    'user_preferences' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_preferences'
ORDER BY ordinal_position;

SELECT 
    'user_interests' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_interests'
ORDER BY ordinal_position;

SELECT 
    'user_connections' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_connections'
ORDER BY ordinal_position;

SELECT 
    'user_recommendations' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_recommendations'
ORDER BY ordinal_position;

-- Check organization tables
SELECT 
    'organizations' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'organizations'
ORDER BY ordinal_position;

SELECT 
    'org_members' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'org_members'
ORDER BY ordinal_position;

-- Check event tables
SELECT 
    'events' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'events'
ORDER BY ordinal_position;

SELECT 
    'event_analytics_cache' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'event_analytics_cache'
ORDER BY ordinal_position;

SELECT 
    'event_recommendations' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'event_recommendations'
ORDER BY ordinal_position;

SELECT 
    'event_views' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'event_views'
ORDER BY ordinal_position;

SELECT 
    'event_checkins' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'event_checkins'
ORDER BY ordinal_position;

SELECT 
    'event_rsvps' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'event_rsvps'
ORDER BY ordinal_position;

SELECT 
    'event_reviews' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'event_reviews'
ORDER BY ordinal_position;

SELECT 
    'event_posts' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'event_posts'
ORDER BY ordinal_position;

SELECT 
    'event_ownership_history' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'event_ownership_history'
ORDER BY ordinal_position;

-- Check ticket tables
SELECT 
    'tickets' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tickets'
ORDER BY ordinal_position;

SELECT 
    'ticket_wallet' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'ticket_wallet'
ORDER BY ordinal_position;

SELECT 
    'ticket_transfers' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'ticket_transfers'
ORDER BY ordinal_position;

SELECT 
    'ticket_scans' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'ticket_scans'
ORDER BY ordinal_position;

SELECT 
    'ticket_tiers' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'ticket_tiers'
ORDER BY ordinal_position;

SELECT 
    'tier_badges' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tier_badges'
ORDER BY ordinal_position;

SELECT 
    'user_event_badges' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_event_badges'
ORDER BY ordinal_position;

-- Check order tables
SELECT 
    'orders' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

SELECT 
    'order_items' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'order_items'
ORDER BY ordinal_position;

SELECT 
    'refunds' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'refunds'
ORDER BY ordinal_position;

SELECT 
    'revenue_tracking' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'revenue_tracking'
ORDER BY ordinal_position;

-- Check post tables
SELECT 
    'posts' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'posts'
ORDER BY ordinal_position;

SELECT 
    'post_comments' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'post_comments'
ORDER BY ordinal_position;

SELECT 
    'post_reactions' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'post_reactions'
ORDER BY ordinal_position;

SELECT 
    'comments' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'comments'
ORDER BY ordinal_position;

SELECT 
    'reactions' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'reactions'
ORDER BY ordinal_position;

-- Check payment tables
SELECT 
    'stripe_customers' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'stripe_customers'
ORDER BY ordinal_position;

SELECT 
    'stripe_payment_intents' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'stripe_payment_intents'
ORDER BY ordinal_position;

SELECT 
    'stripe_webhook_events' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'stripe_webhook_events'
ORDER BY ordinal_position;

SELECT 
    'payout_accounts' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'payout_accounts'
ORDER BY ordinal_position;

-- Check cart and promo tables
SELECT 
    'cart_holds' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'cart_holds'
ORDER BY ordinal_position;

SELECT 
    'promo_codes' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'promo_codes'
ORDER BY ordinal_position;

-- Check analytics tables
SELECT 
    'search_logs' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'search_logs'
ORDER BY ordinal_position;

SELECT 
    'scan_logs' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'scan_logs'
ORDER BY ordinal_position;

SELECT 
    'content_performance' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'content_performance'
ORDER BY ordinal_position;

SELECT 
    'performance_metrics' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'performance_metrics'
ORDER BY ordinal_position;

SELECT 
    'creator_dashboard_widgets' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'creator_dashboard_widgets'
ORDER BY ordinal_position;

-- Check communication tables
SELECT 
    'conversations' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'conversations'
ORDER BY ordinal_position;

SELECT 
    'messages' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'messages'
ORDER BY ordinal_position;

SELECT 
    'notifications' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'notifications'
ORDER BY ordinal_position;

-- ========================================
-- 2. SUMMARY OF POTENTIAL ISSUES
-- ========================================

SELECT 
    'Column Verification Complete' as status,
    'Review the output above to identify any column mismatches' as message,
    'Look for tables that don\'t have user_id columns but policies reference them' as next_step;

