-- ========================================
-- IMPROVED DATABASE SETUP
-- Enhanced security, performance, and functionality
-- ========================================

-- ========================================
-- 1. ENHANCED USER PROFILES TABLE
-- ========================================

-- Create user profiles table with improved structure
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    handle TEXT UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    website_url TEXT,
    interests TEXT[],
    social_links JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{"profile_visibility": "public", "show_email": false, "show_location": true}',
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(handle);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(location);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen_at DESC);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enhanced RLS Policies with better security
CREATE POLICY "Profiles are viewable by everyone (active users only)" 
ON public.profiles FOR SELECT 
USING (is_active = true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" 
ON public.profiles FOR DELETE 
USING (auth.uid() = id);

-- ========================================
-- 2. ENHANCED EVENT CATEGORIES TABLE
-- ========================================

-- Create event categories table with improved structure
CREATE TABLE IF NOT EXISTS public.event_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    color_hex TEXT DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    parent_category_id UUID REFERENCES public.event_categories(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_categories_slug ON public.event_categories(slug);
CREATE INDEX IF NOT EXISTS idx_event_categories_parent ON public.event_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_event_categories_active ON public.event_categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_event_categories_sort ON public.event_categories(sort_order);

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
        CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category_id);
    END IF;
END $$;

-- ========================================
-- 3. ENHANCED STORAGE BUCKETS CONFIGURATION
-- ========================================

-- Create storage buckets with improved configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES 
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('event-media', 'event-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']),
    ('post-media', 'post-media', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enhanced storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (storage.extension(name))::text IN ('jpg', 'jpeg', 'png', 'webp')
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Enhanced storage policies for event media
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

CREATE POLICY "Event creators can delete event media" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'event-media' 
    AND EXISTS (
        SELECT 1 FROM public.events e 
        JOIN public.org_members om ON e.org_id = om.org_id 
        WHERE om.user_id = auth.uid() 
        AND e.id::text = (storage.foldername(name))[1]
    )
);

-- Enhanced storage policies for post media
CREATE POLICY "Users can upload post media" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'post-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view post media (based on post visibility)" 
ON storage.objects FOR SELECT 
USING (
    bucket_id = 'post-media' 
    AND EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.id::text = (storage.foldername(name))[2]
        AND (p.visibility = 'public' OR p.user_id = auth.uid())
    )
);

CREATE POLICY "Users can update their own post media" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'post-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own post media" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'post-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ========================================
-- 4. ENHANCED AUTO-PROFILE CREATION
-- ========================================

-- Improved auto-create profile function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        display_name, 
        avatar_url,
        handle,
        interests,
        privacy_settings,
        notification_preferences
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'User'),
        new.raw_user_meta_data ->> 'avatar_url',
        COALESCE(new.raw_user_meta_data ->> 'handle', 'user_' || substr(new.id::text, 1, 8)),
        ARRAY[]::TEXT[],
        '{"profile_visibility": "public", "show_email": false, "show_location": true}'::JSONB,
        '{"email": true, "push": true, "sms": false}'::JSONB
    );
    RETURN new;
EXCEPTION
    WHEN unique_violation THEN
        -- Handle duplicate handle gracefully
        INSERT INTO public.profiles (
            id, 
            display_name, 
            avatar_url,
            handle,
            interests,
            privacy_settings,
            notification_preferences
        )
        VALUES (
            new.id,
            COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'User'),
            new.raw_user_meta_data ->> 'avatar_url',
            'user_' || substr(new.id::text, 1, 8) || '_' || floor(random() * 1000)::text,
            ARRAY[]::TEXT[],
            '{"profile_visibility": "public", "show_email": false, "show_location": true}'::JSONB,
            '{"email": true, "push": true, "sms": false}'::JSONB
        );
        RETURN new;
    WHEN OTHERS THEN
        -- Log error and continue
        RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
        RETURN new;
END;
$$;

-- Create trigger for auto-profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ========================================
-- 5. ENHANCED EVENT CATEGORIES DATA
-- ========================================

-- Insert improved default event categories with better metadata
INSERT INTO public.event_categories (name, slug, description, icon_url, color_hex, sort_order, metadata) VALUES
    ('Music', 'music', 'Concerts, festivals, and musical performances', '🎵', '#FF6B6B', 1, '{"popular": true, "tags": ["concert", "festival", "live music"]}'),
    ('Arts & Culture', 'arts-culture', 'Art exhibitions, cultural events, and creative gatherings', '🎨', '#4ECDC4', 2, '{"tags": ["art", "culture", "exhibition"]}'),
    ('Food & Drink', 'food-drink', 'Food festivals, tastings, and culinary experiences', '🍕', '#96CEB4', 3, '{"popular": true, "tags": ["food", "drink", "culinary"]}'),
    ('Sports', 'sports', 'Sporting events and athletic competitions', '⚽', '#45B7D1', 4, '{"tags": ["sports", "athletics", "competition"]}'),
    ('Business', 'business', 'Networking events, conferences, and professional gatherings', '💼', '#DDA0DD', 5, '{"tags": ["networking", "conference", "professional"]}'),
    ('Community', 'community', 'Local community events and social gatherings', '🏘️', '#98D8C8', 6, '{"tags": ["community", "local", "social"]}'),
    ('Education', 'education', 'Workshops, seminars, and learning experiences', '📚', '#F7DC6F', 7, '{"tags": ["workshop", "seminar", "learning"]}'),
    ('Entertainment', 'entertainment', 'Shows, performances, and entertainment events', '🎭', '#FFEAA7', 8, '{"popular": true, "tags": ["show", "performance", "entertainment"]}'),
    ('Technology', 'technology', 'Tech meetups, hackathons, and innovation events', '💻', '#6C5CE7', 9, '{"tags": ["tech", "innovation", "meetup"]}'),
    ('Health & Wellness', 'health-wellness', 'Fitness classes, wellness retreats, and health events', '🧘', '#00B894', 10, '{"tags": ["fitness", "wellness", "health"]}'),
    ('Fashion & Beauty', 'fashion-beauty', 'Fashion shows, beauty events, and style gatherings', '👗', '#FD79A8', 11, '{"tags": ["fashion", "beauty", "style"]}'),
    ('Science & Nature', 'science-nature', 'Science fairs, nature walks, and educational outdoor events', '🔬', '#00CEC9', 12, '{"tags": ["science", "nature", "outdoor"]}')
ON CONFLICT (slug) DO UPDATE SET
    description = EXCLUDED.description,
    icon_url = EXCLUDED.icon_url,
    color_hex = EXCLUDED.color_hex,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata;

-- ========================================
-- 6. ADDITIONAL HELPER FUNCTIONS
-- ========================================

-- Function to update user's last seen timestamp
CREATE OR REPLACE FUNCTION public.update_user_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles 
    SET last_seen_at = now()
    WHERE id = auth.uid();
END;
$$;

-- Function to get user profile with privacy settings
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id_param UUID)
RETURNS TABLE (
    id UUID,
    handle TEXT,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    website_url TEXT,
    interests TEXT[],
    social_links JSONB,
    is_verified BOOLEAN,
    is_active BOOLEAN,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.handle,
        p.display_name,
        p.avatar_url,
        CASE 
            WHEN p.privacy_settings->>'show_bio' = 'true' OR auth.uid() = p.id THEN p.bio
            ELSE NULL
        END as bio,
        CASE 
            WHEN p.privacy_settings->>'show_location' = 'true' OR auth.uid() = p.id THEN p.location
            ELSE NULL
        END as location,
        CASE 
            WHEN p.privacy_settings->>'show_website' = 'true' OR auth.uid() = p.id THEN p.website_url
            ELSE NULL
        END as website_url,
        CASE 
            WHEN p.privacy_settings->>'show_interests' = 'true' OR auth.uid() = p.id THEN p.interests
            ELSE NULL
        END as interests,
        CASE 
            WHEN p.privacy_settings->>'show_social_links' = 'true' OR auth.uid() = p.id THEN p.social_links
            ELSE NULL
        END as social_links,
        p.is_verified,
        p.is_active,
        CASE 
            WHEN p.privacy_settings->>'show_last_seen' = 'true' OR auth.uid() = p.id THEN p.last_seen_at
            ELSE NULL
        END as last_seen_at,
        p.created_at
    FROM public.profiles p
    WHERE p.id = user_id_param AND p.is_active = true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_user_last_seen() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO anon;

-- ========================================
-- 7. VERIFICATION AND CLEANUP
-- ========================================

-- Verify all tables and policies are created correctly
DO $$
DECLARE
    table_count INTEGER;
    policy_count INTEGER;
    bucket_count INTEGER;
BEGIN
    -- Check tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'event_categories');
    
    -- Check policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'event_categories');
    
    -- Check storage buckets
    SELECT COUNT(*) INTO bucket_count
    FROM storage.buckets 
    WHERE id IN ('avatars', 'event-media', 'post-media');
    
    -- Log results
    RAISE NOTICE 'Setup verification: % tables, % policies, % storage buckets', 
        table_count, policy_count, bucket_count;
    
    -- Verify trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        RAISE WARNING 'Auto-profile creation trigger not found!';
    END IF;
    
END $$;

-- ========================================
-- 8. COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON TABLE public.profiles IS 'Enhanced user profiles with privacy settings and social features';
COMMENT ON TABLE public.event_categories IS 'Event categories for better organization and discovery';
COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates user profile on signup with error handling';
COMMENT ON FUNCTION public.update_user_last_seen() IS 'Updates user last seen timestamp for activity tracking';
COMMENT ON FUNCTION public.get_user_profile(UUID) IS 'Gets user profile with privacy settings applied';
