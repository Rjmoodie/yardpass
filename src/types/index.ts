// Enhanced Types with Engineering Best Practices
// Addressing flaws from reference repositories

// Missing Type Definitions
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

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
}

// Core User Types with Enhanced Security
export interface User {
  id: string;
  uid: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string;
  location?: Location;
  interests: string[];
  avatarUrl?: string;
  coverUrl?: string;
  isVerified: boolean;
  isOrganizer: boolean;
  isAdmin: boolean;
  role: UserRole;
  preferences: UserPreferences;
  stats: UserStats;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  // Security & Privacy
  isPrivate: boolean;
  isBlocked: boolean;
  blockedUsers: string[];
  // Performance & Caching
  _cachedAt?: number;
  _version?: number;
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
}

export interface UserStats {
  followersCount: number;
  followingCount: number;
  postsCount: number;
  eventsAttended: number;
  eventsCreated: number;
  totalLikes: number;
  totalViews: number;
}

export enum UserRole {
  USER = 'user',
  ORGANIZER = 'organizer',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

// Enhanced Event Types with Comprehensive Features
export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription: string;
  category: EventCategory;
  subcategory?: string;
  tags: string[];
  
  // Media & Branding
  coverImage: string;
  logo?: string;
  gallery: string[];
  videoUrl?: string;
  
  // Organizer Info
  organizerId: string;
  organizer: Organizer;
  
  // Location & Venue
  location: Location;
  venue: Venue;
  
  // Timing
  startDate: string;
  endDate: string;
  timezone: string;
  doorsOpen?: string;
  doorsClose?: string;
  
  // Status & Visibility
  status: EventStatus;
  visibility: EventVisibility;
  isActive: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  
  // Capacity & Sales
  capacity: number;
  soldOut: boolean;
  waitlistEnabled: boolean;
  waitlistCount: number;
  
  // Pricing
  priceRange: PriceRange;
  currency: string;
  
  // Social & Engagement
  likesCount: number;
  sharesCount: number;
  viewsCount: number;
  followersCount: number;
  
  // Content & Features
  posts: Post[];
  tickets: Ticket[];
  campaigns: Campaign[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  
  // Performance & Caching
  _cachedAt?: number;
  _version?: number;
}

export enum EventCategory {
  MUSIC = 'music',
  SPORTS = 'sports',
  CULTURE = 'culture',
  NIGHTLIFE = 'nightlife',
  BUSINESS = 'business',
  EDUCATION = 'education',
  FOOD = 'food',
  TECHNOLOGY = 'technology',
  HEALTH = 'health',
  OTHER = 'other'
}

export enum EventStatus {
  DRAFT = 'draft',
  ANNOUNCED = 'announced',
  ON_SALE = 'on_sale',
  SOLD_OUT = 'sold_out',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  POSTPONED = 'postponed'
}

export enum EventVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  UNLISTED = 'unlisted',
  INVITE_ONLY = 'invite_only'
}

// Enhanced Post Types with TikTok-style Features
export interface Post {
  id: string;
  eventId: string;
  event: Event;
  
  // Author Info
  authorId: string;
  author: User;
  organizer?: Organizer;
  
  // Content
  type: PostType;
  mediaUrl: string;
  thumbnailUrl: string;
  duration: number;
  aspectRatio: number;
  
  // Text Content
  caption: string;
  hashtags: string[];
  mentions: string[];
  
  // Access Control
  visibility: PostVisibility;
  accessLevel: AccessLevel;
  isPinned: boolean;
  isSponsored: boolean;
  campaignId?: string;
  
  // Engagement Metrics
  likes: number;
  comments: number;
  shares: number;
  views: number;
  watchTime: number;
  completionRate: number;
  
  // User Interactions
  isLiked: boolean;
  isSaved: boolean;
  isShared: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  
  // Performance & Caching
  _cachedAt?: number;
  _version?: number;
}

export enum PostType {
  VIDEO = 'video',
  PHOTO = 'photo',
  LIVE = 'live',
  STORY = 'story'
}

export enum PostVisibility {
  PUBLIC = 'public',
  GATED = 'gated',
  PRIVATE = 'private'
}

export enum AccessLevel {
  GENERAL = 'general',
  VIP = 'vip',
  CREW = 'crew',
  ORGANIZER = 'organizer'
}

// Enhanced Ticket Types with Advanced Features
export interface Ticket {
  id: string;
  eventId: string;
  event: Event;
  userId: string;
  user: User;
  
  // Ticket Details
  ticketType: TicketType;
  accessLevel: AccessLevel;
  name: string;
  description: string;
  
  // Pricing
  price: number;
  currency: string;
  originalPrice?: number;
  discount?: number;
  
  // Status & Validity
  status: TicketStatus;
  validFrom: string;
  validUntil: string;
  checkedInAt?: string;
  
  // QR & Security
  qrCode: string;
  qrData: QRData;
  isTransferable: boolean;
  transferredFrom?: string;
  transferredTo?: string;
  
  // Add-ons & Upgrades
  addOns: TicketAddOn[];
  upgrades: TicketUpgrade[];
  
  // Purchase Info
  purchaseDate: string;
  paymentMethod: PaymentMethod;
  transactionId: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  
  // Performance & Caching
  _cachedAt?: number;
  _version?: number;
}

export interface QRData {
  ticketId: string;
  eventId: string;
  userId: string;
  accessLevel: AccessLevel;
  timestamp: number;
  signature: string;
}

export enum TicketType {
  GENERAL = 'general',
  GENERAL_ADMISSION = 'general_admission',
  VIP = 'vip',
  EARLY_BIRD = 'early_bird',
  GROUP = 'group',
  STUDENT = 'student',
  SENIOR = 'senior',
  CHILD = 'child',
  COMPLIMENTARY = 'complimentary',
  CREW = 'crew',
  BUNDLE = 'bundle'
}

export enum TicketStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  TRANSFERRED = 'transferred',
  REFUNDED = 'refunded'
}

export interface TicketAddOn {
  id: string;
  type: AddOnType;
  name: string;
  description: string;
  price: number;
  quantity: number;
  isActive: boolean;
}

export enum AddOnType {
  MERCHANDISE = 'merchandise',
  FOOD_BEVERAGE = 'food_beverage',
  PARKING = 'parking',
  TRANSPORTATION = 'transportation',
  EXPERIENCE = 'experience',
  INSURANCE = 'insurance'
}

export interface TicketUpgrade {
  id: string;
  fromLevel: AccessLevel;
  toLevel: AccessLevel;
  price: number;
  description: string;
  isAvailable: boolean;
}

// YardPass Types
export interface YardPass {
  id: string;
  userId: string;
  user: User;
  eventId: string;
  event: Event;
  type: PassType;
  status: PassStatus;
  accessLevel: AccessLevel;
  price: number;
  currency: string;
  purchaseDate: string;
  validFrom: string;
  validUntil: string;
  isTransferable: boolean;
  isRefundable: boolean;
  qrCode: string;
  barcode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export enum PassType {
  GENERAL = 'general',
  VIP = 'vip',
  EARLY_BIRD = 'early_bird',
  GROUP = 'group',
  STUDENT = 'student',
  SENIOR = 'senior',
  CHILD = 'child',
  COMPLIMENTARY = 'complimentary',
  CREW = 'crew',
  BUNDLE = 'bundle'
}

export enum PassStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  TRANSFERRED = 'transferred',
  REFUNDED = 'refunded'
}

export interface CreatePassForm {
  eventId: string;
  type: PassType;
  quantity: number;
  addOns?: string[];
  paymentMethod: string;
}

export interface UpdatePassForm {
  id: string;
  type?: PassType;
  status?: PassStatus;
  notes?: string;
}

export interface PassFilters {
  type?: PassType;
  status?: PassStatus;
  eventId?: string;
  location?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface PassesState {
  passes: YardPass[];
  currentPass: YardPass | null;
  isLoading: boolean;
  error: string | null;
  filters: PassFilters;
}

// Enhanced Organizer Types
export interface Organizer {
  id: string;
  userId: string;
  user: User;
  
  // Company Info
  companyName: string;
  description: string;
  logo: string;
  website?: string;
  socialLinks: SocialLinks;
  
  // Verification
  isVerified: boolean;
  verificationDate?: string;
  verificationDocuments: string[];
  
  // Events & Following
  events: Event[];
  followers: User[];
  followersCount: number;
  
  // Analytics
  totalEvents: number;
  totalRevenue: number;
  averageRating: number;
  
  // Settings
  settings: OrganizerSettings;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  
  // Performance & Caching
  _cachedAt?: number;
  _version?: number;
}

export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
}

export interface OrganizerSettings {
  autoApprovePosts: boolean;
  requireApproval: boolean;
  allowUserPosts: boolean;
  moderationLevel: 'low' | 'medium' | 'high';
  notificationPreferences: NotificationPreferences;
}

// Enhanced Campaign Types
export interface Campaign {
  id: string;
  eventId: string;
  event: Event;
  organizerId: string;
  organizer: Organizer;
  
  // Campaign Details
  title: string;
  description: string;
  objective: CampaignObjective;
  
  // Budget & Timing
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  
  // Targeting
  targetAudience: TargetAudience;
  targetLocation?: Location;
  targetInterests: string[];
  
  // Status & Performance
  status: CampaignStatus;
  metrics: CampaignMetrics;
  
  // Content
  posts: Post[];
  creatives: CampaignCreative[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  
  // Performance & Caching
  _cachedAt?: number;
  _version?: number;
}

export enum CampaignObjective {
  AWARENESS = 'awareness',
  TRAFFIC = 'traffic',
  ENGAGEMENT = 'engagement',
  CONVERSIONS = 'conversions',
  SALES = 'sales'
}

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface TargetAudience {
  ageRange: [number, number];
  gender?: 'male' | 'female' | 'all';
  interests: string[];
  location?: Location;
  radius?: number;
  followersOf?: string[];
}

export interface CampaignMetrics {
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpm: number;
  cpc: number;
  conversions: number;
  conversionRate: number;
  roas: number;
}

export interface CampaignCreative {
  id: string;
  type: 'image' | 'video' | 'carousel';
  mediaUrl: string;
  thumbnailUrl?: string;
  title: string;
  description: string;
  cta: string;
  isActive: boolean;
}

// Enhanced Location & Venue Types
export interface Location {
  id: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface Venue {
  id: string;
  name: string;
  type: VenueType;
  address: Location;
  capacity: number;
  amenities: string[];
  accessibility: AccessibilityInfo;
  parking: ParkingInfo;
  photos: string[];
  description: string;
}

export enum VenueType {
  CONCERT_HALL = 'concert_hall',
  STADIUM = 'stadium',
  THEATER = 'theater',
  CONFERENCE_CENTER = 'conference_center',
  OUTDOOR = 'outdoor',
  RESTAURANT = 'restaurant',
  BAR = 'bar',
  CLUB = 'club',
  GALLERY = 'gallery',
  MUSEUM = 'museum',
  OTHER = 'other'
}

export interface AccessibilityInfo {
  wheelchairAccessible: boolean;
  accessibleParking: boolean;
  accessibleRestrooms: boolean;
  signLanguageInterpreters: boolean;
  audioDescription: boolean;
  serviceAnimalsAllowed: boolean;
  notes: string;
}

export interface ParkingInfo {
  available: boolean;
  free: boolean;
  cost?: number;
  capacity?: number;
  accessibleSpaces: number;
  notes: string;
}

// Enhanced Navigation Types
export interface RootStackParamList {
  // Auth
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  
  // Main Tabs
  MainTabs: undefined;
  
  // Feed & Content
  Home: undefined;
  Discover: undefined;
  CreatePost: undefined;
  PostDetails: { postId: string };
  
  // Events
  EventHub: { eventId: string; initialTab?: EventHubTab };
  EventEditor: { eventId?: string };
  EventPeek: { eventId: string };
  
  // Tickets & Wallet
  TicketPurchase: { eventId: string };
  TicketDetails: { ticketId: string };
  Wallet: undefined;
  
  // Organizer
  OrganizerDashboard: undefined;
  MediaScheduler: { eventId: string };
  Analytics: { eventId?: string };
  
  // Social
  Profile: { userId?: string };
  Followers: { userId: string; type: 'followers' | 'following' };
  Chat: { eventId?: string; userId?: string };
  
  // Settings & Support
  Settings: undefined;
  Notifications: undefined;
  Help: undefined;
  Privacy: undefined;
  
  // Index signature for dynamic routes
  [key: string]: any;
}

export enum EventHubTab {
  FEED = 'feed',
  ABOUT = 'about',
  SCHEDULE = 'schedule',
  TICKETS = 'tickets',
  COMMUNITY = 'community'
}

export interface MainTabParamList {
  Home: undefined;
  Discover: undefined;
  Create: undefined;
  Wallet: undefined;
  Profile: undefined;
  
  // Index signature for dynamic routes
  [key: string]: any;
}

// Enhanced Feed Types
export interface FeedFilter {
  type: 'for_you' | 'following' | 'near_me' | 'trending';
  category?: EventCategory;
  location?: Location;
  radius?: number;
  dateRange?: [string, string];
}

export interface FeedItem {
  id: string;
  post: Post;
  event: Event;
  author: User;
  isGated: boolean;
  hasAccess: boolean;
  distance?: number;
  relevanceScore: number;
  isSponsored: boolean;
  sponsoredBy?: Organizer;
}

// Enhanced API Response Types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  errors: ApiError[];
  meta?: ApiMeta;
  _cachedAt?: number;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export interface ApiMeta {
  pagination?: PaginationMeta;
  rateLimit?: RateLimitMeta;
  cache?: CacheMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface RateLimitMeta {
  limit: number;
  remaining: number;
  reset: number;
}

export interface CacheMeta {
  cached: boolean;
  ttl: number;
  version: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ApiMeta & { pagination: PaginationMeta };
}

// Enhanced Form Types
export interface CreateEventForm {
  title: string;
  description: string;
  category: EventCategory;
  subcategory?: string;
  tags: string[];
  startDate: string;
  endDate: string;
  timezone: string;
  location: Location;
  venue: Venue;
  coverImage: string;
  logo?: string;
  gallery: string[];
  videoUrl?: string;
  capacity: number;
  visibility: EventVisibility;
  autoApprovePosts: boolean;
  allowUserPosts: boolean;
}

export interface CreatePostForm {
  eventId: string;
  type: PostType;
  mediaUrl: string;
  thumbnailUrl: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  visibility: PostVisibility;
  accessLevel: AccessLevel;
  scheduledAt?: string;
  isSponsored: boolean;
  campaignId?: string;
}

export interface PurchaseTicketForm {
  eventId: string;
  ticketType: TicketType;
  quantity: number;
  addOns: string[];
  upgrades: string[];
  paymentMethod: PaymentMethod;
  billingAddress: BillingAddress;
  agreeToTerms: boolean;
  marketingConsent: boolean;
}

export interface BillingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer'
}

// Enhanced Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData;
  isRead: boolean;
  isActionable: boolean;
  actionUrl?: string;
  createdAt: string;
  expiresAt?: string;
}

export enum NotificationType {
  // Event Related
  EVENT_REMINDER = 'event_reminder',
  EVENT_UPDATE = 'event_update',
  EVENT_CANCELLED = 'event_cancelled',
  EVENT_POSTPONED = 'event_postponed',
  
  // Ticket Related
  TICKET_PURCHASED = 'ticket_purchased',
  TICKET_REFUNDED = 'ticket_refunded',
  TICKET_TRANSFERRED = 'ticket_transferred',
  TICKET_UPGRADED = 'ticket_upgraded',
  
  // Social
  NEW_FOLLOWER = 'new_follower',
  POST_LIKED = 'post_liked',
  POST_COMMENTED = 'post_commented',
  POST_SHARED = 'post_shared',
  
  // Content
  NEW_POST = 'new_post',
  GATED_CONTENT = 'gated_content',
  VIP_CONTENT = 'vip_content',
  
  // Organizer
  EVENT_APPROVED = 'event_approved',
  EVENT_REJECTED = 'event_rejected',
  SALES_UPDATE = 'sales_update',
  
  // System
  SYSTEM_UPDATE = 'system_update',
  SECURITY_ALERT = 'security_alert',
  MAINTENANCE = 'maintenance'
}

export interface NotificationData {
  eventId?: string;
  postId?: string;
  ticketId?: string;
  userId?: string;
  organizerId?: string;
  amount?: number;
  currency?: string;
  [key: string]: any;
}

// Enhanced Theme Types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
    overlay: string;
    gated: string;
    vip: string;
    crew: string;
  };
  eventColors: {
    music: string;
    sports: string;
    culture: string;
    nightlife: string;
    business: string;
    education: string;
    food: string;
    technology: string;
    health: string;
    other: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: TextStyle;
    h2: TextStyle;
    h3: TextStyle;
    h4: TextStyle;
    h5: TextStyle;
    h6: TextStyle;
    body: TextStyle;
    caption: TextStyle;
    button: TextStyle;
  };
  shadows: {
    sm: ShadowStyle;
    md: ShadowStyle;
    lg: ShadowStyle;
    xl: ShadowStyle;
  };
}

export interface TextStyle {
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  letterSpacing?: number;
  color?: string;
}

export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation?: number;
}

// Enhanced Redux State Types
export interface RootState {
  auth: AuthState;
  events: EventsState;
  posts: PostsState;
  tickets: TicketsState;
  organizers: OrganizersState;
  campaigns: CampaignsState;
  notifications: NotificationsState;
  ui: UIState;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  session: Session | null;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface EventsState {
  events: Event[];
  currentEvent: Event | null;
  featuredEvents: Event[];
  nearbyEvents: Event[];
  userEvents: Event[];
  isLoading: boolean;
  error: string | null;
  filters: EventFilters;
  pagination: PaginationMeta;
}

export interface EventFilters {
  category?: EventCategory;
  dateRange?: [string, string];
  location?: Location;
  radius?: number;
  priceRange?: [number, number];
  status?: EventStatus;
  isVerified?: boolean;
  search?: string;
}

export interface PostsState {
  posts: Post[];
  feed: FeedItem[];
  currentPost: Post | null;
  userPosts: Post[];
  isLoading: boolean;
  error: string | null;
  filters: FeedFilter;
  pagination: PaginationMeta;
  _cachedAt: number;
}

export interface TicketsState {
  tickets: Ticket[];
  currentTicket: Ticket | null;
  purchasedTickets: Ticket[];
  isLoading: boolean;
  error: string | null;
  qrData: string | null;
  _cachedAt: number; // Cache timestamp for optimization
  _lastUpdated: number; // Last update timestamp
}

export interface OrganizersState {
  organizers: Organizer[];
  currentOrganizer: Organizer | null;
  followedOrganizers: Organizer[];
  isLoading: boolean;
  error: string | null;
  _cachedAt: number; // Cache timestamp for optimization
  _lastUpdated: number; // Last update timestamp
}

export interface CampaignsState {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  isLoading: boolean;
  error: string | null;
}

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  settings: NotificationPreferences;
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
    [key in NotificationType]: boolean;
  };
}

export interface UIState {
  theme: 'light' | 'dark' | 'system';
  isLoading: boolean;
  modal: ModalState | null;
  toast: ToastState | null;
  navigation: NavigationState;
}

export interface ModalState {
  type: string;
  props: any;
  isVisible: boolean;
}

export interface ToastState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  isVisible: boolean;
}

export interface NavigationState {
  currentRoute: string;
  previousRoute: string;
  params: any;
}

// Performance & Caching Types
export interface CacheConfig {
  ttl: number;
  maxSize: number;
  version: string;
  strategy: 'memory' | 'persistent' | 'hybrid';
}

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  networkRequests: number;
  errors: number;
}

// Security Types
export interface SecurityConfig {
  encryptionEnabled: boolean;
  biometricEnabled: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireMFA: boolean;
}

// Accessibility Types
export interface AccessibilityConfig {
  screenReaderEnabled: boolean;
  highContrastEnabled: boolean;
  largeTextEnabled: boolean;
  reducedMotionEnabled: boolean;
  autoCaptionsEnabled: boolean;
}
