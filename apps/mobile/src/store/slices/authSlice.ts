import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
// import { AuthUser } from '@yardpass/types';
// import { AuthService } from '@yardpass/api';

// Temporary types until packages are built
interface AuthUser {
  id: string;
  email: string;
  name: string;
  handle: string;
  avatar?: string;
}

// Temporary service until packages are built
const AuthService = {
  signUp: async (credentials: any) => ({ data: { user: credentials, session: null } }),
  signIn: async (credentials: any) => ({ data: { user: credentials, session: null } }),
  signOut: async () => {},
  getCurrentUser: async () => ({ data: null }),
};

interface AuthState {
  user: AuthUser | null;
  session: any | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

// Async thunks
export const signUp = createAsyncThunk(
  'auth/signUp',
  async (credentials: { email: string; password: string; handle: string; name: string }) => {
    const response = await AuthService.signUp(credentials);
    return response.data;
  }
);

export const signIn = createAsyncThunk(
  'auth/signIn',
  async (credentials: { email: string; password: string }) => {
    const response = await AuthService.signIn(credentials);
    return response.data;
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await AuthService.signOut();
});

export const getCurrentUser = createAsyncThunk('auth/getCurrentUser', async () => {
  const response = await AuthService.getCurrentUser();
  return response.data;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearUser: (state) => {
      state.user = null;
      state.session = null;
      state.isAuthenticated = false;
    },
    setSession: (state, action: PayloadAction<any>) => {
      state.session = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Sign Up
    builder
      .addCase(signUp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.isAuthenticated = true;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Sign up failed';
      });

    // Sign In
    builder
      .addCase(signIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.isAuthenticated = true;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Sign in failed';
      });

    // Sign Out
    builder
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.session = null;
        state.isAuthenticated = false;
      });

    // Get Current User
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setUser, clearUser, setSession, clearError } = authSlice.actions;
export default authSlice.reducer;

