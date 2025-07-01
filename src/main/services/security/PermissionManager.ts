import { systemPreferences, Notification, app, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from '../../utils/logger';

export interface PermissionStatus {
  granted: boolean;
  required: boolean;
  description: string;
  requestMethod?: string;
}

export interface PermissionSummary {
  [key: string]: PermissionStatus;
}

/**
 * Manages system and application permissions required for LightTrack functionality
 */
export class PermissionManager {
  private static instance: PermissionManager;
  private permissions: Map<string, boolean> = new Map();
  private permissionRequests: Map<string, Promise<boolean>> = new Map();

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  private constructor() {
    logger.info('Permission manager initialized');
  }

  /**
   * Request all required permissions for the application
   */
  async requestAllPermissions(): Promise<PermissionSummary> {
    logger.info('Requesting all required permissions');
    
    const results: PermissionSummary = {};

    // Request permissions based on platform
    if (process.platform === 'darwin') {
      results.accessibility = await this.requestMacOSAccessibility();
      results.screenRecording = await this.requestMacOSScreenRecording();
      results.fullDiskAccess = await this.checkMacOSFullDiskAccess();
    } else if (process.platform === 'win32') {
      results.taskManager = await this.requestWindowsTaskManager();
      results.registry = await this.checkWindowsRegistry();
    } else if (process.platform === 'linux') {
      results.xorg = await this.checkLinuxXorg();
      results.procfs = await this.checkLinuxProcfs();
    }

    // Cross-platform permissions
    results.notifications = await this.requestNotificationPermission();
    results.filesystem = await this.requestFileSystemPermission();
    results.microphone = await this.checkMicrophonePermission();
    results.camera = await this.checkCameraPermission();

    // Log summary
    const grantedCount = Object.values(results).filter(p => p.granted).length;
    const totalCount = Object.values(results).length;
    
    logger.info(`Permissions summary: ${grantedCount}/${totalCount} granted`, results);

    return results;
  }

  /**
   * Check if a specific permission is granted
   */
  hasPermission(permission: string): boolean {
    return this.permissions.get(permission) || false;
  }

  /**
   * Request a specific permission
   */
  async requestPermission(permission: string): Promise<boolean> {
    // Prevent multiple simultaneous requests for the same permission
    if (this.permissionRequests.has(permission)) {
      return this.permissionRequests.get(permission)!;
    }

    const requestPromise = this.executePermissionRequest(permission);
    this.permissionRequests.set(permission, requestPromise);

    try {
      const result = await requestPromise;
      this.permissions.set(permission, result);
      return result;
    } finally {
      this.permissionRequests.delete(permission);
    }
  }

  /**
   * Execute the actual permission request
   */
  private async executePermissionRequest(permission: string): Promise<boolean> {
    switch (permission) {
      case 'accessibility':
        return process.platform === 'darwin' 
          ? (await this.requestMacOSAccessibility()).granted
          : true;
      
      case 'screenRecording':
        return process.platform === 'darwin' 
          ? (await this.requestMacOSScreenRecording()).granted
          : true;
      
      case 'notifications':
        return (await this.requestNotificationPermission()).granted;
      
      case 'filesystem':
        return (await this.requestFileSystemPermission()).granted;
      
      default:
        logger.warn(`Unknown permission requested: ${permission}`);
        return false;
    }
  }

  /**
   * macOS Accessibility Permission
   */
  private async requestMacOSAccessibility(): Promise<PermissionStatus> {
    try {
      const hasAccess = systemPreferences.isTrustedAccessibilityClient(true);
      
      if (!hasAccess) {
        const response = await dialog.showMessageBox({
          type: 'info',
          title: 'Accessibility Permission Required',
          message: 'LightTrack needs accessibility access to monitor application usage and track window titles.',
          detail: 'Please grant accessibility access in System Preferences > Security & Privacy > Accessibility',
          buttons: ['Open System Preferences', 'Skip'],
          defaultId: 0
        });

        if (response.response === 0) {
          // Open System Preferences
          await systemPreferences.openTCCAccessibilityPrivacy();
        }
      }

      this.permissions.set('accessibility', hasAccess);
      
      return {
        granted: hasAccess,
        required: true,
        description: 'Required for application usage monitoring and window title tracking',
        requestMethod: 'System Preferences > Security & Privacy > Accessibility'
      };
    } catch (error) {
      logger.error('Failed to request macOS accessibility permission:', error);
      return {
        granted: false,
        required: true,
        description: 'Failed to check accessibility permission'
      };
    }
  }

  /**
   * macOS Screen Recording Permission
   */
  private async requestMacOSScreenRecording(): Promise<PermissionStatus> {
    try {
      const hasAccess = systemPreferences.getMediaAccessStatus('screen') === 'granted';
      
      if (!hasAccess) {
        const response = await dialog.showMessageBox({
          type: 'info',
          title: 'Screen Recording Permission Required',
          message: 'LightTrack needs screen recording access to capture window titles and application information.',
          detail: 'Please grant screen recording access in System Preferences > Security & Privacy > Screen Recording',
          buttons: ['Open System Preferences', 'Skip'],
          defaultId: 0
        });

        if (response.response === 0) {
          // Open System Preferences (macOS will show the screen recording pane)
          await systemPreferences.openTCCAccessibilityPrivacy();
        }
      }

      this.permissions.set('screenRecording', hasAccess);
      
      return {
        granted: hasAccess,
        required: true,
        description: 'Required for window title capture and application monitoring',
        requestMethod: 'System Preferences > Security & Privacy > Screen Recording'
      };
    } catch (error) {
      logger.error('Failed to request macOS screen recording permission:', error);
      return {
        granted: false,
        required: true,
        description: 'Failed to check screen recording permission'
      };
    }
  }

  /**
   * macOS Full Disk Access (for comprehensive monitoring)
   */
  private async checkMacOSFullDiskAccess(): Promise<PermissionStatus> {
    try {
      // Test by trying to read a protected directory
      const testPath = '/Library/Application Support';
      let hasAccess = false;
      
      try {
        await fs.promises.access(testPath, fs.constants.R_OK);
        hasAccess = true;
      } catch {
        hasAccess = false;
      }

      this.permissions.set('fullDiskAccess', hasAccess);
      
      return {
        granted: hasAccess,
        required: false,
        description: 'Optional: Enables comprehensive system monitoring',
        requestMethod: 'System Preferences > Security & Privacy > Full Disk Access'
      };
    } catch (error) {
      logger.error('Failed to check macOS full disk access:', error);
      return {
        granted: false,
        required: false,
        description: 'Failed to check full disk access'
      };
    }
  }

  /**
   * Windows Task Manager Access
   */
  private async requestWindowsTaskManager(): Promise<PermissionStatus> {
    try {
      // Test if we can enumerate processes
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        const tasklist = spawn('tasklist', ['/fo', 'csv'], { windowsHide: true });
        let hasAccess = false;
        
        tasklist.on('exit', (code) => {
          hasAccess = code === 0;
          this.permissions.set('taskManager', hasAccess);
          
          resolve({
            granted: hasAccess,
            required: true,
            description: 'Required for application usage monitoring',
            requestMethod: 'Run as Administrator if needed'
          });
        });

        tasklist.on('error', () => {
          resolve({
            granted: false,
            required: true,
            description: 'Failed to access Windows task manager'
          });
        });
      });
    } catch (error) {
      logger.error('Failed to check Windows task manager access:', error);
      return {
        granted: false,
        required: true,
        description: 'Failed to check task manager access'
      };
    }
  }

  /**
   * Windows Registry Access
   */
  private async checkWindowsRegistry(): Promise<PermissionStatus> {
    try {
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        const reg = spawn('reg', ['query', 'HKEY_CURRENT_USER\\Software'], { windowsHide: true });
        let hasAccess = false;
        
        reg.on('exit', (code) => {
          hasAccess = code === 0;
          this.permissions.set('registry', hasAccess);
          
          resolve({
            granted: hasAccess,
            required: false,
            description: 'Optional: Enables enhanced Windows integration',
            requestMethod: 'Usually available by default'
          });
        });

        reg.on('error', () => {
          resolve({
            granted: false,
            required: false,
            description: 'Failed to access Windows registry'
          });
        });
      });
    } catch (error) {
      logger.error('Failed to check Windows registry access:', error);
      return {
        granted: false,
        required: false,
        description: 'Failed to check registry access'
      };
    }
  }

  /**
   * Linux X.org Access
   */
  private async checkLinuxXorg(): Promise<PermissionStatus> {
    try {
      const hasDisplay = !!process.env.DISPLAY;
      const hasXAuth = await this.checkFileExists('/usr/bin/xprop');
      const hasAccess = hasDisplay && hasXAuth;

      this.permissions.set('xorg', hasAccess);
      
      return {
        granted: hasAccess,
        required: true,
        description: 'Required for X11 window monitoring on Linux',
        requestMethod: 'Install x11-utils package'
      };
    } catch (error) {
      logger.error('Failed to check Linux X.org access:', error);
      return {
        granted: false,
        required: true,
        description: 'Failed to check X.org access'
      };
    }
  }

  /**
   * Linux /proc filesystem access
   */
  private async checkLinuxProcfs(): Promise<PermissionStatus> {
    try {
      await fs.promises.access('/proc/version', fs.constants.R_OK);
      const hasAccess = true;

      this.permissions.set('procfs', hasAccess);
      
      return {
        granted: hasAccess,
        required: true,
        description: 'Required for process monitoring on Linux',
        requestMethod: 'Usually available by default'
      };
    } catch (error) {
      this.permissions.set('procfs', false);
      return {
        granted: false,
        required: true,
        description: 'Failed to access /proc filesystem'
      };
    }
  }

  /**
   * Notification Permission
   */
  private async requestNotificationPermission(): Promise<PermissionStatus> {
    try {
      const isSupported = Notification.isSupported();
      
      if (isSupported) {
        // Create a test notification to trigger permission request
        const notification = new Notification({
          title: 'LightTrack Permissions',
          body: 'Notifications enabled successfully',
          silent: true
        });
        
        // Show and immediately close to avoid annoying the user
        notification.show();
        setTimeout(() => notification.close(), 100);
      }

      this.permissions.set('notifications', isSupported);
      
      return {
        granted: isSupported,
        required: true,
        description: 'Required for activity reminders and status updates',
        requestMethod: 'System notification settings'
      };
    } catch (error) {
      logger.error('Failed to request notification permission:', error);
      return {
        granted: false,
        required: true,
        description: 'Failed to check notification permission'
      };
    }
  }

  /**
   * File System Permission
   */
  private async requestFileSystemPermission(): Promise<PermissionStatus> {
    try {
      // Test write access to documents folder
      const documentsPath = app.getPath('documents');
      const testDir = path.join(documentsPath, 'LightTrack');
      const testFile = path.join(testDir, '.permission_test');
      
      // Ensure directory exists
      await fs.promises.mkdir(testDir, { recursive: true });
      
      // Test write access
      await fs.promises.writeFile(testFile, 'permission test');
      await fs.promises.unlink(testFile);
      
      this.permissions.set('filesystem', true);
      
      return {
        granted: true,
        required: true,
        description: 'Required for data storage and export functionality',
        requestMethod: 'Usually granted automatically'
      };
    } catch (error) {
      logger.error('Failed to check filesystem permission:', error);
      this.permissions.set('filesystem', false);
      
      return {
        granted: false,
        required: true,
        description: 'Failed to access file system for data storage'
      };
    }
  }

  /**
   * Microphone Permission (for voice notes, future feature)
   */
  private async checkMicrophonePermission(): Promise<PermissionStatus> {
    try {
      let hasAccess = false;
      
      if (process.platform === 'darwin') {
        hasAccess = systemPreferences.getMediaAccessStatus('microphone') === 'granted';
      } else {
        // For other platforms, assume granted for now
        hasAccess = true;
      }

      this.permissions.set('microphone', hasAccess);
      
      return {
        granted: hasAccess,
        required: false,
        description: 'Optional: For voice note features (future)',
        requestMethod: 'System privacy settings'
      };
    } catch (error) {
      logger.error('Failed to check microphone permission:', error);
      return {
        granted: false,
        required: false,
        description: 'Failed to check microphone permission'
      };
    }
  }

  /**
   * Camera Permission (for screenshot features, future feature)
   */
  private async checkCameraPermission(): Promise<PermissionStatus> {
    try {
      let hasAccess = false;
      
      if (process.platform === 'darwin') {
        hasAccess = systemPreferences.getMediaAccessStatus('camera') === 'granted';
      } else {
        // For other platforms, assume granted for now
        hasAccess = true;
      }

      this.permissions.set('camera', hasAccess);
      
      return {
        granted: hasAccess,
        required: false,
        description: 'Optional: For screenshot features (future)',
        requestMethod: 'System privacy settings'
      };
    } catch (error) {
      logger.error('Failed to check camera permission:', error);
      return {
        granted: false,
        required: false,
        description: 'Failed to check camera permission'
      };
    }
  }

  /**
   * Get current permission status for all permissions
   */
  getPermissionSummary(): PermissionSummary {
    const summary: PermissionSummary = {};
    
    for (const [permission, granted] of this.permissions) {
      summary[permission] = {
        granted,
        required: this.isPermissionRequired(permission),
        description: this.getPermissionDescription(permission)
      };
    }
    
    return summary;
  }

  /**
   * Check if permission is required for core functionality
   */
  private isPermissionRequired(permission: string): boolean {
    const requiredPermissions = [
      'accessibility', 'screenRecording', 'notifications', 
      'filesystem', 'taskManager', 'xorg', 'procfs'
    ];
    return requiredPermissions.includes(permission);
  }

  /**
   * Get description for a permission
   */
  private getPermissionDescription(permission: string): string {
    const descriptions: { [key: string]: string } = {
      accessibility: 'Required for application usage monitoring and window title tracking',
      screenRecording: 'Required for window title capture and application monitoring',
      fullDiskAccess: 'Optional: Enables comprehensive system monitoring',
      taskManager: 'Required for application usage monitoring',
      registry: 'Optional: Enables enhanced Windows integration',
      xorg: 'Required for X11 window monitoring on Linux',
      procfs: 'Required for process monitoring on Linux',
      notifications: 'Required for activity reminders and status updates',
      filesystem: 'Required for data storage and export functionality',
      microphone: 'Optional: For voice note features (future)',
      camera: 'Optional: For screenshot features (future)'
    };
    
    return descriptions[permission] || 'Unknown permission';
  }

  /**
   * Check if a file exists
   */
  private async checkFileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Show permission status dialog
   */
  async showPermissionStatus(): Promise<void> {
    const summary = this.getPermissionSummary();
    const grantedCount = Object.values(summary).filter(p => p.granted).length;
    const requiredCount = Object.values(summary).filter(p => p.required).length;
    const requiredGrantedCount = Object.values(summary).filter(p => p.required && p.granted).length;
    
    let message = `Permissions Status:\n\n`;
    message += `Required permissions: ${requiredGrantedCount}/${requiredCount}\n`;
    message += `Total permissions: ${grantedCount}/${Object.keys(summary).length}\n\n`;
    
    for (const [name, status] of Object.entries(summary)) {
      const icon = status.granted ? '✅' : '❌';
      const required = status.required ? '[Required]' : '[Optional]';
      message += `${icon} ${name} ${required}\n`;
    }

    await dialog.showMessageBox({
      type: 'info',
      title: 'LightTrack Permissions',
      message: message,
      buttons: ['OK']
    });
  }

  /**
   * Get the number of granted required permissions
   */
  getRequiredPermissionsCount(): { granted: number; total: number } {
    const summary = this.getPermissionSummary();
    const required = Object.values(summary).filter(p => p.required);
    const granted = required.filter(p => p.granted);
    
    return {
      granted: granted.length,
      total: required.length
    };
  }

  /**
   * Check if all required permissions are granted
   */
  hasAllRequiredPermissions(): boolean {
    const { granted, total } = this.getRequiredPermissionsCount();
    return granted === total;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.permissions.clear();
    this.permissionRequests.clear();
    logger.info('Permission manager disposed');
  }
}