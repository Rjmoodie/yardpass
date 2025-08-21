import { supabase } from '../lib/supabase';
import { AuthUser, ApiResponse, ApiError } from '@yardpass/types';

export class AuthService {
  /**
   * Sign up a new user
   */
  static async signUp(credentials: {
    email: string;
    password: string;
    handle: string;
    name: string;
  }): Promise<ApiResponse<{ user: AuthUser; session: any }>> {
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Create user profile in our database
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          username: credentials.handle,
          display_name: credentials.name,
          email: credentials.email,
          preferences: {
            notifications: {
              push: true,
              email: true,
              sms: false,
              inApp: true,
              quietHours: { enabled: false, start: '22:00', end: '08:00' },
              types: {
                newEvents: true,
                eventUpdates: true,
                ticketReminders: true,
                socialActivity: true,
              },
            },
            theme: 'dark',
            language: 'en',
            currency: 'USD',
            timezone: 'America/New_York',
            privacy: {
              profileVisibility: 'public',
              activityStatus: true,
              dataSharing: false,
            },
            accessibility: {
              fontSize: 'medium',
              highContrast: false,
              reduceMotion: false,
            },
          },
          stats: {
            followers: 0,
            following: 0,
            posts: 0,
            eventsAttended: 0,
            ticketsPurchased: 0,
          },
        })
        .select()
        .single();

      if (profileError) throw profileError;

      return {
        data: {
          user: profileData as AuthUser,
          session: authData.session,
        },
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'SIGNUP_FAILED',
        message: error.message || 'Failed to sign up',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Sign in existing user
   */
  static async signIn(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: AuthUser; session: any }>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Invalid credentials');
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (profileError) throw profileError;

      return {
        data: {
          user: profileData as AuthUser,
          session: data.session,
        },
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'SIGNIN_FAILED',
        message: error.message || 'Failed to sign in',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Sign out user
   */
  static async signOut(): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      return {
        data: { success: true },
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'SIGNOUT_FAILED',
        message: error.message || 'Failed to sign out',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) throw error;

      if (!user) {
        throw new Error('No authenticated user');
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      return {
        data: profileData as AuthUser,
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'GET_USER_FAILED',
        message: error.message || 'Failed to get current user',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    updates: Partial<AuthUser>
  ): Promise<ApiResponse<AuthUser>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        data: data as AuthUser,
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'UPDATE_PROFILE_FAILED',
        message: error.message || 'Failed to update profile',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(email: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      return {
        data: { success: true },
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'RESET_PASSWORD_FAILED',
        message: error.message || 'Failed to reset password',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Update password
   */
  static async updatePassword(newPassword: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      return {
        data: { success: true },
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'UPDATE_PASSWORD_FAILED',
        message: error.message || 'Failed to update password',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Get user by handle
   */
  static async getUserByHandle(handle: string): Promise<ApiResponse<AuthUser>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', handle)
        .single();

      if (error) throw error;

      return {
        data: data as AuthUser,
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'GET_USER_BY_HANDLE_FAILED',
        message: error.message || 'Failed to get user by handle',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Check if handle is available
   */
  static async checkHandleAvailability(handle: string): Promise<ApiResponse<{ available: boolean }>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', handle)
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows found, handle is available
        return {
          data: { available: true },
        };
      }

      if (error) throw error;

      return {
        data: { available: false },
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'CHECK_HANDLE_FAILED',
        message: error.message || 'Failed to check handle availability',
        details: error,
      };

      throw apiError;
    }
  }
}


