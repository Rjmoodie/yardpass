import { supabase } from '../lib/supabase';
import { Organization, ApiResponse } from '@yardpass/types';

export class OrganizationService {
  /**
   * Get organization by ID
   */
  static async getById(id: string): Promise<ApiResponse<Organization>> {
    try {
      const { data, error } = await supabase
        .from('orgs')
        .select(`
          *,
          users!orgs_users_fkey(
            id,
            handle,
            display_name,
            avatar_url,
            verified
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch organization: ${error.message}`);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch organization',
      };
    }
  }

  /**
   * Get organization by handle
   */
  static async getByHandle(handle: string): Promise<ApiResponse<Organization>> {
    try {
      const { data, error } = await supabase
        .from('orgs')
        .select(`
          *,
          users!orgs_users_fkey(
            id,
            handle,
            display_name,
            avatar_url,
            verified
          )
        `)
        .eq('handle', handle)
        .single();

      if (error) {
        throw new Error(`Failed to fetch organization: ${error.message}`);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch organization',
      };
    }
  }

  /**
   * Create new organization
   */
  static async create(orgData: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Organization>> {
    try {
      const { data, error } = await supabase
        .from('orgs')
        .insert(orgData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create organization: ${error.message}`);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create organization',
      };
    }
  }

  /**
   * Update organization
   */
  static async update(id: string, updates: Partial<Organization>): Promise<ApiResponse<Organization>> {
    try {
      const { data, error } = await supabase
        .from('orgs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update organization: ${error.message}`);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update organization',
      };
    }
  }

  /**
   * Delete organization
   */
  static async delete(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('orgs')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete organization: ${error.message}`);
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete organization',
      };
    }
  }

  /**
   * Get organizations by user ID (organizations the user is a member of)
   */
  static async getByUserId(userId: string): Promise<ApiResponse<Organization[]>> {
    try {
      const { data, error } = await supabase
        .from('orgs')
        .select(`
          *,
          users!orgs_users_fkey(
            id,
            handle,
            display_name,
            avatar_url,
            verified
          )
        `)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to fetch user organizations: ${error.message}`);
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user organizations',
      };
    }
  }

  /**
   * Search organizations
   */
  static async search(query: string, limit: number = 20): Promise<ApiResponse<Organization[]>> {
    try {
      const { data, error } = await supabase
        .from('orgs')
        .select(`
          *,
          users!orgs_users_fkey(
            id,
            handle,
            display_name,
            avatar_url,
            verified
          )
        `)
        .or(`name.ilike.%${query}%,handle.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        throw new Error(`Failed to search organizations: ${error.message}`);
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search organizations',
      };
    }
  }

  /**
   * Get trending organizations
   */
  static async getTrending(limit: number = 10): Promise<ApiResponse<Organization[]>> {
    try {
      const { data, error } = await supabase
        .from('orgs')
        .select(`
          *,
          users!orgs_users_fkey(
            id,
            handle,
            display_name,
            avatar_url,
            verified
          )
        `)
        .order('follower_count', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch trending organizations: ${error.message}`);
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trending organizations',
      };
    }
  }

  /**
   * Check if handle is available
   */
  static async checkHandleAvailability(handle: string): Promise<ApiResponse<boolean>> {
    try {
      const { data, error } = await supabase
        .from('orgs')
        .select('id')
        .eq('handle', handle)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to check handle availability: ${error.message}`);
      }

      return {
        success: true,
        data: !data, // Available if no data found
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check handle availability',
      };
    }
  }

  /**
   * Follow/unfollow organization
   */
  static async toggleFollow(orgId: string, userId: string): Promise<ApiResponse<boolean>> {
    try {
      // Check if already following
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', orgId)
        .eq('following_type', 'org')
        .single();

      if (existingFollow) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('id', existingFollow.id);

        if (error) {
          throw new Error(`Failed to unfollow: ${error.message}`);
        }

        // Decrement follower count
        await supabase.rpc('decrement_org_follower_count', { org_id: orgId });
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: userId,
            following_id: orgId,
            following_type: 'org',
          });

        if (error) {
          throw new Error(`Failed to follow: ${error.message}`);
        }

        // Increment follower count
        await supabase.rpc('increment_org_follower_count', { org_id: orgId });
      }

      return {
        success: true,
        data: !existingFollow,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TOGGLE_FOLLOW_FAILED',
          message: error instanceof Error ? error.message : 'Failed to toggle follow',
          details: error,
        },
      };
    }
  }
}


