// YardPass API Contracts
// Type-safe API definitions for React Native and server

export interface ApiResponse<T = any> {
  data: T;
  meta?: ApiMeta;
  error?: ApiError;
}

export interface ApiMeta {
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
  cursor?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Authentication
export interface AuthUser {
  id: string;
  email: string;
  handle: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  role: 'user' | 'organizer' | 'admin';
  is_verified: boolean;
  preferences: UserPreferences;
  stats: UserStats;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  currency: string;
  timezone: string;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
}

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
  inApp: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  types: {
    newEvents: boolean;
    eventUpdates: boolean;
    ticketReminders: boolean;
    socialActivity: boolean;
  };
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  activityStatus: boolean;
  dataSharing: boolean;
}

export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  reduceMotion: boolean;
}

export interface UserStats {
  followers: number;
  following: number;
  posts: number;
  events_attended: number;
  tickets_purchased: number;
}

// Events
export interface Event {
  id: string;
  org_id: string;
  slug: string;
  title: string;
  description?: string;
  city?: string;
  venue?: string;
  address?: string;
  location?: GeoPoint;
  start_at: string;
  end_at: string;
  visibility: 'public' | 'private' | 'unlisted';
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  category?: string;
  tags?: string[];
  cover_image_url?: string;
  settings: EventSettings;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  org?: Organization;
  tickets?: Ticket[];
  posts?: Post[];
  user_access_level?: 'none' | 'general' | 'vip' | 'crew';
  is_following?: boolean;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface EventSettings {
  allow_user_posts: boolean;
  require_approval: boolean;
  max_post_duration: number;
  allowed_access_levels: string[];
}

// Organizations
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  is_verified: boolean;
  settings: OrgSettings;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  member_count?: number;
  event_count?: number;
  is_member?: boolean;
  member_role?: string;
}

export interface OrgSettings {
  allow_public_events: boolean;
  require_approval: boolean;
  default_event_visibility: string;
}

// Tickets
export interface Ticket {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  quantity_available: number;
  quantity_sold: number;
  perks: TicketPerk[];
  access_level: 'general' | 'vip' | 'crew';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketPerk {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface TicketOwned {
  id: string;
  order_id: string;
  ticket_id: string;
  user_id: string;
  qr_code: string;
  access_level: string;
  is_used: boolean;
  used_at?: string;
  created_at: string;
  
  // Computed fields
  ticket?: Ticket;
  event?: Event;
}

// Orders
export interface Order {
  id: string;
  user_id: string;
  event_id: string;
  total: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  provider_ref?: string;
  metadata: OrderMetadata;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  event?: Event;
  tickets?: TicketOwned[];
}

export interface OrderMetadata {
  payment_method?: string;
  billing_address?: Address;
  customer_email?: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

// Media & Posts
export interface MediaAsset {
  id: string;
  event_id: string;
  uploader_id: string;
  type: 'video' | 'image';
  mux_id?: string;
  duration?: number;
  thumbnails?: ThumbnailUrls;
  access_level: 'public' | 'general' | 'vip' | 'crew';
  metadata: MediaMetadata;
  created_at: string;
  
  // Computed fields
  uploader?: AuthUser;
  event?: Event;
  playback_url?: string;
  signed_url?: string;
}

export interface ThumbnailUrls {
  small: string;
  medium: string;
  large: string;
  sprite?: string;
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  captions?: string;
}

export interface Post {
  id: string;
  event_id: string;
  author_id: string;
  media_asset_id?: string;
  body?: string;
  access_level: 'public' | 'general' | 'vip' | 'crew';
  metrics: PostMetrics;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  author?: AuthUser;
  event?: Event;
  media_asset?: MediaAsset;
  comments?: Comment[];
  reactions?: Reaction[];
  user_reaction?: Reaction;
  is_liked?: boolean;
  is_saved?: boolean;
}

export interface PostMetrics {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  watch_time?: number;
}

// Social Interactions
export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  
  // Computed fields
  author?: AuthUser;
  replies?: Comment[];
  reaction_count?: number;
}

export interface Reaction {
  id: string;
  user_id: string;
  post_id: string;
  type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  organizer_id: string;
  created_at: string;
  
  // Computed fields
  follower?: AuthUser;
  organizer?: Organization;
}

// Feed & Discovery
export interface FeedFilter {
  type: 'for_you' | 'following' | 'near_me' | 'trending';
  cursor?: string;
  limit?: number;
  location?: GeoPoint;
  radius?: number;
  category?: string;
}

export interface FeedItem {
  type: 'post' | 'event' | 'ad';
  id: string;
  post?: Post;
  event?: Event;
  ad?: AdCreative;
  rank_score?: number;
}

export interface AdCreative {
  id: string;
  campaign_id: string;
  post_id?: string;
  media_asset_id?: string;
  cta?: string;
  settings: any;
  created_at: string;
}

// Search
export interface SearchQuery {
  q: string;
  type?: 'events' | 'organizations' | 'posts' | 'users';
  category?: string;
  location?: GeoPoint;
  radius?: number;
  date_from?: string;
  date_to?: string;
  price_min?: number;
  price_max?: number;
  cursor?: string;
  limit?: number;
}

export interface SearchResult {
  events?: Event[];
  organizations?: Organization[];
  posts?: Post[];
  users?: AuthUser[];
  meta: ApiMeta;
}

// Checkout & Payments
export interface CheckoutRequest {
  event_id: string;
  ticket_id: string;
  quantity: number;
  customer_email?: string;
  metadata?: Record<string, any>;
}

export interface CheckoutResponse {
  success: boolean;
  checkout_url: string;
  session_id: string;
  order_id: string;
  amount: number;
  currency: string;
  expires_at: string;
  error?: string;
}

// Video Pipeline
export interface UploadRequest {
  filename: string;
  content_type: string;
  size: number;
  event_id?: string;
  access_level?: string;
  uploader_id?: string;
  // File properties
  file: {
    type: string;
    size: number;
  };
  // Media properties
  duration?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
  // User properties
  userId?: string;
  orgId?: string;
}

export interface UploadResponse {
  upload_url: string;
  asset_id: string;
  expires_at: string;
  success: boolean;
  mediaAsset?: any;
  error?: string;
}

export interface PlaybackToken {
  token: string;
  expires_at: string;
  playback_url: string;
}

// Analytics & Metrics
export interface AnalyticsEvent {
  event_name: string;
  properties: Record<string, any>;
  user_id?: string;
  session_id?: string;
  timestamp: string;
}

// API Endpoints
export interface ApiEndpoints {
  // Authentication
  'POST /auth/signup': {
    request: { email: string; password: string; handle: string; name: string };
    response: { user: AuthUser; session: any };
  };
  'POST /auth/signin': {
    request: { email: string; password: string };
    response: { user: AuthUser; session: any };
  };
  'POST /auth/signout': {
    request: {};
    response: { success: boolean };
  };
  
  // Events
  'GET /events': {
    request: {
      near?: string; // "lat,lng"
      when?: 'today' | 'week' | 'month';
      category?: string;
      cursor?: string;
      limit?: number;
    };
    response: { events: Event[]; meta: ApiMeta };
  };
  'GET /events/:id': {
    request: { id: string };
    response: { event: Event };
  };
  'POST /events': {
    request: Omit<Event, 'id' | 'created_at' | 'updated_at'>;
    response: { event: Event };
  };
  
  // Feed
  'GET /feed': {
    request: FeedFilter;
    response: { items: FeedItem[]; meta: ApiMeta };
  };
  
  // Posts
  'GET /posts': {
    request: {
      event_id?: string;
      author_id?: string;
      cursor?: string;
      limit?: number;
    };
    response: { posts: Post[]; meta: ApiMeta };
  };
  'POST /posts': {
    request: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'metrics'>;
    response: { post: Post };
  };
  'POST /posts/:id/like': {
    request: { id: string };
    response: { success: boolean };
  };
  'DELETE /posts/:id/like': {
    request: { id: string };
    response: { success: boolean };
  };
  
  // Tickets & Orders
  'POST /orders/checkout': {
    request: CheckoutRequest;
    response: CheckoutResponse;
  };
  'GET /tickets/owned': {
    request: {};
    response: { tickets: TicketOwned[] };
  };
  
  // Upload & Media
  'POST /upload/sign': {
    request: UploadRequest;
    response: UploadResponse;
  };
  'GET /media/:id/playback-token': {
    request: { id: string };
    response: PlaybackToken;
  };
  
  // Enhanced Search
  'POST /enhanced-search': {
    request: {
      q: string;
      types?: string[];
      category?: string;
      location?: string;
      radius_km?: number;
      date_from?: string;
      date_to?: string;
      limit?: number;
      offset?: number;
      sort_by?: 'relevance' | 'date' | 'popularity' | 'distance';
      price_range?: { min: number; max: number };
      tags?: string[];
      organizer_id?: string;
      verified_only?: boolean;
      include_past_events?: boolean;
    };
    response: {
      query: string;
      results: {
        events: any[];
        organizations: any[];
        users: any[];
        posts: any[];
      };
      meta: {
        total: number;
        search_time_ms: number;
        has_more: boolean;
        facets: {
          categories: { name: string; count: number }[];
          locations: { name: string; count: number }[];
          price_ranges: { range: string; count: number }[];
          dates: { range: string; count: number }[];
        };
      };
      suggestions?: string[];
      trending?: any[];
      related_searches?: string[];
      filters_applied?: any;
    };
  };

  // Discover Feed
  'POST /discover-feed': {
    request: {
      user_id?: string;
      location?: string;
      radius_km?: number;
      categories?: string[];
      limit?: number;
      offset?: number;
      include_trending?: boolean;
      include_recommendations?: boolean;
      include_nearby?: boolean;
      include_following?: boolean;
      price_range?: { min: number; max: number };
      date_range?: { from: string; to: string };
    };
    response: {
      events: any[];
      trending_events: any[];
      recommended_events: any[];
      nearby_events: any[];
      following_events: any[];
      meta: {
        total: number;
        has_more: boolean;
        user_location?: { lat: number; lng: number };
        categories_available: string[];
      };
      insights: {
        popular_categories: { name: string; count: number }[];
        trending_topics: string[];
        price_distribution: { range: string; count: number }[];
      };
    };
  };
  
  // User Management
  'GET /users/profile': {
    request: {};
    response: { user: AuthUser };
  };
  'PUT /users/profile': {
    request: Partial<AuthUser>;
    response: { user: AuthUser };
  };
  'POST /users/follow/:org_id': {
    request: { org_id: string };
    response: { success: boolean };
  };
  'DELETE /users/follow/:org_id': {
    request: { org_id: string };
    response: { success: boolean };
  };
  
  // Entitlements
  'GET /entitlements': {
    request: { event_id: string };
    response: { access: 'none' | 'general' | 'vip' | 'crew' };
  };
}

// Utility types
export type ApiRequest<T extends keyof ApiEndpoints> = ApiEndpoints[T]['request'];
export type ApiEndpointResponse<T extends keyof ApiEndpoints> = ApiEndpoints[T]['response'];

// Error codes
export const API_ERROR_CODES = {
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  TICKET_UNAVAILABLE: 'TICKET_UNAVAILABLE',
  ACCESS_DENIED: 'ACCESS_DENIED',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];
