-- YardPass Missing Features Implementation
-- Addressing gaps identified by lovable

-- 1. ENHANCED USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    website_url TEXT,
    location TEXT,
    interests TEXT[],
    social_links JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ENHANCED EVENT CATEGORIES
CREATE TABLE IF NOT EXISTS public.event_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    color_hex TEXT DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. EVENT WAITLISTS
CREATE TABLE IF NOT EXISTS public.event_waitlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticket_tier_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    quantity_requested INTEGER DEFAULT 1,
    position INTEGER,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'expired', 'converted')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id, ticket_tier_id)
);

-- 4. EVENT SERIES/RECURRING EVENTS
CREATE TABLE IF NOT EXISTS public.event_series (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recurrence_pattern JSONB NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    max_occurrences INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ENHANCED SEARCH INDEXES
CREATE INDEX IF NOT EXISTS idx_events_search ON public.events 
    USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(venue, '') || ' ' || COALESCE(city, '')));

CREATE INDEX IF NOT EXISTS idx_users_search ON public.users 
    USING GIN (to_tsvector('english', name || ' ' || COALESCE(bio, '') || ' ' || handle));

-- 6. STORAGE BUCKET POLICIES
CREATE POLICY IF NOT EXISTS "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 7. SAMPLE DATA
INSERT INTO public.event_categories (name, slug, description, icon_url, color_hex) VALUES
    ('Music', 'music', 'Live music events and concerts', '🎵', '#FF6B6B'),
    ('Sports', 'sports', 'Sports events and competitions', '⚽', '#4ECDC4'),
    ('Technology', 'technology', 'Tech conferences and workshops', '💻', '#45B7D1'),
    ('Food & Drink', 'food-drink', 'Food festivals and culinary events', '🍕', '#96CEB4')
ON CONFLICT (slug) DO NOTHING;
