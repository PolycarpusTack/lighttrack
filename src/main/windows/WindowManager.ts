import { BrowserWindow, screen, shell } from 'electron';
import path from 'path';
import { isDevelopment } from '@shared/utils/environment';
import { WindowState } from '@shared/types/window';

export class WindowManager {
  private static instance: WindowManager;
  private windows: Map<string, BrowserWindow> = new Map();
  private windowStates: Map<string, WindowState> = new Map();

  static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  static getMainWindow(): BrowserWindow | undefined {
    return WindowManager.getInstance().getMainWindow();
  }

  async createMainWindow(): Promise<BrowserWindow> {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    const mainWindow = new BrowserWindow({
      width: Math.min(1600, width * 0.9),
      height: Math.min(900, height * 0.9),
      minWidth: 1200,
      minHeight: 700,
      title: 'LightTrack',
      icon: path.join(__dirname, '../../../assets/icons/icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js')
      },
      frame: false, // Custom title bar
      backgroundColor: '#0f172a',
      show: false
    });

    // Load the app
    if (isDevelopment) {
      mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

    // Handle window events
    mainWindow.on('close', (e) => {
      e.preventDefault();
      this.minimizeToTray();
    });

    mainWindow.webContents.on('new-window', (e, url) => {
      e.preventDefault();
      shell.openExternal(url);
    });

    this.windows.set('main', mainWindow);
    return mainWindow;
  }

  async createSettingsWindow(): Promise<BrowserWindow> {
    const settingsWindow = new BrowserWindow({
      width: 800,
      height: 600,
      parent: this.getMainWindow(),
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js')
      }
    });

    settingsWindow.loadFile(path.join(__dirname, '../../renderer/settings.html'));
    
    settingsWindow.once('ready-to-show', () => {
      settingsWindow.show();
    });

    this.windows.set('settings', settingsWindow);
    return settingsWindow;
  }

  minimizeToTray(): void {
    const mainWindow = this.getMainWindow();
    if (mainWindow) {
      mainWindow.hide();
    }
  }

  restoreFromTray(): void {
    const mainWindow = this.getMainWindow();
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  }

  toggleDevTools(): void {
    const mainWindow = this.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.toggleDevTools();
    }
  }

  getMainWindow(): BrowserWindow | undefined {
    return this.windows.get('main');
  }

  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values());
  }

  closeWindow(windowId: string): void {
    const window = this.windows.get(windowId);
    if (window) {
      window.destroy();
      this.windows.delete(windowId);
    }
  }

  saveWindowState(windowId: string): void {
    const window = this.windows.get(windowId);
    if (window) {
      const bounds = window.getBounds();
      const state: WindowState = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: window.isMaximized(),
        isFullScreen: window.isFullScreen()
      };
      this.windowStates.set(windowId, state);
    }
  }

  restoreWindowState(windowId: string): WindowState | undefined {
    return this.windowStates.get(windowId);
  }
}