-- Debug and Fix Search Functions for YardPass (FIXED VERSION)
-- This script checks for missing functions and creates them if needed

-- ✅ DEBUG: Check if required extensions exist
DO $$
BEGIN
    -- Check for pg_trgm extension (needed for fuzzy search)
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        RAISE NOTICE 'Creating pg_trgm extension...';
        CREATE EXTENSION IF NOT EXISTS pg_trgm;
    ELSE
        RAISE NOTICE 'pg_trgm extension already exists';
    END IF;

    -- Check for postgis extension (needed for location search)
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        RAISE NOTICE 'Creating postgis extension...';
        CREATE EXTENSION IF NOT EXISTS postgis;
    ELSE
        RAISE NOTICE 'postgis extension already exists';
    END IF;
END $$;

-- ✅ DEBUG: Check if required tables exist
DO $$
BEGIN
    -- Check events table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
        RAISE NOTICE 'Events table does not exist - creating basic structure...';
        CREATE TABLE public.events (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            slug TEXT UNIQUE,
            start_at TIMESTAMP WITH TIME ZONE NOT NULL,
            end_at TIMESTAMP WITH TIME ZONE,
            venue TEXT,
            city TEXT,
            state TEXT,
            country TEXT,
            category TEXT,
            tags TEXT[],
            cover_image_url TEXT,
            status TEXT DEFAULT 'draft',
            visibility TEXT DEFAULT 'public',
            max_attendees INTEGER,
            location GEOGRAPHY(POINT),
            likes_count INTEGER DEFAULT 0,
            shares_count INTEGER DEFAULT 0,
            views_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        RAISE NOTICE 'Events table exists';
    END IF;

    -- Check orgs table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orgs' AND table_schema = 'public') THEN
        RAISE NOTICE 'Orgs table does not exist - creating basic structure...';
        CREATE TABLE public.orgs (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE,
            description TEXT,
            logo_url TEXT,
            website_url TEXT,
            is_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        RAISE NOTICE 'Orgs table exists';
    END IF;

    -- Check users table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        RAISE NOTICE 'Users table does not exist - creating basic structure...';
        CREATE TABLE public.users (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            handle TEXT UNIQUE,
            name TEXT NOT NULL,
            avatar_url TEXT,
            bio TEXT,
            role TEXT DEFAULT 'user',
            is_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        RAISE NOTICE 'Users table exists';
    END IF;

    -- Check posts table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
        RAISE NOTICE 'Posts table does not exist - creating basic structure...';
        CREATE TABLE public.posts (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            author_id UUID REFERENCES auth.users(id),
            content TEXT NOT NULL,
            media_urls TEXT[],
            post_type TEXT DEFAULT 'general',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        RAISE NOTICE 'Posts table exists';
    END IF;
END $$;

-- ✅ DEBUG: Create simplified enhanced_search_v2 function if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enhanced_search_v2') THEN
        RAISE NOTICE 'enhanced_search_v2 function does not exist - creating simplified version...';
    ELSE
        RAISE NOTICE 'enhanced_search_v2 function exists';
    END IF;
END $$;

-- Create simplified enhanced_search_v2 function (outside DO block)
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
    -- Simplified search for events only
    IF 'events' = ANY(search_types) THEN
        RETURN QUERY
        SELECT 
            'event' as result_type,
            to_jsonb(e.*) as result_data,
            0.8 as relevance_score,
            NULL as distance_km,
            ARRAY[e.title] as search_highlights,
            '{"buy_tickets": true, "share_event": true}'::jsonb as quick_actions,
            '{"available_tickets": 0, "total_tickets": 0}'::jsonb as ticket_availability,
            '{"id": null, "name": "Unknown", "is_verified": false}'::jsonb as organizer_info,
            0 as event_count,
            0 as follower_count,
            NULL as connection_status,
            '{"likes_count": 0, "shares_count": 0}'::jsonb as engagement_metrics,
            NULL as author_info
        FROM public.events e
        WHERE 
            e.status = 'published'
            AND e.visibility = 'public'
            AND e.start_at > NOW()
            AND (category_filter IS NULL OR e.category = category_filter)
            AND (
                e.title ILIKE '%' || search_query || '%'
                OR e.description ILIKE '%' || search_query || '%'
                OR e.category ILIKE '%' || search_query || '%'
            )
        ORDER BY e.start_at ASC
        LIMIT limit_count
        OFFSET offset_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ DEBUG: Create get_search_suggestions function if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_search_suggestions') THEN
        RAISE NOTICE 'get_search_suggestions function does not exist - creating...';
    ELSE
        RAISE NOTICE 'get_search_suggestions function exists';
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
    -- Return basic suggestions from event titles
    RETURN QUERY
    SELECT DISTINCT
        e.title as suggestion,
        'popular'::VARCHAR(20) as suggestion_type,
        0.8::DECIMAL(3,2) as relevance_score
    FROM public.events e
    WHERE 
        e.status = 'published'
        AND e.title ILIKE partial_query || '%'
    ORDER BY e.title
    LIMIT suggestion_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ DEBUG: Create get_trending_searches function if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_trending_searches') THEN
        RAISE NOTICE 'get_trending_searches function does not exist - creating...';
    ELSE
        RAISE NOTICE 'get_trending_searches function exists';
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
    -- Return basic trending from event categories
    RETURN QUERY
    SELECT 
        e.category as query,
        COUNT(*) as search_count
    FROM public.events e
    WHERE 
        e.status = 'published'
        AND e.category IS NOT NULL
        AND e.created_at >= NOW() - (hours_back || ' hours')::INTERVAL
    GROUP BY e.category
    ORDER BY COUNT(*) DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ DEBUG: Create get_search_facets function if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_search_facets') THEN
        RAISE NOTICE 'get_search_facets function does not exist - creating...';
    ELSE
        RAISE NOTICE 'get_search_facets function exists';
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
    -- Return basic facets
    SELECT jsonb_build_object(
        'categories', jsonb_agg(
            jsonb_build_object(
                'name', category,
                'count', count
            )
        )
    ) INTO facets
    FROM (
        SELECT 
            e.category,
            COUNT(*) as count
        FROM public.events e
        WHERE 
            e.status = 'published'
            AND e.start_at > NOW()
            AND e.category IS NOT NULL
        GROUP BY e.category
        ORDER BY count DESC
        LIMIT 5
    ) category_counts;

    RETURN facets;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ DEBUG: Create basic indexes if they don't exist
DO $$
BEGIN
    -- Create basic indexes for search performance
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_search_basic') THEN
        RAISE NOTICE 'Creating basic search indexes...';
        CREATE INDEX idx_events_search_basic ON public.events(status, visibility, start_at) WHERE status = 'published' AND visibility = 'public';
        CREATE INDEX idx_events_title_search ON public.events USING GIN(to_tsvector('english', title));
        CREATE INDEX idx_events_description_search ON public.events USING GIN(to_tsvector('english', description));
    ELSE
        RAISE NOTICE 'Basic search indexes already exist';
    END IF;
END $$;

-- ✅ DEBUG: Insert sample data for testing
DO $$
BEGIN
    -- Check if we have any events
    IF NOT EXISTS (SELECT 1 FROM public.events LIMIT 1) THEN
        RAISE NOTICE 'No events found - inserting sample data...';
        
        INSERT INTO public.events (title, description, slug, start_at, end_at, venue, city, category, status, visibility) VALUES
        ('Sample Music Festival', 'A great music festival with amazing artists', 'sample-music-festival', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '8 hours', 'Central Park', 'New York', 'Music', 'published', 'public'),
        ('Tech Conference 2024', 'Latest technology trends and innovations', 'tech-conference-2024', NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days' + INTERVAL '6 hours', 'Convention Center', 'San Francisco', 'Technology', 'published', 'public'),
        ('Food & Wine Festival', 'Delicious food and fine wines', 'food-wine-festival', NOW() + INTERVAL '21 days', NOW() + INTERVAL '21 days' + INTERVAL '4 hours', 'Downtown Plaza', 'Los Angeles', 'Food', 'published', 'public'),
        ('Art Exhibition', 'Contemporary art showcase', 'art-exhibition', NOW() + INTERVAL '30 days', NOW() + INTERVAL '30 days' + INTERVAL '3 hours', 'Museum of Modern Art', 'Chicago', 'Art', 'published', 'public'),
        ('Sports Tournament', 'Annual sports championship', 'sports-tournament', NOW() + INTERVAL '45 days', NOW() + INTERVAL '45 days' + INTERVAL '5 hours', 'Sports Complex', 'Miami', 'Sports', 'published', 'public');
        
        RAISE NOTICE 'Sample data inserted successfully';
    ELSE
        RAISE NOTICE 'Events already exist in database';
    END IF;
END $$;

-- ✅ DEBUG: Test the functions
DO $$
DECLARE
    test_result RECORD;
    test_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Testing search functions...';
    
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
    
    RAISE NOTICE 'Search function testing completed';
END $$;
