import { Tray, Menu, BrowserWindow, nativeImage, app } from 'electron';
import path from 'path';
import { ActivityService } from '../services/ActivityService';
import { formatDuration } from '@shared/utils/time';

export class TrayManager {
  private tray: Tray | null = null;
  private contextMenu: Menu | null = null;
  private activityService: ActivityService;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.activityService = new ActivityService();
  }

  createTray(mainWindow: BrowserWindow): void {
    const iconPath = path.join(__dirname, '../../../assets/icons/tray-icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    
    this.tray = new Tray(icon);
    this.tray.setToolTip('LightTrack - Time Tracking');
    
    // Click to show/hide
    this.tray.on('click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    // Start updating the tray
    this.startTrayUpdate();
    
    // Build initial menu
    this.updateContextMenu(mainWindow);
  }

  private updateContextMenu(mainWindow: BrowserWindow): void {
    const currentActivity = this.activityService.getCurrentActivity();
    const todayTotal = this.activityService.getTodayTotal();
    
    const menuTemplate: Electron.MenuItemConstructorOptions[] = [
      {
        label: currentActivity 
          ? `⏱️ ${currentActivity.name} - ${formatDuration(currentActivity.duration)}`
          : '⏱️ Not tracking',
        enabled: false
      },
      { type: 'separator' },
      {
        label: currentActivity ? '⏸️ Pause' : '▶️ Start Tracking',
        click: () => {
          if (currentActivity) {
            this.activityService.pauseActivity(currentActivity.id);
          } else {
            mainWindow.webContents.send('tray:start-tracking');
            mainWindow.show();
          }
        }
      },
      {
        label: '⏹️ Stop Tracking',
        enabled: !!currentActivity,
        click: () => {
          if (currentActivity) {
            this.activityService.stopActivity(currentActivity.id);
          }
        }
      },
      { type: 'separator' },
      {
        label: `Today: ${formatDuration(todayTotal)}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: '📊 Show Dashboard',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        }
      },
      {
        label: '⚙️ Settings',
        click: () => {
          mainWindow.webContents.send('navigate:settings');
          mainWindow.show();
        }
      },
      { type: 'separator' },
      {
        label: '🚪 Quit',
        click: () => {
          app.quit();
        }
      }
    ];

    this.contextMenu = Menu.buildFromTemplate(menuTemplate);
    this.tray?.setContextMenu(this.contextMenu);
  }

  private startTrayUpdate(): void {
    // Update every second when tracking, every minute otherwise
    const updateInterval = this.activityService.isTracking() ? 1000 : 60000;
    
    this.updateInterval = setInterval(() => {
      this.updateTrayTooltip();
      
      // Update menu less frequently
      if (Date.now() % 5000 < 1000) {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          this.updateContextMenu(mainWindow);
        }
      }
    }, updateInterval);
  }

  private updateTrayTooltip(): void {
    const currentActivity = this.activityService.getCurrentActivity();
    const todayTotal = this.activityService.getTodayTotal();
    
    let tooltip = 'LightTrack';
    if (currentActivity) {
      tooltip = `${currentActivity.name} - ${formatDuration(currentActivity.duration)}`;
    }
    tooltip += `\nToday: ${formatDuration(todayTotal)}`;
    
    this.tray?.setToolTip(tooltip);
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.tray?.destroy();
  }
}