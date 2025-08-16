import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, AuthState, Session, ApiResponse } from '@/types';
import { supabase } from '@/services/supabase';

// Async thunks
export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        throw new Error(error.message);
      }

      if (!user) {
        return null;
      }

      // Get user profile from our users table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('uid', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw new Error(profileError.message);
      }

      return profile || {
        id: user.id,
        uid: user.id,
        email: user.email || '',
        username: user.email?.split('@')[0] || '',
        displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        isVerified: false,
        isOrganizer: false,
        isAdmin: false,
        role: 'user',
        preferences: {},
        stats: {},
        createdAt: user.created_at,
        updatedAt: user.updated_at || user.created_at,
        lastActiveAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error getting current user:', error);
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to get current user',
        code: 'GET_USER_ERROR'
      });
    }
  }
);

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('No user data returned');
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('uid', data.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw new Error(profileError.message);
      }

      return profile || {
        id: data.user.id,
        uid: data.user.id,
        email: data.user.email || '',
        username: data.user.email?.split('@')[0] || '',
        displayName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || '',
        isVerified: false,
        isOrganizer: false,
        isAdmin: false,
        role: 'user',
        preferences: {},
        stats: {},
        createdAt: data.user.created_at,
        updatedAt: data.user.updated_at || data.user.created_at,
        lastActiveAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error signing in:', error);
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to sign in',
        code: 'SIGN_IN_ERROR'
      });
    }
  }
);

export const signUp = createAsyncThunk(
  'auth/signUp',
  async ({ 
    email, 
    password, 
    username, 
    displayName 
  }: { 
    email: string; 
    password: string; 
    username: string; 
    displayName: string; 
  }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: displayName,
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('No user data returned');
      }

      // Create user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .insert({
          uid: data.user.id,
          email: data.user.email || '',
          username,
          displayName,
          isVerified: false,
          isOrganizer: false,
          isAdmin: false,
          role: 'user',
          preferences: {},
          stats: {
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            eventsAttended: 0,
            eventsCreated: 0,
            totalLikes: 0,
            totalViews: 0,
          },
          createdAt: data.user.created_at,
          updatedAt: data.user.updated_at || data.user.created_at,
          lastActiveAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) {
        throw new Error(profileError.message);
      }

      return profile;

    } catch (error) {
      console.error('Error signing up:', error);
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to sign up',
        code: 'SIGN_UP_ERROR'
      });
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw new Error(error.message);
      }

      return null;

    } catch (error) {
      console.error('Error signing out:', error);
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to sign out',
        code: 'SIGN_OUT_ERROR'
      });
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email }: { email: string }, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'yardpass://reset-password',
      });

      if (error) {
        throw new Error(error.message);
      }

      return { message: 'Password reset email sent' };

    } catch (error) {
      console.error('Error resetting password:', error);
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to reset password',
        code: 'RESET_PASSWORD_ERROR'
      });
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (updates: Partial<User>, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState() as { auth: AuthState };
      const user = auth.user;

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;

    } catch (error) {
      console.error('Error updating profile:', error);
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to update profile',
        code: 'UPDATE_PROFILE_ERROR'
      });
    }
  }
);

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  session: null,
};

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setSession: (state, action: PayloadAction<Session | null>) => {
      state.session = action.payload;
    },
    updateUserStats: (state, action: PayloadAction<Partial<User['stats']>>) => {
      if (state.user) {
        state.user.stats = { ...state.user.stats, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Current User
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to get current user';
      })
      
      // Sign In
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to sign in';
      })
      
      // Sign Up
      .addCase(signUp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to sign up';
      })
      
      // Sign Out
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.session = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to sign out';
      })
      
      // Reset Password
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to reset password';
      })
      
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to update profile';
      });
  },
});

export const {
  clearError,
  setUser,
  setSession,
  updateUserStats,
} = authSlice.actions;

export default authSlice.reducer;
