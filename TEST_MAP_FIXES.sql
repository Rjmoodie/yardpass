-- ========================================
-- TEST SCRIPT FOR MAP FIXES
-- ========================================

-- Test 1: Verify RLS infinite recursion is fixed
SELECT 'Test 1: Checking RLS infinite recursion...' as test_name;

-- This should NOT cause infinite recursion
SELECT COUNT(*) as events_count 
FROM events 
WHERE visibility = 'public' 
AND status = 'published'
AND latitude IS NOT NULL 
AND longitude IS NOT NULL;

-- Test 2: Verify the get_public_events function works
SELECT 'Test 2: Testing get_public_events function...' as test_name;

SELECT COUNT(*) as public_events_count 
FROM public.get_public_events();

-- Test 3: Verify the is_current_user_org_admin function works
SELECT 'Test 3: Testing is_current_user_org_admin function...' as test_name;

SELECT public.is_current_user_org_admin(gen_random_uuid()) as test_result;

-- Test 4: Verify the get_secret function works
SELECT 'Test 4: Testing get_secret function...' as test_name;

SELECT public.get_secret('mapbox_token') as mapbox_token_test;

-- Test 5: Show current org_members policies
SELECT 'Test 5: Current org_members policies...' as test_name;

SELECT 
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'org_members'
ORDER BY policyname;

-- Test 6: Verify events table structure
SELECT 'Test 6: Events table structure...' as test_name;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'events' 
AND table_schema = 'public'
AND column_name IN ('latitude', 'longitude', 'visibility', 'status')
ORDER BY column_name;

-- Test 7: Check for test data
SELECT 'Test 7: Checking test data...' as test_name;

SELECT 
    title,
    city,
    latitude,
    longitude,
    visibility,
    status
FROM events 
WHERE visibility = 'public' 
AND status = 'published'
AND latitude IS NOT NULL 
AND longitude IS NOT NULL
LIMIT 5;

-- Test 8: Verify RLS policies on events table
SELECT 'Test 8: Events table RLS policies...' as test_name;

SELECT 
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;
