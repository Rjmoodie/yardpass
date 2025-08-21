import { supabase } from '../lib/supabase';
import { Comment, ApiResponse } from '@yardpass/types';

export class CommentService {
  /**
   * Get comments for a post
   */
  static async getByPostId(
    postId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ApiResponse<Comment[]>> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles!comments_user_id_fkey(
            id,
            user_id,
            username,
            display_name,
            avatar_url,
            verified
          ),
          replies:comments!comments_parent_id_fkey(
            *,
            profiles!comments_user_id_fkey(
              id,
              user_id,
              username,
              display_name,
              avatar_url,
              verified
            )
          )
        `)
        .eq('post_id', postId)
        .is('parent_id', null) // Only top-level comments
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to fetch comments: ${error.message}`);
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch comments',
      };
    }
  }

  /**
   * Get replies to a comment
   */
  static async getReplies(
    commentId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<ApiResponse<Comment[]>> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles!comments_user_id_fkey(
            id,
            user_id,
            username,
            display_name,
            avatar_url,
            verified
          )
        `)
        .eq('parent_id', commentId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to fetch replies: ${error.message}`);
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch replies',
      };
    }
  }

  /**
   * Create a new comment
   */
  static async create(commentData: Omit<Comment, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Comment>> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select(`
          *,
          profiles!comments_user_id_fkey(
            id,
            user_id,
            username,
            display_name,
            avatar_url,
            verified
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to create comment: ${error.message}`);
      }

      // Increment comment count on post
      await supabase.rpc('increment_post_comment_count', { post_id: commentData.post_id });

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create comment',
      };
    }
  }

  /**
   * Update a comment
   */
  static async update(id: string, updates: Partial<Comment>): Promise<ApiResponse<Comment>> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          profiles!comments_user_id_fkey(
            id,
            user_id,
            username,
            display_name,
            avatar_url,
            verified
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update comment: ${error.message}`);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update comment',
      };
    }
  }

  /**
   * Delete a comment
   */
  static async delete(id: string): Promise<ApiResponse<boolean>> {
    try {
      // Get comment details before deletion
      const { data: comment } = await supabase
        .from('comments')
        .select('post_id, parent_id')
        .eq('id', id)
        .single();

      if (!comment) {
        throw new Error('Comment not found');
      }

      // Delete the comment and all its replies
      const { error } = await supabase
        .from('comments')
        .delete()
        .or(`id.eq.${id},parent_id.eq.${id}`);

      if (error) {
        throw new Error(`Failed to delete comment: ${error.message}`);
      }

      // Decrement comment count on post (only for top-level comments)
      if (!comment.parent_id) {
        await supabase.rpc('decrement_post_comment_count', { post_id: comment.post_id });
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete comment',
      };
    }
  }

  /**
   * Toggle like on a comment
   */
  static async toggleLike(commentId: string, userId: string): Promise<ApiResponse<boolean>> {
    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('reactions')
        .select('id')
        .eq('user_id', userId)
        .eq('target_id', commentId)
        .eq('target_type', 'comment')
        .eq('reaction_type', 'like')
        .single();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('id', existingLike.id);

        if (error) {
          throw new Error(`Failed to unlike comment: ${error.message}`);
        }

        // Decrement like count
        await supabase.rpc('decrement_comment_like_count', { comment_id: commentId });
      } else {
        // Like
        const { error } = await supabase
          .from('reactions')
          .insert({
            user_id: userId,
            target_id: commentId,
            target_type: 'comment',
            reaction_type: 'like',
          });

        if (error) {
          throw new Error(`Failed to like comment: ${error.message}`);
        }

        // Increment like count
        await supabase.rpc('increment_comment_like_count', { comment_id: commentId });
      }

      return {
        success: true,
        data: !existingLike,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle like',
      };
    }
  }

  /**
   * Get comments by user ID
   */
  static async getByUserId(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ApiResponse<Comment[]>> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          posts!comments_post_id_fkey(
            id,
            caption,
            media_assets(
              id,
              url,
              type
            )
          ),
          profiles!comments_user_id_fkey(
            id,
            user_id,
            username,
            display_name,
            avatar_url,
            verified
          )
        `)
        .eq('user_id', userId)
        .is('parent_id', null) // Only top-level comments
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to fetch user comments: ${error.message}`);
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user comments',
      };
    }
  }

  /**
   * Report a comment
   */
  static async report(
    commentId: string,
    userId: string,
    reason: string,
    details?: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: userId,
          target_id: commentId,
          target_type: 'comment',
          reason,
          details,
          status: 'pending',
        });

      if (error) {
        throw new Error(`Failed to report comment: ${error.message}`);
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to report comment',
      };
    }
  }

  /**
   * Get comment statistics
   */
  static async getStats(commentId: string): Promise<ApiResponse<{
    likeCount: number;
    replyCount: number;
    isLiked: boolean;
  }>> {
    try {
      // Get comment with counts
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .select('like_count, reply_count')
        .eq('id', commentId)
        .single();

      if (commentError) {
        throw new Error(`Failed to fetch comment stats: ${commentError.message}`);
      }

      // TODO: Check if current user has liked this comment
      // This would require the current user ID to be passed in
      const isLiked = false; // Placeholder

      return {
        success: true,
        data: {
          likeCount: comment.like_count || 0,
          replyCount: comment.reply_count || 0,
          isLiked,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch comment stats',
      };
    }
  }
}


