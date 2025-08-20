import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

// Check if we're using mock data
export const isUsingMockData = !process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Custom SecureStore adapter for React Native
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database table names
export const TABLES = {
  USERS: 'users',
  EVENTS: 'events',
  TICKETS: 'tickets',
  TICKETS_OWNED: 'tickets_owned', // ✅ ADDED: Support for optimized queries
  ORDERS: 'orders',
  POSTS: 'posts',
  COMMENTS: 'comments',
  REACTIONS: 'reactions',
  ORGANIZERS: 'organizers',
  ORGANIZER_FOLLOWS: 'organizer_follows',
  MEDIA_ASSETS: 'media_assets',
  CAMPAIGNS: 'campaigns',
  CHECKINS: 'checkins',
} as const;

// Real-time channels
export const REALTIME_CHANNELS = {
  POSTS: 'posts',
  EVENTS: 'events',
  TICKETS: 'tickets',
  NOTIFICATIONS: 'notifications',
  EVENT_UPDATES: 'event_updates',
  POST_INTERACTIONS: 'post_interactions',
} as const;

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  if (error?.error_description) {
    return error.error_description;
  }
  return 'An unexpected error occurred';
};

// Helper function to format API responses
export const formatResponse = <T>(data: T | null, error: any): { data: T | null; error: string | null } => {
  if (error) {
    return {
      data: null,
      error: handleSupabaseError(error),
    };
  }
  return {
    data,
    error: null,
  };
};

// Helper function to calculate distance between two coordinates
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper function to format currency
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Helper function to format date
export const formatDate = (date: string | Date, format: 'short' | 'long' | 'relative' = 'short'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'relative') {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return dateObj.toLocaleDateString();
  }
  
  if (format === 'long') {
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Helper function to generate QR code data
export const generateQRData = (ticketId: string, eventId: string): string => {
  return JSON.stringify({
    ticketId,
    eventId,
    timestamp: Date.now(),
  });
};

// Helper function to validate access level
export const canAccessContent = (
  userAccessLevel: string,
  contentAccessLevel: string
): boolean => {
  const accessLevels = {
    general: 1,
    vip: 2,
    crew: 3,
  };
  
  return accessLevels[userAccessLevel as keyof typeof accessLevels] >= 
         accessLevels[contentAccessLevel as keyof typeof accessLevels];
};
