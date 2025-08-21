-- ============================================================================
-- CLEAN MEDIA MIGRATION - REMOVE INVALID MEDIA AND APPLY CONSTRAINT
-- ============================================================================

-- Step 1: Remove existing constraint
ALTER TABLE posts DROP CONSTRAINT IF EXISTS check_media_type;

-- Step 2: Remove media from posts with invalid types (cleanest approach)
UPDATE posts 
SET 
  media_url = NULL,
  media_type = NULL
WHERE media_type IS NOT NULL 
AND media_type NOT IN ('image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm');

-- Step 3: Add constraint back
ALTER TABLE posts ADD CONSTRAINT check_media_type 
  CHECK (
    media_type IS NULL OR 
    media_type IN ('image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm')
  );

-- Step 4: Verify the migration worked
SELECT 'Post-migration verification:' as info;
SELECT 
  'Posts with media' as category,
  COUNT(*) as count
FROM posts 
WHERE media_type IS NOT NULL

UNION ALL

SELECT 
  'Posts with valid media types' as category,
  COUNT(*) as count
FROM posts 
WHERE media_type IN ('image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm')

UNION ALL

SELECT 
  'Posts with invalid media types' as category,
  COUNT(*) as count
FROM posts 
WHERE media_type IS NOT NULL 
AND media_type NOT IN ('image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm');

-- Step 5: Show final status
SELECT 'Migration completed successfully!' as status;
