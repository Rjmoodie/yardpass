import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import { RootState } from '@/store';
import authReducer from '@/store/slices/authSlice';
import eventsReducer from '@/store/slices/eventsSlice';
import postsReducer from '@/store/slices/postsSlice';
import ticketsReducer from '@/store/slices/ticketsSlice';
import organizersReducer from '@/store/slices/organizersSlice';
import campaignsReducer from '@/store/slices/campaignsSlice';

// Mock data for testing
export const mockUser = {
  id: 'test-user-id',
  uid: 'test-uid',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  bio: 'Test bio',
  avatarUrl: 'https://example.com/avatar.jpg',
  coverUrl: 'https://example.com/cover.jpg',
  isVerified: false,
  isOrganizer: false,
  isAdmin: false,
  role: 'user' as const,
  preferences: {
    notifications: {
      push: true,
      email: true,
      sms: false,
      inApp: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      types: {
        event_reminder: true,
        event_update: true,
        event_cancelled: true,
        event_postponed: true,
        ticket_purchased: true,
        ticket_refunded: true,
        ticket_transferred: true,
        ticket_upgraded: true,
        new_follower: true,
        post_liked: true,
        post_commented: true,
        post_shared: true,
        new_post: true,
        gated_content: true,
        vip_content: true,
        event_approved: true,
        event_rejected: true,
        sales_update: true,
        system_update: true,
        security_alert: true,
        maintenance: true,
      },
    },
    privacy: {
      isPrivate: false,
      allowMessages: true,
      showOnlineStatus: true,
      allowTagging: true,
    },
    accessibility: {
      screenReaderEnabled: false,
      highContrastEnabled: false,
      largeTextEnabled: false,
      reducedMotionEnabled: false,
      autoCaptionsEnabled: false,
    },
    theme: 'system' as const,
    language: 'en',
    timezone: 'UTC',
  },
  stats: {
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    eventsAttended: 0,
    eventsCreated: 0,
    totalLikes: 0,
    totalViews: 0,
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastActiveAt: '2024-01-01T00:00:00Z',
  isPrivate: false,
  isBlocked: false,
  blockedUsers: [],
};

export const mockEvent = {
  id: 'test-event-id',
  slug: 'test-event',
  title: 'Test Event',
  description: 'This is a test event description',
  shortDescription: 'Test event',
  category: 'music' as const,
  subcategory: 'rock',
  tags: ['music', 'rock', 'live'],
  coverImage: 'https://example.com/cover.jpg',
  logo: 'https://example.com/logo.jpg',
  gallery: ['https://example.com/gallery1.jpg'],
  videoUrl: 'https://example.com/video.mp4',
  organizerId: 'test-organizer-id',
  organizer: {
    id: 'test-organizer-id',
    userId: 'test-user-id',
    user: mockUser,
    companyName: 'Test Company',
    description: 'Test company description',
    logo: 'https://example.com/logo.jpg',
    website: 'https://example.com',
    socialLinks: {
      instagram: 'https://instagram.com/test',
      twitter: 'https://twitter.com/test',
    },
    isVerified: true,
    verificationDate: '2024-01-01T00:00:00Z',
    verificationDocuments: ['https://example.com/doc1.pdf'],
    events: [],
    followers: [],
    followersCount: 0,
    totalEvents: 0,
    totalRevenue: 0,
    averageRating: 0,
    settings: {
      autoApprovePosts: true,
      requireApproval: false,
      allowUserPosts: true,
      moderationLevel: 'medium' as const,
      notificationPreferences: {
        push: true,
        email: true,
        sms: false,
        inApp: true,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
        },
        types: {
          event_reminder: true,
          event_update: true,
          event_cancelled: true,
          event_postponed: true,
          ticket_purchased: true,
          ticket_refunded: true,
          ticket_transferred: true,
          ticket_upgraded: true,
          new_follower: true,
          post_liked: true,
          post_commented: true,
          post_shared: true,
          new_post: true,
          gated_content: true,
          vip_content: true,
          event_approved: true,
          event_rejected: true,
          sales_update: true,
          system_update: true,
          security_alert: true,
          maintenance: true,
        },
      },
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  location: {
    id: 'test-location-id',
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    postalCode: '12345',
    latitude: 40.7128,
    longitude: -74.0060,
    formattedAddress: '123 Test St, Test City, Test State 12345',
  },
  venue: {
    id: 'test-venue-id',
    name: 'Test Venue',
    type: 'concert_hall' as const,
    address: {
      id: 'test-venue-location-id',
      address: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
      postalCode: '12345',
      latitude: 40.7128,
      longitude: -74.0060,
      formattedAddress: '123 Test St, Test City, Test State 12345',
    },
    capacity: 1000,
    amenities: ['parking', 'wifi', 'food'],
    accessibility: {
      wheelchairAccessible: true,
      accessibleParking: true,
      accessibleRestrooms: true,
      signLanguageInterpreters: false,
      audioDescription: false,
      serviceAnimalsAllowed: true,
      notes: 'Accessible venue',
    },
    parking: {
      available: true,
      type: 'lot' as const,
      cost: 10,
      capacity: 100,
      accessibleSpaces: 5,
      notes: 'Parking available',
    },
    photos: ['https://example.com/venue1.jpg'],
    description: 'Test venue description',
  },
  startDate: '2024-12-31T20:00:00Z',
  endDate: '2024-12-31T23:00:00Z',
  timezone: 'America/New_York',
  doorsOpen: '2024-12-31T19:00:00Z',
  doorsClose: '2024-12-31T22:30:00Z',
  status: 'on_sale' as const,
  visibility: 'public' as const,
  isActive: true,
  isVerified: true,
  isFeatured: false,
  capacity: 1000,
  soldOut: false,
  waitlistEnabled: true,
  waitlistCount: 0,
  priceRange: {
    min: 25,
    max: 100,
  },
  currency: 'USD',
  likesCount: 0,
  sharesCount: 0,
  viewsCount: 0,
  followersCount: 0,
  posts: [],
  tickets: [],
  campaigns: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  publishedAt: '2024-01-01T00:00:00Z',
};

export const mockPost = {
  id: 'test-post-id',
  eventId: 'test-event-id',
  event: mockEvent,
  authorId: 'test-user-id',
  author: mockUser,
  type: 'video' as const,
  mediaUrl: 'https://example.com/video.mp4',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  duration: 30000,
  aspectRatio: 9 / 16,
  caption: 'Test post caption',
  hashtags: ['#test', '#event'],
  mentions: [],
  visibility: 'public' as const,
  accessLevel: 'general' as const,
  isPinned: false,
  isSponsored: false,
  likes: 0,
  comments: 0,
  shares: 0,
  views: 0,
  watchTime: 0,
  completionRate: 0,
  isLiked: false,
  isSaved: false,
  isShared: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockTicket = {
  id: 'test-ticket-id',
  eventId: 'test-event-id',
  event: mockEvent,
  userId: 'test-user-id',
  user: mockUser,
  ticketType: 'general' as const,
  accessLevel: 'general' as const,
  name: 'General Admission',
  description: 'General admission ticket',
  price: 25,
  currency: 'USD',
  originalPrice: 30,
  discount: 5,
  status: 'active' as const,
  validFrom: '2024-12-31T19:00:00Z',
  validUntil: '2024-12-31T23:00:00Z',
  checkedInAt: null,
  qrCode: 'test-qr-code',
  qrData: {
    ticketId: 'test-ticket-id',
    eventId: 'test-event-id',
    userId: 'test-user-id',
    accessLevel: 'general' as const,
    timestamp: Date.now(),
    signature: 'test-signature',
  },
  isTransferable: true,
  transferredFrom: null,
  transferredTo: null,
  addOns: [],
  upgrades: [],
  purchaseDate: '2024-01-01T00:00:00Z',
  paymentMethod: 'credit_card' as const,
  transactionId: 'test-transaction-id',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Create a test store with initial state
const createTestStore = (preloadedState?: Partial<RootState>) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      events: eventsReducer,
      posts: postsReducer,
      tickets: ticketsReducer,
      organizers: organizersReducer,
      campaigns: campaignsReducer,
    },
    preloadedState: preloadedState as RootState,
  });
};

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    ...renderOptions
  }: RenderOptions & {
    preloadedState?: Partial<RootState>;
    store?: ReturnType<typeof createTestStore>;
  } = {}
) => {
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <Provider store={store}>
        <NavigationContainer>
          {children}
        </NavigationContainer>
      </Provider>
    );
  };

  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
};

// Re-export everything
export * from '@testing-library/react-native';
export { customRender as render, createTestStore };

// Test helpers
export const waitForElementToBeRemoved = (element: any) => {
  return new Promise((resolve) => {
    const checkElement = () => {
      if (!element) {
        resolve(true);
      } else {
        setTimeout(checkElement, 100);
      }
    };
    checkElement();
  });
};

export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  canGoBack: jest.fn(),
  isFocused: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
};

export const mockRoute = {
  key: 'test-route-key',
  name: 'TestScreen',
  params: {},
};

// Mock Supabase
export const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    then: jest.fn(),
  })),
  rpc: jest.fn(),
};

// Mock performance monitor
export const mockPerformanceMonitor = {
  mark: jest.fn(),
  measure: jest.fn(),
  collectMetrics: jest.fn(),
  getReport: jest.fn(),
  initialize: jest.fn(),
};

// Mock analytics
export const mockAnalytics = {
  track: jest.fn(),
  trackScreen: jest.fn(),
  trackEngagement: jest.fn(),
  trackFeedInteraction: jest.fn(),
  trackEventInteraction: jest.fn(),
  trackAuth: jest.fn(),
  trackError: jest.fn(),
  trackPerformance: jest.fn(),
  trackBusinessMetric: jest.fn(),
  trackUserJourney: jest.fn(),
  setUser: jest.fn(),
  clearUser: jest.fn(),
  initialize: jest.fn(),
  cleanup: jest.fn(),
  getReport: jest.fn(),
};

// Setup and teardown helpers
export const setupTestEnvironment = () => {
  // Mock console methods to reduce noise in tests
  const originalConsole = { ...console };
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();

  return {
    restoreConsole: () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    },
  };
};

export const cleanupTestEnvironment = () => {
  jest.clearAllMocks();
  jest.clearAllTimers();
};
