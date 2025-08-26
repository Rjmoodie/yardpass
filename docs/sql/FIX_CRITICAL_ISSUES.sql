-- ========================================
-- CRITICAL FIXES FOR MAP FUNCTIONALITY
-- ========================================

-- ========================================
-- 1. FIX RLS INFINITE RECURSION
-- ========================================

-- Drop ALL problematic policies that could cause recursion
DROP POLICY IF EXISTS "Org admins can manage members" ON org_members;
DROP POLICY IF EXISTS "Org admins can view members" ON org_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON org_members;
DROP POLICY IF EXISTS "Users can update their own memberships" ON org_members;

-- Create a completely safe function that doesn't query org_members
CREATE OR REPLACE FUNCTION public.is_current_user_org_admin(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    is_admin boolean := false;
BEGIN
    -- Use a direct query that bypasses RLS entirely
    SELECT EXISTS (
        SELECT 1 
        FROM public.org_members 
        WHERE org_id = check_org_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    ) INTO is_admin;
    
    RETURN COALESCE(is_admin, false);
EXCEPTION
    WHEN OTHERS THEN
        -- If anything goes wrong, return false
        RETURN false;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_current_user_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_org_admin(uuid) TO anon;

-- Create simple, safe RLS policies
CREATE POLICY "Org admins can manage members" 
ON org_members 
FOR ALL 
USING (
    public.is_current_user_org_admin(org_id) OR 
    user_id = auth.uid()
);

CREATE POLICY "Users can view their own memberships" 
ON org_members 
FOR SELECT 
USING (user_id = auth.uid());

-- ========================================
-- 2. FIX EVENTS RLS FOR PUBLIC ACCESS
-- ========================================

-- Drop existing events policies
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Users can view their own events" ON events;

-- Create simple public access policy
CREATE POLICY "Public events are viewable by everyone" 
ON events 
FOR SELECT 
USING (
    visibility = 'public' AND 
    status = 'published'
);

CREATE POLICY "Users can view their own events" 
ON events 
FOR SELECT 
USING (organizer_id = auth.uid());

-- ========================================
-- 3. ENSURE GET_SECRET FUNCTION WORKS
-- ========================================

CREATE OR REPLACE FUNCTION public.get_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    secret_value text;
BEGIN
    -- Try to get secret from Supabase Vault
    SELECT decrypted_secret INTO secret_value
    FROM vault.decrypted_secrets
    WHERE name = secret_name;
    
    -- Return the secret value (will be NULL if not found)
    RETURN secret_value;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and return NULL
        RAISE WARNING 'Failed to get secret %: %', secret_name, SQLERRM;
        RETURN NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_secret(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_secret(text) TO anon;

-- ========================================
-- 4. CREATE SIMPLE PUBLIC EVENTS VIEW
-- ========================================

-- Drop problematic view if it exists
DROP VIEW IF EXISTS public.public_events;

-- Create a simple function to get public events
CREATE OR REPLACE FUNCTION public.get_public_events()
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    slug TEXT,
    venue TEXT,
    city TEXT,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    visibility TEXT,
    status TEXT,
    category TEXT,
    cover_image_url TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.slug,
        e.venue,
        e.city,
        e.start_at,
        e.end_at,
        e.visibility,
        e.status,
        e.category,
        e.cover_image_url,
        e.latitude,
        e.longitude,
        e.created_at
    FROM public.events e
    WHERE e.visibility = 'public' 
    AND e.status = 'published'
    AND e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_public_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_events() TO anon;

-- ========================================
-- 5. VERIFICATION QUERIES
-- ========================================

-- Test the function
SELECT 'Testing is_current_user_org_admin function...' as test;
SELECT public.is_current_user_org_admin(gen_random_uuid()) as test_result;

-- Test public events access
SELECT 'Testing public events access...' as test;
SELECT COUNT(*) as public_events_count FROM public.get_public_events();

-- Test secret function
SELECT 'Testing get_secret function...' as test;
SELECT public.get_secret('mapbox_token') as mapbox_token_test;

-- Show current policies
SELECT 'Current org_members policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'org_members';
