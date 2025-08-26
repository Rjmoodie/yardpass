-- Comprehensive Schema Audit for Supabase
-- This script shows ALL existing columns in both auth and public schemas
-- Run this to understand your complete database structure and prevent mistakes

-- ========================================
-- 1. AUTH SCHEMA COMPLETE AUDIT
-- ========================================

-- All tables in auth schema
SELECT 
    'AUTH SCHEMA TABLES' as audit_section,
    table_name,
    'table' as object_type
FROM information_schema.tables 
WHERE table_schema = 'auth'
ORDER BY table_name;

-- All columns in auth.users (the main auth table)
SELECT 
    'AUTH.USERS COLUMNS' as audit_section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- All columns in all auth tables
SELECT 
    'ALL AUTH COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'auth'
ORDER BY table_name, ordinal_position;

-- ========================================
-- 2. PUBLIC SCHEMA COMPLETE AUDIT
-- ========================================

-- All tables in public schema
SELECT 
    'PUBLIC SCHEMA TABLES' as audit_section,
    table_name,
    'table' as object_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- All columns in all public tables (complete list)
SELECT 
    'ALL PUBLIC COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ========================================
-- 3. USER-RELATED COLUMNS AUDIT
-- ========================================

-- All tables with user_id columns
SELECT 
    'TABLES WITH USER_ID COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'user_id'
ORDER BY table_name;

-- All tables with user-related columns
SELECT 
    'USER-RELATED COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    column_name LIKE '%user%' OR
    column_name LIKE '%created_by%' OR
    column_name LIKE '%owner%' OR
    column_name LIKE '%sender%' OR
    column_name LIKE '%recipient%' OR
    column_name LIKE '%from_user%' OR
    column_name LIKE '%to_user%' OR
    column_name LIKE '%scanned_by%'
)
ORDER BY table_name, column_name;

-- ========================================
-- 4. ORDER-RELATED COLUMNS AUDIT
-- ========================================

-- All tables with order_id columns
SELECT 
    'TABLES WITH ORDER_ID COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'order_id'
ORDER BY table_name;

-- All tables with order-related columns
SELECT 
    'ORDER-RELATED COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    column_name LIKE '%order%' OR
    column_name LIKE '%total%' OR
    column_name LIKE '%amount%' OR
    column_name LIKE '%price%' OR
    column_name LIKE '%cost%'
)
ORDER BY table_name, column_name;

-- ========================================
-- 5. EVENT-RELATED COLUMNS AUDIT
-- ========================================

-- All tables with event_id columns
SELECT 
    'TABLES WITH EVENT_ID COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'event_id'
ORDER BY table_name;

-- All tables with event-related columns
SELECT 
    'EVENT-RELATED COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    column_name LIKE '%event%' OR
    column_name LIKE '%start_at%' OR
    column_name LIKE '%end_at%' OR
    column_name LIKE '%venue%' OR
    column_name LIKE '%location%'
)
ORDER BY table_name, column_name;

-- ========================================
-- 6. TICKET-RELATED COLUMNS AUDIT
-- ========================================

-- All tables with ticket_id columns
SELECT 
    'TABLES WITH TICKET_ID COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'ticket_id'
ORDER BY table_name;

-- All tables with ticket-related columns
SELECT 
    'TICKET-RELATED COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    column_name LIKE '%ticket%' OR
    column_name LIKE '%tier%' OR
    column_name LIKE '%wallet%' OR
    column_name LIKE '%scan%' OR
    column_name LIKE '%transfer%'
)
ORDER BY table_name, column_name;

-- ========================================
-- 7. ORGANIZATION-RELATED COLUMNS AUDIT
-- ========================================

-- All tables with org_id columns
SELECT 
    'TABLES WITH ORG_ID COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'org_id'
ORDER BY table_name;

-- All tables with organization-related columns
SELECT 
    'ORGANIZATION-RELATED COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    column_name LIKE '%org%' OR
    column_name LIKE '%organization%' OR
    column_name LIKE '%member%' OR
    column_name LIKE '%role%'
)
ORDER BY table_name, column_name;

-- ========================================
-- 8. POST-RELATED COLUMNS AUDIT
-- ========================================

-- All tables with post_id columns
SELECT 
    'TABLES WITH POST_ID COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'post_id'
ORDER BY table_name;

-- All tables with post-related columns
SELECT 
    'POST-RELATED COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    column_name LIKE '%post%' OR
    column_name LIKE '%comment%' OR
    column_name LIKE '%reaction%' OR
    column_name LIKE '%content%'
)
ORDER BY table_name, column_name;

-- ========================================
-- 9. PAYMENT-RELATED COLUMNS AUDIT
-- ========================================

-- All tables with payment-related columns
SELECT 
    'PAYMENT-RELATED COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    column_name LIKE '%stripe%' OR
    column_name LIKE '%payment%' OR
    column_name LIKE '%payout%' OR
    column_name LIKE '%refund%' OR
    column_name LIKE '%webhook%' OR
    column_name LIKE '%customer%' OR
    column_name LIKE '%intent%'
)
ORDER BY table_name, column_name;

-- ========================================
-- 10. ANALYTICS-RELATED COLUMNS AUDIT
-- ========================================

-- All tables with analytics-related columns
SELECT 
    'ANALYTICS-RELATED COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    column_name LIKE '%analytics%' OR
    column_name LIKE '%log%' OR
    column_name LIKE '%metric%' OR
    column_name LIKE '%performance%' OR
    column_name LIKE '%view%' OR
    column_name LIKE '%search%' OR
    column_name LIKE '%scan%'
)
ORDER BY table_name, column_name;

-- ========================================
-- 11. COMMUNICATION-RELATED COLUMNS AUDIT
-- ========================================

-- All tables with communication-related columns
SELECT 
    'COMMUNICATION-RELATED COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    column_name LIKE '%conversation%' OR
    column_name LIKE '%message%' OR
    column_name LIKE '%notification%' OR
    column_name LIKE '%sender%' OR
    column_name LIKE '%recipient%' OR
    column_name LIKE '%participant%'
)
ORDER BY table_name, column_name;

-- ========================================
-- 12. COMMON COLUMN PATTERNS AUDIT
-- ========================================

-- All tables with common metadata columns
SELECT 
    'COMMON METADATA COLUMNS' as audit_section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    column_name IN ('id', 'created_at', 'updated_at', 'deleted_at') OR
    column_name LIKE '%_at' OR
    column_name LIKE '%_id' OR
    column_name LIKE '%is_%' OR
    column_name LIKE '%status%' OR
    column_name LIKE '%type%' OR
    column_name LIKE '%url%' OR
    column_name LIKE '%image%' OR
    column_name LIKE '%avatar%' OR
    column_name LIKE '%logo%'
)
ORDER BY table_name, column_name;

-- ========================================
-- 13. FOREIGN KEY RELATIONSHIPS AUDIT
-- ========================================

-- All foreign key constraints
SELECT 
    'FOREIGN KEY RELATIONSHIPS' as audit_section,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ========================================
-- 14. RLS POLICIES AUDIT
-- ========================================

-- All existing RLS policies
SELECT 
    'EXISTING RLS POLICIES' as audit_section,
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
-- 15. SUMMARY AND RECOMMENDATIONS
-- ========================================

-- Summary of findings
SELECT 
    'SCHEMA AUDIT SUMMARY' as audit_section,
    'Total tables in auth schema' as metric,
    COUNT(*) as value
FROM information_schema.tables 
WHERE table_schema = 'auth'
UNION ALL
SELECT 
    'SCHEMA AUDIT SUMMARY' as audit_section,
    'Total tables in public schema' as metric,
    COUNT(*) as value
FROM information_schema.tables 
WHERE table_schema = 'public'
UNION ALL
SELECT 
    'SCHEMA AUDIT SUMMARY' as audit_section,
    'Total columns in public schema' as metric,
    COUNT(*) as value
FROM information_schema.columns 
WHERE table_schema = 'public'
UNION ALL
SELECT 
    'SCHEMA AUDIT SUMMARY' as audit_section,
    'Tables with user_id columns' as metric,
    COUNT(DISTINCT table_name) as value
FROM information_schema.columns 
WHERE table_schema = 'public' AND column_name = 'user_id'
UNION ALL
SELECT 
    'SCHEMA AUDIT SUMMARY' as audit_section,
    'Tables with order_id columns' as metric,
    COUNT(DISTINCT table_name) as value
FROM information_schema.columns 
WHERE table_schema = 'public' AND column_name = 'order_id'
UNION ALL
SELECT 
    'SCHEMA AUDIT SUMMARY' as audit_section,
    'Tables with event_id columns' as metric,
    COUNT(DISTINCT table_name) as value
FROM information_schema.columns 
WHERE table_schema = 'public' AND column_name = 'event_id'
UNION ALL
SELECT 
    'SCHEMA AUDIT SUMMARY' as audit_section,
    'Existing RLS policies' as metric,
    COUNT(*) as value
FROM pg_policies 
WHERE schemaname = 'public';

-- Final recommendations
SELECT 
    'RECOMMENDATIONS' as audit_section,
    'Review all column names above before creating RLS policies' as recommendation,
    'Pay special attention to user_id vs order_id vs event_id columns' as detail;

