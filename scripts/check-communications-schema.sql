-- ===== COMMUNICATIONS SCHEMA CHECK SCRIPT =====
-- This script checks the current database schema for communications-related tables
-- Following the "No Assumptions Methodology"

-- Check if required extensions exist
SELECT 
    'EXTENSIONS' as check_type,
    extname as extension_name,
    extversion as version
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pg_trgm');

-- Check existing tables that might be related to communications
SELECT 
    'EXISTING_TABLES' as check_type,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'notifications',
    'push_notifications', 
    'user_push_tokens',
    'user_push_settings',
    'communications',
    'user_communication_settings',
    'email_templates',
    'sms_templates',
    'communication_logs',
    'messages',
    'user_notification_preferences'
)
ORDER BY table_name;

-- Check notifications table structure (if exists)
SELECT 
    'NOTIFICATIONS_COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'notifications'
ORDER BY ordinal_position;

-- Check push_notifications table structure (if exists)
SELECT 
    'PUSH_NOTIFICATIONS_COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'push_notifications'
ORDER BY ordinal_position;

-- Check user_push_tokens table structure (if exists)
SELECT 
    'USER_PUSH_TOKENS_COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_push_tokens'
ORDER BY ordinal_position;

-- Check user_push_settings table structure (if exists)
SELECT 
    'USER_PUSH_SETTINGS_COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_push_settings'
ORDER BY ordinal_position;

-- Check communications table structure (if exists)
SELECT 
    'COMMUNICATIONS_COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'communications'
ORDER BY ordinal_position;

-- Check user_communication_settings table structure (if exists)
SELECT 
    'USER_COMMUNICATION_SETTINGS_COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_communication_settings'
ORDER BY ordinal_position;

-- Check messages table structure (if exists)
SELECT 
    'MESSAGES_COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'messages'
ORDER BY ordinal_position;

-- Check existing indexes for communications-related tables
SELECT 
    'EXISTING_INDEXES' as check_type,
    tablename as table_name,
    indexname as index_name,
    indexdef as index_definition
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
    'notifications',
    'push_notifications',
    'user_push_tokens',
    'user_push_settings',
    'communications',
    'user_communication_settings',
    'messages'
)
ORDER BY tablename, indexname;

-- Check existing functions related to communications
SELECT 
    'EXISTING_FUNCTIONS' as check_type,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%notification%'
   OR routine_name LIKE '%communication%'
   OR routine_name LIKE '%push%'
   OR routine_name LIKE '%email%'
   OR routine_name LIKE '%sms%'
ORDER BY routine_name;

-- Check RLS policies for communications-related tables
SELECT 
    'RLS_POLICIES' as check_type,
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
AND tablename IN (
    'notifications',
    'push_notifications',
    'user_push_tokens',
    'user_push_settings',
    'communications',
    'user_communication_settings',
    'messages'
)
ORDER BY tablename, policyname;

-- Check users table for communication-related columns
SELECT 
    'USERS_COMMUNICATION_COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN ('email', 'phone', 'notification_preferences', 'communication_preferences')
ORDER BY ordinal_position;
