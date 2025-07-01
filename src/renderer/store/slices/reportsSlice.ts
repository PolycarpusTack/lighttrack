import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { IPCService } from '../../services/ipc';
import { ReportType, ExportFormat } from '../../../main/services/ReportGenerator';

interface ReportMetadata {
  id: string;
  type: ReportType;
  generatedAt: Date;
  parameters: any;
  version: string;
}

interface Report {
  metadata: ReportMetadata;
  summary: any;
  details: any;
  charts: any[];
  insights: any[];
  exportFormats: ExportFormat[];
}

interface RecentReport {
  id: string;
  type: ReportType;
  name: string;
  generatedAt: Date;
  path?: string;
}

interface ReportsState {
  currentReport: Report | null;
  recentReports: RecentReport[];
  isGenerating: boolean;
  isExporting: boolean;
  error: string | null;
  lastGeneratedAt: string | null;
}

const initialState: ReportsState = {
  currentReport: null,
  recentReports: [],
  isGenerating: false,
  isExporting: false,
  error: null,
  lastGeneratedAt: null,
};

// Async thunks
export const generateReport = createAsyncThunk(
  'reports/generate',
  async (params: {
    type: ReportType;
    startDate?: Date;
    endDate?: Date;
    projectId?: string;
    includeCharts?: boolean;
    includeInsights?: boolean;
  }) => {
    return await IPCService.generateReport(params);
  }
);

export const generateDailyReport = createAsyncThunk(
  'reports/generateDaily',
  async (date?: Date) => {
    return await IPCService.generateDailyReport(date);
  }
);

export const generateWeeklyReport = createAsyncThunk(
  'reports/generateWeekly',
  async (weekStart?: Date) => {
    return await IPCService.generateWeeklyReport(weekStart);
  }
);

export const generateProjectReport = createAsyncThunk(
  'reports/generateProject',
  async ({ projectId, startDate, endDate }: {
    projectId: string;
    startDate: Date;
    endDate: Date;
  }) => {
    return await IPCService.generateProjectReport(projectId, startDate, endDate);
  }
);

export const exportReport = createAsyncThunk(
  'reports/export',
  async ({ report, format, outputPath }: {
    report: Report;
    format: ExportFormat;
    outputPath?: string;
  }) => {
    return await IPCService.exportReport(report, format, outputPath);
  }
);

export const openExportedFile = createAsyncThunk(
  'reports/openFile',
  async (filePath: string) => {
    return await IPCService.openExportedFile(filePath);
  }
);

export const fetchRecentReports = createAsyncThunk(
  'reports/fetchRecent',
  async () => {
    return await IPCService.getRecentReports();
  }
);

// Slice
const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearCurrentReport: (state) => {
      state.currentReport = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    addRecentReport: (state, action: PayloadAction<RecentReport>) => {
      // Add to beginning and limit to 10 recent reports
      state.recentReports = [action.payload, ...state.recentReports].slice(0, 10);
    },
    removeRecentReport: (state, action: PayloadAction<string>) => {
      state.recentReports = state.recentReports.filter(r => r.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    // Generate report
    builder
      .addCase(generateReport.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateReport.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.currentReport = action.payload;
        state.lastGeneratedAt = new Date().toISOString();
        
        // Add to recent reports
        const recentReport: RecentReport = {
          id: action.payload.metadata.id,
          type: action.payload.metadata.type,
          name: getReportName(action.payload.metadata.type),
          generatedAt: new Date(action.payload.metadata.generatedAt)
        };
        state.recentReports = [recentReport, ...state.recentReports].slice(0, 10);
      })
      .addCase(generateReport.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.error.message || 'Failed to generate report';
      });

    // Generate daily report
    builder
      .addCase(generateDailyReport.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateDailyReport.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.currentReport = action.payload;
        state.lastGeneratedAt = new Date().toISOString();
        
        const recentReport: RecentReport = {
          id: action.payload.metadata.id,
          type: 'daily',
          name: 'Daily Summary',
          generatedAt: new Date(action.payload.metadata.generatedAt)
        };
        state.recentReports = [recentReport, ...state.recentReports].slice(0, 10);
      })
      .addCase(generateDailyReport.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.error.message || 'Failed to generate daily report';
      });

    // Generate weekly report
    builder
      .addCase(generateWeeklyReport.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateWeeklyReport.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.currentReport = action.payload;
        state.lastGeneratedAt = new Date().toISOString();
        
        const recentReport: RecentReport = {
          id: action.payload.metadata.id,
          type: 'weekly',
          name: 'Weekly Report',
          generatedAt: new Date(action.payload.metadata.generatedAt)
        };
        state.recentReports = [recentReport, ...state.recentReports].slice(0, 10);
      })
      .addCase(generateWeeklyReport.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.error.message || 'Failed to generate weekly report';
      });

    // Generate project report
    builder
      .addCase(generateProjectReport.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateProjectReport.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.currentReport = action.payload;
        state.lastGeneratedAt = new Date().toISOString();
        
        const recentReport: RecentReport = {
          id: action.payload.metadata.id,
          type: 'project',
          name: 'Project Report',
          generatedAt: new Date(action.payload.metadata.generatedAt)
        };
        state.recentReports = [recentReport, ...state.recentReports].slice(0, 10);
      })
      .addCase(generateProjectReport.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.error.message || 'Failed to generate project report';
      });

    // Export report
    builder
      .addCase(exportReport.pending, (state) => {
        state.isExporting = true;
        state.error = null;
      })
      .addCase(exportReport.fulfilled, (state, action) => {
        state.isExporting = false;
        
        // Update recent report with export path
        if (state.currentReport) {
          const reportId = state.currentReport.metadata.id;
          const recentReport = state.recentReports.find(r => r.id === reportId);
          if (recentReport) {
            recentReport.path = action.payload.path;
          }
        }
      })
      .addCase(exportReport.rejected, (state, action) => {
        state.isExporting = false;
        state.error = action.error.message || 'Failed to export report';
      });

    // Fetch recent reports
    builder
      .addCase(fetchRecentReports.fulfilled, (state, action) => {
        state.recentReports = action.payload;
      });
  },
});

// Helper function
const getReportName = (type: ReportType): string => {
  switch (type) {
    case 'daily':
      return 'Daily Summary';
    case 'weekly':
      return 'Weekly Report';
    case 'project':
      return 'Project Report';
    case 'custom':
      return 'Custom Report';
    default:
      return 'Report';
  }
};

export const { 
  clearCurrentReport, 
  clearError, 
  addRecentReport, 
  removeRecentReport 
} = reportsSlice.actions;

export default reportsSlice.reducer;