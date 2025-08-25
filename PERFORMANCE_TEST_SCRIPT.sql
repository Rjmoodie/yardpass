-- ========================================
-- PERFORMANCE TEST SCRIPT
-- Identify database inefficiencies and slow queries
-- ========================================

-- ========================================
-- 1. TEST EVENT LISTING PERFORMANCE
-- ========================================

-- Test basic event listing query
EXPLAIN (ANALYZE, BUFFERS) 
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
    o.name as organizer_name,
    o.slug as organizer_slug
FROM public.events e
LEFT JOIN public.organizations o ON (e.owner_context_type = 'organization' AND e.owner_context_id = o.id)
WHERE e.visibility = 'public' 
AND e.status = 'published'
AND e.start_at > NOW()
ORDER BY e.start_at ASC
LIMIT 20;

-- ========================================
-- 2. TEST EVENT DETAIL QUERY
-- ========================================

-- Test event detail with all relationships
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    e.*,
    o.name as organizer_name,
    o.slug as organizer_slug,
    o.description as organizer_description,
    o.logo_url as organizer_logo_url,
    o.website_url as organizer_website_url,
    cg.themes as cultural_themes,
    cg.community_context as cultural_context,
    cg.etiquette_tips as cultural_etiquette
FROM public.events e
LEFT JOIN public.organizations o ON (e.owner_context_type = 'organization' AND e.owner_context_id = o.id)
LEFT JOIN public.cultural_guides cg ON e.id = cg.event_id
WHERE e.slug = 'sample-event-slug'
AND e.visibility = 'public'
AND e.status = 'published';

-- ========================================
-- 3. TEST SEARCH PERFORMANCE
-- ========================================

-- Test search query with multiple conditions
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    e.id,
    e.title,
    e.description,
    e.slug,
    e.venue,
    e.city,
    e.start_at,
    e.category,
    o.name as organizer_name
FROM public.events e
LEFT JOIN public.organizations o ON (e.owner_context_type = 'organization' AND e.owner_context_id = o.id)
WHERE e.visibility = 'public' 
AND e.status = 'published'
AND (
    e.title ILIKE '%music%' OR 
    e.description ILIKE '%music%' OR
    e.venue ILIKE '%music%' OR
    e.city ILIKE '%music%'
)
AND e.start_at > NOW()
ORDER BY e.start_at ASC
LIMIT 20;

-- ========================================
-- 4. TEST ORGANIZATION LISTING
-- ========================================

-- Test organization listing query
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    o.id,
    o.name,
    o.slug,
    o.description,
    o.logo_url as avatar_url,
    o.website_url,
    o.verification_status as is_verified,
    o.created_at
FROM public.organizations o
WHERE o.verification_status IN ('verified', 'pro')
ORDER BY o.name ASC
LIMIT 20;

-- ========================================
-- 5. TEST USER PROFILE QUERY
-- ========================================

-- Test user profile with related data
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    p.*,
    COUNT(DISTINCT e.id) as events_created,
    COUNT(DISTINCT om.org_id) as organizations_joined
FROM public.profiles p
LEFT JOIN public.events e ON p.id = e.organizer_id
LEFT JOIN public.org_members om ON p.id = om.user_id
WHERE p.id = 'sample-user-id'
GROUP BY p.id;

-- ========================================
-- 6. CHECK INDEX USAGE
-- ========================================

-- Check if indexes are being used effectively
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ========================================
-- 7. IDENTIFY SLOW QUERIES
-- ========================================

-- Check for slow queries in the database
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%events%' OR query LIKE '%organizations%'
ORDER BY mean_time DESC
LIMIT 10;

-- ========================================
-- 8. CHECK TABLE STATISTICS
-- ========================================

-- Check table sizes and row counts
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public'
AND tablename IN ('events', 'organizations', 'profiles', 'cultural_guides')
ORDER BY tablename, attname;

-- ========================================
-- 9. TEST PAGINATION PERFORMANCE
-- ========================================

-- Test pagination with large offsets
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    e.id,
    e.title,
    e.slug,
    e.start_at,
    o.name as organizer_name
FROM public.events e
LEFT JOIN public.organizations o ON (e.owner_context_type = 'organization' AND e.owner_context_id = o.id)
WHERE e.visibility = 'public' 
AND e.status = 'published'
ORDER BY e.start_at ASC
LIMIT 20 OFFSET 100;

-- ========================================
-- 10. PERFORMANCE RECOMMENDATIONS
-- ========================================

-- Check for missing indexes
SELECT 
    t.tablename,
    indexname,
    c.reltuples AS num_rows,
    pg_size_pretty(pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename)::regclass)) AS table_size
FROM pg_tables t
LEFT JOIN pg_indexes i ON t.tablename = i.tablename
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
AND t.tablename IN ('events', 'organizations', 'profiles', 'cultural_guides')
ORDER BY t.tablename;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT '✅ PERFORMANCE TEST COMPLETED!' as status,
       'Check the query execution plans above for:' as details,
       '- Slow query execution times' as check1,
       '- Missing index usage' as check2,
       '- Large buffer reads' as check3,
       '- Inefficient join operations' as check4,
       'Look for queries with high execution times or buffer usage' as recommendation;
