-- Check Visibility Column Names
-- Run this to see the actual column names for visibility fields

-- Check event_reviews table columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'event_reviews'
ORDER BY ordinal_position;

-- Check post_comments table columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'post_comments'
ORDER BY ordinal_position;

-- Check comments table columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'comments'
ORDER BY ordinal_position;

-- Check for any columns with 'visible' in the name across all tables
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name LIKE '%visible%'
ORDER BY table_name, column_name;

-- Check for any columns with 'active' in the name across all tables
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name LIKE '%active%'
ORDER BY table_name, column_name;

