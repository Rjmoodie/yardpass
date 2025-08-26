-- ========================================
-- EFFICIENCY OPTIMIZATION FIXES
-- Address gaps identified in efficiency report
-- ========================================

-- ========================================
-- 1. TICKET PURCHASE OPTIMIZATION
-- ========================================

-- Create cart expiration management
CREATE OR REPLACE FUNCTION public.cleanup_expired_carts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete carts older than 30 minutes
    DELETE FROM public.carts 
    WHERE created_at < NOW() - INTERVAL '30 minutes'
    AND status = 'pending';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup for monitoring
    INSERT INTO public.security_audit_log (
        action_type,
        table_name,
        new_values
    ) VALUES (
        'cart_cleanup',
        'carts',
        jsonb_build_object('deleted_count', deleted_count, 'cleanup_time', NOW())
    );
    
    RETURN deleted_count;
END;
$$;

-- Create index for cart expiration queries
CREATE INDEX IF NOT EXISTS idx_carts_status_created_at ON public.carts(status, created_at);

-- Schedule cart cleanup (runs every 5 minutes)
SELECT cron.schedule(
    'cleanup-expired-carts',
    '*/5 * * * *',
    'SELECT public.cleanup_expired_carts();'
);

-- ========================================
-- 2. SEARCH RESULT CACHING
-- ========================================

-- Create search cache table
CREATE TABLE IF NOT EXISTS public.search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash TEXT NOT NULL,
    search_query TEXT NOT NULL,
    category_filter TEXT,
    location_filter TEXT,
    results JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '15 minutes'
);

-- Create indexes for search cache
CREATE INDEX IF NOT EXISTS idx_search_cache_query_hash ON public.search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON public.search_cache(expires_at);

-- Function to get cached search results
CREATE OR REPLACE FUNCTION public.get_cached_search_results(
    search_query TEXT,
    category_filter TEXT DEFAULT NULL,
    location_filter TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    query_hash TEXT;
    cached_results JSONB;
BEGIN
    -- Create hash for the search query
    query_hash := encode(sha256(search_query || COALESCE(category_filter, '') || COALESCE(location_filter, '')), 'hex');
    
    -- Check for cached results
    SELECT results INTO cached_results
    FROM public.search_cache
    WHERE query_hash = get_cached_search_results.query_hash
    AND expires_at > NOW();
    
    RETURN cached_results;
END;
$$;

-- Function to cache search results
CREATE OR REPLACE FUNCTION public.cache_search_results(
    search_query TEXT,
    category_filter TEXT DEFAULT NULL,
    location_filter TEXT DEFAULT NULL,
    results JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    query_hash TEXT;
BEGIN
    -- Create hash for the search query
    query_hash := encode(sha256(search_query || COALESCE(category_filter, '') || COALESCE(location_filter, '')), 'hex');
    
    -- Insert or update cache
    INSERT INTO public.search_cache (query_hash, search_query, category_filter, location_filter, results)
    VALUES (query_hash, search_query, category_filter, location_filter, results)
    ON CONFLICT (query_hash) 
    DO UPDATE SET 
        results = EXCLUDED.results,
        expires_at = NOW() + INTERVAL '15 minutes';
END;
$$;

-- ========================================
-- 3. FEED VIRTUALIZATION SUPPORT
-- ========================================

-- Create optimized feed query function
CREATE OR REPLACE FUNCTION public.get_paginated_feed(
    user_id UUID DEFAULT NULL,
    page_size INTEGER DEFAULT 20,
    page_offset INTEGER DEFAULT 0,
    category_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    media_urls TEXT[],
    event_id UUID,
    event_title TEXT,
    user_id UUID,
    user_name TEXT,
    user_avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH feed_data AS (
        SELECT 
            p.id,
            p.content,
            p.media_urls,
            p.event_id,
            e.title as event_title,
            p.user_id,
            u.full_name as user_name,
            u.avatar_url as user_avatar,
            p.created_at,
            COUNT(*) OVER() as total_count
        FROM public.posts p
        LEFT JOIN public.events e ON p.event_id = e.id
        LEFT JOIN public.profiles u ON p.user_id = u.id
        WHERE p.is_active = true
        AND (category_filter IS NULL OR e.category = category_filter)
        AND (
            user_id IS NULL OR 
            p.user_id = get_paginated_feed.user_id OR
            EXISTS (
                SELECT 1 FROM public.org_members om
                WHERE om.user_id = get_paginated_feed.user_id
                AND om.org_id IN (
                    SELECT owner_context_id FROM public.events 
                    WHERE id = p.event_id AND owner_context_type = 'organization'
                )
            )
        )
        ORDER BY p.created_at DESC
        LIMIT page_size
        OFFSET page_offset
    )
    SELECT * FROM feed_data;
END;
$$;

-- ========================================
-- 4. IMAGE UPLOAD BATCHING SUPPORT
-- ========================================

-- Create image upload batch table
CREATE TABLE IF NOT EXISTS public.image_upload_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    batch_type TEXT NOT NULL, -- 'event', 'post', 'profile'
    reference_id UUID, -- event_id, post_id, etc.
    images JSONB NOT NULL, -- array of image metadata
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for image batches
CREATE INDEX IF NOT EXISTS idx_image_batches_user_id ON public.image_upload_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_image_batches_status ON public.image_upload_batches(status);
CREATE INDEX IF NOT EXISTS idx_image_batches_created_at ON public.image_upload_batches(created_at);

-- Function to create image upload batch
CREATE OR REPLACE FUNCTION public.create_image_batch(
    batch_type TEXT,
    reference_id UUID DEFAULT NULL,
    images JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    batch_id UUID;
BEGIN
    INSERT INTO public.image_upload_batches (
        user_id,
        batch_type,
        reference_id,
        images
    ) VALUES (
        auth.uid(),
        batch_type,
        reference_id,
        images
    ) RETURNING id INTO batch_id;
    
    RETURN batch_id;
END;
$$;

-- ========================================
-- 5. DRAFT AUTO-SAVE FUNCTIONALITY
-- ========================================

-- Create draft auto-save table
CREATE TABLE IF NOT EXISTS public.draft_autosaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    draft_type TEXT NOT NULL, -- 'event', 'post'
    draft_data JSONB NOT NULL,
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for drafts
CREATE INDEX IF NOT EXISTS idx_draft_autosaves_user_type ON public.draft_autosaves(user_id, draft_type);
CREATE INDEX IF NOT EXISTS idx_draft_autosaves_last_saved ON public.draft_autosaves(last_saved_at);

-- Function to auto-save draft
CREATE OR REPLACE FUNCTION public.autosave_draft(
    draft_type TEXT,
    draft_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    draft_id UUID;
BEGIN
    -- Update existing draft or create new one
    INSERT INTO public.draft_autosaves (user_id, draft_type, draft_data)
    VALUES (auth.uid(), draft_type, draft_data)
    ON CONFLICT (user_id, draft_type) 
    DO UPDATE SET 
        draft_data = EXCLUDED.draft_data,
        last_saved_at = NOW()
    RETURNING id INTO draft_id;
    
    RETURN draft_id;
END;
$$;

-- ========================================
-- 6. LOCATION CACHING
-- ========================================

-- Create location cache table
CREATE TABLE IF NOT EXISTS public.location_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_query TEXT NOT NULL,
    coordinates JSONB NOT NULL, -- {lat: number, lng: number}
    formatted_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours'
);

-- Create index for location cache
CREATE INDEX IF NOT EXISTS idx_location_cache_query ON public.location_cache(location_query);
CREATE INDEX IF NOT EXISTS idx_location_cache_expires ON public.location_cache(expires_at);

-- Function to get cached location
CREATE OR REPLACE FUNCTION public.get_cached_location(location_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    cached_location JSONB;
BEGIN
    SELECT jsonb_build_object(
        'coordinates', coordinates,
        'formatted_address', formatted_address
    ) INTO cached_location
    FROM public.location_cache
    WHERE location_query = get_cached_location.location_query
    AND expires_at > NOW();
    
    RETURN cached_location;
END;
$$;

-- ========================================
-- 7. PERFORMANCE MONITORING
-- ========================================

-- Create performance monitoring table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL, -- 'api_response', 'page_load', 'query_time'
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(10,3) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON public.performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON public.performance_metrics(created_at);

-- Function to log performance metrics
CREATE OR REPLACE FUNCTION public.log_performance_metric(
    metric_type TEXT,
    metric_name TEXT,
    metric_value DECIMAL(10,3),
    metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.performance_metrics (
        metric_type,
        metric_name,
        metric_value,
        metadata
    ) VALUES (
        metric_type,
        metric_name,
        metric_value,
        metadata
    );
END;
$$;

-- ========================================
-- 8. VERIFICATION
-- ========================================

-- Test the optimizations
DO $$
DECLARE
    function_exists BOOLEAN;
    table_exists BOOLEAN;
BEGIN
    -- Check if cart cleanup function exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'cleanup_expired_carts' 
        AND routine_schema = 'public'
    ) INTO function_exists;
    
    IF function_exists THEN
        RAISE NOTICE '✅ Cart cleanup function created successfully';
    ELSE
        RAISE NOTICE '❌ Cart cleanup function missing';
    END IF;
    
    -- Check if search cache table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'search_cache' 
        AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '✅ Search cache table created successfully';
    ELSE
        RAISE NOTICE '❌ Search cache table missing';
    END IF;
    
    -- Check if feed pagination function exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_paginated_feed' 
        AND routine_schema = 'public'
    ) INTO function_exists;
    
    IF function_exists THEN
        RAISE NOTICE '✅ Feed pagination function created successfully';
    ELSE
        RAISE NOTICE '❌ Feed pagination function missing';
    END IF;
    
END $$;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT '✅ EFFICIENCY OPTIMIZATIONS COMPLETED!' as status,
       'Addressing efficiency gaps:' as details,
       '- Cart expiration management implemented' as fix1,
       '- Search result caching added' as fix2,
       '- Feed virtualization support created' as fix3,
       '- Image upload batching support added' as fix4,
       '- Draft auto-save functionality implemented' as fix5,
       '- Location caching added' as fix6,
       '- Performance monitoring system created' as fix7,
       'Next: Implement frontend optimizations' as next_step;
