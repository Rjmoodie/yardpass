import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import authReducer from './slices/authSlice';
import eventsReducer from './slices/eventsSlice';
import postsReducer from './slices/postsSlice';
import ticketsReducer from './slices/ticketsSlice';
import organizersReducer from './slices/organizersSlice';
import campaignsReducer from './slices/campaignsSlice';
import notificationsReducer from './slices/notificationsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    events: eventsReducer,
    posts: postsReducer,
    tickets: ticketsReducer,
    organizers: organizersReducer,
    campaigns: campaignsReducer,
    notifications: notificationsReducer,
    ui: uiReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }).concat(api.middleware),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
