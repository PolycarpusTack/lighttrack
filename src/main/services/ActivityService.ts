// External imports
import { EventEmitter } from 'events';

// Internal imports - database
import { Activity as ActivityEntity } from '../database/entities/Activity';
import { getActivityRepository, getProjectRepository, getTagRepository } from '../database/repositories';

// Internal imports - shared
import { Activity as ActivityDto } from '@shared/types/activity';

// Internal imports - services
import { ActivityMapper } from '../mappers/ActivityMapper';
import { ExportService } from './ExportService';
import { serviceLogger } from '../utils/logger';
import { getActiveWindow, ActiveWindowInfo } from '../utils/activeWindow';

// Internal imports - constants and errors
import { TIMER_INTERVAL_MS, ERROR_MESSAGES, DEFAULT_PROJECT_ID } from '../constants';
import { NotFoundError, ValidationError, ConflictError } from '../errors';

export interface ActivityData {
  name: string;
  description?: string;
  projectId?: string;
  categoryId?: string;
  tags?: string[];
  isManualEntry?: boolean;
  startTime?: Date;
  endTime?: Date;
}

export interface ActivityFilter {
  projectId?: string;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  isManualEntry?: boolean;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  activities: string[];
  includeDetails?: boolean;
  groupBy?: 'none' | 'project' | 'date' | 'category';
}

export interface ExportResult {
  filePath: string;
  fileSize: number;
  activityCount: number;
  format: string;
}

export class ActivityService extends EventEmitter {
  private static instance: ActivityService;
  private activityRepository = getActivityRepository();
  private projectRepository = getProjectRepository();
  private tagRepository = getTagRepository();
  private currentActivity: ActivityEntity | null = null;
  private updateTimer: NodeJS.Timeout | null = null;
  private windowTrackingTimer: NodeJS.Timeout | null = null;
  private lastWindowInfo: ActiveWindowInfo | null = null;

  private constructor() {
    super();
  }

  static getInstance(): ActivityService {
    if (!ActivityService.instance) {
      ActivityService.instance = new ActivityService();
    }
    return ActivityService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load current activity if exists
      this.currentActivity = await this.activityRepository.findCurrentActivity();
      
      // Ensure default project exists
      await this.projectRepository.createDefaultProject();
      
      serviceLogger.info('ActivityService initialized');
    } catch (error) {
      serviceLogger.error('Failed to initialize ActivityService:', error);
      throw error;
    }
  }

  /**
   * Starts a new activity, automatically stopping any currently running activity
   * @param data - Activity data including name, project, and optional metadata
   * @returns The newly created activity
   * @throws {NotFoundError} If the specified project doesn't exist
   */
  async startActivity(data: ActivityData): Promise<ActivityDto> {
    try {
      // Stop current activity if exists
      if (this.currentActivity) {
        await this.stopActivity(this.currentActivity.id);
      }

      // Validate project exists
      const projectId = data.projectId || DEFAULT_PROJECT_ID;
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Create tags if needed
      const tags = [];
      if (data.tags && data.tags.length > 0) {
        for (const tagName of data.tags) {
          const tag = await this.tagRepository.findOrCreate(tagName);
          tags.push(tag);
        }
      }

      // Create activity
      const activity = await this.activityRepository.create({
        name: data.name,
        description: data.description,
        projectId,
        categoryId: data.categoryId,
        startTime: data.startTime || new Date(),
        isManualEntry: data.isManualEntry || false,
        tags,
      });

      this.currentActivity = activity;
      this.startUpdateTimer();
      this.startWindowTracking();
      
      const activityDto = ActivityMapper.toDto(activity);
      this.emit('activity:started', activityDto);
      
      serviceLogger.info(`Started activity: ${activity.name}`);
      return activityDto;
    } catch (error) {
      serviceLogger.error('Failed to start activity:', error);
      throw error;
    }
  }

  /**
   * Stops a running activity and calculates its final duration
   * @param activityId - ID of the activity to stop
   * @returns The stopped activity with updated end time and duration
   * @throws {NotFoundError} If the activity doesn't exist
   */
  async stopActivity(activityId: string): Promise<ActivityDto> {
    try {
      const activity = await this.activityRepository.stopActivity(activityId);
      if (!activity) {
        throw new NotFoundError('Activity', activityId);
      }

      if (this.currentActivity?.id === activityId) {
        this.currentActivity = null;
        this.stopUpdateTimer();
        this.stopWindowTracking();
      }

      const activityDto = ActivityMapper.toDto(activity);
      this.emit('activity:stopped', activityDto);
      
      serviceLogger.info(`Stopped activity: ${activity.name}`);
      return activityDto;
    } catch (error) {
      serviceLogger.error('Failed to stop activity:', error);
      throw error;
    }
  }

  async pauseActivity(activityId?: string): Promise<ActivityDto> {
    try {
      const id = activityId || this.currentActivity?.id;
      if (!id) {
        throw new ValidationError('No activity to pause');
      }

      const activity = await this.activityRepository.pauseActivity(id);
      if (!activity) {
        throw new ValidationError('Failed to pause activity - activity may not be running');
      }

      // Stop window tracking when paused
      if (this.currentActivity?.id === id) {
        this.stopWindowTracking();
      }

      const activityDto = ActivityMapper.toDto(activity);
      this.emit('activity:paused', activityDto);
      
      serviceLogger.info(`Paused activity: ${activity.name}`);
      return activityDto;
    } catch (error) {
      serviceLogger.error('Failed to pause activity:', error);
      throw error;
    }
  }

  async resumeActivity(activityId?: string): Promise<ActivityDto> {
    try {
      const id = activityId || this.currentActivity?.id;
      if (!id) {
        throw new ValidationError('No activity to resume');
      }

      const activity = await this.activityRepository.resumeActivity(id);
      if (!activity) {
        throw new ValidationError('Failed to resume activity - activity may not be paused');
      }

      // Restart window tracking when resumed
      if (this.currentActivity?.id === id) {
        this.startWindowTracking();
      }

      const activityDto = ActivityMapper.toDto(activity);
      this.emit('activity:resumed', activityDto);
      
      serviceLogger.info(`Resumed activity: ${activity.name}`);
      return activityDto;
    } catch (error) {
      serviceLogger.error('Failed to resume activity:', error);
      throw error;
    }
  }

  async getCurrentActivity(): Promise<ActivityDto | null> {
    try {
      return this.currentActivity ? ActivityMapper.toDto(this.currentActivity) : null;
    } catch (error) {
      serviceLogger.error('Failed to get current activity:', error);
      throw error;
    }
  }

  async getTodayActivities(): Promise<ActivityDto[]> {
    try {
      const activities = await this.activityRepository.findTodayActivities();
      return ActivityMapper.toDtoArray(activities);
    } catch (error) {
      serviceLogger.error('Failed to get today activities:', error);
      throw error;
    }
  }

  async getActivityById(id: string): Promise<ActivityDto | null> {
    try {
      const activity = await this.activityRepository.findById(id);
      return activity ? ActivityMapper.toDto(activity) : null;
    } catch (error) {
      serviceLogger.error('Failed to get activity by id:', error);
      throw error;
    }
  }

  async getActivitiesByIds(ids: string[]): Promise<ActivityDto[]> {
    try {
      const activities = await this.activityRepository.findByIds(ids);
      return ActivityMapper.toDtoArray(activities);
    } catch (error) {
      serviceLogger.error('Failed to get activities by ids:', error);
      throw error;
    }
  }

  async getFilteredActivities(filter: ActivityFilter): Promise<ActivityDto[]> {
    try {
      if (filter.startDate && filter.endDate) {
        const activities = await this.activityRepository.findByDateRange(
          filter.startDate,
          filter.endDate
        );
        
        // Apply additional filters
        const filteredActivities = activities.filter(activity => {
          if (filter.projectId && activity.projectId !== filter.projectId) return false;
          if (filter.categoryId && activity.categoryId !== filter.categoryId) return false;
          if (filter.isManualEntry !== undefined && activity.isManualEntry !== filter.isManualEntry) return false;
          if (filter.tags && filter.tags.length > 0) {
            const activityTagNames = activity.tags.map(t => t.name);
            if (!filter.tags.some(tag => activityTagNames.includes(tag))) return false;
          }
          return true;
        });
        return ActivityMapper.toDtoArray(filteredActivities);
      }
      
      // If no date range, get all and filter
      const activities = await this.activityRepository.findAll();
      return ActivityMapper.toDtoArray(activities);
    } catch (error) {
      serviceLogger.error('Failed to get filtered activities:', error);
      throw error;
    }
  }

  async updateActivity(id: string, data: Partial<ActivityData>): Promise<ActivityDto> {
    try {
      // Handle tags separately if provided
      let tags;
      if (data.tags) {
        tags = [];
        for (const tagName of data.tags) {
          const tag = await this.tagRepository.findOrCreate(tagName);
          tags.push(tag);
        }
      }

      const updateData: any = { ...data };
      if (tags) {
        updateData.tags = tags;
      }
      delete updateData.tags;

      const activity = await this.activityRepository.update(id, updateData);
      if (!activity) {
        throw new NotFoundError('Activity', id);
      }

      const activityDto = ActivityMapper.toDto(activity);
      this.emit('activity:updated', activityDto);
      
      serviceLogger.info(`Updated activity: ${activity.name}`);
      return activityDto;
    } catch (error) {
      serviceLogger.error('Failed to update activity:', error);
      throw error;
    }
  }

  async deleteActivity(id: string): Promise<boolean> {
    try {
      const result = await this.activityRepository.softDelete(id);
      
      if (result) {
        this.emit('activity:deleted', id);
        serviceLogger.info(`Deleted activity: ${id}`);
      }
      
      return result;
    } catch (error) {
      serviceLogger.error('Failed to delete activity:', error);
      throw error;
    }
  }

  /**
   * Merges multiple activities into a single activity
   * @param activityIds - Array of activity IDs to merge (minimum 2)
   * @returns The merged activity combining all durations and metadata
   * @throws {ValidationError} If less than 2 activities provided
   * @throws {NotFoundError} If any activity doesn't exist
   * @throws {ConflictError} If activities belong to different projects
   */
  async mergeActivities(activityIds: string[]): Promise<ActivityDto> {
    try {
      if (activityIds.length < 2) {
        throw new ValidationError('Need at least 2 activities to merge');
      }

      const activities = await this.activityRepository.findByIds(activityIds);
      if (activities.length !== activityIds.length) {
        throw new NotFoundError('Activity');
      }

      // Check all activities belong to same project
      const projectIds = new Set(activities.map(a => a.projectId));
      if (projectIds.size > 1) {
        throw new ConflictError(ERROR_MESSAGES.MERGE_DIFFERENT_PROJECTS);
      }

      // Merge activity data
      const firstActivity = activities[0];
      const mergedName = activities.map(a => a.name).join(' + ');
      const mergedDescription = activities
        .map(a => a.description)
        .filter(Boolean)
        .join('\n\n');

      const mergedActivity = await this.activityRepository.mergeActivities(
        activityIds,
        {
          name: mergedName,
          description: mergedDescription || undefined,
          projectId: firstActivity.projectId,
          categoryId: firstActivity.categoryId,
        }
      );

      const mergedActivityDto = ActivityMapper.toDto(mergedActivity);
      this.emit('activities:merged', {
        mergedActivity: mergedActivityDto,
        originalIds: activityIds,
      });
      
      serviceLogger.info(`Merged ${activityIds.length} activities into ${mergedActivity.id}`);
      return mergedActivityDto;
    } catch (error) {
      serviceLogger.error('Failed to merge activities:', error);
      throw error;
    }
  }

  /**
   * Splits an activity into two activities at the specified time
   * @param activityId - ID of the activity to split
   * @param splitTime - ISO timestamp where to split the activity
   * @returns Array containing the two resulting activities
   * @throws {ValidationError} If split time is outside activity duration
   */
  async splitActivity(activityId: string, splitTime: string): Promise<ActivityDto[]> {
    try {
      const splitDate = new Date(splitTime);
      const activities = await this.activityRepository.splitActivity(activityId, splitDate);
      
      const activitiesDto = ActivityMapper.toDtoArray(activities);
      this.emit('activity:split', {
        originalId: activityId,
        newActivities: activitiesDto,
      });
      
      serviceLogger.info(`Split activity ${activityId} at ${splitTime}`);
      return activitiesDto;
    } catch (error) {
      serviceLogger.error('Failed to split activity:', error);
      throw error;
    }
  }

  async bulkUpdateActivities(
    activityIds: string[],
    updates: Partial<ActivityData>
  ): Promise<ActivityDto[]> {
    try {
      const updatedActivities: ActivityDto[] = [];
      
      for (const id of activityIds) {
        const activity = await this.updateActivity(id, updates);
        updatedActivities.push(activity);
      }
      
      this.emit('activities:bulkUpdated', {
        activityIds,
        updates,
      });
      
      serviceLogger.info(`Bulk updated ${activityIds.length} activities`);
      return updatedActivities;
    } catch (error) {
      serviceLogger.error('Failed to bulk update activities:', error);
      throw error;
    }
  }

  async bulkDeleteActivities(activityIds: string[]): Promise<number> {
    try {
      let deletedCount = 0;
      
      for (const id of activityIds) {
        const result = await this.deleteActivity(id);
        if (result) deletedCount++;
      }
      
      this.emit('activities:bulkDeleted', {
        activityIds,
        count: deletedCount,
      });
      
      serviceLogger.info(`Bulk deleted ${deletedCount} activities`);
      return deletedCount;
    } catch (error) {
      serviceLogger.error('Failed to bulk delete activities:', error);
      throw error;
    }
  }

  async exportActivities(options: ExportOptions): Promise<ExportResult> {
    try {
      // Get activities to export
      const activities = await this.getActivitiesByIds(options.activities);
      
      // Use the real export service
      const exportService = ExportService.getInstance();
      const result = await exportService.exportActivities(activities, options);
      
      this.emit('activities:exported', result);
      
      serviceLogger.info(`Exported ${options.activities.length} activities as ${options.format}`);
      return result;
    } catch (error) {
      serviceLogger.error('Failed to export activities:', error);
      throw error;
    }
  }

  async getProductivityStats(startDate: Date, endDate: Date): Promise<any> {
    try {
      return await this.activityRepository.getProductivityStats(startDate, endDate);
    } catch (error) {
      serviceLogger.error('Failed to get productivity stats:', error);
      throw error;
    }
  }

  private startUpdateTimer(): void {
    this.updateTimer = setInterval(() => {
      if (this.currentActivity && !this.currentActivity.isPaused) {
        this.emit('activity:tick', this.currentActivity);
      }
    }, TIMER_INTERVAL_MS);
  }

  private stopUpdateTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Start tracking the active window/application
   * Updates activity metadata with application info
   */
  private startWindowTracking(): void {
    // Track immediately on start
    this.trackActiveWindow();
    
    // Then track every 5 seconds
    this.windowTrackingTimer = setInterval(() => {
      this.trackActiveWindow();
    }, 5000);
  }

  /**
   * Stop tracking the active window
   */
  private stopWindowTracking(): void {
    if (this.windowTrackingTimer) {
      clearInterval(this.windowTrackingTimer);
      this.windowTrackingTimer = null;
    }
    this.lastWindowInfo = null;
  }

  /**
   * Track the currently active window and update activity
   */
  private async trackActiveWindow(): Promise<void> {
    try {
      if (!this.currentActivity || this.currentActivity.isPaused) {
        return;
      }

      const windowInfo = await getActiveWindow();
      
      if (!windowInfo) {
        return;
      }

      // Check if window info has changed
      const hasChanged = !this.lastWindowInfo ||
        this.lastWindowInfo.app !== windowInfo.app ||
        this.lastWindowInfo.title !== windowInfo.title;

      if (hasChanged) {
        this.lastWindowInfo = windowInfo;
        
        // Update activity with window information
        await this.activityRepository.update(this.currentActivity.id, {
          applicationName: windowInfo.app,
          windowTitle: windowInfo.title,
          metadata: {
            ...this.currentActivity.metadata,
            lastWindowUpdate: new Date(),
            applicationPath: windowInfo.path,
          }
        });

        // Emit window change event
        this.emit('activity:windowChanged', {
          activityId: this.currentActivity.id,
          windowInfo,
        });

        serviceLogger.debug(`Window tracked: ${windowInfo.app} - ${windowInfo.title}`);
      }
    } catch (error) {
      serviceLogger.error('Failed to track active window:', error);
    }
  }
}