-- Quick Test for Enhanced Search Functions
-- This will verify that all the new functions are working

-- Test 1: Check if functions exist
SELECT 'FUNCTION_CHECK' as test_type, proname as function_name, 'EXISTS' as status
FROM pg_proc 
WHERE proname IN ('enhanced_search_v2', 'get_search_suggestions', 'get_trending_searches', 'get_search_facets')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Test 2: Test enhanced_search_v2 with a simple query
SELECT 'ENHANCED_SEARCH_TEST' as test_type, COUNT(*) as result_count
FROM public.enhanced_search_v2('music', ARRAY['events'], NULL, NULL, 50, NULL, NULL, 10, 0, 'relevance', NULL, NULL, NULL, NULL, FALSE, FALSE);

-- Test 3: Test get_search_suggestions
SELECT 'SUGGESTIONS_TEST' as test_type, COUNT(*) as suggestion_count
FROM public.get_search_suggestions('music', 5);

-- Test 4: Test get_trending_searches
SELECT 'TRENDING_TEST' as test_type, COUNT(*) as trending_count
FROM public.get_trending_searches(24, 5);

-- Test 5: Test get_search_facets
SELECT 'FACETS_TEST' as test_type, 
       CASE 
           WHEN public.get_search_facets('music', ARRAY['events'], NULL, NULL, 50) IS NOT NULL 
           THEN 'SUCCESS' 
           ELSE 'FAILED' 
       END as status;

-- Test 6: Show sample results from enhanced search
SELECT 'SAMPLE_RESULTS' as test_type, 
       result_type,
       result_data->>'title' as event_title,
       relevance_score,
       search_highlights
FROM public.enhanced_search_v2('music', ARRAY['events'], NULL, NULL, 50, NULL, NULL, 3, 0, 'relevance', NULL, NULL, NULL, NULL, FALSE, FALSE)
LIMIT 3;

-- Test 7: Show sample suggestions
SELECT 'SAMPLE_SUGGESTIONS' as test_type, 
       suggestion,
       suggestion_type,
       relevance_score
FROM public.get_search_suggestions('music', 3);

-- Test 8: Show sample trending searches
SELECT 'SAMPLE_TRENDING' as test_type, 
       query,
       search_count
FROM public.get_trending_searches(24, 3);
