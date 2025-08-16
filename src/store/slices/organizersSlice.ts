import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase, TABLES, formatResponse } from '@/services/supabase';
import { Organizer, OrganizersState } from '@/types';

// Async thunks
export const fetchOrganizers = createAsyncThunk(
  'organizers/fetchOrganizers',
  async () => {
    const { data, error } = await supabase
      .from(TABLES.ORGANIZERS)
      .select(`
        *,
        user:users(*),
        events:events(*)
      `)
      .order('createdAt', { ascending: false });

    return formatResponse(data, error);
  }
);

export const fetchOrganizerById = createAsyncThunk(
  'organizers/fetchOrganizerById',
  async (organizerId: string) => {
    const { data, error } = await supabase
      .from(TABLES.ORGANIZERS)
      .select(`
        *,
        user:users(*),
        events:events(*),
        followers:organizer_follows(*)
      `)
      .eq('id', organizerId)
      .single();

    return formatResponse(data, error);
  }
);

export const createOrganizer = createAsyncThunk(
  'organizers/createOrganizer',
  async (organizerData: Partial<Organizer>) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.ORGANIZERS)
      .insert([{ ...organizerData, userId }])
      .select(`
        *,
        user:users(*),
        events:events(*)
      `)
      .single();

    return formatResponse(data, error);
  }
);

export const updateOrganizer = createAsyncThunk(
  'organizers/updateOrganizer',
  async ({ id, updates }: { id: string; updates: Partial<Organizer> }) => {
    const { data, error } = await supabase
      .from(TABLES.ORGANIZERS)
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:users(*),
        events:events(*)
      `)
      .single();

    return formatResponse(data, error);
  }
);

export const followOrganizer = createAsyncThunk(
  'organizers/followOrganizer',
  async (organizerId: string) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('organizer_follows')
      .select()
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
  }
);

export const verifyOrganizer = createAsyncThunk(
  'organizers/verifyOrganizer',
  async (organizerId: string) => {
    const { data, error } = await supabase
      .from(TABLES.ORGANIZERS)
      .update({
        isVerified: true,
        verificationDate: new Date().toISOString(),
      })
      .eq('id', organizerId)
      .select(`
        *,
        user:users(*),
        events:events(*)
      `)
      .single();

    return formatResponse(data, error);
  }
);

export const fetchOrganizerEvents = createAsyncThunk(
  'organizers/fetchOrganizerEvents',
  async (organizerId: string) => {
    const { data, error } = await supabase
      .from(TABLES.EVENTS)
      .select(`
        *,
        organizer:organizers(*),
        location:locations(*)
      `)
      .eq('organizerId', organizerId)
      .order('startDate', { ascending: true });

    return formatResponse(data, error);
  }
);

export const fetchOrganizerFollowers = createAsyncThunk(
  'organizers/fetchOrganizerFollowers',
  async (organizerId: string) => {
    const { data, error } = await supabase
      .from('organizer_follows')
      .select(`
        *,
        follower:users(*)
      `)
      .eq('organizerId', organizerId);

    return formatResponse(data, error);
  }
);

export const searchOrganizers = createAsyncThunk(
  'organizers/searchOrganizers',
  async (searchTerm: string) => {
    const { data, error } = await supabase
      .from(TABLES.ORGANIZERS)
      .select(`
        *,
        user:users(*),
        events:events(*)
      `)
      .or(`companyName.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('isVerified', { ascending: false })
      .order('createdAt', { ascending: false });

    return formatResponse(data, error);
  }
);

// Initial state
const initialState: OrganizersState = {
  organizers: [],
  currentOrganizer: null,
  followedOrganizers: [],
  isLoading: false,
  error: null,
};

// Slice
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
      state.organizers.unshift(action.payload);
    },
    updateOrganizerInList: (state, action: PayloadAction<Organizer>) => {
      const index = state.organizers.findIndex(organizer => organizer.id === action.payload.id);
      if (index !== -1) {
        state.organizers[index] = action.payload;
      }
    },
    removeOrganizerFromList: (state, action: PayloadAction<string>) => {
      state.organizers = state.organizers.filter(organizer => organizer.id !== action.payload);
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
      .addCase(followOrganizer.fulfilled, (state, action) => {
        const { organizerId, followed } = action.payload;
        const organizerIndex = state.organizers.findIndex(organizer => organizer.id === organizerId);
        if (organizerIndex !== -1) {
          // Update follower count (this would be calculated from the database)
          // For now, we'll just mark the follow state
        }
        
        if (state.currentOrganizer?.id === organizerId) {
          // Update current organizer's follow state
          // This would be handled by refetching the organizer data
        }
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
            state.organizers[index] = action.payload.data!;
          }
          if (state.currentOrganizer?.id === action.payload.data!.id) {
            state.currentOrganizer = action.payload.data!;
          }
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
} = organizersSlice.actions;

export default organizersSlice.reducer;
