import { getProjectRepository, getSettingRepository, getTagRepository } from '../database/repositories';
import { serviceLogger } from '../utils/logger';

/**
 * Service for initializing and seeding database with default data
 * Ensures proper initial state for first-time users
 */
export class SeedingService {
  private static instance: SeedingService;
  
  /**
   * Get the singleton instance of SeedingService
   * @returns {SeedingService} The service instance
   */
  static getInstance(): SeedingService {
    if (!SeedingService.instance) {
      SeedingService.instance = new SeedingService();
    }
    return SeedingService.instance;
  }

  /**
   * Seed all default data including project, settings, and tags
   * Safe to run multiple times - checks for existing data
   */
  async seedDefaultData(): Promise<void> {
    try {
      await this.seedDefaultProject();
      await this.seedDefaultSettings();
      await this.seedDefaultTags();
      
      serviceLogger.info('Default data seeding completed');
    } catch (error) {
      serviceLogger.error('Failed to seed default data:', error);
      throw error;
    }
  }

  /**
   * Create the default "General" project if it doesn't exist
   * @private
   */
  private async seedDefaultProject(): Promise<void> {
    const projectRepository = getProjectRepository();
    
    // Check if default project already exists
    const defaultProject = await projectRepository.findById('default');
    if (defaultProject) {
      serviceLogger.debug('Default project already exists');
      return;
    }

    // Create default project
    await projectRepository.create({
      id: 'default',
      name: 'General',
      description: 'Default project for general activities',
      color: '#00bcd4',
      isArchived: false,
      isDeleted: false,
      currency: 'USD',
      metadata: {
        isDefault: true,
        settings: {
          billable: false,
          currency: 'USD',
          timeGoals: {
            daily: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
            weekly: 40 * 60 * 60 * 1000, // 40 hours in milliseconds
          },
          notifications: {
            dailyReport: true,
            weeklyReport: false,
            goalAlerts: true,
          },
          integrations: {},
        },
      },
    });

    serviceLogger.info('Created default project');
  }

  /**
   * Initialize all default application settings
   * @private
   */
  private async seedDefaultSettings(): Promise<void> {
    const settingRepository = getSettingRepository();
    
    // Initialize all default settings
    await settingRepository.initializeDefaultSettings();
    
    serviceLogger.info('Initialized default settings');
  }

  /**
   * Create default tags for common activity types
   * @private
   */
  private async seedDefaultTags(): Promise<void> {
    const tagRepository = getTagRepository();
    
    const defaultTags = [
      { name: 'development', color: '#4caf50' },
      { name: 'meeting', color: '#ff9800' },
      { name: 'planning', color: '#2196f3' },
      { name: 'research', color: '#9c27b0' },
      { name: 'documentation', color: '#607d8b' },
      { name: 'testing', color: '#f44336' },
      { name: 'bugfix', color: '#e91e63' },
      { name: 'review', color: '#673ab7' },
    ];

    for (const tagData of defaultTags) {
      const existingTag = await tagRepository.findByName(tagData.name);
      if (!existingTag) {
        await tagRepository.create(tagData);
        serviceLogger.debug(`Created default tag: ${tagData.name}`);
      }
    }

    serviceLogger.info('Created default tags');
  }

  /**
   * Create sample project and data for demonstration purposes
   * Useful for onboarding or testing
   */
  async seedSampleData(): Promise<void> {
    try {
      // Create a sample project
      const projectRepository = getProjectRepository();
      
      const sampleProject = await projectRepository.findByConditions({ name: 'Sample Project' });
      if (sampleProject.length === 0) {
        await projectRepository.create({
          name: 'Sample Project',
          description: 'A sample project to demonstrate LightTrack features',
          color: '#e91e63',
          isArchived: false,
          isDeleted: false,
          budgetHours: 40,
          hourlyRate: 75.00,
          currency: 'USD',
          metadata: {
            settings: {
              billable: true,
              currency: 'USD',
              hourlyRate: 75.00,
              timeGoals: {
                daily: 6 * 60 * 60 * 1000, // 6 hours
                weekly: 30 * 60 * 60 * 1000, // 30 hours
              },
              notifications: {
                dailyReport: true,
                weeklyReport: true,
                goalAlerts: true,
              },
              integrations: {
                github: {
                  repoUrl: 'https://github.com/example/sample-project',
                  defaultBranch: 'main',
                },
              },
            },
          },
        });

        serviceLogger.info('Created sample project');
      }

      // Note: We don't create sample activities here as they would have
      // current timestamps. Sample activities should be created by the user
      // or through a specific demo mode.
      
    } catch (error) {
      serviceLogger.error('Failed to seed sample data:', error);
      throw error;
    }
  }

  /**
   * Clear all application data (DANGEROUS - use with caution)
   * Currently disabled for safety - logs warning only
   */
  async clearAllData(): Promise<void> {
    try {
      serviceLogger.warn('Clearing all application data...');
      
      // This is a destructive operation - use with caution
      const projectRepository = getProjectRepository();
      const settingRepository = getSettingRepository();
      const tagRepository = getTagRepository();
      
      // Note: In a real implementation, you might want to use cascading deletes
      // or implement this at the database level for better performance
      
      // For now, we'll just log a warning as this is a dangerous operation
      serviceLogger.warn('Clear all data operation not implemented for safety');
      
    } catch (error) {
      serviceLogger.error('Failed to clear data:', error);
      throw error;
    }
  }
}