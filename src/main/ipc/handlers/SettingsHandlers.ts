import { IpcMainInvokeEvent } from 'electron';
import { IPCHandler } from '../IPCHandler';
import { SettingRepository } from '../../database/repositories/SettingRepository';
import { Settings, defaultSettings } from '@shared/types/settings';
import { SettingsService } from '../../services/SettingsService';
import { dbLogger } from '../../utils/logger';
import fs from 'fs/promises';
import path from 'path';
import { app, globalShortcut } from 'electron';

export class SettingsHandlers extends IPCHandler {
  private settingRepository: SettingRepository;
  private settingsService: SettingsService;

  constructor() {
    super();
    this.settingRepository = new SettingRepository();
    this.settingsService = new SettingsService();
  }

  protected registerHandlers(): void {
    this.registerHandler('settings:get', this.getSetting.bind(this));
    this.registerHandler('settings:set', this.setSetting.bind(this));
    this.registerHandler('settings:getAll', this.getAllSettings.bind(this));
    this.registerHandler('settings:update', this.updateSettings.bind(this));
    this.registerHandler('settings:reset', this.resetSettings.bind(this));
    this.registerHandler('settings:export', this.exportSettings.bind(this));
    this.registerHandler('settings:import', this.importSettings.bind(this));
    this.registerHandler('settings:validateShortcut', this.validateShortcut.bind(this));
  }

  private async getSetting(event: IpcMainInvokeEvent, key: string): Promise<any> {
    try {
      dbLogger.info(`Getting setting: ${key}`);
      return await this.settingRepository.getSetting(key);
    } catch (error) {
      dbLogger.error('Error getting setting:', error);
      throw error;
    }
  }

  private async setSetting(event: IpcMainInvokeEvent, key: string, value: any): Promise<void> {
    try {
      dbLogger.info(`Setting ${key} to:`, value);
      
      // Determine type and category from the key
      const { type, category } = this.getSettingMetadata(key, value);
      
      await this.settingRepository.setSetting(key, value, type, category);
      
      // Handle special settings that require immediate action
      await this.handleSpecialSetting(key, value);
      
      dbLogger.info(`Successfully set ${key}`);
    } catch (error) {
      dbLogger.error('Error setting setting:', error);
      throw error;
    }
  }

  private async getAllSettings(event: IpcMainInvokeEvent): Promise<Settings> {
    try {
      dbLogger.info('Getting all settings');
      const rawSettings = await this.settingRepository.getAllSettings();
      
      // Convert flat settings to nested structure
      const settings = this.settingsService.buildSettingsObject(rawSettings);
      
      // Merge with defaults to ensure all required fields exist
      const mergedSettings = this.settingsService.mergeWithDefaults(settings);
      
      return mergedSettings;
    } catch (error) {
      dbLogger.error('Error getting all settings:', error);
      throw error;
    }
  }

  private async updateSettings(event: IpcMainInvokeEvent, settings: Partial<Settings>): Promise<Settings> {
    try {
      dbLogger.info('Updating settings:', Object.keys(settings));
      
      // Flatten the nested settings object
      const flatSettings = this.settingsService.flattenSettings(settings);
      
      // Update each setting
      for (const [key, value] of Object.entries(flatSettings)) {
        const { type, category } = this.getSettingMetadata(key, value);
        await this.settingRepository.setSetting(key, value, type, category);
        
        // Handle special settings
        await this.handleSpecialSetting(key, value);
      }
      
      // Return updated settings
      return await this.getAllSettings(event);
    } catch (error) {
      dbLogger.error('Error updating settings:', error);
      throw error;
    }
  }

  private async resetSettings(event: IpcMainInvokeEvent): Promise<Settings> {
    try {
      dbLogger.info('Resetting all settings to defaults');
      
      // Clear all existing settings
      await this.settingRepository.deleteAll();
      
      // Initialize with defaults
      await this.settingRepository.initializeDefaultSettings();
      
      // Set the structured default settings
      const flatDefaults = this.settingsService.flattenSettings(defaultSettings);
      
      for (const [key, value] of Object.entries(flatDefaults)) {
        const { type, category } = this.getSettingMetadata(key, value);
        await this.settingRepository.setSetting(key, value, type, category);
      }
      
      // Re-register shortcuts and apply settings
      await this.applyAllSettings();
      
      return await this.getAllSettings(event);
    } catch (error) {
      dbLogger.error('Error resetting settings:', error);
      throw error;
    }
  }

  private async exportSettings(event: IpcMainInvokeEvent, filePath: string): Promise<boolean> {
    try {
      dbLogger.info(`Exporting settings to: ${filePath}`);
      
      const settings = await this.getAllSettings(event);
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        settings,
      };
      
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
      
      dbLogger.info('Settings exported successfully');
      return true;
    } catch (error) {
      dbLogger.error('Error exporting settings:', error);
      return false;
    }
  }

  private async importSettings(event: IpcMainInvokeEvent, filePath: string): Promise<Settings> {
    try {
      dbLogger.info(`Importing settings from: ${filePath}`);
      
      const fileContent = await fs.readFile(filePath, 'utf8');
      const importData = JSON.parse(fileContent);
      
      if (!importData.settings) {
        throw new Error('Invalid settings file format');
      }
      
      // Validate and update settings
      const settings = this.settingsService.validateImportedSettings(importData.settings);
      
      return await this.updateSettings(event, settings);
    } catch (error) {
      dbLogger.error('Error importing settings:', error);
      throw error;
    }
  }

  private async validateShortcut(event: IpcMainInvokeEvent, shortcut: string): Promise<boolean> {
    try {
      // Check if shortcut is already registered
      const isRegistered = globalShortcut.isRegistered(shortcut);
      
      if (isRegistered) {
        return false;
      }
      
      // Try to register temporarily to check if it's valid
      try {
        const success = globalShortcut.register(shortcut, () => {
          // Temporary handler
        });
        
        if (success) {
          // Unregister immediately since this was just a test
          globalShortcut.unregister(shortcut);
          return true;
        }
        
        return false;
      } catch (error) {
        return false;
      }
    } catch (error) {
      dbLogger.error('Error validating shortcut:', error);
      return false;
    }
  }

  private getSettingMetadata(key: string, value: any): { type: string; category: string } {
    // Determine type based on value
    let type: string;
    if (typeof value === 'boolean') {
      type = 'boolean';
    } else if (typeof value === 'number') {
      type = 'number';
    } else if (typeof value === 'object') {
      type = 'json';
    } else {
      type = 'string';
    }
    
    // Determine category based on key prefix
    let category: string;
    if (key.startsWith('profile.')) {
      category = 'profile';
    } else if (key.startsWith('appearance.')) {
      category = 'appearance';
    } else if (key.startsWith('notifications.')) {
      category = 'notifications';
    } else if (key.startsWith('shortcuts.')) {
      category = 'shortcuts';
    } else if (key.startsWith('privacy.')) {
      category = 'privacy';
    } else if (key.startsWith('backup.')) {
      category = 'backup';
    } else if (key.startsWith('integrations.')) {
      category = 'integrations';
    } else {
      category = 'general';
    }
    
    return { type, category };
  }

  private async handleSpecialSetting(key: string, value: any): Promise<void> {
    try {
      // Handle keyboard shortcuts
      if (key.startsWith('shortcuts.')) {
        await this.settingsService.updateKeyboardShortcut(key, value);
      }
      
      // Handle theme changes
      if (key === 'appearance.theme') {
        await this.settingsService.applyTheme(value);
      }
      
      // Handle notification settings
      if (key.startsWith('notifications.')) {
        await this.settingsService.updateNotificationSettings(key, value);
      }
      
      // Handle backup settings
      if (key.startsWith('backup.')) {
        await this.settingsService.updateBackupSettings(key, value);
      }
      
      // Handle integration settings
      if (key.startsWith('integrations.')) {
        await this.settingsService.updateIntegrationSettings(key, value);
      }
    } catch (error) {
      dbLogger.error('Error handling special setting:', error);
      // Don't throw here - we don't want setting updates to fail due to special handling issues
    }
  }

  private async applyAllSettings(): Promise<void> {
    try {
      const settings = await this.settingRepository.getAllSettings();
      
      // Apply keyboard shortcuts
      for (const [key, value] of Object.entries(settings)) {
        if (key.startsWith('shortcuts.')) {
          await this.settingsService.updateKeyboardShortcut(key, value);
        }
      }
      
      dbLogger.info('All settings applied successfully');
    } catch (error) {
      dbLogger.error('Error applying settings:', error);
    }
  }

  // Initialize settings on app startup
  async initialize(): Promise<void> {
    try {
      dbLogger.info('Initializing settings handlers');
      
      // Initialize default settings if they don't exist
      await this.settingRepository.initializeDefaultSettings();
      
      // Apply current settings
      await this.applyAllSettings();
      
      dbLogger.info('Settings handlers initialized successfully');
    } catch (error) {
      dbLogger.error('Error initializing settings handlers:', error);
      throw error;
    }
  }
}