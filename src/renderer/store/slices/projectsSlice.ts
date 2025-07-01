import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Project } from '@shared/types/project';
import { IPCService } from '../../services/ipc';

interface ProjectHierarchy {
  project: Project;
  children: ProjectHierarchy[];
  totalTime: number;
  depth: number;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  baseProject: {
    color: string;
    icon?: string;
    settings: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface BulkImportResult {
  imported: Project[];
  failed: Array<{ name: string; error: string }>;
  totalProcessed: number;
}

interface ProjectsState {
  projects: Project[];
  hierarchy: ProjectHierarchy[];
  templates: ProjectTemplate[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: ProjectsState = {
  projects: [],
  hierarchy: [],
  templates: [],
  currentProject: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async () => {
    return await IPCService.getProjects();
  }
);

export const createProject = createAsyncThunk(
  'projects/create',
  async (projectData: any) => {
    return await IPCService.createProject(projectData);
  }
);

export const updateProject = createAsyncThunk(
  'projects/update',
  async ({ projectId, updates }: { projectId: string; updates: Partial<Project> }) => {
    return await IPCService.updateProject(projectId, updates);
  }
);

export const deleteProject = createAsyncThunk(
  'projects/delete',
  async (projectId: string) => {
    await IPCService.deleteProject(projectId);
    return projectId;
  }
);

export const archiveProject = createAsyncThunk(
  'projects/archive',
  async ({ projectId, includeChildren }: { projectId: string; includeChildren: boolean }) => {
    return await IPCService.archiveProject(projectId, includeChildren);
  }
);

export const fetchProjectHierarchy = createAsyncThunk(
  'projects/fetchHierarchy',
  async () => {
    return await IPCService.getProjectHierarchy();
  }
);

export const fetchProjectTemplates = createAsyncThunk(
  'projects/fetchTemplates',
  async () => {
    return await IPCService.getProjectTemplates();
  }
);

export const createProjectTemplate = createAsyncThunk(
  'projects/createTemplate',
  async ({ projectId, name, description }: {
    projectId: string;
    name: string;
    description?: string;
  }) => {
    return await IPCService.createProjectTemplate(projectId, name, description);
  }
);

export const bulkImportProjects = createAsyncThunk(
  'projects/bulkImport',
  async (options: any) => {
    return await IPCService.bulkImportProjects(options);
  }
);

// Slice
const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setCurrentProject: (state, action: PayloadAction<Project | null>) => {
      state.currentProject = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateProjectTime: (state, action: PayloadAction<{ projectId: string; time: number }>) => {
      const project = state.projects.find(p => p.id === action.payload.projectId);
      if (project) {
        project.totalTime += action.payload.time;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch projects
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.projects = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch projects';
      });

    // Create project
    builder
      .addCase(createProject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.projects.push(action.payload);
      })
      .addCase(createProject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create project';
      });

    // Update project
    builder
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        if (state.currentProject?.id === action.payload.id) {
          state.currentProject = action.payload;
        }
      });

    // Delete project
    builder
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter(p => p.id !== action.payload);
        if (state.currentProject?.id === action.payload) {
          state.currentProject = null;
        }
      });

    // Fetch hierarchy
    builder
      .addCase(fetchProjectHierarchy.fulfilled, (state, action) => {
        state.hierarchy = action.payload;
      });

    // Fetch templates
    builder
      .addCase(fetchProjectTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
      });

    // Create template
    builder
      .addCase(createProjectTemplate.fulfilled, (state, action) => {
        state.templates.push(action.payload);
      });

    // Bulk import
    builder
      .addCase(bulkImportProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(bulkImportProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        // Add imported projects to the list
        state.projects.push(...action.payload.imported);
        
        if (action.payload.failed.length > 0) {
          state.error = `Import completed with ${action.payload.failed.length} failures`;
        }
      })
      .addCase(bulkImportProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Bulk import failed';
      });

    // Archive project
    builder
      .addCase(archiveProject.fulfilled, (state, action) => {
        // Refresh projects after archiving
        // The actual archiving is handled by the backend
      });
  },
});

export const { 
  setCurrentProject, 
  clearError, 
  updateProjectTime 
} = projectsSlice.actions;

export default projectsSlice.reducer;