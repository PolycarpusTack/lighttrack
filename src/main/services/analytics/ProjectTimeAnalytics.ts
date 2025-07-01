import { Activity } from '@shared/types/activity';
import { logger } from '../../utils/logger';

/**
 * Time range options for analytics
 */
export type TimeRange = 'today' | 'week' | 'month' | 'year' | 'custom';

/**
 * Project statistics interface matching the design specification
 */
export interface ProjectStats {
  projectId: string;
  projectName?: string;
  totalTime: number;
  percentage: number;
  activityCount: number;
  averageActivityDuration: number;
  lastActivityTime: Date;
  color?: string;
}

/**
 * Project time distribution result
 */
export interface ProjectTimeDistribution {
  projects: ProjectStats[];
  totalTime: number;
  totalActivities: number;
  timeRange: TimeRange;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
}

/**
 * ProjectTimeAnalytics Service - Implements exact specification requirements
 * 
 * Purpose: Visual breakdown of time allocation across projects
 * Features:
 * - Groups activities by projectId
 * - Calculates total time, percentages, activity counts
 * - Sorts by total time in descending order
 * - Provides comprehensive project analytics
 */
export class ProjectTimeAnalytics {
  private static instance: ProjectTimeAnalytics;
  
  static getInstance(): ProjectTimeAnalytics {
    if (!ProjectTimeAnalytics.instance) {
      ProjectTimeAnalytics.instance = new ProjectTimeAnalytics();
    }
    return ProjectTimeAnalytics.instance;
  }

  /**
   * Calculate project distribution according to design specification
   * Groups activities by projectId and calculates comprehensive stats
   */
  calculateProjectDistribution(
    activities: Activity[], 
    timeRange: TimeRange,
    startDate?: Date,
    endDate?: Date
  ): ProjectTimeDistribution {
    try {
      logger.debug('Calculating project distribution', { 
        activityCount: activities.length, 
        timeRange 
      });

      // Filter activities by time range if dates provided
      const filteredActivities = this.filterActivitiesByTimeRange(
        activities, 
        timeRange, 
        startDate, 
        endDate
      );

      // Group activities by projectId
      const projectGroups = this.groupActivitiesByProject(filteredActivities);
      
      // Calculate total time across all activities
      const totalTime = filteredActivities.reduce((sum, activity) => 
        sum + (activity.duration || 0), 0
      );

      // Generate project statistics
      const projectStats = this.generateProjectStats(
        projectGroups, 
        totalTime, 
        filteredActivities.length
      );

      // Sort by total time in descending order (as per specification)
      const sortedProjects = projectStats.sort((a, b) => b.totalTime - a.totalTime);

      const result: ProjectTimeDistribution = {
        projects: sortedProjects,
        totalTime,
        totalActivities: filteredActivities.length,
        timeRange,
        startDate: startDate || this.getDefaultStartDate(timeRange),
        endDate: endDate || new Date(),
        generatedAt: new Date()
      };

      logger.debug('Project distribution calculated', {
        projectCount: sortedProjects.length,
        totalTime,
        totalActivities: filteredActivities.length
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate project distribution', error);
      throw new Error(`Project distribution calculation failed: ${error.message}`);
    }
  }

  /**
   * Get top projects by time spent (for dashboard summary)
   */
  getTopProjects(
    activities: Activity[], 
    limit: number = 5,
    timeRange: TimeRange = 'week'
  ): ProjectStats[] {
    const distribution = this.calculateProjectDistribution(activities, timeRange);
    return distribution.projects.slice(0, limit);
  }

  /**
   * Calculate project balance score (measures time distribution evenness)
   */
  calculateProjectBalanceScore(activities: Activity[]): number {
    const distribution = this.calculateProjectDistribution(activities, 'week');
    
    if (distribution.projects.length <= 1) {
      return 100; // Perfect balance if only one project
    }

    // Calculate Shannon diversity index for project time distribution
    const totalTime = distribution.totalTime;
    const entropy = distribution.projects.reduce((sum, project) => {
      const proportion = project.totalTime / totalTime;
      return sum - (proportion * Math.log2(proportion));
    }, 0);

    const maxEntropy = Math.log2(distribution.projects.length);
    const balanceScore = Math.round((entropy / maxEntropy) * 100);

    return Math.min(100, Math.max(0, balanceScore));
  }

  /**
   * Detect project switching patterns
   */
  analyzeProjectSwitching(activities: Activity[]): {
    switchCount: number;
    averageProjectSessionDuration: number;
    switchingFrequency: 'low' | 'medium' | 'high';
    recommendations: string[];
  } {
    const sortedActivities = activities
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    let switchCount = 0;
    let projectSessionDurations: number[] = [];
    let currentProjectId = '';
    let currentSessionStart = new Date();
    let currentSessionDuration = 0;

    sortedActivities.forEach((activity, index) => {
      if (activity.projectId !== currentProjectId) {
        if (currentProjectId && currentSessionDuration > 0) {
          projectSessionDurations.push(currentSessionDuration);
        }
        
        switchCount++;
        currentProjectId = activity.projectId;
        currentSessionStart = new Date(activity.startTime);
        currentSessionDuration = activity.duration || 0;
      } else {
        currentSessionDuration += activity.duration || 0;
      }
    });

    // Add final session
    if (currentSessionDuration > 0) {
      projectSessionDurations.push(currentSessionDuration);
    }

    const averageSessionDuration = projectSessionDurations.length > 0
      ? projectSessionDurations.reduce((sum, duration) => sum + duration, 0) / projectSessionDurations.length
      : 0;

    // Determine switching frequency
    const hoursWorked = activities.reduce((sum, a) => sum + (a.duration || 0), 0) / (1000 * 60 * 60);
    const switchesPerHour = hoursWorked > 0 ? switchCount / hoursWorked : 0;

    let switchingFrequency: 'low' | 'medium' | 'high';
    let recommendations: string[] = [];

    if (switchesPerHour < 1) {
      switchingFrequency = 'low';
      recommendations.push('Good focus! You maintain long project sessions.');
    } else if (switchesPerHour < 3) {
      switchingFrequency = 'medium';
      recommendations.push('Consider batching similar tasks to reduce context switching.');
    } else {
      switchingFrequency = 'high';
      recommendations.push('High context switching detected. Try time-blocking for better focus.');
      recommendations.push('Consider grouping related tasks within the same project.');
    }

    return {
      switchCount: switchCount - 1, // Subtract 1 because first activity isn't a switch
      averageProjectSessionDuration: averageSessionDuration,
      switchingFrequency,
      recommendations
    };
  }

  /**
   * Private helper methods
   */
  private groupActivitiesByProject(activities: Activity[]): Map<string, Activity[]> {
    const groups = new Map<string, Activity[]>();
    
    activities.forEach(activity => {
      const projectId = activity.projectId;
      if (!groups.has(projectId)) {
        groups.set(projectId, []);
      }
      groups.get(projectId)!.push(activity);
    });

    return groups;
  }

  private generateProjectStats(
    projectGroups: Map<string, Activity[]>, 
    totalTime: number,
    totalActivities: number
  ): ProjectStats[] {
    const stats: ProjectStats[] = [];

    projectGroups.forEach((activities, projectId) => {
      const projectTotalTime = activities.reduce((sum, activity) => 
        sum + (activity.duration || 0), 0
      );

      const percentage = totalTime > 0 
        ? Math.round((projectTotalTime / totalTime) * 100 * 10) / 10  // Round to 1 decimal
        : 0;

      const averageActivityDuration = activities.length > 0
        ? projectTotalTime / activities.length
        : 0;

      const lastActivityTime = activities.reduce((latest, activity) => {
        const activityTime = new Date(activity.startTime);
        return activityTime > latest ? activityTime : latest;
      }, new Date(0));

      stats.push({
        projectId,
        projectName: this.getProjectName(projectId), // Will be enhanced with project repository
        totalTime: projectTotalTime,
        percentage,
        activityCount: activities.length,
        averageActivityDuration,
        lastActivityTime,
        color: this.generateProjectColor(projectId)
      });
    });

    return stats;
  }

  private filterActivitiesByTimeRange(
    activities: Activity[], 
    timeRange: TimeRange,
    startDate?: Date,
    endDate?: Date
  ): Activity[] {
    if (timeRange === 'custom' && startDate && endDate) {
      return activities.filter(activity => {
        const activityDate = new Date(activity.startTime);
        return activityDate >= startDate && activityDate <= endDate;
      });
    }

    const now = new Date();
    let rangeStart: Date;

    switch (timeRange) {
      case 'today':
        rangeStart = new Date(now);
        rangeStart.setHours(0, 0, 0, 0);
        break;
      case 'week':
        rangeStart = new Date(now);
        rangeStart.setDate(rangeStart.getDate() - 7);
        break;
      case 'month':
        rangeStart = new Date(now);
        rangeStart.setMonth(rangeStart.getMonth() - 1);
        break;
      case 'year':
        rangeStart = new Date(now);
        rangeStart.setFullYear(rangeStart.getFullYear() - 1);
        break;
      default:
        rangeStart = new Date(now);
        rangeStart.setDate(rangeStart.getDate() - 7);
    }

    return activities.filter(activity => 
      new Date(activity.startTime) >= rangeStart
    );
  }

  private getDefaultStartDate(timeRange: TimeRange): Date {
    const now = new Date();
    
    switch (timeRange) {
      case 'today':
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return today;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);
        return weekStart;
      case 'month':
        const monthStart = new Date(now);
        monthStart.setMonth(monthStart.getMonth() - 1);
        return monthStart;
      case 'year':
        const yearStart = new Date(now);
        yearStart.setFullYear(yearStart.getFullYear() - 1);
        return yearStart;
      default:
        const defaultStart = new Date(now);
        defaultStart.setDate(defaultStart.getDate() - 7);
        return defaultStart;
    }
  }

  private getProjectName(projectId: string): string {
    // This will be enhanced with actual project repository lookup
    return `Project ${projectId.substring(0, 8)}...`;
  }

  private generateProjectColor(projectId: string): string {
    // Generate consistent colors based on project ID
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ];
    
    const hash = projectId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }
}