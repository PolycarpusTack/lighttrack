import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Settings, ProfileSettings, NotificationSettings, AppearanceSettings, KeyboardShortcuts, PrivacySettings, BackupSettings, IntegrationSettings, defaultSettings } from '@shared/types/settings';
import { IPCService } from '../../services/ipc';

interface SettingsState {
  settings: Settings | null;
  isLoading: boolean;
  error: string | null;
  lastSaved: string | null;
  hasUnsavedChanges: boolean;
}

const initialState: SettingsState = {
  settings: null,
  isLoading: false,
  error: null,
  lastSaved: null,
  hasUnsavedChanges: false,
};

// Async thunks
export const fetchSettings = createAsyncThunk(
  'settings/fetch',
  async () => {
    return await IPCService.getSettings();
  }
);

export const updateSettings = createAsyncThunk(
  'settings/update',
  async (settings: Partial<Settings>) => {
    return await IPCService.updateSettings(settings);
  }
);

export const resetSettings = createAsyncThunk(
  'settings/reset',
  async () => {
    return await IPCService.resetSettings();
  }
);

export const exportSettings = createAsyncThunk(
  'settings/export',
  async (filePath: string) => {
    return await IPCService.exportSettings(filePath);
  }
);

export const importSettings = createAsyncThunk(
  'settings/import',
  async (filePath: string) => {
    return await IPCService.importSettings(filePath);
  }
);

export const validateShortcut = createAsyncThunk(
  'settings/validateShortcut',
  async (shortcut: string) => {
    return await IPCService.validateShortcut(shortcut);
  }
);

// Slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // Profile settings
    updateProfile: (state, action: PayloadAction<Partial<ProfileSettings>>) => {
      if (state.settings) {
        state.settings.profile = { ...state.settings.profile, ...action.payload };
        state.hasUnsavedChanges = true;
      }
    },

    // Appearance settings
    updateAppearance: (state, action: PayloadAction<Partial<AppearanceSettings>>) => {
      if (state.settings) {
        state.settings.appearance = { ...state.settings.appearance, ...action.payload };
        state.hasUnsavedChanges = true;
      }
    },

    setTheme: (state, action: PayloadAction<'dark' | 'light' | 'auto'>) => {
      if (state.settings) {
        state.settings.appearance.theme = action.payload;
        state.hasUnsavedChanges = true;
      }
    },

    setAccentColor: (state, action: PayloadAction<string>) => {
      if (state.settings) {
        state.settings.appearance.accentColor = action.payload;
        state.hasUnsavedChanges = true;
      }
    },

    // Notification settings
    updateNotifications: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      if (state.settings) {
        state.settings.notifications = { ...state.settings.notifications, ...action.payload };
        state.hasUnsavedChanges = true;
      }
    },

    // Keyboard shortcuts
    updateShortcuts: (state, action: PayloadAction<Partial<KeyboardShortcuts>>) => {
      if (state.settings) {
        state.settings.shortcuts = { ...state.settings.shortcuts, ...action.payload };
        state.hasUnsavedChanges = true;
      }
    },

    updateShortcut: (state, action: PayloadAction<{ key: string; value: string }>) => {
      if (state.settings) {
        state.settings.shortcuts[action.payload.key] = action.payload.value;
        state.hasUnsavedChanges = true;
      }
    },

    // Privacy settings
    updatePrivacy: (state, action: PayloadAction<Partial<PrivacySettings>>) => {
      if (state.settings) {
        state.settings.privacy = { ...state.settings.privacy, ...action.payload };
        state.hasUnsavedChanges = true;
      }
    },

    // Backup settings
    updateBackup: (state, action: PayloadAction<Partial<BackupSettings>>) => {
      if (state.settings) {
        state.settings.backup = { ...state.settings.backup, ...action.payload };
        state.hasUnsavedChanges = true;
      }
    },

    // Integration settings
    updateIntegrations: (state, action: PayloadAction<Partial<IntegrationSettings>>) => {
      if (state.settings) {
        state.settings.integrations = { ...state.settings.integrations, ...action.payload };
        state.hasUnsavedChanges = true;
      }
    },

    // Utility actions
    markSaved: (state) => {
      state.hasUnsavedChanges = false;
      state.lastSaved = new Date().toISOString();
    },

    clearError: (state) => {
      state.error = null;
    },

    initializeWithDefaults: (state) => {
      if (!state.settings) {
        state.settings = defaultSettings as Settings;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch settings
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.settings = action.payload || defaultSettings as Settings;
        state.hasUnsavedChanges = false;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch settings';
        // Initialize with defaults on error
        state.settings = defaultSettings as Settings;
      });

    // Update settings
    builder
      .addCase(updateSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.settings = action.payload;
        state.hasUnsavedChanges = false;
        state.lastSaved = new Date().toISOString();
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update settings';
      });

    // Reset settings
    builder
      .addCase(resetSettings.fulfilled, (state, action) => {
        state.settings = action.payload || defaultSettings as Settings;
        state.hasUnsavedChanges = false;
        state.lastSaved = new Date().toISOString();
      });

    // Export settings
    builder
      .addCase(exportSettings.fulfilled, (state) => {
        // Export successful - could show notification
      })
      .addCase(exportSettings.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to export settings';
      });

    // Import settings
    builder
      .addCase(importSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
        state.hasUnsavedChanges = false;
        state.lastSaved = new Date().toISOString();
      })
      .addCase(importSettings.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to import settings';
      });
  },
});

export const {
  updateProfile,
  updateAppearance,
  setTheme,
  setAccentColor,
  updateNotifications,
  updateShortcuts,
  updateShortcut,
  updatePrivacy,
  updateBackup,
  updateIntegrations,
  markSaved,
  clearError,
  initializeWithDefaults,
} = settingsSlice.actions;

export default settingsSlice.reducer;

// Selectors
export const selectSettings = (state: { settings: SettingsState }) => state.settings.settings;
export const selectProfile = (state: { settings: SettingsState }) => state.settings.settings?.profile;
export const selectAppearance = (state: { settings: SettingsState }) => state.settings.settings?.appearance;
export const selectNotifications = (state: { settings: SettingsState }) => state.settings.settings?.notifications;
export const selectShortcuts = (state: { settings: SettingsState }) => state.settings.settings?.shortcuts;
export const selectPrivacy = (state: { settings: SettingsState }) => state.settings.settings?.privacy;
export const selectBackup = (state: { settings: SettingsState }) => state.settings.settings?.backup;
export const selectIntegrations = (state: { settings: SettingsState }) => state.settings.settings?.integrations;
export const selectHasUnsavedChanges = (state: { settings: SettingsState }) => state.settings.hasUnsavedChanges;
export const selectLastSaved = (state: { settings: SettingsState }) => state.settings.lastSaved;
export const selectSettingsLoading = (state: { settings: SettingsState }) => state.settings.isLoading;
export const selectSettingsError = (state: { settings: SettingsState }) => state.settings.error;