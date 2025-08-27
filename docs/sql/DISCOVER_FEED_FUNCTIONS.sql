-- Enhanced Discover Feed Functions for YardPass
-- Personalized event discovery with trending content and recommendations

-- ✅ NEW: Get trending events function
CREATE OR REPLACE FUNCTION public.get_trending_events(
    hours_back INTEGER DEFAULT 24,
    limit_count INTEGER DEFAULT 10,
    location_filter TEXT DEFAULT NULL,
    radius_km INTEGER DEFAULT 50,
    categories_filter TEXT[] DEFAULT NULL,
    price_min DECIMAL(10,2) DEFAULT NULL,
    price_max DECIMAL(10,2) DEFAULT NULL,
    date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    slug TEXT,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    venue TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    category TEXT,
    tags TEXT[],
    cover_image_url TEXT,
    status TEXT,
    visibility TEXT,
    max_attendees INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    relevance_score DECIMAL(5,4),
    trending_score DECIMAL(5,4),
    distance_km DECIMAL(8,2),
    ticket_availability JSONB,
    organizer_info JSONB,
    engagement_metrics JSONB
) AS $$
DECLARE
    location_point GEOGRAPHY;
BEGIN
    -- Parse location if provided
    IF location_filter IS NOT NULL THEN
        location_point := ST_GeomFromText('POINT(' || location_filter || ')', 4326)::geography;
    END IF;

    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.slug,
        e.start_at,
        e.end_at,
        e.venue,
        e.city,
        e.state,
        e.country,
        e.category,
        e.tags,
        e.cover_image_url,
        e.status,
        e.visibility,
        e.max_attendees,
        e.created_at,
        e.updated_at,
        0.8 as relevance_score, -- High relevance for trending
        calculate_trending_score(
            COALESCE(e.likes_count, 0),
            COALESCE(e.shares_count, 0),
            COALESCE(e.views_count, 0),
            COALESCE(tickets_sold.total_sold, 0),
            e.start_at,
            hours_back
        ) as trending_score,
        CASE 
            WHEN location_point IS NOT NULL AND e.location IS NOT NULL 
            THEN ST_Distance(location_point, e.location) / 1000
            ELSE NULL 
        END as distance_km,
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
        ) as organizer_info,
        jsonb_build_object(
            'likes_count', COALESCE(e.likes_count, 0),
            'shares_count', COALESCE(e.shares_count, 0),
            'views_count', COALESCE(e.views_count, 0),
            'tickets_sold', COALESCE(tickets_sold.total_sold, 0)
        ) as engagement_metrics
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
        e.status = 'published'
        AND e.visibility = 'public'
        AND e.start_at > NOW()
        AND (categories_filter IS NULL OR e.category = ANY(categories_filter))
        AND (price_min IS NULL OR EXISTS (
            SELECT 1 FROM public.tickets t 
            WHERE t.event_id = e.id AND t.price >= price_min
        ))
        AND (price_max IS NULL OR EXISTS (
            SELECT 1 FROM public.tickets t 
            WHERE t.event_id = e.id AND t.price <= price_max
        ))
        AND (date_from IS NULL OR e.start_at >= date_from)
        AND (date_to IS NULL OR e.start_at <= date_to)
        AND (location_point IS NULL OR e.location IS NULL OR ST_DWithin(location_point, e.location, radius_km * 1000))
    ORDER BY 
        calculate_trending_score(
            COALESCE(e.likes_count, 0),
            COALESCE(e.shares_count, 0),
            COALESCE(e.views_count, 0),
            COALESCE(tickets_sold.total_sold, 0),
            e.start_at,
            hours_back
        ) DESC,
        e.start_at ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ NEW: Get personalized recommendations function
CREATE OR REPLACE FUNCTION public.get_personalized_recommendations(
    p_user_id UUID,
    limit_count INTEGER DEFAULT 10,
    location_filter TEXT DEFAULT NULL,
    radius_km INTEGER DEFAULT 50,
    categories_filter TEXT[] DEFAULT NULL,
    price_min DECIMAL(10,2) DEFAULT NULL,
    price_max DECIMAL(10,2) DEFAULT NULL,
    date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    slug TEXT,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    venue TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    category TEXT,
    tags TEXT[],
    cover_image_url TEXT,
    status TEXT,
    visibility TEXT,
    max_attendees INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    relevance_score DECIMAL(5,4),
    trending_score DECIMAL(5,4),
    distance_km DECIMAL(8,2),
    ticket_availability JSONB,
    organizer_info JSONB,
    engagement_metrics JSONB
) AS $$
DECLARE
    location_point GEOGRAPHY;
    user_interests TEXT[];
    user_preferences JSONB;
BEGIN
    -- Parse location if provided
    IF location_filter IS NOT NULL THEN
        location_point := ST_GeomFromText('POINT(' || location_filter || ')', 4326)::geography;
    END IF;

    -- Get user interests
    SELECT ARRAY_AGG(category) INTO user_interests
    FROM public.user_interests
    WHERE user_id = p_user_id AND interest_score > 0.5;

    -- Get user preferences
    SELECT preferences INTO user_preferences
    FROM public.user_preferences
    WHERE user_id = p_user_id;

    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.slug,
        e.start_at,
        e.end_at,
        e.venue,
        e.city,
        e.state,
        e.country,
        e.category,
        e.tags,
        e.cover_image_url,
        e.status,
        e.visibility,
        e.max_attendees,
        e.created_at,
        e.updated_at,
        calculate_personalization_score(
            e.category,
            e.start_at,
            e.city,
            user_interests,
            user_preferences,
            location_point,
            e.location
        ) as relevance_score,
        calculate_trending_score(
            COALESCE(e.likes_count, 0),
            COALESCE(e.shares_count, 0),
            COALESCE(e.views_count, 0),
            COALESCE(tickets_sold.total_sold, 0),
            e.start_at,
            24
        ) as trending_score,
        CASE 
            WHEN location_point IS NOT NULL AND e.location IS NOT NULL 
            THEN ST_Distance(location_point, e.location) / 1000
            ELSE NULL 
        END as distance_km,
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
        ) as organizer_info,
        jsonb_build_object(
            'likes_count', COALESCE(e.likes_count, 0),
            'shares_count', COALESCE(e.shares_count, 0),
            'views_count', COALESCE(e.views_count, 0),
            'tickets_sold', COALESCE(tickets_sold.total_sold, 0)
        ) as engagement_metrics
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
        e.status = 'published'
        AND e.visibility = 'public'
        AND e.start_at > NOW()
        AND (categories_filter IS NULL OR e.category = ANY(categories_filter))
        AND (price_min IS NULL OR EXISTS (
            SELECT 1 FROM public.tickets t 
            WHERE t.event_id = e.id AND t.price >= price_min
        ))
        AND (price_max IS NULL OR EXISTS (
            SELECT 1 FROM public.tickets t 
            WHERE t.event_id = e.id AND t.price <= price_max
        ))
        AND (date_from IS NULL OR e.start_at >= date_from)
        AND (date_to IS NULL OR e.start_at <= date_to)
        AND (location_point IS NULL OR e.location IS NULL OR ST_DWithin(location_point, e.location, radius_km * 1000))
        -- Exclude events user has already interacted with
        AND NOT EXISTS (
            SELECT 1 FROM public.user_behavior_logs ubl
            WHERE ubl.user_id = p_user_id 
            AND ubl.event_id = e.id
            AND ubl.behavior_type IN ('view', 'like', 'purchase')
        )
    ORDER BY 
        calculate_personalization_score(
            e.category,
            e.start_at,
            e.city,
            user_interests,
            user_preferences,
            location_point,
            e.location
        ) DESC,
        e.start_at ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ NEW: Get nearby events function
CREATE OR REPLACE FUNCTION public.get_nearby_events(
    location_filter TEXT,
    radius_km INTEGER DEFAULT 50,
    limit_count INTEGER DEFAULT 10,
    categories_filter TEXT[] DEFAULT NULL,
    price_min DECIMAL(10,2) DEFAULT NULL,
    price_max DECIMAL(10,2) DEFAULT NULL,
    date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    slug TEXT,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    venue TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    category TEXT,
    tags TEXT[],
    cover_image_url TEXT,
    status TEXT,
    visibility TEXT,
    max_attendees INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    relevance_score DECIMAL(5,4),
    trending_score DECIMAL(5,4),
    distance_km DECIMAL(8,2),
    ticket_availability JSONB,
    organizer_info JSONB,
    engagement_metrics JSONB
) AS $$
DECLARE
    location_point GEOGRAPHY;
BEGIN
    -- Parse location
    location_point := ST_GeomFromText('POINT(' || location_filter || ')', 4326)::geography;

    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.slug,
        e.start_at,
        e.end_at,
        e.venue,
        e.city,
        e.state,
        e.country,
        e.category,
        e.tags,
        e.cover_image_url,
        e.status,
        e.visibility,
        e.max_attendees,
        e.created_at,
        e.updated_at,
        0.7 as relevance_score, -- Good relevance for nearby events
        calculate_trending_score(
            COALESCE(e.likes_count, 0),
            COALESCE(e.shares_count, 0),
            COALESCE(e.views_count, 0),
            COALESCE(tickets_sold.total_sold, 0),
            e.start_at,
            24
        ) as trending_score,
        ST_Distance(location_point, e.location) / 1000 as distance_km,
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
        ) as organizer_info,
        jsonb_build_object(
            'likes_count', COALESCE(e.likes_count, 0),
            'shares_count', COALESCE(e.shares_count, 0),
            'views_count', COALESCE(e.views_count, 0),
            'tickets_sold', COALESCE(tickets_sold.total_sold, 0)
        ) as engagement_metrics
    FROM public.events e
    LEFT JOIN public.orgs o ON e.org_id = e.org_id
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
        e.status = 'published'
        AND e.visibility = 'public'
        AND e.start_at > NOW()
        AND e.location IS NOT NULL
        AND ST_DWithin(location_point, e.location, radius_km * 1000)
        AND (categories_filter IS NULL OR e.category = ANY(categories_filter))
        AND (price_min IS NULL OR EXISTS (
            SELECT 1 FROM public.tickets t 
            WHERE t.event_id = e.id AND t.price >= price_min
        ))
        AND (price_max IS NULL OR EXISTS (
            SELECT 1 FROM public.tickets t 
            WHERE t.event_id = e.id AND t.price <= price_max
        ))
        AND (date_from IS NULL OR e.start_at >= date_from)
        AND (date_to IS NULL OR e.start_at <= date_to)
    ORDER BY 
        ST_Distance(location_point, e.location) ASC,
        e.start_at ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ NEW: Get events from followed organizers
CREATE OR REPLACE FUNCTION public.get_following_events(
    p_user_id UUID,
    limit_count INTEGER DEFAULT 10,
    location_filter TEXT DEFAULT NULL,
    radius_km INTEGER DEFAULT 50,
    categories_filter TEXT[] DEFAULT NULL,
    price_min DECIMAL(10,2) DEFAULT NULL,
    price_max DECIMAL(10,2) DEFAULT NULL,
    date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    slug TEXT,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    venue TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    category TEXT,
    tags TEXT[],
    cover_image_url TEXT,
    status TEXT,
    visibility TEXT,
    max_attendees INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    relevance_score DECIMAL(5,4),
    trending_score DECIMAL(5,4),
    distance_km DECIMAL(8,2),
    ticket_availability JSONB,
    organizer_info JSONB,
    engagement_metrics JSONB
) AS $$
DECLARE
    location_point GEOGRAPHY;
BEGIN
    -- Parse location if provided
    IF location_filter IS NOT NULL THEN
        location_point := ST_GeomFromText('POINT(' || location_filter || ')', 4326)::geography;
    END IF;

    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.slug,
        e.start_at,
        e.end_at,
        e.venue,
        e.city,
        e.state,
        e.country,
        e.category,
        e.tags,
        e.cover_image_url,
        e.status,
        e.visibility,
        e.max_attendees,
        e.created_at,
        e.updated_at,
        0.9 as relevance_score, -- High relevance for followed organizers
        calculate_trending_score(
            COALESCE(e.likes_count, 0),
            COALESCE(e.shares_count, 0),
            COALESCE(e.views_count, 0),
            COALESCE(tickets_sold.total_sold, 0),
            e.start_at,
            24
        ) as trending_score,
        CASE 
            WHEN location_point IS NOT NULL AND e.location IS NOT NULL 
            THEN ST_Distance(location_point, e.location) / 1000
            ELSE NULL 
        END as distance_km,
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
        ) as organizer_info,
        jsonb_build_object(
            'likes_count', COALESCE(e.likes_count, 0),
            'shares_count', COALESCE(e.shares_count, 0),
            'views_count', COALESCE(e.views_count, 0),
            'tickets_sold', COALESCE(tickets_sold.total_sold, 0)
        ) as engagement_metrics
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
        e.status = 'published'
        AND e.visibility = 'public'
        AND e.start_at > NOW()
        AND EXISTS (
            SELECT 1 FROM public.follows f
            WHERE f.user_id = p_user_id
            AND f.organizer_id = e.org_id
            AND f.status = 'accepted'
        )
        AND (categories_filter IS NULL OR e.category = ANY(categories_filter))
        AND (price_min IS NULL OR EXISTS (
            SELECT 1 FROM public.tickets t 
            WHERE t.event_id = e.id AND t.price >= price_min
        ))
        AND (price_max IS NULL OR EXISTS (
            SELECT 1 FROM public.tickets t 
            WHERE t.event_id = e.id AND t.price <= price_max
        ))
        AND (date_from IS NULL OR e.start_at >= date_from)
        AND (date_to IS NULL OR e.start_at <= date_to)
        AND (location_point IS NULL OR e.location IS NULL OR ST_DWithin(location_point, e.location, radius_km * 1000))
    ORDER BY 
        e.start_at ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ NEW: Get discovery insights function
CREATE OR REPLACE FUNCTION public.get_discovery_insights(
    location_filter TEXT DEFAULT NULL,
    radius_km INTEGER DEFAULT 50,
    categories_filter TEXT[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    insights JSONB := '{}'::jsonb;
    location_point GEOGRAPHY;
BEGIN
    -- Parse location if provided
    IF location_filter IS NOT NULL THEN
        location_point := ST_GeomFromText('POINT(' || location_filter || ')', 4326)::geography;
    END IF;

    -- Popular categories
    SELECT jsonb_build_object(
        'popular_categories', jsonb_agg(
            jsonb_build_object(
                'name', category,
                'count', count
            )
        )
    ) INTO insights
    FROM (
        SELECT 
            e.category,
            COUNT(*) as count
        FROM public.events e
        WHERE 
            e.status = 'published'
            AND e.start_at > NOW()
            AND e.category IS NOT NULL
            AND (categories_filter IS NULL OR e.category = ANY(categories_filter))
            AND (location_point IS NULL OR e.location IS NULL OR ST_DWithin(location_point, e.location, radius_km * 1000))
        GROUP BY e.category
        ORDER BY count DESC
        LIMIT 8
    ) category_counts;

    -- Trending topics (from event titles and tags)
    SELECT jsonb_build_object(
        'trending_topics', jsonb_agg(topic)
    ) INTO insights
    FROM (
        SELECT DISTINCT unnest(e.tags) as topic
        FROM public.events e
        WHERE 
            e.status = 'published'
            AND e.start_at > NOW()
            AND e.tags IS NOT NULL
            AND array_length(e.tags, 1) > 0
            AND (categories_filter IS NULL OR e.category = ANY(categories_filter))
            AND (location_point IS NULL OR e.location IS NULL OR ST_DWithin(location_point, e.location, radius_km * 1000))
        ORDER BY topic
        LIMIT 10
    ) topic_list;

    -- Price distribution
    SELECT jsonb_build_object(
        'price_distribution', jsonb_agg(
            jsonb_build_object(
                'range', price_range,
                'count', count
            )
        )
    ) INTO insights
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
            AND e.start_at > NOW()
            AND t.is_active = true
            AND (categories_filter IS NULL OR e.category = ANY(categories_filter))
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

    -- Available categories
    SELECT jsonb_build_object(
        'categories_available', jsonb_agg(category)
    ) INTO insights
    FROM (
        SELECT DISTINCT e.category
        FROM public.events e
        WHERE 
            e.status = 'published'
            AND e.start_at > NOW()
            AND e.category IS NOT NULL
            AND (location_point IS NULL OR e.location IS NULL OR ST_DWithin(location_point, e.location, radius_km * 1000))
        ORDER BY e.category
    ) available_categories;

    RETURN insights;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ NEW: Calculate trending score function
CREATE OR REPLACE FUNCTION public.calculate_trending_score(
    likes_count INTEGER,
    shares_count INTEGER,
    views_count INTEGER,
    tickets_sold INTEGER,
    event_date TIMESTAMP WITH TIME ZONE,
    hours_back INTEGER DEFAULT 24
)
RETURNS DECIMAL(5,4) AS $$
DECLARE
    trending_score DECIMAL(5,4) := 0.0;
    time_factor DECIMAL(5,4);
    engagement_factor DECIMAL(5,4);
    urgency_factor DECIMAL(5,4);
BEGIN
    -- Time factor (recent activity gets higher score)
    time_factor := 0.5 + (0.5 * (hours_back::DECIMAL / 24.0));
    
    -- Engagement factor (normalized engagement metrics)
    engagement_factor := LEAST(
        (likes_count::DECIMAL * 0.3 + 
         shares_count::DECIMAL * 0.4 + 
         views_count::DECIMAL * 0.1 + 
         tickets_sold::DECIMAL * 0.2) / 100.0, 
        1.0
    );
    
    -- Urgency factor (closer events get higher scores)
    urgency_factor := GREATEST(
        0.1, 
        1.0 - (EXTRACT(EPOCH FROM (event_date - NOW())) / (7 * 24 * 3600))::DECIMAL
    );
    
    -- Combine factors
    trending_score := (time_factor * 0.3 + engagement_factor * 0.4 + urgency_factor * 0.3);
    
    RETURN LEAST(trending_score, 1.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ✅ NEW: Calculate personalization score function
CREATE OR REPLACE FUNCTION public.calculate_personalization_score(
    event_category TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    event_city TEXT,
    user_interests TEXT[],
    user_preferences JSONB,
    user_location GEOGRAPHY,
    event_location GEOGRAPHY
)
RETURNS DECIMAL(5,4) AS $$
DECLARE
    personalization_score DECIMAL(5,4) := 0.5; -- Base score
    category_score DECIMAL(5,4) := 0.0;
    location_score DECIMAL(5,4) := 0.0;
    time_score DECIMAL(5,4) := 0.0;
BEGIN
    -- Category match score
    IF user_interests IS NOT NULL AND event_category = ANY(user_interests) THEN
        category_score := 0.4;
    END IF;
    
    -- Location preference score
    IF user_location IS NOT NULL AND event_location IS NOT NULL THEN
        local_score := 1.0 - LEAST(ST_Distance(user_location, event_location) / 50000, 1.0); -- 50km max
    END IF;
    
    -- Time preference score
    IF user_preferences IS NOT NULL THEN
        -- Check if event is on preferred days
        local_time_score := 0.3;
    END IF;
    
    -- Combine scores
    personalization_score := personalization_score + category_score + location_score + time_score;
    
    RETURN LEAST(personalization_score, 1.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ✅ NEW: Log discovery analytics function
CREATE OR REPLACE FUNCTION public.log_discovery_analytics(
    p_user_id UUID,
    p_location TEXT,
    p_categories TEXT[],
    p_results_count INTEGER,
    p_search_time_ms INTEGER,
    p_filters_applied JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_behavior_logs (
        user_id,
        behavior_type,
        behavior_data,
        created_at
    ) VALUES (
        p_user_id,
        'discover_feed',
        jsonb_build_object(
            'location', p_location,
            'categories', p_categories,
            'results_count', p_results_count,
            'search_time_ms', p_search_time_ms,
            'filters_applied', p_filters_applied
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ NEW: Indexes for discover feed performance
CREATE INDEX IF NOT EXISTS idx_events_discovery ON public.events(status, start_at, visibility) WHERE status = 'published' AND visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_events_location_discovery ON public.events USING GIST(location, status) WHERE status = 'published' AND visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_events_category_discovery ON public.events(category, status, start_at) WHERE status = 'published' AND visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_user_interests_user_category ON public.user_interests(user_id, category, interest_score);
CREATE INDEX IF NOT EXISTS idx_follows_user_organizer ON public.follows(user_id, organizer_id, status);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_user_type ON public.user_behavior_logs(user_id, behavior_type, created_at);

-- ✅ NEW: User interests table for personalization
CREATE TABLE IF NOT EXISTS public.user_interests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    interest_score DECIMAL(3,2) DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- ✅ NEW: Follows table for organizer following
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organizer_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organizer_id)
);
