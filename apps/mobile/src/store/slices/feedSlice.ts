import { createSlice, PayloadAction } from '@reduxjs/toolkit';
// import { FeedFilter } from '@yardpass/types';

// Temporary type until packages are built
interface FeedFilter {
  type: 'all' | 'following' | 'trending' | 'nearby';
  cursor?: string;
}

interface FeedState {
  currentFilter: FeedFilter['type'];
  filters: FeedFilter;
}

const initialState: FeedState = {
  currentFilter: 'for_you',
  filters: {
    type: 'for_you',
    cursor: undefined,
    limit: 20,
  },
};

const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<FeedFilter['type']>) => {
      state.currentFilter = action.payload;
      state.filters.type = action.payload;
      state.filters.cursor = undefined; // Reset cursor when changing filter
    },
    setFilters: (state, action: PayloadAction<Partial<FeedFilter>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setCursor: (state, action: PayloadAction<string | undefined>) => {
      state.filters.cursor = action.payload;
    },
  },
});

export const { setFilter, setFilters, setCursor } = feedSlice.actions;
export default feedSlice.reducer;

