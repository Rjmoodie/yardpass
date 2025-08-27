-- Analytics Schema Check Script
-- This script checks what tables and columns exist before creating analytics functions

-- ===== CHECK EXTENSIONS =====
SELECT 'EXTENSIONS' as check_type, extname as name, extversion as version
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pg_trgm');

-- ===== CHECK ANALYTICS-RELATED TABLES =====
SELECT 'TABLES' as check_type, 
       table_name, 
       table_type,
       CASE WHEN table_name LIKE '%analytics%' THEN 'ANALYTICS' 
            WHEN table_name LIKE '%revenue%' THEN 'REVENUE'
            WHEN table_name LIKE '%ticket%' THEN 'TICKETS'
            WHEN table_name LIKE '%event%' THEN 'EVENTS'
            WHEN table_name LIKE '%order%' THEN 'ORDERS'
            WHEN table_name LIKE '%user%' THEN 'USERS'
            WHEN table_name LIKE '%performance%' THEN 'PERFORMANCE'
            ELSE 'OTHER' END as category
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%analytics%' 
       OR table_name LIKE '%revenue%' 
       OR table_name LIKE '%ticket%' 
       OR table_name LIKE '%event%' 
       OR table_name LIKE '%order%' 
       OR table_name LIKE '%user%' 
       OR table_name LIKE '%performance%'
       OR table_name LIKE '%behavior%'
       OR table_name LIKE '%view%'
       OR table_name LIKE '%post%')
ORDER BY category, table_name;

-- ===== CHECK REVENUE_TRACKING TABLE STRUCTURE =====
SELECT 'REVENUE_TRACKING_COLUMNS' as check_type, 
       column_name, 
       data_type, 
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'revenue_tracking'
ORDER BY ordinal_position;

-- ===== CHECK TICKETS TABLE STRUCTURE =====
SELECT 'TICKETS_COLUMNS' as check_type, 
       column_name, 
       data_type, 
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tickets'
ORDER BY ordinal_position;

-- ===== CHECK EVENTS TABLE STRUCTURE =====
SELECT 'EVENTS_COLUMNS' as check_type, 
       column_name, 
       data_type, 
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'events'
ORDER BY ordinal_position;

-- ===== CHECK ORDERS TABLE STRUCTURE =====
SELECT 'ORDERS_COLUMNS' as check_type, 
       column_name, 
       data_type, 
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- ===== CHECK EVENT_VIEWS TABLE STRUCTURE =====
SELECT 'EVENT_VIEWS_COLUMNS' as check_type, 
       column_name, 
       data_type, 
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'event_views'
ORDER BY ordinal_position;

-- ===== CHECK EVENT_POSTS TABLE STRUCTURE =====
SELECT 'EVENT_POSTS_COLUMNS' as check_type, 
       column_name, 
       data_type, 
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'event_posts'
ORDER BY ordinal_position;

-- ===== CHECK PERFORMANCE_METRICS TABLE STRUCTURE =====
SELECT 'PERFORMANCE_METRICS_COLUMNS' as check_type, 
       column_name, 
       data_type, 
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'performance_metrics'
ORDER BY ordinal_position;

-- ===== CHECK USER_BEHAVIOR_LOGS TABLE STRUCTURE =====
SELECT 'USER_BEHAVIOR_LOGS_COLUMNS' as check_type, 
       column_name, 
       data_type, 
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_behavior_logs'
ORDER BY ordinal_position;

-- ===== CHECK EXISTING ANALYTICS FUNCTIONS =====
SELECT 'EXISTING_FUNCTIONS' as check_type,
       routine_name,
       routine_type,
       data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND (routine_name LIKE '%analytics%' 
       OR routine_name LIKE '%cache%' 
       OR routine_name LIKE '%insight%' 
       OR routine_name LIKE '%prediction%'
       OR routine_name LIKE '%revenue%'
       OR routine_name LIKE '%attendance%'
       OR routine_name LIKE '%engagement%')
ORDER BY routine_name;

-- ===== CHECK EXISTING INDEXES =====
SELECT 'EXISTING_INDEXES' as check_type,
       indexname,
       tablename,
       indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND (indexname LIKE '%analytics%' 
       OR indexname LIKE '%revenue%' 
       OR indexname LIKE '%ticket%' 
       OR indexname LIKE '%event%' 
       OR indexname LIKE '%order%' 
       OR indexname LIKE '%performance%'
       OR indexname LIKE '%cache%')
ORDER BY tablename, indexname;

-- ===== CHECK SAMPLE DATA =====
-- Check if tables have data
SELECT 'SAMPLE_DATA_COUNT' as check_type,
       'revenue_tracking' as table_name,
       COUNT(*) as row_count
FROM public.revenue_tracking
UNION ALL
SELECT 'SAMPLE_DATA_COUNT' as check_type,
       'tickets' as table_name,
       COUNT(*) as row_count
FROM public.tickets
UNION ALL
SELECT 'SAMPLE_DATA_COUNT' as check_type,
       'events' as table_name,
       COUNT(*) as row_count
FROM public.events
UNION ALL
SELECT 'SAMPLE_DATA_COUNT' as check_type,
       'orders' as table_name,
       COUNT(*) as row_count
FROM public.orders
UNION ALL
SELECT 'SAMPLE_DATA_COUNT' as check_type,
       'event_views' as table_name,
       COUNT(*) as row_count
FROM public.event_views
UNION ALL
SELECT 'SAMPLE_DATA_COUNT' as check_type,
       'event_posts' as table_name,
       COUNT(*) as row_count
FROM public.event_posts
UNION ALL
SELECT 'SAMPLE_DATA_COUNT' as check_type,
       'performance_metrics' as table_name,
       COUNT(*) as row_count
FROM public.performance_metrics
UNION ALL
SELECT 'SAMPLE_DATA_COUNT' as check_type,
       'user_behavior_logs' as table_name,
       COUNT(*) as row_count
FROM public.user_behavior_logs;

-- ===== CHECK SAMPLE DATA STRUCTURE =====
-- Show sample rows to understand data structure
SELECT 'SAMPLE_REVENUE_DATA' as check_type, 
       * 
FROM public.revenue_tracking 
LIMIT 3;

SELECT 'SAMPLE_TICKETS_DATA' as check_type, 
       * 
FROM public.tickets 
LIMIT 3;

SELECT 'SAMPLE_EVENTS_DATA' as check_type, 
       * 
FROM public.events 
LIMIT 3;

SELECT 'SAMPLE_ORDERS_DATA' as check_type, 
       * 
FROM public.orders 
LIMIT 3;
