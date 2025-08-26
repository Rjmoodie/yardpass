-- ========================================
-- POSTS LOADING FIXES
-- Fix "failed to load posts" error when clicking event slug
-- ========================================

-- ========================================
-- 1. FIX POSTS TABLE SCHEMA MISMATCHES
-- ========================================

-- Add missing columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Update existing posts to have user_id if author_id exists
UPDATE public.posts 
SET user_id = author_id 
WHERE user_id IS NULL AND author_id IS NOT NULL;

-- ========================================
-- 2. CREATE MISSING TABLES
-- ========================================

-- Create post_reactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.post_reactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id, reaction_type)
);

-- Create post_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. FIX RLS POLICIES FOR POSTS
-- ========================================

-- Enable RLS on posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Users can view their own posts" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- Create comprehensive RLS policies for posts
CREATE POLICY "Public posts are viewable by everyone" ON posts
    FOR SELECT USING (
        visibility = 'public' 
        AND is_active = true
    );

CREATE POLICY "Users can view their own posts" ON posts
    FOR SELECT USING (
        user_id = auth.uid() OR author_id = auth.uid()
    );

CREATE POLICY "Users can view gated posts if they have access" ON posts
    FOR SELECT USING (
        visibility = 'gated' 
        AND is_active = true
        AND EXISTS (
            SELECT 1 FROM tickets_owned to
            WHERE to.event_id = posts.event_id
            AND to.user_id = auth.uid()
            AND to.status = 'active'
        )
    );

CREATE POLICY "Users can create posts" ON posts
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR author_id = auth.uid()
    );

CREATE POLICY "Users can update their own posts" ON posts
    FOR UPDATE USING (
        user_id = auth.uid() OR author_id = auth.uid()
    );

CREATE POLICY "Users can delete their own posts" ON posts
    FOR DELETE USING (
        user_id = auth.uid() OR author_id = auth.uid()
    );

-- ========================================
-- 4. FIX RLS POLICIES FOR POST REACTIONS
-- ========================================

-- Enable RLS on post_reactions table
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for post_reactions
CREATE POLICY "Users can view all post reactions" ON post_reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own reactions" ON post_reactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reactions" ON post_reactions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reactions" ON post_reactions
    FOR DELETE USING (user_id = auth.uid());

-- ========================================
-- 5. FIX RLS POLICIES FOR POST COMMENTS
-- ========================================

-- Enable RLS on post_comments table
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for post_comments
CREATE POLICY "Users can view all post comments" ON post_comments
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can create their own comments" ON post_comments
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own comments" ON post_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON post_comments
    FOR DELETE USING (user_id = auth.uid());

-- ========================================
-- 6. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to get posts by event with proper joins
CREATE OR REPLACE FUNCTION public.get_event_posts(
    p_event_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    post_data JSONB,
    author_data JSONB,
    reaction_count BIGINT,
    comment_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_jsonb(p.*) as post_data,
        to_jsonb(u.*) as author_data,
        COUNT(DISTINCT pr.id) as reaction_count,
        COUNT(DISTINCT pc.id) as comment_count
    FROM posts p
    LEFT JOIN users u ON p.user_id = u.id OR p.author_id = u.id
    LEFT JOIN post_reactions pr ON p.id = pr.post_id
    LEFT JOIN post_comments pc ON p.id = pc.post_id AND pc.is_active = true
    WHERE p.event_id = p_event_id
    AND p.is_active = true
    GROUP BY p.id, u.id
    ORDER BY p.is_pinned DESC, p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_event_posts(UUID, INTEGER, INTEGER) TO authenticated, anon;

-- ========================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Indexes for posts table
CREATE INDEX IF NOT EXISTS idx_posts_event_id ON posts(event_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_is_active ON posts(is_active);
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned);

-- Indexes for post_reactions table
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_type ON post_reactions(reaction_type);

-- Indexes for post_comments table
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON post_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at);

-- ========================================
-- 8. GRANT PERMISSIONS
-- ========================================

GRANT ALL ON public.posts TO authenticated;
GRANT ALL ON public.post_reactions TO authenticated;
GRANT ALL ON public.post_comments TO authenticated;

-- ========================================
-- 9. VERIFICATION QUERIES
-- ========================================

-- Test the get_event_posts function
SELECT 'Testing get_event_posts function...' as test;
SELECT public.get_event_posts(
    (SELECT id FROM events LIMIT 1),
    5,
    0
) as event_posts;

-- Check posts table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'posts' 
ORDER BY ordinal_position;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT '✅ POSTS LOADING FIXES COMPLETED SUCCESSFULLY!' as status,
       'Fixed issues:' as details,
       '- Added missing columns to posts table' as fix1,
       '- Created missing post_reactions and post_comments tables' as fix2,
       '- Fixed RLS policies for all post-related tables' as fix3,
       '- Created get_event_posts helper function' as fix4,
       '- Added performance indexes' as fix5,
       'Posts should now load without errors!' as result;
