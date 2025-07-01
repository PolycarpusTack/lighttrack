import { IPCRegistry } from './IPCRegistry';
import { ActivityHandlers } from './handlers/ActivityHandlers';
import { ProjectHandlers } from './handlers/ProjectHandlers';
import { GoalHandlers } from './handlers/goalHandlers';
import { BackgroundServicesHandlers } from './handlers/BackgroundServicesHandlers';
import { SettingsHandlers } from './handlers/SettingsHandlers';
import { ActivityService } from '../services/ActivityService';
import { SeedingService } from '../services/SeedingService';
import { ipcLogger } from '../utils/logger';

let ipcRegistry: IPCRegistry;

export async function initializeIPC(): Promise<void> {
  try {
    ipcRegistry = new IPCRegistry();
    
    // Seed default data
    const seedingService = SeedingService.getInstance();
    await seedingService.seedDefaultData();
    
    // Initialize services
    const activityService = ActivityService.getInstance();
    await activityService.initialize();
    
    // Create handlers
    const activityHandlers = new ActivityHandlers(activityService);
    const projectHandlers = new ProjectHandlers();
    const goalHandlers = new GoalHandlers();
    const backgroundServicesHandlers = new BackgroundServicesHandlers();
    const settingsHandlers = new SettingsHandlers();
    
    // Initialize settings handlers
    await settingsHandlers.initialize();
    
    // Register all handlers
    ipcRegistry.register([
      ...activityHandlers.getHandlers(),
      ...projectHandlers.getHandlers(),
      ...goalHandlers.getHandlers(),
      ...backgroundServicesHandlers.getHandlers(),
      ...settingsHandlers.getHandlers(),
    ]);
    
    ipcLogger.info(`IPC initialized with ${ipcRegistry.getRegisteredChannels().length} handlers`);
    
  } catch (error) {
    ipcLogger.error('Failed to initialize IPC:', error);
    throw error;
  }
}

export function shutdownIPC(): void {
  if (ipcRegistry) {
    ipcRegistry.unregisterAll();
    ipcLogger.info('IPC shutdown completed');
  }
}

export function getIPCRegistry(): IPCRegistry {
  return ipcRegistry;
}