import { supabase } from '../lib/supabase';
import { Post, ApiResponse, ApiError } from '@yardpass/types';

export class PostsService {
  /**
   * Get posts with filters
   */
  static async getPosts(params: {
    event_id?: string;
    author_id?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ApiResponse<{ posts: Post[]; meta: any }>> {
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          author:profiles(*),
          event:events(*),
          media_asset:media_assets(*)
        `)
        .eq('is_active', true);

      // Apply filters
      if (params.event_id) {
        query = query.eq('event_id', params.event_id);
      }

      if (params.author_id) {
        query = query.eq('author_id', params.author_id);
      }

      // Pagination
      const limit = params.limit || 20;
      const from = params.cursor ? parseInt(params.cursor) : 0;
      const to = from + limit - 1;

      query = query
        .range(from, to)
        .order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: {
          posts: data as Post[],
          meta: {
            total: count || 0,
            page: Math.floor(from / limit) + 1,
            limit,
            hasMore: (data?.length || 0) === limit,
            cursor: (from + limit).toString(),
          },
        },
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'GET_POSTS_FAILED',
        message: error.message || 'Failed to get posts',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Create new post
   */
  static async createPost(postData: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'metrics'>): Promise<ApiResponse<Post>> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          ...postData,
          metrics: {
            views: 0,
            likes: 0,
            shares: 0,
            comments: 0,
          },
        })
        .select()
        .single();

      if (error) throw error;

      return {
        data: data as Post,
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'CREATE_POST_FAILED',
        message: error.message || 'Failed to create post',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Like/unlike post
   */
  static async toggleLike(postId: string, userId: string): Promise<ApiResponse<{ liked: boolean }>> {
    try {
      // Check if already liked
      const { data: existingLike, error: checkError } = await supabase
        .from('reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('type', 'like')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingLike) {
        // Unlike
        const { error: deleteError } = await supabase
          .from('reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
          .eq('type', 'like');

        if (deleteError) throw deleteError;

        return {
          data: { liked: false },
        };
      } else {
        // Like
        const { error: insertError } = await supabase
          .from('reactions')
          .insert({
            post_id: postId,
            user_id: userId,
            type: 'like',
          });

        if (insertError) throw insertError;

        return {
          data: { liked: true },
        };
      }
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'TOGGLE_LIKE_FAILED',
        message: error.message || 'Failed to toggle like',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Increment view count
   */
  static async incrementViewCount(postId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const { error } = await supabase.rpc('increment_post_view_count', {
        post_id: postId,
      });

      if (error) throw error;

      return {
        data: { success: true },
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'INCREMENT_VIEW_COUNT_FAILED',
        message: error.message || 'Failed to increment view count',
        details: error,
      };

      throw apiError;
    }
  }
}


