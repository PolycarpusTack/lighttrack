import { BaseRepository } from './BaseRepository';
import { Achievement } from '../entities/Achievement';
import { dbLogger } from '../../utils/logger';

export class AchievementRepository extends BaseRepository<Achievement> {
  constructor() {
    super(Achievement);
  }

  async findByGoal(goalId: string): Promise<Achievement[]> {
    try {
      return await this.repository.find({
        where: {
          goalId,
        },
        relations: ['goal'],
        order: {
          earnedAt: 'DESC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding achievements by goal:', error);
      throw error;
    }
  }

  async findByType(type: string): Promise<Achievement[]> {
    try {
      return await this.repository.find({
        where: {
          type: type as any,
        },
        relations: ['goal'],
        order: {
          earnedAt: 'DESC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding achievements by type:', error);
      throw error;
    }
  }

  async findRecent(days: number = 7): Promise<Achievement[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return await this.repository
        .createQueryBuilder('achievement')
        .where('achievement.earnedAt >= :cutoffDate', { cutoffDate })
        .leftJoinAndSelect('achievement.goal', 'goal')
        .orderBy('achievement.earnedAt', 'DESC')
        .getMany();
    } catch (error) {
      dbLogger.error('Error finding recent achievements:', error);
      throw error;
    }
  }

  async findUnnotified(): Promise<Achievement[]> {
    try {
      return await this.repository.find({
        where: {
          isNotified: false,
        },
        relations: ['goal'],
        order: {
          earnedAt: 'ASC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding unnotified achievements:', error);
      throw error;
    }
  }

  async markAsNotified(achievementIds: string[]): Promise<void> {
    try {
      await this.repository
        .createQueryBuilder()
        .update(Achievement)
        .set({ isNotified: true })
        .whereInIds(achievementIds)
        .execute();
    } catch (error) {
      dbLogger.error('Error marking achievements as notified:', error);
      throw error;
    }
  }

  async getAchievementStats(): Promise<{
    totalAchievements: number;
    achievementsByType: { [key: string]: number };
    recentAchievements: number;
    topGoalsByAchievements: Array<{ goalId: string; goalName: string; count: number }>;
  }> {
    try {
      const allAchievements = await this.repository.find({
        relations: ['goal'],
      });

      const achievementsByType: { [key: string]: number } = {};
      const goalAchievementCounts: { [goalId: string]: { name: string; count: number } } = {};

      for (const achievement of allAchievements) {
        // Count by type
        achievementsByType[achievement.type] = (achievementsByType[achievement.type] || 0) + 1;

        // Count by goal
        if (achievement.goal) {
          if (!goalAchievementCounts[achievement.goalId]) {
            goalAchievementCounts[achievement.goalId] = {
              name: achievement.goal.name,
              count: 0
            };
          }
          goalAchievementCounts[achievement.goalId].count++;
        }
      }

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentAchievements = allAchievements.filter(a => a.earnedAt >= oneWeekAgo).length;

      const topGoalsByAchievements = Object.entries(goalAchievementCounts)
        .map(([goalId, data]) => ({
          goalId,
          goalName: data.name,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalAchievements: allAchievements.length,
        achievementsByType,
        recentAchievements,
        topGoalsByAchievements
      };
    } catch (error) {
      dbLogger.error('Error getting achievement stats:', error);
      throw error;
    }
  }

  async findStreakMilestones(goalId: string): Promise<Achievement[]> {
    try {
      return await this.repository.find({
        where: {
          goalId,
          type: 'streak_milestone',
        },
        order: {
          value: 'DESC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding streak milestones:', error);
      throw error;
    }
  }

  async findTimeMilestones(goalId: string): Promise<Achievement[]> {
    try {
      return await this.repository.find({
        where: {
          goalId,
          type: 'time_milestone',
        },
        order: {
          value: 'DESC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding time milestones:', error);
      throw error;
    }
  }

  async createBulkAchievements(achievements: Partial<Achievement>[]): Promise<Achievement[]> {
    try {
      const entities = achievements.map(data => this.repository.create(data));
      return await this.repository.save(entities);
    } catch (error) {
      dbLogger.error('Error creating bulk achievements:', error);
      throw error;
    }
  }

  async deleteByGoal(goalId: string): Promise<void> {
    try {
      await this.repository.delete({ goalId });
    } catch (error) {
      dbLogger.error('Error deleting achievements by goal:', error);
      throw error;
    }
  }

  async getTopAchievers(limit: number = 10): Promise<Array<{
    goalId: string;
    goalName: string;
    achievementCount: number;
    lastEarned: Date;
  }>> {
    try {
      const result = await this.repository
        .createQueryBuilder('achievement')
        .select([
          'achievement.goalId as goalId',
          'goal.name as goalName',
          'COUNT(achievement.id) as achievementCount',
          'MAX(achievement.earnedAt) as lastEarned'
        ])
        .leftJoin('achievement.goal', 'goal')
        .groupBy('achievement.goalId')
        .addGroupBy('goal.name')
        .orderBy('achievementCount', 'DESC')
        .addOrderBy('lastEarned', 'DESC')
        .limit(limit)
        .getRawMany();

      return result.map(row => ({
        goalId: row.goalId,
        goalName: row.goalName,
        achievementCount: parseInt(row.achievementCount),
        lastEarned: new Date(row.lastEarned)
      }));
    } catch (error) {
      dbLogger.error('Error getting top achievers:', error);
      throw error;
    }
  }
}