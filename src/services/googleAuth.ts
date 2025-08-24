import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';
import { Platform } from 'react-native';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, // Your Google Web Client ID
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, // Optional: iOS Client ID
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  photo?: string;
  givenName?: string;
  familyName?: string;
}

export class GoogleAuthService {
  /**
   * Sign in with Google
   */
  static async signInWithGoogle(): Promise<{ user: any; session: any }> {
    try {
      // Check if device supports Google Play Services (Android)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      
      if (!userInfo) {
        throw new Error('Google sign-in was cancelled');
      }

      // Get the ID token
      const { accessToken } = await GoogleSignin.getTokens();
      
      if (!accessToken) {
        throw new Error('Failed to get access token');
      }

      // Sign in to Supabase with Google
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: accessToken,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('No user data returned from Supabase');
      }

      // Create or update user profile
      await this.createOrUpdateUserProfile(data.user, userInfo);

      return {
        user: data.user,
        session: data.session,
      };

    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  /**
   * Sign out from Google
   */
  static async signOut(): Promise<void> {
    try {
      // Sign out from Google
      await GoogleSignin.signOut();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Google sign-out error:', error);
      throw error;
    }
  }

  /**
   * Check if user is signed in with Google
   */
  static async isSignedIn(): Promise<boolean> {
    try {
      const isSignedIn = await GoogleSignin.isSignedIn();
      return isSignedIn;
    } catch (error) {
      console.error('Error checking Google sign-in status:', error);
      return false;
    }
  }

  /**
   * Get current Google user
   */
  static async getCurrentUser(): Promise<GoogleUser | null> {
    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      return userInfo;
    } catch (error) {
      console.error('Error getting current Google user:', error);
      return null;
    }
  }

  /**
   * Create or update user profile in Supabase (using profiles table)
   */
  private static async createOrUpdateUserProfile(supabaseUser: any, googleUser: GoogleUser) {
    try {
      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const profileData = {
        id: supabaseUser.id,
        handle: googleUser.givenName ? 
          `${googleUser.givenName}_${supabaseUser.id.toString().substring(0, 8)}` : 
          `${googleUser.email?.split('@')[0]}_${supabaseUser.id.toString().substring(0, 8)}`,
        display_name: googleUser.name,
        avatar_url: googleUser.photo,
        google_id: googleUser.id,
        first_name: googleUser.givenName,
        last_name: googleUser.familyName,
        auth_provider: 'google',
        is_verified: true, // Google accounts are verified
        updated_at: new Date().toISOString(),
      };

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', supabaseUser.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            ...profileData,
            created_at: supabaseUser.created_at,
          });

        if (insertError) {
          throw insertError;
        }
      }

    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      // Don't throw error here as the user is already signed in
    }
  }
}
