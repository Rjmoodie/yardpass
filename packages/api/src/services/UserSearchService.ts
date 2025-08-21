import { enhancedSearchService } from '@/services/EnhancedSearchService';
import type { UserSearchResult, OrganizationSearchResult } from '@/services/EnhancedSearchService';

class UserSearchService {
  async searchUsers(query: string, limit: number = 20): Promise<UserSearchResult[]> {
    try {
      return await enhancedSearchService.searchUsers(query, limit);
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  async searchOrganizations(query: string, limit: number = 20): Promise<OrganizationSearchResult[]> {
    try {
      return await enhancedSearchService.searchOrganizations(query, limit);
    } catch (error) {
      console.error('Error searching organizations:', error);
      return [];
    }
  }

  async searchAll(query: string, limit: number = 10) {
    try {
      const result = await enhancedSearchService.universalSearch(query, limit);
      return {
        users: result.users,
        organizations: result.organizations,
        total: result.users.length + result.organizations.length
      };
    } catch (error) {
      console.error('Error in universal search:', error);
      return { users: [], organizations: [], total: 0 };
    }
  }

  async getSuggestedUsers(currentUserId: string, limit: number = 10): Promise<UserSearchResult[]> {
    // This could be enhanced with ML-based recommendations
    try {
      const { data, error } = await enhancedSearchService['supabase']
        .from('profiles')
        .select(`
          id, user_id, username, display_name, bio, avatar_url, verified, followers_count, following_count, posts_count
        `)
        .neq('user_id', currentUserId)
        .order('followers_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting suggested users:', error);
      return [];
    }
  }

  async getTrendingUsers(limit: number = 10): Promise<UserSearchResult[]> {
    try {
      const { data, error } = await enhancedSearchService['supabase']
        .from('profiles')
        .select(`
          id, user_id, username, display_name, bio, avatar_url, verified, followers_count, following_count, posts_count
        `)
        .gt('followers_count', 0)
        .order('followers_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting trending users:', error);
      return [];
    }
  }
}

export const userSearchService = new UserSearchService();
