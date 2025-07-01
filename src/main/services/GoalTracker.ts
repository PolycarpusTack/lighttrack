import { EventEmitter } from 'events';
import { Goal } from '../database/entities/Goal';
import { Achievement } from '../database/entities/Achievement';
import { Activity } from '../database/entities/Activity';
import { GoalRepository } from '../database/repositories/GoalRepository';
import { AchievementRepository } from '../database/repositories/AchievementRepository';
import { ActivityRepository } from '../database/repositories/ActivityRepository';
import { logger } from '../utils/logger';
import { 
  GoalProgress, 
  GoalInsight, 
  GoalStats, 
  AchievementType, 
  InsightType 
} from '@shared/types/goal';

export class GoalTracker extends EventEmitter {
  private static instance: GoalTracker;
  private goalRepository: GoalRepository;
  private achievementRepository: AchievementRepository;
  private activityRepository: ActivityRepository;
  private goals: Goal[] = [];
  private achievements: Achievement[] = [];

  private constructor() {
    super();
    this.goalRepository = new GoalRepository();
    this.achievementRepository = new AchievementRepository();
    this.activityRepository = new ActivityRepository();
    this.loadGoals();
  }

  static getInstance(): GoalTracker {
    if (!GoalTracker.instance) {
      GoalTracker.instance = new GoalTracker();
    }
    return GoalTracker.instance;
  }

  async loadGoals(): Promise<void> {
    try {
      this.goals = await this.goalRepository.findActive();
      this.achievements = await this.achievementRepository.findAll();
      logger.info('Goals loaded', { count: this.goals.length });
    } catch (error) {
      logger.error('Failed to load goals', error);
    }
  }

  async checkGoalProgress(): Promise<GoalProgress[]> {
    const progressList: GoalProgress[] = [];

    for (const goal of this.goals) {
      try {
        const progress = await this.calculateProgress(goal);
        const status = this.determineStatus(progress, goal);
        
        const goalProgress: GoalProgress = {
          goalId: goal.id,
          current: progress.current,
          target: goal.target.value,
          percentage: (progress.current / goal.target.value) * 100,
          status,
          projectedCompletion: this.projectCompletion(goal, progress),
          streak: goal.currentStreak,
          longestStreak: goal.longestStreak,
          lastUpdated: goal.lastProgressUpdate || goal.updatedAt,
          dailyProgress: progress.dailyProgress
        };

        progressList.push(goalProgress);

        // Update goal entity with latest progress
        await this.updateGoalProgress(goal, progress);

      } catch (error) {
        logger.error('Failed to calculate progress for goal', { goalId: goal.id, error });
      }
    }

    return progressList;
  }

  private async calculateProgress(goal: Goal): Promise<{
    current: number;
    dailyProgress: Array<{ date: Date; value: number; achieved: boolean; notes?: string }>;
  }> {
    const now = new Date();
    const startDate = new Date(goal.startDate);
    
    let current = 0;
    const dailyProgress: Array<{ date: Date; value: number; achieved: boolean; notes?: string }> = [];

    switch (goal.type) {
      case 'daily':
        current = await this.calculateDailyProgress(goal, now);
        break;
        
      case 'weekly':
        current = await this.calculateWeeklyProgress(goal, now);
        break;
        
      case 'project':
        current = await this.calculateProjectProgress(goal);
        break;
        
      case 'habit':
        const habitData = await this.calculateHabitProgress(goal, startDate, now);
        current = habitData.current;
        dailyProgress.push(...habitData.dailyProgress);
        break;
    }

    return { current, dailyProgress };
  }

  private async calculateDailyProgress(goal: Goal, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const activities = await this.activityRepository.findByDateRange(startOfDay, endOfDay);
    
    let totalValue = 0;

    for (const activity of activities) {
      if (goal.projectId && activity.projectId !== goal.projectId) {
        continue;
      }

      switch (goal.target.unit) {
        case 'hours':
          totalValue += activity.getDuration() / (1000 * 60 * 60);
          break;
        case 'minutes':
          totalValue += activity.getDuration() / (1000 * 60);
          break;
        case 'sessions':
          totalValue += 1;
          break;
        case 'tasks':
          if (activity.endTime) totalValue += 1;
          break;
      }
    }

    return totalValue;
  }

  private async calculateWeeklyProgress(goal: Goal, date: Date): Promise<number> {
    const weekStart = this.getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const activities = await this.activityRepository.findByDateRange(weekStart, weekEnd);
    
    let totalValue = 0;

    for (const activity of activities) {
      if (goal.projectId && activity.projectId !== goal.projectId) {
        continue;
      }

      switch (goal.target.unit) {
        case 'hours':
          totalValue += activity.getDuration() / (1000 * 60 * 60);
          break;
        case 'minutes':
          totalValue += activity.getDuration() / (1000 * 60);
          break;
        case 'sessions':
          totalValue += 1;
          break;
      }
    }

    return totalValue;
  }

  private async calculateProjectProgress(goal: Goal): Promise<number> {
    if (!goal.projectId) return 0;

    const activities = await this.activityRepository.findByProject(goal.projectId);
    const startDate = new Date(goal.startDate);
    
    let totalValue = 0;

    for (const activity of activities) {
      if (new Date(activity.startTime) < startDate) continue;

      switch (goal.target.unit) {
        case 'hours':
          totalValue += activity.getDuration() / (1000 * 60 * 60);
          break;
        case 'minutes':
          totalValue += activity.getDuration() / (1000 * 60);
          break;
        case 'sessions':
          totalValue += 1;
          break;
      }
    }

    return totalValue;
  }

  private async calculateHabitProgress(goal: Goal, startDate: Date, endDate: Date): Promise<{
    current: number;
    dailyProgress: Array<{ date: Date; value: number; achieved: boolean; notes?: string }>;
  }> {
    const dailyProgress: Array<{ date: Date; value: number; achieved: boolean; notes?: string }> = [];
    let streak = 0;
    let current = 0;

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayProgress = await this.calculateDailyProgress(goal, currentDate);
      const achieved = dayProgress >= goal.target.value;
      
      dailyProgress.push({
        date: new Date(currentDate),
        value: dayProgress,
        achieved,
        notes: achieved ? 'Goal achieved!' : undefined
      });

      if (achieved) {
        current++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { current, dailyProgress };
  }

  private determineStatus(progress: { current: number }, goal: Goal): 'on_track' | 'at_risk' | 'behind' | 'completed' | 'failed' {
    const percentage = (progress.current / goal.target.value) * 100;
    
    if (percentage >= 100) {
      return 'completed';
    }

    if (goal.endDate) {
      const now = new Date();
      const timeLeft = goal.endDate.getTime() - now.getTime();
      const totalTime = goal.endDate.getTime() - goal.startDate.getTime();
      const timeProgress = 1 - (timeLeft / totalTime);
      
      if (timeLeft <= 0) {
        return 'failed';
      }
      
      if (percentage < (timeProgress * 100) - 20) {
        return 'behind';
      }
      
      if (percentage < (timeProgress * 100) - 10) {
        return 'at_risk';
      }
    }
    
    return 'on_track';
  }

  private projectCompletion(goal: Goal, progress: { current: number }): Date | undefined {
    if (!goal.endDate || progress.current === 0) return undefined;

    const remainingTarget = goal.target.value - progress.current;
    if (remainingTarget <= 0) return new Date();

    const elapsed = new Date().getTime() - goal.startDate.getTime();
    const rate = progress.current / (elapsed / (1000 * 60 * 60 * 24)); // per day
    
    if (rate <= 0) return undefined;

    const daysToCompletion = remainingTarget / rate;
    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + Math.ceil(daysToCompletion));

    return projectedDate;
  }

  async createNotifications(progress: GoalProgress[]): Promise<any[]> {
    const notifications: any[] = [];
    
    for (const p of progress) {
      const goal = this.goals.find(g => g.id === p.goalId);
      if (!goal) continue;

      // Goal completed notification
      if (p.percentage >= 100 && !this.hasRecentAchievement(goal.id, 'goal_completed')) {
        await this.createAchievement(goal, 'goal_completed', {
          name: `${goal.name} Completed`,
          description: `Successfully completed goal: ${goal.name}`,
          icon: '🎉',
          color: '#22c55e'
        });

        notifications.push(this.createAchievementNotification(p, 'Goal completed!'));
      }

      // Streak milestone notification
      if (p.streak > 0 && p.streak % 7 === 0 && !this.hasRecentAchievement(goal.id, 'streak_milestone')) {
        await this.createAchievement(goal, 'streak_milestone', {
          name: `${p.streak} Day Streak`,
          description: `Maintained a ${p.streak} day streak for ${goal.name}`,
          icon: '🔥',
          color: '#ef4444',
          value: p.streak
        });

        notifications.push(this.createAchievementNotification(p, `${p.streak} day streak!`));
      }

      // Reminder notification
      if (p.percentage < 50 && this.isDeadlineNear(goal) && goal.shouldSendReminder()) {
        notifications.push(this.createReminderNotification(p, goal));
      }
    }
    
    return notifications;
  }

  private async createAchievement(goal: Goal, type: AchievementType, data: {
    name: string;
    description: string;
    icon: string;
    color: string;
    value?: number;
  }): Promise<Achievement> {
    const achievement = await this.achievementRepository.create({
      goalId: goal.id,
      type,
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      value: data.value,
      metadata: {
        streakLength: data.value,
        goalName: goal.name
      }
    });

    this.achievements.push(achievement);
    this.emit('achievement:earned', achievement);
    
    return achievement;
  }

  private hasRecentAchievement(goalId: string, type: AchievementType): boolean {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.achievements.some(a => 
      a.goalId === goalId && 
      a.type === type && 
      a.earnedAt > oneDayAgo
    );
  }

  private createAchievementNotification(progress: GoalProgress, message: string): any {
    return {
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message,
      goalId: progress.goalId,
      timestamp: new Date(),
      priority: 'high'
    };
  }

  private createReminderNotification(progress: GoalProgress, goal: Goal): any {
    return {
      type: 'reminder',
      title: 'Goal Reminder',
      message: `Don't forget about your goal: ${goal.name}. You're ${progress.percentage.toFixed(1)}% there!`,
      goalId: progress.goalId,
      timestamp: new Date(),
      priority: 'medium'
    };
  }

  private isDeadlineNear(goal: Goal): boolean {
    if (!goal.endDate) return false;
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    return goal.endDate <= threeDaysFromNow;
  }

  async generateInsights(): Promise<GoalInsight[]> {
    const insights: GoalInsight[] = [];
    const progressList = await this.checkGoalProgress();

    for (const progress of progressList) {
      const goal = this.goals.find(g => g.id === progress.goalId);
      if (!goal) continue;

      // Progress trend analysis
      if (progress.dailyProgress.length >= 7) {
        const recentProgress = progress.dailyProgress.slice(-7);
        const trend = this.analyzeTrend(recentProgress);
        
        if (trend.slope < -0.1) {
          insights.push({
            goalId: goal.id,
            type: 'progress_trend',
            message: 'Your progress has been declining over the past week.',
            actionable: true,
            suggestion: 'Consider adjusting your schedule or breaking the goal into smaller tasks.',
            priority: 'medium',
            generatedAt: new Date()
          });
        }
      }

      // Time pattern detection
      const timePattern = await this.detectTimePatterns(goal);
      if (timePattern.mostProductiveHour) {
        insights.push({
          goalId: goal.id,
          type: 'time_pattern',
          message: `You're most productive around ${timePattern.mostProductiveHour}:00.`,
          actionable: true,
          suggestion: 'Schedule your goal activities during this time for better results.',
          priority: 'low',
          generatedAt: new Date()
        });
      }

      // Difficulty adjustment suggestion
      if (progress.percentage < 20 && this.getDaysSinceStart(goal) > 7) {
        insights.push({
          goalId: goal.id,
          type: 'difficulty_adjustment',
          message: 'This goal might be too ambitious for your current schedule.',
          actionable: true,
          suggestion: 'Consider reducing the target or extending the deadline.',
          priority: 'high',
          generatedAt: new Date()
        });
      }
    }

    return insights;
  }

  private analyzeTrend(dailyProgress: Array<{ date: Date; value: number; achieved: boolean }>): { slope: number; correlation: number } {
    const values = dailyProgress.map(p => p.value);
    const n = values.length;
    
    if (n < 2) return { slope: 0, correlation: 0 };

    const sumX = n * (n - 1) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumXX = n * (n - 1) * (2 * n - 1) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return { slope, correlation: 0 }; // Simplified for now
  }

  private async detectTimePatterns(goal: Goal): Promise<{ mostProductiveHour?: number }> {
    // Simplified time pattern detection
    const activities = await this.activityRepository.findByProject(goal.projectId || '');
    const hourlyData: { [hour: number]: number } = {};

    for (const activity of activities) {
      const hour = new Date(activity.startTime).getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + activity.getDuration();
    }

    const mostProductiveHour = Object.entries(hourlyData)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    return { mostProductiveHour: mostProductiveHour ? parseInt(mostProductiveHour) : undefined };
  }

  private getDaysSinceStart(goal: Goal): number {
    const now = new Date();
    const start = new Date(goal.startDate);
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private async updateGoalProgress(goal: Goal, progress: { current: number; dailyProgress: any[] }): Promise<void> {
    const streak = goal.calculateStreak();
    
    await this.goalRepository.update(goal.id, {
      currentStreak: streak,
      longestStreak: Math.max(goal.longestStreak, streak),
      lastProgressUpdate: new Date(),
      progressHistory: progress.dailyProgress.map(p => ({
        date: p.date.toISOString().split('T')[0],
        value: p.value,
        achieved: p.achieved,
        notes: p.notes
      }))
    });
  }

  async getGoalStats(): Promise<GoalStats> {
    const allGoals = await this.goalRepository.findAll();
    const activeGoals = allGoals.filter(g => g.isActive);
    const completedGoals = allGoals.filter(g => g.isCompleted());
    
    return {
      totalGoals: allGoals.length,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      totalAchievements: this.achievements.length,
      longestStreak: Math.max(...allGoals.map(g => g.longestStreak), 0),
      averageCompletionRate: completedGoals.length / Math.max(allGoals.length, 1) * 100,
      timeSpentOnGoals: 0, // Calculate from activities
      improvementTrend: 0 // Calculate improvement over time
    };
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}