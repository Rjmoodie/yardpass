-- ===== MEDIA ASSETS SCHEMA =====
-- Comprehensive media management system for events, posts, profiles, and organizations

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== MEDIA ASSETS TABLE =====
CREATE TABLE IF NOT EXISTS public.media_assets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Uploader information
    uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Context information (what this media belongs to)
    context_type text NOT NULL CHECK (context_type IN ('event', 'post', 'profile', 'organization')),
    context_id uuid NOT NULL,
    
    -- Media information
    media_type text NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
    content_type text NOT NULL,
    url text NOT NULL,
    thumbnail_url text,
    storage_path text NOT NULL,
    filename text NOT NULL,
    file_size integer NOT NULL,
    
    -- Media dimensions and metadata
    width integer,
    height integer,
    duration numeric, -- in seconds for video/audio
    title text,
    description text,
    tags text[] DEFAULT '{}',
    
    -- Processing metadata
    metadata jsonb DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed', 'deleted')),
    
    -- Access control
    access_level text DEFAULT 'public' CHECK (access_level IN ('public', 'private', 'gated', 'vip')),
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Constraints
    CONSTRAINT media_assets_file_size_check CHECK (file_size > 0),
    CONSTRAINT media_assets_dimensions_check CHECK (
        (width IS NULL AND height IS NULL) OR 
        (width > 0 AND height > 0)
    )
);

-- ===== MEDIA PROCESSING QUEUE =====
CREATE TABLE IF NOT EXISTS public.media_processing_queue (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_asset_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
    
    -- Processing information
    processing_type text NOT NULL CHECK (processing_type IN ('optimize', 'resize', 'convert', 'thumbnail', 'transcode')),
    priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- Processing parameters
    parameters jsonb DEFAULT '{}'::jsonb,
    
    -- Processing results
    result_url text,
    result_metadata jsonb DEFAULT '{}'::jsonb,
    error_message text,
    
    -- Processing timestamps
    queued_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    
    -- Retry information
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    next_retry_at timestamp with time zone
);

-- ===== MEDIA USAGE ANALYTICS =====
CREATE TABLE IF NOT EXISTS public.media_analytics (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_asset_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
    
    -- Usage metrics
    views_count integer DEFAULT 0,
    downloads_count integer DEFAULT 0,
    shares_count integer DEFAULT 0,
    likes_count integer DEFAULT 0,
    
    -- Performance metrics
    load_time_ms integer,
    bandwidth_used_bytes bigint DEFAULT 0,
    
    -- Engagement metrics
    time_spent_seconds numeric DEFAULT 0,
    interaction_rate numeric DEFAULT 0,
    
    -- Timestamps
    last_viewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ===== MEDIA COLLECTIONS =====
CREATE TABLE IF NOT EXISTS public.media_collections (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    
    -- Collection owner
    owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    owner_type text NOT NULL CHECK (owner_type IN ('user', 'organization')),
    
    -- Collection settings
    is_public boolean DEFAULT false,
    access_level text DEFAULT 'private' CHECK (access_level IN ('public', 'private', 'gated')),
    
    -- Collection metadata
    cover_media_id uuid REFERENCES public.media_assets(id),
    tags text[] DEFAULT '{}',
    metadata jsonb DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ===== MEDIA COLLECTION ITEMS =====
CREATE TABLE IF NOT EXISTS public.media_collection_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id uuid NOT NULL REFERENCES public.media_collections(id) ON DELETE CASCADE,
    media_asset_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
    
    -- Item metadata
    position integer DEFAULT 0,
    title text,
    description text,
    tags text[] DEFAULT '{}',
    
    -- Timestamps
    added_at timestamp with time zone DEFAULT now(),
    
    -- Constraints
    UNIQUE(collection_id, media_asset_id)
);

-- ===== PERFORMANCE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_media_assets_uploader ON public.media_assets(uploader_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_context ON public.media_assets(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON public.media_assets(media_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON public.media_assets(status);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON public.media_assets(created_at);
CREATE INDEX IF NOT EXISTS idx_media_assets_access_level ON public.media_assets(access_level);

CREATE INDEX IF NOT EXISTS idx_media_processing_queue_status ON public.media_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_media_processing_queue_priority ON public.media_processing_queue(priority);
CREATE INDEX IF NOT EXISTS idx_media_processing_queue_queued_at ON public.media_processing_queue(queued_at);

CREATE INDEX IF NOT EXISTS idx_media_analytics_asset ON public.media_analytics(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_media_analytics_views ON public.media_analytics(views_count);
CREATE INDEX IF NOT EXISTS idx_media_analytics_updated_at ON public.media_analytics(updated_at);

CREATE INDEX IF NOT EXISTS idx_media_collections_owner ON public.media_collections(owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_media_collections_public ON public.media_collections(is_public);
CREATE INDEX IF NOT EXISTS idx_media_collections_access ON public.media_collections(access_level);

CREATE INDEX IF NOT EXISTS idx_media_collection_items_collection ON public.media_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_media_collection_items_position ON public.media_collection_items(position);

-- ===== COMPOSITE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_media_assets_context_type_status ON public.media_assets(context_type, context_id, status);
CREATE INDEX IF NOT EXISTS idx_media_assets_uploader_type ON public.media_assets(uploader_id, media_type);
CREATE INDEX IF NOT EXISTS idx_media_processing_queue_asset_status ON public.media_processing_queue(media_asset_id, status);

-- ===== SECURITY =====
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_collection_items ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====

-- Media Assets
CREATE POLICY "Users can view public media assets" ON public.media_assets
    FOR SELECT USING (access_level = 'public');

CREATE POLICY "Users can view their own media assets" ON public.media_assets
    FOR SELECT USING (uploader_id = auth.uid());

CREATE POLICY "Users can view media assets they have access to" ON public.media_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.media_collection_items mci
            JOIN public.media_collections mc ON mci.collection_id = mc.id
            WHERE mci.media_asset_id = media_assets.id
            AND (mc.owner_id = auth.uid() OR mc.is_public = true)
        )
    );

CREATE POLICY "Users can create their own media assets" ON public.media_assets
    FOR INSERT WITH CHECK (uploader_id = auth.uid());

CREATE POLICY "Users can update their own media assets" ON public.media_assets
    FOR UPDATE USING (uploader_id = auth.uid());

CREATE POLICY "Users can delete their own media assets" ON public.media_assets
    FOR DELETE USING (uploader_id = auth.uid());

-- Media Processing Queue
CREATE POLICY "Users can view their own processing jobs" ON public.media_processing_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.media_assets ma
            WHERE ma.id = media_processing_queue.media_asset_id
            AND ma.uploader_id = auth.uid()
        )
    );

CREATE POLICY "System can manage processing queue" ON public.media_processing_queue
    FOR ALL USING (true);

-- Media Analytics
CREATE POLICY "Users can view analytics for their own media" ON public.media_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.media_assets ma
            WHERE ma.id = media_analytics.media_asset_id
            AND ma.uploader_id = auth.uid()
        )
    );

CREATE POLICY "System can update analytics" ON public.media_analytics
    FOR UPDATE USING (true);

-- Media Collections
CREATE POLICY "Users can view public collections" ON public.media_collections
    FOR SELECT USING (is_public = true OR access_level = 'public');

CREATE POLICY "Users can view their own collections" ON public.media_collections
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own collections" ON public.media_collections
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own collections" ON public.media_collections
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own collections" ON public.media_collections
    FOR DELETE USING (owner_id = auth.uid());

-- Media Collection Items
CREATE POLICY "Users can view items in accessible collections" ON public.media_collection_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.media_collections mc
            WHERE mc.id = media_collection_items.collection_id
            AND (mc.owner_id = auth.uid() OR mc.is_public = true)
        )
    );

CREATE POLICY "Users can manage items in their own collections" ON public.media_collection_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.media_collections mc
            WHERE mc.id = media_collection_items.collection_id
            AND mc.owner_id = auth.uid()
        )
    );

-- ===== GRANTS =====
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.media_assets TO authenticated;
GRANT ALL ON public.media_processing_queue TO authenticated;
GRANT ALL ON public.media_analytics TO authenticated;
GRANT ALL ON public.media_collections TO authenticated;
GRANT ALL ON public.media_collection_items TO authenticated;

-- ===== FUNCTIONS =====

-- Function to get media assets for a context
CREATE OR REPLACE FUNCTION public.get_media_assets(
    p_context_type text,
    p_context_id uuid,
    p_media_type text DEFAULT NULL,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    uploader_id uuid,
    media_type text,
    content_type text,
    url text,
    thumbnail_url text,
    filename text,
    file_size integer,
    width integer,
    height integer,
    duration numeric,
    title text,
    description text,
    tags text[],
    access_level text,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ma.id,
        ma.uploader_id,
        ma.media_type,
        ma.content_type,
        ma.url,
        ma.thumbnail_url,
        ma.filename,
        ma.file_size,
        ma.width,
        ma.height,
        ma.duration,
        ma.title,
        ma.description,
        ma.tags,
        ma.access_level,
        ma.created_at
    FROM public.media_assets ma
    WHERE ma.context_type = p_context_type
    AND ma.context_id = p_context_id
    AND ma.status = 'ready'
    AND (
        ma.access_level = 'public' OR
        ma.uploader_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.media_collection_items mci
            JOIN public.media_collections mc ON mci.collection_id = mc.id
            WHERE mci.media_asset_id = ma.id
            AND (mc.owner_id = auth.uid() OR mc.is_public = true)
        )
    )
    AND (p_media_type IS NULL OR ma.media_type = p_media_type)
    ORDER BY ma.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Function to update media analytics
CREATE OR REPLACE FUNCTION public.update_media_analytics(
    p_media_asset_id uuid,
    p_action text,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.media_analytics (media_asset_id, views_count, downloads_count, shares_count, likes_count, load_time_ms, bandwidth_used_bytes, time_spent_seconds, last_viewed_at)
    VALUES (
        p_media_asset_id,
        CASE WHEN p_action = 'view' THEN 1 ELSE 0 END,
        CASE WHEN p_action = 'download' THEN 1 ELSE 0 END,
        CASE WHEN p_action = 'share' THEN 1 ELSE 0 END,
        CASE WHEN p_action = 'like' THEN 1 ELSE 0 END,
        (p_metadata->>'load_time_ms')::integer,
        (p_metadata->>'bandwidth_used_bytes')::bigint,
        (p_metadata->>'time_spent_seconds')::numeric,
        CASE WHEN p_action = 'view' THEN now() ELSE NULL END
    )
    ON CONFLICT (media_asset_id)
    DO UPDATE SET
        views_count = media_analytics.views_count + CASE WHEN p_action = 'view' THEN 1 ELSE 0 END,
        downloads_count = media_analytics.downloads_count + CASE WHEN p_action = 'download' THEN 1 ELSE 0 END,
        shares_count = media_analytics.shares_count + CASE WHEN p_action = 'share' THEN 1 ELSE 0 END,
        likes_count = media_analytics.likes_count + CASE WHEN p_action = 'like' THEN 1 ELSE 0 END,
        load_time_ms = COALESCE((p_metadata->>'load_time_ms')::integer, media_analytics.load_time_ms),
        bandwidth_used_bytes = media_analytics.bandwidth_used_bytes + COALESCE((p_metadata->>'bandwidth_used_bytes')::bigint, 0),
        time_spent_seconds = media_analytics.time_spent_seconds + COALESCE((p_metadata->>'time_spent_seconds')::numeric, 0),
        last_viewed_at = CASE WHEN p_action = 'view' THEN now() ELSE media_analytics.last_viewed_at END,
        updated_at = now();
END;
$$;

-- Function to get media processing status
CREATE OR REPLACE FUNCTION public.get_media_processing_status(p_media_asset_id uuid)
RETURNS TABLE (
    asset_id uuid,
    asset_status text,
    processing_jobs jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ma.id as asset_id,
        ma.status as asset_status,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', mpq.id,
                    'type', mpq.processing_type,
                    'status', mpq.status,
                    'priority', mpq.priority,
                    'queued_at', mpq.queued_at,
                    'started_at', mpq.started_at,
                    'completed_at', mpq.completed_at,
                    'error_message', mpq.error_message
                )
            ) FILTER (WHERE mpq.id IS NOT NULL),
            '[]'::jsonb
        ) as processing_jobs
    FROM public.media_assets ma
    LEFT JOIN public.media_processing_queue mpq ON ma.id = mpq.media_asset_id
    WHERE ma.id = p_media_asset_id
    AND ma.uploader_id = auth.uid()
    GROUP BY ma.id, ma.status;
END;
$$;

-- ===== TRIGGERS =====

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_media_assets_updated_at 
    BEFORE UPDATE ON public.media_assets 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_media_analytics_updated_at 
    BEFORE UPDATE ON public.media_analytics 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_media_collections_updated_at 
    BEFORE UPDATE ON public.media_collections 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== SAMPLE DATA =====

-- Insert sample media collections
INSERT INTO public.media_collections (name, description, owner_id, owner_type, is_public) VALUES
(
    'Event Highlights',
    'Collection of highlights from various events',
    (SELECT id FROM auth.users LIMIT 1),
    'user',
    true
),
(
    'Organization Media',
    'Official media assets for the organization',
    (SELECT id FROM auth.users LIMIT 1),
    'user',
    false
);
