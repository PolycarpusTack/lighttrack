import { BaseRepository } from './BaseRepository';
import { Setting, SettingCategory } from '../entities/Setting';
import { dbLogger } from '../../utils/logger';

export class SettingRepository extends BaseRepository<Setting> {
  constructor() {
    super(Setting);
  }

  async getSetting<T = any>(key: string): Promise<T | null> {
    try {
      const setting = await this.repository.findOne({ where: { key } });
      return setting ? setting.getValue<T>() : null;
    } catch (error) {
      dbLogger.error('Error getting setting:', error);
      throw error;
    }
  }

  async setSetting(key: string, value: any, type: Setting['type'], category: SettingCategory): Promise<Setting> {
    try {
      let setting = await this.repository.findOne({ where: { key } });
      
      if (setting) {
        setting.setValue(value);
        return await this.repository.save(setting);
      } else {
        setting = this.repository.create({
          key,
          type,
          category,
        });
        setting.setValue(value);
        return await this.repository.save(setting);
      }
    } catch (error) {
      dbLogger.error('Error setting setting:', error);
      throw error;
    }
  }

  async getSettingsByCategory(category: SettingCategory): Promise<Setting[]> {
    try {
      return await this.repository.find({
        where: { category },
        order: { key: 'ASC' },
      });
    } catch (error) {
      dbLogger.error('Error getting settings by category:', error);
      throw error;
    }
  }

  async getAllSettings(): Promise<Record<string, any>> {
    try {
      const settings = await this.repository.find();
      const result: Record<string, any> = {};
      
      settings.forEach(setting => {
        result[setting.key] = setting.getValue();
      });
      
      return result;
    } catch (error) {
      dbLogger.error('Error getting all settings:', error);
      throw error;
    }
  }

  async initializeDefaultSettings(): Promise<void> {
    try {
      const defaults: Array<{
        key: string;
        value: any;
        type: Setting['type'];
        category: SettingCategory;
      }> = [
        // General settings
        { key: 'app.theme', value: 'dark', type: 'string', category: 'appearance' },
        { key: 'app.language', value: 'en', type: 'string', category: 'general' },
        { key: 'app.firstRun', value: true, type: 'boolean', category: 'general' },
        
        // Tracking settings
        { key: 'tracking.autoStart', value: false, type: 'boolean', category: 'tracking' },
        { key: 'tracking.idleThreshold', value: 300, type: 'number', category: 'tracking' }, // 5 minutes
        { key: 'tracking.reminderInterval', value: 3600, type: 'number', category: 'tracking' }, // 1 hour
        { key: 'tracking.defaultProject', value: 'default', type: 'string', category: 'tracking' },
        
        // Export settings
        { key: 'export.defaultFormat', value: 'csv', type: 'string', category: 'export' },
        { key: 'export.includeDetails', value: true, type: 'boolean', category: 'export' },
        { key: 'export.dateFormat', value: 'YYYY-MM-DD', type: 'string', category: 'export' },
        
        // Notification settings
        { key: 'notifications.enabled', value: true, type: 'boolean', category: 'notifications' },
        { key: 'notifications.sound', value: true, type: 'boolean', category: 'notifications' },
        { key: 'notifications.idleReminder', value: true, type: 'boolean', category: 'notifications' },
      ];

      for (const { key, value, type, category } of defaults) {
        const exists = await this.repository.findOne({ where: { key } });
        if (!exists) {
          await this.setSetting(key, value, type, category);
        }
      }
      
      dbLogger.info('Default settings initialized');
    } catch (error) {
      dbLogger.error('Error initializing default settings:', error);
      throw error;
    }
  }
}