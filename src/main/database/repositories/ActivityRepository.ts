import { Between, LessThan, MoreThan, IsNull, Not, In } from 'typeorm';
import { BaseRepository } from './BaseRepository';
import { Activity } from '../entities/Activity';
import { dbLogger } from '../../utils/logger';

/**
 * Repository for Activity entity operations
 * Handles all database interactions for time tracking activities
 */
export class ActivityRepository extends BaseRepository<Activity> {
  constructor() {
    super(Activity);
  }

  /**
   * Find the currently running activity (no end time)
   * @returns The current activity with relations or null if none running
   */
  async findCurrentActivity(): Promise<Activity | null> {
    try {
      return await this.repository.findOne({
        where: {
          endTime: IsNull(),
          isDeleted: false,
        },
        relations: ['project', 'category', 'tags'],
        order: {
          startTime: 'DESC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding current activity:', error);
      throw error;
    }
  }

  /**
   * Find all activities that started today
   * @returns Array of today's activities ordered by start time
   */
  async findTodayActivities(): Promise<Activity[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await this.repository.find({
        where: {
          startTime: Between(today, tomorrow),
          isDeleted: false,
        },
        relations: ['project', 'category', 'tags'],
        order: {
          startTime: 'ASC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding today activities:', error);
      throw error;
    }
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Activity[]> {
    try {
      return await this.repository.find({
        where: {
          startTime: Between(startDate, endDate),
          isDeleted: false,
        },
        relations: ['project', 'category', 'tags'],
        order: {
          startTime: 'ASC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding activities by date range:', error);
      throw error;
    }
  }

  async findByProject(projectId: string): Promise<Activity[]> {
    try {
      return await this.repository.find({
        where: {
          projectId,
          isDeleted: false,
        },
        relations: ['project', 'category', 'tags'],
        order: {
          startTime: 'DESC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding activities by project:', error);
      throw error;
    }
  }

  async findByIds(ids: string[]): Promise<Activity[]> {
    try {
      return await this.repository.find({
        where: {
          id: In(ids),
          isDeleted: false,
        },
        relations: ['project', 'category', 'tags'],
      });
    } catch (error) {
      dbLogger.error('Error finding activities by ids:', error);
      throw error;
    }
  }

  async stopActivity(id: string): Promise<Activity | null> {
    try {
      const activity = await this.findById(id);
      if (!activity) return null;

      const endTime = new Date();
      const duration = endTime.getTime() - activity.startTime.getTime() - activity.pausedDuration;

      await this.repository.update(id, {
        endTime,
        duration,
        isPaused: false,
        pauseStartTime: null,
      });

      return await this.findById(id);
    } catch (error) {
      dbLogger.error('Error stopping activity:', error);
      throw error;
    }
  }

  async pauseActivity(id: string): Promise<Activity | null> {
    try {
      const activity = await this.findById(id);
      if (!activity || activity.isPaused) return null;

      await this.repository.update(id, {
        isPaused: true,
        pauseStartTime: new Date(),
      });

      return await this.findById(id);
    } catch (error) {
      dbLogger.error('Error pausing activity:', error);
      throw error;
    }
  }

  async resumeActivity(id: string): Promise<Activity | null> {
    try {
      const activity = await this.findById(id);
      if (!activity || !activity.isPaused || !activity.pauseStartTime) return null;

      const pauseDuration = new Date().getTime() - new Date(activity.pauseStartTime).getTime();
      const totalPausedDuration = activity.pausedDuration + pauseDuration;

      await this.repository.update(id, {
        isPaused: false,
        pauseStartTime: null,
        pausedDuration: totalPausedDuration,
      });

      return await this.findById(id);
    } catch (error) {
      dbLogger.error('Error resuming activity:', error);
      throw error;
    }
  }

  async mergeActivities(activityIds: string[], mergedData: Partial<Activity>): Promise<Activity> {
    return await this.transaction(async (transactionRepository) => {
      try {
        // Get all activities to merge
        const activities = await transactionRepository.find({
          where: { id: In(activityIds) },
          relations: ['tags'],
        });

        if (activities.length !== activityIds.length) {
          throw new Error('One or more activities not found');
        }

        // Calculate merged duration
        const totalDuration = activities.reduce((sum, act) => sum + act.getDuration(), 0);
        const earliestStart = activities.reduce((min, act) => 
          act.startTime < min ? act.startTime : min, 
          activities[0].startTime
        );
        const latestEnd = activities.reduce((max, act) => {
          const end = act.endTime || new Date();
          return end > max ? end : max;
        }, activities[0].endTime || new Date());

        // Merge tags
        const allTags = new Set<string>();
        activities.forEach(act => {
          act.tags?.forEach(tag => allTags.add(tag.id));
        });

        // Create merged activity
        const mergedActivity = transactionRepository.create({
          ...mergedData,
          startTime: earliestStart,
          endTime: latestEnd,
          duration: totalDuration,
          tags: Array.from(allTags).map(tagId => ({ id: tagId })),
        });

        const saved = await transactionRepository.save(mergedActivity);

        // Delete original activities
        await transactionRepository.update(
          { id: In(activityIds) },
          { isDeleted: true }
        );

        return saved;
      } catch (error) {
        dbLogger.error('Error merging activities:', error);
        throw error;
      }
    });
  }

  async splitActivity(activityId: string, splitTime: Date): Promise<Activity[]> {
    return await this.transaction(async (transactionRepository) => {
      try {
        const activity = await transactionRepository.findOne({
          where: { id: activityId },
          relations: ['tags'],
        });

        if (!activity) {
          throw new Error('Activity not found');
        }

        const endTime = activity.endTime || new Date();
        
        // Update original activity to end at split time
        await transactionRepository.update(activityId, {
          endTime: splitTime,
          duration: splitTime.getTime() - activity.startTime.getTime(),
        });

        // Create new activity starting from split time
        const newActivity = transactionRepository.create({
          name: activity.name,
          description: activity.description,
          projectId: activity.projectId,
          categoryId: activity.categoryId,
          startTime: splitTime,
          endTime: endTime,
          duration: endTime.getTime() - splitTime.getTime(),
          isManualEntry: activity.isManualEntry,
          tags: activity.tags,
          metadata: { ...activity.metadata, splitFrom: activityId },
        });

        const saved = await transactionRepository.save(newActivity);

        return [
          await transactionRepository.findOne({ where: { id: activityId } }) as Activity,
          saved,
        ];
      } catch (error) {
        dbLogger.error('Error splitting activity:', error);
        throw error;
      }
    });
  }

  async getProductivityStats(startDate: Date, endDate: Date): Promise<{
    totalTime: number;
    activeTime: number;
    pausedTime: number;
    activityCount: number;
    projectBreakdown: Record<string, number>;
  }> {
    try {
      const activities = await this.findByDateRange(startDate, endDate);
      
      const stats = {
        totalTime: 0,
        activeTime: 0,
        pausedTime: 0,
        activityCount: activities.length,
        projectBreakdown: {} as Record<string, number>,
      };

      activities.forEach(activity => {
        const duration = activity.getDuration();
        stats.totalTime += duration;
        stats.activeTime += duration - activity.pausedDuration;
        stats.pausedTime += activity.pausedDuration;

        const projectName = activity.project?.name || 'No Project';
        stats.projectBreakdown[projectName] = 
          (stats.projectBreakdown[projectName] || 0) + duration;
      });

      return stats;
    } catch (error) {
      dbLogger.error('Error calculating productivity stats:', error);
      throw error;
    }
  }
}