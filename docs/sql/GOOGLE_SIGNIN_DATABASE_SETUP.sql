-- ========================================
-- GOOGLE SIGN-IN DATABASE SETUP
-- ========================================

-- ========================================
-- 1. ADD GOOGLE-SPECIFIC FIELDS TO USERS TABLE
-- ========================================

-- Add Google-specific fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_id TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';

-- Create index for Google ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON public.users(auth_provider);

-- ========================================
-- 2. UPDATE RLS POLICIES FOR GOOGLE USERS
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Create comprehensive RLS policies for users table
CREATE POLICY "Users can view their own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = uid);

CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = uid);

CREATE POLICY "Users can insert their own profile" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = uid);

-- Allow public read access to basic profile info (for social features)
CREATE POLICY "Public can view basic profile info" 
ON public.users FOR SELECT 
USING (
  is_active = true AND 
  (profile_visibility = 'public' OR profile_visibility IS NULL)
);

-- ========================================
-- 3. CREATE FUNCTION TO HANDLE GOOGLE SIGN-IN
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_google_signin(
  p_google_id TEXT,
  p_email TEXT,
  p_name TEXT,
  p_photo_url TEXT,
  p_given_name TEXT,
  p_family_name TEXT
)
RETURNS TABLE(
  user_id UUID,
  is_new_user BOOLEAN,
  profile_created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_new_user BOOLEAN := FALSE;
  v_profile_created BOOLEAN := FALSE;
  v_existing_user RECORD;
BEGIN
  -- Check if user exists by Google ID
  SELECT * INTO v_existing_user 
  FROM public.users 
  WHERE google_id = p_google_id 
  OR email = p_email;
  
  IF v_existing_user IS NULL THEN
    -- Create new user profile
    INSERT INTO public.users (
      uid,
      email,
      username,
      display_name,
      google_id,
      avatar_url,
      first_name,
      last_name,
      auth_provider,
      is_verified,
      is_organizer,
      is_admin,
      role,
      preferences,
      stats,
      created_at,
      updated_at,
      last_active_at
    ) VALUES (
      auth.uid(),
      p_email,
      COALESCE(p_given_name, split_part(p_email, '@', 1)),
      p_name,
      p_google_id,
      p_photo_url,
      p_given_name,
      p_family_name,
      'google',
      TRUE, -- Google accounts are verified
      FALSE,
      FALSE,
      'user',
      '{
        "notifications": {
          "push": true,
          "email": true,
          "sms": false,
          "inApp": true,
          "quietHours": {"enabled": false, "start": "22:00", "end": "08:00"},
          "types": {
            "newEvents": true,
            "eventUpdates": true,
            "ticketReminders": true,
            "socialActivity": true
          }
        },
        "theme": "dark",
        "language": "en",
        "currency": "USD",
        "timezone": "America/New_York",
        "privacy": {
          "profileVisibility": "public",
          "activityStatus": true,
          "dataSharing": false
        },
        "accessibility": {
          "fontSize": "medium",
          "highContrast": false,
          "reduceMotion": false
        }
      }'::jsonb,
      '{
        "followersCount": 0,
        "followingCount": 0,
        "postsCount": 0,
        "eventsAttended": 0,
        "eventsCreated": 0,
        "totalLikes": 0,
        "totalViews": 0
      }'::jsonb,
      NOW(),
      NOW(),
      NOW()
    ) RETURNING uid INTO v_user_id;
    
    v_is_new_user := TRUE;
    v_profile_created := TRUE;
  ELSE
    -- Update existing user with Google info
    UPDATE public.users SET
      google_id = COALESCE(p_google_id, google_id),
      avatar_url = COALESCE(p_photo_url, avatar_url),
      first_name = COALESCE(p_given_name, first_name),
      last_name = COALESCE(p_family_name, last_name),
      auth_provider = 'google',
      is_verified = TRUE,
      updated_at = NOW(),
      last_active_at = NOW()
    WHERE uid = v_existing_user.uid;
    
    v_user_id := v_existing_user.uid;
  END IF;
  
  RETURN QUERY SELECT v_user_id, v_is_new_user, v_profile_created;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_google_signin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_google_signin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- ========================================
-- 4. CREATE TRIGGER FOR AUTO-PROFILE CREATION
-- ========================================

-- Create trigger function for new auth users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create profile if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE uid = NEW.id) THEN
    INSERT INTO public.users (
      uid,
      email,
      username,
      display_name,
      auth_provider,
      is_verified,
      is_organizer,
      is_admin,
      role,
      preferences,
      stats,
      created_at,
      updated_at,
      last_active_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
      COALESCE((NEW.raw_user_meta_data->>'is_verified')::boolean, FALSE),
      FALSE,
      FALSE,
      'user',
      '{
        "notifications": {
          "push": true,
          "email": true,
          "sms": false,
          "inApp": true,
          "quietHours": {"enabled": false, "start": "22:00", "end": "08:00"},
          "types": {
            "newEvents": true,
            "eventUpdates": true,
            "ticketReminders": true,
            "socialActivity": true
          }
        },
        "theme": "dark",
        "language": "en",
        "currency": "USD",
        "timezone": "America/New_York",
        "privacy": {
          "profileVisibility": "public",
          "activityStatus": true,
          "dataSharing": false
        },
        "accessibility": {
          "fontSize": "medium",
          "highContrast": false,
          "reduceMotion": false
        }
      }'::jsonb,
      '{
        "followersCount": 0,
        "followingCount": 0,
        "postsCount": 0,
        "eventsAttended": 0,
        "eventsCreated": 0,
        "totalLikes": 0,
        "totalViews": 0
      }'::jsonb,
      NEW.created_at,
      NEW.updated_at,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger (if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- ========================================
-- 5. VERIFICATION QUERIES
-- ========================================

-- Test the function
SELECT 'Testing Google sign-in function...' as test;
SELECT * FROM public.handle_google_signin(
  'test_google_id_123',
  'test@example.com',
  'Test User',
  'https://example.com/photo.jpg',
  'Test',
  'User'
);

-- Show current users table structure
SELECT 'Current users table structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show current RLS policies
SELECT 'Current RLS policies:' as info;
SELECT 
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
