import { createSlice, PayloadAction } from '@reduxjs/toolkit';
// import { Event } from '@yardpass/types';

// Temporary type until packages are built
interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image: string;
  category: string;
  price: string;
  attendees: number;
  maxAttendees: number;
  isAttending: boolean;
  isSaved: boolean;
  organizer: {
    name: string;
    avatar: string;
    isVerified: boolean;
  };
}

interface EventsState {
  selectedEvent: Event | null;
  recentEvents: Event[];
}

const initialState: EventsState = {
  selectedEvent: null,
  recentEvents: [],
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setSelectedEvent: (state, action: PayloadAction<Event | null>) => {
      state.selectedEvent = action.payload;
    },
    setRecentEvents: (state, action: PayloadAction<Event[]>) => {
      state.recentEvents = action.payload;
    },
    addRecentEvent: (state, action: PayloadAction<Event>) => {
      // Add to beginning and limit to 10 events
      state.recentEvents = [action.payload, ...state.recentEvents.slice(0, 9)];
    },
  },
});

export const { setSelectedEvent, setRecentEvents, addRecentEvent } = eventsSlice.actions;
export default eventsSlice.reducer;

