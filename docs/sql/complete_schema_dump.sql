-- Complete Database Schema Dump for YardPass
-- Run this in your Supabase SQL Editor to get complete schema information
-- This will give us all the information we need without Docker

-- ========================================
-- 1. TABLE STRUCTURE DUMP
-- ========================================

-- Get all tables with their columns
SELECT 
    'TABLE' as object_type,
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
-- 2. INDEXES DUMP
-- ========================================

-- Get all indexes
SELECT 
    'INDEX' as object_type,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ========================================
-- 3. FUNCTIONS DUMP
-- ========================================

-- Get all functions
SELECT 
    'FUNCTION' as object_type,
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    p.prosrc as function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- ========================================
-- 4. POLICIES DUMP
-- ========================================

-- Get all RLS policies
SELECT 
    'POLICY' as object_type,
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
-- 5. TRIGGERS DUMP
-- ========================================

-- Get all triggers
SELECT 
    'TRIGGER' as object_type,
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_schema,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ========================================
-- 6. VIEWS DUMP
-- ========================================

-- Get all views
SELECT 
    'VIEW' as object_type,
    table_name,
    view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ========================================
-- 7. CONSTRAINTS DUMP
-- ========================================

-- Get all constraints
SELECT 
    'CONSTRAINT' as object_type,
    constraint_name,
    table_name,
    constraint_type,
    is_deferrable,
    initially_deferred
FROM information_schema.table_constraints 
WHERE table_schema = 'public'
ORDER BY table_name, constraint_name;

-- ========================================
-- 8. FOREIGN KEYS DUMP
-- ========================================

-- Get all foreign keys
SELECT 
    'FOREIGN_KEY' as object_type,
    tc.constraint_name,
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
ORDER BY tc.table_name, tc.constraint_name;

-- ========================================
-- 9. ENUMS DUMP
-- ========================================

-- Get all enum types
SELECT 
    'ENUM' as object_type,
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- ========================================
-- 10. SUMMARY STATISTICS
-- ========================================

-- Get summary statistics
SELECT 
    'SUMMARY' as object_type,
    'Tables' as item,
    COUNT(DISTINCT table_name) as count
FROM information_schema.columns 
WHERE table_schema = 'public'
UNION ALL
SELECT 
    'SUMMARY' as object_type,
    'Columns' as item,
    COUNT(*) as count
FROM information_schema.columns 
WHERE table_schema = 'public'
UNION ALL
SELECT 
    'SUMMARY' as object_type,
    'Indexes' as item,
    COUNT(*) as count
FROM pg_indexes 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'SUMMARY' as object_type,
    'Functions' as item,
    COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
UNION ALL
SELECT 
    'SUMMARY' as object_type,
    'Policies' as item,
    COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'SUMMARY' as object_type,
    'Triggers' as item,
    COUNT(*) as count
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
UNION ALL
SELECT 
    'SUMMARY' as object_type,
    'Views' as item,
    COUNT(*) as count
FROM information_schema.views 
WHERE table_schema = 'public'
UNION ALL
SELECT 
    'SUMMARY' as object_type,
    'Constraints' as item,
    COUNT(*) as count
FROM information_schema.table_constraints 
WHERE table_schema = 'public';

