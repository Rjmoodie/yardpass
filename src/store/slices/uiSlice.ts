import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState, ModalState, ToastState, NavigationState } from '@/types';

const initialState: UIState = {
  theme: 'light',
  isLoading: false,
  modal: null,
  toast: null,
  navigation: {
    currentRoute: '',
    previousRoute: '',
    params: {},
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setModal: (state, action: PayloadAction<ModalState | null>) => {
      state.modal = action.payload;
    },
    setToast: (state, action: PayloadAction<ToastState | null>) => {
      state.toast = action.payload;
    },
    setNavigation: (state, action: PayloadAction<NavigationState>) => {
      state.navigation = action.payload;
    },
  },
});

export const { setTheme, setLoading, setModal, setToast, setNavigation } = uiSlice.actions;
export default uiSlice.reducer;
