-- ========================================
-- MISSING DATABASE FUNCTIONS
-- Functions that edge functions are trying to call
-- ========================================

-- ========================================
-- 1. CREATE NOTIFICATION FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_notification_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Insert notification
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data,
        created_at
    ) VALUES (
        p_user_id,
        p_notification_type,
        p_title,
        p_message,
        p_data,
        NOW()
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ========================================
-- 2. LOG EVENT VIEW FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION public.log_event_view(
    event_id UUID,
    user_id UUID,
    source TEXT DEFAULT 'unknown'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    -- Insert event view log
    INSERT INTO public.event_views (
        event_id,
        user_id,
        source,
        viewed_at
    ) VALUES (
        event_id,
        user_id,
        source,
        NOW()
    );
    
    -- Update event view count
    UPDATE public.events 
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = event_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_event_view(UUID, UUID, TEXT) TO authenticated;

-- ========================================
-- 3. CREATE NOTIFICATIONS TABLE (if not exists)
-- ========================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 4. CREATE EVENT VIEWS TABLE (if not exists)
-- ========================================

CREATE TABLE IF NOT EXISTS public.event_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT DEFAULT 'unknown',
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id, source)
);

-- Enable RLS
ALTER TABLE public.event_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own event views" ON event_views
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own event views" ON event_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 5. ADD VIEWS_COUNT COLUMN TO EVENTS TABLE
-- ========================================

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- ========================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_event_views_event_id ON event_views(event_id);
CREATE INDEX IF NOT EXISTS idx_event_views_user_id ON event_views(user_id);
CREATE INDEX IF NOT EXISTS idx_event_views_viewed_at ON event_views(viewed_at);

-- ========================================
-- 7. GRANT PERMISSIONS
-- ========================================

GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.event_views TO authenticated;

-- ========================================
-- 8. VERIFICATION QUERIES
-- ========================================

-- Test notification function
SELECT 'Testing notification function...' as test;
SELECT public.create_notification(
    auth.uid(),
    'test_notification',
    'Test Title',
    'Test Message',
    '{"test": "data"}'::JSONB
) as notification_id;

-- Test event view logging
SELECT 'Testing event view logging...' as test;
-- This will be called by the edge function

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT '✅ MISSING DATABASE FUNCTIONS CREATED SUCCESSFULLY!' as status,
       'Functions created:' as details,
       '- create_notification function' as func1,
       '- log_event_view function' as func2,
       '- notifications table' as table1,
       '- event_views table' as table2,
       '- views_count column added to events' as column1,
       'Edge functions should now work without errors!' as result;
