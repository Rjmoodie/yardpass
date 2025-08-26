-- YardPass Missing Features Implementation
-- Addressing the gaps identified by lovable

-- ========================================
-- 1. ENHANCED USER PROFILES
-- ========================================

-- Enhanced profiles table (extends existing users table)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    website_url TEXT,
    location TEXT,
    birth_date DATE,
    gender TEXT,
    interests TEXT[],
    social_links JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profile completion tracking
CREATE TABLE IF NOT EXISTS public.profile_completion (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    completion_percentage INTEGER DEFAULT 0,
    completed_sections TEXT[],
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. ENHANCED EVENT CATEGORIES
-- ========================================

-- Enhanced event categories table
CREATE TABLE IF NOT EXISTS public.event_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    color_hex TEXT DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    parent_category_id UUID REFERENCES public.event_categories(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event tags for better categorization
CREATE TABLE IF NOT EXISTS public.event_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    color_hex TEXT DEFAULT '#6B7280',
    usage_count INTEGER DEFAULT 0,
    is_trending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event-tag relationships
CREATE TABLE IF NOT EXISTS public.event_tag_relationships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.event_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, tag_id)
);

-- ========================================
-- 3. STORAGE BUCKETS CONFIGURATION
-- ========================================

-- Note: These buckets need to be created in Supabase Dashboard
-- or via Supabase CLI

-- Storage bucket for user avatars
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage bucket for event media
-- INSERT INTO storage.buckets (id, name, public) VALUES ('event-media', 'event-media', true);

-- Storage bucket for post media
-- INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true);

-- Storage policies for avatars bucket
CREATE POLICY IF NOT EXISTS "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for event-media bucket
CREATE POLICY IF NOT EXISTS "Event media is publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'event-media');

CREATE POLICY IF NOT EXISTS "Event organizers can upload event media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'event-media' 
        AND EXISTS (
            SELECT 1 FROM public.events e 
            JOIN public.org_members om ON e.org_id = om.org_id 
            WHERE om.user_id = auth.uid() 
            AND e.id::text = (storage.foldername(name))[1]
        )
    );

-- Storage policies for post-media bucket
CREATE POLICY IF NOT EXISTS "Post media is publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'post-media');

CREATE POLICY IF NOT EXISTS "Users can upload their own post media" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========================================
-- 4. EVENT WAITLISTS
-- ========================================

-- Waitlist table for sold-out events
CREATE TABLE IF NOT EXISTS public.event_waitlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticket_tier_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    quantity_requested INTEGER DEFAULT 1,
    position INTEGER,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'expired', 'converted')),
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id, ticket_tier_id)
);

-- Waitlist notifications
CREATE TABLE IF NOT EXISTS public.waitlist_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    waitlist_id UUID REFERENCES public.event_waitlists(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- ========================================
-- 5. EVENT SERIES/RECURRING EVENTS
-- ========================================

-- Event series table
CREATE TABLE IF NOT EXISTS public.event_series (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
    recurrence_pattern JSONB NOT NULL, -- {type: 'weekly', interval: 1, days: ['monday', 'wednesday']}
    start_date DATE NOT NULL,
    end_date DATE,
    max_occurrences INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Series events relationship
CREATE TABLE IF NOT EXISTS public.series_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    series_id UUID REFERENCES public.event_series(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    occurrence_number INTEGER NOT NULL,
    scheduled_date DATE NOT NULL,
    is_cancelled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(series_id, event_id)
);

-- ========================================
-- 6. ENHANCED SEARCH WITH FULL-TEXT
-- ========================================

-- Search index for events
CREATE INDEX IF NOT EXISTS idx_events_search ON public.events 
    USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(venue, '') || ' ' || COALESCE(city, '')));

-- Search index for users
CREATE INDEX IF NOT EXISTS idx_users_search ON public.users 
    USING GIN (to_tsvector('english', name || ' ' || COALESCE(bio, '') || ' ' || handle));

-- Search index for organizations
CREATE INDEX IF NOT EXISTS idx_orgs_search ON public.orgs 
    USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || slug));

-- Search history for analytics
CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    search_type VARCHAR(20) DEFAULT 'general',
    results_count INTEGER,
    clicked_result_id UUID,
    clicked_result_type VARCHAR(20),
    search_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 7. INDEXES FOR PERFORMANCE
-- ========================================

-- Event categories indexes
CREATE INDEX IF NOT EXISTS idx_event_categories_slug ON public.event_categories(slug);
CREATE INDEX IF NOT EXISTS idx_event_categories_parent ON public.event_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_event_categories_active ON public.event_categories(is_active) WHERE is_active = true;

-- Event tags indexes
CREATE INDEX IF NOT EXISTS idx_event_tags_slug ON public.event_tags(slug);
CREATE INDEX IF NOT EXISTS idx_event_tags_trending ON public.event_tags(is_trending) WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS idx_event_tags_usage ON public.event_tags(usage_count DESC);

-- Event tag relationships indexes
CREATE INDEX IF NOT EXISTS idx_event_tag_relationships_event ON public.event_tag_relationships(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tag_relationships_tag ON public.event_tag_relationships(tag_id);

-- Waitlist indexes
CREATE INDEX IF NOT EXISTS idx_waitlists_event ON public.event_waitlists(event_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_user ON public.event_waitlists(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_status ON public.event_waitlists(status);
CREATE INDEX IF NOT EXISTS idx_waitlists_position ON public.event_waitlists(event_id, position);

-- Series indexes
CREATE INDEX IF NOT EXISTS idx_series_organizer ON public.event_series(organizer_id);
CREATE INDEX IF NOT EXISTS idx_series_active ON public.event_series(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_series_events_series ON public.series_events(series_id);
CREATE INDEX IF NOT EXISTS idx_series_events_date ON public.series_events(scheduled_date);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_search_history_user ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON public.search_history(query);
CREATE INDEX IF NOT EXISTS idx_search_history_created ON public.search_history(created_at DESC);

-- ========================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ========================================

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Event categories RLS
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to event categories" ON public.event_categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage event categories" ON public.event_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Event tags RLS
ALTER TABLE public.event_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to event tags" ON public.event_tags
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage event tags" ON public.event_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Event tag relationships RLS
ALTER TABLE public.event_tag_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to event tag relationships" ON public.event_tag_relationships
    FOR SELECT USING (true);

CREATE POLICY "Event organizers can manage event tags" ON public.event_tag_relationships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.org_members om ON e.org_id = om.org_id
            WHERE om.user_id = auth.uid() AND e.id = event_id
        )
    );

-- Waitlists RLS
ALTER TABLE public.event_waitlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own waitlist entries" ON public.event_waitlists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add themselves to waitlists" ON public.event_waitlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own waitlist entries" ON public.event_waitlists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Event organizers can view event waitlists" ON public.event_waitlists
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.org_members om ON e.org_id = om.org_id
            WHERE om.user_id = auth.uid() AND e.id = event_id
        )
    );

-- Event series RLS
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to event series" ON public.event_series
    FOR SELECT USING (is_active = true);

CREATE POLICY "Series organizers can manage their series" ON public.event_series
    FOR ALL USING (
        auth.uid() = organizer_id OR
        EXISTS (
            SELECT 1 FROM public.org_members om
            WHERE om.user_id = auth.uid() AND om.org_id = org_id
        )
    );

-- Series events RLS
ALTER TABLE public.series_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to series events" ON public.series_events
    FOR SELECT USING (true);

CREATE POLICY "Series organizers can manage series events" ON public.series_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.event_series es
            WHERE es.id = series_id AND (
                es.organizer_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.org_members om
                    WHERE om.user_id = auth.uid() AND om.org_id = es.org_id
                )
            )
        )
    );

-- Search history RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own search history" ON public.search_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history" ON public.search_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 9. HELPER FUNCTIONS
-- ========================================

-- Function to update waitlist positions
CREATE OR REPLACE FUNCTION update_waitlist_positions(event_id_param UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.event_waitlists 
    SET position = subquery.new_position
    FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id, ticket_tier_id ORDER BY created_at) as new_position
        FROM public.event_waitlists 
        WHERE event_id = event_id_param AND status = 'waiting'
    ) subquery
    WHERE public.event_waitlists.id = subquery.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add user to waitlist
CREATE OR REPLACE FUNCTION add_to_waitlist(
    event_id_param UUID,
    ticket_tier_id_param UUID,
    quantity_param INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
    waitlist_id UUID;
BEGIN
    -- Check if user is already on waitlist
    IF EXISTS (
        SELECT 1 FROM public.event_waitlists 
        WHERE event_id = event_id_param 
        AND user_id = auth.uid() 
        AND ticket_tier_id = ticket_tier_id_param
    ) THEN
        RAISE EXCEPTION 'User is already on waitlist for this event and ticket tier';
    END IF;

    -- Add to waitlist
    INSERT INTO public.event_waitlists (event_id, user_id, ticket_tier_id, quantity_requested)
    VALUES (event_id_param, auth.uid(), ticket_tier_id_param, quantity_param)
    RETURNING id INTO waitlist_id;

    -- Update positions
    PERFORM update_waitlist_positions(event_id_param);

    RETURN waitlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove user from waitlist
CREATE OR REPLACE FUNCTION remove_from_waitlist(waitlist_id_param UUID)
RETURNS void AS $$
DECLARE
    event_id_param UUID;
BEGIN
    -- Get event_id for position update
    SELECT event_id INTO event_id_param 
    FROM public.event_waitlists 
    WHERE id = waitlist_id_param AND user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Waitlist entry not found or access denied';
    END IF;

    -- Remove from waitlist
    DELETE FROM public.event_waitlists WHERE id = waitlist_id_param;

    -- Update positions
    PERFORM update_waitlist_positions(event_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search events with full-text search
CREATE OR REPLACE FUNCTION search_events(
    search_query TEXT,
    category_filter UUID DEFAULT NULL,
    location_filter GEOGRAPHY DEFAULT NULL,
    radius_meters INTEGER DEFAULT 50000,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    venue TEXT,
    city TEXT,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    category TEXT,
    cover_image_url TEXT,
    relevance_score FLOAT,
    distance_meters FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.venue,
        e.city,
        e.start_at,
        e.end_at,
        ec.name as category,
        e.cover_image_url,
        ts_rank(to_tsvector('english', e.title || ' ' || COALESCE(e.description, '') || ' ' || COALESCE(e.venue, '') || ' ' || COALESCE(e.city, '')), plainto_tsquery('english', search_query)) as relevance_score,
        CASE 
            WHEN location_filter IS NOT NULL AND e.location IS NOT NULL 
            THEN ST_Distance(e.location, location_filter)
            ELSE NULL 
        END as distance_meters
    FROM public.events e
    LEFT JOIN public.event_categories ec ON e.category_id = ec.id
    WHERE 
        e.status = 'published'
        AND e.visibility = 'public'
        AND (
            search_query IS NULL OR 
            to_tsvector('english', e.title || ' ' || COALESCE(e.description, '') || ' ' || COALESCE(e.venue, '') || ' ' || COALESCE(e.city, '')) @@ plainto_tsquery('english', search_query)
        )
        AND (category_filter IS NULL OR e.category_id = category_filter)
        AND (
            location_filter IS NULL OR 
            e.location IS NULL OR 
            ST_DWithin(e.location, location_filter, radius_meters)
        )
    ORDER BY 
        CASE WHEN search_query IS NOT NULL THEN relevance_score END DESC,
        CASE WHEN location_filter IS NOT NULL THEN distance_meters END ASC,
        e.start_at ASC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 10. SAMPLE DATA
-- ========================================

-- Insert sample event categories
INSERT INTO public.event_categories (id, name, slug, description, icon_url, color_hex, sort_order) VALUES
    (gen_random_uuid(), 'Music', 'music', 'Live music events, concerts, and performances', '🎵', '#FF6B6B', 1),
    (gen_random_uuid(), 'Sports', 'sports', 'Sports events, games, and athletic competitions', '⚽', '#4ECDC4', 2),
    (gen_random_uuid(), 'Technology', 'technology', 'Tech conferences, hackathons, and workshops', '💻', '#45B7D1', 3),
    (gen_random_uuid(), 'Food & Drink', 'food-drink', 'Food festivals, wine tastings, and culinary events', '🍕', '#96CEB4', 4),
    (gen_random_uuid(), 'Arts & Culture', 'arts-culture', 'Art exhibitions, theater, and cultural events', '🎨', '#FFEAA7', 5),
    (gen_random_uuid(), 'Business', 'business', 'Business conferences, networking events, and seminars', '💼', '#DDA0DD', 6),
    (gen_random_uuid(), 'Education', 'education', 'Educational workshops, classes, and training sessions', '📚', '#98D8C8', 7),
    (gen_random_uuid(), 'Health & Wellness', 'health-wellness', 'Fitness classes, wellness retreats, and health events', '🧘', '#F7DC6F', 8)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample event tags
INSERT INTO public.event_tags (id, name, slug, description, color_hex) VALUES
    (gen_random_uuid(), 'Free', 'free', 'Free events', '#10B981'),
    (gen_random_uuid(), 'Family Friendly', 'family-friendly', 'Events suitable for families', '#3B82F6'),
    (gen_random_uuid(), 'Outdoor', 'outdoor', 'Outdoor events', '#059669'),
    (gen_random_uuid(), 'Networking', 'networking', 'Networking opportunities', '#8B5CF6'),
    (gen_random_uuid(), 'Workshop', 'workshop', 'Interactive workshops', '#F59E0B'),
    (gen_random_uuid(), 'Live Music', 'live-music', 'Live music performances', '#EF4444'),
    (gen_random_uuid(), 'Food Festival', 'food-festival', 'Food and culinary events', '#F97316'),
    (gen_random_uuid(), 'Tech Talk', 'tech-talk', 'Technology presentations', '#06B6D4')
ON CONFLICT (slug) DO NOTHING;

-- ========================================
-- 11. TRIGGERS
-- ========================================

-- Trigger to update waitlist positions when entries are added/removed
CREATE OR REPLACE FUNCTION trigger_update_waitlist_positions()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        PERFORM update_waitlist_positions(NEW.event_id);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.event_id != NEW.event_id THEN
            PERFORM update_waitlist_positions(OLD.event_id);
        END IF;
        PERFORM update_waitlist_positions(NEW.event_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_waitlist_positions
    AFTER INSERT OR UPDATE OR DELETE ON public.event_waitlists
    FOR EACH ROW EXECUTE FUNCTION trigger_update_waitlist_positions();

-- Trigger to update tag usage count
CREATE OR REPLACE FUNCTION trigger_update_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.event_tags 
        SET usage_count = usage_count + 1 
        WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.event_tags 
        SET usage_count = usage_count - 1 
        WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tag_usage
    AFTER INSERT OR DELETE ON public.event_tag_relationships
    FOR EACH ROW EXECUTE FUNCTION trigger_update_tag_usage();

-- ========================================
-- 12. COMMENTS
-- ========================================

COMMENT ON TABLE public.profiles IS 'Enhanced user profiles with social features';
COMMENT ON TABLE public.event_categories IS 'Event categories for better organization';
COMMENT ON TABLE public.event_tags IS 'Event tags for detailed categorization';
COMMENT ON TABLE public.event_waitlists IS 'Waitlists for sold-out events';
COMMENT ON TABLE public.event_series IS 'Recurring event series';
COMMENT ON TABLE public.search_history IS 'Search history for analytics and personalization';

COMMENT ON FUNCTION add_to_waitlist IS 'Add user to event waitlist';
COMMENT ON FUNCTION remove_from_waitlist IS 'Remove user from event waitlist';
COMMENT ON FUNCTION search_events IS 'Full-text search for events with location and category filtering';
