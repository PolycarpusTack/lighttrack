import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Goal, GoalProgress, Achievement, GoalStats, GoalInsight } from '@shared/types/goal';
import { IPCService } from '../../services/ipc';

interface GoalsState {
  goals: Goal[];
  achievements: Achievement[];
  progress: { [goalId: string]: GoalProgress };
  insights: GoalInsight[];
  stats: GoalStats | null;
  todaysGoals: Goal[];
  weeklyGoals: Goal[];
  currentGoal: Goal | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: GoalsState = {
  goals: [],
  achievements: [],
  progress: {},
  insights: [],
  stats: null,
  todaysGoals: [],
  weeklyGoals: [],
  currentGoal: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchGoals = createAsyncThunk(
  'goals/fetchAll',
  async () => {
    return await IPCService.getGoals();
  }
);

export const createGoal = createAsyncThunk(
  'goals/create',
  async (goalData: any) => {
    return await IPCService.createGoal(goalData);
  }
);

export const updateGoal = createAsyncThunk(
  'goals/update',
  async ({ goalId, updates }: { goalId: string; updates: Partial<Goal> }) => {
    return await IPCService.updateGoal(goalId, updates);
  }
);

export const deleteGoal = createAsyncThunk(
  'goals/delete',
  async (goalId: string) => {
    await IPCService.deleteGoal(goalId);
    return goalId;
  }
);

export const pauseGoal = createAsyncThunk(
  'goals/pause',
  async (goalId: string) => {
    return await IPCService.pauseGoal(goalId);
  }
);

export const resumeGoal = createAsyncThunk(
  'goals/resume',
  async (goalId: string) => {
    return await IPCService.resumeGoal(goalId);
  }
);

export const fetchGoalProgress = createAsyncThunk(
  'goals/fetchProgress',
  async () => {
    return await IPCService.getGoalProgress();
  }
);

export const updateGoalProgress = createAsyncThunk(
  'goals/updateProgress',
  async ({ goalId, progressData }: { goalId: string; progressData: any }) => {
    return await IPCService.updateGoalProgress(goalId, progressData);
  }
);

export const fetchAchievements = createAsyncThunk(
  'goals/fetchAchievements',
  async () => {
    return await IPCService.getAchievements();
  }
);

export const fetchGoalInsights = createAsyncThunk(
  'goals/fetchInsights',
  async () => {
    return await IPCService.getGoalInsights();
  }
);

export const fetchGoalStats = createAsyncThunk(
  'goals/fetchStats',
  async () => {
    return await IPCService.getGoalStats();
  }
);

export const fetchTodaysGoals = createAsyncThunk(
  'goals/fetchTodaysGoals',
  async () => {
    return await IPCService.getTodaysGoals();
  }
);

export const fetchWeeklyGoals = createAsyncThunk(
  'goals/fetchWeeklyGoals',
  async () => {
    return await IPCService.getWeeklyGoals();
  }
);

export const checkGoalAchievements = createAsyncThunk(
  'goals/checkAchievements',
  async (goalId: string) => {
    return await IPCService.checkGoalAchievements(goalId);
  }
);

export const markAchievementNotified = createAsyncThunk(
  'goals/markAchievementNotified',
  async (achievementId: string) => {
    return await IPCService.markAchievementNotified(achievementId);
  }
);

// Slice
const goalsSlice = createSlice({
  name: 'goals',
  initialState,
  reducers: {
    setCurrentGoal: (state, action: PayloadAction<Goal | null>) => {
      state.currentGoal = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateGoalProgressLocal: (state, action: PayloadAction<{ goalId: string; progress: GoalProgress }>) => {
      state.progress[action.payload.goalId] = action.payload.progress;
    },
    addAchievement: (state, action: PayloadAction<Achievement>) => {
      state.achievements.unshift(action.payload);
    },
    removeExpiredInsights: (state) => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      state.insights = state.insights.filter(insight => 
        new Date(insight.generatedAt) > oneDayAgo
      );
    },
    markGoalCompleted: (state, action: PayloadAction<string>) => {
      const goal = state.goals.find(g => g.id === action.payload);
      if (goal) {
        goal.isActive = false;
        // Note: isCompleted is now a method in the entity
      }
    },
    resetGoalProgress: (state, action: PayloadAction<string>) => {
      const goalId = action.payload;
      if (state.progress[goalId]) {
        state.progress[goalId] = {
          ...state.progress[goalId],
          current: 0,
          percentage: 0,
          streak: 0,
          dailyProgress: [],
          lastUpdated: new Date()
        };
      }
    }
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
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch goals';
      });

    // Create goal
    builder
      .addCase(createGoal.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createGoal.fulfilled, (state, action) => {
        state.isLoading = false;
        state.goals.unshift(action.payload);
      })
      .addCase(createGoal.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create goal';
      });

    // Update goal
    builder
      .addCase(updateGoal.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateGoal.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.goals.findIndex(goal => goal.id === action.payload.id);
        if (index !== -1) {
          state.goals[index] = action.payload;
        }
        if (state.currentGoal?.id === action.payload.id) {
          state.currentGoal = action.payload;
        }
      })
      .addCase(updateGoal.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update goal';
      });

    // Delete goal
    builder
      .addCase(deleteGoal.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteGoal.fulfilled, (state, action) => {
        state.isLoading = false;
        state.goals = state.goals.filter(goal => goal.id !== action.payload);
        if (state.currentGoal?.id === action.payload) {
          state.currentGoal = null;
        }
        // Remove related progress and achievements
        delete state.progress[action.payload];
        state.achievements = state.achievements.filter(a => a.goalId !== action.payload);
      })
      .addCase(deleteGoal.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete goal';
      });

    // Pause goal
    builder
      .addCase(pauseGoal.fulfilled, (state, action) => {
        const index = state.goals.findIndex(goal => goal.id === action.payload.id);
        if (index !== -1) {
          state.goals[index] = action.payload;
        }
      });

    // Resume goal
    builder
      .addCase(resumeGoal.fulfilled, (state, action) => {
        const index = state.goals.findIndex(goal => goal.id === action.payload.id);
        if (index !== -1) {
          state.goals[index] = action.payload;
        }
      });

    // Fetch goal progress
    builder
      .addCase(fetchGoalProgress.fulfilled, (state, action) => {
        action.payload.forEach((progress: GoalProgress) => {
          state.progress[progress.goalId] = progress;
        });
      });

    // Update goal progress
    builder
      .addCase(updateGoalProgress.fulfilled, (state, action) => {
        state.progress[action.payload.goalId] = action.payload;
      });

    // Fetch achievements
    builder
      .addCase(fetchAchievements.fulfilled, (state, action) => {
        state.achievements = action.payload;
      });

    // Fetch insights
    builder
      .addCase(fetchGoalInsights.fulfilled, (state, action) => {
        state.insights = action.payload;
      });

    // Fetch stats
    builder
      .addCase(fetchGoalStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });

    // Fetch today's goals
    builder
      .addCase(fetchTodaysGoals.fulfilled, (state, action) => {
        state.todaysGoals = action.payload;
      });

    // Fetch weekly goals
    builder
      .addCase(fetchWeeklyGoals.fulfilled, (state, action) => {
        state.weeklyGoals = action.payload;
      });

    // Check achievements
    builder
      .addCase(checkGoalAchievements.fulfilled, (state, action) => {
        // Add new achievements to the list
        action.payload.forEach((achievement: Achievement) => {
          if (!state.achievements.find(a => a.id === achievement.id)) {
            state.achievements.unshift(achievement);
          }
        });
      });

    // Mark achievement notified
    builder
      .addCase(markAchievementNotified.fulfilled, (state, action) => {
        const achievement = state.achievements.find(a => a.id === action.payload.id);
        if (achievement) {
          achievement.isNotified = true;
        }
      });
  },
});

export const {
  setCurrentGoal,
  clearError,
  updateGoalProgressLocal,
  addAchievement,
  removeExpiredInsights,
  markGoalCompleted,
  resetGoalProgress
} = goalsSlice.actions;

export default goalsSlice.reducer;

// Selectors
export const selectAllGoals = (state: { goals: GoalsState }) => state.goals.goals;
export const selectActiveGoals = (state: { goals: GoalsState }) => 
  state.goals.goals.filter(goal => goal.isActive);
export const selectCompletedGoals = (state: { goals: GoalsState }) => 
  state.goals.goals.filter(goal => !goal.isActive); // Simplified - should use isCompleted() method
export const selectGoalById = (state: { goals: GoalsState }, goalId: string) => 
  state.goals.goals.find(goal => goal.id === goalId);
export const selectGoalProgress = (state: { goals: GoalsState }, goalId: string) => 
  state.goals.progress[goalId];
export const selectRecentAchievements = (state: { goals: GoalsState }) => 
  state.goals.achievements.slice(0, 10);
export const selectUnnotifiedAchievements = (state: { goals: GoalsState }) => 
  state.goals.achievements.filter(a => !a.isNotified);
export const selectTodaysGoals = (state: { goals: GoalsState }) => state.goals.todaysGoals;
export const selectWeeklyGoals = (state: { goals: GoalsState }) => state.goals.weeklyGoals;
export const selectGoalStats = (state: { goals: GoalsState }) => state.goals.stats;
export const selectGoalInsights = (state: { goals: GoalsState }) => state.goals.insights;
export const selectHighPriorityInsights = (state: { goals: GoalsState }) => 
  state.goals.insights.filter(insight => insight.priority === 'high');
export const selectCurrentGoal = (state: { goals: GoalsState }) => state.goals.currentGoal;
export const selectGoalsLoading = (state: { goals: GoalsState }) => state.goals.isLoading;
export const selectGoalsError = (state: { goals: GoalsState }) => state.goals.error;