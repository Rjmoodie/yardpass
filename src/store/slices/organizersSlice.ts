import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase, TABLES, formatResponse } from '@/services/supabase';
import { Organizer, OrganizersState } from '@/types';

// ✅ OPTIMIZED: Async thunks with caching and eager loading
export const fetchOrganizers = createAsyncThunk(
  'organizers/fetchOrganizers',
  async (_, { rejectWithValue, getState }) => {
    try {
      // ✅ OPTIMIZED: Single query with eager loading and field selection
      const { data, error } = await supabase
        .from(TABLES.ORGANIZERS)
        .select(`
          id,
          companyName,
          description,
          logo,
          website,
          isVerified,
          followersCount,
          totalEvents,
          totalRevenue,
          averageRating,
          createdAt,
          updatedAt,
          user:users(
            id,
            name,
            avatar_url,
            handle
          )
        `)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      return formatResponse(data, null);
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to fetch organizers',
        code: 'ORGANIZERS_FETCH_ERROR'
      });
    }
  },
  {
    // ✅ OPTIMIZED: Prevent duplicate requests with cache validation
    condition: (_, { getState }) => {
      const { organizers } = getState() as { organizers: OrganizersState };
      if (organizers.isLoading) return false;
      if (organizers.organizers.length > 0 && Date.now() - (organizers._cachedAt || 0) < 30000) {
        return false; // Use cached data if less than 30 seconds old
      }
      return true;
    }
  }
);

export const fetchOrganizerById = createAsyncThunk(
  'organizers/fetchOrganizerById',
  async (organizerId: string, { rejectWithValue }) => {
    try {
      // ✅ OPTIMIZED: Single query with all necessary data
      const { data, error } = await supabase
        .from(TABLES.ORGANIZERS)
        .select(`
          id,
          companyName,
          description,
          logo,
          website,
          socialLinks,
          isVerified,
          verificationDate,
          verificationDocuments,
          followersCount,
          totalEvents,
          totalRevenue,
          averageRating,
          settings,
          createdAt,
          updatedAt,
          user:users(
            id,
            name,
            avatar_url,
            handle,
            bio
          ),
          events:events(
            id,
            title,
            slug,
            start_at,
            end_at,
            status,
            cover_image_url,
            category
          ),
          followers:organizer_follows(
            id,
            follower:users(
              id,
              name,
              avatar_url,
              handle
            )
          )
        `)
        .eq('id', organizerId)
        .single();

      if (error) throw error;

      return formatResponse(data, null);
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to fetch organizer',
        code: 'ORGANIZER_FETCH_ERROR'
      });
    }
  }
);

export const createOrganizer = createAsyncThunk(
  'organizers/createOrganizer',
  async (organizerData: Partial<Organizer>, { rejectWithValue }) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      // ✅ OPTIMIZED: Single insert with eager loading
      const { data, error } = await supabase
        .from(TABLES.ORGANIZERS)
        .insert([{ ...organizerData, userId }])
        .select(`
          id,
          companyName,
          description,
          logo,
          website,
          isVerified,
          followersCount,
          totalEvents,
          createdAt,
          user:users(
            id,
            name,
            avatar_url,
            handle
          )
        `)
        .single();

      if (error) throw error;

      return formatResponse(data, null);
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to create organizer',
        code: 'ORGANIZER_CREATE_ERROR'
      });
    }
  }
);

export const updateOrganizer = createAsyncThunk(
  'organizers/updateOrganizer',
  async ({ id, updates }: { id: string; updates: Partial<Organizer> }, { rejectWithValue }) => {
    try {
      // ✅ OPTIMIZED: Single update with eager loading
      const { data, error } = await supabase
        .from(TABLES.ORGANIZERS)
        .update(updates)
        .eq('id', id)
        .select(`
          id,
          companyName,
          description,
          logo,
          website,
          isVerified,
          followersCount,
          totalEvents,
          updatedAt,
          user:users(
            id,
            name,
            avatar_url,
            handle
          )
        `)
        .single();

      if (error) throw error;

      return formatResponse(data, null);
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to update organizer',
        code: 'ORGANIZER_UPDATE_ERROR'
      });
    }
  }
);

export const followOrganizer = createAsyncThunk(
  'organizers/followOrganizer',
  async (organizerId: string, { rejectWithValue }) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      // ✅ OPTIMIZED: Check and toggle follow status efficiently
      const { data: existingFollow } = await supabase
        .from('organizer_follows')
        .select('id')
        .eq('organizerId', organizerId)
        .eq('followerId', userId)
        .single();

      if (existingFollow) {
        // Unfollow
        const { error } = await supabase
          .from('organizer_follows')
          .delete()
          .eq('id', existingFollow.id);

        if (error) throw error;
        return { organizerId, followed: false };
      } else {
        // Follow
        const { error } = await supabase
          .from('organizer_follows')
          .insert([{ organizerId, followerId: userId }]);

        if (error) throw error;
        return { organizerId, followed: true };
      }
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to follow/unfollow organizer',
        code: 'ORGANIZER_FOLLOW_ERROR'
      });
    }
  }
);

export const verifyOrganizer = createAsyncThunk(
  'organizers/verifyOrganizer',
  async (organizerId: string, { rejectWithValue }) => {
    try {
      // ✅ OPTIMIZED: Single update with eager loading
      const { data, error } = await supabase
        .from(TABLES.ORGANIZERS)
        .update({
          isVerified: true,
          verificationDate: new Date().toISOString(),
        })
        .eq('id', organizerId)
        .select(`
          id,
          companyName,
          isVerified,
          verificationDate,
          updatedAt
        `)
        .single();

      if (error) throw error;

      return formatResponse(data, null);
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to verify organizer',
        code: 'ORGANIZER_VERIFY_ERROR'
      });
    }
  }
);

export const fetchOrganizerEvents = createAsyncThunk(
  'organizers/fetchOrganizerEvents',
  async (organizerId: string, { rejectWithValue }) => {
    try {
      // ✅ OPTIMIZED: Efficient event loading with field selection
      const { data, error } = await supabase
        .from(TABLES.EVENTS)
        .select(`
          id,
          title,
          slug,
          description,
          start_at,
          end_at,
          status,
          visibility,
          category,
          cover_image_url,
          venue,
          city,
          created_at,
          tickets(
            id,
            name,
            price,
            quantity_available,
            quantity_sold
          )
        `)
        .eq('org_id', organizerId)
        .order('start_at', { ascending: true });

      if (error) throw error;

      return formatResponse(data, null);
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to fetch organizer events',
        code: 'ORGANIZER_EVENTS_FETCH_ERROR'
      });
    }
  }
);

export const fetchOrganizerFollowers = createAsyncThunk(
  'organizers/fetchOrganizerFollowers',
  async (organizerId: string, { rejectWithValue }) => {
    try {
      // ✅ OPTIMIZED: Efficient follower loading
      const { data, error } = await supabase
        .from('organizer_follows')
        .select(`
          id,
          created_at,
          follower:users(
            id,
            name,
            avatar_url,
            handle,
            bio
          )
        `)
        .eq('organizerId', organizerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return formatResponse(data, null);
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to fetch organizer followers',
        code: 'ORGANIZER_FOLLOWERS_FETCH_ERROR'
      });
    }
  }
);

export const searchOrganizers = createAsyncThunk(
  'organizers/searchOrganizers',
  async (searchTerm: string, { rejectWithValue }) => {
    try {
      // ✅ OPTIMIZED: Efficient search with field selection
      const { data, error } = await supabase
        .from(TABLES.ORGANIZERS)
        .select(`
          id,
          companyName,
          description,
          logo,
          isVerified,
          followersCount,
          totalEvents,
          createdAt,
          user:profiles(
            id,
            user_id,
            username,
            display_name,
            avatar_url,
            verified
          )
        `)
        .or(`companyName.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('isVerified', { ascending: false })
        .order('createdAt', { ascending: false });

      if (error) throw error;

      return formatResponse(data, null);
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to search organizers',
        code: 'ORGANIZERS_SEARCH_ERROR'
      });
    }
  }
);

// ✅ OPTIMIZED: Initial state with cache tracking
const initialState: OrganizersState = {
  organizers: [],
  currentOrganizer: null,
  followedOrganizers: [],
  isLoading: false,
  error: null,
  _cachedAt: 0, // Cache timestamp for optimization
  _lastUpdated: 0, // Last update timestamp
};

// ✅ OPTIMIZED: Slice with performance improvements
const organizersSlice = createSlice({
  name: 'organizers',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentOrganizer: (state, action: PayloadAction<Organizer | null>) => {
      state.currentOrganizer = action.payload;
    },
    addOrganizer: (state, action: PayloadAction<Organizer>) => {
      // ✅ OPTIMIZED: Add to beginning of array efficiently
      state.organizers.unshift(action.payload);
      state._lastUpdated = Date.now();
    },
    updateOrganizerInList: (state, action: PayloadAction<Organizer>) => {
      // ✅ OPTIMIZED: Efficient array update
      const index = state.organizers.findIndex(organizer => organizer.id === action.payload.id);
      if (index !== -1) {
        state.organizers[index] = action.payload;
        state._lastUpdated = Date.now();
      }
    },
    removeOrganizerFromList: (state, action: PayloadAction<string>) => {
      // ✅ OPTIMIZED: Efficient array filter
      state.organizers = state.organizers.filter(organizer => organizer.id !== action.payload);
      state._lastUpdated = Date.now();
    },
    clearCache: (state) => {
      state._cachedAt = 0;
      state._lastUpdated = 0;
    },
  },
  extraReducers: (builder) => {
    // fetchOrganizers
    builder
      .addCase(fetchOrganizers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrganizers.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          state.organizers = action.payload.data;
          state._cachedAt = Date.now(); // Cache the timestamp
          state._lastUpdated = Date.now();
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(fetchOrganizers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch organizers';
      });

    // fetchOrganizerById
    builder
      .addCase(fetchOrganizerById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrganizerById.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          state.currentOrganizer = action.payload.data;
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(fetchOrganizerById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch organizer';
      });

    // createOrganizer
    builder
      .addCase(createOrganizer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createOrganizer.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          state.organizers.unshift(action.payload.data);
          state._lastUpdated = Date.now();
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(createOrganizer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create organizer';
      });

    // updateOrganizer
    builder
      .addCase(updateOrganizer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateOrganizer.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          const index = state.organizers.findIndex(organizer => organizer.id === action.payload.data!.id);
          if (index !== -1) {
            state.organizers[index] = action.payload.data!;
          }
          if (state.currentOrganizer?.id === action.payload.data!.id) {
            state.currentOrganizer = action.payload.data!;
          }
          state._lastUpdated = Date.now();
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(updateOrganizer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update organizer';
      });

    // followOrganizer
    builder
      .addCase(followOrganizer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(followOrganizer.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update organizer follow count if needed
        if (action.payload.followed) {
          // Add to followed organizers
          const organizer = state.organizers.find(org => org.id === action.payload.organizerId);
          if (organizer) {
            organizer.followersCount = (organizer.followersCount || 0) + 1;
          }
        } else {
          // Remove from followed organizers
          const organizer = state.organizers.find(org => org.id === action.payload.organizerId);
          if (organizer) {
            organizer.followersCount = Math.max(0, (organizer.followersCount || 0) - 1);
          }
        }
        state._lastUpdated = Date.now();
      })
      .addCase(followOrganizer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to follow/unfollow organizer';
      });

    // verifyOrganizer
    builder
      .addCase(verifyOrganizer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOrganizer.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          const index = state.organizers.findIndex(organizer => organizer.id === action.payload.data!.id);
          if (index !== -1) {
            state.organizers[index] = { ...state.organizers[index], ...action.payload.data! };
          }
          if (state.currentOrganizer?.id === action.payload.data!.id) {
            state.currentOrganizer = { ...state.currentOrganizer, ...action.payload.data! };
          }
          state._lastUpdated = Date.now();
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(verifyOrganizer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to verify organizer';
      });

    // searchOrganizers
    builder
      .addCase(searchOrganizers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchOrganizers.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          state.organizers = action.payload.data;
          state._lastUpdated = Date.now();
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(searchOrganizers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to search organizers';
      });
  },
});

export const {
  clearError,
  setCurrentOrganizer,
  addOrganizer,
  updateOrganizerInList,
  removeOrganizerFromList,
  clearCache,
} = organizersSlice.actions;

export default organizersSlice.reducer;
