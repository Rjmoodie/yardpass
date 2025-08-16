import { QueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { 
  ApiResponse, 
  ApiError, 
  FeedFilter, 
  FeedItem, 
  SearchQuery, 
  SearchResult,
  CheckoutRequest,
  CheckoutResponse,
  UploadRequest,
  UploadResponse,
  PlaybackToken
} from '@yardpass/types';

// Create a query client instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

// API client class
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network error occurred',
        details: error,
      };

      throw apiError;
    }
  }

  // Authentication endpoints
  async signUp(credentials: { email: string; password: string; handle: string; name: string }) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async signIn(credentials: { email: string; password: string }) {
    return this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async signOut() {
    return this.request('/auth/signout', {
      method: 'POST',
    });
  }

  // Events endpoints
  async getEvents(params: {
    near?: string;
    when?: 'today' | 'week' | 'month';
    category?: string;
    cursor?: string;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/events?${searchParams.toString()}`);
  }

  async getEvent(id: string) {
    return this.request(`/events/${id}`);
  }

  async createEvent(eventData: any) {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  // Feed endpoints
  async getFeed(filter: FeedFilter) {
    const searchParams = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request<{ items: FeedItem[]; meta: any }>(`/feed?${searchParams.toString()}`);
  }

  // Posts endpoints
  async getPosts(params: {
    event_id?: string;
    author_id?: string;
    cursor?: string;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/posts?${searchParams.toString()}`);
  }

  async createPost(postData: any) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async likePost(id: string) {
    return this.request(`/posts/${id}/like`, {
      method: 'POST',
    });
  }

  async unlikePost(id: string) {
    return this.request(`/posts/${id}/like`, {
      method: 'DELETE',
    });
  }

  // Tickets & Orders endpoints
  async checkout(request: CheckoutRequest): Promise<ApiResponse<CheckoutResponse>> {
    return this.request('/orders/checkout', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getOwnedTickets() {
    return this.request('/tickets/owned');
  }

  // Upload & Media endpoints
  async signUpload(request: UploadRequest): Promise<ApiResponse<UploadResponse>> {
    return this.request('/upload/sign', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getPlaybackToken(id: string): Promise<ApiResponse<PlaybackToken>> {
    return this.request(`/media/${id}/playback-token`);
  }

  // Search endpoints
  async search(query: SearchQuery): Promise<ApiResponse<SearchResult>> {
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/search?${searchParams.toString()}`);
  }

  // User Management endpoints
  async getProfile() {
    return this.request('/users/profile');
  }

  async updateProfile(profileData: any) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async followOrganizer(orgId: string) {
    return this.request(`/users/follow/${orgId}`, {
      method: 'POST',
    });
  }

  async unfollowOrganizer(orgId: string) {
    return this.request(`/users/follow/${orgId}`, {
      method: 'DELETE',
    });
  }

  // Entitlements endpoints
  async getEntitlements(eventId: string) {
    return this.request(`/entitlements?eventId=${eventId}`);
  }
}

// Create a singleton instance
export const apiClient = new ApiClient();

// Query keys for React Query
export const queryKeys = {
  events: {
    all: ['events'] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.events.lists(), filters] as const,
    details: () => [...queryKeys.events.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.events.details(), id] as const,
  },
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.posts.lists(), filters] as const,
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.posts.details(), id] as const,
  },
  feed: {
    all: ['feed'] as const,
    list: (filter: FeedFilter) => [...queryKeys.feed.all, filter] as const,
  },
  auth: {
    user: ['auth', 'user'] as const,
  },
  tickets: {
    owned: ['tickets', 'owned'] as const,
  },
  search: {
    all: ['search'] as const,
    results: (query: SearchQuery) => [...queryKeys.search.all, query] as const,
  },
} as const;


