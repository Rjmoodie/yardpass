import { supabase } from '../lib/supabase';
import { ApiResponse } from '@yardpass/types';

export interface ContentRecommendation {
  id: string;
  type: 'post' | 'event' | 'user' | 'organization';
  title?: string;
  content?: string;
  author?: any;
  event?: any;
  engagement_score: number;
  relevance_score: number;
  viral_potential: number;
  reasoning: string[];
}

export interface TrendingContent {
  id: string;
  type: 'post' | 'event';
  title: string;
  content?: string;
  engagement_velocity: number;
  viral_score: number;
  trending_reason: string;
  growth_rate: number;
}

export interface EventContent {
  event_id: string;
  posts: any[];
  media_assets: any[];
  user_generated_content: any[];
  top_contributors: any[];
  engagement_summary: {
    total_posts: number;
    total_reactions: number;
    total_comments: number;
    avg_engagement_rate: number;
  };
}

export class ContentRecommendationService {
  /**
   * Get personalized content recommendations for a user
   */
  static async getPersonalizedRecommendations(
    userId: string,
    limit: number = 20
  ): Promise<ApiResponse<{
    recommendations: ContentRecommendation[];
    meta: {
      total_recommendations: number;
      personalization_level: 'high' | 'medium' | 'low';
      reasoning: string[];
    };
  }>> {
    try {
      // Get user preferences and behavior
      const userProfile = await this.getUserProfile(userId);
      const userBehavior = await this.getUserBehavior(userId);
      const socialConnections = await this.getSocialConnections(userId);

      // Get recommendations based on different factors
      const [eventRecommendations, postRecommendations, userRecommendations] = await Promise.all([
        this.getEventRecommendations(userId, userProfile, userBehavior, limit / 3),
        this.getPostRecommendations(userId, userProfile, userBehavior, socialConnections, limit / 3),
        this.getUserRecommendations(userId, userBehavior, socialConnections, limit / 3),
      ]);

      // Combine and score all recommendations
      const allRecommendations = [
        ...eventRecommendations,
        ...postRecommendations,
        ...userRecommendations,
      ];

      // Calculate personalization level
      const personalizationLevel = this.calculatePersonalizationLevel(userProfile, userBehavior);

      // Generate reasoning for recommendations
      const reasoning = this.generateRecommendationReasoning(userProfile, userBehavior);

      return {
        success: true,
        data: {
          recommendations: allRecommendations.slice(0, limit),
          meta: {
            total_recommendations: allRecommendations.length,
            personalization_level: personalizationLevel,
            reasoning,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get personalized recommendations',
      };
    }
  }

  /**
   * Detect trending content with viral potential
   */
  static async detectTrendingContent(
    timeWindow: '1h' | '24h' | '7d' = '24h',
    limit: number = 10
  ): Promise<ApiResponse<{
    trending_content: TrendingContent[];
    meta: {
      detection_time: string;
      time_window: string;
      total_trending: number;
    };
  }>> {
    try {
      const timeWindowMs = this.getTimeWindowMs(timeWindow);
      const cutoffTime = new Date(Date.now() - timeWindowMs);

      // Get recent posts with engagement
      const { data: recentPosts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(username, display_name, avatar_url),
          event:events(title, slug),
          reactions(id, type),
          comments(id)
        `)
        .gte('created_at', cutoffTime.toISOString())
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Get recent events with engagement
      const { data: recentEvents, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          org:orgs(name, slug),
          checkins(id),
          posts(id)
        `)
        .gte('created_at', cutoffTime.toISOString())
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // Analyze trending content
      const trendingPosts = this.analyzeTrendingPosts(recentPosts || []);
      const trendingEvents = this.analyzeTrendingEvents(recentEvents || []);

      // Combine and sort by viral potential
      const allTrending = [...trendingPosts, ...trendingEvents]
        .sort((a, b) => b.viral_score - a.viral_score)
        .slice(0, limit);

      return {
        success: true,
        data: {
          trending_content: allTrending,
          meta: {
            detection_time: new Date().toISOString(),
            time_window: timeWindow,
            total_trending: allTrending.length,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect trending content',
      };
    }
  }

  /**
   * Get event-specific content curation
   */
  static async getEventContent(eventId: string): Promise<ApiResponse<EventContent>> {
    try {
      // Get event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      // Get posts related to this event
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(username, display_name, avatar_url, verified),
          reactions(id, type),
          comments(id)
        `)
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Get media assets for this event
      const { data: mediaAssets, error: mediaError } = await supabase
        .from('media_assets')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (mediaError) throw mediaError;

      // Get user-generated content (posts from attendees)
      const { data: userGeneratedContent, error: ugcError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(username, display_name, avatar_url),
          reactions(id, type),
          comments(id)
        `)
        .eq('event_id', eventId)
        .eq('is_sponsored', false)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (ugcError) throw ugcError;

      // Analyze top contributors
      const topContributors = this.analyzeTopContributors(posts || []);

      // Calculate engagement summary
      const engagementSummary = this.calculateEngagementSummary(posts || []);

      return {
        success: true,
        data: {
          event_id: eventId,
          posts: posts || [],
          media_assets: mediaAssets || [],
          user_generated_content: userGeneratedContent || [],
          top_contributors: topContributors,
          engagement_summary: engagementSummary,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get event content',
      };
    }
  }

  /**
   * Get content recommendations for discovery
   */
  static async getDiscoveryRecommendations(
    filters: {
      category_id?: string;
      location?: { lat: number; lng: number; radius?: number };
      content_type?: 'posts' | 'events' | 'users';
    } = {},
    limit: number = 20
  ): Promise<ApiResponse<{
    recommendations: ContentRecommendation[];
    meta: {
      discovery_type: string;
      total_recommendations: number;
    };
  }>> {
    try {
      let recommendations: ContentRecommendation[] = [];

      if (!filters.content_type || filters.content_type === 'events') {
        const eventRecs = await this.getDiscoveryEventRecommendations(filters, limit / 2);
        recommendations.push(...eventRecs);
      }

      if (!filters.content_type || filters.content_type === 'posts') {
        const postRecs = await this.getDiscoveryPostRecommendations(filters, limit / 2);
        recommendations.push(...postRecs);
      }

      // Sort by engagement score
      recommendations.sort((a, b) => b.engagement_score - a.engagement_score);

      return {
        success: true,
        data: {
          recommendations: recommendations.slice(0, limit),
          meta: {
            discovery_type: filters.content_type || 'mixed',
            total_recommendations: recommendations.length,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get discovery recommendations',
      };
    }
  }

  /**
   * Get user profile for recommendations
   */
  private static async getUserProfile(userId: string): Promise<any> {
    const { data } = await supabase
      .from('profiles')
      .select('preferences, stats, bio')
      .eq('user_id', userId)
      .single();

    return data;
  }

  /**
   * Get user behavior patterns
   */
  private static async getUserBehavior(userId: string): Promise<any> {
    // Get user's past interactions
    const { data: reactions } = await supabase
      .from('reactions')
      .select('*')
      .eq('user_id', userId);

    const { data: checkins } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId);

    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', userId);

    return {
      reactions: reactions || [],
      checkins: checkins || [],
      posts: posts || [],
    };
  }

  /**
   * Get user's social connections
   */
  private static async getSocialConnections(userId: string): Promise<any> {
    const { data: follows } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', userId);

    return {
      follows: follows || [],
    };
  }

  /**
   * Get event recommendations
   */
  private static async getEventRecommendations(
    userId: string,
    userProfile: any,
    userBehavior: any,
    limit: number
  ): Promise<ContentRecommendation[]> {
    // Get events user might be interested in based on past behavior
    const attendedCategories = userBehavior.checkins.map((checkin: any) => checkin.event?.category_id).filter(Boolean);
    const reactedCategories = userBehavior.reactions.map((reaction: any) => reaction.post?.event?.category_id).filter(Boolean);

    const preferredCategories = [...new Set([...attendedCategories, ...reactedCategories])];

    let query = supabase
      .from('events')
      .select(`
        *,
        org:orgs(name, slug, is_verified),
        tickets(id, price),
        checkins(id)
      `)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .gte('start_at', new Date().toISOString());

    if (preferredCategories.length > 0) {
      query = query.in('category_id', preferredCategories);
    }

    const { data: events } = await query
      .order('start_at', { ascending: true })
      .limit(limit);

    return (events || []).map(event => ({
      id: event.id,
      type: 'event' as const,
      title: event.title,
      content: event.description,
      event,
      engagement_score: this.calculateEventEngagement(event),
      relevance_score: this.calculateEventRelevance(event, userProfile, userBehavior),
      viral_potential: this.calculateViralPotential(event),
      reasoning: this.generateEventReasoning(event, userProfile, userBehavior),
    }));
  }

  /**
   * Get post recommendations
   */
  private static async getPostRecommendations(
    userId: string,
    userProfile: any,
    userBehavior: any,
    socialConnections: any,
    limit: number
  ): Promise<ContentRecommendation[]> {
    // Get posts from followed organizations and users
    const followedOrgs = socialConnections.follows.map((follow: any) => follow.organizer_id);
    const followedUsers = userBehavior.reactions.map((reaction: any) => reaction.post?.author_id).filter(Boolean);

    let query = supabase
      .from('posts')
      .select(`
        *,
        author:profiles(username, display_name, avatar_url, verified),
        event:events(title, slug),
        reactions(id, type),
        comments(id)
      `)
      .eq('is_active', true)
      .neq('author_id', userId);

    if (followedOrgs.length > 0 || followedUsers.length > 0) {
      const conditions = [];
      if (followedOrgs.length > 0) conditions.push(`sponsored_by.in.(${followedOrgs.join(',')})`);
      if (followedUsers.length > 0) conditions.push(`author_id.in.(${followedUsers.join(',')})`);
      query = query.or(conditions.join(','));
    }

    const { data: posts } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    return (posts || []).map(post => ({
      id: post.id,
      type: 'post' as const,
      title: post.title,
      content: post.body,
      author: post.author,
      event: post.event,
      engagement_score: this.calculatePostEngagement(post),
      relevance_score: this.calculatePostRelevance(post, userProfile, userBehavior),
      viral_potential: this.calculateViralPotential(post),
      reasoning: this.generatePostReasoning(post, userProfile, userBehavior),
    }));
  }

  /**
   * Get user recommendations
   */
  private static async getUserRecommendations(
    userId: string,
    userBehavior: any,
    socialConnections: any,
    limit: number
  ): Promise<ContentRecommendation[]> {
    // Find users with similar interests
    const attendedEvents = userBehavior.checkins.map((checkin: any) => checkin.event_id).filter(Boolean);
    const reactedPosts = userBehavior.reactions.map((reaction: any) => reaction.post_id).filter(Boolean);

    let query = supabase
      .from('profiles')
      .select(`
        *,
        posts(id, event_id),
        checkins(event_id)
      `)
      .neq('user_id', userId);

    const { data: users } = await query.limit(limit);

    return (users || []).map(user => ({
      id: user.id,
      type: 'user' as const,
      title: user.display_name,
      content: user.bio,
      author: user,
      engagement_score: this.calculateUserEngagement(user),
      relevance_score: this.calculateUserRelevance(user, userBehavior),
      viral_potential: 0, // Users don't have viral potential in this context
      reasoning: this.generateUserReasoning(user, userBehavior),
    }));
  }

  /**
   * Analyze trending posts
   */
  private static analyzeTrendingPosts(posts: any[]): TrendingContent[] {
    return posts.map(post => {
      const engagementVelocity = this.calculateEngagementVelocity(post);
      const viralScore = this.calculateViralScore(post);
      const growthRate = this.calculateGrowthRate(post);

      return {
        id: post.id,
        type: 'post' as const,
        title: post.title || 'Post',
        content: post.body,
        engagement_velocity: engagementVelocity,
        viral_score: viralScore,
        trending_reason: this.getTrendingReason(post, engagementVelocity, viralScore),
        growth_rate: growthRate,
      };
    }).filter(post => post.viral_score > 0.3); // Only include trending posts
  }

  /**
   * Analyze trending events
   */
  private static analyzeTrendingEvents(events: any[]): TrendingContent[] {
    return events.map(event => {
      const engagementVelocity = this.calculateEventEngagementVelocity(event);
      const viralScore = this.calculateEventViralScore(event);
      const growthRate = this.calculateEventGrowthRate(event);

      return {
        id: event.id,
        type: 'event' as const,
        title: event.title,
        engagement_velocity: engagementVelocity,
        viral_score: viralScore,
        trending_reason: this.getEventTrendingReason(event, engagementVelocity, viralScore),
        growth_rate: growthRate,
      };
    }).filter(event => event.viral_score > 0.3); // Only include trending events
  }

  /**
   * Analyze top contributors
   */
  private static analyzeTopContributors(posts: any[]): any[] {
    const contributorStats = new Map<string, { posts: number; reactions: number; comments: number }>();

    posts.forEach(post => {
      const authorId = post.author_id;
      if (!contributorStats.has(authorId)) {
        contributorStats.set(authorId, { posts: 0, reactions: 0, comments: 0 });
      }

      const stats = contributorStats.get(authorId)!;
      stats.posts++;
      stats.reactions += post.reactions?.length || 0;
      stats.comments += post.comments?.length || 0;
    });

    return Array.from(contributorStats.entries())
      .map(([authorId, stats]) => ({
        author_id: authorId,
        posts_count: stats.posts,
        total_reactions: stats.reactions,
        total_comments: stats.comments,
        engagement_score: stats.reactions + stats.comments,
      }))
      .sort((a, b) => b.engagement_score - a.engagement_score)
      .slice(0, 10);
  }

  /**
   * Calculate engagement summary
   */
  private static calculateEngagementSummary(posts: any[]): {
    total_posts: number;
    total_reactions: number;
    total_comments: number;
    avg_engagement_rate: number;
  } {
    const totalPosts = posts.length;
    const totalReactions = posts.reduce((sum, post) => sum + (post.reactions?.length || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);
    const avgEngagementRate = totalPosts > 0 ? (totalReactions + totalComments) / totalPosts : 0;

    return {
      total_posts: totalPosts,
      total_reactions: totalReactions,
      total_comments: totalComments,
      avg_engagement_rate: Math.round(avgEngagementRate * 100) / 100,
    };
  }

  /**
   * Get discovery event recommendations
   */
  private static async getDiscoveryEventRecommendations(filters: any, limit: number): Promise<ContentRecommendation[]> {
    let query = supabase
      .from('events')
      .select(`
        *,
        org:orgs(name, slug, is_verified),
        tickets(id, price),
        checkins(id)
      `)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .gte('start_at', new Date().toISOString());

    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    const { data: events } = await query
      .order('start_at', { ascending: true })
      .limit(limit);

    return (events || []).map(event => ({
      id: event.id,
      type: 'event' as const,
      title: event.title,
      content: event.description,
      event,
      engagement_score: this.calculateEventEngagement(event),
      relevance_score: 0.5, // Neutral for discovery
      viral_potential: this.calculateViralPotential(event),
      reasoning: ['Popular event in your area', 'High engagement from community'],
    }));
  }

  /**
   * Get discovery post recommendations
   */
  private static async getDiscoveryPostRecommendations(filters: any, limit: number): Promise<ContentRecommendation[]> {
    let query = supabase
      .from('posts')
      .select(`
        *,
        author:profiles(username, display_name, avatar_url, verified),
        event:events(title, slug),
        reactions(id, type),
        comments(id)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    const { data: posts } = await query.limit(limit);

    return (posts || []).map(post => ({
      id: post.id,
      type: 'post' as const,
      title: post.title,
      content: post.body,
      author: post.author,
      event: post.event,
      engagement_score: this.calculatePostEngagement(post),
      relevance_score: 0.5, // Neutral for discovery
      viral_potential: this.calculateViralPotential(post),
      reasoning: ['Popular post from community', 'High engagement'],
    }));
  }

  // Helper methods for calculations
  private static calculateEventEngagement(event: any): number {
    const checkins = event.checkins?.length || 0;
    const posts = event.posts?.length || 0;
    return checkins + posts;
  }

  private static calculatePostEngagement(post: any): number {
    const reactions = post.reactions?.length || 0;
    const comments = post.comments?.length || 0;
    return reactions + comments;
  }

  private static calculateUserEngagement(user: any): number {
    const posts = user.posts?.length || 0;
    const checkins = user.checkins?.length || 0;
    return posts + checkins;
  }

  private static calculateEventRelevance(event: any, userProfile: any, userBehavior: any): number {
    // Implementation would consider user preferences and past behavior
    return 0.7; // Placeholder
  }

  private static calculatePostRelevance(post: any, userProfile: any, userBehavior: any): number {
    // Implementation would consider user interests and past interactions
    return 0.6; // Placeholder
  }

  private static calculateUserRelevance(user: any, userBehavior: any): number {
    // Implementation would consider shared interests and connections
    return 0.5; // Placeholder
  }

  private static calculateViralPotential(content: any): number {
    // Implementation would consider engagement velocity, sharing patterns, etc.
    return 0.4; // Placeholder
  }

  private static calculateEngagementVelocity(content: any): number {
    // Implementation would calculate engagement over time
    return 0.3; // Placeholder
  }

  private static calculateViralScore(content: any): number {
    // Implementation would calculate viral potential score
    return 0.5; // Placeholder
  }

  private static calculateGrowthRate(content: any): number {
    // Implementation would calculate growth rate
    return 0.2; // Placeholder
  }

  private static calculateEventEngagementVelocity(event: any): number {
    return 0.3; // Placeholder
  }

  private static calculateEventViralScore(event: any): number {
    return 0.4; // Placeholder
  }

  private static calculateEventGrowthRate(event: any): number {
    return 0.2; // Placeholder
  }

  private static calculatePersonalizationLevel(userProfile: any, userBehavior: any): 'high' | 'medium' | 'low' {
    const hasProfile = !!userProfile?.preferences;
    const hasBehavior = userBehavior.reactions.length > 0 || userBehavior.checkins.length > 0;
    
    if (hasProfile && hasBehavior) return 'high';
    if (hasProfile || hasBehavior) return 'medium';
    return 'low';
  }

  private static generateRecommendationReasoning(userProfile: any, userBehavior: any): string[] {
    const reasoning: string[] = [];
    
    if (userBehavior.checkins.length > 0) {
      reasoning.push('Based on events you\'ve attended');
    }
    
    if (userBehavior.reactions.length > 0) {
      reasoning.push('Based on content you\'ve engaged with');
    }
    
    if (userProfile?.preferences) {
      reasoning.push('Based on your preferences');
    }
    
    return reasoning.length > 0 ? reasoning : ['Popular content in your area'];
  }

  private static generateEventReasoning(event: any, userProfile: any, userBehavior: any): string[] {
    const reasoning: string[] = [];
    
    if (userBehavior.checkins.some((checkin: any) => checkin.event?.category_id === event.category_id)) {
      reasoning.push('Similar to events you\'ve attended');
    }
    
    if (event.checkins?.length > 10) {
      reasoning.push('High community interest');
    }
    
    return reasoning;
  }

  private static generatePostReasoning(post: any, userProfile: any, userBehavior: any): string[] {
    const reasoning: string[] = [];
    
    if (post.reactions?.length > 5) {
      reasoning.push('High engagement');
    }
    
    if (post.event?.category_id && userBehavior.checkins.some((checkin: any) => checkin.event?.category_id === post.event.category_id)) {
      reasoning.push('Related to events you\'ve attended');
    }
    
    return reasoning;
  }

  private static generateUserReasoning(user: any, userBehavior: any): string[] {
    const reasoning: string[] = [];
    
    if (user.posts?.length > 5) {
      reasoning.push('Active content creator');
    }
    
    if (user.checkins?.length > 3) {
      reasoning.push('Frequent event attendee');
    }
    
    return reasoning;
  }

  private static getTrendingReason(post: any, engagementVelocity: number, viralScore: number): string {
    if (viralScore > 0.8) return 'Viral content with high engagement';
    if (engagementVelocity > 0.6) return 'Rapidly growing engagement';
    if (post.reactions?.length > 20) return 'High community interest';
    return 'Trending in your area';
  }

  private static getEventTrendingReason(event: any, engagementVelocity: number, viralScore: number): string {
    if (viralScore > 0.8) return 'Viral event with high interest';
    if (engagementVelocity > 0.6) return 'Rapidly growing interest';
    if (event.checkins?.length > 15) return 'High attendance';
    return 'Popular event in your area';
  }

  private static getTimeWindowMs(timeWindow: string): number {
    switch (timeWindow) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }
}
