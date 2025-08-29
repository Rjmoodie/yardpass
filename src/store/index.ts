import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './slices/authSlice';
import feedReducer from './slices/feedSlice';
import eventsReducer from './slices/eventsSlice';
import ticketsReducer from './slices/ticketsSlice';
import uiReducer from './slices/uiSlice';
import postsReducer from './slices/postsSlice';
import notificationsReducer from './slices/notificationsSlice';
import passesReducer from './slices/passesSlice';
import organizersReducer from './slices/organizersSlice';
import campaignsReducer from './slices/campaignsSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'ui'], // Only persist auth and UI state
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    feed: feedReducer,
    events: eventsReducer,
    tickets: ticketsReducer,
    ui: uiReducer,
    posts: postsReducer,
    notifications: notificationsReducer,
    passes: passesReducer,
    organizers: organizersReducer,
    campaigns: campaignsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


