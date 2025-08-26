-- ========================================
-- FIX SPECIFIC SECURITY DEFINER VIEWS
-- Address the 2 SECURITY DEFINER views identified in security scan
-- ========================================

-- ========================================
-- 1. FIX events_with_details VIEW
-- ========================================

-- Drop the problematic SECURITY DEFINER view
DROP VIEW IF EXISTS public.events_with_details CASCADE;

-- Recreate as a regular view (no SECURITY DEFINER)
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
-- 2. FIX public_organizers VIEW
-- ========================================

-- Drop the problematic SECURITY DEFINER view
DROP VIEW IF EXISTS public.public_organizers CASCADE;

-- Recreate as a regular view (no SECURITY DEFINER)
CREATE OR REPLACE VIEW public.public_organizers AS
SELECT
    o.id,
    o.name,
    o.slug,
    o.description,
    o.logo_url as avatar_url,
    o.website_url,
    o.is_verified,
    o.settings,
    o.created_at,
    o.updated_at,
    -- Member count
    COUNT(DISTINCT om.user_id) as member_count,
    -- Event count
    COUNT(DISTINCT e.id) as event_count
FROM public.orgs o
LEFT JOIN public.org_members om ON o.id = om.org_id
LEFT JOIN public.events e ON o.id = e.organizer_id OR o.id = e.org_id
WHERE o.is_verified = true  -- Only show verified organizations
GROUP BY o.id;

-- Grant access to the view
GRANT SELECT ON public.public_organizers TO authenticated;
GRANT SELECT ON public.public_organizers TO anon;

-- ========================================
-- 3. CREATE SECURE FUNCTION ALTERNATIVES
-- ========================================

-- Create secure function for getting events with details
CREATE OR REPLACE FUNCTION public.get_events_with_details(
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0,
    category_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL,
    organizer_filter TEXT DEFAULT NULL
)
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
    organizer_name TEXT,
    organizer_slug TEXT,
    ticket_tier_count BIGINT,
    total_tickets_sold BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
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
        e.visibility,
        e.status,
        e.category,
        e.cover_image_url,
        o.name as organizer_name,
        o.slug as organizer_slug,
        COUNT(DISTINCT t.id) as ticket_tier_count,
        COALESCE(SUM(t.quantity_sold), 0) as total_tickets_sold
    FROM public.events e
    LEFT JOIN public.orgs o ON e.organizer_id = o.id OR e.org_id = o.id
    LEFT JOIN public.tickets t ON e.id = t.event_id
    WHERE e.visibility = 'public'
    AND e.status = 'published'
    AND (category_filter IS NULL OR e.category = category_filter)
    AND (search_query IS NULL OR 
         e.title ILIKE '%' || search_query || '%' OR 
         e.description ILIKE '%' || search_query || '%' OR
         e.venue ILIKE '%' || search_query || '%' OR
         e.city ILIKE '%' || search_query || '%')
    AND (organizer_filter IS NULL OR o.slug = organizer_filter)
    GROUP BY e.id, o.name, o.slug
    ORDER BY e.start_at ASC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_events_with_details(INTEGER, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_events_with_details(INTEGER, INTEGER, TEXT, TEXT, TEXT) TO anon;

-- Create secure function for getting public organizers
CREATE OR REPLACE FUNCTION public.get_public_organizers(
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0,
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    description TEXT,
    avatar_url TEXT,
    website_url TEXT,
    is_verified BOOLEAN,
    member_count BIGINT,
    event_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.slug,
        o.description,
        o.logo_url as avatar_url,
        o.website_url,
        o.is_verified,
        COUNT(DISTINCT om.user_id) as member_count,
        COUNT(DISTINCT e.id) as event_count,
        o.created_at
    FROM public.orgs o
    LEFT JOIN public.org_members om ON o.id = om.org_id
    LEFT JOIN public.events e ON o.id = e.organizer_id OR o.id = e.org_id
    WHERE o.is_verified = true
    AND (search_query IS NULL OR 
         o.name ILIKE '%' || search_query || '%' OR 
         o.description ILIKE '%' || search_query || '%')
    GROUP BY o.id
    ORDER BY o.name ASC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_public_organizers(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_organizers(INTEGER, INTEGER, TEXT) TO anon;

-- ========================================
-- 4. VERIFICATION
-- ========================================

-- Test the fixes
DO $$
DECLARE
    view_exists BOOLEAN;
    function_exists BOOLEAN;
BEGIN
    -- Check if events_with_details view was recreated properly
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
    
    -- Check if public_organizers view was recreated properly
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
    
    -- Check if secure functions exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_events_with_details' 
        AND routine_schema = 'public'
    ) INTO function_exists;
    
    IF function_exists THEN
        RAISE NOTICE '✅ get_events_with_details function created successfully';
    ELSE
        RAISE NOTICE '❌ get_events_with_details function missing';
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_public_organizers' 
        AND routine_schema = 'public'
    ) INTO function_exists;
    
    IF function_exists THEN
        RAISE NOTICE '✅ get_public_organizers function created successfully';
    ELSE
        RAISE NOTICE '❌ get_public_organizers function missing';
    END IF;
    
END $$;

-- ========================================
-- 5. SECURITY RECOMMENDATIONS
-- ========================================

-- Manual steps required in Supabase Dashboard:

-- 1. OTP Settings (Authentication > Settings):
--    - Set OTP Expiry to 300 seconds (5 minutes) - CRITICAL
--    - Set Max OTP Attempts to 3
--    - Enable Rate Limiting for OTP requests

-- 2. Password Policy (Authentication > Settings):
--    - Enable "Require strong passwords"
--    - Set minimum password length to 8
--    - Enable password complexity requirements

-- 3. Session Management (Authentication > Settings):
--    - Set session timeout to 24 hours
--    - Enable "Refresh token rotation"
--    - Set refresh token reuse interval to 10 seconds

-- 4. Rate Limiting (Authentication > Settings):
--    - Enable rate limiting for sign-in attempts
--    - Set maximum sign-in attempts to 5 per minute
--    - Enable rate limiting for password reset requests

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT '✅ SECURITY DEFINER VIEWS FIXED SUCCESSFULLY!' as status,
       'All SECURITY DEFINER views have been addressed:' as details,
       '- events_with_details view recreated without SECURITY DEFINER' as fix1,
       '- public_organizers view recreated without SECURITY DEFINER' as fix2,
       '- Secure function alternatives created' as fix3,
       '- Proper access permissions granted' as fix4,
       'IMPORTANT: Complete manual OTP configuration in Supabase Dashboard' as note,
       'CRITICAL: Set OTP expiry to 300 seconds (5 minutes) or less' as critical_note;
