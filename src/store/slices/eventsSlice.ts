import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase, TABLES, formatResponse } from '@/services/supabase';
import { Event, EventsState, EventFilters, EventCategory } from '@/types';

// Async thunks
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async (filters?: EventFilters) => {
    let query = supabase
      .from(TABLES.EVENTS)
      .select(`
        *,
        organizer:organizers(*),
        location:locations(*)
      `)
      .eq('isActive', true)
      .order('startDate', { ascending: true });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.isVerified !== undefined) {
      query = query.eq('isVerified', filters.isVerified);
    }

    if (filters?.dateRange) {
      query = query
        .gte('startDate', filters.dateRange[0])
        .lte('startDate', filters.dateRange[1]);
    }

    const { data, error } = await query;
    return formatResponse(data, error);
  }
);

export const fetchEventById = createAsyncThunk(
  'events/fetchEventById',
  async (eventId: string) => {
    const { data, error } = await supabase
      .from(TABLES.EVENTS)
      .select(`
        *,
        organizer:organizers(*),
        location:locations(*),
        posts:posts(*),
        tickets:tickets(*)
      `)
      .eq('id', eventId)
      .single();

    return formatResponse(data, error);
  }
);

export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (eventData: Partial<Event>) => {
    const { data, error } = await supabase
      .from(TABLES.EVENTS)
      .insert([eventData])
      .select()
      .single();

    return formatResponse(data, error);
  }
);

export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async ({ id, updates }: { id: string; updates: Partial<Event> }) => {
    const { data, error } = await supabase
      .from(TABLES.EVENTS)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return formatResponse(data, error);
  }
);

export const deleteEvent = createAsyncThunk(
  'events/deleteEvent',
  async (eventId: string) => {
    const { error } = await supabase
      .from(TABLES.EVENTS)
      .delete()
      .eq('id', eventId);

    return formatResponse(null, error);
  }
);

export const fetchEventsNearMe = createAsyncThunk(
  'events/fetchEventsNearMe',
  async ({ latitude, longitude, radius = 50 }: { latitude: number; longitude: number; radius?: number }) => {
    const { data, error } = await supabase
      .from(TABLES.EVENTS)
      .select(`
        *,
        organizer:organizers(*),
        location:locations(*)
      `)
      .eq('isActive', true)
      .gte('startDate', new Date().toISOString())
      .order('startDate', { ascending: true });

    if (error) {
      return formatResponse(null, error);
    }

    // Filter events by distance (this would ideally be done in the database)
    const eventsWithDistance = data?.map(event => ({
      ...event,
      distance: calculateDistance(
        latitude,
        longitude,
        event.location.latitude,
        event.location.longitude
      ),
    })).filter(event => event.distance <= radius);

    return formatResponse(eventsWithDistance, null);
  }
);

// Helper function to calculate distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Initial state
const initialState: EventsState = {
  events: [],
  currentEvent: null,
  featuredEvents: [],
  nearbyEvents: [],
  userEvents: [],
  filters: {},
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  },
};

// Slice
const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentEvent: (state, action: PayloadAction<Event | null>) => {
      state.currentEvent = action.payload;
    },
    setFilters: (state, action: PayloadAction<EventFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    addEvent: (state, action: PayloadAction<Event>) => {
      state.events.unshift(action.payload);
    },
    updateEventInList: (state, action: PayloadAction<Event>) => {
      const index = state.events.findIndex(event => event.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
    },
    removeEventFromList: (state, action: PayloadAction<string>) => {
      state.events = state.events.filter(event => event.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    // fetchEvents
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          state.events = action.payload.data;
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch events';
      });

    // fetchEventById
    builder
      .addCase(fetchEventById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEventById.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          state.currentEvent = action.payload.data;
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(fetchEventById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch event';
      });

    // createEvent
    builder
      .addCase(createEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          state.events.unshift(action.payload.data);
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create event';
      });

    // updateEvent
    builder
      .addCase(updateEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          const index = state.events.findIndex(event => event.id === action.payload.data!.id);
          if (index !== -1) {
            state.events[index] = action.payload.data!;
          }
          if (state.currentEvent?.id === action.payload.data!.id) {
            state.currentEvent = action.payload.data!;
          }
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(updateEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update event';
      });

    // deleteEvent
    builder
      .addCase(deleteEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete event';
      });

    // fetchEventsNearMe
    builder
      .addCase(fetchEventsNearMe.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEventsNearMe.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          state.events = action.payload.data;
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(fetchEventsNearMe.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch nearby events';
      });
  },
});

export const {
  clearError,
  setCurrentEvent,
  setFilters,
  clearFilters,
  addEvent,
  updateEventInList,
  removeEventFromList,
} = eventsSlice.actions;

export default eventsSlice.reducer;
