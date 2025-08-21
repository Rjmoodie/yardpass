-- ============================================================================
-- COMPLETE MEDIA UPLOAD PIPELINE
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO POSTS TABLE
-- ============================================================================

-- Add media_size column if it doesn't exist
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_size BIGINT;

-- ============================================================================
-- 2. CREATE STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets for media uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  ('post-media', 'post-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']),
  ('processed-media', 'processed-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 3. CREATE RLS POLICIES FOR STORAGE
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own post media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view public post media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own post media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own post media" ON storage.objects;

-- Create RLS policies for post media uploads
CREATE POLICY "Users can upload their own post media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view public post media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'post-media' AND 
    ((storage.foldername(name))[1] = 'public' OR auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY "Users can update their own post media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'post-media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own post media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- 4. CREATE DATABASE FUNCTIONS
-- ============================================================================

-- Function to generate secure media paths
CREATE OR REPLACE FUNCTION generate_media_path(
  user_id UUID,
  file_name TEXT,
  file_type TEXT DEFAULT 'image'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  timestamp_str TEXT;
  random_str TEXT;
  file_extension TEXT;
  media_path TEXT;
BEGIN
  -- Generate timestamp string
  timestamp_str := to_char(now(), 'YYYYMMDD_HH24MISS');
  
  -- Generate random string for uniqueness
  random_str := md5(random()::text);
  
  -- Extract file extension
  file_extension := split_part(file_name, '.', 2);
  IF file_extension = '' THEN
    file_extension := 'jpg'; -- Default extension
  END IF;
  
  -- Construct secure path: user_id/timestamp_random.extension
  media_path := user_id::text || '/' || timestamp_str || '_' || substring(random_str, 1, 8) || '.' || file_extension;
  
  RETURN media_path;
END;
$$;

-- Function to upload post media
CREATE OR REPLACE FUNCTION upload_post_media(
  post_id UUID,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  mime_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id UUID;
  media_path TEXT;
  media_url TEXT;
  upload_result JSON;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Verify post ownership
  IF NOT EXISTS (
    SELECT 1 FROM posts 
    WHERE id = post_id AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Post not found or access denied';
  END IF;
  
  -- Generate secure file path
  media_path := generate_media_path(current_user_id, file_name, file_type);
  
  -- Construct media URL
  media_url := 'https://jysyzpgbrretxsvjvqmp.supabase.co/storage/v1/object/public/post-media/' || media_path;
  
  -- Update post with media information
  UPDATE posts 
  SET 
    media_url = media_url,
    media_type = mime_type,
    media_size = file_size,
    updated_at = now()
  WHERE id = post_id;
  
  -- Return upload information
  upload_result := json_build_object(
    'success', true,
    'post_id', post_id,
    'media_path', media_path,
    'media_url', media_url,
    'file_name', file_name,
    'file_size', file_size,
    'mime_type', mime_type
  );
  
  RETURN upload_result;
END;
$$;

-- Function to delete post media
CREATE OR REPLACE FUNCTION delete_post_media(
  post_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id UUID;
  media_path TEXT;
  delete_result JSON;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Get media path from post
  SELECT media_url INTO media_path
  FROM posts 
  WHERE id = post_id AND user_id = current_user_id;
  
  IF media_path IS NULL THEN
    RAISE EXCEPTION 'Post not found or no media to delete';
  END IF;
  
  -- Extract path from URL
  media_path := split_part(media_path, '/public/post-media/', 2);
  
  -- Update post to remove media
  UPDATE posts 
  SET 
    media_url = NULL,
    media_type = NULL,
    media_size = NULL,
    updated_at = now()
  WHERE id = post_id;
  
  delete_result := json_build_object(
    'success', true,
    'post_id', post_id,
    'media_path', media_path,
    'message', 'Media deleted successfully'
  );
  
  RETURN delete_result;
END;
$$;

-- Function to get media upload URL
CREATE OR REPLACE FUNCTION get_media_upload_url(
  post_id UUID,
  file_name TEXT,
  file_type TEXT DEFAULT 'image'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id UUID;
  media_path TEXT;
  upload_url TEXT;
  result JSON;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Verify post ownership
  IF NOT EXISTS (
    SELECT 1 FROM posts 
    WHERE id = post_id AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Post not found or access denied';
  END IF;
  
  -- Generate secure file path
  media_path := generate_media_path(current_user_id, file_name, file_type);
  
  -- Construct upload URL
  upload_url := 'post-media/' || media_path;
  
  result := json_build_object(
    'success', true,
    'post_id', post_id,
    'media_path', media_path,
    'upload_url', upload_url,
    'bucket_id', 'post-media'
  );
  
  RETURN result;
END;
$$;

-- ============================================================================
-- 5. CREATE MEDIA PROCESSING QUEUE
-- ============================================================================

-- Create media processing queue table
CREATE TABLE IF NOT EXISTS media_processing_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  media_path TEXT NOT NULL,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns if table already exists
ALTER TABLE media_processing_queue ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
ALTER TABLE media_processing_queue ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE media_processing_queue ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE media_processing_queue ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_processing_queue_processing_status_check'
  ) THEN
    ALTER TABLE media_processing_queue ADD CONSTRAINT media_processing_queue_processing_status_check 
      CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;
END $$;

-- Enable RLS on media processing queue
ALTER TABLE media_processing_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own media processing" ON media_processing_queue;
DROP POLICY IF EXISTS "Users can insert their own media processing" ON media_processing_queue;

-- Create RLS policies for media processing queue
CREATE POLICY "Users can view their own media processing" ON media_processing_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = media_processing_queue.post_id 
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own media processing" ON media_processing_queue
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = media_processing_queue.post_id 
      AND posts.user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_media_processing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_media_processing_updated_at_trigger
  BEFORE UPDATE ON media_processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_media_processing_updated_at();

-- ============================================================================
-- 6. CREATE MEDIA ANALYTICS
-- ============================================================================

-- Create media analytics table
CREATE TABLE IF NOT EXISTS media_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  media_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  upload_duration_ms INTEGER,
  processing_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on media analytics
ALTER TABLE media_analytics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own media analytics" ON media_analytics;
DROP POLICY IF EXISTS "Users can insert their own media analytics" ON media_analytics;

-- Create RLS policies for media analytics
CREATE POLICY "Users can view their own media analytics" ON media_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own media analytics" ON media_analytics
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to track media upload analytics
CREATE OR REPLACE FUNCTION track_media_upload(
  post_id UUID,
  file_size BIGINT,
  mime_type TEXT,
  upload_duration_ms INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id UUID;
  media_path TEXT;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Get media path from post
  SELECT media_url INTO media_path
  FROM posts 
  WHERE id = post_id AND user_id = current_user_id;
  
  IF media_path IS NOT NULL THEN
    -- Extract path from URL
    media_path := split_part(media_path, '/public/post-media/', 2);
    
    -- Insert analytics record
    INSERT INTO media_analytics (
      user_id, 
      post_id, 
      media_path, 
      file_size, 
      mime_type, 
      upload_duration_ms
    ) VALUES (
      current_user_id,
      post_id,
      media_path,
      file_size,
      mime_type,
      upload_duration_ms
    );
  END IF;
END;
$$;

-- ============================================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_media_url ON posts(media_url) WHERE media_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_media_type ON posts(media_type) WHERE media_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_processing_queue_post_id ON media_processing_queue(post_id);
CREATE INDEX IF NOT EXISTS idx_media_processing_queue_status ON media_processing_queue(processing_status);
CREATE INDEX IF NOT EXISTS idx_media_analytics_user_id ON media_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_media_analytics_post_id ON media_analytics(post_id);

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION generate_media_path(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION upload_post_media(UUID, TEXT, TEXT, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_post_media(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_media_upload_url(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION track_media_upload(UUID, BIGINT, TEXT, INTEGER) TO authenticated;

-- ============================================================================
-- 9. VERIFICATION QUERIES
-- ============================================================================

-- Check if all components were created successfully
SELECT 'Media Upload Pipeline Status:' as info;

SELECT 
  'Storage Buckets' as component,
  COUNT(*) as count
FROM storage.buckets 
WHERE id IN ('post-media', 'processed-media')

UNION ALL

SELECT 
  'RLS Policies' as component,
  COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'

UNION ALL

SELECT 
  'Database Functions' as component,
  COUNT(*) as count
FROM pg_proc 
WHERE proname IN ('generate_media_path', 'upload_post_media', 'delete_post_media', 'get_media_upload_url', 'track_media_upload')

UNION ALL

SELECT 
  'Media Tables' as component,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_name IN ('media_processing_queue', 'media_analytics')

UNION ALL

SELECT 
  'Indexes' as component,
  COUNT(*) as count
FROM pg_indexes 
WHERE indexname LIKE 'idx_%media%';

-- ============================================================================
-- 10. FINAL STATUS
-- ============================================================================

SELECT 'Media upload pipeline implementation completed successfully!' as status;
