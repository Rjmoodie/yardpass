import { supabase } from '../lib/supabase';
import { SearchQuery, SearchResult, ApiResponse, ApiError } from '@yardpass/types';

export class SearchService {
  /**
   * Search across events, organizations, posts, and users
   */
  static async search(query: SearchQuery): Promise<ApiResponse<SearchResult>> {
    try {
      const results: SearchResult = {
        meta: {
          total: 0,
          page: 1,
          limit: query.limit || 20,
          hasMore: false,
        },
      };

      // Search events
      if (!query.type || query.type === 'events') {
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select(`
            *,
            org:orgs(*),
            tickets(*)
          `)
          .or(`title.ilike.%${query.q}%,description.ilike.%${query.q}%,city.ilike.%${query.q}%`)
          .eq('status', 'published')
          .eq('visibility', 'public')
          .limit(query.limit || 20);

        if (!eventsError) {
          results.events = events;
          results.meta.total = (results.meta.total || 0) + (events?.length || 0);
        }
      }

      // Search organizations
      if (!query.type || query.type === 'organizations') {
        const { data: orgs, error: orgsError } = await supabase
          .from('orgs')
          .select('*')
          .or(`name.ilike.%${query.q}%,description.ilike.%${query.q}%`)
          .limit(query.limit || 20);

        if (!orgsError) {
          results.organizations = orgs;
          results.meta.total = (results.meta.total || 0) + (orgs?.length || 0);
        }
      }

      // Search posts
      if (!query.type || query.type === 'posts') {
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            author:users(*),
            event:events(*),
            media_asset:media_assets(*)
          `)
          .or(`body.ilike.%${query.q}%`)
          .eq('is_active', true)
          .limit(query.limit || 20);

        if (!postsError) {
          results.posts = posts;
          results.meta.total = (results.meta.total || 0) + (posts?.length || 0);
        }
      }

      // Search users
      if (!query.type || query.type === 'users') {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .or(`name.ilike.%${query.q}%,handle.ilike.%${query.q}%,bio.ilike.%${query.q}%`)
          .limit(query.limit || 20);

        if (!usersError) {
          results.users = users;
          results.meta.total = (results.meta.total || 0) + (users?.length || 0);
        }
      }

      return {
        data: results,
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'SEARCH_FAILED',
        message: error.message || 'Failed to search',
        details: error,
      };

      throw apiError;
    }
  }
}


