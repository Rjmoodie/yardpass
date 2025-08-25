-- ========================================
-- FINAL SECURITY DEFINER VIEW FIX - CORRECTED
-- Fixed to use correct table names from schema
-- ========================================

-- Drop and recreate the SECURITY DEFINER views without SECURITY DEFINER

-- Drop the problematic views first
DROP VIEW IF EXISTS public.events_with_details CASCADE;
DROP VIEW IF EXISTS public.public_organizers CASCADE;

-- Recreate events_with_details as a regular view (not SECURITY DEFINER)
CREATE VIEW public.events_with_details AS
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
    e.organizer_id,
    -- Organization details
    CASE 
        WHEN e.owner_context_type = 'organization' THEN o.name
        ELSE 'Individual Organizer'
    END as organizer_name,
    CASE 
        WHEN e.owner_context_type = 'organization' THEN o.slug
        ELSE 'individual'
    END as organizer_slug,
    CASE 
        WHEN e.owner_context_type = 'organization' THEN o.description
        ELSE NULL
    END as organizer_description,
    CASE 
        WHEN e.owner_context_type = 'organization' THEN o.logo_url
        ELSE NULL
    END as organizer_logo_url,
    CASE 
        WHEN e.owner_context_type = 'organization' THEN o.website_url
        ELSE NULL
    END as organizer_website_url,
    CASE 
        WHEN e.owner_context_type = 'organization' AND o.verification_status IN ('verified', 'pro') THEN true
        ELSE false
    END as organizer_is_verified,
    -- Cultural guide info
    cg.themes as cultural_themes,
    cg.community_context as cultural_context,
    cg.etiquette_tips as cultural_etiquette,
    -- Counts (using correct table names)
    COALESCE(tt_count.count, 0) as ticket_tier_count,
    COALESCE(tickets_sold.count, 0) as total_tickets_sold,
    COALESCE(post_count.count, 0) as post_count
FROM public.events e
LEFT JOIN public.organizations o ON (e.owner_context_type = 'organization' AND e.owner_context_id = o.id)
LEFT JOIN public.cultural_guides cg ON e.id = cg.event_id
LEFT JOIN (
    SELECT event_id, COUNT(*) as count
    FROM public.ticket_tiers
    WHERE is_active = true
    GROUP BY event_id
) tt_count ON e.id = tt_count.event_id
LEFT JOIN (
    SELECT to.event_id, COUNT(*) as count
    FROM public.tickets_owned to
    WHERE to.is_used = false
    GROUP BY to.event_id
) tickets_sold ON e.id = tickets_sold.event_id
LEFT JOIN (
    SELECT event_id, COUNT(*) as count
    FROM public.posts
    WHERE is_active = true
    GROUP BY event_id
) post_count ON e.id = post_count.event_id;

-- Recreate public_organizers as a regular view (not SECURITY DEFINER)
CREATE VIEW public.public_organizers AS
SELECT 
    o.id,
    o.name,
    o.slug,
    o.description,
    o.logo_url as avatar_url,
    o.website_url,
    CASE WHEN o.verification_status IN ('verified', 'pro') THEN true ELSE false END as is_verified,
    o.settings,
    o.created_at,
    o.updated_at,
    -- Member count
    COALESCE(member_count.count, 0) as member_count,
    -- Event count
    COALESCE(event_count.count, 0) as event_count
FROM public.organizations o
LEFT JOIN (
    SELECT org_id, COUNT(*) as count
    FROM public.org_members
    GROUP BY org_id
) member_count ON o.id = member_count.org_id
LEFT JOIN (
    SELECT owner_context_id, COUNT(*) as count
    FROM public.events
    WHERE owner_context_type = 'organization' AND status = 'published'
    GROUP BY owner_context_id
) event_count ON o.id = event_count.owner_context_id;

-- Grant access to the views
GRANT SELECT ON public.events_with_details TO authenticated;
GRANT SELECT ON public.events_with_details TO anon;
GRANT SELECT ON public.public_organizers TO authenticated;
GRANT SELECT ON public.public_organizers TO anon;

-- Verification
DO $$
DECLARE
    view_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'events_with_details' 
        AND table_schema = 'public'
    ) INTO view_exists;
    
    IF view_exists THEN
        RAISE NOTICE '✅ events_with_details view recreated successfully';
    ELSE
        RAISE NOTICE '❌ events_with_details view missing';
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'public_organizers' 
        AND table_schema = 'public'
    ) INTO view_exists;
    
    IF view_exists THEN
        RAISE NOTICE '✅ public_organizers view recreated successfully';
    ELSE
        RAISE NOTICE '❌ public_organizers view missing';
    END IF;
END $$;
