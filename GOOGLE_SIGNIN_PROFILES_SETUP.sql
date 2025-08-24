-- ========================================
-- GOOGLE SIGN-IN SETUP FOR EXISTING PROFILES TABLE
-- ========================================

-- ========================================
-- 1. ADD GOOGLE-SPECIFIC FIELDS TO PROFILES TABLE
-- ========================================

-- Add Google-specific fields to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS google_id TEXT,
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Create index for Google ID lookups
CREATE INDEX IF NOT EXISTS idx_profiles_google_id ON public.profiles(google_id);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON public.profiles(auth_provider);

-- ========================================
-- 2. UPDATE RLS POLICIES FOR GOOGLE USERS
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create comprehensive RLS policies for profiles table
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

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
  profile_id UUID,
  is_new_user BOOLEAN,
  profile_created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_is_new_user BOOLEAN := FALSE;
  v_profile_created BOOLEAN := FALSE;
  v_existing_profile RECORD;
BEGIN
  -- Check if profile exists by Google ID or email
  SELECT * INTO v_existing_profile 
  FROM public.profiles 
  WHERE google_id = p_google_id 
  OR (email = p_email AND email IS NOT NULL);
  
  IF v_existing_profile IS NULL THEN
    -- Create new profile
    INSERT INTO public.profiles (
      id,
      handle,
      display_name,
      avatar_url,
      google_id,
      first_name,
      last_name,
      auth_provider,
      is_verified,
      created_at,
      updated_at
    ) VALUES (
      auth.uid(),
      COALESCE(p_given_name, split_part(p_email, '@', 1)) || '_' || substr(auth.uid()::text, 1, 8),
      p_name,
      p_photo_url,
      p_google_id,
      p_given_name,
      p_family_name,
      'google',
      TRUE, -- Google accounts are verified
      NOW(),
      NOW()
    ) RETURNING id INTO v_profile_id;
    
    v_is_new_user := TRUE;
    v_profile_created := TRUE;
  ELSE
    -- Update existing profile with Google info
    UPDATE public.profiles SET
      google_id = COALESCE(p_google_id, google_id),
      avatar_url = COALESCE(p_photo_url, avatar_url),
      first_name = COALESCE(p_given_name, first_name),
      last_name = COALESCE(p_family_name, last_name),
      auth_provider = 'google',
      is_verified = TRUE,
      updated_at = NOW()
    WHERE id = v_existing_profile.id;
    
    v_profile_id := v_existing_profile.id;
  END IF;
  
  RETURN QUERY SELECT v_profile_id, v_is_new_user, v_profile_created;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_google_signin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_google_signin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- ========================================
-- 4. UPDATE AUTO-PROFILE CREATION TRIGGER
-- ========================================

-- Update the existing trigger function to handle Google users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create profile if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (
      id,
      handle,
      display_name,
      avatar_url,
      auth_provider,
      is_verified,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'handle',
        NEW.raw_user_meta_data->>'username',
        'user_' || substr(NEW.id::text, 1, 8)
      ),
      COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        'User'
      ),
      NEW.raw_user_meta_data->>'avatar_url',
      COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
      COALESCE((NEW.raw_user_meta_data->>'is_verified')::boolean, FALSE),
      NEW.created_at,
      NEW.updated_at
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate handle gracefully
    RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Handle other errors gracefully
    RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

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

-- Show current profiles table structure
SELECT 'Current profiles table structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
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
WHERE tablename = 'profiles'
ORDER BY policyname;
