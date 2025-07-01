import { EventEmitter } from 'events';
import { Activity } from '@shared/types/activity';
import { Project } from '@shared/types/project';
import { ActivityRepository } from '../database/repositories/ActivityRepository';
import { ProjectRepository } from '../database/repositories/ProjectRepository';
import { AnalyticsCacheRepository } from '../database/repositories/AnalyticsCacheRepository';
import { logger } from '../utils/logger';
import { 
  ProjectTimeAnalytics, 
  ProductivityAnalyzer,
  TimeRange,
  ProjectStats,
  ProjectTimeDistribution,
  TrendData,
  InsightResult
} from './analytics';

// Updated interfaces to match design specification exactly
export interface DailyStats {
  date: string;
  totalTime: number;
  productivityScore: number;
  focusScore: number;
  projectBreakdown: { [projectId: string]: number };
  activityCount: number;
  distractionCount: number;
  mostProductiveHour: number;
  leastProductiveHour: number;
  // Legacy fields for backward compatibility
  productiveTime?: number;
  breakTime?: number;
  activeProjects?: number;
  completedActivities?: number;
  averageActivityDuration?: number;
  hourlyBreakdown?: number[];
  topActivities?: Array<{ name: string; duration: number; percentage: number }>;
}

export interface WeeklyStats {
  weekStart: string;
  totalTime: number;
  dailyStats: DailyStats[];
  consistencyScore: number;
  averageProductivity: number;
  averageFocus: number;
  totalActivities: number;
  weeklyGoalProgress: number;
  // Legacy fields for backward compatibility
  weekEnd?: Date;
  dailyAverages?: number[];
  projectDistribution?: Array<{ projectId: string; duration: number; percentage: number }>;
  trends?: {
    timeChange: number;
    productivityChange: number;
    focusChange: number;
  };
}

export interface ProductivityAnalysis {
  totalTime: number;
  productiveTime: number;
  productivityScore: number;
  projectDistribution: Array<{ projectId: string; duration: number; percentage: number }>;
  peakProductivityHours: number[];
  distractionPatterns: DistractionPattern[];
  recommendations: string[];
  focusScore: number;
  contextSwitches: number;
}

export interface DistractionPattern {
  type: 'frequent_context_switching' | 'fragmented_work' | 'long_idle_periods' | 'evening_work';
  severity: 'low' | 'medium' | 'high';
  occurrences: number;
  recommendation: string;
  impact: number; // 0-100 scale
}

// Updated TimeInsight interface to match design specification
export interface TimeInsight {
  type: 'peak_hours' | 'distraction_pattern' | 'productivity_trend' | 'project_balance';
  title: string;
  description: string;
  value: number;
  unit: string;
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
  metadata?: { [key: string]: any };
  // Legacy fields for backward compatibility
  trend?: 'up' | 'down' | 'stable';
  actionable?: boolean;
  suggestion?: string;
}

export class AnalyticsService extends EventEmitter {
  private static instance: AnalyticsService;
  private activityRepository: ActivityRepository;
  private projectRepository: ProjectRepository;
  private cacheRepository: AnalyticsCacheRepository;
  private projectTimeAnalytics: ProjectTimeAnalytics;
  private productivityAnalyzer: ProductivityAnalyzer;
  private processInterval: NodeJS.Timer | null = null;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  constructor() {
    super();
    this.activityRepository = new ActivityRepository();
    this.projectRepository = new ProjectRepository();
    this.cacheRepository = new AnalyticsCacheRepository();
    this.projectTimeAnalytics = ProjectTimeAnalytics.getInstance();
    this.productivityAnalyzer = ProductivityAnalyzer.getInstance();
  }

  async start(): Promise<void> {
    // Schedule analytics processing every hour
    this.processInterval = setInterval(async () => {
      await this.processHourlyAnalytics();
    }, 3600000); // 1 hour

    // Process current day on start
    await this.processDailyAnalytics(new Date());
    
    logger.info('Analytics service started');
  }

  async stop(): Promise<void> {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    logger.info('Analytics service stopped');
  }

  async getDailyStats(date: Date): Promise<DailyStats> {
    const cacheKey = `daily_${this.formatDate(date)}`;
    
    // Check cache first
    const cached = await this.cacheRepository.get(cacheKey);
    if (cached && !this.isCacheExpired(cached, 3600000)) { // 1 hour TTL
      return cached.data as DailyStats;
    }

    // Calculate fresh stats
    const stats = await this.calculateDailyStats(date);
    
    // Cache results
    await this.cacheRepository.set(cacheKey, stats, 3600000);
    
    return stats;
  }

  async getWeeklyStats(weekStart: Date): Promise<WeeklyStats> {
    const cacheKey = `weekly_${this.formatDate(weekStart)}`;
    
    const cached = await this.cacheRepository.get(cacheKey);
    if (cached && !this.isCacheExpired(cached, 86400000)) { // 24 hour TTL
      return cached.data as WeeklyStats;
    }

    const stats = await this.calculateWeeklyStats(weekStart);
    await this.cacheRepository.set(cacheKey, stats, 86400000);
    
    return stats;
  }

  async getProductivityAnalysis(startDate: Date, endDate: Date): Promise<ProductivityAnalysis> {
    const activities = await this.activityRepository.findByDateRange(startDate, endDate);
    const projects = await this.projectRepository.findAll();
    
    if (activities.length === 0) {
      return this.getEmptyProductivityAnalysis();
    }

    // Calculate basic metrics
    const totalTime = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const productiveTime = this.calculateProductiveTime(activities);
    const productivityScore = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;
    
    // Project time distribution
    const projectTime = new Map<string, number>();
    activities.forEach(activity => {
      const current = projectTime.get(activity.projectId) || 0;
      projectTime.set(activity.projectId, current + (activity.duration || 0));
    });
    
    const projectDistribution = Array.from(projectTime.entries()).map(([projectId, duration]) => ({
      projectId,
      duration,
      percentage: Math.round((duration / totalTime) * 100)
    })).sort((a, b) => b.duration - a.duration);

    // Peak productivity hours
    const peakHours = this.calculatePeakProductivityHours(activities);
    
    // Distraction patterns
    const distractionPatterns = await this.analyzeDistractions(activities);
    
    // Context switches
    const contextSwitches = this.calculateContextSwitches(activities);
    
    // Focus score (based on average activity duration and context switches)
    const avgActivityDuration = activities.length > 0 ? totalTime / activities.length : 0;
    const focusScore = this.calculateFocusScore(avgActivityDuration, contextSwitches, activities.length);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations({
      productivityScore,
      focusScore,
      contextSwitches,
      peakHours,
      distractionPatterns,
      avgActivityDuration
    });
    
    return {
      totalTime,
      productiveTime,
      productivityScore,
      projectDistribution,
      peakProductivityHours: peakHours,
      distractionPatterns,
      recommendations,
      focusScore,
      contextSwitches
    };
  }

  async getTimeInsights(startDate: Date, endDate: Date): Promise<TimeInsight[]> {
    const activities = await this.activityRepository.findByDateRange(startDate, endDate);

    if (activities.length === 0) {
      return [];
    }

    try {
      // Use the new ProductivityAnalyzer for comprehensive pattern detection
      const trendData = await this.productivityAnalyzer.calculateTrends(activities, 7);
      const insights = this.productivityAnalyzer.detectPatterns(trendData);

      // Convert InsightResult[] to TimeInsight[] format for backward compatibility
      const timeInsights: TimeInsight[] = insights.map(insight => ({
        type: insight.type,
        title: insight.title,
        description: insight.description,
        value: insight.value,
        unit: insight.unit,
        severity: insight.severity,
        recommendations: insight.recommendations,
        metadata: insight.metadata,
        // Legacy compatibility fields
        trend: insight.trend === 'improving' ? 'up' : insight.trend === 'declining' ? 'down' : 'stable',
        actionable: insight.recommendations.length > 0,
        suggestion: insight.recommendations[0] || undefined
      }));

      logger.debug('Generated time insights', { 
        insightCount: timeInsights.length,
        activityCount: activities.length 
      });

      return timeInsights;
    } catch (error) {
      logger.error('Failed to generate time insights', error);
      
      // Fallback to legacy implementation if new services fail
      return this.getLegacyTimeInsights(activities);
    }
  }

  /**
   * Calculate project distribution according to design specification
   * Groups activities by projectId and calculates comprehensive stats
   */
  async calculateProjectDistribution(
    timeRange: TimeRange,
    startDate?: Date,
    endDate?: Date
  ): Promise<ProjectStats[]> {
    try {
      const activities = startDate && endDate 
        ? await this.activityRepository.findByDateRange(startDate, endDate)
        : await this.getActivitiesForTimeRange(timeRange);

      const distribution = this.projectTimeAnalytics.calculateProjectDistribution(
        activities, 
        timeRange, 
        startDate, 
        endDate
      );

      logger.debug('Calculated project distribution', {
        projectCount: distribution.projects.length,
        timeRange,
        totalTime: distribution.totalTime
      });

      return distribution.projects;
    } catch (error) {
      logger.error('Failed to calculate project distribution', error);
      throw new Error(`Project distribution calculation failed: ${error.message}`);
    }
  }

  async updateDailyStats(activity: Activity): Promise<void> {
    const date = new Date(activity.startTime);
    date.setHours(0, 0, 0, 0);
    
    const cacheKey = `daily_${this.formatDate(date)}`;
    
    // Invalidate cache for today
    await this.cacheRepository.invalidate(cacheKey);
    
    // Recalculate if it's today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) {
      await this.getDailyStats(date);
    }

    this.emit('statsUpdated', { date, activity });
  }

  private async calculateDailyStats(date: Date): Promise<DailyStats> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const activities = await this.activityRepository.findByDateRange(startOfDay, endOfDay);
    
    if (activities.length === 0) {
      return this.getEmptyDailyStats(date);
    }

    const totalTime = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    
    // Project breakdown (design specification requirement)
    const projectBreakdown: { [projectId: string]: number } = {};
    activities.forEach(activity => {
      const projectId = activity.projectId;
      projectBreakdown[projectId] = (projectBreakdown[projectId] || 0) + (activity.duration || 0);
    });

    // Calculate hourly productivity scores to find peak/least productive hours
    const hourlyProductivity = new Array(24).fill(0);
    const hourlyActivityCount = new Array(24).fill(0);
    
    activities.forEach(activity => {
      const hour = new Date(activity.startTime).getHours();
      const duration = activity.duration || 0;
      hourlyProductivity[hour] += duration;
      hourlyActivityCount[hour]++;
    });

    // Find most and least productive hours
    const productiveHours = hourlyProductivity
      .map((duration, hour) => ({ hour, duration, score: duration / Math.max(hourlyActivityCount[hour], 1) }))
      .filter(h => h.duration > 0)
      .sort((a, b) => b.score - a.score);

    const mostProductiveHour = productiveHours.length > 0 ? productiveHours[0].hour : 0;
    const leastProductiveHour = productiveHours.length > 0 ? productiveHours[productiveHours.length - 1].hour : 0;

    // Calculate productivity and focus scores using new analyzer
    let productivityScore = 0;
    let focusScore = 0;
    let distractionCount = 0;

    try {
      const trendData = await this.productivityAnalyzer.calculateTrends(activities, 1);
      const dailyTrend = trendData.daily.find(d => 
        new Date(d.date).toDateString() === date.toDateString()
      );
      
      if (dailyTrend) {
        productivityScore = dailyTrend.productivityScore;
        focusScore = dailyTrend.focusScore;
        distractionCount = dailyTrend.projectSwitches;
      }
    } catch (error) {
      // Fallback to legacy calculation
      productivityScore = await this.calculateProductivityScore(activities);
      focusScore = this.calculateLegacyFocusScore(activities);
      distractionCount = this.calculateContextSwitches(activities);
    }

    // Legacy fields for backward compatibility
    const productiveTime = this.calculateProductiveTime(activities);
    const breakTime = this.calculateBreakTime(activities);
    const activeProjects = new Set(activities.map(a => a.projectId)).size;
    const completedActivities = activities.filter(a => a.endTime).length;
    const averageActivityDuration = completedActivities > 0 ? totalTime / completedActivities : 0;
    
    const hourlyBreakdown = new Array(24).fill(0);
    activities.forEach(activity => {
      const startHour = new Date(activity.startTime).getHours();
      const duration = activity.duration || 0;
      hourlyBreakdown[startHour] += duration;
    });
    
    const activityMap = new Map<string, number>();
    activities.forEach(activity => {
      const current = activityMap.get(activity.name) || 0;
      activityMap.set(activity.name, current + (activity.duration || 0));
    });
    
    const topActivities = Array.from(activityMap.entries())
      .map(([name, duration]) => ({
        name,
        duration,
        percentage: Math.round((duration / totalTime) * 100)
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    return {
      // Design specification fields
      date: date.toISOString(),
      totalTime,
      productivityScore,
      focusScore,
      projectBreakdown,
      activityCount: activities.length,
      distractionCount,
      mostProductiveHour,
      leastProductiveHour,
      // Legacy fields for backward compatibility
      productiveTime,
      breakTime,
      activeProjects,
      completedActivities,
      averageActivityDuration,
      hourlyBreakdown,
      topActivities
    };
  }

  private async calculateWeeklyStats(weekStart: Date): Promise<WeeklyStats> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const activities = await this.activityRepository.findByDateRange(weekStart, weekEnd);
    
    if (activities.length === 0) {
      return this.getEmptyWeeklyStats(weekStart, weekEnd);
    }

    const totalTime = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    
    // Calculate daily stats for each day of the week
    const dailyStats: DailyStats[] = [];
    let totalProductivity = 0;
    let totalFocus = 0;
    
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + i);
      
      try {
        const dayStats = await this.calculateDailyStats(dayDate);
        dailyStats.push(dayStats);
        totalProductivity += dayStats.productivityScore;
        totalFocus += dayStats.focusScore;
      } catch (error) {
        logger.error(`Failed to calculate stats for ${dayDate.toISOString()}`, error);
        // Add empty stats for missing days
        dailyStats.push(this.getEmptyDailyStats(dayDate));
      }
    }

    const averageProductivity = dailyStats.length > 0 ? totalProductivity / dailyStats.length : 0;
    const averageFocus = dailyStats.length > 0 ? totalFocus / dailyStats.length : 0;

    // Consistency score using ProductivityAnalyzer
    let consistencyScore = 0;
    try {
      const trendData = await this.productivityAnalyzer.calculateTrends(activities, 7);
      const insights = this.productivityAnalyzer.detectPatterns(trendData);
      const consistencyInsight = insights.find(i => i.type === 'consistency');
      consistencyScore = consistencyInsight ? consistencyInsight.value : 0;
    } catch (error) {
      // Fallback calculation
      const dailyTotals = dailyStats.map(d => d.totalTime);
      const avgDaily = totalTime / 7;
      const variance = dailyTotals.reduce((sum, daily) => sum + Math.pow(daily - avgDaily, 2), 0) / 7;
      consistencyScore = Math.max(0, Math.round(100 - (Math.sqrt(variance) / avgDaily) * 100));
    }

    // Weekly goal progress (40 hours = 100%)
    const weeklyGoal = 40 * 60 * 60 * 1000; // 40 hours in milliseconds
    const weeklyGoalProgress = Math.round((totalTime / weeklyGoal) * 100);

    // Legacy fields for backward compatibility
    const dailyTotals = new Array(7).fill(0);
    activities.forEach(activity => {
      const dayOfWeek = new Date(activity.startTime).getDay();
      dailyTotals[dayOfWeek] += activity.duration || 0;
    });
    
    const dailyAverages = dailyTotals.map(total => total / 7);
    
    const projectTime = new Map<string, number>();
    activities.forEach(activity => {
      const current = projectTime.get(activity.projectId) || 0;
      projectTime.set(activity.projectId, current + (activity.duration || 0));
    });
    
    const projectDistribution = Array.from(projectTime.entries()).map(([projectId, duration]) => ({
      projectId,
      duration,
      percentage: Math.round((duration / totalTime) * 100)
    }));

    const trends = {
      timeChange: 0, // Would need historical data
      productivityChange: 0, // Would need historical data
      focusChange: 0 // Would need historical data
    };
    
    return {
      // Design specification fields
      weekStart: weekStart.toISOString(),
      totalTime,
      dailyStats,
      consistencyScore,
      averageProductivity,
      averageFocus,
      totalActivities: activities.length,
      weeklyGoalProgress,
      // Legacy fields for backward compatibility
      weekEnd,
      dailyAverages,
      projectDistribution,
      trends
    };
  }

  private calculateProductiveTime(activities: Activity[]): number {
    return activities
      .filter(a => !this.isBreakActivity(a) && !this.isMeetingActivity(a))
      .reduce((sum, a) => sum + (a.duration || 0), 0);
  }

  private calculateBreakTime(activities: Activity[]): number {
    return activities
      .filter(a => this.isBreakActivity(a))
      .reduce((sum, a) => sum + (a.duration || 0), 0);
  }

  private async calculateProductivityScore(activities: Activity[]): Promise<number> {
    if (activities.length === 0) return 0;
    
    const totalTime = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const productiveTime = this.calculateProductiveTime(activities);
    
    return totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;
  }

  private calculatePeakProductivityHours(activities: Activity[]): number[] {
    const hourlyProductivity = new Array(24).fill(0);
    
    activities.forEach(activity => {
      if (!this.isBreakActivity(activity)) {
        const hour = new Date(activity.startTime).getHours();
        hourlyProductivity[hour] += activity.duration || 0;
      }
    });
    
    // Find top 3 hours
    return hourlyProductivity
      .map((duration, hour) => ({ hour, duration }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 3)
      .map(item => item.hour)
      .filter(hour => hourlyProductivity[hour] > 0);
  }

  private async analyzeDistractions(activities: Activity[]): Promise<DistractionPattern[]> {
    const patterns: DistractionPattern[] = [];
    
    if (activities.length === 0) return patterns;
    
    // Context switching analysis
    const contextSwitches = this.calculateContextSwitches(activities);
    const contextSwitchRate = contextSwitches / activities.length;
    
    if (contextSwitchRate > 0.3) {
      patterns.push({
        type: 'frequent_context_switching',
        severity: contextSwitchRate > 0.5 ? 'high' : 'medium',
        occurrences: contextSwitches,
        recommendation: 'Try to batch similar tasks together to reduce context switching',
        impact: Math.round(contextSwitchRate * 100)
      });
    }
    
    // Fragmented work analysis
    const shortActivities = activities.filter(a => (a.duration || 0) < 300000); // < 5 minutes
    const fragmentationRate = shortActivities.length / activities.length;
    
    if (fragmentationRate > 0.4) {
      patterns.push({
        type: 'fragmented_work',
        severity: fragmentationRate > 0.6 ? 'high' : 'medium',
        occurrences: shortActivities.length,
        recommendation: 'Consider time-blocking to create longer focused work sessions',
        impact: Math.round(fragmentationRate * 100)
      });
    }
    
    // Evening work pattern
    const eveningActivities = activities.filter(a => {
      const hour = new Date(a.startTime).getHours();
      return hour >= 20 || hour <= 6; // 8 PM to 6 AM
    });
    
    if (eveningActivities.length > activities.length * 0.2) {
      patterns.push({
        type: 'evening_work',
        severity: 'medium',
        occurrences: eveningActivities.length,
        recommendation: 'Consider shifting work to regular business hours for better work-life balance',
        impact: Math.round((eveningActivities.length / activities.length) * 100)
      });
    }
    
    return patterns;
  }

  private calculateContextSwitches(activities: Activity[]): number {
    let switches = 0;
    let lastProjectId: string | null = null;
    
    activities.forEach(activity => {
      if (lastProjectId && lastProjectId !== activity.projectId) {
        switches++;
      }
      lastProjectId = activity.projectId;
    });
    
    return switches;
  }

  private calculateFocusScore(avgDuration: number, contextSwitches: number, activityCount: number): number {
    if (activityCount === 0) return 0;
    
    // Base score from average activity duration (longer activities = better focus)
    const durationScore = Math.min(100, (avgDuration / 1800000) * 100); // 30 minutes = 100%
    
    // Penalty for context switching
    const switchPenalty = Math.min(50, (contextSwitches / activityCount) * 100);
    
    return Math.max(0, Math.round(durationScore - switchPenalty));
  }

  private generateRecommendations(data: any): string[] {
    const recommendations: string[] = [];
    
    if (data.productivityScore < 60) {
      recommendations.push('Your productivity score is below 60%. Consider reducing meetings and eliminating distractions.');
    }
    
    if (data.focusScore < 50) {
      recommendations.push('Your focus score indicates frequent task switching. Try time-blocking for better concentration.');
    }
    
    if (data.contextSwitches > data.avgActivityDuration / 300000) { // More switches than 5-minute intervals
      recommendations.push('High context switching detected. Group similar tasks together to maintain focus.');
    }
    
    if (data.peakHours.length > 0) {
      const peakHour = data.peakHours[0];
      recommendations.push(`You're most productive around ${peakHour}:00. Schedule important work during this time.`);
    }
    
    if (data.avgActivityDuration < 900000) { // Less than 15 minutes average
      recommendations.push('Your activities are quite short. Consider planning longer focused work sessions.');
    }
    
    // Distraction-specific recommendations
    data.distractionPatterns?.forEach((pattern: DistractionPattern) => {
      if (pattern.severity === 'high') {
        recommendations.push(pattern.recommendation);
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('Great work! Your productivity patterns look healthy. Keep up the good habits.');
    }
    
    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  private isBreakActivity(activity: Activity): boolean {
    if (!activity.tags) return false;
    return activity.tags.some(tag => 
      ['break', 'lunch', 'coffee', 'rest'].includes(tag.toLowerCase())
    ) || activity.name.toLowerCase().includes('break');
  }

  private isMeetingActivity(activity: Activity): boolean {
    if (!activity.tags) return false;
    return activity.tags.some(tag => 
      ['meeting', 'call', 'conference'].includes(tag.toLowerCase())
    ) || activity.name.toLowerCase().includes('meeting');
  }

  private async processHourlyAnalytics(): Promise<void> {
    try {
      const now = new Date();
      logger.debug('Processing hourly analytics', { timestamp: now });
      
      // Process today's analytics
      await this.processDailyAnalytics(now);
      
      // Emit analytics update event
      this.emit('analyticsProcessed', { timestamp: now });
    } catch (error) {
      logger.error('Failed to process hourly analytics:', error);
    }
  }

  private async processDailyAnalytics(date: Date): Promise<void> {
    try {
      // Force recalculation of today's stats
      const cacheKey = `daily_${this.formatDate(date)}`;
      await this.cacheRepository.invalidate(cacheKey);
      await this.getDailyStats(date);
      
      logger.debug('Processed daily analytics', { date: this.formatDate(date) });
    } catch (error) {
      logger.error('Failed to process daily analytics:', error);
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private isCacheExpired(cached: any, ttl: number): boolean {
    return Date.now() - new Date(cached.createdAt).getTime() > ttl;
  }

  private getEmptyDailyStats(date: Date): DailyStats {
    return {
      // Design specification fields
      date: date.toISOString(),
      totalTime: 0,
      productivityScore: 0,
      focusScore: 0,
      projectBreakdown: {},
      activityCount: 0,
      distractionCount: 0,
      mostProductiveHour: 0,
      leastProductiveHour: 0,
      // Legacy fields for backward compatibility
      productiveTime: 0,
      breakTime: 0,
      activeProjects: 0,
      completedActivities: 0,
      averageActivityDuration: 0,
      hourlyBreakdown: new Array(24).fill(0),
      topActivities: []
    };
  }

  private getEmptyWeeklyStats(weekStart: Date, weekEnd: Date): WeeklyStats {
    // Generate empty daily stats for the week
    const dailyStats: DailyStats[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + i);
      dailyStats.push(this.getEmptyDailyStats(dayDate));
    }

    return {
      // Design specification fields
      weekStart: weekStart.toISOString(),
      totalTime: 0,
      dailyStats,
      consistencyScore: 0,
      averageProductivity: 0,
      averageFocus: 0,
      totalActivities: 0,
      weeklyGoalProgress: 0,
      // Legacy fields for backward compatibility
      weekEnd,
      dailyAverages: new Array(7).fill(0),
      projectDistribution: [],
      trends: {
        timeChange: 0,
        productivityChange: 0,
        focusChange: 0
      }
    };
  }

  // Add missing helper methods
  private async getActivitiesForTimeRange(timeRange: TimeRange): Promise<Activity[]> {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
    }

    return await this.activityRepository.findByDateRange(startDate, now);
  }

  private calculateLegacyFocusScore(activities: Activity[]): number {
    if (activities.length === 0) return 0;
    
    const totalTime = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const averageActivityDuration = totalTime / activities.length;
    const contextSwitches = this.calculateContextSwitches(activities);
    
    return this.calculateFocusScore(averageActivityDuration, contextSwitches, activities.length);
  }

  private getLegacyTimeInsights(activities: Activity[]): TimeInsight[] {
    const insights: TimeInsight[] = [];

    // Peak hours insight
    const peakHours = this.calculatePeakProductivityHours(activities);
    if (peakHours.length > 0) {
      insights.push({
        type: 'peak_hours',
        title: 'Peak Productivity Hours',
        description: `You're most productive between ${peakHours[0]}:00-${peakHours[0] + 1}:00`,
        value: peakHours[0],
        unit: 'hour',
        severity: 'low',
        recommendations: ['Schedule your most important work during these hours'],
        trend: 'stable',
        actionable: true,
        suggestion: 'Schedule your most important work during these hours'
      });
    }

    // Productivity opportunity insight
    const productivityScore = this.calculateProductivityScore(activities);
    if (productivityScore < 60) {
      insights.push({
        type: 'productivity_trend',
        title: 'Productivity Opportunity',
        description: `Your productivity score is ${productivityScore}%`,
        value: productivityScore,
        unit: 'percent',
        severity: 'medium',
        recommendations: ['Focus on reducing interruptions and non-productive activities'],
        trend: 'down',
        actionable: true,
        suggestion: 'Focus on reducing interruptions and non-productive activities'
      });
    }

    return insights;
  }

  private getEmptyProductivityAnalysis(): ProductivityAnalysis {
    return {
      totalTime: 0,
      productiveTime: 0,
      productivityScore: 0,
      projectDistribution: [],
      peakProductivityHours: [],
      distractionPatterns: [],
      recommendations: ['Start tracking activities to receive personalized insights'],
      focusScore: 0,
      contextSwitches: 0
    };
  }

  dispose(): void {
    this.stop();
    this.removeAllListeners();
  }
}