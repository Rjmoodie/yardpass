-- ========================================
-- CREATOR FLOW FIXES - OPTIMIZED VERSION
-- ========================================

-- 1. FIX RLS POLICIES FOR EVENT CREATION
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can create events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;

-- Create improved event management policies with proper context type checking
CREATE POLICY "Users can create events" ON events
    FOR INSERT 
    WITH CHECK (
        auth.uid() = created_by OR
        (owner_context_type = 'organization' AND EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_id = owner_context_id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        ))
    );

CREATE POLICY "Users can update their own events" ON events
    FOR UPDATE 
    USING (
        auth.uid() = created_by OR
        (owner_context_type = 'organization' AND EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_id = owner_context_id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        ))
    );

-- 2. CREATE EVENT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.event_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_template_name_per_user UNIQUE(user_id, organization_id, name)
);

-- Enable RLS on event templates
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own templates" ON event_templates
    FOR ALL USING (
        auth.uid() = user_id OR
        (organization_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_id = event_templates.organization_id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        ))
    );

CREATE POLICY "Users can view public templates" ON event_templates
    FOR SELECT USING (is_public = true);

-- 3. CREATE EVENT DRAFTS TABLE
CREATE TABLE IF NOT EXISTS public.event_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    draft_data JSONB NOT NULL DEFAULT '{}',
    last_saved TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_draft_per_user_org UNIQUE(user_id, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::UUID))
);

-- Enable RLS on event drafts
ALTER TABLE public.event_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own drafts" ON event_drafts
    FOR ALL USING (
        auth.uid() = user_id OR
        (organization_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_id = event_drafts.organization_id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        ))
    );

-- 4. ADD COLUMNS TO EVENTS TABLE
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.event_templates(id);

-- 5. CREATE HELPER FUNCTIONS

-- Function to save event draft with proper upsert
CREATE OR REPLACE FUNCTION public.save_event_draft(
    draft_data JSONB,
    organization_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    draft_id UUID;
BEGIN
    INSERT INTO public.event_drafts (user_id, organization_id, draft_data)
    VALUES (auth.uid(), organization_id, draft_data)
    ON CONFLICT (user_id, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::UUID)) 
    DO UPDATE SET 
        draft_data = EXCLUDED.draft_data,
        last_saved = NOW(),
        updated_at = NOW()
    RETURNING id INTO draft_id;
    
    RETURN draft_id;
END;
$$;

-- Function to load event draft
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
    SELECT ed.draft_data INTO draft_data
    FROM public.event_drafts ed
    WHERE ed.user_id = auth.uid() 
    AND COALESCE(ed.organization_id, '00000000-0000-0000-0000-000000000000'::UUID) = COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::UUID);
    
    RETURN COALESCE(draft_data, '{}'::JSONB);
END;
$$;

-- Function to create event from template
CREATE OR REPLACE FUNCTION public.create_event_from_template(
    template_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    template_data JSONB;
BEGIN
    SELECT et.template_data INTO template_data
    FROM public.event_templates et
    WHERE et.id = template_id
    AND (et.user_id = auth.uid() OR et.is_public = true OR
         (et.organization_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM org_members 
             WHERE org_id = et.organization_id 
             AND user_id = auth.uid() 
             AND role IN ('admin', 'owner')
         )));
    
    IF template_data IS NULL THEN
        RAISE EXCEPTION 'Template not found or access denied';
    END IF;
    
    -- Update usage count
    UPDATE public.event_templates 
    SET usage_count = usage_count + 1
    WHERE id = template_id;
    
    RETURN template_data;
END;
$$;

-- 6. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_events_template ON events(template_id);
CREATE INDEX IF NOT EXISTS idx_event_drafts_user_org ON event_drafts(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_event_templates_user_org ON event_templates(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_event_templates_public ON event_templates(is_public) WHERE is_public = true;

-- 7. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.save_event_draft(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.load_event_draft(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_from_template(UUID) TO authenticated;

GRANT ALL ON public.event_templates TO authenticated;
GRANT ALL ON public.event_drafts TO authenticated;

-- 8. VERIFICATION QUERIES
-- Test RLS policies
SELECT 'Testing event creation policy...' as test;
SELECT COUNT(*) as events_count FROM events WHERE created_by = auth.uid();

-- Test template functions
SELECT 'Testing template functions...' as test;
SELECT public.save_event_draft('{"title": "Test Draft"}'::JSONB) as draft_id;

-- Test draft loading
SELECT 'Testing draft loading...' as test;
SELECT public.load_event_draft() as draft_data;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT '✅ OPTIMIZED CREATOR FLOW FIXES COMPLETED SUCCESSFULLY!' as status,
       'Key improvements implemented:' as details,
       '- Improved RLS policies with proper context type checking' as fix1,
       '- Optimized template system with unique constraints' as fix2,
       '- Enhanced draft system with proper upsert logic' as fix3,
       '- Better performance indexes' as fix4,
       '- Proper NULL handling for organization_id' as fix5,
       'IMPORTANT: Update storage bucket policies in Supabase Dashboard' as note,
       'IMPORTANT: Increase file size limits in storage settings' as note2;
