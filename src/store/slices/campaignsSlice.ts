import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase, TABLES, formatResponse } from '@/services/supabase';
import { Campaign, CampaignsState, CampaignObjective, CampaignStatus } from '@/types';

// Async thunks
export const fetchCampaigns = createAsyncThunk(
  'campaigns/fetchCampaigns',
  async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.CAMPAIGNS)
      .select(`
        *,
        event:events(*),
        organizer:organizers(*),
        posts:posts(*)
      `)
      .eq('organizerId', userId)
      .order('createdAt', { ascending: false });

    return formatResponse(data, error);
  }
);

export const fetchCampaignById = createAsyncThunk(
  'campaigns/fetchCampaignById',
  async (campaignId: string) => {
    const { data, error } = await supabase
      .from(TABLES.CAMPAIGNS)
      .select(`
        *,
        event:events(*),
        organizer:organizers(*),
        posts:posts(*)
      `)
      .eq('id', campaignId)
      .single();

    return formatResponse(data, error);
  }
);

export const createCampaign = createAsyncThunk(
  'campaigns/createCampaign',
  async (campaignData: Partial<Campaign>) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Get organizer ID for the current user
    const { data: organizer } = await supabase
      .from(TABLES.ORGANIZERS)
      .select('id')
      .eq('userId', userId)
      .single();

    if (!organizer) throw new Error('Organizer profile not found');

    const { data, error } = await supabase
      .from(TABLES.CAMPAIGNS)
      .insert([{ ...campaignData, organizerId: organizer.id }])
      .select(`
        *,
        event:events(*),
        organizer:organizers(*),
        posts:posts(*)
      `)
      .single();

    return formatResponse(data, error);
  }
);

export const updateCampaign = createAsyncThunk(
  'campaigns/updateCampaign',
  async ({ id, updates }: { id: string; updates: Partial<Campaign> }) => {
    const { data, error } = await supabase
      .from(TABLES.CAMPAIGNS)
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        event:events(*),
        organizer:organizers(*),
        posts:posts(*)
      `)
      .single();

    return formatResponse(data, error);
  }
);

export const deleteCampaign = createAsyncThunk(
  'campaigns/deleteCampaign',
  async (campaignId: string) => {
    const { error } = await supabase
      .from(TABLES.CAMPAIGNS)
      .delete()
      .eq('id', campaignId);

    return formatResponse(null, error);
  }
);

export const activateCampaign = createAsyncThunk(
  'campaigns/activateCampaign',
  async (campaignId: string) => {
    const { data, error } = await supabase
      .from(TABLES.CAMPAIGNS)
      .update({
        status: CampaignStatus.ACTIVE,
      })
      .eq('id', campaignId)
      .select(`
        *,
        event:events(*),
        organizer:organizers(*),
        posts:posts(*)
      `)
      .single();

    return formatResponse(data, error);
  }
);

export const pauseCampaign = createAsyncThunk(
  'campaigns/pauseCampaign',
  async (campaignId: string) => {
    const { data, error } = await supabase
      .from(TABLES.CAMPAIGNS)
      .update({
        status: CampaignStatus.PAUSED,
      })
      .eq('id', campaignId)
      .select(`
        *,
        event:events(*),
        organizer:organizers(*),
        posts:posts(*)
      `)
      .single();

    return formatResponse(data, error);
  }
);

export const addPostToCampaign = createAsyncThunk(
  'campaigns/addPostToCampaign',
  async ({ campaignId, postId }: { campaignId: string; postId: string }) => {
    const { data, error } = await supabase
      .from(TABLES.CAMPAIGN_POSTS)
      .insert([{ campaignId, postId }])
      .select()
      .single();

    return formatResponse(data, error);
  }
);

export const removePostFromCampaign = createAsyncThunk(
  'campaigns/removePostFromCampaign',
  async ({ campaignId, postId }: { campaignId: string; postId: string }) => {
    const { error } = await supabase
      .from(TABLES.CAMPAIGN_POSTS)
      .delete()
      .eq('campaignId', campaignId)
      .eq('postId', postId);

    return formatResponse(null, error);
  }
);

export const updateCampaignMetrics = createAsyncThunk(
  'campaigns/updateCampaignMetrics',
  async ({ campaignId, metrics }: { campaignId: string; metrics: any }) => {
    const { data, error } = await supabase
      .from(TABLES.CAMPAIGNS)
      .update({
        metrics: metrics,
      })
      .eq('id', campaignId)
      .select(`
        *,
        event:events(*),
        organizer:organizers(*),
        posts:posts(*)
      `)
      .single();

    return formatResponse(data, error);
  }
);

export const fetchCampaignAnalytics = createAsyncThunk(
  'campaigns/fetchCampaignAnalytics',
  async (campaignId: string) => {
    // This would typically fetch analytics from a separate analytics service
    // For now, we'll return mock data
    const mockAnalytics = {
      impressions: Math.floor(Math.random() * 10000),
      clicks: Math.floor(Math.random() * 1000),
      conversions: Math.floor(Math.random() * 100),
      spend: Math.floor(Math.random() * 5000),
      roas: Math.random() * 5,
      ctr: Math.random() * 10,
      cpc: Math.random() * 2,
    };

    return formatResponse(mockAnalytics, null);
  }
);

// Initial state
const initialState: CampaignsState = {
  campaigns: [],
  currentCampaign: null,
  isLoading: false,
  error: null,
};

// Slice
const campaignsSlice = createSlice({
  name: 'campaigns',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentCampaign: (state, action: PayloadAction<Campaign | null>) => {
      state.currentCampaign = action.payload;
    },
    addCampaign: (state, action: PayloadAction<Campaign>) => {
      state.campaigns.unshift(action.payload);
    },
    updateCampaignInList: (state, action: PayloadAction<Campaign>) => {
      const index = state.campaigns.findIndex(campaign => campaign.id === action.payload.id);
      if (index !== -1) {
        state.campaigns[index] = action.payload;
      }
    },
    removeCampaignFromList: (state, action: PayloadAction<string>) => {
      state.campaigns = state.campaigns.filter(campaign => campaign.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    // fetchCampaigns
    builder
      .addCase(fetchCampaigns.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCampaigns.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          state.campaigns = action.payload.data;
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch campaigns';
      });

    // fetchCampaignById
    builder
      .addCase(fetchCampaignById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCampaignById.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          state.currentCampaign = action.payload.data;
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(fetchCampaignById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch campaign';
      });

    // createCampaign
    builder
      .addCase(createCampaign.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCampaign.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          state.campaigns.unshift(action.payload.data);
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(createCampaign.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create campaign';
      });

    // updateCampaign
    builder
      .addCase(updateCampaign.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCampaign.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          const index = state.campaigns.findIndex(campaign => campaign.id === action.payload.data!.id);
          if (index !== -1) {
            state.campaigns[index] = action.payload.data!;
          }
          if (state.currentCampaign?.id === action.payload.data!.id) {
            state.currentCampaign = action.payload.data!;
          }
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(updateCampaign.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update campaign';
      });

    // deleteCampaign
    builder
      .addCase(deleteCampaign.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCampaign.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(deleteCampaign.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete campaign';
      });

    // activateCampaign
    builder
      .addCase(activateCampaign.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(activateCampaign.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          const index = state.campaigns.findIndex(campaign => campaign.id === action.payload.data!.id);
          if (index !== -1) {
            state.campaigns[index] = action.payload.data!;
          }
          if (state.currentCampaign?.id === action.payload.data!.id) {
            state.currentCampaign = action.payload.data!;
          }
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(activateCampaign.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to activate campaign';
      });

    // pauseCampaign
    builder
      .addCase(pauseCampaign.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(pauseCampaign.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          const index = state.campaigns.findIndex(campaign => campaign.id === action.payload.data!.id);
          if (index !== -1) {
            state.campaigns[index] = action.payload.data!;
          }
          if (state.currentCampaign?.id === action.payload.data!.id) {
            state.currentCampaign = action.payload.data!;
          }
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(pauseCampaign.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to pause campaign';
      });

    // updateCampaignMetrics
    builder
      .addCase(updateCampaignMetrics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCampaignMetrics.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          const index = state.campaigns.findIndex(campaign => campaign.id === action.payload.data!.id);
          if (index !== -1) {
            state.campaigns[index] = action.payload.data!;
          }
          if (state.currentCampaign?.id === action.payload.data!.id) {
            state.currentCampaign = action.payload.data!;
          }
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(updateCampaignMetrics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update campaign metrics';
      });
  },
});

export const {
  clearError,
  setCurrentCampaign,
  addCampaign,
  updateCampaignInList,
  removeCampaignFromList,
} = campaignsSlice.actions;

export default campaignsSlice.reducer;
