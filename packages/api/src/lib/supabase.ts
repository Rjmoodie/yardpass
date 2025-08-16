import { createClient } from '@supabase/supabase-js';
import { AuthUser, Event, Post, Ticket, Organization } from '@yardpass/types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: AuthUser;
        Insert: Omit<AuthUser, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AuthUser, 'id' | 'created_at' | 'updated_at'>>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Event, 'id' | 'created_at' | 'updated_at'>>;
      };
      posts: {
        Row: Post;
        Insert: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'metrics'>;
        Update: Partial<Omit<Post, 'id' | 'created_at' | 'updated_at' | 'metrics'>>;
      };
      tickets: {
        Row: Ticket;
        Insert: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Ticket, 'id' | 'created_at' | 'updated_at'>>;
      };
      orgs: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_access_level: {
        Args: { event_id: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
};

export type SupabaseClient = typeof supabase;


