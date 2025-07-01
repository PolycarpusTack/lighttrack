import { Activity } from '@shared/types/activity';
import { logger } from '../../utils/logger';

/**
 * Trend data structure for productivity analysis
 */
export interface TrendData {
  daily: DailyTrend[];
  hourly: HourlyTrend[];
  weekly: WeeklyTrend[];
  categories: CategoryTrend[];
}

export interface DailyTrend {
  date: Date;
  totalTime: number;
  productiveTime: number;
  productivityScore: number;
  focusScore: number;
  activityCount: number;
  projectSwitches: number;
}

export interface HourlyTrend {
  hour: number;
  totalTime: number;
  productivityScore: number;
  activityCount: number;
  averageFocusDuration: number;
}

export interface WeeklyTrend {
  weekStart: Date;
  totalTime: number;
  averageDaily: number;
  consistencyScore: number;
  weeklyGoalProgress: number;
}

export interface CategoryTrend {
  category: string;
  totalTime: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Insight result from pattern analysis
 */
export interface InsightResult {
  type: 'peak_hours' | 'distraction_pattern' | 'productivity_trend' | 'project_balance' | 'consistency' | 'goal_progress';
  title: string;
  description: string;
  value: number;
  unit: string;
  severity: 'low' | 'medium' | 'high';
  trend: 'improving' | 'declining' | 'stable';
  recommendations: string[];
  metadata: { [key: string]: any };
}

/**
 * Peak productivity analysis
 */
export interface PeakProductivityAnalysis {
  peakHours: number[];
  peakDays: string[];
  averageSessionLength: number;
  optimalBreakInterval: number;
  productivityPattern: 'morning' | 'afternoon' | 'evening' | 'distributed';
}

/**
 * ProductivityAnalyzer Service - Implements exact specification requirements
 * 
 * Purpose: Track productivity patterns over time with advanced analytics
 * Features:
 * - Calculate daily productive hours and weekly averages
 * - Track goal progress and peak hours identification
 * - Detect patterns (peak hours, consistency, project switching)
 * - Generate actionable insights and recommendations
 */
export class ProductivityAnalyzer {
  private static instance: ProductivityAnalyzer;
  
  static getInstance(): ProductivityAnalyzer {
    if (!ProductivityAnalyzer.instance) {
      ProductivityAnalyzer.instance = new ProductivityAnalyzer();
    }
    return ProductivityAnalyzer.instance;
  }

  /**
   * Calculate comprehensive trends according to design specification
   */
  async calculateTrends(activities: Activity[], days: number = 7): Promise<TrendData> {
    try {
      logger.debug('Calculating productivity trends', { 
        activityCount: activities.length, 
        days 
      });

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Filter activities to the specified time range
      const filteredActivities = activities.filter(activity => {
        const activityDate = new Date(activity.startTime);
        return activityDate >= startDate && activityDate <= endDate;
      });

      // Calculate all trend components
      const [daily, hourly, weekly, categories] = await Promise.all([
        this.calculateDailyTotals(filteredActivities, days),
        this.calculateHourlyDistribution(filteredActivities),
        this.calculateWeeklyPatterns(filteredActivities),
        this.calculateCategoryBreakdown(filteredActivities)
      ]);

      const trendData: TrendData = {
        daily,
        hourly,
        weekly,
        categories
      };

      logger.debug('Productivity trends calculated', {
        dailyTrends: daily.length,
        hourlyTrends: hourly.length,
        weeklyTrends: weekly.length,
        categories: categories.length
      });

      return trendData;
    } catch (error) {
      logger.error('Failed to calculate productivity trends', error);
      throw new Error(`Trend calculation failed: ${error.message}`);
    }
  }

  /**
   * Detect patterns and generate insights (core specification requirement)
   */
  detectPatterns(trendData: TrendData): InsightResult[] {
    try {
      logger.debug('Detecting productivity patterns');

      const insights: InsightResult[] = [];

      // 1. Peak productivity hours analysis
      const peakHoursInsight = this.findPeakProductivityHours(trendData.hourly);
      insights.push(peakHoursInsight);

      // 2. Consistency analysis
      const consistencyInsight = this.analyzeConsistency(trendData.daily);
      insights.push(consistencyInsight);

      // 3. Project focus analysis
      const projectFocusInsight = this.analyzeProjectSwitching(trendData);
      insights.push(projectFocusInsight);

      // 4. Goal progress analysis
      const goalProgressInsight = this.analyzeGoalProgress(trendData);
      insights.push(goalProgressInsight);

      // 5. Productivity trend analysis
      const productivityTrendInsight = this.analyzeProductivityTrend(trendData.daily);
      insights.push(productivityTrendInsight);

      // 6. Distraction pattern analysis
      const distractionInsight = this.analyzeDistractionPatterns(trendData);
      insights.push(distractionInsight);

      logger.debug('Pattern detection completed', { insightCount: insights.length });

      return insights.filter(insight => insight !== null);
    } catch (error) {
      logger.error('Failed to detect patterns', error);
      return [];
    }
  }

  /**
   * Peak productivity hours identification (specification requirement)
   */
  findPeakProductivityHours(hourlyData: HourlyTrend[]): InsightResult {
    const sortedHours = hourlyData
      .filter(h => h.totalTime > 0)
      .sort((a, b) => b.productivityScore - a.productivityScore);

    const topHours = sortedHours.slice(0, 3).map(h => h.hour);
    const averageScore = sortedHours.slice(0, 3)
      .reduce((sum, h) => sum + h.productivityScore, 0) / 3;

    const peakHourRanges = this.groupConsecutiveHours(topHours);
    const description = this.formatPeakHoursDescription(peakHourRanges);

    return {
      type: 'peak_hours',
      title: 'Peak Productivity Hours',
      description,
      value: Math.round(averageScore),
      unit: 'productivity score',
      severity: averageScore > 80 ? 'low' : averageScore > 60 ? 'medium' : 'high',
      trend: 'stable', // Would need historical data for trend
      recommendations: this.generatePeakHoursRecommendations(topHours, averageScore),
      metadata: {
        peakHours: topHours,
        peakHourRanges,
        totalHoursAnalyzed: hourlyData.length
      }
    };
  }

  /**
   * Consistency analysis across days (specification requirement)
   */
  analyzeConsistency(dailyData: DailyTrend[]): InsightResult {
    if (dailyData.length < 2) {
      return {
        type: 'consistency',
        title: 'Consistency Analysis',
        description: 'Need more data for consistency analysis',
        value: 0,
        unit: 'consistency score',
        severity: 'high',
        trend: 'stable',
        recommendations: ['Continue tracking for better insights'],
        metadata: { dataPoints: dailyData.length }
      };
    }

    const dailyTotals = dailyData.map(d => d.totalTime);
    const mean = dailyTotals.reduce((sum, t) => sum + t, 0) / dailyTotals.length;
    const variance = dailyTotals.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / dailyTotals.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;

    // Convert to consistency score (lower CV = higher consistency)
    const consistencyScore = Math.round(Math.max(0, (1 - coefficientOfVariation) * 100));

    let severity: 'low' | 'medium' | 'high';
    let recommendations: string[] = [];

    if (consistencyScore > 70) {
      severity = 'low';
      recommendations.push('Excellent consistency! Keep up the steady work pattern.');
    } else if (consistencyScore > 40) {
      severity = 'medium';
      recommendations.push('Consider establishing more regular work schedules.');
      recommendations.push('Try time-blocking to maintain consistent daily targets.');
    } else {
      severity = 'high';
      recommendations.push('High variability detected. Set daily time goals for better consistency.');
      recommendations.push('Consider using focus timers and regular break schedules.');
    }

    return {
      type: 'consistency',
      title: 'Work Consistency',
      description: `Your work schedule has ${consistencyScore}% consistency across ${dailyData.length} days`,
      value: consistencyScore,
      unit: 'consistency score',
      severity,
      trend: this.calculateTrend(dailyData.map(d => d.totalTime)),
      recommendations,
      metadata: {
        mean: Math.round(mean),
        standardDeviation: Math.round(standardDeviation),
        coefficientOfVariation: Math.round(coefficientOfVariation * 100) / 100,
        daysAnalyzed: dailyData.length
      }
    };
  }

  /**
   * Project switching analysis (specification requirement)
   */
  analyzeProjectSwitching(trendData: TrendData): InsightResult {
    const totalSwitches = trendData.daily.reduce((sum, d) => sum + d.projectSwitches, 0);
    const totalDays = trendData.daily.length;
    const averageSwitchesPerDay = totalDays > 0 ? totalSwitches / totalDays : 0;

    let severity: 'low' | 'medium' | 'high';
    let recommendations: string[] = [];

    if (averageSwitchesPerDay < 3) {
      severity = 'low';
      recommendations.push('Good focus! You maintain long sessions on projects.');
    } else if (averageSwitchesPerDay < 8) {
      severity = 'medium';
      recommendations.push('Consider batching similar tasks within projects.');
      recommendations.push('Try dedicating specific time blocks to single projects.');
    } else {
      severity = 'high';
      recommendations.push('High context switching detected. This may impact productivity.');
      recommendations.push('Use project-focused time blocking to reduce switching.');
      recommendations.push('Group related tasks to minimize project changes.');
    }

    return {
      type: 'project_balance',
      title: 'Project Switching Pattern',
      description: `You switch between projects ${Math.round(averageSwitchesPerDay * 10) / 10} times per day on average`,
      value: Math.round(averageSwitchesPerDay * 10) / 10,
      unit: 'switches/day',
      severity,
      trend: 'stable', // Would need historical comparison
      recommendations,
      metadata: {
        totalSwitches,
        totalDays,
        averageSwitchesPerDay
      }
    };
  }

  /**
   * Private helper methods for comprehensive analysis
   */
  private async calculateDailyTotals(activities: Activity[], days: number): Promise<DailyTrend[]> {
    const dailyMap = new Map<string, DailyTrend>();
    
    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      dailyMap.set(dateKey, {
        date: new Date(date),
        totalTime: 0,
        productiveTime: 0,
        productivityScore: 0,
        focusScore: 0,
        activityCount: 0,
        projectSwitches: 0
      });
    }

    // Process activities
    activities.forEach((activity, index) => {
      const dateKey = new Date(activity.startTime).toISOString().split('T')[0];
      const dailyTrend = dailyMap.get(dateKey);
      
      if (dailyTrend) {
        dailyTrend.totalTime += activity.duration || 0;
        dailyTrend.activityCount++;
        
        // Calculate productive time (non-break activities)
        if (!this.isBreakActivity(activity)) {
          dailyTrend.productiveTime += activity.duration || 0;
        }

        // Count project switches
        if (index > 0) {
          const prevActivity = activities[index - 1];
          const prevDate = new Date(prevActivity.startTime).toISOString().split('T')[0];
          if (dateKey === prevDate && activity.projectId !== prevActivity.projectId) {
            dailyTrend.projectSwitches++;
          }
        }
      }
    });

    // Calculate scores for each day
    dailyMap.forEach(trend => {
      trend.productivityScore = this.calculateDailyProductivityScore(trend);
      trend.focusScore = this.calculateDailyFocusScore(trend);
    });

    return Array.from(dailyMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private async calculateHourlyDistribution(activities: Activity[]): Promise<HourlyTrend[]> {
    const hourlyMap = new Map<number, HourlyTrend>();
    
    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyMap.set(hour, {
        hour,
        totalTime: 0,
        productivityScore: 0,
        activityCount: 0,
        averageFocusDuration: 0
      });
    }

    // Process activities
    const focusDurations: { [hour: number]: number[] } = {};
    
    activities.forEach(activity => {
      const hour = new Date(activity.startTime).getHours();
      const hourlyTrend = hourlyMap.get(hour)!;
      
      hourlyTrend.totalTime += activity.duration || 0;
      hourlyTrend.activityCount++;
      
      if (!focusDurations[hour]) {
        focusDurations[hour] = [];
      }
      focusDurations[hour].push(activity.duration || 0);
    });

    // Calculate hourly scores
    hourlyMap.forEach((trend, hour) => {
      if (trend.activityCount > 0) {
        trend.productivityScore = this.calculateHourlyProductivityScore(trend, activities);
        
        const durations = focusDurations[hour] || [];
        trend.averageFocusDuration = durations.length > 0 
          ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
          : 0;
      }
    });

    return Array.from(hourlyMap.values());
  }

  private async calculateWeeklyPatterns(activities: Activity[]): Promise<WeeklyTrend[]> {
    // Group activities by week
    const weeklyMap = new Map<string, { activities: Activity[]; weekStart: Date }>();
    
    activities.forEach(activity => {
      const date = new Date(activity.startTime);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          activities: [],
          weekStart: new Date(weekStart)
        });
      }
      
      weeklyMap.get(weekKey)!.activities.push(activity);
    });

    // Calculate weekly trends
    const weeklyTrends: WeeklyTrend[] = [];
    
    weeklyMap.forEach(({ activities: weekActivities, weekStart }) => {
      const totalTime = weekActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
      const dailyTimes = new Array(7).fill(0);
      
      weekActivities.forEach(activity => {
        const dayOfWeek = new Date(activity.startTime).getDay();
        dailyTimes[dayOfWeek] += activity.duration || 0;
      });
      
      const activeDays = dailyTimes.filter(time => time > 0).length;
      const averageDaily = activeDays > 0 ? totalTime / activeDays : 0;
      
      // Calculate consistency for the week
      const mean = averageDaily;
      const variance = dailyTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / 7;
      const consistencyScore = Math.round(Math.max(0, (1 - Math.sqrt(variance) / mean) * 100));
      
      weeklyTrends.push({
        weekStart,
        totalTime,
        averageDaily,
        consistencyScore: isNaN(consistencyScore) ? 0 : consistencyScore,
        weeklyGoalProgress: this.calculateWeeklyGoalProgress(totalTime)
      });
    });

    return weeklyTrends.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  }

  private async calculateCategoryBreakdown(activities: Activity[]): Promise<CategoryTrend[]> {
    const categoryMap = new Map<string, number>();
    const totalTime = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    
    activities.forEach(activity => {
      const category = this.categorizeActivity(activity);
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + (activity.duration || 0));
    });

    const categoryTrends: CategoryTrend[] = [];
    categoryMap.forEach((time, category) => {
      categoryTrends.push({
        category,
        totalTime: time,
        percentage: totalTime > 0 ? Math.round((time / totalTime) * 100 * 10) / 10 : 0,
        trend: 'stable' // Would need historical data for trend calculation
      });
    });

    return categoryTrends.sort((a, b) => b.totalTime - a.totalTime);
  }

  // Additional helper methods for comprehensive analysis
  private analyzeGoalProgress(trendData: TrendData): InsightResult {
    const weeklyData = trendData.weekly[trendData.weekly.length - 1]; // Latest week
    const progress = weeklyData ? weeklyData.weeklyGoalProgress : 0;
    
    return {
      type: 'goal_progress',
      title: 'Weekly Goal Progress',
      description: `You've completed ${progress}% of your weekly time goal`,
      value: progress,
      unit: 'percent',
      severity: progress > 80 ? 'low' : progress > 60 ? 'medium' : 'high',
      trend: 'stable',
      recommendations: progress < 80 
        ? ['Consider adjusting your daily schedule to meet weekly goals']
        : ['Great progress! Keep up the consistent effort'],
      metadata: { weeklyGoal: 40 * 60 * 60 * 1000 } // 40 hours in milliseconds
    };
  }

  private analyzeProductivityTrend(dailyData: DailyTrend[]): InsightResult {
    const scores = dailyData.map(d => d.productivityScore);
    const trend = this.calculateTrend(scores);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    return {
      type: 'productivity_trend',
      title: 'Productivity Trend',
      description: `Your productivity is ${trend} with an average score of ${Math.round(average)}`,
      value: Math.round(average),
      unit: 'productivity score',
      severity: average > 70 ? 'low' : average > 50 ? 'medium' : 'high',
      trend,
      recommendations: this.getProductivityRecommendations(trend, average),
      metadata: { dataPoints: scores.length, trend }
    };
  }

  private analyzeDistractionPatterns(trendData: TrendData): InsightResult {
    const hourlyData = trendData.hourly;
    const lowProductivityHours = hourlyData
      .filter(h => h.productivityScore < 50 && h.totalTime > 0)
      .sort((a, b) => a.productivityScore - b.productivityScore);

    const distractionScore = lowProductivityHours.length;
    
    return {
      type: 'distraction_pattern',
      title: 'Distraction Analysis',
      description: `${distractionScore} hours show lower productivity patterns`,
      value: distractionScore,
      unit: 'distracted hours',
      severity: distractionScore > 6 ? 'high' : distractionScore > 3 ? 'medium' : 'low',
      trend: 'stable',
      recommendations: this.getDistractionRecommendations(lowProductivityHours),
      metadata: { 
        lowProductivityHours: lowProductivityHours.map(h => h.hour),
        averageDistractionScore: lowProductivityHours.reduce((sum, h) => sum + h.productivityScore, 0) / lowProductivityHours.length || 0
      }
    };
  }

  // Utility methods
  private calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
    if (values.length < 3) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.ceil(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  private groupConsecutiveHours(hours: number[]): string[] {
    const sorted = [...hours].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(start === end ? `${start}:00` : `${start}:00-${end}:00`);
        start = end = sorted[i];
      }
    }
    
    ranges.push(start === end ? `${start}:00` : `${start}:00-${end}:00`);
    return ranges;
  }

  private formatPeakHoursDescription(ranges: string[]): string {
    if (ranges.length === 1) {
      return `Your peak productivity occurs during ${ranges[0]}`;
    }
    return `Your peak productivity occurs during ${ranges.join(', ')}`;
  }

  private generatePeakHoursRecommendations(hours: number[], score: number): string[] {
    const recommendations: string[] = [];
    
    if (score > 80) {
      recommendations.push('Excellent! Schedule your most important tasks during these peak hours.');
    } else {
      recommendations.push('Consider optimizing your environment during peak hours for better focus.');
    }
    
    if (hours.some(h => h < 9)) {
      recommendations.push('You\'re productive in the morning - consider starting important work early.');
    }
    
    if (hours.some(h => h > 18)) {
      recommendations.push('Evening productivity detected - ensure proper work-life balance.');
    }
    
    return recommendations;
  }

  private getProductivityRecommendations(trend: 'improving' | 'declining' | 'stable', average: number): string[] {
    const recommendations: string[] = [];
    
    if (trend === 'improving') {
      recommendations.push('Great progress! Continue with your current strategies.');
    } else if (trend === 'declining') {
      recommendations.push('Consider reviewing recent changes that might affect productivity.');
      recommendations.push('Try implementing focus techniques like Pomodoro timer.');
    } else {
      recommendations.push('Stable productivity detected. Consider new optimization strategies.');
    }
    
    if (average < 50) {
      recommendations.push('Focus on eliminating distractions during work hours.');
    }
    
    return recommendations;
  }

  private getDistractionRecommendations(lowProductivityHours: HourlyTrend[]): string[] {
    const recommendations: string[] = [];
    
    if (lowProductivityHours.length > 0) {
      const worstHour = lowProductivityHours[0].hour;
      recommendations.push(`Consider scheduling breaks or less demanding tasks around ${worstHour}:00.`);
    }
    
    if (lowProductivityHours.length > 3) {
      recommendations.push('Multiple low-productivity periods detected. Review your daily schedule and energy levels.');
    }
    
    return recommendations;
  }

  private calculateDailyProductivityScore(trend: DailyTrend): number {
    if (trend.totalTime === 0) return 0;
    
    const productiveRatio = trend.productiveTime / trend.totalTime;
    const switchPenalty = Math.min(trend.projectSwitches * 5, 30); // Max 30% penalty
    const baseScore = productiveRatio * 100;
    
    return Math.round(Math.max(0, baseScore - switchPenalty));
  }

  private calculateDailyFocusScore(trend: DailyTrend): number {
    if (trend.activityCount === 0) return 0;
    
    const averageActivityLength = trend.totalTime / trend.activityCount;
    const focusThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    // Score based on average activity length and project switches
    const lengthScore = Math.min((averageActivityLength / focusThreshold) * 70, 70);
    const switchPenalty = Math.min(trend.projectSwitches * 3, 30);
    
    return Math.round(Math.max(0, lengthScore + 30 - switchPenalty));
  }

  private calculateHourlyProductivityScore(trend: HourlyTrend, allActivities: Activity[]): number {
    if (trend.totalTime === 0) return 0;
    
    // Activities in this hour
    const hourActivities = allActivities.filter(a => 
      new Date(a.startTime).getHours() === trend.hour
    );
    
    const productiveActivities = hourActivities.filter(a => !this.isBreakActivity(a));
    const productiveTime = productiveActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
    
    return Math.round((productiveTime / trend.totalTime) * 100);
  }

  private calculateWeeklyGoalProgress(totalTime: number): number {
    const weeklyGoal = 40 * 60 * 60 * 1000; // 40 hours in milliseconds
    return Math.round((totalTime / weeklyGoal) * 100);
  }

  private categorizeActivity(activity: Activity): string {
    // Simple categorization - could be enhanced with ML or user-defined rules
    const name = activity.name.toLowerCase();
    
    if (name.includes('meeting') || name.includes('call')) return 'Meetings';
    if (name.includes('code') || name.includes('develop') || name.includes('program')) return 'Development';
    if (name.includes('design') || name.includes('ui') || name.includes('ux')) return 'Design';
    if (name.includes('email') || name.includes('slack') || name.includes('message')) return 'Communication';
    if (name.includes('break') || name.includes('lunch') || name.includes('coffee')) return 'Breaks';
    if (name.includes('research') || name.includes('learn') || name.includes('study')) return 'Research';
    
    return 'Other';
  }

  private isBreakActivity(activity: Activity): boolean {
    const breakKeywords = ['break', 'lunch', 'coffee', 'rest', 'personal'];
    const name = activity.name.toLowerCase();
    return breakKeywords.some(keyword => name.includes(keyword));
  }
}