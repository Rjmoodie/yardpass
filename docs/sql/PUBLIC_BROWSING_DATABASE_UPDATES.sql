-- ========================================
-- PUBLIC BROWSING DATABASE UPDATES
-- Supporting the new navigation structure
-- ========================================

-- ========================================
-- 1. ENSURE PUBLIC EVENTS ACCESS
-- ========================================

-- Drop and recreate the public_events view for secure access
DROP VIEW IF EXISTS public_events CASCADE;

-- Create a secure public events view
CREATE OR REPLACE VIEW public_events AS
SELECT 
    id,
    slug,
    title,
    description,
    short_description,
    category,
    subcategory,
    tags,
    cover_image,
    logo,
    gallery,
    video_url,
    city,
    venue,
    start_date,
    end_date,
    timezone,
    doors_open,
    doors_close,
    price_range,
    currency,
    capacity,
    waitlist_enabled,
    waitlist_count,
    likes_count,
    shares_count,
    views_count,
    followers_count,
    is_featured,
    created_at,
    published_at
FROM events
WHERE visibility = 'public' 
AND status = 'published' 
AND is_active = true;

-- Grant access to public events view
GRANT SELECT ON public_events TO authenticated;
GRANT SELECT ON public_events TO anon;

-- ========================================
-- 2. UPDATE RLS POLICIES FOR PUBLIC ACCESS
-- ========================================

-- Events table policies
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Users can view public events" ON events;

-- Public events access (for unauthenticated users)
CREATE POLICY "Public events are viewable by everyone" ON events
    FOR SELECT USING (
        visibility = 'public' 
        AND status = 'published' 
        AND is_active = true
    );

-- Authenticated users can view more events
CREATE POLICY "Authenticated users can view events" ON events
    FOR SELECT USING (
        status = 'published' 
        AND (
            visibility = 'public' 
            OR visibility = 'private'
        )
    );

-- Event creators can manage their events
CREATE POLICY "Event creators can manage their events" ON events
    FOR ALL USING (
        organizer_id = auth.uid()
    );

-- ========================================
-- 3. ORGANIZATIONS PUBLIC ACCESS
-- ========================================

-- Organizations table policies
DROP POLICY IF EXISTS "Users can view public organizations" ON organizations;

-- Public organizations access
CREATE POLICY "Public organizations are viewable by everyone" ON organizations
    FOR SELECT USING (
        is_verified = true 
        AND is_active = true
    );

-- Authenticated users can view more organizations
CREATE POLICY "Authenticated users can view organizations" ON organizations
    FOR SELECT USING (
        is_active = true
    );

-- Organization creators can manage their organizations
CREATE POLICY "Organization creators can manage their organizations" ON organizations
    FOR ALL USING (
        created_by = auth.uid()
    );

-- ========================================
-- 4. PUBLIC POSTS ACCESS
-- ========================================

-- Event posts table policies
DROP POLICY IF EXISTS "Users can view public event posts" ON event_posts;

-- Public posts access
CREATE POLICY "Public event posts are viewable by everyone" ON event_posts
    FOR SELECT USING (
        visibility = 'public'
    );

-- Authenticated users can view more posts
CREATE POLICY "Authenticated users can view event posts" ON events
    FOR SELECT USING (
        visibility = 'public' 
        OR visibility = 'private'
    );

-- Post creators can manage their posts
CREATE POLICY "Post creators can manage their posts" ON event_posts
    FOR ALL USING (
        user_id = auth.uid()
    );

-- ========================================
-- 5. TICKET TIERS PUBLIC ACCESS
-- ========================================

-- Ticket tiers table policies
DROP POLICY IF EXISTS "Users can view public ticket tiers" ON ticket_tiers;

-- Public ticket tiers access (pricing info)
CREATE POLICY "Public ticket tiers are viewable by everyone" ON ticket_tiers
    FOR SELECT USING (
        is_active = true
    );

-- Event creators can manage ticket tiers
CREATE POLICY "Event creators can manage ticket tiers" ON ticket_tiers
    FOR ALL USING (
        auth.uid() IN (
            SELECT organizer_id FROM events WHERE id = ticket_tiers.event_id
        )
    );

-- ========================================
-- 6. EVENT CATEGORIES PUBLIC ACCESS
-- ========================================

-- Event categories table policies
DROP POLICY IF EXISTS "Event categories are viewable by everyone" ON event_categories;

-- Public event categories access
CREATE POLICY "Event categories are viewable by everyone" ON event_categories
    FOR SELECT USING (
        is_active = true
    );

-- Admins can manage categories
CREATE POLICY "Admins can manage event categories" ON event_categories
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM users WHERE role = 'admin'
        )
    );

-- ========================================
-- 7. PUBLIC ANALYTICS (AGGREGATED)
-- ========================================

-- Create a view for public event statistics
CREATE OR REPLACE VIEW public_event_stats AS
SELECT 
    event_id,
    COUNT(DISTINCT user_id) as total_views,
    COUNT(DISTINCT CASE WHEN action = 'like' THEN user_id END) as total_likes,
    COUNT(DISTINCT CASE WHEN action = 'share' THEN user_id END) as total_shares,
    COUNT(DISTINCT CASE WHEN action = 'save' THEN user_id END) as total_saves
FROM event_analytics
WHERE event_id IN (
    SELECT id FROM events 
    WHERE visibility = 'public' 
    AND status = 'published' 
    AND is_active = true
)
GROUP BY event_id;

-- Grant access to public stats
GRANT SELECT ON public_event_stats TO authenticated;
GRANT SELECT ON public_event_stats TO anon;

-- ========================================
-- 8. PUBLIC SEARCH FUNCTIONALITY
-- ========================================

-- Create a function for public event search
CREATE OR REPLACE FUNCTION search_public_events(
    search_term TEXT DEFAULT '',
    category_filter TEXT DEFAULT NULL,
    location_filter TEXT DEFAULT NULL,
    date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    short_description TEXT,
    category TEXT,
    city TEXT,
    venue TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    cover_image TEXT,
    price_range JSONB,
    currency TEXT,
    capacity INTEGER,
    waitlist_enabled BOOLEAN,
    organizer_name TEXT,
    organizer_verified BOOLEAN,
    total_views BIGINT,
    total_likes BIGINT
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
        e.short_description,
        e.category,
        e.city,
        e.venue,
        e.start_date,
        e.end_date,
        e.cover_image,
        e.price_range,
        e.currency,
        e.capacity,
        e.waitlist_enabled,
        o.name as organizer_name,
        o.is_verified as organizer_verified,
        COALESCE(stats.total_views, 0) as total_views,
        COALESCE(stats.total_likes, 0) as total_likes
    FROM events e
    LEFT JOIN organizations o ON e.organizer_id = o.id
    LEFT JOIN public_event_stats stats ON e.id = stats.event_id
    WHERE e.visibility = 'public' 
    AND e.status = 'published' 
    AND e.is_active = true
    AND (
        search_term = '' 
        OR e.title ILIKE '%' || search_term || '%'
        OR e.description ILIKE '%' || search_term || '%'
        OR e.tags::text ILIKE '%' || search_term || '%'
    )
    AND (
        category_filter IS NULL 
        OR e.category = category_filter
    )
    AND (
        location_filter IS NULL 
        OR e.city ILIKE '%' || location_filter || '%'
    )
    AND (
        date_from IS NULL 
        OR e.start_date >= date_from
    )
    AND (
        date_to IS NULL 
        OR e.start_date <= date_to
    )
    ORDER BY e.is_featured DESC, e.start_date ASC
    LIMIT limit_count OFFSET offset_count;
END;
$$;

-- Grant access to search function
GRANT EXECUTE ON FUNCTION search_public_events(TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_public_events(TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER, INTEGER) TO anon;

-- ========================================
-- 9. PUBLIC EVENT RECOMMENDATIONS
-- ========================================

-- Create a function for public event recommendations
CREATE OR REPLACE FUNCTION get_public_event_recommendations(
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    city TEXT,
    venue TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    cover_image TEXT,
    price_range JSONB,
    organizer_name TEXT,
    organizer_verified BOOLEAN,
    total_views BIGINT,
    total_likes BIGINT,
    recommendation_score NUMERIC
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
        e.category,
        e.city,
        e.venue,
        e.start_date,
        e.cover_image,
        e.price_range,
        o.name as organizer_name,
        o.is_verified as organizer_verified,
        COALESCE(stats.total_views, 0) as total_views,
        COALESCE(stats.total_likes, 0) as total_likes,
        (
            COALESCE(stats.total_views, 0) * 0.3 +
            COALESCE(stats.total_likes, 0) * 0.5 +
            CASE WHEN e.is_featured THEN 100 ELSE 0 END +
            CASE WHEN o.is_verified THEN 50 ELSE 0 END
        ) as recommendation_score
    FROM events e
    LEFT JOIN organizations o ON e.organizer_id = o.id
    LEFT JOIN public_event_stats stats ON e.id = stats.event_id
    WHERE e.visibility = 'public' 
    AND e.status = 'published' 
    AND e.is_active = true
    AND e.start_date > NOW()
    ORDER BY recommendation_score DESC, e.start_date ASC
    LIMIT limit_count;
END;
$$;

-- Grant access to recommendations function
GRANT EXECUTE ON FUNCTION get_public_event_recommendations(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_event_recommendations(INTEGER) TO anon;

-- ========================================
-- 10. PUBLIC ORGANIZER PROFILES
-- ========================================

-- Create a view for public organizer information
CREATE OR REPLACE VIEW public_organizers AS
SELECT 
    o.id,
    o.name,
    o.description,
    o.avatar_url,
    o.is_verified,
    o.created_at,
    COUNT(DISTINCT e.id) as total_events,
    COUNT(DISTINCT CASE WHEN e.start_date > NOW() THEN e.id END) as upcoming_events,
    AVG(COALESCE(stats.total_views, 0)) as avg_event_views,
    AVG(COALESCE(stats.total_likes, 0)) as avg_event_likes
FROM organizations o
LEFT JOIN events e ON o.id = e.organizer_id 
    AND e.visibility = 'public' 
    AND e.status = 'published' 
    AND e.is_active = true
LEFT JOIN public_event_stats stats ON e.id = stats.event_id
WHERE o.is_verified = true 
AND o.is_active = true
GROUP BY o.id, o.name, o.description, o.avatar_url, o.is_verified, o.created_at;

-- Grant access to public organizers view
GRANT SELECT ON public_organizers TO authenticated;
GRANT SELECT ON public_organizers TO anon;

-- ========================================
-- 11. PERFORMANCE INDEXES FOR PUBLIC QUERIES
-- ========================================

-- Indexes for public event queries
CREATE INDEX IF NOT EXISTS idx_events_public_browse ON events(visibility, status, is_active, start_date);
CREATE INDEX IF NOT EXISTS idx_events_category_search ON events(category, visibility, status);
CREATE INDEX IF NOT EXISTS idx_events_location_search ON events(city, visibility, status);
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured DESC, start_date ASC);

-- Indexes for public search
CREATE INDEX IF NOT EXISTS idx_events_title_search ON events USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_events_description_search ON events USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_events_tags_search ON events USING gin(tags);

-- Indexes for public analytics
CREATE INDEX IF NOT EXISTS idx_event_analytics_public ON event_analytics(event_id, action);

-- ========================================
-- 12. VERIFICATION QUERIES
-- ========================================

-- Verify public events access
SELECT 
    'Public Events Access' as check_type,
    COUNT(*) as total_public_events,
    COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_events
FROM public_events;

-- Verify public organizers access
SELECT 
    'Public Organizers Access' as check_type,
    COUNT(*) as total_public_organizers,
    COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_organizers
FROM public_organizers;

-- Verify search function
SELECT 
    'Search Function' as check_type,
    COUNT(*) as search_results
FROM search_public_events('', NULL, NULL, NULL, NULL, 5, 0);

-- Verify recommendations function
SELECT 
    'Recommendations Function' as check_type,
    COUNT(*) as recommendation_count
FROM get_public_event_recommendations(5);

-- ========================================
-- 13. SUCCESS MESSAGE
-- ========================================
SELECT 
    '🎉 Public Browsing Database Setup Complete!' as status,
    'All public access policies and functions are ready' as message,
    'Public users can now browse events, organizers, and content' as next_step;
