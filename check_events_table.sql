-- Check Events Table Structure
-- Run this to see the actual column names in your events table

-- Show all columns in events table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'events'
ORDER BY ordinal_position;

-- Show sample data structure (first few rows)
SELECT * FROM events LIMIT 3;

-- Check if org_id column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'events' 
            AND column_name = 'org_id'
        ) THEN '✅ org_id column exists'
        ELSE '❌ org_id column does not exist'
    END as org_id_status;

-- Check for organization-related columns
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'events' 
AND column_name LIKE '%org%'
ORDER BY column_name;

