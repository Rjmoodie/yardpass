-- Check all tables for visibility-related columns
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    column_name LIKE '%visible%' OR 
    column_name LIKE '%visibility%' OR
    column_name LIKE '%status%' OR 
    column_name LIKE '%public%' OR
    column_name LIKE '%private%' OR
    column_name LIKE '%published%'
)
ORDER BY table_name, column_name;

-- Check posts table specifically since it might have visibility column
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'posts'
ORDER BY ordinal_position;

-- Check event_posts table specifically
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'event_posts'
ORDER BY ordinal_position;

