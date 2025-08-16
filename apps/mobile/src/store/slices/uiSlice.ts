import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  theme: 'light' | 'dark' | 'auto';
  isLoading: boolean;
  bottomSheetOpen: boolean;
  modalOpen: boolean;
  currentModal: string | null;
}

const initialState: UIState = {
  theme: 'dark',
  isLoading: false,
  bottomSheetOpen: false,
  modalOpen: false,
  currentModal: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.theme = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setBottomSheetOpen: (state, action: PayloadAction<boolean>) => {
      state.bottomSheetOpen = action.payload;
    },
    setModalOpen: (state, action: PayloadAction<boolean>) => {
      state.modalOpen = action.payload;
      if (!action.payload) {
        state.currentModal = null;
      }
    },
    setCurrentModal: (state, action: PayloadAction<string | null>) => {
      state.currentModal = action.payload;
      state.modalOpen = !!action.payload;
    },
  },
});

export const { 
  setTheme, 
  setLoading, 
  setBottomSheetOpen, 
  setModalOpen, 
  setCurrentModal 
} = uiSlice.actions;
export default uiSlice.reducer;


