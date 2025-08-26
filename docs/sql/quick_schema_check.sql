-- Quick Schema Check
-- Run this in your Supabase SQL Editor to see what tables exist

-- List all tables in the public schema
SELECT 
    tablename as table_name,
    rowsecurity as rls_enabled,
    hasindexes,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Count total tables
SELECT 
    COUNT(*) as total_tables,
    COUNT(CASE WHEN rowsecurity = true THEN 1 END) as tables_with_rls,
    COUNT(CASE WHEN rowsecurity = false THEN 1 END) as tables_without_rls
FROM pg_tables 
WHERE schemaname = 'public';

