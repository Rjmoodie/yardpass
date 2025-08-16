import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@/services/supabase';
import { YardPass, PassesState, CreatePassForm, UpdatePassForm, PassFilters } from '@/types';

// Async thunks
export const fetchPasses = createAsyncThunk(
  'passes/fetchPasses',
  async (filters?: PassFilters) => {
    let query = supabase
      .from('yard_passes')
      .select(`
        *,
        location:locations(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.location) {
      query = query.eq('location_id', filters.location);
    }

    if (filters?.dateRange) {
      query = query
        .gte('start_date', filters.dateRange.start)
        .lte('end_date', filters.dateRange.end);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }
);

export const createPass = createAsyncThunk(
  'passes/createPass',
  async (passData: CreatePassForm) => {
    const { data, error } = await supabase
      .from('yard_passes')
      .insert([passData])
      .select(`
        *,
        location:locations(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }
);

export const updatePass = createAsyncThunk(
  'passes/updatePass',
  async ({ id, ...passData }: UpdatePassForm) => {
    const { data, error } = await supabase
      .from('yard_passes')
      .update(passData)
      .eq('id', id)
      .select(`
        *,
        location:locations(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }
);

export const deletePass = createAsyncThunk(
  'passes/deletePass',
  async (passId: string) => {
    const { error } = await supabase
      .from('yard_passes')
      .delete()
      .eq('id', passId);

    if (error) throw error;
    return passId;
  }
);

export const fetchPassById = createAsyncThunk(
  'passes/fetchPassById',
  async (passId: string) => {
    const { data, error } = await supabase
      .from('yard_passes')
      .select(`
        *,
        location:locations(*)
      `)
      .eq('id', passId)
      .single();

    if (error) throw error;
    return data;
  }
);

const initialState: PassesState = {
  passes: [],
  currentPass: null,
  isLoading: false,
  error: null,
  filters: {},
};

const passesSlice = createSlice({
  name: 'passes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPass: (state, action: PayloadAction<YardPass | null>) => {
      state.currentPass = action.payload;
    },
    setFilters: (state, action: PayloadAction<PassFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    // Fetch Passes
    builder
      .addCase(fetchPasses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPasses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.passes = action.payload;
      })
      .addCase(fetchPasses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch passes';
      });

    // Create Pass
    builder
      .addCase(createPass.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPass.fulfilled, (state, action) => {
        state.isLoading = false;
        state.passes.unshift(action.payload);
      })
      .addCase(createPass.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create pass';
      });

    // Update Pass
    builder
      .addCase(updatePass.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePass.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.passes.findIndex(pass => pass.id === action.payload.id);
        if (index !== -1) {
          state.passes[index] = action.payload;
        }
        if (state.currentPass?.id === action.payload.id) {
          state.currentPass = action.payload;
        }
      })
      .addCase(updatePass.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update pass';
      });

    // Delete Pass
    builder
      .addCase(deletePass.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deletePass.fulfilled, (state, action) => {
        state.isLoading = false;
        state.passes = state.passes.filter(pass => pass.id !== action.payload);
        if (state.currentPass?.id === action.payload) {
          state.currentPass = null;
        }
      })
      .addCase(deletePass.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete pass';
      });

    // Fetch Pass by ID
    builder
      .addCase(fetchPassById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPassById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPass = action.payload;
      })
      .addCase(fetchPassById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch pass';
      });
  },
});

export const { clearError, setCurrentPass, setFilters, clearFilters } = passesSlice.actions;
export default passesSlice.reducer;
