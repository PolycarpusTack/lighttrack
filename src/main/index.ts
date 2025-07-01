import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initializeDatabase, closeDatabase } from './database/connection';
import { initializeIPC, shutdownIPC } from './ipc';
import { BackgroundServicesManager } from './services/BackgroundServicesManager';
import { logger } from './utils/logger';

class LightTrackApp {
  private mainWindow: BrowserWindow | null = null;
  private backgroundServicesManager: BackgroundServicesManager;

  constructor() {
    this.backgroundServicesManager = BackgroundServicesManager.getInstance();
  }

  async init(): Promise<void> {
    try {
      // Initialize database
      await initializeDatabase();
      logger.info('Database initialized');

      // Initialize IPC handlers
      await initializeIPC();
      logger.info('IPC handlers initialized');

      // Initialize background services
      await this.backgroundServicesManager.initialize();
      logger.info('Background services initialized');

      // Create main window
      await this.createMainWindow();
      logger.info('Main window created');

    } catch (error) {
      logger.error('Failed to initialize LightTrack:', error);
      throw error;
    }
  }

  private async createMainWindow(): Promise<void> {
    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, '../preload/index.js'),
        webSecurity: true,
      },
      titleBarStyle: 'hiddenInset',
      show: false, // Don't show until ready
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
      await this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      await this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      logger.info('Main window shown');
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  async shutdown(): Promise<void> {
    try {
      // Shutdown background services
      await this.backgroundServicesManager.shutdown();
      logger.info('Background services shut down');
      
      // Shutdown IPC
      shutdownIPC();
      
      // Close database
      await closeDatabase();
      
      logger.info('LightTrack shutdown completed');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

let lightTrackApp: LightTrackApp;

// Application lifecycle
app.whenReady().then(async () => {
  try {
    lightTrackApp = new LightTrackApp();
    await lightTrackApp.init();
  } catch (error) {
    logger.error('Failed to start LightTrack:', error);
    app.quit();
  }
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    if (lightTrackApp) {
      await lightTrackApp.shutdown();
    }
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    try {
      lightTrackApp = new LightTrackApp();
      await lightTrackApp.init();
    } catch (error) {
      logger.error('Failed to reactivate LightTrack:', error);
    }
  }
});

app.on('before-quit', async () => {
  if (lightTrackApp) {
    await lightTrackApp.shutdown();
  }
});

// Handle protocol for deep linking
app.setAsDefaultProtocolClient('lighttrack');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}