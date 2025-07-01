import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Project } from '@shared/types/project';
import { ipcRenderer } from '../../services/ipc';

interface ProjectState {
  projects: Project[];
  activeProjects: Project[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  projects: [
    {
      id: 'default',
      name: 'General',
      color: '#00bcd4',
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      totalTime: 0,
      settings: {}
    }
  ],
  activeProjects: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async () => {
    const response = await ipcRenderer.invoke('project:getAll');
    return response;
  }
);

export const createProject = createAsyncThunk(
  'projects/create',
  async (projectData: Partial<Project>) => {
    const response = await ipcRenderer.invoke('project:create', projectData);
    return response;
  }
);

export const updateProject = createAsyncThunk(
  'projects/update',
  async (project: Project) => {
    const response = await ipcRenderer.invoke('project:update', project);
    return response;
  }
);

export const deleteProject = createAsyncThunk(
  'projects/delete',
  async (projectId: string) => {
    await ipcRenderer.invoke('project:delete', projectId);
    return projectId;
  }
);

// Slice
const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setActiveProjects: (state) => {
      state.activeProjects = state.projects.filter(p => !p.isArchived);
    },
    updateProjectTime: (state, action: PayloadAction<{ projectId: string; duration: number }>) => {
      const project = state.projects.find(p => p.id === action.payload.projectId);
      if (project) {
        project.totalTime += action.payload.duration;
      }
    },
    clearError: (state) => {
      state.error = null;
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
        state.activeProjects = action.payload.filter((p: Project) => !p.isArchived);
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch projects';
      });

    // Create project
    builder
      .addCase(createProject.fulfilled, (state, action) => {
        state.projects.push(action.payload);
        if (!action.payload.isArchived) {
          state.activeProjects.push(action.payload);
        }
      });

    // Update project
    builder
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        state.activeProjects = state.projects.filter(p => !p.isArchived);
      });

    // Delete project
    builder
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter(p => p.id !== action.payload);
        state.activeProjects = state.activeProjects.filter(p => p.id !== action.payload);
      });
  },
});

export const { setActiveProjects, updateProjectTime, clearError } = projectSlice.actions;
export default projectSlice.reducer;