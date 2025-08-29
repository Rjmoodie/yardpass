// Common types used throughout the application

export interface Organizer {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  isVerified: boolean;
  followers: number;
  events: number;
  rating?: number;
  location?: string;
  website?: string;
  socialMedia?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  // Additional properties used in components
  totalEvents?: number;
  followersCount?: number;
  user?: {
    avatar_url?: string;
  };
  companyName?: string;
  totalRevenue?: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  organizer: Organizer;
  category: string;
  image?: string;
  price?: number;
  capacity?: number;
  attendees: number;
  isLive?: boolean;
  tags: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  handle: string;
  avatar?: string;
  bio?: string;
  followers: number;
  following: number;
  isVerified: boolean;
  joinDate: string;
}

export interface Post {
  id: string;
  content: string;
  media?: string[];
  author: User;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  event?: Event;
}

export interface Ticket {
  id: string;
  eventId: string;
  event: Event;
  userId: string;
  user: User;
  type: string;
  price: number;
  purchaseDate: string;
  status: 'active' | 'used' | 'cancelled';
  qrCode?: string;
}

// Additional types for Redux slices
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  userId: string;
}

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

export interface YardPass {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'expired';
  location_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface PassesState {
  passes: YardPass[];
  loading: boolean;
  error: string | null;
}

export interface CreatePassForm {
  name: string;
  description: string;
  location_id: string;
  start_date: string;
  end_date: string;
}

export interface UpdatePassForm {
  id: string;
  name?: string;
  description?: string;
  status?: string;
}

export interface PassFilters {
  status?: string;
  location?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface PostsState {
  posts: Post[];
  feed: any[];
  userPosts: Post[];
  loading: boolean;
  error: string | null;
}

export interface FeedFilter {
  type: 'all' | 'following' | 'trending' | 'nearby' | 'for_you' | 'near_me';
  cursor?: string;
  limit?: number;
}

export interface FeedItem {
  id: string;
  post: Post;
  metadata: any;
}

export enum PostVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  GATED = 'gated'
}

export enum AccessLevel {
  GENERAL = 'general',
  VIP = 'vip',
  PREMIUM = 'premium'
}

export interface ApiResponse<T> {
  data: T;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    cursor: string | null;
    hasMore: boolean;
  };
}

export interface OrganizersState {
  organizers: Organizer[];
  loading: boolean;
  error: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  organizerId: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: string;
  endDate: string;
  budget: number;
  targetAudience: string[];
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  };
}

export interface CampaignsState {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
}

export interface EventCategoryData {
  id: string;
  title: string;
  name: string;
  imageUrl: string;
  count: number;
}
