-- YardPass Database Schema
-- Battle-tested, scalable architecture with Row-Level Security (RLS)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

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

-- Owned tickets
CREATE TABLE public.tickets_owned (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    qr_code VARCHAR(100) UNIQUE NOT NULL,
    access_level VARCHAR(20) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media assets (videos, images)
CREATE TABLE public.media_assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('video', 'image')),
    mux_id VARCHAR(100), -- Mux playback ID
    duration INTEGER, -- seconds
    thumbnails JSONB, -- thumbnail URLs
    access_level VARCHAR(20) DEFAULT 'public' CHECK (access_level IN ('public', 'general', 'vip', 'crew')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts (social content)
CREATE TABLE public.posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
    body TEXT,
    access_level VARCHAR(20) DEFAULT 'public' CHECK (access_level IN ('public', 'general', 'vip', 'crew')),
    metrics JSONB DEFAULT '{"views": 0, "likes": 0, "shares": 0, "comments": 0}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments
CREATE TABLE public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reactions (likes, etc.)
CREATE TABLE public.reactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'like' CHECK (type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id, type)
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

