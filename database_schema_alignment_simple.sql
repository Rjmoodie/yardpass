-- Simplified Database Schema Alignment Script
-- Run this in your Supabase SQL Editor

-- ========================================
-- 1. ADD MISSING COLUMNS TO EVENTS TABLE
-- ========================================

-- Add organizer_id column
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES organizations(id);

-- Add missing event fields
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS gallery TEXT[] DEFAULT '{}';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS doors_open TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS doors_close TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS waitlist_count INTEGER DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS price_range JSONB DEFAULT '{"min": 0, "max": 0, "currency": "USD"}';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- ========================================
-- 2. CREATE TYPED VIEWS
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

-- ========================================
-- 3. ADD PERFORMANCE INDEXES
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
-- 5. VERIFICATION
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
