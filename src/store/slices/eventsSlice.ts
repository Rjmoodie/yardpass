import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@/services/supabase';
import { Event, EventFilters, EventCategory, isEvent, isOrganization } from '@/types';
import { TABLES } from '@/constants/database';

// Enhanced error handling with proper null checks
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async (filters: EventFilters = {}, { rejectWithValue }) => {
    try {
      // Enhanced authentication check with proper error handling
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        return rejectWithValue({ error: 'Authentication failed: ' + authError.message });
      }
      
      if (!user) {
        return rejectWithValue({ error: 'User not authenticated' });
      }

      // Simplified query to avoid complexity issues
      let query = supabase
        .from(TABLES.EVENTS)
        .select(`
          *,
          org:organizations(*)
        `)
        .eq('status', 'published');

      // Apply filters with null checks
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.isVerified !== undefined) {
        query = query.eq('is_verified', filters.isVerified);
      }
      if (filters.dateRange && filters.dateRange.length === 2) {
        query = query.gte('start_at', filters.dateRange[0])
                     .lte('end_at', filters.dateRange[1]);
      }
      if (filters.location) {
        query = query.ilike('city', `%${filters.location}%`);
      }

      const { data, error } = await query.order('start_at', { ascending: true });

      if (error) {
        return rejectWithValue({ error: error.message });
      }

      // Type-safe data processing
      const events = (data || []).map(event => {
        // Ensure event data is properly typed
        if (!isEvent(event)) {
          console.warn('Invalid event data received:', event);
          return null;
        }
        
        // Ensure organization data is properly typed
        if (event.org && !isOrganization(event.org)) {
          console.warn('Invalid organization data for event:', event.id, event.org);
          event.org = undefined; // Remove invalid org data
        }
        
        return event;
      }).filter(Boolean) as Event[];

      return { data: events };
    } catch (error) {
      console.error('Error fetching events:', error);
      return rejectWithValue({ error: 'Failed to fetch events' });
    }
  }
);

export const fetchEventById = createAsyncThunk(
  'events/fetchEventById',
  async (eventId: string, { rejectWithValue }) => {
    try {
      // Enhanced authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        return rejectWithValue({ error: 'Authentication failed: ' + authError.message });
      }
      
      if (!user) {
        return rejectWithValue({ error: 'User not authenticated' });
      }

      // Simplified query with proper error handling
      const { data, error } = await supabase
        .from(TABLES.EVENTS)
        .select(`
          *,
          org:organizations(*)
        `)
        .eq('id', eventId)
        .single();

      if (error) {
        return rejectWithValue({ error: error.message });
      }

      // Type-safe data validation
      if (!isEvent(data)) {
        return rejectWithValue({ error: 'Invalid event data received' });
      }

      // Validate organization data
      if (data.org && !isOrganization(data.org)) {
        console.warn('Invalid organization data for event:', eventId, data.org);
        data.org = undefined;
      }

      return { data };
    } catch (error) {
      console.error('Error fetching event by ID:', error);
      return rejectWithValue({ error: 'Failed to fetch event' });
    }
  }
);

export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (eventData: Partial<Event>, { rejectWithValue }) => {
    try {
      // Enhanced authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        return rejectWithValue({ error: 'Authentication failed: ' + authError.message });
      }
      
      if (!user) {
        return rejectWithValue({ error: 'User not authenticated' });
      }

      // Add user ID to event data
      const eventWithUser = {
        ...eventData,
        organizer_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.EVENTS)
        .insert([eventWithUser])
        .select(`
          *,
          org:organizations(*)
        `)
        .single();

      if (error) {
        return rejectWithValue({ error: error.message });
      }

      // Type-safe data validation
      if (!isEvent(data)) {
        return rejectWithValue({ error: 'Invalid event data created' });
      }

      return { data };
    } catch (error) {
      console.error('Error creating event:', error);
      return rejectWithValue({ error: 'Failed to create event' });
    }
  }
);

export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async ({ id, updates }: { id: string; updates: Partial<Event> }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.EVENTS)
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          org:organizations(*),
          tickets:ticket_tiers(*)
        `)
        .single();

      if (error) {
        return rejectWithValue({ error: error.message });
      }

      return { data };
    } catch (error) {
      return rejectWithValue({ error: 'Failed to update event' });
    }
  }
);

export const deleteEvent = createAsyncThunk(
  'events/deleteEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase
        .from(TABLES.EVENTS)
        .delete()
        .eq('id', eventId);

      if (error) {
        return rejectWithValue({ error: error.message });
      }

      return { id: eventId };
    } catch (error) {
      return rejectWithValue({ error: 'Failed to delete event' });
    }
  }
);

export const searchEvents = createAsyncThunk(
  'events/searchEvents',
  async (searchTerm: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.EVENTS)
        .select(`
          *,
          org:organizations(*),
          tickets:ticket_tiers(*)
        `)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,venue.ilike.%${searchTerm}%`)
        .eq('status', 'published')
        .order('start_at', { ascending: true });

      if (error) {
        return rejectWithValue({ error: error.message });
      }

      return { data: data || [] };
    } catch (error) {
      return rejectWithValue({ error: 'Failed to search events' });
    }
  }
);

interface EventsState {
  events: Event[];
  currentEvent: Event | null;
  loading: boolean;
  error: string | null;
  filters: EventFilters;
}

const initialState: EventsState = {
  events: [],
  currentEvent: null,
  loading: false,
  error: null,
  filters: {
    category: undefined,
    isVerified: undefined,
    dateRange: undefined,
    location: undefined
  }
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<EventFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        category: undefined,
        isVerified: undefined,
        dateRange: undefined,
        location: undefined
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.data) {
          state.events = action.payload.data;
        }
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch events';
      })
      .addCase(fetchEventById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEventById.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.data) {
          state.currentEvent = action.payload.data;
        }
      })
      .addCase(fetchEventById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch event';
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        if (action.payload.data) {
          state.events.unshift(action.payload.data);
        }
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        if (action.payload.data) {
          const index = state.events.findIndex(event => event.id === action.payload.data!.id);
          if (index !== -1) {
            state.events[index] = action.payload.data!;
          }
          if (state.currentEvent?.id === action.payload.data!.id) {
            state.currentEvent = action.payload.data!;
          }
        }
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.events = state.events.filter(event => event.id !== action.payload.id);
        if (state.currentEvent?.id === action.payload.id) {
          state.currentEvent = null;
        }
      })
      .addCase(searchEvents.fulfilled, (state, action) => {
        if (action.payload.data) {
          state.events = action.payload.data;
        }
      });
  }
});

export const { clearError, setFilters, clearFilters } = eventsSlice.actions;
export default eventsSlice.reducer;
