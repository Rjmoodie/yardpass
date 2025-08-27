export const TABLES = {
  USERS: 'users',
  EVENTS: 'events',
  TICKETS: 'tickets',
  TICKETS_OWNED: 'tickets_owned',
  ORDERS: 'orders',
  ORGANIZERS: 'organizations',
  ORGANIZER_MEMBERS: 'org_members',
  EVENT_POSTS: 'event_posts',
  COMMENTS: 'comments',
  LIKES: 'likes',
  SHARES: 'shares',
  VIEWS: 'views',
  CHECKINS: 'checkins',
  LOCATIONS: 'locations',
  MEDIA_ASSETS: 'media_assets',
  NOTIFICATIONS: 'notifications',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
  USER_PREFERENCES: 'user_preferences',
  USER_BEHAVIOR_LOGS: 'user_behavior_logs',
  USER_RECOMMENDATIONS: 'user_recommendations',
  CONTENT_PERFORMANCE: 'content_performance',
  AB_TESTS: 'ab_tests',
  AB_TEST_RESULTS: 'ab_test_results',
  USER_FEEDBACK: 'user_feedback',
  SEARCH_ANALYTICS: 'search_analytics',
  SEARCH_SUGGESTIONS: 'search_suggestions',
  SEARCH_RANKINGS: 'search_rankings',
  EVENT_ANALYTICS_CACHE: 'event_analytics_cache',
  CREATOR_DASHBOARD_WIDGETS: 'creator_dashboard_widgets',
  REVENUE_TRACKING: 'revenue_tracking',
  PERFORMANCE_METRICS: 'performance_metrics',
  EVENT_OWNERSHIP_HISTORY: 'event_ownership_history',
  TIER_BADGES: 'tier_badges',
  ORDER_ITEMS: 'order_items',
  REFUNDS: 'refunds',
  TICKET_TIERS: 'ticket_tiers',
  EVENT_VIEWS: 'event_views',
  EVENT_CHECKINS: 'event_checkins',
  SCAN_LOGS: 'scan_logs',
  PROMO_CODES: 'promo_codes',
  PUSH_TOKENS: 'push_tokens',
  SEARCH_ANALYTICS_ENHANCED: 'search_analytics_enhanced',
  SEARCH_SUGGESTIONS_ENHANCED: 'search_suggestions_enhanced',
  EVENT_SIMILARITIES: 'event_similarities',
  PAYOUT_ACCOUNTS: 'payout_accounts',
  PAYOUT_TRANSACTIONS: 'payout_transactions'
} as const;

export const ROLES = {
  USER: 'user',
  ORGANIZER: 'organizer',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
} as const;

export const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
} as const;

export const EVENT_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  UNLISTED: 'unlisted'
} as const;

export const TICKET_STATUS = {
  AVAILABLE: 'available',
  SOLD_OUT: 'sold_out',
  EXPIRED: 'expired'
} as const;

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
} as const;

export const NOTIFICATION_TYPES = {
  EVENT_REMINDER: 'event_reminder',
  TICKET_PURCHASED: 'ticket_purchased',
  EVENT_UPDATE: 'event_update',
  EVENT_CANCELLED: 'event_cancelled',
  TICKET_TRANSFER: 'ticket_transfer',
  PAYMENT_SUCCESS: 'payment_success',
  FRIEND_REQUEST: 'friend_request',
  SYSTEM: 'system',
  PROMO: 'promo',
  GENERAL: 'general'
} as const;
