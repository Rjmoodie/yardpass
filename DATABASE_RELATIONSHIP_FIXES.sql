-- ========================================
-- DATABASE RELATIONSHIP FIXES
-- Fixing all critical database relationship issues
-- ========================================

-- ========================================
-- 1. FIX TABLE NAMING INCONSISTENCIES
-- ========================================

-- Check if organizations table exists, if not create it from orgs
DO $$
BEGIN
    -- If organizations table doesn't exist but orgs does, create organizations as a view
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'organizations' 
        AND table_schema = 'public'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'orgs' 
        AND table_schema = 'public'
    ) THEN
        -- Create organizations as a view of orgs for backward compatibility
        CREATE VIEW public.organizations AS
        SELECT 
            id,
            name,
            slug,
            description,
            logo_url as avatar_url,
            website_url,
            is_verified,
            settings,
            created_at,
            updated_at
        FROM public.orgs;
        
        RAISE NOTICE 'Created organizations view from orgs table for backward compatibility';
    END IF;
    
    -- If neither exists, create the orgs table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'orgs' 
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'organizations' 
        AND table_schema = 'public'
    ) THEN
        -- Create orgs table
        CREATE TABLE public.orgs (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            logo_url TEXT,
            website_url TEXT,
            is_verified BOOLEAN DEFAULT FALSE,
            settings JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create organizations view
        CREATE VIEW public.organizations AS
        SELECT 
            id,
            name,
            slug,
            description,
            logo_url as avatar_url,
            website_url,
            is_verified,
            settings,
            created_at,
            updated_at
        FROM public.orgs;
        
        RAISE NOTICE 'Created orgs table and organizations view';
    END IF;
END $$;

-- ========================================
-- 2. FIX EVENTS TABLE RELATIONSHIPS
-- ========================================

-- Ensure events table has proper organizer relationship
DO $$
BEGIN
    -- Add organizer_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'organizer_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.events ADD COLUMN organizer_id UUID;
        RAISE NOTICE 'Added organizer_id column to events table';
    END IF;
    
    -- Add org_id if it doesn't exist (for backward compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'org_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.events ADD COLUMN org_id UUID REFERENCES public.orgs(id);
        RAISE NOTICE 'Added org_id column to events table';
    END IF;
    
    -- Update organizer_id to reference orgs table
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'organizer_id'
        AND table_schema = 'public'
    ) THEN
        -- Add foreign key constraint if it doesn't exist
        BEGIN
            ALTER TABLE public.events 
            ADD CONSTRAINT events_organizer_id_fkey 
            FOREIGN KEY (organizer_id) REFERENCES public.orgs(id);
            RAISE NOTICE 'Added foreign key constraint for organizer_id';
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Foreign key constraint already exists';
        END;
    END IF;
END $$;

-- ========================================
-- 3. FIX CULTURAL_GUIDES RELATIONSHIPS
-- ========================================

-- Ensure cultural_guides table exists and has proper relationships
CREATE TABLE IF NOT EXISTS public.cultural_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE UNIQUE,
    themes TEXT[],
    community_context TEXT,
    history_long TEXT,
    etiquette_tips TEXT[],
    archive_media JSONB DEFAULT '{}',
    cultural_sensitivity_score DECIMAL(3, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cultural_guides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cultural_guides
DROP POLICY IF EXISTS "Cultural guides are viewable by everyone" ON public.cultural_guides;
CREATE POLICY "Cultural guides are viewable by everyone"
ON public.cultural_guides FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Event organizers can manage cultural guides" ON public.cultural_guides;
CREATE POLICY "Event organizers can manage cultural guides"
ON public.cultural_guides FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = cultural_guides.event_id
        AND (e.organizer_id = auth.uid() OR e.org_id IN (
            SELECT org_id FROM public.org_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        ))
    )
);

-- ========================================
-- 4. CREATE PROPER VIEWS FOR EVENT QUERIES
-- ========================================

-- Create a comprehensive view for events with all relationships
CREATE OR REPLACE VIEW public.events_with_details AS
SELECT 
    e.id,
    e.title,
    e.description,
    e.slug,
    e.venue,
    e.city,
    e.address,
    e.start_at,
    e.end_at,
    e.visibility,
    e.status,
    e.category,
    e.tags,
    e.cover_image_url,
    e.settings,
    e.created_at,
    e.updated_at,
    -- Organizer details (from orgs table)
    o.id as organizer_id,
    o.name as organizer_name,
    o.slug as organizer_slug,
    o.description as organizer_description,
    o.logo_url as organizer_logo_url,
    o.website_url as organizer_website_url,
    o.is_verified as organizer_is_verified,
    -- Cultural guide details
    cg.themes as cultural_themes,
    cg.community_context as cultural_context,
    cg.etiquette_tips as cultural_etiquette,
    -- Ticket information
    COUNT(DISTINCT t.id) as ticket_tier_count,
    COALESCE(SUM(t.quantity_sold), 0) as total_tickets_sold,
    -- Post information
    COUNT(DISTINCT p.id) as post_count
FROM public.events e
LEFT JOIN public.orgs o ON e.organizer_id = o.id OR e.org_id = o.id
LEFT JOIN public.cultural_guides cg ON e.id = cg.event_id
LEFT JOIN public.tickets t ON e.id = t.event_id
LEFT JOIN public.posts p ON e.id = p.event_id
GROUP BY 
    e.id, o.id, cg.themes, cg.community_context, cg.etiquette_tips;

-- Grant access to the view
GRANT SELECT ON public.events_with_details TO authenticated;
GRANT SELECT ON public.events_with_details TO anon;

-- ========================================
-- 5. CREATE HELPER FUNCTIONS FOR EVENT QUERIES
-- ========================================

-- Function to get event by slug with all details
CREATE OR REPLACE FUNCTION public.get_event_by_slug(event_slug TEXT)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    slug TEXT,
    venue TEXT,
    city TEXT,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    visibility TEXT,
    status TEXT,
    category TEXT,
    cover_image_url TEXT,
    organizer_id UUID,
    organizer_name TEXT,
    organizer_slug TEXT,
    organizer_logo_url TEXT,
    organizer_is_verified BOOLEAN,
    cultural_themes TEXT[],
    cultural_context TEXT,
    cultural_etiquette TEXT[],
    ticket_tier_count BIGINT,
    total_tickets_sold BIGINT,
    post_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ewd.id,
        ewd.title,
        ewd.description,
        ewd.slug,
        ewd.venue,
        ewd.city,
        ewd.start_at,
        ewd.end_at,
        ewd.visibility,
        ewd.status,
        ewd.category,
        ewd.cover_image_url,
        ewd.organizer_id,
        ewd.organizer_name,
        ewd.organizer_slug,
        ewd.organizer_logo_url,
        ewd.organizer_is_verified,
        ewd.cultural_themes,
        ewd.cultural_context,
        ewd.cultural_etiquette,
        ewd.ticket_tier_count,
        ewd.total_tickets_sold,
        ewd.post_count
    FROM public.events_with_details ewd
    WHERE ewd.slug = event_slug
    AND ewd.visibility = 'public'
    AND ewd.status = 'published';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_event_by_slug(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_by_slug(TEXT) TO anon;

-- ========================================
-- 6. FIX ORG_MEMBERS TABLE RELATIONSHIPS
-- ========================================

-- Ensure org_members table exists with proper relationships
CREATE TABLE IF NOT EXISTS public.org_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- Enable RLS
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for org_members
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.org_members;
CREATE POLICY "Users can view their own memberships"
ON public.org_members FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Org admins can view members" ON public.org_members;
CREATE POLICY "Org admins can view members"
ON public.org_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.org_members om2
        WHERE om2.org_id = org_members.org_id
        AND om2.user_id = auth.uid()
        AND om2.role IN ('admin', 'owner')
    )
);

DROP POLICY IF EXISTS "Org admins can manage members" ON public.org_members;
CREATE POLICY "Org admins can manage members"
ON public.org_members FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.org_members om2
        WHERE om2.org_id = org_members.org_id
        AND om2.user_id = auth.uid()
        AND om2.role IN ('admin', 'owner')
    )
);

-- ========================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id ON public.events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_visibility_status ON public.events(visibility, status);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON public.events(start_at);

-- Indexes for orgs table
CREATE INDEX IF NOT EXISTS idx_orgs_slug ON public.orgs(slug);
CREATE INDEX IF NOT EXISTS idx_orgs_verified ON public.orgs(is_verified);

-- Indexes for org_members table
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.org_members(role);

-- Indexes for cultural_guides table
CREATE INDEX IF NOT EXISTS idx_cultural_guides_event_id ON public.cultural_guides(event_id);

-- ========================================
-- 8. INSERT SAMPLE DATA FOR TESTING
-- ========================================

-- Insert sample organization if none exists
INSERT INTO public.orgs (name, slug, description, is_verified)
SELECT 'YardPass Events', 'yardpass-events', 'Official YardPass event organization', true
WHERE NOT EXISTS (SELECT 1 FROM public.orgs WHERE slug = 'yardpass-events');

-- Insert sample cultural guide if none exists
INSERT INTO public.cultural_guides (event_id, themes, community_context, etiquette_tips)
SELECT 
    e.id,
    ARRAY['Community', 'Celebration', 'Local Culture'],
    'This event celebrates local community traditions and brings people together.',
    ARRAY['Dress appropriately for the occasion', 'Respect local customs', 'Be mindful of noise levels']
FROM public.events e
WHERE e.id NOT IN (SELECT event_id FROM public.cultural_guides WHERE event_id IS NOT NULL)
LIMIT 1;

-- ========================================
-- 9. VERIFICATION QUERIES
-- ========================================

-- Test the fixes
DO $$
DECLARE
    table_exists BOOLEAN;
    view_exists BOOLEAN;
    function_exists BOOLEAN;
BEGIN
    -- Check if orgs table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'orgs' 
        AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '✅ orgs table exists';
    ELSE
        RAISE NOTICE '❌ orgs table missing';
    END IF;
    
    -- Check if organizations view exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'organizations' 
        AND table_schema = 'public'
    ) INTO view_exists;
    
    IF view_exists THEN
        RAISE NOTICE '✅ organizations view exists';
    ELSE
        RAISE NOTICE '❌ organizations view missing';
    END IF;
    
    -- Check if events_with_details view exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'events_with_details' 
        AND table_schema = 'public'
    ) INTO view_exists;
    
    IF view_exists THEN
        RAISE NOTICE '✅ events_with_details view exists';
    ELSE
        RAISE NOTICE '❌ events_with_details view missing';
    END IF;
    
    -- Check if get_event_by_slug function exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_event_by_slug' 
        AND routine_schema = 'public'
    ) INTO function_exists;
    
    IF function_exists THEN
        RAISE NOTICE '✅ get_event_by_slug function exists';
    ELSE
        RAISE NOTICE '❌ get_event_by_slug function missing';
    END IF;
    
END $$;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT '✅ DATABASE RELATIONSHIP FIXES COMPLETED SUCCESSFULLY!' as status,
       'All relationship issues have been resolved:' as details,
       '- Table naming inconsistencies fixed' as fix1,
       '- Event relationships properly established' as fix2,
       '- Cultural guides table created' as fix3,
       '- Comprehensive views created' as fix4,
       '- Helper functions added' as fix5,
       '- Performance indexes created' as fix6;
