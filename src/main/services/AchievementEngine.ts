import { EventEmitter } from 'events';
import { Goal } from '../database/entities/Goal';
import { Achievement, AchievementType } from '../database/entities/Achievement';
import { Activity } from '../database/entities/Activity';
import { AchievementRepository } from '../database/repositories/AchievementRepository';
import { GoalRepository } from '../database/repositories/GoalRepository';
import { ActivityRepository } from '../database/repositories/ActivityRepository';
import { logger } from '../utils/logger';

interface AchievementRule {
  type: AchievementType;
  name: string;
  description: string;
  icon: string;
  color: string;
  condition: (data: AchievementCheckData) => boolean | Promise<boolean>;
  value?: (data: AchievementCheckData) => number;
  metadata?: (data: AchievementCheckData) => any;
}

interface AchievementCheckData {
  goal: Goal;
  progress: {
    current: number;
    percentage: number;
    streak: number;
    longestStreak: number;
  };
  activities: Activity[];
  allGoals: Goal[];
  existingAchievements: Achievement[];
}

export class AchievementEngine extends EventEmitter {
  private static instance: AchievementEngine;
  private achievementRepository: AchievementRepository;
  private goalRepository: GoalRepository;
  private activityRepository: ActivityRepository;
  private rules: AchievementRule[] = [];

  private constructor() {
    super();
    this.achievementRepository = new AchievementRepository();
    this.goalRepository = new GoalRepository();
    this.activityRepository = new ActivityRepository();
    this.initializeRules();
  }

  static getInstance(): AchievementEngine {
    if (!AchievementEngine.instance) {
      AchievementEngine.instance = new AchievementEngine();
    }
    return AchievementEngine.instance;
  }

  private initializeRules(): void {
    this.rules = [
      // Goal completion achievement
      {
        type: 'goal_completed',
        name: 'Goal Crusher',
        description: 'Completed a goal successfully',
        icon: '🎉',
        color: '#22c55e',
        condition: (data) => data.progress.percentage >= 100,
        metadata: (data) => ({
          goalName: data.goal.name,
          completionPercentage: data.progress.percentage
        })
      },

      // Streak milestones
      {
        type: 'streak_milestone',
        name: 'Streak Master',
        description: 'Maintained an impressive streak',
        icon: '🔥',
        color: '#ef4444',
        condition: (data) => {
          const streak = data.progress.streak;
          return streak > 0 && (streak === 7 || streak === 14 || streak === 30 || streak === 100 || streak % 50 === 0);
        },
        value: (data) => data.progress.streak,
        metadata: (data) => ({
          streakLength: data.progress.streak,
          goalName: data.goal.name
        })
      },

      // Time-based milestones
      {
        type: 'time_milestone',
        name: 'Time Champion',
        description: 'Reached a significant time milestone',
        icon: '⏰',
        color: '#3b82f6',
        condition: async (data) => {
          if (data.goal.target.unit !== 'hours' && data.goal.target.unit !== 'minutes') {
            return false;
          }

          const currentHours = data.goal.target.unit === 'hours' 
            ? data.progress.current 
            : data.progress.current / 60;

          const milestones = [10, 25, 50, 100, 250, 500, 1000];
          return milestones.some(milestone => 
            currentHours >= milestone && 
            !data.existingAchievements.some(a => 
              a.type === 'time_milestone' && a.value === milestone
            )
          );
        },
        value: (data) => {
          const currentHours = data.goal.target.unit === 'hours' 
            ? data.progress.current 
            : data.progress.current / 60;
          const milestones = [10, 25, 50, 100, 250, 500, 1000];
          return milestones.filter(milestone => currentHours >= milestone).pop() || 0;
        },
        metadata: (data) => ({
          timeSpent: data.progress.current,
          unit: data.goal.target.unit,
          goalName: data.goal.name
        })
      },

      // Consistency badge
      {
        type: 'consistency_badge',
        name: 'Consistency Champion',
        description: 'Demonstrated remarkable consistency',
        icon: '📅',
        color: '#8b5cf6',
        condition: (data) => {
          if (!data.goal.progressHistory || data.goal.progressHistory.length < 7) {
            return false;
          }

          const lastWeek = data.goal.progressHistory.slice(-7);
          const achievedDays = lastWeek.filter(p => p.achieved).length;
          return achievedDays >= 6; // 6 out of 7 days
        },
        metadata: (data) => ({
          achievedDays: data.goal.progressHistory?.slice(-7).filter(p => p.achieved).length || 0,
          totalDays: 7,
          goalName: data.goal.name
        })
      },

      // Improvement badge
      {
        type: 'improvement_badge',
        name: 'Rising Star',
        description: 'Showed significant improvement',
        icon: '📈',
        color: '#10b981',
        condition: (data) => {
          if (!data.goal.progressHistory || data.goal.progressHistory.length < 14) {
            return false;
          }

          const lastTwoWeeks = data.goal.progressHistory.slice(-14);
          const firstWeek = lastTwoWeeks.slice(0, 7);
          const secondWeek = lastTwoWeeks.slice(7);

          const firstWeekAvg = firstWeek.reduce((sum, p) => sum + p.value, 0) / 7;
          const secondWeekAvg = secondWeek.reduce((sum, p) => sum + p.value, 0) / 7;

          return secondWeekAvg > firstWeekAvg * 1.25; // 25% improvement
        },
        metadata: (data) => ({
          improvementRate: this.calculateImprovementRate(data.goal.progressHistory || []),
          goalName: data.goal.name
        })
      },

      // First goal achievement
      {
        type: 'first_goal',
        name: 'Goal Setter',
        description: 'Created your first goal',
        icon: '🌟',
        color: '#f59e0b',
        condition: (data) => {
          return data.allGoals.length === 1 && 
                 !data.existingAchievements.some(a => a.type === 'first_goal');
        }
      },

      // Productive week
      {
        type: 'productive_week',
        name: 'Productivity Master',
        description: 'Had an exceptionally productive week',
        icon: '💪',
        color: '#6366f1',
        condition: async (data) => {
          const weekStart = this.getWeekStart(new Date());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          const weekActivities = data.activities.filter(a => {
            const activityDate = new Date(a.startTime);
            return activityDate >= weekStart && activityDate < weekEnd;
          });

          const totalHours = weekActivities.reduce((sum, activity) => 
            sum + (activity.getDuration() / (1000 * 60 * 60)), 0
          );

          return totalHours >= 40; // 40+ hours in a week
        },
        metadata: (data) => ({
          weeklyHours: this.calculateWeeklyHours(data.activities),
          goalName: data.goal.name
        })
      },

      // Early bird achievement
      {
        type: 'early_bird',
        name: 'Early Bird',
        description: 'Consistently working in the morning',
        icon: '🌅',
        color: '#f97316',
        condition: (data) => {
          const morningActivities = data.activities.filter(a => {
            const hour = new Date(a.startTime).getHours();
            return hour >= 5 && hour <= 9;
          });

          return morningActivities.length >= 5; // 5+ morning sessions
        },
        metadata: (data) => ({
          morningActivities: data.activities.filter(a => {
            const hour = new Date(a.startTime).getHours();
            return hour >= 5 && hour <= 9;
          }).length,
          goalName: data.goal.name
        })
      },

      // Night owl achievement
      {
        type: 'night_owl',
        name: 'Night Owl',
        description: 'Burning the midnight oil',
        icon: '🦉',
        color: '#6b7280',
        condition: (data) => {
          const nightActivities = data.activities.filter(a => {
            const hour = new Date(a.startTime).getHours();
            return hour >= 22 || hour <= 2;
          });

          return nightActivities.length >= 5; // 5+ night sessions
        },
        metadata: (data) => ({
          nightActivities: data.activities.filter(a => {
            const hour = new Date(a.startTime).getHours();
            return hour >= 22 || hour <= 2;
          }).length,
          goalName: data.goal.name
        })
      }
    ];
  }

  async checkAchievements(goal: Goal): Promise<Achievement[]> {
    try {
      const newAchievements: Achievement[] = [];
      
      // Get existing achievements for this goal
      const existingAchievements = await this.achievementRepository.findByGoal(goal.id);
      
      // Get related activities
      const activities = goal.projectId 
        ? await this.activityRepository.findByProject(goal.projectId)
        : await this.activityRepository.findByDateRange(
            new Date(goal.startDate), 
            goal.endDate || new Date()
          );
      
      // Get all goals for cross-goal achievements
      const allGoals = await this.goalRepository.findByUser(goal.userId);

      // Calculate current progress
      const progress = {
        current: goal.getCurrentProgress(),
        percentage: goal.getProgressPercentage(),
        streak: goal.currentStreak,
        longestStreak: goal.longestStreak
      };

      const checkData: AchievementCheckData = {
        goal,
        progress,
        activities,
        allGoals,
        existingAchievements
      };

      // Check each rule
      for (const rule of this.rules) {
        try {
          // Skip if achievement already exists for this rule
          const existingOfType = existingAchievements.find(a => a.type === rule.type);
          
          // For milestone types, check if specific value already exists
          if (rule.type === 'streak_milestone' || rule.type === 'time_milestone') {
            const ruleValue = rule.value ? rule.value(checkData) : 0;
            if (existingOfType && existingOfType.value === ruleValue) {
              continue;
            }
          } else if (existingOfType) {
            continue;
          }

          // Check condition
          const conditionMet = await rule.condition(checkData);
          
          if (conditionMet) {
            const achievement = await this.createAchievement(goal, rule, checkData);
            newAchievements.push(achievement);
            
            // Emit achievement event
            this.emit('achievement:earned', achievement);
          }
        } catch (error) {
          logger.error('Error checking achievement rule', { 
            ruleType: rule.type, 
            goalId: goal.id, 
            error 
          });
        }
      }

      return newAchievements;
    } catch (error) {
      logger.error('Error checking achievements for goal', { goalId: goal.id, error });
      return [];
    }
  }

  private async createAchievement(
    goal: Goal, 
    rule: AchievementRule, 
    data: AchievementCheckData
  ): Promise<Achievement> {
    const achievementData = {
      goalId: goal.id,
      type: rule.type,
      name: rule.name,
      description: rule.description,
      icon: rule.icon,
      color: rule.color,
      value: rule.value ? rule.value(data) : undefined,
      metadata: rule.metadata ? rule.metadata(data) : undefined
    };

    return await this.achievementRepository.create(achievementData);
  }

  async generateAchievementSuggestions(goal: Goal): Promise<Array<{
    type: AchievementType;
    name: string;
    description: string;
    progress: number;
    requirement: string;
  }>> {
    const suggestions: Array<{
      type: AchievementType;
      name: string;
      description: string;
      progress: number;
      requirement: string;
    }> = [];

    const progress = {
      current: goal.getCurrentProgress(),
      percentage: goal.getProgressPercentage(),
      streak: goal.currentStreak,
      longestStreak: goal.longestStreak
    };

    // Goal completion suggestion
    if (progress.percentage < 100) {
      suggestions.push({
        type: 'goal_completed',
        name: 'Goal Crusher',
        description: 'Complete your goal',
        progress: progress.percentage,
        requirement: `Reach ${goal.target.value} ${goal.target.unit}`
      });
    }

    // Streak suggestions
    const nextStreakMilestone = this.getNextStreakMilestone(progress.streak);
    if (nextStreakMilestone) {
      suggestions.push({
        type: 'streak_milestone',
        name: 'Streak Master',
        description: `Reach a ${nextStreakMilestone}-day streak`,
        progress: (progress.streak / nextStreakMilestone) * 100,
        requirement: `Maintain streak for ${nextStreakMilestone - progress.streak} more days`
      });
    }

    // Time milestone suggestions
    if (goal.target.unit === 'hours' || goal.target.unit === 'minutes') {
      const nextTimeMilestone = this.getNextTimeMilestone(progress.current, goal.target.unit);
      if (nextTimeMilestone) {
        const currentHours = goal.target.unit === 'hours' ? progress.current : progress.current / 60;
        suggestions.push({
          type: 'time_milestone',
          name: 'Time Champion',
          description: `Reach ${nextTimeMilestone} hours`,
          progress: (currentHours / nextTimeMilestone) * 100,
          requirement: `Complete ${nextTimeMilestone - currentHours} more hours`
        });
      }
    }

    return suggestions;
  }

  private getNextStreakMilestone(currentStreak: number): number | null {
    const milestones = [7, 14, 30, 50, 100, 200, 365];
    return milestones.find(milestone => milestone > currentStreak) || null;
  }

  private getNextTimeMilestone(current: number, unit: string): number | null {
    const currentHours = unit === 'hours' ? current : current / 60;
    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    return milestones.find(milestone => milestone > currentHours) || null;
  }

  private calculateImprovementRate(progressHistory: Array<{ date: string; value: number; achieved: boolean }>): number {
    if (progressHistory.length < 14) return 0;

    const lastTwoWeeks = progressHistory.slice(-14);
    const firstWeek = lastTwoWeeks.slice(0, 7);
    const secondWeek = lastTwoWeeks.slice(7);

    const firstWeekAvg = firstWeek.reduce((sum, p) => sum + p.value, 0) / 7;
    const secondWeekAvg = secondWeek.reduce((sum, p) => sum + p.value, 0) / 7;

    if (firstWeekAvg === 0) return 0;
    return ((secondWeekAvg - firstWeekAvg) / firstWeekAvg) * 100;
  }

  private calculateWeeklyHours(activities: Activity[]): number {
    const weekStart = this.getWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekActivities = activities.filter(a => {
      const activityDate = new Date(a.startTime);
      return activityDate >= weekStart && activityDate < weekEnd;
    });

    return weekActivities.reduce((sum, activity) => 
      sum + (activity.getDuration() / (1000 * 60 * 60)), 0
    );
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async getRecentAchievements(days: number = 7): Promise<Achievement[]> {
    return await this.achievementRepository.findRecent(days);
  }

  async getAchievementStats(): Promise<any> {
    return await this.achievementRepository.getAchievementStats();
  }
}