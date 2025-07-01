import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { IPCService } from '../../services/ipc';

// Updated interfaces to match backend exactly
interface DailyStats {
  date: string;
  totalTime: number;
  productivityScore: number;
  focusScore: number;
  projectBreakdown: { [projectId: string]: number };
  activityCount: number;
  distractionCount: number;
  mostProductiveHour: number;
  leastProductiveHour: number;
  // Legacy fields for backward compatibility
  productiveTime?: number;
  breakTime?: number;
  activeProjects?: number;
  completedActivities?: number;
  averageActivityDuration?: number;
  hourlyBreakdown?: number[];
  topActivities?: Array<{ name: string; duration: number; percentage: number }>;
}

interface WeeklyStats {
  weekStart: string;
  totalTime: number;
  dailyStats: DailyStats[];
  consistencyScore: number;
  averageProductivity: number;
  averageFocus: number;
  totalActivities: number;
  weeklyGoalProgress: number;
  // Legacy fields for backward compatibility
  weekEnd?: Date;
  dailyAverages?: number[];
  projectDistribution?: Array<{ projectId: string; duration: number; percentage: number }>;
  trends?: {
    timeChange: number;
    productivityChange: number;
    focusChange: number;
  };
}

interface ProductivityAnalysis {
  timeRange: string;
  productivityScore: number;
  focusScore: number;
  efficiencyScore: number;
  trends: {
    productivity: 'improving' | 'declining' | 'stable';
    focus: 'improving' | 'declining' | 'stable';
    consistency: 'improving' | 'declining' | 'stable';
  };
  insights: string[];
  recommendations: string[];
  distractionPatterns: {
    hour: number;
    frequency: number;
    type: string;
  }[];
}

interface TimeInsight {
  type: 'peak_hours' | 'distraction_pattern' | 'productivity_trend' | 'project_balance';
  title: string;
  description: string;
  value: number;
  unit: string;
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
  metadata?: { [key: string]: any };
  // Legacy compatibility fields
  trend?: 'up' | 'down' | 'stable';
  actionable?: boolean;
  suggestion?: string;
}

interface ProjectStats {
  projectId: string;
  projectName?: string;
  totalTime: number;
  percentage: number;
  activityCount: number;
  averageActivityDuration: number;
  lastActivityTime: Date;
  color?: string;
}

interface AnalyticsState {
  todayStats: DailyStats | null;
  weeklyStats: WeeklyStats | null;
  productivityAnalysis: ProductivityAnalysis | null;
  projectDistribution: ProjectStats[];
  insights: TimeInsight[];
  recommendations: string[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  cacheStatus: 'fresh' | 'stale' | 'loading';
}

const initialState: AnalyticsState = {
  todayStats: null,
  weeklyStats: null,
  productivityAnalysis: null,
  projectDistribution: [],
  insights: [],
  recommendations: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
  cacheStatus: 'stale',
};

// Async thunks
export const fetchTodayStats = createAsyncThunk(
  'analytics/fetchTodayStats',
  async () => {
    return await IPCService.getTodayStats();
  }
);

export const fetchWeeklyStats = createAsyncThunk(
  'analytics/fetchWeeklyStats',
  async () => {
    return await IPCService.getThisWeekStats();
  }
);

export const fetchDailyStats = createAsyncThunk(
  'analytics/fetchDailyStats',
  async (date: Date) => {
    return await IPCService.getDailyStats(date);
  }
);

export const fetchWeeklyStatsForDate = createAsyncThunk(
  'analytics/fetchWeeklyStatsForDate',
  async (weekStart: Date) => {
    return await IPCService.getWeeklyStats(weekStart);
  }
);

export const fetchProductivityAnalysis = createAsyncThunk(
  'analytics/fetchProductivityAnalysis',
  async ({ startDate, endDate }: { startDate: Date; endDate: Date }) => {
    return await IPCService.getProductivityAnalysis(startDate, endDate);
  }
);

export const fetchTimeInsights = createAsyncThunk(
  'analytics/fetchTimeInsights',
  async ({ startDate, endDate }: { startDate: Date; endDate: Date }) => {
    return await IPCService.getTimeInsights(startDate, endDate);
  }
);

export const fetchRecommendations = createAsyncThunk(
  'analytics/fetchRecommendations',
  async ({ startDate, endDate }: { startDate: Date; endDate: Date }) => {
    return await IPCService.getRecommendations(startDate, endDate);
  }
);

export const refreshAnalyticsCache = createAsyncThunk(
  'analytics/refreshCache',
  async () => {
    return await IPCService.refreshAnalyticsCache();
  }
);

export const fetchProjectDistribution = createAsyncThunk(
  'analytics/fetchProjectDistribution',
  async ({ timeRange, startDate, endDate }: { 
    timeRange: 'today' | 'week' | 'month' | 'year' | 'custom'; 
    startDate?: Date; 
    endDate?: Date 
  }) => {
    return await IPCService.calculateProjectDistribution(timeRange, startDate, endDate);
  }
);

// Slice
const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCacheStatus: (state, action: PayloadAction<'fresh' | 'stale' | 'loading'>) => {
      state.cacheStatus = action.payload;
    },
    updateLastRefresh: (state) => {
      state.lastUpdated = new Date().toISOString();
      state.cacheStatus = 'fresh';
    },
    clearAnalyticsData: (state) => {
      state.todayStats = null;
      state.weeklyStats = null;
      state.productivityAnalysis = null;
      state.projectDistribution = [];
      state.insights = [];
      state.recommendations = [];
      state.lastUpdated = null;
      state.cacheStatus = 'stale';
    },
  },
  extraReducers: (builder) => {
    // Fetch today stats
    builder
      .addCase(fetchTodayStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTodayStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.todayStats = action.payload;
        state.lastUpdated = new Date().toISOString();
        state.cacheStatus = 'fresh';
      })
      .addCase(fetchTodayStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch today stats';
      });

    // Fetch weekly stats
    builder
      .addCase(fetchWeeklyStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWeeklyStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.weeklyStats = action.payload;
        state.lastUpdated = new Date().toISOString();
        state.cacheStatus = 'fresh';
      })
      .addCase(fetchWeeklyStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch weekly stats';
      });

    // Fetch daily stats
    builder
      .addCase(fetchDailyStats.fulfilled, (state, action) => {
        state.todayStats = action.payload;
      });

    // Fetch weekly stats for date
    builder
      .addCase(fetchWeeklyStatsForDate.fulfilled, (state, action) => {
        state.weeklyStats = action.payload;
      });

    // Fetch productivity analysis
    builder
      .addCase(fetchProductivityAnalysis.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProductivityAnalysis.fulfilled, (state, action) => {
        state.isLoading = false;
        state.productivityAnalysis = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchProductivityAnalysis.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch productivity analysis';
      });

    // Fetch time insights
    builder
      .addCase(fetchTimeInsights.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTimeInsights.fulfilled, (state, action) => {
        state.isLoading = false;
        state.insights = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchTimeInsights.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch time insights';
      });

    // Fetch recommendations
    builder
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.recommendations = action.payload;
      });

    // Refresh analytics cache
    builder
      .addCase(refreshAnalyticsCache.pending, (state) => {
        state.cacheStatus = 'loading';
      })
      .addCase(refreshAnalyticsCache.fulfilled, (state, action) => {
        if (action.payload.success) {
          state.cacheStatus = 'fresh';
          state.lastUpdated = new Date().toISOString();
        } else {
          state.error = action.payload.message;
        }
      })
      .addCase(refreshAnalyticsCache.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to refresh cache';
        state.cacheStatus = 'stale';
      });

    // Fetch project distribution
    builder
      .addCase(fetchProjectDistribution.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjectDistribution.fulfilled, (state, action) => {
        state.isLoading = false;
        state.projectDistribution = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchProjectDistribution.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch project distribution';
      });
  },
});

export const { 
  clearError, 
  setCacheStatus, 
  updateLastRefresh, 
  clearAnalyticsData 
} = analyticsSlice.actions;

export default analyticsSlice.reducer;

// Export types for use in components
export type { DailyStats, WeeklyStats, ProductivityAnalysis, TimeInsight };