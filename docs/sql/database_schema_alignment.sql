-- Database Schema Alignment Script
-- Ensures database structure matches TypeScript interfaces

-- ========================================
-- 1. FIX EVENTS TABLE STRUCTURE
-- ========================================

-- Add missing columns to events table
DO $$ 
BEGIN
    -- Add organizer_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'organizer_id') THEN
        ALTER TABLE public.events ADD COLUMN organizer_id UUID REFERENCES auth.users(id);
    END IF;
    
    -- Add organizer_id if it doesn't exist (alternative reference)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'organizer_id') THEN
        ALTER TABLE public.events ADD COLUMN organizer_id UUID REFERENCES organizations(id);
    END IF;
    
    -- Add missing event fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'slug') THEN
        ALTER TABLE public.events ADD COLUMN slug TEXT UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'short_description') THEN
        ALTER TABLE public.events ADD COLUMN short_description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'subcategory') THEN
        ALTER TABLE public.events ADD COLUMN subcategory TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'tags') THEN
        ALTER TABLE public.events ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'cover_image') THEN
        ALTER TABLE public.events ADD COLUMN cover_image TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'logo') THEN
        ALTER TABLE public.events ADD COLUMN logo TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'gallery') THEN
        ALTER TABLE public.events ADD COLUMN gallery TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'video_url') THEN
        ALTER TABLE public.events ADD COLUMN video_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'doors_open') THEN
        ALTER TABLE public.events ADD COLUMN doors_open TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'doors_close') THEN
        ALTER TABLE public.events ADD COLUMN doors_close TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'is_active') THEN
        ALTER TABLE public.events ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'is_featured') THEN
        ALTER TABLE public.events ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'waitlist_enabled') THEN
        ALTER TABLE public.events ADD COLUMN waitlist_enabled BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'waitlist_count') THEN
        ALTER TABLE public.events ADD COLUMN waitlist_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'price_range') THEN
        ALTER TABLE public.events ADD COLUMN price_range JSONB DEFAULT '{"min": 0, "max": 0, "currency": "USD"}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'currency') THEN
        ALTER TABLE public.events ADD COLUMN currency TEXT DEFAULT 'USD';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'likes_count') THEN
        ALTER TABLE public.events ADD COLUMN likes_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'shares_count') THEN
        ALTER TABLE public.events ADD COLUMN shares_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'views_count') THEN
        ALTER TABLE public.events ADD COLUMN views_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'followers_count') THEN
        ALTER TABLE public.events ADD COLUMN followers_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'published_at') THEN
        ALTER TABLE public.events ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- ========================================
-- 2. CREATE TYPED VIEWS FOR COMPLEX QUERIES
-- ========================================

-- Create a typed view for events with organization details
CREATE OR REPLACE VIEW events_with_org_details AS
SELECT 
    e.*,
    o.id as org_id,
    o.name as org_name,
    o.avatar_url as org_avatar,
    o.description as org_description,
    o.is_verified as org_is_verified,
    COUNT(DISTINCT tt.id) as ticket_tier_count,
    COUNT(DISTINCT ep.id) as post_count,
    COUNT(DISTINCT tw.id) as ticket_count
FROM events e
LEFT JOIN organizations o ON e.organizer_id = o.id
LEFT JOIN ticket_tiers tt ON e.id = tt.event_id
LEFT JOIN event_posts ep ON e.id = ep.event_id
LEFT JOIN ticket_wallet tw ON e.id = tw.event_id
GROUP BY e.id, o.id;

-- Create a typed view for events with full details
CREATE OR REPLACE VIEW events_with_full_details AS
SELECT 
    e.*,
    o.id as org_id,
    o.name as org_name,
    o.avatar_url as org_avatar,
    o.description as org_description,
    o.is_verified as org_is_verified,
    o.created_at as org_created_at,
    o.updated_at as org_updated_at,
    COUNT(DISTINCT tt.id) as ticket_tier_count,
    COUNT(DISTINCT ep.id) as post_count,
    COUNT(DISTINCT tw.id) as ticket_count,
    COUNT(DISTINCT l.id) as like_count,
    COUNT(DISTINCT s.id) as share_count,
    COUNT(DISTINCT v.id) as view_count
FROM events e
LEFT JOIN organizations o ON e.organizer_id = o.id
LEFT JOIN ticket_tiers tt ON e.id = tt.event_id
LEFT JOIN event_posts ep ON e.id = ep.event_id
LEFT JOIN ticket_wallet tw ON e.id = tw.event_id
LEFT JOIN likes l ON e.id = l.event_id
LEFT JOIN shares s ON e.id = s.event_id
LEFT JOIN views v ON e.id = v.event_id
GROUP BY e.id, o.id;

-- ========================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- ========================================

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON events(is_featured);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);

-- Add composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_events_status_category ON events(status, category);
CREATE INDEX IF NOT EXISTS idx_events_status_start_date ON events(status, start_date);
CREATE INDEX IF NOT EXISTS idx_events_organizer_status ON events(organizer_id, status);

-- ========================================
-- 4. UPDATE RLS POLICIES
-- ========================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Users can view events" ON events;
DROP POLICY IF EXISTS "Organizers can manage their events" ON events;

-- Create new policies with proper column references
CREATE POLICY "Events are viewable by everyone" ON events
    FOR SELECT USING (
        status = 'published' AND 
        visibility = 'public' AND 
        is_active = true
    );

CREATE POLICY "Organizers can manage their events" ON events
    FOR ALL USING (
        organizer_id = auth.uid()
    );

CREATE POLICY "Users can view events" ON events
    FOR SELECT USING (
        status = 'published' AND 
        (visibility = 'public' OR 
         (visibility = 'private' AND organizer_id = auth.uid()))
    );

-- ========================================
-- 5. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to get events with proper typing
CREATE OR REPLACE FUNCTION get_events_with_details(
    p_status TEXT DEFAULT 'published',
    p_category TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    event_data JSONB,
    org_data JSONB,
    ticket_tier_count BIGINT,
    post_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_jsonb(e.*) as event_data,
        to_jsonb(o.*) as org_data,
        COUNT(DISTINCT tt.id) as ticket_tier_count,
        COUNT(DISTINCT ep.id) as post_count
    FROM events e
    LEFT JOIN organizations o ON e.organizer_id = o.id
    LEFT JOIN ticket_tiers tt ON e.id = tt.event_id
    LEFT JOIN event_posts ep ON e.id = ep.event_id
    WHERE e.status = p_status
    AND (p_category IS NULL OR e.category = p_category)
    GROUP BY e.id, o.id
    ORDER BY e.start_date ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_events_with_details(TEXT, TEXT, INTEGER, INTEGER) TO authenticated, anon;

-- ========================================
-- 6. VERIFICATION QUERIES
-- ========================================

-- Verify the schema alignment
SELECT 
    'Schema Alignment Complete' as status,
    COUNT(*) as total_events,
    COUNT(CASE WHEN organizer_id IS NOT NULL THEN 1 END) as events_with_organizer,
    COUNT(CASE WHEN slug IS NOT NULL THEN 1 END) as events_with_slug
FROM events;

-- Check for any missing required columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('organizer_id', 'slug', 'short_description', 'tags', 'cover_image')
ORDER BY column_name;
