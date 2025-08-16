import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Post, PostsState, FeedFilter, FeedItem, PostVisibility, AccessLevel, ApiResponse, PaginatedResponse } from '@/types';
import { supabase, isUsingMockData } from '@/services/supabase';
import { mockDataService } from '@/services/mockData';

// Enhanced async thunks with proper error handling and caching
export const fetchFeed = createAsyncThunk(
  'posts/fetchFeed',
  async (filter: FeedFilter, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState() as { auth: { user: any } };
      const user = auth.user;

      // Use mock data if Supabase is not configured
      if (isUsingMockData) {
        const mockPosts = await mockDataService.getPosts();
        
        // Transform mock data to FeedItems
        const feedItems: FeedItem[] = mockPosts.map(post => ({
          id: post.id,
          post,
          event: post.event,
          author: post.author,
          isGated: post.visibility === PostVisibility.GATED,
          hasAccess: canAccessContent(user, post.accessLevel),
          distance: filter.location ? calculateDistance(
            filter.location.latitude,
            filter.location.longitude,
            post.event.location.latitude,
            post.event.location.longitude
          ) : undefined,
          relevanceScore: calculateRelevanceScore(post, user, filter),
          isSponsored: post.isSponsored,
          sponsoredBy: post.organizer
        }));

        return {
          data: feedItems,
          count: feedItems.length,
          filter
        };
      }

      let query = supabase
        .from('posts')
        .select(`
          *,
          event:events(*),
          author:users(*),
          organizer:organizers(*)
        `)
        .eq('isActive', true)
        .order('createdAt', { ascending: false });

      // Apply filters
      if (filter.type === 'following' && user) {
        // Get followed organizers
        const { data: follows } = await supabase
          .from('organizer_follows')
          .select('organizerId')
          .eq('userId', user.id);
        
        if (follows && follows.length > 0) {
          const organizerIds = follows.map(f => f.organizerId);
          query = query.in('organizerId', organizerIds);
        }
      }

      if (filter.category) {
        query = query.eq('event.category', filter.category);
      }

      if (filter.location && filter.radius) {
        // Use PostGIS for location-based queries
        query = query.rpc('nearby_events', {
          lat: filter.location.latitude,
          lng: filter.location.longitude,
          radius_meters: filter.radius * 1000
        });
      }

      if (filter.dateRange) {
        query = query
          .gte('event.startDate', filter.dateRange[0])
          .lte('event.startDate', filter.dateRange[1]);
      }

      const { data, error, count } = await query.range(0, 19);

      if (error) {
        throw new Error(error.message);
      }

      // Transform to FeedItems with access control
      const feedItems: FeedItem[] = data?.map(post => ({
        id: post.id,
        post,
        event: post.event,
        author: post.author,
        isGated: post.visibility === PostVisibility.GATED,
        hasAccess: canAccessContent(user, post.accessLevel),
        distance: filter.location ? calculateDistance(
          filter.location.latitude,
          filter.location.longitude,
          post.event.location.latitude,
          post.event.location.longitude
        ) : undefined,
        relevanceScore: calculateRelevanceScore(post, user, filter),
        isSponsored: post.isSponsored,
        sponsoredBy: post.organizer
      })) || [];

      return {
        data: feedItems,
        count: count || 0,
        filter
      };

    } catch (error) {
      console.error('Error fetching feed:', error);
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to fetch feed',
        code: 'FEED_FETCH_ERROR'
      });
    }
  },
  {
    condition: (_, { getState }) => {
      const { posts } = getState() as { posts: PostsState };
      // Prevent duplicate requests
      if (posts.isLoading) {
        return false;
      }
      // Check cache validity
      if (posts.feed.length > 0 && Date.now() - (posts._cachedAt || 0) < 30000) {
        return false;
      }
    }
  }
);

export const fetchPostsByEvent = createAsyncThunk(
  'posts/fetchPostsByEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:users(*),
          event:events(*)
        `)
        .eq('eventId', eventId)
        .eq('isActive', true)
        .order('isPinned', { ascending: false })
        .order('createdAt', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];

    } catch (error) {
      console.error('Error fetching event posts:', error);
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to fetch event posts',
        code: 'EVENT_POSTS_FETCH_ERROR'
      });
    }
  }
);

export const createPost = createAsyncThunk(
  'posts/createPost',
  async (postData: {
    eventId: string;
    type: string;
    mediaUrl: string;
    thumbnailUrl: string;
    caption: string;
    hashtags: string[];
    mentions: string[];
    visibility: PostVisibility;
    accessLevel: AccessLevel;
    scheduledAt?: string;
  }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState() as { auth: { user: any } };
      const user = auth.user;

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate event access
      const { data: event } = await supabase
        .from('events')
        .select('organizerId, status')
        .eq('id', postData.eventId)
        .single();

      if (!event) {
        throw new Error('Event not found');
      }

      // Check if user can post to this event
      const canPost = event.organizerId === user.id || 
                     (event.status === 'on_sale' && postData.accessLevel === AccessLevel.GENERAL);

      if (!canPost) {
        throw new Error('Insufficient permissions to post to this event');
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({
          ...postData,
          authorId: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select(`
          *,
          author:users(*),
          event:events(*)
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;

    } catch (error) {
      console.error('Error creating post:', error);
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to create post',
        code: 'POST_CREATE_ERROR'
      });
    }
  }
);

export const likePost = createAsyncThunk(
  'posts/likePost',
  async (postId: string, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState() as { auth: { user: any } };
      const user = auth.user;

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('postId', postId)
        .eq('userId', user.id)
        .single();

      if (existingLike) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('id', existingLike.id);

        // Update post like count
        await supabase.rpc('decrement_post_likes', { post_id: postId });

        return { postId, liked: false };
      } else {
        // Like
        await supabase
          .from('post_likes')
          .insert({
            postId,
            userId: user.id,
            createdAt: new Date().toISOString()
          });

        // Update post like count
        await supabase.rpc('increment_post_likes', { post_id: postId });

        return { postId, liked: true };
      }

    } catch (error) {
      console.error('Error liking post:', error);
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to like post',
        code: 'POST_LIKE_ERROR'
      });
    }
  }
);

export const sharePost = createAsyncThunk(
  'posts/sharePost',
  async (postId: string, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState() as { auth: { user: any } };
      const user = auth.user;

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Record share
      await supabase
        .from('post_shares')
        .insert({
          postId,
          userId: user.id,
          createdAt: new Date().toISOString()
        });

      // Update post share count
      await supabase.rpc('increment_post_shares', { post_id: postId });

      return { postId };

    } catch (error) {
      console.error('Error sharing post:', error);
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to share post',
        code: 'POST_SHARE_ERROR'
      });
    }
  }
);

export const incrementViewCount = createAsyncThunk(
  'posts/incrementViewCount',
  async (postId: string, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState() as { auth: { user: any } };
      const user = auth.user;

      // Record view (even for anonymous users)
      await supabase
        .from('post_views')
        .insert({
          postId,
          userId: user?.id || null,
          createdAt: new Date().toISOString()
        });

      // Update post view count
      await supabase.rpc('increment_post_views', { post_id: postId });

      return { postId };

    } catch (error) {
      console.error('Error incrementing view count:', error);
      // Don't reject for view count errors as they're not critical
      return { postId };
    }
  }
);

export const updateWatchTime = createAsyncThunk(
  'posts/updateWatchTime',
  async ({ postId, watchTime }: { postId: string; watchTime: number }, { rejectWithValue }) => {
    try {
      await supabase.rpc('update_post_watch_time', { 
        post_id: postId, 
        watch_time: watchTime 
      });

      return { postId, watchTime };

    } catch (error) {
      console.error('Error updating watch time:', error);
      // Don't reject for watch time errors as they're not critical
      return { postId, watchTime };
    }
  }
);

// Helper functions
function canAccessContent(user: any, accessLevel: AccessLevel): boolean {
  if (!user) return false;
  
  // Check user's ticket access levels
  // This would need to be implemented based on user's tickets
  return accessLevel === AccessLevel.GENERAL;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateRelevanceScore(post: any, user: any, filter: FeedFilter): number {
  let score = 0;
  
  // Base score
  score += post.likes * 0.1;
  score += post.shares * 0.2;
  score += post.views * 0.01;
  
  // Recency boost
  const daysSinceCreation = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 10 - daysSinceCreation);
  
  // User relevance
  if (user) {
    // Followed organizer boost
    if (user.followedOrganizers?.includes(post.organizerId)) {
      score += 50;
    }
    
    // Interest match boost
    if (user.interests?.some(interest => post.event.tags.includes(interest))) {
      score += 20;
    }
  }
  
  // Location relevance
  if (filter.location && post.event.location) {
    const distance = calculateDistance(
      filter.location.latitude,
      filter.location.longitude,
      post.event.location.latitude,
      post.event.location.longitude
    );
    score += Math.max(0, 30 - distance);
  }
  
  return Math.round(score);
}

// Enhanced initial state
const initialState: PostsState = {
  posts: [],
  feed: [],
  currentPost: null,
  userPosts: [],
  isLoading: false,
  error: null,
  filters: {
    type: 'for_you'
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  },
  _cachedAt: 0
};

// Enhanced slice with comprehensive error handling
const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPost: (state, action: PayloadAction<Post | null>) => {
      state.currentPost = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<FeedFilter>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = { type: 'for_you' };
    },
    addPost: (state, action: PayloadAction<Post>) => {
      state.posts.unshift(action.payload);
      state.userPosts.unshift(action.payload);
    },
    updatePostInList: (state, action: PayloadAction<{ id: string; updates: Partial<Post> }>) => {
      const { id, updates } = action.payload;
      const postIndex = state.posts.findIndex(p => p.id === id);
      if (postIndex !== -1) {
        state.posts[postIndex] = { ...state.posts[postIndex], ...updates };
      }
      
      const feedIndex = state.feed.findIndex(f => f.post.id === id);
      if (feedIndex !== -1) {
        state.feed[feedIndex].post = { ...state.feed[feedIndex].post, ...updates };
      }
    },
    removePostFromList: (state, action: PayloadAction<string>) => {
      const postId = action.payload;
      state.posts = state.posts.filter(p => p.id !== postId);
      state.feed = state.feed.filter(f => f.post.id !== postId);
      state.userPosts = state.userPosts.filter(p => p.id !== postId);
    },
    setFeedItems: (state, action: PayloadAction<FeedItem[]>) => {
      state.feed = action.payload;
      state._cachedAt = Date.now();
    },
    clearFeed: (state) => {
      state.feed = [];
      state._cachedAt = 0;
    },
    updateLikeStatus: (state, action: PayloadAction<{ postId: string; liked: boolean }>) => {
      const { postId, liked } = action.payload;
      const post = state.posts.find(p => p.id === postId);
      if (post) {
        post.isLiked = liked;
        post.likes += liked ? 1 : -1;
      }
      
      const feedItem = state.feed.find(f => f.post.id === postId);
      if (feedItem) {
        feedItem.post.isLiked = liked;
        feedItem.post.likes += liked ? 1 : -1;
      }
    },
    updateShareCount: (state, action: PayloadAction<{ postId: string }>) => {
      const { postId } = action.payload;
      const post = state.posts.find(p => p.id === postId);
      if (post) {
        post.shares += 1;
      }
      
      const feedItem = state.feed.find(f => f.post.id === postId);
      if (feedItem) {
        feedItem.post.shares += 1;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Feed
      .addCase(fetchFeed.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.isLoading = false;
        state.feed = action.payload.data;
        state.pagination.total = action.payload.count;
        state.pagination.hasNext = action.payload.count > state.feed.length;
        state._cachedAt = Date.now();
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch feed';
      })
      
      // Fetch Event Posts
      .addCase(fetchPostsByEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPostsByEvent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.posts = action.payload;
      })
      .addCase(fetchPostsByEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch event posts';
      })
      
      // Create Post
      .addCase(createPost.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.isLoading = false;
        state.posts.unshift(action.payload);
        state.userPosts.unshift(action.payload);
      })
      .addCase(createPost.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to create post';
      })
      
      // Like Post
      .addCase(likePost.fulfilled, (state, action) => {
        const { postId, liked } = action.payload;
        const post = state.posts.find(p => p.id === postId);
        if (post) {
          post.isLiked = liked;
          post.likes += liked ? 1 : -1;
        }
        
        const feedItem = state.feed.find(f => f.post.id === postId);
        if (feedItem) {
          feedItem.post.isLiked = liked;
          feedItem.post.likes += liked ? 1 : -1;
        }
      })
      
      // Share Post
      .addCase(sharePost.fulfilled, (state, action) => {
        const { postId } = action.payload;
        const post = state.posts.find(p => p.id === postId);
        if (post) {
          post.shares += 1;
        }
        
        const feedItem = state.feed.find(f => f.post.id === postId);
        if (feedItem) {
          feedItem.post.shares += 1;
        }
      });
  }
});

export const {
  clearError,
  setCurrentPost,
  setFilters,
  clearFilters,
  addPost,
  updatePostInList,
  removePostFromList,
  setFeedItems,
  clearFeed,
  updateLikeStatus,
  updateShareCount
} = postsSlice.actions;

export default postsSlice.reducer;
