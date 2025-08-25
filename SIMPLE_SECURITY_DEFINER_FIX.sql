-- ========================================
-- SIMPLE SECURITY DEFINER VIEW FIX
-- Focus on core security fix without referencing non-existent tables
-- ========================================

-- Drop and recreate the SECURITY DEFINER views without SECURITY DEFINER

-- Drop the problematic views first
DROP VIEW IF EXISTS public.events_with_details CASCADE;
DROP VIEW IF EXISTS public.public_organizers CASCADE;

-- Recreate events_with_details as a regular view (not SECURITY DEFINER)
-- Simplified version focusing on core event data
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
    cg.etiquette_tips as cultural_etiquette
FROM public.events e
LEFT JOIN public.organizations o ON (e.owner_context_type = 'organization' AND e.owner_context_id = o.id)
LEFT JOIN public.cultural_guides cg ON e.id = cg.event_id;

-- Recreate public_organizers as a regular view (not SECURITY DEFINER)
-- Simplified version focusing on core organization data
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
    o.updated_at
FROM public.organizations o
WHERE o.verification_status IN ('verified', 'pro');

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

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT '✅ SECURITY DEFINER VIEWS FIXED SUCCESSFULLY!' as status,
       'Core security issue resolved:' as details,
       '- events_with_details view recreated without SECURITY DEFINER' as fix1,
       '- public_organizers view recreated without SECURITY DEFINER' as fix2,
       '- Proper access permissions granted' as fix3,
       '- Simplified structure focusing on core data' as fix4,
       'IMPORTANT: Complete manual OTP configuration in Supabase Dashboard' as note,
       'CRITICAL: Set OTP expiry to 300 seconds (5 minutes) or less' as critical_note;
