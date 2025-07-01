import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ipcRenderer } from '../../services/ipc';

interface AppState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  version: string;
  updateAvailable: boolean;
  connectionStatus: 'online' | 'offline';
}

const initialState: AppState = {
  isInitialized: false,
  isLoading: false,
  error: null,
  version: '2.0.0',
  updateAvailable: false,
  connectionStatus: 'online'
};

export const initializeApp = createAsyncThunk(
  'app/initialize',
  async () => {
    // Initialize all app services
    const settings = await ipcRenderer.invoke('settings:get');
    const projects = await ipcRenderer.invoke('project:getAll');
    
    // Set up IPC listeners
    ipcRenderer.on('activity:started', (activity) => {
      console.log('Activity started:', activity);
    });
    
    ipcRenderer.on('activity:stopped', (activity) => {
      console.log('Activity stopped:', activity);
    });
    
    return { settings, projects };
  }
);

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setUpdateAvailable: (state, action: PayloadAction<boolean>) => {
      state.updateAvailable = action.payload;
    },
    setConnectionStatus: (state, action: PayloadAction<'online' | 'offline'>) => {
      state.connectionStatus = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeApp.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeApp.fulfilled, (state) => {
        state.isLoading = false;
        state.isInitialized = true;
      })
      .addCase(initializeApp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to initialize app';
      });
  }
});

export const { setLoading, setError, setUpdateAvailable, setConnectionStatus } = appSlice.actions;
export default appSlice.reducer;