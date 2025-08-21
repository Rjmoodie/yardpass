import { BaseService } from './BaseService';

/**
 * ✅ OPTIMIZED: Centralized query builder with field selection
 * Provides optimized query patterns for different use cases
 */
export class QueryBuilder extends BaseService {
  /**
   * ✅ OPTIMIZED: Profile query builders for different use cases
   */
  static ProfileQueryBuilder = class {
    /**
     * Basic profile fields for list views
     */
    static getBasicProfile() {
      return `
        id,
        user_id,
        username,
        display_name,
        avatar_url,
        bio,
        verified,
        created_at
      `;
    }

    /**
     * Enhanced profile fields with stats
     */
    static getEnhancedProfile() {
      return `
        ${this.getBasicProfile()},
        ${BaseService.PROFILE_STATS_FIELDS}
      `;
    }

    /**
     * Full profile fields for detailed views
     */
    static getFullProfile() {
      return `
        *,
        ${BaseService.PROFILE_STATS_FIELDS}
      `;
    }

    /**
     * Profile fields for search results
     */
    static getSearchProfile() {
      return `
        id,
        username,
        display_name,
        avatar_url,
        bio,
        verified,
        followers_count,
        posts_count,
        events_count,
        created_at
      `;
    }

    /**
     * Profile fields for social connections (followers/following)
     */
    static getSocialProfile() {
      return `
        id,
        username,
        display_name,
        avatar_url,
        bio,
        verified,
        followers_count,
        following_count,
        posts_count,
        last_activity_at
      `;
    }
  };

  /**
   * ✅ OPTIMIZED: Event query builders
   */
  static EventQueryBuilder = class {
    /**
     * Basic event fields for list views
     */
    static getBasicEvent() {
      return `
        id,
        title,
        slug,
        start_at,
        end_at,
        status,
        visibility,
        cover_image_url,
        venue,
        city,
        created_at
      `;
    }

    /**
     * Enhanced event fields with organizer info
     */
    static getEnhancedEvent() {
      return `
        ${this.getBasicEvent()},
        description,
        category,
        tags,
        org:orgs(
          id,
          name,
          logo_url,
          is_verified
        ),
        tickets(
          id,
          name,
          price,
          quantity_available,
          quantity_sold,
          is_active
        )
      `;
    }

    /**
     * Full event fields for detailed views
     */
    static getFullEvent() {
      return `
        *,
        org:orgs(
          id,
          name,
          description,
          logo_url,
          website_url,
          is_verified
        ),
        tickets(
          id,
          name,
          description,
          price,
          currency,
          quantity_available,
          quantity_sold,
          perks,
          access_level,
          is_active
        ),
        posts(
          id,
          title,
          content,
          media_urls,
          created_at
        )
      `;
    }
  };

  /**
   * ✅ OPTIMIZED: Organization query builders
   */
  static OrganizationQueryBuilder = class {
    /**
     * Basic organization fields for list views
     */
    static getBasicOrganization() {
      return `
        id,
        name,
        description,
        logo_url,
        is_verified,
        followers_count,
        total_events,
        created_at
      `;
    }

    /**
     * Enhanced organization fields with user info
     */
    static getEnhancedOrganization() {
      return `
        ${this.getBasicOrganization()},
        website_url,
        social_links,
        settings,
        profiles!orgs_profiles_fkey(
          id,
          user_id,
          username,
          display_name,
          avatar_url,
          verified
        )
      `;
    }

    /**
     * Full organization fields for detailed views
     */
    static getFullOrganization() {
      return `
        *,
        profiles!orgs_profiles_fkey(
          id,
          user_id,
          username,
          display_name,
          avatar_url,
          verified
        ),
        events:events(
          id,
          title,
          slug,
          start_at,
          end_at,
          status,
          cover_image_url,
          category
        )
      `;
    }
  };

  /**
   * ✅ OPTIMIZED: Post query builders
   */
  static PostQueryBuilder = class {
    /**
     * Basic post fields for list views
     */
    static getBasicPost() {
      return `
        id,
        title,
        content,
        visibility,
        access_level,
        is_active,
        created_at
      `;
    }

    /**
     * Enhanced post fields with author and event info
     */
    static getEnhancedPost() {
      return `
        ${this.getBasicPost()},
        author:profiles(
          id,
          username,
          display_name,
          avatar_url,
          verified
        ),
        event:events(
          id,
          title,
          slug,
          start_at
        ),
        media_asset:media_assets(
          id,
          type,
          url,
          thumbnail_url
        )
      `;
    }

    /**
     * Full post fields for detailed views
     */
    static getFullPost() {
      return `
        *,
        author:profiles(
          id,
          user_id,
          username,
          display_name,
          avatar_url,
          bio,
          verified
        ),
        event:events(
          id,
          title,
          slug,
          start_at,
          end_at,
          venue,
          cover_image_url
        ),
        media_asset:media_assets(
          id,
          type,
          url,
          thumbnail_url,
          metadata
        )
      `;
    }
  };

  /**
   * ✅ OPTIMIZED: Ticket query builders
   */
  static TicketQueryBuilder = class {
    /**
     * Basic ticket fields for list views
     */
    static getBasicTicket() {
      return `
        id,
        name,
        price,
        quantity_available,
        quantity_sold,
        is_active,
        created_at
      `;
    }

    /**
     * Enhanced ticket fields with event info
     */
    static getEnhancedTicket() {
      return `
        ${this.getBasicTicket()},
        description,
        currency,
        perks,
        access_level,
        event:events(
          id,
          title,
          slug,
          start_at,
          end_at,
          venue,
          cover_image_url
        )
      `;
    }

    /**
     * Full ticket fields for detailed views
     */
    static getFullTicket() {
      return `
        *,
        event:events(
          id,
          title,
          slug,
          description,
          start_at,
          end_at,
          venue,
          city,
          address,
          cover_image_url,
          org:orgs(
            id,
            name,
            logo_url,
            is_verified
          )
        )
      `;
    }
  };

  /**
   * ✅ OPTIMIZED: Search query builders
   */
  static SearchQueryBuilder = class {
    /**
     * Search fields for events
     */
    static getEventSearch() {
      return `
        id,
        title,
        slug,
        description,
        start_at,
        end_at,
        status,
        visibility,
        cover_image_url,
        venue,
        city,
        category,
        tags,
        org:orgs(
          id,
          name,
          logo_url,
          is_verified
        )
      `;
    }

    /**
     * Search fields for organizations
     */
    static getOrganizationSearch() {
      return `
        id,
        name,
        description,
        logo_url,
        is_verified,
        followers_count,
        total_events,
        website_url
      `;
    }

    /**
     * Search fields for users
     */
    static getUserSearch() {
      return `
        id,
        username,
        display_name,
        bio,
        avatar_url,
        verified,
        followers_count,
        posts_count,
        events_count
      `;
    }

    /**
     * Search fields for posts
     */
    static getPostSearch() {
      return `
        id,
        title,
        content,
        visibility,
        access_level,
        is_active,
        created_at,
        author:profiles(
          id,
          username,
          display_name,
          avatar_url
        ),
        event:events(
          id,
          title,
          slug,
          start_at
        )
      `;
    }
  };

  /**
   * ✅ OPTIMIZED: Query optimization helpers
   */
  static QueryOptimizer = class {
    /**
     * Build optimized pagination
     */
    static buildPagination(page: number = 1, limit: number = 20) {
      const offset = (page - 1) * limit;
      return {
        from: offset,
        to: offset + limit - 1,
        limit
      };
    }

    /**
     * Build optimized sorting
     */
    static buildSorting(sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') {
      return {
        column: sortBy,
        ascending: sortOrder === 'asc'
      };
    }

    /**
     * Build optimized filters
     */
    static buildFilters(filters: Record<string, any>) {
      return Object.entries(filters)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, any>);
    }

    /**
     * Build optimized search query
     */
    static buildSearchQuery(searchTerm: string, searchFields: string[]) {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return null;
      }

      const sanitizedTerm = searchTerm.trim().toLowerCase();
      const searchConditions = searchFields.map(field => `${field}.ilike.%${sanitizedTerm}%`);
      
      return searchConditions.join(',');
    }
  };
}
