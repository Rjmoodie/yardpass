-- ===== UNIFIED COMMUNICATIONS SCHEMA - CUSTOMIZED FOR YARDPASS =====
-- This schema builds on existing tables and adds unified communications functionality
-- Based on existing: notifications, messages, conversations, profiles, user_preferences

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== ENHANCED USER COMMUNICATION SETTINGS =====
-- Extends existing notification_preferences with more granular control
CREATE TABLE IF NOT EXISTS public.user_communication_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Communication channels (extends existing notification_preferences)
    push_enabled boolean DEFAULT true,
    email_enabled boolean DEFAULT true,
    sms_enabled boolean DEFAULT false,
    in_app_enabled boolean DEFAULT true,
    
    -- Quiet hours (new feature)
    quiet_hours_enabled boolean DEFAULT false,
    quiet_hours_start time DEFAULT '22:00',
    quiet_hours_end time DEFAULT '08:00',
    
    -- Granular notification types (extends existing notification_type constraints)
    notification_types jsonb DEFAULT '{
        "event_reminder": true,
        "event_update": true,
        "ticket_transfer": true,
        "payment_success": true,
        "friend_request": true,
        "system": true,
        "promo": true,
        "general": true
    }'::jsonb,
    
    -- Email preferences (new feature)
    email_preferences jsonb DEFAULT '{
        "frequency": "immediate",
        "digest": false,
        "marketing": false,
        "template_preference": "html"
    }'::jsonb,
    
    -- SMS preferences (new feature)
    sms_preferences jsonb DEFAULT '{
        "frequency": "urgent_only",
        "marketing": false,
        "character_limit": 160
    }'::jsonb,
    
    -- Push preferences (new feature)
    push_preferences jsonb DEFAULT '{
        "sound_enabled": true,
        "vibration_enabled": true,
        "badge_enabled": true,
        "priority": "normal"
    }'::jsonb,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id)
);

-- ===== UNIFIED COMMUNICATIONS TABLE =====
-- Extends existing notifications table with additional communication channels
CREATE TABLE IF NOT EXISTS public.communications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    body text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    
    -- Communication channels (extends existing notification system)
    communication_type text NOT NULL CHECK (communication_type IN ('push', 'email', 'sms', 'in_app', 'all')),
    notification_type text NOT NULL CHECK (notification_type IN (
        'event_reminder', 'event_update', 'ticket_transfer', 'payment_success', 
        'friend_request', 'system', 'promo', 'general'
    )),
    
    -- Status tracking (extends existing is_read, is_sent)
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'scheduled', 'cancelled', 'opened')),
    priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Timing (extends existing scheduled_for)
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    opened_at timestamp with time zone,
    
    -- Templates (new feature)
    email_template text,
    sms_template text,
    push_template text,
    
    -- Delivery tracking (new feature)
    delivery_attempts integer DEFAULT 0,
    error_message text,
    delivery_provider text,
    provider_message_id text,
    
    -- Related entities (extends existing related_entity_type/id)
    related_entity_type text,
    related_entity_id uuid,
    
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ===== USER PUSH TOKENS =====
-- New table for push notification device management
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    push_token text NOT NULL,
    platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_id text,
    app_version text,
    os_version text,
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, push_token, platform)
);

-- ===== EMAIL TEMPLATES =====
-- New table for email template management
CREATE TABLE IF NOT EXISTS public.email_templates (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name text UNIQUE NOT NULL,
    subject text NOT NULL,
    html_body text NOT NULL,
    text_body text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ===== SMS TEMPLATES =====
-- New table for SMS template management
CREATE TABLE IF NOT EXISTS public.sms_templates (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name text UNIQUE NOT NULL,
    message text NOT NULL,
    character_count integer GENERATED ALWAYS AS (char_length(message)) STORED,
    variables jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ===== COMMUNICATION LOGS =====
-- New table for detailed communication tracking
CREATE TABLE IF NOT EXISTS public.communication_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    communication_id uuid REFERENCES public.communications(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    communication_type text NOT NULL,
    action text NOT NULL CHECK (action IN ('sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced', 'scheduled')),
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- ===== PERFORMANCE INDEXES =====
-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_user_communication_settings_user_id ON public.user_communication_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_communications_user_id ON public.communications(user_id);
CREATE INDEX IF NOT EXISTS idx_communications_status ON public.communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_scheduled_at ON public.communications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON public.communications(created_at);
CREATE INDEX IF NOT EXISTS idx_communications_type_status ON public.communications(communication_type, status);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON public.user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_platform ON public.user_push_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_active ON public.user_push_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_communication_logs_communication_id ON public.communication_logs(communication_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_user_id ON public.communication_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_action ON public.communication_logs(action);

-- ===== COMPOSITE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_communications_user_status_type ON public.communications(user_id, status, communication_type);
CREATE INDEX IF NOT EXISTS idx_communications_scheduled_status ON public.communications(scheduled_at, status);

-- ===== SECURITY =====
ALTER TABLE public.user_communication_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====

-- User Communication Settings
CREATE POLICY "Users can view their own communication settings" ON public.user_communication_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own communication settings" ON public.user_communication_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own communication settings" ON public.user_communication_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Communications (extends existing notifications policies)
CREATE POLICY "Users can view their own communications" ON public.communications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Organizers can create communications for their events" ON public.communications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = (data->>'event_id')::uuid
            AND e.owner_context_id = auth.uid()
        )
    );

-- User Push Tokens
CREATE POLICY "Users can manage their own push tokens" ON public.user_push_tokens
    FOR ALL USING (auth.uid() = user_id);

-- Email Templates (read-only for authenticated users)
CREATE POLICY "Authenticated users can view email templates" ON public.email_templates
    FOR SELECT USING (auth.role() = 'authenticated');

-- SMS Templates (read-only for authenticated users)
CREATE POLICY "Authenticated users can view SMS templates" ON public.sms_templates
    FOR SELECT USING (auth.role() = 'authenticated');

-- Communication Logs
CREATE POLICY "Users can view their own communication logs" ON public.communication_logs
    FOR SELECT USING (auth.uid() = user_id);

-- ===== GRANTS =====
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_communication_settings TO authenticated;
GRANT ALL ON public.communications TO authenticated;
GRANT ALL ON public.user_push_tokens TO authenticated;
GRANT SELECT ON public.email_templates TO authenticated;
GRANT SELECT ON public.sms_templates TO authenticated;
GRANT ALL ON public.communication_logs TO authenticated;

-- ===== FUNCTIONS =====

-- Function to get user communication preferences (extends existing notification_preferences)
CREATE OR REPLACE FUNCTION public.get_user_communication_preferences(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    preferences jsonb;
    existing_preferences jsonb;
BEGIN
    -- Get enhanced communication settings
    SELECT jsonb_build_object(
        'push_enabled', ucs.push_enabled,
        'email_enabled', ucs.email_enabled,
        'sms_enabled', ucs.sms_enabled,
        'in_app_enabled', ucs.in_app_enabled,
        'quiet_hours_enabled', ucs.quiet_hours_enabled,
        'quiet_hours_start', ucs.quiet_hours_start,
        'quiet_hours_end', ucs.quiet_hours_end,
        'notification_types', ucs.notification_types,
        'email_preferences', ucs.email_preferences,
        'sms_preferences', ucs.sms_preferences,
        'push_preferences', ucs.push_preferences
    ) INTO preferences
    FROM public.user_communication_settings ucs
    WHERE ucs.user_id = p_user_id;
    
    -- If no enhanced settings, get existing notification preferences
    IF preferences IS NULL THEN
        SELECT notification_preferences INTO existing_preferences
        FROM public.profiles
        WHERE id = p_user_id;
        
        IF existing_preferences IS NOT NULL THEN
            preferences := jsonb_build_object(
                'push_enabled', COALESCE(existing_preferences->>'push', 'true')::boolean,
                'email_enabled', COALESCE(existing_preferences->>'email', 'true')::boolean,
                'sms_enabled', COALESCE(existing_preferences->>'sms', 'false')::boolean,
                'in_app_enabled', true,
                'quiet_hours_enabled', false,
                'quiet_hours_start', '22:00',
                'quiet_hours_end', '08:00',
                'notification_types', '{}'::jsonb,
                'email_preferences', '{}'::jsonb,
                'sms_preferences', '{}'::jsonb,
                'push_preferences', '{}'::jsonb
            );
        END IF;
    END IF;
    
    RETURN COALESCE(preferences, '{}'::jsonb);
END;
$$;

-- Function to check if user should receive communication (respects existing preferences)
CREATE OR REPLACE FUNCTION public.should_receive_communication(
    p_user_id uuid,
    p_communication_type text,
    p_notification_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    settings record;
    current_time_val time;
    quiet_start time;
    quiet_end time;
    existing_preferences jsonb;
BEGIN
    -- Get enhanced communication settings
    SELECT * INTO settings
    FROM public.user_communication_settings
    WHERE user_id = p_user_id;
    
    -- If no enhanced settings, check existing notification preferences
    IF settings IS NULL THEN
        SELECT notification_preferences INTO existing_preferences
        FROM public.profiles
        WHERE id = p_user_id;
        
        IF existing_preferences IS NOT NULL THEN
            -- Check if communication type is enabled in existing preferences
            IF p_communication_type = 'push' AND NOT (existing_preferences->>'push')::boolean THEN
                RETURN false;
            END IF;
            
            IF p_communication_type = 'email' AND NOT (existing_preferences->>'email')::boolean THEN
                RETURN false;
            END IF;
            
            IF p_communication_type = 'sms' AND NOT (existing_preferences->>'sms')::boolean THEN
                RETURN false;
            END IF;
        END IF;
        
        RETURN true;
    END IF;
    
    -- Check if communication type is enabled
    IF p_communication_type = 'push' AND NOT settings.push_enabled THEN
        RETURN false;
    END IF;
    
    IF p_communication_type = 'email' AND NOT settings.email_enabled THEN
        RETURN false;
    END IF;
    
    IF p_communication_type = 'sms' AND NOT settings.sms_enabled THEN
        RETURN false;
    END IF;
    
    -- Check if notification type is enabled
    IF settings.notification_types IS NOT NULL AND 
       NOT (settings.notification_types->>p_notification_type)::boolean THEN
        RETURN false;
    END IF;
    
    -- Check quiet hours
    IF settings.quiet_hours_enabled THEN
        current_time_val := (now()::time);
        quiet_start := settings.quiet_hours_start;
        quiet_end := settings.quiet_hours_end;
        
        -- Handle overnight quiet hours
        IF quiet_start > quiet_end THEN
            -- Quiet hours span midnight (e.g., 22:00 to 08:00)
            IF current_time_val >= quiet_start OR current_time_val <= quiet_end THEN
                RETURN false;
            END IF;
        ELSE
            -- Quiet hours within same day
            IF current_time_val >= quiet_start AND current_time_val <= quiet_end THEN
                RETURN false;
            END IF;
        END IF;
    END IF;
    
    RETURN true;
END;
$$;

-- Function to log communication action
CREATE OR REPLACE FUNCTION public.log_communication_action(
    p_communication_id uuid,
    p_user_id uuid,
    p_communication_type text,
    p_action text,
    p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.communication_logs (
        communication_id,
        user_id,
        communication_type,
        action,
        details
    ) VALUES (
        p_communication_id,
        p_user_id,
        p_communication_type,
        p_action,
        p_details
    );
END;
$$;

-- ===== SAMPLE DATA =====

-- Insert default email templates
INSERT INTO public.email_templates (template_name, subject, html_body, text_body, variables) VALUES
(
    'event_reminder',
    'Reminder: {{event_title}} starts in {{time_until_event}}',
    '<h1>Event Reminder</h1><p>Hi {{user_name}},</p><p>Your event "{{event_title}}" starts in {{time_until_event}}.</p><p><a href="{{event_url}}">View Event</a></p>',
    'Event Reminder\n\nHi {{user_name}},\n\nYour event "{{event_title}}" starts in {{time_until_event}}.\n\nView Event: {{event_url}}',
    '["user_name", "event_title", "time_until_event", "event_url"]'
),
(
    'ticket_purchased',
    'Ticket Confirmation: {{event_title}}',
    '<h1>Ticket Confirmation</h1><p>Hi {{user_name}},</p><p>Your ticket for "{{event_title}}" has been confirmed.</p><p><a href="{{ticket_url}}">View Ticket</a></p>',
    'Ticket Confirmation\n\nHi {{user_name}},\n\nYour ticket for "{{event_title}}" has been confirmed.\n\nView Ticket: {{ticket_url}}',
    '["user_name", "event_title", "ticket_url"]'
);

-- Insert default SMS templates
INSERT INTO public.sms_templates (template_name, message, variables) VALUES
(
    'event_reminder',
    'Reminder: {{event_title}} starts in {{time_until_event}}. {{event_url}}',
    '["event_title", "time_until_event", "event_url"]'
),
(
    'ticket_purchased',
    'Ticket confirmed for {{event_title}}. View at {{ticket_url}}',
    '["event_title", "ticket_url"]'
);

-- ===== TRIGGERS =====

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_communication_settings_updated_at 
    BEFORE UPDATE ON public.user_communication_settings 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_communications_updated_at 
    BEFORE UPDATE ON public.communications 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_push_tokens_updated_at 
    BEFORE UPDATE ON public.user_push_tokens 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON public.email_templates 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sms_templates_updated_at 
    BEFORE UPDATE ON public.sms_templates 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
