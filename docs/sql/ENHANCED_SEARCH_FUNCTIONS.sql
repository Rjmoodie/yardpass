-- Enhanced Search & Discovery Functions for YardPass
-- Comprehensive search system with advanced features and performance optimizations

-- ✅ ENHANCED: Advanced search function with multiple filters and sorting
CREATE OR REPLACE FUNCTION public.enhanced_search_v2(
    search_query TEXT,
    search_types TEXT[] DEFAULT ARRAY['events', 'organizations', 'users', 'posts'],
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
DECLARE
    search_tsquery TSQUERY;
    location_point GEOGRAPHY;
    results RECORD;
BEGIN
    -- Create full-text search query
    search_tsquery := plainto_tsquery('english', search_query);
    
    -- Parse location if provided
    IF location_filter IS NOT NULL THEN
        location_point := ST_GeomFromText('POINT(' || location_filter || ')', 4326)::geography;
    END IF;

    -- Search Events
    IF 'events' = ANY(search_types) THEN
        FOR results IN
            SELECT 
                'event' as result_type,
                jsonb_build_object(
                    'id', e.id,
                    'title', e.title,
                    'description', e.description,
                    'slug', e.slug,
                    'start_at', e.start_at,
                    'end_at', e.end_at,
                    'venue', e.venue,
                    'city', e.city,
                    'state', e.state,
                    'country', e.country,
                    'category', e.category,
                    'tags', e.tags,
                    'cover_image_url', e.cover_image_url,
                    'status', e.status,
                    'visibility', e.visibility,
                    'max_attendees', e.max_attendees,
                    'created_at', e.created_at,
                    'updated_at', e.updated_at
                ) as result_data,
                calculate_search_relevance_v2(
                    search_query, 
                    e.title, 
                    e.description, 
                    e.category,
                    o.is_verified,
                    COALESCE(e.likes_count, 0) + COALESCE(e.shares_count, 0) + COALESCE(e.views_count, 0)
                ) as relevance_score,
                CASE 
                    WHEN location_point IS NOT NULL AND e.location IS NOT NULL 
                    THEN ST_Distance(location_point, e.location) / 1000
                    ELSE NULL 
                END as distance_km,
                ARRAY[
                    CASE WHEN e.title ILIKE '%' || search_query || '%' THEN e.title ELSE NULL END,
                    CASE WHEN e.description ILIKE '%' || search_query || '%' THEN substring(e.description from 1 for 100) ELSE NULL END
                ] as search_highlights,
                jsonb_build_object(
                    'buy_tickets', CASE WHEN e.status = 'published' THEN true ELSE false END,
                    'share_event', true,
                    'follow_organizer', true,
                    'add_to_calendar', true
                ) as quick_actions,
                jsonb_build_object(
                    'available_tickets', COALESCE(e.max_attendees, 0) - COALESCE(tickets_sold.total_sold, 0),
                    'total_tickets', COALESCE(e.max_attendees, 0),
                    'ticket_tiers', COALESCE(ticket_tiers.tiers, '[]'::jsonb)
                ) as ticket_availability,
                jsonb_build_object(
                    'id', o.id,
                    'name', o.name,
                    'slug', o.slug,
                    'logo_url', o.logo_url,
                    'is_verified', o.is_verified
                ) as organizer_info
            FROM public.events e
            LEFT JOIN public.orgs o ON e.org_id = o.id
            LEFT JOIN (
                SELECT event_id, SUM(quantity_sold) as total_sold
                FROM public.tickets
                WHERE is_active = true
                GROUP BY event_id
            ) tickets_sold ON e.id = tickets_sold.event_id
            LEFT JOIN (
                SELECT event_id, jsonb_agg(
                    jsonb_build_object(
                        'id', id,
                        'name', name,
                        'price', price,
                        'quantity_available', quantity_available
                    )
                ) as tiers
                FROM public.tickets
                WHERE is_active = true
                GROUP BY event_id
            ) ticket_tiers ON e.id = ticket_tiers.event_id
            WHERE 
                (e.status = 'published' OR include_past_events = true)
                AND (category_filter IS NULL OR e.category = category_filter)
                AND (organizer_filter IS NULL OR e.org_id = organizer_filter)
                AND (verified_only = FALSE OR o.is_verified = TRUE)
                AND (date_from IS NULL OR e.start_at >= date_from)
                AND (date_to IS NULL OR e.start_at <= date_to)
                AND (price_min IS NULL OR EXISTS (
                    SELECT 1 FROM public.tickets t 
                    WHERE t.event_id = e.id AND t.price >= price_min
                ))
                AND (price_max IS NULL OR EXISTS (
                    SELECT 1 FROM public.tickets t 
                    WHERE t.event_id = e.id AND t.price <= price_max
                ))
                AND (tags_filter IS NULL OR e.tags && tags_filter)
                AND (
                    to_tsvector('english', e.title || ' ' || COALESCE(e.description, '') || ' ' || COALESCE(e.category, '')) @@ search_tsquery
                    OR e.title ILIKE '%' || search_query || '%'
                    OR e.description ILIKE '%' || search_query || '%'
                    OR e.category ILIKE '%' || search_query || '%'
                )
                AND (location_point IS NULL OR e.location IS NULL OR ST_DWithin(location_point, e.location, radius_km * 1000))
            ORDER BY 
                CASE sort_by
                    WHEN 'relevance' THEN calculate_search_relevance_v2(search_query, e.title, e.description, e.category, o.is_verified, COALESCE(e.likes_count, 0))
                    WHEN 'date' THEN EXTRACT(EPOCH FROM e.start_at)
                    WHEN 'popularity' THEN COALESCE(e.likes_count, 0) + COALESCE(e.shares_count, 0) + COALESCE(e.views_count, 0)
                    WHEN 'distance' THEN ST_Distance(location_point, e.location)
                    ELSE calculate_search_relevance_v2(search_query, e.title, e.description, e.category, o.is_verified, COALESCE(e.likes_count, 0))
                END DESC
            LIMIT limit_count
            OFFSET offset_count
        LOOP
            RETURN NEXT results;
        END LOOP;
    END IF;

    -- Search Organizations
    IF 'organizations' = ANY(search_types) THEN
        FOR results IN
            SELECT 
                'organization' as result_type,
                jsonb_build_object(
                    'id', o.id,
                    'name', o.name,
                    'slug', o.slug,
                    'description', o.description,
                    'logo_url', o.logo_url,
                    'website_url', o.website_url,
                    'is_verified', o.is_verified,
                    'created_at', o.created_at,
                    'updated_at', o.updated_at
                ) as result_data,
                calculate_search_relevance_v2(
                    search_query, 
                    o.name, 
                    o.description, 
                    NULL,
                    o.is_verified,
                    COALESCE(org_stats.follower_count, 0) + COALESCE(org_stats.event_count, 0)
                ) as relevance_score,
                NULL as distance_km,
                ARRAY[
                    CASE WHEN o.name ILIKE '%' || search_query || '%' THEN o.name ELSE NULL END,
                    CASE WHEN o.description ILIKE '%' || search_query || '%' THEN substring(o.description from 1 for 100) ELSE NULL END
                ] as search_highlights,
                jsonb_build_object(
                    'follow_organizer', true,
                    'view_events', true,
                    'contact_organizer', true
                ) as quick_actions,
                NULL as ticket_availability,
                NULL as organizer_info,
                COALESCE(org_stats.event_count, 0) as event_count,
                COALESCE(org_stats.follower_count, 0) as follower_count,
                NULL as connection_status,
                NULL as engagement_metrics,
                NULL as author_info
            FROM public.orgs o
            LEFT JOIN (
                SELECT 
                    org_id,
                    COUNT(*) as event_count,
                    COUNT(DISTINCT follower_id) as follower_count
                FROM public.events e
                LEFT JOIN public.follows f ON e.org_id = f.organizer_id
                WHERE e.status = 'published'
                GROUP BY org_id
            ) org_stats ON o.id = org_stats.org_id
            WHERE 
                (verified_only = FALSE OR o.is_verified = TRUE)
                AND (
                    to_tsvector('english', o.name || ' ' || COALESCE(o.description, '')) @@ search_tsquery
                    OR o.name ILIKE '%' || search_query || '%'
                    OR o.description ILIKE '%' || search_query || '%'
                )
            ORDER BY 
                CASE sort_by
                    WHEN 'relevance' THEN calculate_search_relevance_v2(search_query, o.name, o.description, NULL, o.is_verified, COALESCE(org_stats.follower_count, 0))
                    WHEN 'date' THEN EXTRACT(EPOCH FROM o.created_at)
                    WHEN 'popularity' THEN COALESCE(org_stats.follower_count, 0) + COALESCE(org_stats.event_count, 0)
                    ELSE calculate_search_relevance_v2(search_query, o.name, o.description, NULL, o.is_verified, COALESCE(org_stats.follower_count, 0))
                END DESC
            LIMIT limit_count
            OFFSET offset_count
        LOOP
            RETURN NEXT results;
        END LOOP;
    END IF;

    -- Search Users
    IF 'users' = ANY(search_types) THEN
        FOR results IN
            SELECT 
                'user' as result_type,
                jsonb_build_object(
                    'id', u.id,
                    'handle', u.handle,
                    'name', u.name,
                    'avatar_url', u.avatar_url,
                    'bio', u.bio,
                    'role', u.role,
                    'is_verified', u.is_verified,
                    'created_at', u.created_at,
                    'updated_at', u.updated_at
                ) as result_data,
                calculate_search_relevance_v2(
                    search_query, 
                    u.name, 
                    u.bio, 
                    NULL,
                    u.is_verified,
                    COALESCE(user_stats.event_count, 0)
                ) as relevance_score,
                NULL as distance_km,
                ARRAY[
                    CASE WHEN u.name ILIKE '%' || search_query || '%' THEN u.name ELSE NULL END,
                    CASE WHEN u.bio ILIKE '%' || search_query || '%' THEN substring(u.bio from 1 for 100) ELSE NULL END
                ] as search_highlights,
                jsonb_build_object(
                    'follow_user', true,
                    'view_profile', true,
                    'send_message', true
                ) as quick_actions,
                NULL as ticket_availability,
                NULL as organizer_info,
                COALESCE(user_stats.event_count, 0) as event_count,
                NULL as follower_count,
                COALESCE(connection_status.status, 'none') as connection_status,
                NULL as engagement_metrics,
                NULL as author_info
            FROM public.users u
            LEFT JOIN (
                SELECT 
                    user_id,
                    COUNT(*) as event_count
                FROM public.events e
                WHERE e.status = 'published'
                GROUP BY user_id
            ) user_stats ON u.id = user_stats.user_id
            LEFT JOIN (
                SELECT 
                    connected_user_id,
                    CASE 
                        WHEN status = 'accepted' THEN 'connected'
                        WHEN status = 'pending' THEN 'pending'
                        ELSE 'none'
                    END as status
                FROM public.user_connections
                WHERE user_id = (SELECT id FROM auth.users WHERE id = u.id LIMIT 1)
            ) connection_status ON u.id = connection_status.connected_user_id
            WHERE 
                (verified_only = FALSE OR u.is_verified = TRUE)
                AND (
                    to_tsvector('english', u.name || ' ' || COALESCE(u.bio, '') || ' ' || u.handle) @@ search_tsquery
                    OR u.name ILIKE '%' || search_query || '%'
                    OR u.handle ILIKE '%' || search_query || '%'
                    OR u.bio ILIKE '%' || search_query || '%'
                )
            ORDER BY 
                CASE sort_by
                    WHEN 'relevance' THEN calculate_search_relevance_v2(search_query, u.name, u.bio, NULL, u.is_verified, COALESCE(user_stats.event_count, 0))
                    WHEN 'date' THEN EXTRACT(EPOCH FROM u.created_at)
                    WHEN 'popularity' THEN COALESCE(user_stats.event_count, 0)
                    ELSE calculate_search_relevance_v2(search_query, u.name, u.bio, NULL, u.is_verified, COALESCE(user_stats.event_count, 0))
                END DESC
            LIMIT limit_count
            OFFSET offset_count
        LOOP
            RETURN NEXT results;
        END LOOP;
    END IF;

    -- Search Posts
    IF 'posts' = ANY(search_types) THEN
        FOR results IN
            SELECT 
                'post' as result_type,
                jsonb_build_object(
                    'id', p.id,
                    'content', p.content,
                    'media_urls', p.media_urls,
                    'post_type', p.post_type,
                    'created_at', p.created_at,
                    'updated_at', p.updated_at
                ) as result_data,
                calculate_search_relevance_v2(
                    search_query, 
                    p.content, 
                    NULL, 
                    NULL,
                    FALSE,
                    COALESCE(post_stats.likes_count, 0) + COALESCE(post_stats.comments_count, 0)
                ) as relevance_score,
                NULL as distance_km,
                ARRAY[
                    CASE WHEN p.content ILIKE '%' || search_query || '%' THEN substring(p.content from 1 for 100) ELSE NULL END
                ] as search_highlights,
                jsonb_build_object(
                    'like_post', true,
                    'comment_post', true,
                    'share_post', true
                ) as quick_actions,
                NULL as ticket_availability,
                NULL as organizer_info,
                NULL as event_count,
                NULL as follower_count,
                NULL as connection_status,
                jsonb_build_object(
                    'likes_count', COALESCE(post_stats.likes_count, 0),
                    'comments_count', COALESCE(post_stats.comments_count, 0),
                    'shares_count', COALESCE(post_stats.shares_count, 0)
                ) as engagement_metrics,
                jsonb_build_object(
                    'id', u.id,
                    'name', u.name,
                    'handle', u.handle,
                    'avatar_url', u.avatar_url,
                    'is_verified', u.is_verified
                ) as author_info
            FROM public.posts p
            LEFT JOIN public.users u ON p.author_id = u.id
            LEFT JOIN (
                SELECT 
                    post_id,
                    COUNT(*) FILTER (WHERE reaction_type = 'like') as likes_count,
                    COUNT(*) FILTER (WHERE reaction_type = 'comment') as comments_count,
                    COUNT(*) FILTER (WHERE reaction_type = 'share') as shares_count
                FROM public.reactions
                GROUP BY post_id
            ) post_stats ON p.id = post_stats.post_id
            WHERE 
                p.is_active = true
                AND (
                    to_tsvector('english', p.content) @@ search_tsquery
                    OR p.content ILIKE '%' || search_query || '%'
                )
            ORDER BY 
                CASE sort_by
                    WHEN 'relevance' THEN calculate_search_relevance_v2(search_query, p.content, NULL, NULL, FALSE, COALESCE(post_stats.likes_count, 0))
                    WHEN 'date' THEN EXTRACT(EPOCH FROM p.created_at)
                    WHEN 'popularity' THEN COALESCE(post_stats.likes_count, 0) + COALESCE(post_stats.comments_count, 0)
                    ELSE calculate_search_relevance_v2(search_query, p.content, NULL, NULL, FALSE, COALESCE(post_stats.likes_count, 0))
                END DESC
            LIMIT limit_count
            OFFSET offset_count
        LOOP
            RETURN NEXT results;
        END LOOP;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ ENHANCED: Improved relevance scoring function
CREATE OR REPLACE FUNCTION public.calculate_search_relevance_v2(
    search_query TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    popularity_score INTEGER DEFAULT 0
)
RETURNS DECIMAL(5,4) AS $$
DECLARE
    relevance_score DECIMAL(5,4) := 0.0;
    search_tsquery TSQUERY;
    title_match BOOLEAN := FALSE;
    description_match BOOLEAN := FALSE;
    category_match BOOLEAN := FALSE;
    exact_match BOOLEAN := FALSE;
BEGIN
    -- Create full-text search query
    search_tsquery := plainto_tsquery('english', search_query);
    
    -- Title match (highest weight - 40%)
    IF title IS NOT NULL THEN
        IF to_tsvector('english', title) @@ search_tsquery THEN
            relevance_score := relevance_score + 0.4;
            title_match := TRUE;
        END IF;
        
        -- Exact title match bonus
        IF title ILIKE search_query OR title ILIKE search_query || '%' THEN
            relevance_score := relevance_score + 0.15;
            exact_match := TRUE;
        END IF;
        
        -- Partial title match
        IF title ILIKE '%' || search_query || '%' THEN
            relevance_score := relevance_score + 0.1;
        END IF;
    END IF;
    
    -- Description match (30%)
    IF description IS NOT NULL THEN
        IF to_tsvector('english', description) @@ search_tsquery THEN
            relevance_score := relevance_score + 0.3;
            description_match := TRUE;
        END IF;
        
        -- Partial description match
        IF description ILIKE '%' || search_query || '%' THEN
            relevance_score := relevance_score + 0.1;
        END IF;
    END IF;
    
    -- Category match (20%)
    IF category IS NOT NULL AND category ILIKE '%' || search_query || '%' THEN
        relevance_score := relevance_score + 0.2;
        category_match := TRUE;
    END IF;
    
    -- Verification bonus (5%)
    IF is_verified THEN
        relevance_score := relevance_score + 0.05;
    END IF;
    
    -- Popularity bonus (5%)
    relevance_score := relevance_score + LEAST(popularity_score::DECIMAL / 1000, 0.05);
    
    -- Recency bonus for recent content (5%)
    IF title_match OR description_match THEN
        relevance_score := relevance_score + 0.05;
    END IF;
    
    RETURN LEAST(relevance_score, 1.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ✅ NEW: Search facets function for filtering
CREATE OR REPLACE FUNCTION public.get_search_facets(
    search_query TEXT,
    search_types TEXT[] DEFAULT ARRAY['events', 'organizations', 'users', 'posts'],
    category_filter TEXT DEFAULT NULL,
    location_filter TEXT DEFAULT NULL,
    radius_km INTEGER DEFAULT 50
)
RETURNS JSONB AS $$
DECLARE
    facets JSONB := '{}'::jsonb;
    search_tsquery TSQUERY;
    location_point GEOGRAPHY;
BEGIN
    search_tsquery := plainto_tsquery('english', search_query);
    
    IF location_filter IS NOT NULL THEN
        location_point := ST_GeomFromText('POINT(' || location_filter || ')', 4326)::geography;
    END IF;

    -- Categories facet
    IF 'events' = ANY(search_types) THEN
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
                e.category as category,
                COUNT(*) as count
            FROM public.events e
            WHERE 
                e.status = 'published'
                AND e.category IS NOT NULL
                AND (
                    to_tsvector('english', e.title || ' ' || COALESCE(e.description, '') || ' ' || COALESCE(e.category, '')) @@ search_tsquery
                    OR e.title ILIKE '%' || search_query || '%'
                    OR e.description ILIKE '%' || search_query || '%'
                    OR e.category ILIKE '%' || search_query || '%'
                )
                AND (location_point IS NULL OR e.location IS NULL OR ST_DWithin(location_point, e.location, radius_km * 1000))
            GROUP BY e.category
            ORDER BY count DESC
            LIMIT 10
        ) category_counts;
    END IF;

    -- Locations facet
    SELECT jsonb_build_object(
        'locations', jsonb_agg(
            jsonb_build_object(
                'name', city,
                'count', count
            )
        )
    ) INTO facets
    FROM (
        SELECT 
            e.city,
            COUNT(*) as count
        FROM public.events e
        WHERE 
            e.status = 'published'
            AND e.city IS NOT NULL
            AND (
                to_tsvector('english', e.title || ' ' || COALESCE(e.description, '') || ' ' || COALESCE(e.category, '')) @@ search_tsquery
                OR e.title ILIKE '%' || search_query || '%'
                OR e.description ILIKE '%' || search_query || '%'
                OR e.category ILIKE '%' || search_query || '%'
            )
            AND (location_point IS NULL OR e.location IS NULL OR ST_DWithin(location_point, e.location, radius_km * 1000))
        GROUP BY e.city
        ORDER BY count DESC
        LIMIT 10
    ) location_counts;

    -- Price ranges facet
    SELECT jsonb_build_object(
        'price_ranges', jsonb_agg(
            jsonb_build_object(
                'range', price_range,
                'count', count
            )
        )
    ) INTO facets
    FROM (
        SELECT 
            CASE 
                WHEN MIN(t.price) = 0 AND MAX(t.price) = 0 THEN 'Free'
                WHEN MAX(t.price) <= 25 THEN 'Under $25'
                WHEN MAX(t.price) <= 50 THEN '$25 - $50'
                WHEN MAX(t.price) <= 100 THEN '$50 - $100'
                WHEN MAX(t.price) <= 200 THEN '$100 - $200'
                ELSE 'Over $200'
            END as price_range,
            COUNT(DISTINCT e.id) as count
        FROM public.events e
        JOIN public.tickets t ON e.id = t.event_id
        WHERE 
            e.status = 'published'
            AND t.is_active = true
            AND (
                to_tsvector('english', e.title || ' ' || COALESCE(e.description, '') || ' ' || COALESCE(e.category, '')) @@ search_tsquery
                OR e.title ILIKE '%' || search_query || '%'
                OR e.description ILIKE '%' || search_query || '%'
                OR e.category ILIKE '%' || search_query || '%'
            )
            AND (location_point IS NULL OR e.location IS NULL OR ST_DWithin(location_point, e.location, radius_km * 1000))
        GROUP BY 
            CASE 
                WHEN MIN(t.price) = 0 AND MAX(t.price) = 0 THEN 'Free'
                WHEN MAX(t.price) <= 25 THEN 'Under $25'
                WHEN MAX(t.price) <= 50 THEN '$25 - $50'
                WHEN MAX(t.price) <= 100 THEN '$50 - $100'
                WHEN MAX(t.price) <= 200 THEN '$100 - $200'
                ELSE 'Over $200'
            END
        ORDER BY count DESC
    ) price_counts;

    -- Date ranges facet
    SELECT jsonb_build_object(
        'dates', jsonb_agg(
            jsonb_build_object(
                'range', date_range,
                'count', count
            )
        )
    ) INTO facets
    FROM (
        SELECT 
            CASE 
                WHEN e.start_at <= NOW() + INTERVAL '7 days' THEN 'This Week'
                WHEN e.start_at <= NOW() + INTERVAL '30 days' THEN 'This Month'
                WHEN e.start_at <= NOW() + INTERVAL '90 days' THEN 'Next 3 Months'
                WHEN e.start_at <= NOW() + INTERVAL '180 days' THEN 'Next 6 Months'
                ELSE 'Future'
            END as date_range,
            COUNT(*) as count
        FROM public.events e
        WHERE 
            e.status = 'published'
            AND e.start_at > NOW()
            AND (
                to_tsvector('english', e.title || ' ' || COALESCE(e.description, '') || ' ' || COALESCE(e.category, '')) @@ search_tsquery
                OR e.title ILIKE '%' || search_query || '%'
                OR e.description ILIKE '%' || search_query || '%'
                OR e.category ILIKE '%' || search_query || '%'
            )
            AND (location_point IS NULL OR e.location IS NULL OR ST_DWithin(location_point, e.location, radius_km * 1000))
        GROUP BY 
            CASE 
                WHEN e.start_at <= NOW() + INTERVAL '7 days' THEN 'This Week'
                WHEN e.start_at <= NOW() + INTERVAL '30 days' THEN 'This Month'
                WHEN e.start_at <= NOW() + INTERVAL '90 days' THEN 'Next 3 Months'
                WHEN e.start_at <= NOW() + INTERVAL '180 days' THEN 'Next 6 Months'
                ELSE 'Future'
            END
        ORDER BY count DESC
    ) date_counts;

    RETURN facets;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ NEW: Enhanced search analytics logging
CREATE OR REPLACE FUNCTION public.log_search_analytics_v2(
    p_user_id UUID,
    p_query TEXT,
    p_search_types TEXT[],
    p_results_count INTEGER,
    p_search_time_ms INTEGER,
    p_filters_applied JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.search_logs (
        user_id,
        query,
        search_types,
        results_count,
        search_duration_ms,
        filters_applied,
        created_at
    ) VALUES (
        p_user_id,
        p_query,
        p_search_types,
        p_results_count,
        p_search_time_ms,
        p_filters_applied,
        NOW()
    );
    
    -- Update search suggestions usage
    INSERT INTO public.search_suggestions (query, suggestion_type, usage_count, last_used)
    VALUES (p_query, 'popular', 1, NOW())
    ON CONFLICT (query) 
    DO UPDATE SET 
        usage_count = search_suggestions.usage_count + 1,
        last_used = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ NEW: Get related searches function
CREATE OR REPLACE FUNCTION public.get_related_searches(
    base_query TEXT,
    limit_count INTEGER DEFAULT 3
)
RETURNS TABLE (
    related_query TEXT,
    relevance_score DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.query as related_query,
        ss.relevance_score
    FROM public.search_suggestions ss
    WHERE 
        ss.query != base_query
        AND (
            ss.query ILIKE base_query || '%'
            OR ss.query ILIKE '%' || base_query
            OR ss.query % base_query  -- Trigram similarity
        )
    ORDER BY ss.relevance_score DESC, ss.usage_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ NEW: Get trending searches function
CREATE OR REPLACE FUNCTION public.get_trending_searches(
    hours_back INTEGER DEFAULT 24,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    query TEXT,
    search_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.query,
        COUNT(*) as search_count
    FROM public.search_logs sl
    WHERE 
        sl.created_at >= NOW() - (hours_back || ' hours')::INTERVAL
        AND sl.query IS NOT NULL
        AND LENGTH(sl.query) >= 2
    GROUP BY sl.query
    ORDER BY search_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ NEW: Enhanced search suggestions function
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
    RETURN QUERY
    SELECT 
        ss.query as suggestion,
        ss.suggestion_type,
        ss.relevance_score
    FROM public.search_suggestions ss
    WHERE 
        ss.query ILIKE partial_query || '%'
        AND ss.usage_count > 0
    ORDER BY 
        CASE 
            WHEN ss.query = partial_query THEN 1
            WHEN ss.query ILIKE partial_query || '%' THEN 2
            ELSE 3
        END,
        ss.relevance_score DESC, 
        ss.usage_count DESC
    LIMIT suggestion_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ NEW: Indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_events_search_fts ON public.events USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, '')));
CREATE INDEX IF NOT EXISTS idx_orgs_search_fts ON public.orgs USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_users_search_fts ON public.users USING GIN(to_tsvector('english', name || ' ' || COALESCE(bio, '') || ' ' || handle));
CREATE INDEX IF NOT EXISTS idx_posts_search_fts ON public.posts USING GIN(to_tsvector('english', content));

-- ✅ NEW: Trigram indexes for fuzzy search
CREATE INDEX IF NOT EXISTS idx_events_title_trgm ON public.events USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_description_trgm ON public.events USING GIN(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orgs_name_trgm ON public.orgs USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON public.users USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_handle_trgm ON public.users USING GIN(handle gin_trgm_ops);

-- ✅ NEW: Composite indexes for filtered searches
CREATE INDEX IF NOT EXISTS idx_events_status_category ON public.events(status, category) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_events_start_at_status ON public.events(start_at, status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_events_location_status ON public.events USING GIST(location, status) WHERE status = 'published';

-- ✅ NEW: Search cache table
CREATE TABLE IF NOT EXISTS public.search_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    query_hash TEXT UNIQUE NOT NULL,
    search_query TEXT NOT NULL,
    search_types TEXT[] NOT NULL,
    results JSONB NOT NULL,
    facets JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_cache_query_hash ON public.search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON public.search_cache(expires_at);

-- ✅ NEW: Search logs table for analytics
CREATE TABLE IF NOT EXISTS public.search_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    search_types TEXT[] NOT NULL,
    results_count INTEGER NOT NULL,
    search_duration_ms INTEGER NOT NULL,
    filters_applied JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON public.search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON public.search_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON public.search_logs(query);

-- ✅ NEW: Search suggestions table
CREATE TABLE IF NOT EXISTS public.search_suggestions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    query TEXT UNIQUE NOT NULL,
    suggestion_type VARCHAR(20) NOT NULL CHECK (suggestion_type IN ('trending', 'popular', 'related')),
    relevance_score DECIMAL(3,2) DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_suggestions_query ON public.search_suggestions(query);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_usage ON public.search_suggestions(usage_count DESC, last_used DESC);
