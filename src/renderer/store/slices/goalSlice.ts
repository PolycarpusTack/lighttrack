import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Goal, GoalProgress } from '@shared/types/goal';
import { ipcRenderer } from '../../services/ipc';

interface GoalState {
  goals: Goal[];
  activeGoals: Goal[];
  progress: GoalProgress[];
  isLoading: boolean;
  error: string | null;
}

const initialState: GoalState = {
  goals: [],
  activeGoals: [],
  progress: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchGoals = createAsyncThunk(
  'goals/fetchAll',
  async () => {
    const response = await ipcRenderer.invoke('goal:getAll');
    return response;
  }
);

export const createGoal = createAsyncThunk(
  'goals/create',
  async (goalData: Partial<Goal>) => {
    const response = await ipcRenderer.invoke('goal:create', goalData);
    return response;
  }
);

export const updateGoal = createAsyncThunk(
  'goals/update',
  async (goal: Goal) => {
    const response = await ipcRenderer.invoke('goal:update', goal);
    return response;
  }
);

// Slice
const goalSlice = createSlice({
  name: 'goals',
  initialState,
  reducers: {
    updateProgress: (state, action: PayloadAction<GoalProgress>) => {
      const index = state.progress.findIndex(p => p.goalId === action.payload.goalId);
      if (index !== -1) {
        state.progress[index] = action.payload;
      } else {
        state.progress.push(action.payload);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch goals
    builder
      .addCase(fetchGoals.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.isLoading = false;
        state.goals = action.payload;
        state.activeGoals = action.payload.filter((g: Goal) => g.isActive);
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch goals';
      });

    // Create goal
    builder
      .addCase(createGoal.fulfilled, (state, action) => {
        state.goals.push(action.payload);
        if (action.payload.isActive) {
          state.activeGoals.push(action.payload);
        }
      });

    // Update goal
    builder
      .addCase(updateGoal.fulfilled, (state, action) => {
        const index = state.goals.findIndex(g => g.id === action.payload.id);
        if (index !== -1) {
          state.goals[index] = action.payload;
        }
        state.activeGoals = state.goals.filter(g => g.isActive);
      });
  },
});

export const { updateProgress, clearError } = goalSlice.actions;
export default goalSlice.reducer;