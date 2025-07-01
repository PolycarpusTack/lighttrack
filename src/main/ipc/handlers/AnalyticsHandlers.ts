import { IpcMainInvokeEvent } from 'electron';
import { AnalyticsService, DailyStats, WeeklyStats, ProductivityAnalysis, TimeInsight } from '../../services/AnalyticsService';
import { logger } from '../../utils/logger';

/**
 * IPC handlers for analytics functionality
 */
export class AnalyticsHandlers {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = AnalyticsService.getInstance();
  }

  /**
   * Get all IPC handlers for analytics
   */
  getHandlers() {
    return [
      {
        channel: 'analytics:getDailyStats',
        handler: this.getDailyStats.bind(this),
        validator: (args: any[]) => args[0] && !isNaN(Date.parse(args[0]))
      },
      {
        channel: 'analytics:getWeeklyStats',
        handler: this.getWeeklyStats.bind(this),
        validator: (args: any[]) => args[0] && !isNaN(Date.parse(args[0]))
      },
      {
        channel: 'analytics:getProductivityAnalysis',
        handler: this.getProductivityAnalysis.bind(this),
        validator: (args: any[]) => args[0] && args[1] && 
          !isNaN(Date.parse(args[0])) && !isNaN(Date.parse(args[1]))
      },
      {
        channel: 'analytics:getTimeInsights',
        handler: this.getTimeInsights.bind(this),
        validator: (args: any[]) => args[0] && args[1] && 
          !isNaN(Date.parse(args[0])) && !isNaN(Date.parse(args[1]))
      },
      {
        channel: 'analytics:getTodayStats',
        handler: this.getTodayStats.bind(this)
      },
      {
        channel: 'analytics:getThisWeekStats',
        handler: this.getThisWeekStats.bind(this)
      },
      {
        channel: 'analytics:refreshCache',
        handler: this.refreshCache.bind(this)
      },
      {
        channel: 'analytics:getRecommendations',
        handler: this.getRecommendations.bind(this),
        validator: (args: any[]) => args[0] && args[1] && 
          !isNaN(Date.parse(args[0])) && !isNaN(Date.parse(args[1]))
      },
      {
        channel: 'analytics:calculateProjectDistribution',
        handler: this.calculateProjectDistribution.bind(this),
        validator: (args: any[]) => args[0] && typeof args[0] === 'string'
      }
    ];
  }

  /**
   * Get daily statistics for a specific date
   */
  private async getDailyStats(event: IpcMainInvokeEvent, dateString: string): Promise<DailyStats> {
    try {
      const date = new Date(dateString);
      logger.debug('Getting daily stats', { date: date.toISOString() });
      
      const stats = await this.analyticsService.getDailyStats(date);
      
      logger.debug('Daily stats retrieved', { 
        date: date.toISOString(),
        totalTime: stats.totalTime,
        productivityScore: stats.productivityScore
      });
      
      return stats;
    } catch (error) {
      logger.error('Failed to get daily stats', { dateString, error });
      throw new Error(`Failed to get daily stats: ${error.message}`);
    }
  }

  /**
   * Get weekly statistics starting from a specific date
   */
  private async getWeeklyStats(event: IpcMainInvokeEvent, weekStartString: string): Promise<WeeklyStats> {
    try {
      const weekStart = new Date(weekStartString);
      logger.debug('Getting weekly stats', { weekStart: weekStart.toISOString() });
      
      const stats = await this.analyticsService.getWeeklyStats(weekStart);
      
      logger.debug('Weekly stats retrieved', { 
        weekStart: weekStart.toISOString(),
        totalTime: stats.totalTime,
        consistencyScore: stats.consistencyScore
      });
      
      return stats;
    } catch (error) {
      logger.error('Failed to get weekly stats', { weekStartString, error });
      throw new Error(`Failed to get weekly stats: ${error.message}`);
    }
  }

  /**
   * Get productivity analysis for a date range
   */
  private async getProductivityAnalysis(
    event: IpcMainInvokeEvent, 
    startDateString: string, 
    endDateString: string
  ): Promise<ProductivityAnalysis> {
    try {
      const startDate = new Date(startDateString);
      const endDate = new Date(endDateString);
      
      logger.debug('Getting productivity analysis', { 
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      if (startDate > endDate) {
        throw new Error('Start date must be before end date');
      }
      
      const analysis = await this.analyticsService.getProductivityAnalysis(startDate, endDate);
      
      logger.debug('Productivity analysis retrieved', { 
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        productivityScore: analysis.productivityScore,
        focusScore: analysis.focusScore,
        recommendationCount: analysis.recommendations.length
      });
      
      return analysis;
    } catch (error) {
      logger.error('Failed to get productivity analysis', { 
        startDateString, 
        endDateString, 
        error 
      });
      throw new Error(`Failed to get productivity analysis: ${error.message}`);
    }
  }

  /**
   * Get time insights for a date range
   */
  private async getTimeInsights(
    event: IpcMainInvokeEvent, 
    startDateString: string, 
    endDateString: string
  ): Promise<TimeInsight[]> {
    try {
      const startDate = new Date(startDateString);
      const endDate = new Date(endDateString);
      
      logger.debug('Getting time insights', { 
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      if (startDate > endDate) {
        throw new Error('Start date must be before end date');
      }
      
      const insights = await this.analyticsService.getTimeInsights(startDate, endDate);
      
      logger.debug('Time insights retrieved', { 
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        insightCount: insights.length
      });
      
      return insights;
    } catch (error) {
      logger.error('Failed to get time insights', { 
        startDateString, 
        endDateString, 
        error 
      });
      throw new Error(`Failed to get time insights: ${error.message}`);
    }
  }

  /**
   * Get today's statistics (convenience method)
   */
  private async getTodayStats(event: IpcMainInvokeEvent): Promise<DailyStats> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      logger.debug('Getting today stats');
      
      const stats = await this.analyticsService.getDailyStats(today);
      
      logger.debug('Today stats retrieved', { 
        totalTime: stats.totalTime,
        productivityScore: stats.productivityScore
      });
      
      return stats;
    } catch (error) {
      logger.error('Failed to get today stats', error);
      throw new Error(`Failed to get today stats: ${error.message}`);
    }
  }

  /**
   * Get this week's statistics (convenience method)
   */
  private async getThisWeekStats(event: IpcMainInvokeEvent): Promise<WeeklyStats> {
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      
      logger.debug('Getting this week stats');
      
      const stats = await this.analyticsService.getWeeklyStats(weekStart);
      
      logger.debug('This week stats retrieved', { 
        totalTime: stats.totalTime,
        consistencyScore: stats.consistencyScore
      });
      
      return stats;
    } catch (error) {
      logger.error('Failed to get this week stats', error);
      throw new Error(`Failed to get this week stats: ${error.message}`);
    }
  }

  /**
   * Refresh analytics cache
   */
  private async refreshCache(event: IpcMainInvokeEvent): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Refreshing analytics cache');
      
      // Refresh today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Force recalculation by updating with a dummy activity
      await this.analyticsService.updateDailyStats({
        id: 'cache-refresh',
        name: 'Cache Refresh',
        projectId: 'system',
        startTime: today,
        duration: 0,
        isPaused: false,
        pausedDuration: 0,
        isManualEntry: true,
        tags: [],
        metadata: { cacheRefresh: true }
      } as any);
      
      logger.info('Analytics cache refreshed successfully');
      
      return {
        success: true,
        message: 'Analytics cache refreshed successfully'
      };
    } catch (error) {
      logger.error('Failed to refresh analytics cache', error);
      return {
        success: false,
        message: `Failed to refresh cache: ${error.message}`
      };
    }
  }

  /**
   * Get recommendations for a date range
   */
  private async getRecommendations(
    event: IpcMainInvokeEvent, 
    startDateString: string, 
    endDateString: string
  ): Promise<string[]> {
    try {
      const startDate = new Date(startDateString);
      const endDate = new Date(endDateString);
      
      logger.debug('Getting recommendations', { 
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      if (startDate > endDate) {
        throw new Error('Start date must be before end date');
      }
      
      const analysis = await this.analyticsService.getProductivityAnalysis(startDate, endDate);
      
      logger.debug('Recommendations retrieved', { 
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        recommendationCount: analysis.recommendations.length
      });
      
      return analysis.recommendations;
    } catch (error) {
      logger.error('Failed to get recommendations', { 
        startDateString, 
        endDateString, 
        error 
      });
      throw new Error(`Failed to get recommendations: ${error.message}`);
    }
  }

  /**
   * Calculate project distribution for time breakdown
   */
  private async calculateProjectDistribution(
    event: IpcMainInvokeEvent, 
    timeRange: string,
    startDateString?: string,
    endDateString?: string
  ): Promise<any[]> {
    try {
      logger.debug('Calculating project distribution', { 
        timeRange,
        startDateString,
        endDateString
      });

      const startDate = startDateString ? new Date(startDateString) : undefined;
      const endDate = endDateString ? new Date(endDateString) : undefined;

      if (startDateString && endDateString && startDate && endDate && startDate > endDate) {
        throw new Error('Start date must be before end date');
      }

      const projectStats = await this.analyticsService.calculateProjectDistribution(
        timeRange as any,
        startDate,
        endDate
      );

      logger.debug('Project distribution calculated', {
        timeRange,
        projectCount: projectStats.length,
        totalProjects: projectStats.length
      });

      return projectStats;
    } catch (error) {
      logger.error('Failed to calculate project distribution', { 
        timeRange,
        startDateString,
        endDateString,
        error 
      });
      throw new Error(`Failed to calculate project distribution: ${error.message}`);
    }
  }
}