import { IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { IPCHandler, createResponse, createErrorResponse } from '../IPCHandler';
import { GoalRepository } from '../../database/repositories/GoalRepository';
import { AchievementRepository } from '../../database/repositories/AchievementRepository';
import { GoalTracker } from '../../services/GoalTracker';
import { AchievementEngine } from '../../services/AchievementEngine';
import { ipcLogger } from '../../utils/logger';

export class GoalHandlers {
  private goalRepository = new GoalRepository();
  private achievementRepository = new AchievementRepository();
  private goalTracker = GoalTracker.getInstance();
  private achievementEngine = AchievementEngine.getInstance();
  
  getHandlers(): IPCHandler[] {
    return [
      // Basic CRUD operations
      {
        channel: 'goal:getAll',
        handler: this.getAllGoals.bind(this)
      },
      {
        channel: 'goal:getById',
        handler: this.getGoalById.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'goal:create',
        handler: this.createGoal.bind(this),
        validator: (args) => args[0]?.name && typeof args[0].name === 'string'
      },
      {
        channel: 'goal:update',
        handler: this.updateGoal.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string' && args[1]
      },
      {
        channel: 'goal:delete',
        handler: this.deleteGoal.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'goal:pause',
        handler: this.pauseGoal.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'goal:resume',
        handler: this.resumeGoal.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },

      // Progress tracking
      {
        channel: 'goal:getProgress',
        handler: this.getGoalProgress.bind(this)
      },
      {
        channel: 'goal:updateProgress',
        handler: this.updateGoalProgress.bind(this),
        validator: (args) => args[0] && args[1]
      },
      {
        channel: 'goal:checkProgress',
        handler: this.checkAllGoalProgress.bind(this)
      },

      // Achievement system
      {
        channel: 'goal:getAchievements',
        handler: this.getAchievements.bind(this)
      },
      {
        channel: 'goal:checkAchievements',
        handler: this.checkGoalAchievements.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'goal:markAchievementNotified',
        handler: this.markAchievementNotified.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },

      // Analytics and insights
      {
        channel: 'goal:getStats',
        handler: this.getGoalStats.bind(this)
      },
      {
        channel: 'goal:getInsights',
        handler: this.getGoalInsights.bind(this)
      },
      {
        channel: 'goal:getTodaysGoals',
        handler: this.getTodaysGoals.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'goal:getWeeklyGoals',
        handler: this.getWeeklyGoals.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },

      // Notifications
      {
        channel: 'goal:generateNotifications',
        handler: this.generateNotifications.bind(this)
      },
      {
        channel: 'goal:getAchievementSuggestions',
        handler: this.getAchievementSuggestions.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      }
    ];
  }

  private async getAllGoals(event: IpcMainInvokeEvent) {
    try {
      const goals = await this.goalRepository.findActive();
      return createResponse(goals);
    } catch (error) {
      const message = 'Failed to get all goals';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getGoalById(event: IpcMainInvokeEvent, id: string) {
    try {
      const goal = await this.goalRepository.findById(id);
      return createResponse(goal);
    } catch (error) {
      const message = 'Failed to get goal by id';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async createGoal(event: IpcMainInvokeEvent, goalData: any) {
    try {
      const goal = await this.goalRepository.create(goalData);
      
      // Notify all renderer windows
      this.broadcastUpdate('goal:created', goal);
      
      return createResponse(goal);
    } catch (error) {
      const message = 'Failed to create goal';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async updateGoal(event: IpcMainInvokeEvent, id: string, updates: any) {
    try {
      const goal = await this.goalRepository.update(id, updates);
      
      if (goal) {
        // Check for new achievements after update
        const newAchievements = await this.achievementEngine.checkAchievements(goal);
        
        // Notify all renderer windows
        this.broadcastUpdate('goal:updated', goal);
        
        if (newAchievements.length > 0) {
          this.broadcastUpdate('achievements:earned', newAchievements);
        }
      }
      
      return createResponse(goal);
    } catch (error) {
      const message = 'Failed to update goal';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async deleteGoal(event: IpcMainInvokeEvent, id: string) {
    try {
      // Delete related achievements first
      await this.achievementRepository.deleteByGoal(id);
      
      const result = await this.goalRepository.softDelete(id);
      
      if (result) {
        // Notify all renderer windows
        this.broadcastUpdate('goal:deleted', { id });
      }
      
      return createResponse(result);
    } catch (error) {
      const message = 'Failed to delete goal';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async pauseGoal(event: IpcMainInvokeEvent, id: string) {
    try {
      const goal = await this.goalRepository.pauseGoal(id);
      
      if (goal) {
        this.broadcastUpdate('goal:paused', goal);
      }
      
      return createResponse(goal);
    } catch (error) {
      const message = 'Failed to pause goal';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async resumeGoal(event: IpcMainInvokeEvent, id: string) {
    try {
      const goal = await this.goalRepository.resumeGoal(id);
      
      if (goal) {
        this.broadcastUpdate('goal:resumed', goal);
      }
      
      return createResponse(goal);
    } catch (error) {
      const message = 'Failed to resume goal';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getGoalProgress(event: IpcMainInvokeEvent) {
    try {
      const progressList = await this.goalTracker.checkGoalProgress();
      return createResponse(progressList);
    } catch (error) {
      const message = 'Failed to get goal progress';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async updateGoalProgress(event: IpcMainInvokeEvent, goalId: string, progressData: any) {
    try {
      const goal = await this.goalRepository.updateProgress(goalId, progressData);
      
      if (goal) {
        // Check for new achievements
        const newAchievements = await this.achievementEngine.checkAchievements(goal);
        
        // Broadcast progress update
        this.broadcastUpdate('goal:progressUpdated', { goalId, progress: progressData });
        
        if (newAchievements.length > 0) {
          this.broadcastUpdate('achievements:earned', newAchievements);
        }
      }
      
      return createResponse(goal);
    } catch (error) {
      const message = 'Failed to update goal progress';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async checkAllGoalProgress(event: IpcMainInvokeEvent) {
    try {
      const progressList = await this.goalTracker.checkGoalProgress();
      
      // Generate notifications for all goals
      const notifications = await this.goalTracker.createNotifications(progressList);
      
      if (notifications.length > 0) {
        this.broadcastUpdate('notifications:new', notifications);
      }
      
      return createResponse(progressList);
    } catch (error) {
      const message = 'Failed to check goal progress';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getAchievements(event: IpcMainInvokeEvent) {
    try {
      const achievements = await this.achievementRepository.findAll();
      return createResponse(achievements);
    } catch (error) {
      const message = 'Failed to get achievements';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async checkGoalAchievements(event: IpcMainInvokeEvent, goalId: string) {
    try {
      const goal = await this.goalRepository.findById(goalId);
      if (!goal) {
        throw new Error('Goal not found');
      }

      const newAchievements = await this.achievementEngine.checkAchievements(goal);
      
      if (newAchievements.length > 0) {
        this.broadcastUpdate('achievements:earned', newAchievements);
      }
      
      return createResponse(newAchievements);
    } catch (error) {
      const message = 'Failed to check goal achievements';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async markAchievementNotified(event: IpcMainInvokeEvent, achievementId: string) {
    try {
      await this.achievementRepository.markAsNotified([achievementId]);
      const achievement = await this.achievementRepository.findById(achievementId);
      return createResponse(achievement);
    } catch (error) {
      const message = 'Failed to mark achievement as notified';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getGoalStats(event: IpcMainInvokeEvent) {
    try {
      const stats = await this.goalTracker.getGoalStats();
      return createResponse(stats);
    } catch (error) {
      const message = 'Failed to get goal stats';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getGoalInsights(event: IpcMainInvokeEvent) {
    try {
      const insights = await this.goalTracker.generateInsights();
      return createResponse(insights);
    } catch (error) {
      const message = 'Failed to get goal insights';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getTodaysGoals(event: IpcMainInvokeEvent, userId: string) {
    try {
      const goals = await this.goalRepository.getTodaysGoals(userId);
      return createResponse(goals);
    } catch (error) {
      const message = 'Failed to get today\'s goals';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getWeeklyGoals(event: IpcMainInvokeEvent, userId: string) {
    try {
      const goals = await this.goalRepository.getWeeklyGoals(userId);
      return createResponse(goals);
    } catch (error) {
      const message = 'Failed to get weekly goals';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async generateNotifications(event: IpcMainInvokeEvent) {
    try {
      const progressList = await this.goalTracker.checkGoalProgress();
      const notifications = await this.goalTracker.createNotifications(progressList);
      
      return createResponse(notifications);
    } catch (error) {
      const message = 'Failed to generate notifications';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getAchievementSuggestions(event: IpcMainInvokeEvent, goalId: string) {
    try {
      const goal = await this.goalRepository.findById(goalId);
      if (!goal) {
        throw new Error('Goal not found');
      }

      const suggestions = await this.achievementEngine.generateAchievementSuggestions(goal);
      return createResponse(suggestions);
    } catch (error) {
      const message = 'Failed to get achievement suggestions';
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