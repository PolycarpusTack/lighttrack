import { BaseRepository } from './BaseRepository';
import { Goal } from '../entities/Goal';
import { dbLogger } from '../../utils/logger';

export class GoalRepository extends BaseRepository<Goal> {
  constructor() {
    super(Goal);
  }

  async findActive(): Promise<Goal[]> {
    try {
      return await this.repository.find({
        where: {
          isActive: true,
        },
        relations: ['project', 'achievements'],
        order: {
          createdAt: 'DESC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding active goals:', error);
      throw error;
    }
  }

  async findByUser(userId: string): Promise<Goal[]> {
    try {
      return await this.repository.find({
        where: {
          userId,
        },
        relations: ['project', 'achievements'],
        order: {
          createdAt: 'DESC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding goals by user:', error);
      throw error;
    }
  }

  async findByProject(projectId: string): Promise<Goal[]> {
    try {
      return await this.repository.find({
        where: {
          projectId,
          isActive: true,
        },
        relations: ['project', 'achievements'],
        order: {
          createdAt: 'DESC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding goals by project:', error);
      throw error;
    }
  }

  async findByType(type: 'daily' | 'weekly' | 'project' | 'habit'): Promise<Goal[]> {
    try {
      return await this.repository.find({
        where: {
          type,
          isActive: true,
        },
        relations: ['project', 'achievements'],
        order: {
          createdAt: 'DESC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding goals by type:', error);
      throw error;
    }
  }

  async findExpiringSoon(days: number = 3): Promise<Goal[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      return await this.repository
        .createQueryBuilder('goal')
        .where('goal.isActive = :isActive', { isActive: true })
        .andWhere('goal.endDate IS NOT NULL')
        .andWhere('goal.endDate <= :futureDate', { futureDate })
        .andWhere('goal.endDate > :now', { now: new Date() })
        .leftJoinAndSelect('goal.project', 'project')
        .leftJoinAndSelect('goal.achievements', 'achievements')
        .orderBy('goal.endDate', 'ASC')
        .getMany();
    } catch (error) {
      dbLogger.error('Error finding expiring goals:', error);
      throw error;
    }
  }

  async findOverdue(): Promise<Goal[]> {
    try {
      return await this.repository
        .createQueryBuilder('goal')
        .where('goal.isActive = :isActive', { isActive: true })
        .andWhere('goal.endDate IS NOT NULL')
        .andWhere('goal.endDate < :now', { now: new Date() })
        .leftJoinAndSelect('goal.project', 'project')
        .leftJoinAndSelect('goal.achievements', 'achievements')
        .orderBy('goal.endDate', 'ASC')
        .getMany();
    } catch (error) {
      dbLogger.error('Error finding overdue goals:', error);
      throw error;
    }
  }

  async updateProgress(goalId: string, progressData: {
    currentStreak?: number;
    longestStreak?: number;
    lastProgressUpdate?: Date;
    progressHistory?: Array<{
      date: string;
      value: number;
      achieved: boolean;
      notes?: string;
    }>;
  }): Promise<Goal | null> {
    try {
      await this.repository.update(goalId, progressData);
      return await this.findById(goalId);
    } catch (error) {
      dbLogger.error('Error updating goal progress:', error);
      throw error;
    }
  }

  async markCompleted(goalId: string): Promise<Goal | null> {
    try {
      await this.repository.update(goalId, {
        isActive: false,
        // Note: isCompleted is now a method, not a field
      });
      return await this.findById(goalId);
    } catch (error) {
      dbLogger.error('Error marking goal as completed:', error);
      throw error;
    }
  }

  async pauseGoal(goalId: string): Promise<Goal | null> {
    try {
      await this.repository.update(goalId, {
        isActive: false,
      });
      return await this.findById(goalId);
    } catch (error) {
      dbLogger.error('Error pausing goal:', error);
      throw error;
    }
  }

  async resumeGoal(goalId: string): Promise<Goal | null> {
    try {
      await this.repository.update(goalId, {
        isActive: true,
      });
      return await this.findById(goalId);
    } catch (error) {
      dbLogger.error('Error resuming goal:', error);
      throw error;
    }
  }

  async getGoalStats(userId: string): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    overdue: number;
    averageProgress: number;
  }> {
    try {
      const goals = await this.findByUser(userId);
      const activeGoals = goals.filter(g => g.isActive);
      const completedGoals = goals.filter(g => g.isCompleted());
      const overdue = goals.filter(g => g.isActive && g.endDate && g.endDate < new Date());
      
      const totalProgress = goals.reduce((sum, goal) => sum + goal.getProgressPercentage(), 0);
      const averageProgress = goals.length > 0 ? totalProgress / goals.length : 0;

      return {
        totalGoals: goals.length,
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        overdue: overdue.length,
        averageProgress
      };
    } catch (error) {
      dbLogger.error('Error getting goal stats:', error);
      throw error;
    }
  }

  async getTodaysGoals(userId: string): Promise<Goal[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await this.repository
        .createQueryBuilder('goal')
        .where('goal.userId = :userId', { userId })
        .andWhere('goal.isActive = :isActive', { isActive: true })
        .andWhere('(goal.type = :daily OR goal.type = :habit)', { daily: 'daily', habit: 'habit' })
        .andWhere('goal.startDate <= :today', { today })
        .andWhere('(goal.endDate IS NULL OR goal.endDate >= :today)', { today })
        .leftJoinAndSelect('goal.project', 'project')
        .leftJoinAndSelect('goal.achievements', 'achievements')
        .orderBy('goal.createdAt', 'ASC')
        .getMany();
    } catch (error) {
      dbLogger.error('Error finding today\'s goals:', error);
      throw error;
    }
  }

  async getWeeklyGoals(userId: string): Promise<Goal[]> {
    try {
      const weekStart = new Date();
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day;
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);

      return await this.repository
        .createQueryBuilder('goal')
        .where('goal.userId = :userId', { userId })
        .andWhere('goal.isActive = :isActive', { isActive: true })
        .andWhere('goal.type = :weekly', { weekly: 'weekly' })
        .andWhere('goal.startDate <= :weekStart', { weekStart })
        .andWhere('(goal.endDate IS NULL OR goal.endDate >= :weekStart)', { weekStart })
        .leftJoinAndSelect('goal.project', 'project')
        .leftJoinAndSelect('goal.achievements', 'achievements')
        .orderBy('goal.createdAt', 'ASC')
        .getMany();
    } catch (error) {
      dbLogger.error('Error finding weekly goals:', error);
      throw error;
    }
  }
}