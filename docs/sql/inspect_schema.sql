-- Database Schema Inspection Script
-- Run this in your Supabase SQL Editor to get complete schema information

-- ========================================
-- 1. LIST ALL TABLES
-- ========================================

SELECT 
    schemaname,
    tablename,
    tableowner,
    tablespace,
    hasindexes,
    hasrules,
    hastriggers,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ========================================
-- 2. LIST ALL COLUMNS FOR EACH TABLE
-- ========================================

SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
AND t.table_type = 'BASE TABLE'
AND c.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

-- ========================================
-- 3. LIST ALL FUNCTIONS
-- ========================================

SELECT 
    routine_name,
    routine_type,
    data_type,
    security_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ========================================
-- 4. LIST ALL POLICIES
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
-- 5. LIST ALL INDEXES
-- ========================================

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ========================================
-- 6. LIST ALL TRIGGERS
-- ========================================

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ========================================
-- 7. LIST ALL VIEWS
-- ========================================

SELECT 
    table_name,
    view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ========================================
-- 8. LIST ALL CONSTRAINTS
-- ========================================

SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ========================================
-- 9. SUMMARY STATISTICS
-- ========================================

SELECT 
    'Tables' as object_type,
    COUNT(*) as count
FROM pg_tables 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Functions' as object_type,
    COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'public'

UNION ALL

SELECT 
    'Policies' as object_type,
    COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Indexes' as object_type,
    COUNT(*) as count
FROM pg_indexes 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Triggers' as object_type,
    COUNT(*) as count
FROM information_schema.triggers 
WHERE trigger_schema = 'public'

UNION ALL

SELECT 
    'Views' as object_type,
    COUNT(*) as count
FROM information_schema.views 
WHERE table_schema = 'public'

ORDER BY object_type;

