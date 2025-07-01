import { configureStore } from '@reduxjs/toolkit';
import activityReducer from './slices/activitySlice';
import projectReducer from './slices/projectSlice';
import goalReducer from './slices/goalsSlice';
import settingsReducer from './slices/settingsSlice';
import uiReducer from './slices/uiSlice';
import appReducer from './slices/appSlice';
import analyticsReducer from './slices/analyticsSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    activity: activityReducer,
    projects: projectReducer,
    goals: goalReducer,
    settings: settingsReducer,
    ui: uiReducer,
    analytics: analyticsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['activity/updateCurrent'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp', 'payload.startTime', 'payload.endTime'],
        // Ignore these paths in the state
        ignoredPaths: ['activities.current.startTime'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;