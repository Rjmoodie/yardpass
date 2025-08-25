import { createSlice, createAsyncThunk, PayloadAction } from '@react-reduxjs/toolkit';
import { ApiService } from '@/services/api';

// Types
export interface Event {
  id: string;
  title: string;
  description: string;
  slug: string;
  venue: string;
  city: string;
  start_at: string;
  end_at: string;
  visibility: 'public' | 'private';
  status: 'draft' | 'published' | 'cancelled';
  category: string;
  cover_image_url: string;
  latitude?: number;
  longitude?: number;
  organizer_id: string;
  organizer?: {
    id: string;
    display_name: string;
    avatar_url: string;
    handle: string;
  };
  attendees_count?: number;
  posts_count?: number;
  created_at: string;
  updated_at: string;
}

export interface EventsState {
  events: Event[];
  currentEvent: Event | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    category?: string;
    search?: string;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

const initialState: EventsState = {
  events: [],
  currentEvent: null,
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
  filters: {},
};

// Async thunks
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async (params: {
    page?: number;
    category?: string;
    search?: string;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await ApiService.events.getEvents(params);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch events');
      }

      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to fetch events',
        code: 'EVENTS_FETCH_ERROR'
      });
    }
  }
);

export const fetchEventById = createAsyncThunk(
  'events/fetchEventById',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const response = await ApiService.events.getEventById(eventId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch event');
      }

      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to fetch event',
        code: 'EVENT_FETCH_ERROR'
      });
    }
  }
);

export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (eventData: Partial<Event>, { rejectWithValue }) => {
    try {
      const response = await ApiService.events.createEvent(eventData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create event');
      }

      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to create event',
        code: 'EVENT_CREATE_ERROR'
      });
    }
  }
);

export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async ({ eventId, updates }: { eventId: string; updates: Partial<Event> }, { rejectWithValue }) => {
    try {
      const response = await ApiService.events.updateEvent(eventId, updates);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update event');
      }

      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to update event',
        code: 'EVENT_UPDATE_ERROR'
      });
    }
  }
);

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
    setFilters: (state, action: PayloadAction<Partial<EventsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    resetPagination: (state) => {
      state.pagination = {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Events
      .addCase(fetchEvents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.events = action.payload.data;
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.count,
          totalPages: action.payload.totalPages,
          hasNext: action.payload.hasNext,
          hasPrev: action.payload.hasPrev,
        };
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch events';
      })
      
      // Fetch Event by ID
      .addCase(fetchEventById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEventById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentEvent = action.payload;
      })
      .addCase(fetchEventById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch event';
      })
      
      // Create Event
      .addCase(createEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.events.unshift(action.payload);
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to create event';
      })
      
      // Update Event
      .addCase(updateEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedEvent = action.payload;
        
        // Update in events list
        const eventIndex = state.events.findIndex(e => e.id === updatedEvent.id);
        if (eventIndex !== -1) {
          state.events[eventIndex] = updatedEvent;
        }
        
        // Update current event if it's the same
        if (state.currentEvent?.id === updatedEvent.id) {
          state.currentEvent = updatedEvent;
        }
      })
      .addCase(updateEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to update event';
      });
  },
});

export const {
  clearError,
  setCurrentEvent,
  setFilters,
  clearFilters,
  resetPagination,
} = eventsSlice.actions;

export default eventsSlice.reducer;
