push -- Enhanced Search Functions for YardPass (Compatible with Existing Functions)
-- This script adds enhanced search functionality while preserving existing functions

-- ✅ Check what we have and what we need
DO $$
DECLARE
    existing_functions TEXT[] := ARRAY['cache_search_results', 'get_cached_search_results', 'search_public_events'];
    target_functions TEXT[] := ARRAY['enhanced_search_v2', 'get_search_suggestions', 'get_trending_searches', 'get_search_facets'];
    func_name TEXT;
BEGIN
    RAISE NOTICE 'Checking existing search functions...';
    
    -- Check existing functions
    FOREACH func_name IN ARRAY existing_functions
    LOOP
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = func_name AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
            RAISE NOTICE 'Found existing function: %', func_name;
        END IF;
    END LOOP;
    
    -- Check target functions
    FOREACH func_name IN ARRAY target_functions
    LOOP
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = func_name AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
            RAISE NOTICE 'Target function already exists: %', func_name;
        ELSE
            RAISE NOTICE 'Will create target function: %', func_name;
        END IF;
    END LOOP;
END $$;

-- ✅ Create enhanced_search_v2 function (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enhanced_search_v2' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        RAISE NOTICE 'Creating enhanced_search_v2 function...';
    ELSE
        RAISE NOTICE 'enhanced_search_v2 function already exists - skipping';
        RETURN;
    END IF;
END $$;

-- Create enhanced_search_v2 function (outside DO block)
CREATE OR REPLACE FUNCTION public.enhanced_search_v2(
    search_query TEXT,
    search_types TEXT[] DEFAULT ARRAY['events'],
    category_filter TEXT DEFAULT NULL,
    location_filter TEXT DEFAULT NULL,
    radius_km INTEGER DEFAULT 50,
    date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0,
    sort_by TEXT DEFAULT 'relevance',
    price_min DECIMAL(10,2) DEFAULT NULL,
    price_max DECIMAL(10,2) DEFAULT NULL,
    tags_filter TEXT[] DEFAULT NULL,
    organizer_filter UUID DEFAULT NULL,
    verified_only BOOLEAN DEFAULT FALSE,
    include_past_events BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    result_type TEXT,
    result_data JSONB,
    relevance_score DECIMAL(5,4),
    distance_km DECIMAL(8,2),
    search_highlights TEXT[],
    quick_actions JSONB,
    ticket_availability JSONB,
    organizer_info JSONB,
    event_count INTEGER,
    follower_count INTEGER,
    connection_status TEXT,
    engagement_metrics JSONB,
    author_info JSONB
) AS $$
BEGIN
    -- Enhanced search for events only
    IF 'events' = ANY(search_types) THEN
        RETURN QUERY
        SELECT 
            'event' as result_type,
            to_jsonb(e.*) as result_data,
            CASE 
                WHEN e.title ILIKE '%' || search_query || '%' THEN 0.9
                WHEN e.description ILIKE '%' || search_query || '%' THEN 0.7
                WHEN e.category ILIKE '%' || search_query || '%' THEN 0.6
                ELSE 0.3
            END as relevance_score,
            NULL as distance_km,
            ARRAY[e.title] as search_highlights,
            '{"buy_tickets": true, "share_event": true, "add_to_calendar": true}'::jsonb as quick_actions,
            '{"available_tickets": 0, "total_tickets": 0, "ticket_types": []}'::jsonb as ticket_availability,
            '{"id": null, "name": "Unknown", "is_verified": false, "follower_count": 0}'::jsonb as organizer_info,
            0 as event_count,
            0 as follower_count,
            NULL as connection_status,
            jsonb_build_object(
                'likes_count', COALESCE(e.likes_count, 0),
                'shares_count', COALESCE(e.shares_count, 0),
                'views_count', COALESCE(e.views_count, 0)
            ) as engagement_metrics,
            NULL as author_info
        FROM public.events e
        WHERE 
            e.status = 'published'
            AND e.visibility = 'public'
            AND (include_past_events OR e.start_at > NOW())
            AND (category_filter IS NULL OR e.category = category_filter)
            AND (
                e.title ILIKE '%' || search_query || '%'
                OR e.description ILIKE '%' || search_query || '%'
                OR e.category ILIKE '%' || search_query || '%'
                OR e.tags && string_to_array(search_query, ' ')
            )
        ORDER BY 
            CASE sort_by
                WHEN 'relevance' THEN 
                    CASE 
                        WHEN e.title ILIKE '%' || search_query || '%' THEN 1
                        WHEN e.description ILIKE '%' || search_query || '%' THEN 2
                        WHEN e.category ILIKE '%' || search_query || '%' THEN 3
                        ELSE 4
                    END
                WHEN 'date' THEN 0
                WHEN 'popularity' THEN 0
                ELSE 0
            END,
            e.start_at ASC
        LIMIT limit_count
        OFFSET offset_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ Create get_search_suggestions function (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_search_suggestions' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        RAISE NOTICE 'Creating get_search_suggestions function...';
    ELSE
        RAISE NOTICE 'get_search_suggestions function already exists - skipping';
        RETURN;
    END IF;
END $$;

-- Create get_search_suggestions function (outside DO block)
CREATE OR REPLACE FUNCTION public.get_search_suggestions(
    partial_query TEXT,
    suggestion_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    suggestion TEXT,
    suggestion_type VARCHAR(20),
    relevance_score DECIMAL(3,2)
) AS $$
BEGIN
    -- Return suggestions from event titles and categories
    RETURN QUERY
    SELECT DISTINCT
        suggestion_text as suggestion,
        suggestion_type::VARCHAR(20),
        relevance_score::DECIMAL(3,2)
    FROM (
        -- Event titles
        SELECT 
            e.title as suggestion_text,
            'event'::TEXT as suggestion_type,
            0.9::DECIMAL(3,2) as relevance_score
        FROM public.events e
        WHERE 
            e.status = 'published'
            AND e.title ILIKE partial_query || '%'
        
        UNION ALL
        
        -- Categories
        SELECT 
            e.category as suggestion_text,
            'category'::TEXT as suggestion_type,
            0.7::DECIMAL(3,2) as relevance_score
        FROM public.events e
        WHERE 
            e.status = 'published'
            AND e.category ILIKE partial_query || '%'
            AND e.category IS NOT NULL
        
        UNION ALL
        
        -- Popular searches (if search_logs table exists)
        SELECT 
            sl.query as suggestion_text,
            'popular'::TEXT as suggestion_type,
            0.8::DECIMAL(3,2) as relevance_score
        FROM public.search_logs sl
        WHERE 
            sl.query ILIKE partial_query || '%'
            AND sl.created_at >= NOW() - INTERVAL '7 days'
    ) suggestions
    WHERE suggestion_text IS NOT NULL
    ORDER BY relevance_score DESC, suggestion_text
    LIMIT suggestion_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ Create get_trending_searches function (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_trending_searches' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        RAISE NOTICE 'Creating get_trending_searches function...';
    ELSE
        RAISE NOTICE 'get_trending_searches function already exists - skipping';
        RETURN;
    END IF;
END $$;

-- Create get_trending_searches function (outside DO block)
CREATE OR REPLACE FUNCTION public.get_trending_searches(
    hours_back INTEGER DEFAULT 24,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    query TEXT,
    search_count INTEGER
) AS $$
BEGIN
    -- Return trending searches from multiple sources
    RETURN QUERY
    SELECT 
        query_text as query,
        search_count::INTEGER
    FROM (
        -- From search logs (if table exists)
        SELECT 
            sl.query as query_text,
            COUNT(*) as search_count
        FROM public.search_logs sl
        WHERE sl.created_at >= NOW() - (hours_back || ' hours')::INTERVAL
        GROUP BY sl.query
        
        UNION ALL
        
        -- From event categories (fallback)
        SELECT 
            e.category as query_text,
            COUNT(*) as search_count
        FROM public.events e
        WHERE 
            e.status = 'published'
            AND e.category IS NOT NULL
            AND e.created_at >= NOW() - (hours_back || ' hours')::INTERVAL
        GROUP BY e.category
    ) trending
    WHERE query_text IS NOT NULL
    GROUP BY query_text
    ORDER BY SUM(search_count) DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ Create get_search_facets function (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_search_facets' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        RAISE NOTICE 'Creating get_search_facets function...';
    ELSE
        RAISE NOTICE 'get_search_facets function already exists - skipping';
        RETURN;
    END IF;
END $$;

-- Create get_search_facets function (outside DO block)
CREATE OR REPLACE FUNCTION public.get_search_facets(
    search_query TEXT,
    search_types TEXT[] DEFAULT ARRAY['events'],
    category_filter TEXT DEFAULT NULL,
    location_filter TEXT DEFAULT NULL,
    radius_km INTEGER DEFAULT 50
)
RETURNS JSONB AS $$
DECLARE
    facets JSONB := '{}'::jsonb;
BEGIN
    -- Return comprehensive facets
    SELECT jsonb_build_object(
        'categories', jsonb_agg(
            jsonb_build_object(
                'name', category,
                'count', count,
                'selected', category = category_filter
            )
        ),
        'locations', jsonb_agg(
            jsonb_build_object(
                'name', city,
                'count', count,
                'selected', city = location_filter
            )
        ),
        'date_ranges', jsonb_build_array(
            jsonb_build_object('name', 'Today', 'count', today_count),
            jsonb_build_object('name', 'This Week', 'count', week_count),
            jsonb_build_object('name', 'This Month', 'count', month_count)
        )
    ) INTO facets
    FROM (
        SELECT 
            e.category,
            e.city,
            COUNT(*) as count,
            COUNT(CASE WHEN e.start_at::date = CURRENT_DATE THEN 1 END) as today_count,
            COUNT(CASE WHEN e.start_at >= CURRENT_DATE AND e.start_at < CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as week_count,
            COUNT(CASE WHEN e.start_at >= CURRENT_DATE AND e.start_at < CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as month_count
        FROM public.events e
        WHERE 
            e.status = 'published'
            AND e.start_at > NOW()
            AND (category_filter IS NULL OR e.category = category_filter)
            AND (
                search_query = '' OR
                e.title ILIKE '%' || search_query || '%'
                OR e.description ILIKE '%' || search_query || '%'
                OR e.category ILIKE '%' || search_query || '%'
            )
        GROUP BY e.category, e.city
        ORDER BY count DESC
        LIMIT 10
    ) facet_data;

    RETURN facets;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ Create safe indexes (only if they don't exist)
DO $$
BEGIN
    -- Create basic search index if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_enhanced_search') THEN
        RAISE NOTICE 'Creating enhanced search index...';
        CREATE INDEX idx_events_enhanced_search ON public.events(status, visibility, start_at, category) 
        WHERE status = 'published' AND visibility = 'public';
    ELSE
        RAISE NOTICE 'Enhanced search index already exists';
    END IF;
    
    -- Create full-text search index if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_fts_enhanced') THEN
        RAISE NOTICE 'Creating full-text search index...';
        CREATE INDEX idx_events_fts_enhanced ON public.events USING GIN(
            to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, ''))
        );
    ELSE
        RAISE NOTICE 'Full-text search index already exists';
    END IF;
    
    -- Create trigram index for fuzzy search if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_trgm_enhanced') THEN
        RAISE NOTICE 'Creating trigram search index...';
        CREATE INDEX idx_events_trgm_enhanced ON public.events USING GIN(title gin_trgm_ops);
    ELSE
        RAISE NOTICE 'Trigram search index already exists';
    END IF;
END $$;

-- ✅ Test the new functions
DO $$
DECLARE
    test_result RECORD;
    test_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Testing enhanced search functions...';
    
    -- Test enhanced_search_v2
    BEGIN
        SELECT COUNT(*) INTO test_count
        FROM public.enhanced_search_v2('music', ARRAY['events'], NULL, NULL, 50, NULL, NULL, 10, 0, 'relevance', NULL, NULL, NULL, NULL, FALSE, FALSE);
        RAISE NOTICE 'enhanced_search_v2 test: % results found', test_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'enhanced_search_v2 test failed: %', SQLERRM;
    END;
    
    -- Test get_search_suggestions
    BEGIN
        SELECT COUNT(*) INTO test_count
        FROM public.get_search_suggestions('music', 5);
        RAISE NOTICE 'get_search_suggestions test: % suggestions found', test_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'get_search_suggestions test failed: %', SQLERRM;
    END;
    
    -- Test get_trending_searches
    BEGIN
        SELECT COUNT(*) INTO test_count
        FROM public.get_trending_searches(24, 5);
        RAISE NOTICE 'get_trending_searches test: % trending searches found', test_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'get_trending_searches test failed: %', SQLERRM;
    END;
    
    -- Test get_search_facets
    BEGIN
        SELECT public.get_search_facets('music', ARRAY['events'], NULL, NULL, 50) INTO test_result;
        RAISE NOTICE 'get_search_facets test: completed successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'get_search_facets test failed: %', SQLERRM;
    END;
    
    RAISE NOTICE 'Enhanced search function testing completed';
END $$;
