import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface Modal {
  id: string;
  type: 'manualEntry' | 'editActivity' | 'projectSettings' | 'confirmation' | 'splitActivity' | 'export' | 'bulkCategorize' | 'quickStart';
  data?: any;
}

interface UIState {
  notifications: Notification[];
  modals: Modal[];
  commandPaletteOpen: boolean;
  searchOpen: boolean;
  sidebarCollapsed: boolean;
  floatingTimerVisible: boolean;
  isFullscreen: boolean;
  selectedActivityIds: string[];
  contextMenu: {
    visible: boolean;
    position: { x: number; y: number };
    activityId?: string;
  };
}

const initialState: UIState = {
  notifications: [],
  modals: [],
  commandPaletteOpen: false,
  searchOpen: false,
  sidebarCollapsed: false,
  floatingTimerVisible: false,
  isFullscreen: false,
  selectedActivityIds: [],
  contextMenu: {
    visible: false,
    position: { x: 0, y: 0 },
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    showNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
      };
      state.notifications.push(notification);
    },
    
    hideNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    openModal: (state, action: PayloadAction<Omit<Modal, 'id'>>) => {
      const modal: Modal = {
        ...action.payload,
        id: Date.now().toString(),
      };
      state.modals.push(modal);
    },
    
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals = state.modals.filter(m => m.id !== action.payload);
    },
    
    closeAllModals: (state) => {
      state.modals = [];
    },
    
    toggleCommandPalette: (state) => {
      state.commandPaletteOpen = !state.commandPaletteOpen;
    },
    
    setCommandPaletteOpen: (state, action: PayloadAction<boolean>) => {
      state.commandPaletteOpen = action.payload;
    },
    
    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.searchOpen = action.payload;
    },
    
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    
    toggleFloatingTimer: (state) => {
      state.floatingTimerVisible = !state.floatingTimerVisible;
    },
    
    setFloatingTimerVisible: (state, action: PayloadAction<boolean>) => {
      state.floatingTimerVisible = action.payload;
    },
    
    setFullscreen: (state, action: PayloadAction<boolean>) => {
      state.isFullscreen = action.payload;
    },
    
    setSelectedActivityIds: (state, action: PayloadAction<string[]>) => {
      state.selectedActivityIds = action.payload;
    },
    
    addSelectedActivityId: (state, action: PayloadAction<string>) => {
      if (!state.selectedActivityIds.includes(action.payload)) {
        state.selectedActivityIds.push(action.payload);
      }
    },
    
    removeSelectedActivityId: (state, action: PayloadAction<string>) => {
      state.selectedActivityIds = state.selectedActivityIds.filter(id => id !== action.payload);
    },
    
    clearSelectedActivityIds: (state) => {
      state.selectedActivityIds = [];
    },
    
    showContextMenu: (state, action: PayloadAction<{ position: { x: number; y: number }; activityId?: string }>) => {
      state.contextMenu.visible = true;
      state.contextMenu.position = action.payload.position;
      state.contextMenu.activityId = action.payload.activityId;
    },
    
    hideContextMenu: (state) => {
      state.contextMenu.visible = false;
      state.contextMenu.activityId = undefined;
    },
  },
});

export const {
  showNotification,
  hideNotification,
  clearNotifications,
  openModal,
  closeModal,
  closeAllModals,
  toggleCommandPalette,
  setCommandPaletteOpen,
  setSearchOpen,
  toggleSidebar,
  setSidebarCollapsed,
  toggleFloatingTimer,
  setFloatingTimerVisible,
  setFullscreen,
  setSelectedActivityIds,
  addSelectedActivityId,
  removeSelectedActivityId,
  clearSelectedActivityIds,
  showContextMenu,
  hideContextMenu,
} = uiSlice.actions;

export default uiSlice.reducer;