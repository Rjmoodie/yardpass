-- Check events table column names for visibility and status
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'events'
AND (
    column_name LIKE '%visible%' OR 
    column_name LIKE '%status%' OR 
    column_name LIKE '%public%' OR
    column_name LIKE '%private%' OR
    column_name LIKE '%published%'
)
ORDER BY ordinal_position;

-- Also check all columns in events table to see what we have
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'events'
ORDER BY ordinal_position;

