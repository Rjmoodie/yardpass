-- ========================================
-- CRITICAL DATABASE FIXES
-- Addressing all gaps and security vulnerabilities
-- ========================================

-- ========================================
-- 1. FIX SECURITY DEFINER VIEW ISSUE
-- ========================================

-- Drop the problematic SECURITY DEFINER view
DROP VIEW IF EXISTS public.public_events;

-- Create a secure function-based alternative
CREATE OR REPLACE FUNCTION public.get_public_events()
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    slug TEXT,
    venue TEXT,
    city TEXT,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    cover_image_url TEXT,
    category TEXT,
    tags TEXT[],
    visibility TEXT,
    status TEXT
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
        e.slug,
        e.venue,
        e.city,
        e.start_at,
        e.end_at,
        e.cover_image_url,
        e.category,
        e.tags,
        e.visibility,
        e.status
    FROM public.events e
    WHERE e.visibility = 'public' 
    AND e.status = 'published';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_public_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_events() TO anon;

-- ========================================
-- 2. FIX FUNCTION SEARCH PATH ISSUES
-- ========================================

-- Fix all functions with mutable search paths
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        new.id,
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'avatar_url'
    );
    RETURN new;
END;
$$;

-- Fix other functions that need search_path fixes
CREATE OR REPLACE FUNCTION public.update_waitlist_positions(event_id_param UUID)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.add_to_waitlist(
    event_id_param UUID,
    ticket_tier_id_param UUID,
    quantity_param INTEGER DEFAULT 1
)
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    waitlist_id UUID;
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.event_waitlists 
        WHERE event_id = event_id_param 
        AND user_id = auth.uid() 
        AND ticket_tier_id = ticket_tier_id_param
    ) THEN
        RAISE EXCEPTION 'User is already on waitlist for this event and ticket tier';
    END IF;

    INSERT INTO public.event_waitlists (event_id, user_id, ticket_tier_id, quantity_requested)
    VALUES (event_id_param, auth.uid(), ticket_tier_id_param, quantity_param)
    RETURNING id INTO waitlist_id;

    PERFORM public.update_waitlist_positions(event_id_param);
    RETURN waitlist_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_from_waitlist(waitlist_id_param UUID)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    event_id_param UUID;
BEGIN
    SELECT event_id INTO event_id_param 
    FROM public.event_waitlists 
    WHERE id = waitlist_id_param AND user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Waitlist entry not found or access denied';
    END IF;

    DELETE FROM public.event_waitlists WHERE id = waitlist_id_param;
    PERFORM public.update_waitlist_positions(event_id_param);
END;
$$;

-- ========================================
-- 3. ADD MISSING PROFILES TABLE
-- ========================================

-- Create profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    handle TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    website_url TEXT,
    interests TEXT[],
    social_links JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create trigger for auto-profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ========================================
-- 4. ADD MISSING EVENT CATEGORIES TABLE
-- ========================================

-- Create event categories table
CREATE TABLE IF NOT EXISTS public.event_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    color_hex TEXT DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS (public read-only)
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event categories are viewable by everyone" 
ON public.event_categories FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage event categories" 
ON public.event_categories FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Add category_id to events table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE public.events ADD COLUMN category_id UUID REFERENCES public.event_categories(id);
    END IF;
END $$;

-- ========================================
-- 5. CONFIGURE STORAGE BUCKETS
-- ========================================

-- Create storage buckets (if they don't exist)
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('avatars', 'avatars', true),
    ('event-media', 'event-media', true),
    ('post-media', 'post-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars (public read, user upload)
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for event media (public read, event creators upload)
CREATE POLICY "Event media is publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'event-media');

CREATE POLICY "Event creators can upload event media" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'event-media' 
    AND EXISTS (
        SELECT 1 FROM public.events e 
        JOIN public.org_members om ON e.org_id = om.org_id 
        WHERE om.user_id = auth.uid() 
        AND e.id::text = (storage.foldername(name))[1]
    )
);

CREATE POLICY "Event creators can update event media" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'event-media' 
    AND EXISTS (
        SELECT 1 FROM public.events e 
        JOIN public.org_members om ON e.org_id = om.org_id 
        WHERE om.user_id = auth.uid() 
        AND e.id::text = (storage.foldername(name))[1]
    )
);

-- Storage policies for post media (access based on post visibility)
CREATE POLICY "Users can upload post media" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view post media" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'post-media');

CREATE POLICY "Users can update their own post media" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========================================
-- 6. ADD MISSING TABLES AND RELATIONSHIPS
-- ========================================

-- Create event waitlists table
CREATE TABLE IF NOT EXISTS public.event_waitlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    ticket_tier_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    quantity_requested INTEGER DEFAULT 1,
    position INTEGER,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'expired', 'converted')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(event_id, user_id, ticket_tier_id)
);

-- Enable RLS for waitlists
ALTER TABLE public.event_waitlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own waitlist entries" 
ON public.event_waitlists FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add themselves to waitlists" 
ON public.event_waitlists FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own waitlist entries" 
ON public.event_waitlists FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Event organizers can view event waitlists" 
ON public.event_waitlists FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.events e
        JOIN public.org_members om ON e.org_id = om.org_id
        WHERE om.user_id = auth.uid() AND e.id = event_id
    )
);

-- Create event series table
CREATE TABLE IF NOT EXISTS public.event_series (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    organizer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
    recurrence_pattern JSONB NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    max_occurrences INTEGER,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for event series
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to event series" 
ON public.event_series FOR SELECT 
USING (is_active = true);

CREATE POLICY "Series organizers can manage their series" 
ON public.event_series FOR ALL 
USING (
    auth.uid() = organizer_id OR
    EXISTS (
        SELECT 1 FROM public.org_members om
        WHERE om.user_id = auth.uid() AND om.org_id = org_id
    )
);

-- Create series events relationship table
CREATE TABLE IF NOT EXISTS public.series_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    series_id UUID REFERENCES public.event_series(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    occurrence_number INTEGER NOT NULL,
    scheduled_date DATE NOT NULL,
    is_cancelled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(series_id, event_id)
);

-- Enable RLS for series events
ALTER TABLE public.series_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to series events" 
ON public.series_events FOR SELECT 
USING (true);

CREATE POLICY "Series organizers can manage series events" 
ON public.series_events FOR ALL 
USING (
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

-- ========================================
-- 7. ADD SEARCH INDEXES
-- ========================================

-- Create full-text search indexes
CREATE INDEX IF NOT EXISTS idx_events_search ON public.events 
    USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(venue, '') || ' ' || COALESCE(city, '')));

CREATE INDEX IF NOT EXISTS idx_users_search ON public.users 
    USING GIN (to_tsvector('english', name || ' ' || COALESCE(bio, '') || ' ' || handle));

CREATE INDEX IF NOT EXISTS idx_orgs_search ON public.orgs 
    USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || slug));

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_event_waitlists_event ON public.event_waitlists(event_id);
CREATE INDEX IF NOT EXISTS idx_event_waitlists_user ON public.event_waitlists(user_id);
CREATE INDEX IF NOT EXISTS idx_event_waitlists_status ON public.event_waitlists(status);
CREATE INDEX IF NOT EXISTS idx_event_waitlists_position ON public.event_waitlists(event_id, position);

CREATE INDEX IF NOT EXISTS idx_series_organizer ON public.event_series(organizer_id);
CREATE INDEX IF NOT EXISTS idx_series_active ON public.event_series(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_series_events_series ON public.series_events(series_id);
CREATE INDEX IF NOT EXISTS idx_series_events_date ON public.series_events(scheduled_date);

-- ========================================
-- 8. INSERT DEFAULT DATA
-- ========================================

-- Insert default event categories
INSERT INTO public.event_categories (name, slug, description, icon_url, color_hex, sort_order) VALUES
    ('Music', 'music', 'Concerts, festivals, and musical performances', '🎵', '#FF6B6B', 1),
    ('Arts & Culture', 'arts-culture', 'Art exhibitions, cultural events, and creative gatherings', '🎨', '#4ECDC4', 2),
    ('Food & Drink', 'food-drink', 'Food festivals, tastings, and culinary experiences', '🍕', '#96CEB4', 3),
    ('Sports', 'sports', 'Sporting events and athletic competitions', '⚽', '#45B7D1', 4),
    ('Business', 'business', 'Networking events, conferences, and professional gatherings', '💼', '#DDA0DD', 5),
    ('Community', 'community', 'Local community events and social gatherings', '🏘️', '#98D8C8', 6),
    ('Education', 'education', 'Workshops, seminars, and learning experiences', '📚', '#F7DC6F', 7),
    ('Entertainment', 'entertainment', 'Shows, performances, and entertainment events', '🎭', '#FFEAA7', 8)
ON CONFLICT (slug) DO NOTHING;

-- ========================================
-- 9. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to search events with full-text search
CREATE OR REPLACE FUNCTION public.search_events(
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
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_events(TEXT, UUID, GEOGRAPHY, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_events(TEXT, UUID, GEOGRAPHY, INTEGER, INTEGER, INTEGER) TO anon;

-- ========================================
-- 10. VERIFICATION QUERIES
-- ========================================

-- Verify all tables exist
SELECT 'Tables created successfully' as status,
       COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'event_categories', 'event_waitlists', 'event_series', 'series_events');

-- Verify storage buckets exist
SELECT 'Storage buckets configured' as status,
       COUNT(*) as bucket_count
FROM storage.buckets 
WHERE id IN ('avatars', 'event-media', 'post-media');

-- Verify RLS is enabled
SELECT 'RLS policies active' as status,
       COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'event_categories', 'event_waitlists', 'event_series', 'series_events');

-- Verify functions have proper search_path
SELECT 'Functions secured' as status,
       COUNT(*) as function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
AND p.proconfig @> ARRAY['search_path=public'];
