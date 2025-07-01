import { EventEmitter } from 'events';
import { ActivityService } from './ActivityService';
import { getActivityRepository } from '../database/repositories';
import { serviceLogger } from '../utils/logger';
import { AUTO_SAVE_INTERVAL_MS } from '../constants';

export interface AutoSaveState {
  isRunning: boolean;
  lastSaveTime: Date | null;
  pendingChanges: number;
  saveCount: number;
}

/**
 * Service for automatically saving activity progress and metadata
 * Ensures data persistence even if the application crashes
 */
export class AutoSaveService extends EventEmitter {
  private static instance: AutoSaveService;
  private activityService: ActivityService;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastSaveTime: Date | null = null;
  private pendingChanges: Set<string> = new Set();
  private saveCount: number = 0;
  private isSaving: boolean = false;

  private constructor() {
    super();
    this.activityService = ActivityService.getInstance();
    this.setupActivityListeners();
  }

  /**
   * Get the singleton instance of AutoSaveService
   * @returns {AutoSaveService} The service instance
   */
  static getInstance(): AutoSaveService {
    if (!AutoSaveService.instance) {
      AutoSaveService.instance = new AutoSaveService();
    }
    return AutoSaveService.instance;
  }

  /**
   * Start the auto-save service
   * Periodically saves pending changes to the database
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      serviceLogger.warn('Auto-save service already running');
      return;
    }

    try {
      this.isRunning = true;
      
      // Set up auto-save interval
      this.autoSaveInterval = setInterval(() => {
        this.performAutoSave();
      }, AUTO_SAVE_INTERVAL_MS);

      serviceLogger.info('Auto-save service started');
      this.emit('autosave:started');
    } catch (error) {
      serviceLogger.error('Failed to start auto-save service:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the auto-save service
   * Performs a final save before stopping
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Perform final save
    await this.performAutoSave();

    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    this.isRunning = false;
    serviceLogger.info('Auto-save service stopped');
    this.emit('autosave:stopped');
  }

  /**
   * Get current auto-save state
   * @returns Current state of the auto-save service
   */
  getState(): AutoSaveState {
    return {
      isRunning: this.isRunning,
      lastSaveTime: this.lastSaveTime,
      pendingChanges: this.pendingChanges.size,
      saveCount: this.saveCount,
    };
  }

  /**
   * Mark an activity as having pending changes
   * @param activityId - ID of the activity with changes
   */
  markActivityChanged(activityId: string): void {
    this.pendingChanges.add(activityId);
    this.emit('activity:marked', activityId);
  }

  /**
   * Force an immediate save of all pending changes
   */
  async forceSave(): Promise<void> {
    await this.performAutoSave();
  }

  /**
   * Set up listeners for activity events
   * @private
   */
  private setupActivityListeners(): void {
    // Listen to activity events that should trigger saves
    this.activityService.on('activity:tick', (activity) => {
      // Mark activity as changed on each tick (for duration updates)
      if (activity && activity.id) {
        this.markActivityChanged(activity.id);
      }
    });

    this.activityService.on('activity:paused', (activity) => {
      if (activity && activity.id) {
        this.markActivityChanged(activity.id);
      }
    });

    this.activityService.on('activity:resumed', (activity) => {
      if (activity && activity.id) {
        this.markActivityChanged(activity.id);
      }
    });

    this.activityService.on('activity:updated', (activity) => {
      if (activity && activity.id) {
        this.markActivityChanged(activity.id);
      }
    });
  }

  /**
   * Perform the auto-save operation
   * @private
   */
  private async performAutoSave(): Promise<void> {
    if (this.isSaving || this.pendingChanges.size === 0) {
      return;
    }

    this.isSaving = true;
    const startTime = Date.now();
    const activityIds = Array.from(this.pendingChanges);

    try {
      serviceLogger.debug(`Auto-saving ${activityIds.length} activities...`);
      
      // Get the activity repository
      const activityRepository = getActivityRepository();
      
      // Save each pending activity
      for (const activityId of activityIds) {
        try {
          // Get current activity state
          const activity = await this.activityService.getCurrentActivity();
          
          if (activity && activity.id === activityId && !activity.endTime) {
            // Update the activity's duration in the database
            const now = new Date();
            const duration = now.getTime() - new Date(activity.startTime).getTime();
            
            await activityRepository.update(activityId, {
              duration,
              updatedAt: now,
            });
            
            // Remove from pending changes
            this.pendingChanges.delete(activityId);
          } else {
            // Activity is no longer current or has ended
            this.pendingChanges.delete(activityId);
          }
        } catch (error) {
          serviceLogger.error(`Failed to auto-save activity ${activityId}:`, error);
          // Keep in pending changes for retry
        }
      }

      const savedCount = activityIds.length - this.pendingChanges.size;
      const duration = Date.now() - startTime;
      
      this.lastSaveTime = new Date();
      this.saveCount += savedCount;
      
      if (savedCount > 0) {
        serviceLogger.info(`Auto-saved ${savedCount} activities in ${duration}ms`);
        this.emit('autosave:completed', {
          savedCount,
          duration,
          timestamp: this.lastSaveTime,
        });
      }
    } catch (error) {
      serviceLogger.error('Auto-save failed:', error);
      this.emit('autosave:failed', error);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.removeAllListeners();
    this.pendingChanges.clear();
  }
}