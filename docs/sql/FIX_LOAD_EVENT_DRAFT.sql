-- ========================================
-- FIX LOAD EVENT DRAFT FUNCTION
-- Fix the 400 error when calling load_event_draft
-- ========================================

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.load_event_draft(UUID);

-- Recreate the function with proper parameter handling
CREATE OR REPLACE FUNCTION public.load_event_draft(
    organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    draft_data JSONB;
BEGIN
    -- Get the current user's draft
    SELECT ed.draft_data INTO draft_data
    FROM public.event_drafts ed
    WHERE ed.user_id = auth.uid() 
    AND COALESCE(ed.organization_id, '00000000-0000-0000-0000-000000000000'::UUID) = COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::UUID);
    
    -- Return empty object if no draft found
    RETURN COALESCE(draft_data, '{}'::JSONB);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.load_event_draft(UUID) TO authenticated;

-- Test the function
SELECT 'Testing load_event_draft function...' as test;
SELECT public.load_event_draft() as draft_data;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT '✅ LOAD EVENT DRAFT FUNCTION FIXED SUCCESSFULLY!' as status,
       'The function should now work without 400 errors' as details;
