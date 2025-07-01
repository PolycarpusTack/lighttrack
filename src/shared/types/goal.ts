export type GoalType = 'daily' | 'weekly' | 'project' | 'habit';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'failed';
export type GoalPeriod = 'day' | 'week' | 'month' | 'year' | 'ongoing';

export interface Goal {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: GoalType;
  target: GoalTarget;
  period: GoalPeriod;
  projectId?: string; // For project-specific goals
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  startDate: Date;
  endDate?: Date;
  settings: GoalSettings;
}

export interface GoalTarget {
  value: number;
  unit: 'hours' | 'minutes' | 'sessions' | 'days' | 'tasks';
  comparison: 'minimum' | 'maximum' | 'exact';
}

export interface GoalSettings {
  notifications: {
    reminders: boolean;
    achievements: boolean;
    dailyProgress: boolean;
    weeklyProgress: boolean;
  };
  autoReset: boolean; // For recurring goals
  allowPartialCredit: boolean;
  streakRequired?: number; // For habit goals
  gracePeriod?: number; // Hours of grace before marking as failed
}

export interface GoalProgress {
  goalId: string;
  current: number;
  target: number;
  percentage: number;
  status: 'on_track' | 'at_risk' | 'behind' | 'completed' | 'failed';
  projectedCompletion?: Date;
  streak: number;
  longestStreak: number;
  lastUpdated: Date;
  dailyProgress: DailyProgress[];
}

export interface DailyProgress {
  date: Date;
  value: number;
  achieved: boolean;
  notes?: string;
}

export interface Achievement {
  id: string;
  goalId: string;
  type: AchievementType;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedAt: Date;
  value?: number; // For milestone achievements
}

export type AchievementType = 
  | 'goal_completed' 
  | 'streak_milestone' 
  | 'time_milestone' 
  | 'consistency_badge' 
  | 'improvement_badge'
  | 'first_goal'
  | 'productive_week'
  | 'early_bird'
  | 'night_owl';

export interface GoalInsight {
  goalId: string;
  type: InsightType;
  message: string;
  actionable: boolean;
  suggestion?: string;
  priority: 'low' | 'medium' | 'high';
  generatedAt: Date;
}

export type InsightType = 
  | 'progress_trend'
  | 'time_pattern'
  | 'difficulty_adjustment'
  | 'motivation_boost'
  | 'schedule_optimization'
  | 'habit_formation';

export interface GoalStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalAchievements: number;
  longestStreak: number;
  averageCompletionRate: number;
  timeSpentOnGoals: number;
  improvementTrend: number;
}

export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  type: GoalType;
  defaultTarget: GoalTarget;
  defaultPeriod: GoalPeriod;
  defaultSettings: GoalSettings;
  category: string;
  tags: string[];
  popularity: number;
  isBuiltIn: boolean;
}