-- YardPass Database Schema
-- Battle-tested, scalable architecture with Row-Level Security (RLS)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For trigram similarity search

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    handle VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'organizer', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations table
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

-- Organization members
CREATE TABLE public.org_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- Events table
CREATE TABLE public.events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    city VARCHAR(100),
    venue VARCHAR(200),
    address TEXT,
    location GEOGRAPHY(POINT),
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
    category VARCHAR(50),
    tags TEXT[],
    cover_image_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket tiers
CREATE TABLE public.tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    quantity_available INTEGER NOT NULL,
    quantity_sold INTEGER DEFAULT 0,
    perks JSONB DEFAULT '[]',
    access_level VARCHAR(20) DEFAULT 'general' CHECK (access_level IN ('general', 'vip', 'crew')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    total DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    provider_ref VARCHAR(100), -- Stripe payment intent ID
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets owned by users
CREATE TABLE public.tickets_owned (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    access_level VARCHAR(20) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media assets (videos, images)
CREATE TABLE public.media_assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('image', 'video')),
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER, -- for videos, in seconds
    size INTEGER, -- file size in bytes
    mux_id VARCHAR(255), -- Mux asset ID for video processing
    mux_playback_id VARCHAR(255), -- Mux playback ID for streaming
    metadata JSONB DEFAULT '{}',
    access_level VARCHAR(20) DEFAULT 'public' CHECK (access_level IN ('public', 'gated', 'private')),
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts (social media style)
CREATE TABLE public.posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    author_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
    title VARCHAR(200),
    body TEXT,
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'gated', 'private')),
    access_level VARCHAR(20) DEFAULT 'general' CHECK (access_level IN ('general', 'vip', 'crew')),
    is_active BOOLEAN DEFAULT TRUE,
    is_sponsored BOOLEAN DEFAULT FALSE,
    sponsored_by UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments on posts
CREATE TABLE public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reactions (likes, etc.)
CREATE TABLE public.reactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'like' CHECK (type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id, type)
);

-- Follows (users following organizers)
CREATE TABLE public.follows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    organizer_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, organizer_id)
);

-- Check-ins (ticket scanning)
CREATE TABLE public.checkins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tickets_owned_id UUID REFERENCES public.tickets_owned(id) ON DELETE CASCADE,
    scanned_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location GEOGRAPHY(POINT),
    metadata JSONB DEFAULT '{}'
);

-- Ad campaigns
CREATE TABLE public.ad_campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
    objective VARCHAR(50) NOT NULL,
    budget DECIMAL(10,2) NOT NULL,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    targeting JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ad creatives
CREATE TABLE public.ad_creatives (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
    cta VARCHAR(100),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search analytics table
CREATE TABLE public.search_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    query TEXT NOT NULL,
    query_length INTEGER NOT NULL,
    search_type VARCHAR(20) DEFAULT 'global',
    results_count INTEGER DEFAULT 0,
    has_results BOOLEAN DEFAULT TRUE,
    search_time_ms INTEGER,
    filters_applied JSONB DEFAULT '{}',
    clicked_result_id UUID,
    clicked_result_type VARCHAR(20),
    position_clicked INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search suggestions table
CREATE TABLE public.search_suggestions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    query TEXT NOT NULL,
    suggestion_type VARCHAR(20) NOT NULL CHECK (suggestion_type IN ('trending', 'popular', 'related')),
    target_id UUID,
    target_type VARCHAR(20),
    relevance_score DECIMAL(3,2) DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_events_org_id ON public.events(org_id);
CREATE INDEX idx_events_start_at ON public.events(start_at);
CREATE INDEX idx_events_location ON public.events USING GIST(location);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_posts_event_id ON public.posts(event_id);
CREATE INDEX idx_posts_author_id ON public.posts(author_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at);
CREATE INDEX idx_tickets_owned_user_id ON public.tickets_owned(user_id);
CREATE INDEX idx_tickets_owned_qr_code ON public.tickets_owned(qr_code);
CREATE INDEX idx_tickets_owned_qr_code_image ON public.tickets_owned(qr_code_image);
CREATE INDEX idx_tickets_owned_qr_code_data ON public.tickets_owned USING GIN(qr_code_data);
CREATE INDEX idx_media_assets_mux_id ON public.media_assets(mux_id);
CREATE INDEX idx_media_assets_status ON public.media_assets(status);
CREATE INDEX idx_media_assets_type ON public.media_assets(type);
CREATE INDEX idx_reactions_post_id ON public.reactions(post_id);
CREATE INDEX idx_follows_organizer_id ON public.follows(organizer_id);

-- Critical indexes for ticketing performance
CREATE INDEX idx_tickets_owned_user_event ON public.tickets_owned(user_id, event_id);
CREATE INDEX idx_tickets_owned_qr_code_hash ON public.tickets_owned(qr_code);
CREATE INDEX idx_orders_user_status ON public.orders(user_id, status);
CREATE INDEX idx_orders_event_status ON public.orders(event_id, status);
CREATE INDEX idx_tickets_event_active ON public.tickets(event_id, is_active);
CREATE INDEX idx_tickets_owned_status ON public.tickets_owned(is_used);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_tickets_owned_created_at ON public.tickets_owned(created_at DESC);

-- Composite indexes for complex queries
CREATE INDEX idx_tickets_owned_user_status ON public.tickets_owned(user_id, is_used);
CREATE INDEX idx_orders_user_created ON public.orders(user_id, created_at DESC);
CREATE INDEX idx_tickets_event_price ON public.tickets(event_id, price);

-- Critical indexes for organizer performance
CREATE INDEX idx_events_organizer_status ON public.events(org_id, status);
CREATE INDEX idx_events_organizer_start ON public.events(org_id, start_at);
CREATE INDEX idx_events_organizer_created ON public.events(org_id, created_at DESC);
CREATE INDEX idx_orgs_verified ON public.orgs(is_verified);
CREATE INDEX idx_orgs_created ON public.orgs(created_at DESC);
CREATE INDEX idx_org_members_org ON public.org_members(org_id);
CREATE INDEX idx_org_members_user ON public.org_members(user_id);
CREATE INDEX idx_org_members_role ON public.org_members(org_id, role);

-- Composite indexes for complex organizer queries
CREATE INDEX idx_events_org_status_start ON public.events(org_id, status, start_at);
CREATE INDEX idx_events_org_visibility_status ON public.events(org_id, visibility, status);
CREATE INDEX idx_org_members_org_role ON public.org_members(org_id, role);

-- ✅ CRITICAL: Full-text search indexes for industry-standard search performance
CREATE INDEX idx_events_search ON public.events USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(city, '') || ' ' || COALESCE(venue, '')));
CREATE INDEX idx_events_search_trgm ON public.events USING GIN(title gin_trgm_ops, description gin_trgm_ops, city gin_trgm_ops, venue gin_trgm_ops);

CREATE INDEX idx_orgs_search ON public.orgs USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_orgs_search_trgm ON public.orgs USING GIN(name gin_trgm_ops, description gin_trgm_ops);

CREATE INDEX idx_users_search ON public.users USING GIN(to_tsvector('english', name || ' ' || COALESCE(bio, '') || ' ' || handle));
CREATE INDEX idx_users_search_trgm ON public.users USING GIN(name gin_trgm_ops, bio gin_trgm_ops, handle gin_trgm_ops);

CREATE INDEX idx_posts_search ON public.posts USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(body, '')));
CREATE INDEX idx_posts_search_trgm ON public.posts USING GIN(title gin_trgm_ops, body gin_trgm_ops);

-- Search analytics indexes
CREATE INDEX idx_search_analytics_query ON public.search_analytics(query);
CREATE INDEX idx_search_analytics_timestamp ON public.search_analytics(timestamp DESC);
CREATE INDEX idx_search_analytics_user ON public.search_analytics(user_id);
CREATE INDEX idx_search_analytics_session ON public.search_analytics(session_id);

-- Search suggestions indexes
CREATE INDEX idx_search_suggestions_query ON public.search_suggestions(query);
CREATE INDEX idx_search_suggestions_type ON public.search_suggestions(suggestion_type);
CREATE INDEX idx_search_suggestions_relevance ON public.search_suggestions(relevance_score DESC);
CREATE INDEX idx_search_suggestions_usage ON public.search_suggestions(usage_count DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets_owned ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_suggestions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view public profiles" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Posts policies (complex access control)
CREATE POLICY "Posts: view if public or user has access" ON public.posts
    FOR SELECT USING (
        access_level = 'public' OR
        EXISTS (
            SELECT 1 FROM public.tickets_owned to
            JOIN public.tickets t ON to.ticket_id = t.id
            WHERE t.event_id = posts.event_id 
            AND to.user_id = auth.uid()
            AND to.access_level >= posts.access_level
        ) OR
        EXISTS (
            SELECT 1 FROM public.org_members om
            WHERE om.org_id = (
                SELECT org_id FROM public.events WHERE id = posts.event_id
            )
            AND om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Posts: create if user has access" ON public.posts
    FOR INSERT WITH CHECK (
        author_id = auth.uid() AND
        (access_level = 'public' OR
         EXISTS (
             SELECT 1 FROM public.tickets_owned to
             JOIN public.tickets t ON to.ticket_id = t.id
             WHERE t.event_id = posts.event_id 
             AND to.user_id = auth.uid()
             AND to.access_level >= posts.access_level
         ))
    );

-- Media assets policies (similar to posts)
CREATE POLICY "Media: view if public or user has access" ON public.media_assets
    FOR SELECT USING (
        access_level = 'public' OR
        EXISTS (
            SELECT 1 FROM public.tickets_owned to
            JOIN public.tickets t ON to.ticket_id = t.id
            WHERE t.event_id = media_assets.event_id 
            AND to.user_id = auth.uid()
            AND to.access_level >= media_assets.access_level
        )
    );

-- Orders policies (user can only see own orders)
CREATE POLICY "Orders: user can view own orders" ON public.orders
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Orders: user can create own orders" ON public.orders
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Tickets owned policies
CREATE POLICY "Tickets: user can view own tickets" ON public.tickets_owned
    FOR SELECT USING (user_id = auth.uid());

-- Events policies
CREATE POLICY "Events: view if public" ON public.events
    FOR SELECT USING (visibility = 'public' OR status = 'published');

-- Follows policies
CREATE POLICY "Follows: view public follows" ON public.follows
    FOR SELECT USING (true);

CREATE POLICY "Follows: user can manage own follows" ON public.follows
    FOR ALL USING (follower_id = auth.uid());

-- Search analytics policies (users can only see their own analytics)
CREATE POLICY "Search Analytics: user can view own analytics" ON public.search_analytics
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Search Analytics: user can insert own analytics" ON public.search_analytics
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Search suggestions policies (public read, admin write)
CREATE POLICY "Search Suggestions: public read" ON public.search_suggestions
    FOR SELECT USING (true);

-- Functions for common operations
CREATE OR REPLACE FUNCTION public.get_user_access_level(event_id UUID)
RETURNS VARCHAR(20) AS $$
BEGIN
    RETURN (
        SELECT COALESCE(MAX(to.access_level), 'none')
        FROM public.tickets_owned to
        JOIN public.tickets t ON to.ticket_id = t.id
        WHERE t.event_id = get_user_access_level.event_id
        AND to.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ NEW: Search relevance scoring function
CREATE OR REPLACE FUNCTION public.calculate_search_relevance(
    search_query TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    popularity_score INTEGER DEFAULT 0
)
RETURNS DECIMAL(5,4) AS $$
DECLARE
    relevance_score DECIMAL(5,4) := 0.0;
    title_match BOOLEAN := FALSE;
    description_match BOOLEAN := FALSE;
    category_match BOOLEAN := FALSE;
BEGIN
    -- Title match (highest weight)
    IF to_tsvector('english', title) @@ plainto_tsquery('english', search_query) THEN
        relevance_score := relevance_score + 0.4;
        title_match := TRUE;
    END IF;
    
    -- Description match
    IF to_tsvector('english', COALESCE(description, '')) @@ plainto_tsquery('english', search_query) THEN
        relevance_score := relevance_score + 0.3;
        description_match := TRUE;
    END IF;
    
    -- Category match
    IF category ILIKE '%' || search_query || '%' THEN
        relevance_score := relevance_score + 0.2;
        category_match := TRUE;
    END IF;
    
    -- Verification bonus
    IF is_verified THEN
        relevance_score := relevance_score + 0.05;
    END IF;
    
    -- Popularity bonus (normalized)
    relevance_score := relevance_score + LEAST(popularity_score::DECIMAL / 1000, 0.05);
    
    -- Exact match bonus
    IF title ILIKE search_query OR title ILIKE search_query || '%' THEN
        relevance_score := relevance_score + 0.1;
    END IF;
    
    RETURN LEAST(relevance_score, 1.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ✅ NEW: Search suggestions function
CREATE OR REPLACE FUNCTION public.get_search_suggestions(
    partial_query TEXT,
    suggestion_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    suggestion TEXT,
    suggestion_type VARCHAR(20),
    relevance_score DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.query as suggestion,
        ss.suggestion_type,
        ss.relevance_score
    FROM public.search_suggestions ss
    WHERE ss.query ILIKE partial_query || '%'
    ORDER BY ss.relevance_score DESC, ss.usage_count DESC
    LIMIT suggestion_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

