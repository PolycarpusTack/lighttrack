import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { IPCService } from '../../services/ipc';

interface ProjectTimeStats {
  projectId: string;
  projectName: string;
  totalTime: number;
  todayTime: number;
  weekTime: number;
  monthTime: number;
  yearTime: number;
  activityCount: number;
  averageSessionLength: number;
  lastActivityDate: Date | null;
}

interface ProjectTrend {
  date: string;
  time: number;
  activities: number;
  productivity: number;
}

interface HeatmapCell {
  date: Date;
  value: number;
  level: 0 | 1 | 2 | 3 | 4;
  activities: number;
}

interface ActivityHeatmapData {
  projectId: string;
  heatmap: HeatmapCell[][];
  maxValue: number;
  totalDays: number;
}

interface BudgetAnalysis {
  projectId: string;
  totalEarned: number;
  projectedMonthly: number;
  hoursTracked: number;
  billableHours: number;
  hourlyRate: number;
  currency: string;
  budgetUtilization: number;
  remainingBudget: number;
}

interface ProjectAnalyticsState {
  stats: ProjectTimeStats | null;
  trends: ProjectTrend[];
  heatmapData: ActivityHeatmapData | null;
  budgetAnalysis: BudgetAnalysis | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: ProjectAnalyticsState = {
  stats: null,
  trends: [],
  heatmapData: null,
  budgetAnalysis: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchProjectStats = createAsyncThunk(
  'projectAnalytics/fetchStats',
  async (projectId: string) => {
    return await IPCService.getProjectTimeStats(projectId);
  }
);

export const fetchProjectTrends = createAsyncThunk(
  'projectAnalytics/fetchTrends',
  async ({ projectId, days, interval }: {
    projectId: string;
    days: number;
    interval: 'daily' | 'weekly' | 'monthly';
  }) => {
    return await IPCService.getProjectTrends(projectId, days, interval);
  }
);

export const fetchActivityHeatmap = createAsyncThunk(
  'projectAnalytics/fetchHeatmap',
  async ({ projectId, days }: { projectId: string; days: number }) => {
    return await IPCService.generateActivityHeatmap(projectId, days);
  }
);

export const fetchBudgetAnalysis = createAsyncThunk(
  'projectAnalytics/fetchBudget',
  async (projectId: string) => {
    return await IPCService.analyzeBudget(projectId);
  }
);

export const updateProjectBudget = createAsyncThunk(
  'projectAnalytics/updateBudget',
  async ({ projectId, budgetLimit }: { projectId: string; budgetLimit: number }) => {
    return await IPCService.updateProjectBudget(projectId, budgetLimit);
  }
);

export const compareProjectPeriods = createAsyncThunk(
  'projectAnalytics/comparePeriods',
  async ({ 
    projectId, 
    period1Start, 
    period1End, 
    period2Start, 
    period2End 
  }: {
    projectId: string;
    period1Start: Date;
    period1End: Date;
    period2Start: Date;
    period2End: Date;
  }) => {
    return await IPCService.compareProjectPeriods(
      projectId,
      period1Start,
      period1End,
      period2Start,
      period2End
    );
  }
);

// Slice
const projectAnalyticsSlice = createSlice({
  name: 'projectAnalytics',
  initialState,
  reducers: {
    clearAnalytics: (state) => {
      state.stats = null;
      state.trends = [];
      state.heatmapData = null;
      state.budgetAnalysis = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch project stats
    builder
      .addCase(fetchProjectStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjectStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchProjectStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch project stats';
      });

    // Fetch trends
    builder
      .addCase(fetchProjectTrends.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjectTrends.fulfilled, (state, action) => {
        state.isLoading = false;
        state.trends = action.payload;
      })
      .addCase(fetchProjectTrends.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch project trends';
      });

    // Fetch heatmap
    builder
      .addCase(fetchActivityHeatmap.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchActivityHeatmap.fulfilled, (state, action) => {
        state.isLoading = false;
        state.heatmapData = action.payload;
      })
      .addCase(fetchActivityHeatmap.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch activity heatmap';
      });

    // Fetch budget analysis
    builder
      .addCase(fetchBudgetAnalysis.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBudgetAnalysis.fulfilled, (state, action) => {
        state.isLoading = false;
        state.budgetAnalysis = action.payload;
      })
      .addCase(fetchBudgetAnalysis.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch budget analysis';
      });

    // Update budget
    builder
      .addCase(updateProjectBudget.fulfilled, (state, action) => {
        if (state.budgetAnalysis) {
          state.budgetAnalysis = action.payload;
        }
      });
  },
});

export const { clearAnalytics, clearError } = projectAnalyticsSlice.actions;

export default projectAnalyticsSlice.reducer;