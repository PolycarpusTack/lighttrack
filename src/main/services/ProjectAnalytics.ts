import { Activity } from '@shared/types/activity';
import { Project } from '@shared/types/project';
import { ActivityRepository } from '../database/repositories/ActivityRepository';
import { ProjectRepository } from '../database/repositories/ProjectRepository';
import { logger } from '../utils/logger';

export interface ProjectTimeStats {
  projectId: string;
  projectName: string;
  totalTime: number;
  todayTime: number;
  weekTime: number;
  monthTime: number;
  yearTime: number;
  activityCount: number;
  averageSessionLength: number;
  lastActivityDate: Date | null;
}

export interface ActivityHeatmapData {
  projectId: string;
  heatmap: HeatmapCell[][];
  maxValue: number;
  totalDays: number;
}

export interface HeatmapCell {
  date: Date;
  value: number; // minutes
  level: 0 | 1 | 2 | 3 | 4; // activity level
  activities: number;
}

export interface BudgetAnalysis {
  projectId: string;
  totalEarned: number;
  projectedMonthly: number;
  hoursTracked: number;
  billableHours: number;
  hourlyRate: number;
  currency: string;
  budgetUtilization: number; // percentage
  remainingBudget: number;
}

export interface TeamCollaboration {
  projectId: string;
  contributors: Array<{
    userId: string;
    name: string;
    totalTime: number;
    lastActive: Date;
    contribution: number; // percentage
  }>;
  totalContributors: number;
  activeContributors: number; // active in last 7 days
}

export interface ProjectTrend {
  date: string;
  time: number;
  activities: number;
  productivity: number;
}

export class ProjectAnalytics {
  private static instance: ProjectAnalytics;
  private activityRepository: ActivityRepository;
  private projectRepository: ProjectRepository;

  static getInstance(): ProjectAnalytics {
    if (!ProjectAnalytics.instance) {
      ProjectAnalytics.instance = new ProjectAnalytics();
    }
    return ProjectAnalytics.instance;
  }

  constructor() {
    this.activityRepository = new ActivityRepository();
    this.projectRepository = new ProjectRepository();
  }

  /**
   * Get comprehensive time tracking stats for a project
   */
  async getProjectTimeStats(projectId: string): Promise<ProjectTimeStats> {
    try {
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const activities = await this.activityRepository.findByProject(projectId);
      const now = new Date();

      // Calculate time periods
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      // Calculate times
      let todayTime = 0;
      let weekTime = 0;
      let monthTime = 0;
      let yearTime = 0;
      let lastActivityDate: Date | null = null;

      activities.forEach(activity => {
        const activityDate = new Date(activity.startTime);
        const duration = activity.duration || 0;

        if (activityDate >= todayStart) {
          todayTime += duration;
        }
        if (activityDate >= weekStart) {
          weekTime += duration;
        }
        if (activityDate >= monthStart) {
          monthTime += duration;
        }
        if (activityDate >= yearStart) {
          yearTime += duration;
        }

        if (!lastActivityDate || activityDate > lastActivityDate) {
          lastActivityDate = activityDate;
        }
      });

      const totalTime = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
      const averageSessionLength = activities.length > 0 ? totalTime / activities.length : 0;

      return {
        projectId,
        projectName: project.name,
        totalTime,
        todayTime,
        weekTime,
        monthTime,
        yearTime,
        activityCount: activities.length,
        averageSessionLength,
        lastActivityDate
      };
    } catch (error) {
      logger.error('Failed to get project time stats', { projectId, error });
      throw error;
    }
  }

  /**
   * Generate activity heatmap data for a project
   */
  async generateActivityHeatmap(
    projectId: string, 
    days: number = 365
  ): Promise<ActivityHeatmapData> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const activities = await this.activityRepository.findByProjectAndDateRange(
        projectId,
        startDate,
        endDate
      );

      // Create daily activity map
      const dailyActivity = new Map<string, { minutes: number; count: number }>();
      let maxValue = 0;

      activities.forEach(activity => {
        const date = new Date(activity.startTime);
        const dateKey = date.toISOString().split('T')[0];
        const minutes = Math.round((activity.duration || 0) / (1000 * 60));

        const existing = dailyActivity.get(dateKey) || { minutes: 0, count: 0 };
        existing.minutes += minutes;
        existing.count += 1;
        dailyActivity.set(dateKey, existing);

        if (existing.minutes > maxValue) {
          maxValue = existing.minutes;
        }
      });

      // Generate heatmap grid (weeks x days)
      const heatmap: HeatmapCell[][] = [];
      const currentDate = new Date(startDate);
      let currentWeek: HeatmapCell[] = [];

      // Fill initial empty days if start date is not Sunday
      const startDay = currentDate.getDay();
      for (let i = 0; i < startDay; i++) {
        currentWeek.push({
          date: new Date(0),
          value: 0,
          level: 0,
          activities: 0
        });
      }

      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const dayData = dailyActivity.get(dateKey) || { minutes: 0, count: 0 };

        currentWeek.push({
          date: new Date(currentDate),
          value: dayData.minutes,
          level: this.getActivityLevel(dayData.minutes, maxValue),
          activities: dayData.count
        });

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);

        // Start new week if needed
        if (currentWeek.length === 7) {
          heatmap.push(currentWeek);
          currentWeek = [];
        }
      }

      // Add remaining days to last week
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push({
            date: new Date(0),
            value: 0,
            level: 0,
            activities: 0
          });
        }
        heatmap.push(currentWeek);
      }

      return {
        projectId,
        heatmap,
        maxValue,
        totalDays: days
      };
    } catch (error) {
      logger.error('Failed to generate activity heatmap', { projectId, error });
      throw error;
    }
  }

  /**
   * Analyze budget and earnings for billable projects
   */
  async analyzeBudget(projectId: string, budgetLimit?: number): Promise<BudgetAnalysis> {
    try {
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.settings.billable) {
        throw new Error('Project is not billable');
      }

      const activities = await this.activityRepository.findByProject(projectId);
      const hourlyRate = project.settings.hourlyRate || 0;
      const currency = project.settings.currency || 'USD';

      // Calculate hours
      const totalMs = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
      const hoursTracked = totalMs / (1000 * 60 * 60);
      
      // For now, assume all hours are billable
      // In a real implementation, you might have non-billable activities
      const billableHours = hoursTracked;
      const totalEarned = billableHours * hourlyRate;

      // Project monthly earnings based on last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentActivities = activities.filter(a => 
        new Date(a.startTime) >= thirtyDaysAgo
      );
      
      const recentMs = recentActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
      const recentHours = recentMs / (1000 * 60 * 60);
      const projectedMonthly = recentHours * hourlyRate;

      // Budget utilization
      let budgetUtilization = 0;
      let remainingBudget = 0;
      
      if (budgetLimit && budgetLimit > 0) {
        budgetUtilization = (totalEarned / budgetLimit) * 100;
        remainingBudget = Math.max(0, budgetLimit - totalEarned);
      }

      return {
        projectId,
        totalEarned,
        projectedMonthly,
        hoursTracked,
        billableHours,
        hourlyRate,
        currency,
        budgetUtilization,
        remainingBudget
      };
    } catch (error) {
      logger.error('Failed to analyze budget', { projectId, error });
      throw error;
    }
  }

  /**
   * Get project trends over time
   */
  async getProjectTrends(
    projectId: string,
    days: number = 30,
    interval: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<ProjectTrend[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const activities = await this.activityRepository.findByProjectAndDateRange(
        projectId,
        startDate,
        endDate
      );

      const trends = new Map<string, ProjectTrend>();

      activities.forEach(activity => {
        const date = new Date(activity.startTime);
        const dateKey = this.getDateKey(date, interval);
        
        const existing = trends.get(dateKey) || {
          date: dateKey,
          time: 0,
          activities: 0,
          productivity: 0
        };

        existing.time += activity.duration || 0;
        existing.activities += 1;
        
        trends.set(dateKey, existing);
      });

      // Calculate productivity scores
      const trendArray = Array.from(trends.values());
      trendArray.forEach(trend => {
        // Simple productivity score based on time and activity count
        const hoursWorked = trend.time / (1000 * 60 * 60);
        const avgSessionLength = trend.time / trend.activities;
        const sessionScore = Math.min(100, (avgSessionLength / (45 * 60 * 1000)) * 100); // 45 min optimal
        const volumeScore = Math.min(100, (hoursWorked / 6) * 100); // 6 hours optimal
        
        trend.productivity = Math.round((sessionScore + volumeScore) / 2);
      });

      return trendArray.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      logger.error('Failed to get project trends', { projectId, error });
      throw error;
    }
  }

  /**
   * Get team collaboration stats (stub for future multi-user support)
   */
  async getTeamCollaboration(projectId: string): Promise<TeamCollaboration> {
    // For now, return single user stats
    const stats = await this.getProjectTimeStats(projectId);
    
    return {
      projectId,
      contributors: [{
        userId: 'current-user',
        name: 'You',
        totalTime: stats.totalTime,
        lastActive: stats.lastActivityDate || new Date(),
        contribution: 100
      }],
      totalContributors: 1,
      activeContributors: 1
    };
  }

  /**
   * Compare project performance across periods
   */
  async compareProjectPeriods(
    projectId: string,
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date
  ): Promise<{
    period1: ProjectTimeStats;
    period2: ProjectTimeStats;
    change: {
      time: number; // percentage
      activities: number; // percentage
      productivity: number; // percentage
    };
  }> {
    try {
      const [activities1, activities2] = await Promise.all([
        this.activityRepository.findByProjectAndDateRange(projectId, period1Start, period1End),
        this.activityRepository.findByProjectAndDateRange(projectId, period2Start, period2End)
      ]);

      const stats1 = this.calculatePeriodStats(activities1);
      const stats2 = this.calculatePeriodStats(activities2);

      const timeChange = stats1.totalTime > 0 
        ? ((stats2.totalTime - stats1.totalTime) / stats1.totalTime) * 100 
        : 0;
      
      const activityChange = stats1.activityCount > 0
        ? ((stats2.activityCount - stats1.activityCount) / stats1.activityCount) * 100
        : 0;

      const productivity1 = this.calculateProductivityScore(activities1);
      const productivity2 = this.calculateProductivityScore(activities2);
      const productivityChange = productivity1 > 0
        ? ((productivity2 - productivity1) / productivity1) * 100
        : 0;

      return {
        period1: stats1,
        period2: stats2,
        change: {
          time: Math.round(timeChange),
          activities: Math.round(activityChange),
          productivity: Math.round(productivityChange)
        }
      };
    } catch (error) {
      logger.error('Failed to compare project periods', { projectId, error });
      throw error;
    }
  }

  private getActivityLevel(minutes: number, maxValue: number): 0 | 1 | 2 | 3 | 4 {
    if (minutes === 0) return 0;
    const percentage = (minutes / maxValue) * 100;
    if (percentage < 25) return 1;
    if (percentage < 50) return 2;
    if (percentage < 75) return 3;
    return 4;
  }

  private getDateKey(date: Date, interval: 'daily' | 'weekly' | 'monthly'): string {
    switch (interval) {
      case 'daily':
        return date.toISOString().split('T')[0];
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  private calculatePeriodStats(activities: Activity[]): any {
    const totalTime = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const averageSessionLength = activities.length > 0 ? totalTime / activities.length : 0;
    
    return {
      totalTime,
      activityCount: activities.length,
      averageSessionLength
    };
  }

  private calculateProductivityScore(activities: Activity[]): number {
    if (activities.length === 0) return 0;
    
    const totalTime = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const avgSession = totalTime / activities.length;
    
    // Optimal session length is 45-90 minutes
    const optimalMin = 45 * 60 * 1000;
    const optimalMax = 90 * 60 * 1000;
    
    let score = 0;
    if (avgSession >= optimalMin && avgSession <= optimalMax) {
      score = 100;
    } else if (avgSession < optimalMin) {
      score = (avgSession / optimalMin) * 100;
    } else {
      score = Math.max(50, 100 - ((avgSession - optimalMax) / optimalMax) * 50);
    }
    
    return Math.round(score);
  }
}