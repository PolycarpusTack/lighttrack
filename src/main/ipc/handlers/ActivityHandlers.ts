import { IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { IPCHandler, createResponse, createErrorResponse } from '../IPCHandler';
import { ActivityService, ActivityData, ActivityFilter, ExportOptions } from '../../services/ActivityService';
import { ipcLogger } from '../../utils/logger';
import { isLightTrackError, getErrorMessage, IPCError } from '../../errors';

export class ActivityHandlers {
  private activityService: ActivityService;
  
  constructor(activityService: ActivityService) {
    this.activityService = activityService;
  }

  getHandlers(): IPCHandler[] {
    return [
      {
        channel: 'activity:start',
        handler: this.startActivity.bind(this),
        validator: (args) => args[0]?.name && typeof args[0].name === 'string'
      },
      {
        channel: 'activity:stop',
        handler: this.stopActivity.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'activity:pause',
        handler: this.pauseActivity.bind(this)
      },
      {
        channel: 'activity:resume',
        handler: this.resumeActivity.bind(this)
      },
      {
        channel: 'activity:getCurrent',
        handler: this.getCurrentActivity.bind(this)
      },
      {
        channel: 'activity:getTodayActivities',
        handler: this.getTodayActivities.bind(this)
      },
      {
        channel: 'activity:getById',
        handler: this.getActivityById.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'activity:getByIds',
        handler: this.getActivitiesByIds.bind(this),
        validator: (args) => Array.isArray(args[0])
      },
      {
        channel: 'activity:getFiltered',
        handler: this.getFilteredActivities.bind(this)
      },
      {
        channel: 'activity:add',
        handler: this.addActivity.bind(this),
        validator: (args) => args[0]?.name && typeof args[0].name === 'string'
      },
      {
        channel: 'activity:update',
        handler: this.updateActivity.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string' && args[1]
      },
      {
        channel: 'activity:delete',
        handler: this.deleteActivity.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'activity:merge',
        handler: this.mergeActivities.bind(this),
        validator: (args) => Array.isArray(args[0]) && args[0].length >= 2
      },
      {
        channel: 'activity:split',
        handler: this.splitActivity.bind(this),
        validator: (args) => args[0] && args[1] && new Date(args[1]).getTime() > 0
      },
      {
        channel: 'activity:export',
        handler: this.exportActivities.bind(this)
      },
      {
        channel: 'activity:bulkUpdate',
        handler: this.bulkUpdateActivities.bind(this),
        validator: (args) => Array.isArray(args[0]) && args[1]
      },
      {
        channel: 'activity:bulkDelete',
        handler: this.bulkDeleteActivities.bind(this),
        validator: (args) => Array.isArray(args[0])
      },
      {
        channel: 'activity:getProductivityStats',
        handler: this.getProductivityStats.bind(this),
        validator: (args) => args[0] && args[1] && new Date(args[0]).getTime() > 0 && new Date(args[1]).getTime() > 0
      }
    ];
  }

  private async startActivity(event: IpcMainInvokeEvent, data: ActivityData) {
    try {
      const activity = await this.activityService.startActivity(data);
      
      // Notify all renderer windows of the new activity
      this.broadcastUpdate('activity:started', activity);
      
      return createResponse(activity);
    } catch (error) {
      const message = getErrorMessage(error);
      ipcLogger.error('Failed to start activity', error);
      
      if (isLightTrackError(error)) {
        return createErrorResponse(message, error.code, error.statusCode);
      }
      return createErrorResponse(message);
    }
  }

  private async stopActivity(event: IpcMainInvokeEvent, activityId: string) {
    try {
      const activity = await this.activityService.stopActivity(activityId);
      
      // Notify all renderer windows
      this.broadcastUpdate('activity:stopped', activity);
      
      return createResponse(activity);
    } catch (error) {
      const message = 'Failed to stop activity';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async pauseActivity(event: IpcMainInvokeEvent, activityId?: string) {
    try {
      const activity = await this.activityService.pauseActivity(activityId);
      
      // Notify all renderer windows
      this.broadcastUpdate('activity:paused', activity);
      
      return createResponse(activity);
    } catch (error) {
      const message = 'Failed to pause activity';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async resumeActivity(event: IpcMainInvokeEvent, activityId?: string) {
    try {
      const activity = await this.activityService.resumeActivity(activityId);
      
      // Notify all renderer windows
      this.broadcastUpdate('activity:resumed', activity);
      
      return createResponse(activity);
    } catch (error) {
      const message = 'Failed to resume activity';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getCurrentActivity(event: IpcMainInvokeEvent) {
    try {
      const activity = await this.activityService.getCurrentActivity();
      return createResponse(activity);
    } catch (error) {
      const message = 'Failed to get current activity';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getTodayActivities(event: IpcMainInvokeEvent) {
    try {
      const activities = await this.activityService.getTodayActivities();
      return createResponse(activities);
    } catch (error) {
      const message = 'Failed to get today activities';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getActivityById(event: IpcMainInvokeEvent, id: string) {
    try {
      const activity = await this.activityService.getActivityById(id);
      return createResponse(activity);
    } catch (error) {
      const message = 'Failed to get activity by id';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getActivitiesByIds(event: IpcMainInvokeEvent, ids: string[]) {
    try {
      const activities = await this.activityService.getActivitiesByIds(ids);
      return createResponse(activities);
    } catch (error) {
      const message = 'Failed to get activities by ids';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getFilteredActivities(event: IpcMainInvokeEvent, filter: ActivityFilter) {
    try {
      const activities = await this.activityService.getFilteredActivities(filter);
      return createResponse(activities);
    } catch (error) {
      const message = 'Failed to get filtered activities';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async addActivity(event: IpcMainInvokeEvent, data: ActivityData) {
    try {
      const activity = await this.activityService.startActivity(data);
      
      // For manual entries, stop immediately
      if (data.isManualEntry && data.endTime) {
        const stoppedActivity = await this.activityService.stopActivity(activity.id);
        this.broadcastUpdate('activity:added', stoppedActivity);
        return createResponse(stoppedActivity);
      }
      
      this.broadcastUpdate('activity:added', activity);
      return createResponse(activity);
    } catch (error) {
      const message = 'Failed to add activity';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async updateActivity(event: IpcMainInvokeEvent, id: string, data: Partial<ActivityData>) {
    try {
      const activity = await this.activityService.updateActivity(id, data);
      
      // Notify all renderer windows
      this.broadcastUpdate('activity:updated', activity);
      
      return createResponse(activity);
    } catch (error) {
      const message = 'Failed to update activity';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async deleteActivity(event: IpcMainInvokeEvent, id: string) {
    try {
      const result = await this.activityService.deleteActivity(id);
      
      if (result) {
        // Notify all renderer windows
        this.broadcastUpdate('activity:deleted', { id });
      }
      
      return createResponse(result);
    } catch (error) {
      const message = 'Failed to delete activity';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async mergeActivities(event: IpcMainInvokeEvent, activityIds: string[]) {
    try {
      const mergedActivity = await this.activityService.mergeActivities(activityIds);
      
      // Notify about merge
      this.broadcastUpdate('activities:merged', {
        mergedActivity,
        deletedIds: activityIds.filter(id => id !== mergedActivity.id)
      });
      
      return createResponse(mergedActivity);
    } catch (error) {
      const message = 'Failed to merge activities';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async splitActivity(event: IpcMainInvokeEvent, activityId: string, splitTime: string) {
    try {
      const newActivities = await this.activityService.splitActivity(activityId, splitTime);
      
      // Notify about split
      this.broadcastUpdate('activity:split', {
        originalId: activityId,
        newActivities
      });
      
      return createResponse(newActivities);
    } catch (error) {
      const message = 'Failed to split activity';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async exportActivities(event: IpcMainInvokeEvent, options: ExportOptions) {
    try {
      const result = await this.activityService.exportActivities(options);
      
      // Notify about export completion
      this.broadcastUpdate('activities:exported', result);
      
      return createResponse(result);
    } catch (error) {
      const message = 'Failed to export activities';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async bulkUpdateActivities(event: IpcMainInvokeEvent, activityIds: string[], updates: Partial<ActivityData>) {
    try {
      const updatedActivities = await this.activityService.bulkUpdateActivities(activityIds, updates);
      
      // Notify about bulk update
      this.broadcastUpdate('activities:bulkUpdated', {
        activityIds,
        activities: updatedActivities
      });
      
      return createResponse(updatedActivities);
    } catch (error) {
      const message = 'Failed to bulk update activities';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async bulkDeleteActivities(event: IpcMainInvokeEvent, activityIds: string[]) {
    try {
      const deletedCount = await this.activityService.bulkDeleteActivities(activityIds);
      
      // Notify about bulk delete
      this.broadcastUpdate('activities:bulkDeleted', {
        activityIds,
        count: deletedCount
      });
      
      return createResponse({ count: deletedCount });
    } catch (error) {
      const message = 'Failed to bulk delete activities';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getProductivityStats(event: IpcMainInvokeEvent, startDate: string, endDate: string) {
    try {
      const stats = await this.activityService.getProductivityStats(
        new Date(startDate),
        new Date(endDate)
      );
      return createResponse(stats);
    } catch (error) {
      const message = 'Failed to get productivity stats';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private broadcastUpdate(channel: string, data: any): void {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send(channel, data);
    });
  }
}