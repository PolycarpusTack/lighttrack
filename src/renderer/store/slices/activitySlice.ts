import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Activity, ActivityFilter } from '@shared/types/activity';
import { IPCService } from '../../services/ipc';

interface ActivityState {
  current: Activity | null;
  todayActivities: Activity[];
  allActivities: Activity[];
  isLoading: boolean;
  error: string | null;
  filter: ActivityFilter;
  todayTotal: number;
}

const initialState: ActivityState = {
  current: null,
  todayActivities: [],
  allActivities: [],
  isLoading: false,
  error: null,
  filter: {},
  todayTotal: 0,
};

// Async thunks
export const startActivity = createAsyncThunk(
  'activity/start',
  async (data: Partial<Activity>) => {
    return await IPCService.startActivity(data);
  }
);

export const stopActivity = createAsyncThunk(
  'activity/stop',
  async (activityId: string) => {
    return await IPCService.stopActivity(activityId);
  }
);

export const pauseActivity = createAsyncThunk(
  'activity/pause',
  async (activityId: string) => {
    return await IPCService.pauseActivity(activityId);
  }
);

export const resumeActivity = createAsyncThunk(
  'activity/resume',
  async (activityId: string) => {
    return await IPCService.resumeActivity(activityId);
  }
);

export const fetchTodayActivities = createAsyncThunk(
  'activity/fetchToday',
  async () => {
    return await IPCService.getTodayActivities();
  }
);

export const fetchActivities = createAsyncThunk(
  'activity/fetchAll',
  async (filter: ActivityFilter) => {
    // Note: This would need to be implemented in IPCService - using legacy for now
    const { ipcRenderer } = await import('../../services/ipc');
    const response = await ipcRenderer.invoke('activity:getFiltered', filter);
    return response;
  }
);

export const addActivity = createAsyncThunk(
  'activity/add',
  async (data: Partial<Activity>) => {
    // Note: This would need to be implemented in IPCService - using legacy for now
    const { ipcRenderer } = await import('../../services/ipc');
    const response = await ipcRenderer.invoke('activity:add', data);
    return response;
  }
);

export const updateActivity = createAsyncThunk(
  'activity/update',
  async ({ id, updates }: { id: string; updates: Partial<Activity> }) => {
    return await IPCService.updateActivity(id, updates);
  }
);

export const deleteActivity = createAsyncThunk(
  'activity/delete',
  async (activityId: string) => {
    await IPCService.deleteActivity(activityId);
    return activityId;
  }
);

export const mergeActivities = createAsyncThunk(
  'activity/merge',
  async (activityIds: string[]) => {
    const response = await IPCService.mergeActivities(activityIds);
    return { mergedActivity: response, deletedIds: activityIds };
  }
);

export const splitActivity = createAsyncThunk(
  'activity/split',
  async ({ activityId, splitTime }: { activityId: string; splitTime: string }) => {
    const response = await IPCService.splitActivity(activityId, splitTime);
    return { originalId: activityId, newActivities: response };
  }
);

export const exportActivities = createAsyncThunk(
  'activity/export',
  async ({ activityIds, format }: { activityIds: string[]; format: 'csv' | 'json' | 'pdf' }) => {
    return await IPCService.exportActivities(activityIds, format);
  }
);

export const bulkDeleteActivities = createAsyncThunk(
  'activity/bulkDelete',
  async (activityIds: string[]) => {
    await IPCService.bulkDeleteActivities(activityIds);
    return activityIds;
  }
);

export const bulkUpdateActivities = createAsyncThunk(
  'activity/bulkUpdate',
  async ({ activityIds, updates }: { activityIds: string[]; updates: Partial<Activity> }) => {
    return await IPCService.bulkUpdateActivities(activityIds, updates);
  }
);

// Slice
const activitySlice = createSlice({
  name: 'activity',
  initialState,
  reducers: {
    updateCurrent: (state, action: PayloadAction<Activity>) => {
      state.current = action.payload;
    },
    setFilter: (state, action: PayloadAction<ActivityFilter>) => {
      state.filter = action.payload;
    },
    updateTodayTotal: (state, action: PayloadAction<number>) => {
      state.todayTotal = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Start activity
    builder
      .addCase(startActivity.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startActivity.fulfilled, (state, action) => {
        state.isLoading = false;
        state.current = action.payload;
      })
      .addCase(startActivity.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to start activity';
      });

    // Stop activity
    builder
      .addCase(stopActivity.fulfilled, (state, action) => {
        state.current = null;
        state.todayActivities.unshift(action.payload);
      });

    // Pause activity
    builder
      .addCase(pauseActivity.fulfilled, (state, action) => {
        if (state.current?.id === action.payload.id) {
          state.current = action.payload;
        }
      });

    // Resume activity
    builder
      .addCase(resumeActivity.fulfilled, (state, action) => {
        if (state.current?.id === action.payload.id) {
          state.current = action.payload;
        }
      });

    // Fetch today's activities
    builder
      .addCase(fetchTodayActivities.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTodayActivities.fulfilled, (state, action) => {
        state.isLoading = false;
        state.todayActivities = action.payload;
      })
      .addCase(fetchTodayActivities.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch activities';
      });

    // Fetch all activities
    builder
      .addCase(fetchActivities.fulfilled, (state, action) => {
        state.allActivities = action.payload;
      });

    // Add activity
    builder
      .addCase(addActivity.fulfilled, (state, action) => {
        state.todayActivities.unshift(action.payload);
        state.allActivities.unshift(action.payload);
      });

    // Update activity
    builder
      .addCase(updateActivity.fulfilled, (state, action) => {
        const updated = action.payload;
        // Update in today's activities
        const todayIndex = state.todayActivities.findIndex(a => a.id === updated.id);
        if (todayIndex !== -1) {
          state.todayActivities[todayIndex] = updated;
        }
        // Update in all activities
        const allIndex = state.allActivities.findIndex(a => a.id === updated.id);
        if (allIndex !== -1) {
          state.allActivities[allIndex] = updated;
        }
      });

    // Delete activity
    builder
      .addCase(deleteActivity.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.todayActivities = state.todayActivities.filter(a => a.id !== deletedId);
        state.allActivities = state.allActivities.filter(a => a.id !== deletedId);
      });

    // Merge activities
    builder
      .addCase(mergeActivities.fulfilled, (state, action) => {
        const { mergedActivity, deletedIds } = action.payload;
        // Remove original activities
        state.todayActivities = state.todayActivities.filter(a => !deletedIds.includes(a.id));
        state.allActivities = state.allActivities.filter(a => !deletedIds.includes(a.id));
        // Add merged activity
        state.todayActivities.unshift(mergedActivity);
        state.allActivities.unshift(mergedActivity);
      });

    // Split activity
    builder
      .addCase(splitActivity.fulfilled, (state, action) => {
        const { originalId, newActivities } = action.payload;
        // Remove original activity
        state.todayActivities = state.todayActivities.filter(a => a.id !== originalId);
        state.allActivities = state.allActivities.filter(a => a.id !== originalId);
        // Add new activities
        newActivities.forEach((activity: Activity) => {
          state.todayActivities.unshift(activity);
          state.allActivities.unshift(activity);
        });
      });

    // Bulk delete activities
    builder
      .addCase(bulkDeleteActivities.fulfilled, (state, action) => {
        const deletedIds = action.payload;
        state.todayActivities = state.todayActivities.filter(a => !deletedIds.includes(a.id));
        state.allActivities = state.allActivities.filter(a => !deletedIds.includes(a.id));
      });

    // Bulk update activities
    builder
      .addCase(bulkUpdateActivities.fulfilled, (state, action) => {
        const updatedActivities = action.payload;
        updatedActivities.forEach((updated: Activity) => {
          // Update in today's activities
          const todayIndex = state.todayActivities.findIndex(a => a.id === updated.id);
          if (todayIndex !== -1) {
            state.todayActivities[todayIndex] = updated;
          }
          // Update in all activities
          const allIndex = state.allActivities.findIndex(a => a.id === updated.id);
          if (allIndex !== -1) {
            state.allActivities[allIndex] = updated;
          }
        });
      });
  },
});

export const { updateCurrent, setFilter, updateTodayTotal, clearError } = activitySlice.actions;
export default activitySlice.reducer;