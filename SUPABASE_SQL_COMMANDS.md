# Supabase SQL Commands to Fix Missing Tables and Column Mismatches

Copy and paste these commands into your Supabase SQL Editor to fix the database structure issues.

## 1. Create Missing Reference Tables

```sql
-- Create event_categories table
CREATE TABLE IF NOT EXISTS public.event_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    color_hex VARCHAR(7),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_tags table
CREATE TABLE IF NOT EXISTS public.event_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    is_trending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_analytics table
CREATE TABLE IF NOT EXISTS public.user_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_analytics table
CREATE TABLE IF NOT EXISTS public.event_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_value NUMERIC,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 2. Fix Column Mismatches in Existing Tables

```sql
-- Fix posts table - add missing image_url column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'image_url') THEN
        ALTER TABLE public.posts ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Fix orgs table - add missing columns
DO $$ 
BEGIN
    -- Add logo_url if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orgs' AND column_name = 'logo_url') THEN
        ALTER TABLE public.orgs ADD COLUMN logo_url TEXT;
    END IF;
    
    -- Add is_verified if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orgs' AND column_name = 'is_verified') THEN
        ALTER TABLE public.orgs ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add settings if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orgs' AND column_name = 'settings') THEN
        ALTER TABLE public.orgs ADD COLUMN settings JSONB DEFAULT '{}';
    END IF;
END $$;

-- Fix events table - add missing columns
DO $$ 
BEGIN
    -- Add category_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'category_id') THEN
        ALTER TABLE public.events ADD COLUMN category_id UUID REFERENCES public.event_categories(id);
    END IF;
    
    -- Add tags if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'tags') THEN
        ALTER TABLE public.events ADD COLUMN tags UUID[] DEFAULT '{}';
    END IF;
    
    -- Add settings if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'settings') THEN
        ALTER TABLE public.events ADD COLUMN settings JSONB DEFAULT '{}';
    END IF;
END $$;

-- Fix tickets table - add missing columns
DO $$ 
BEGIN
    -- Add perks if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'perks') THEN
        ALTER TABLE public.tickets ADD COLUMN perks JSONB DEFAULT '[]';
    END IF;
    
    -- Add is_active if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'is_active') THEN
        ALTER TABLE public.tickets ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Fix orders table - add missing columns
DO $$ 
BEGIN
    -- Add provider_ref if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'provider_ref') THEN
        ALTER TABLE public.orders ADD COLUMN provider_ref TEXT;
    END IF;
    
    -- Add metadata if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'metadata') THEN
        ALTER TABLE public.orders ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Rename total_amount to total if total_amount exists but total doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'total_amount') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'orders' AND column_name = 'total') THEN
        ALTER TABLE public.orders RENAME COLUMN total_amount TO total;
    END IF;
END $$;

-- Fix tickets_owned table - add missing columns
DO $$ 
BEGIN
    -- Add is_used if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets_owned' AND column_name = 'is_used') THEN
        ALTER TABLE public.tickets_owned ADD COLUMN is_used BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add used_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets_owned' AND column_name = 'used_at') THEN
        ALTER TABLE public.tickets_owned ADD COLUMN used_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add access_level if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets_owned' AND column_name = 'access_level') THEN
        ALTER TABLE public.tickets_owned ADD COLUMN access_level VARCHAR(20) DEFAULT 'general';
    END IF;
END $$;
```

## 3. Insert Reference Data

```sql
-- Insert Event Categories
INSERT INTO public.event_categories (id, name, slug, description, icon_url, color_hex, sort_order) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Music', 'music', 'Live music events and concerts', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop', '#FF6B6B', 1),
('550e8400-e29b-41d4-a716-446655440002', 'Sports', 'sports', 'Athletic events and competitions', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop', '#4ECDC4', 2),
('550e8400-e29b-41d4-a716-446655440003', 'Technology', 'technology', 'Tech meetups and conferences', 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=100&h=100&fit=crop', '#45B7D1', 3),
('550e8400-e29b-41d4-a716-446655440004', 'Food & Drink', 'food-drink', 'Culinary events and tastings', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=100&h=100&fit=crop', '#96CEB4', 4),
('550e8400-e29b-41d4-a716-446655440005', 'Art & Culture', 'art-culture', 'Art exhibitions and cultural events', 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=100&h=100&fit=crop', '#FFEAA7', 5),
('550e8400-e29b-41d4-a716-446655440006', 'Business', 'business', 'Networking and business events', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=100&h=100&fit=crop', '#DDA0DD', 6),
('550e8400-e29b-41d4-a716-446655440007', 'Education', 'education', 'Workshops and learning events', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=100&h=100&fit=crop', '#98D8C8', 7),
('550e8400-e29b-41d4-a716-446655440008', 'Entertainment', 'entertainment', 'Comedy, theater, and shows', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop', '#F7DC6F', 8)
ON CONFLICT (id) DO NOTHING;

-- Insert Event Tags
INSERT INTO public.event_tags (id, name, slug, description, usage_count, is_trending) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'VIP', 'vip', 'Premium access and exclusive benefits', 25, true),
('550e8400-e29b-41d4-a716-446655440102', 'All Ages', 'all-ages', 'Suitable for all age groups', 150, false),
('550e8400-e29b-41d4-a716-446655440103', '21+', '21-plus', 'Adults only events', 45, false),
('550e8400-e29b-41d4-a716-446655440104', 'Free', 'free', 'No cost to attend', 200, true),
('550e8400-e29b-41d4-a716-446655440105', 'Outdoor', 'outdoor', 'Events held outdoors', 120, false),
('550e8400-e29b-41d4-a716-446655440106', 'Indoor', 'indoor', 'Events held indoors', 180, false),
('550e8400-e29b-41d4-a716-446655440107', 'Featured', 'featured', 'Highlighted events', 30, true),
('550e8400-e29b-41d4-a716-446655440108', 'Limited Capacity', 'limited-capacity', 'Limited seating available', 60, false)
ON CONFLICT (id) DO NOTHING;
```

## 4. Create Indexes for Performance

```sql
-- Indexes for event_categories
CREATE INDEX IF NOT EXISTS idx_event_categories_slug ON public.event_categories(slug);
CREATE INDEX IF NOT EXISTS idx_event_categories_sort_order ON public.event_categories(sort_order);

-- Indexes for event_tags
CREATE INDEX IF NOT EXISTS idx_event_tags_slug ON public.event_tags(slug);
CREATE INDEX IF NOT EXISTS idx_event_tags_trending ON public.event_tags(is_trending);

-- Indexes for analytics tables
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_id ON public.user_analytics(event_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_action_type ON public.user_analytics(action_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON public.user_analytics(created_at);

CREATE INDEX IF NOT EXISTS idx_event_analytics_event_id ON public.event_analytics(event_id);
CREATE INDEX IF NOT EXISTS idx_event_analytics_metric_type ON public.event_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_event_analytics_created_at ON public.event_analytics(created_at);
```

## 5. Verification Query

```sql
-- Check if all tables exist and have data
SELECT 
    'Database Structure Verification' as check_type,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('event_categories', 'event_tags', 'user_analytics', 'event_analytics');

-- Check reference data
SELECT 
    'Event Categories' as table_name,
    COUNT(*) as record_count
FROM public.event_categories
UNION ALL
SELECT 
    'Event Tags' as table_name,
    COUNT(*) as record_count
FROM public.event_tags;
```

## Instructions

1. **Open your Supabase Dashboard**
2. **Go to the SQL Editor**
3. **Copy and paste each section above**
4. **Run them in order (1, 2, 3, 4, 5)**
5. **After running all commands, test with: `node test_mock_data.js`**

## Expected Results

After running these commands, you should have:
- ✅ 4 new reference tables created
- ✅ Column mismatches fixed in existing tables
- ✅ 8 event categories inserted
- ✅ 8 event tags inserted
- ✅ Performance indexes created
- ✅ All tables accessible via Node.js scripts

## Next Steps

Once these SQL commands are executed successfully:
1. Run `node test_mock_data.js` to verify all tables are accessible
2. Run `node insert_mock_data_corrected.js` to insert mock data
3. Your database will be ready for frontend development!
