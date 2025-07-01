// IPC wrapper for renderer process
// Type-safe IPC communication with the main process

import { Activity } from '@shared/types/activity';
import { Project } from '@shared/types/project';
import { Goal, GoalProgress, Achievement, GoalStats, GoalInsight } from '@shared/types/goal';

interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
  send: (channel: string, ...args: any[]) => void;
}

// @ts-ignore - window.electronAPI is injected by preload script
const electronAPI: ElectronAPI = window.electronAPI;

/**
 * Type-safe IPC service for renderer process
 */
export class IPCService {
  // Activity operations
  static async startActivity(data: Partial<Activity>): Promise<Activity> {
    return electronAPI.invoke('activity:start', data);
  }

  static async stopActivity(activityId: string): Promise<Activity> {
    return electronAPI.invoke('activity:stop', activityId);
  }

  static async pauseActivity(activityId: string): Promise<Activity> {
    return electronAPI.invoke('activity:pause', activityId);
  }

  static async resumeActivity(activityId: string): Promise<Activity> {
    return electronAPI.invoke('activity:resume', activityId);
  }

  static async mergeActivities(activityIds: string[]): Promise<Activity> {
    return electronAPI.invoke('activity:merge', activityIds);
  }

  static async splitActivity(activityId: string, splitTime: string): Promise<Activity[]> {
    return electronAPI.invoke('activity:split', activityId, splitTime);
  }

  static async getTodayActivities(): Promise<Activity[]> {
    return electronAPI.invoke('activity:getTodayActivities');
  }

  static async updateActivity(activityId: string, updates: Partial<Activity>): Promise<Activity> {
    return electronAPI.invoke('activity:update', activityId, updates);
  }

  static async deleteActivity(activityId: string): Promise<void> {
    return electronAPI.invoke('activity:delete', activityId);
  }

  static async bulkUpdateActivities(activityIds: string[], updates: Partial<Activity>): Promise<Activity[]> {
    return electronAPI.invoke('activity:bulkUpdate', activityIds, updates);
  }

  static async bulkDeleteActivities(activityIds: string[]): Promise<void> {
    return electronAPI.invoke('activity:bulkDelete', activityIds);
  }

  static async exportActivities(activityIds: string[], format: 'csv' | 'json' | 'pdf'): Promise<{ filePath: string; fileSize: number }> {
    return electronAPI.invoke('activity:export', activityIds, format);
  }

  // Project operations
  static async getProjects(): Promise<Project[]> {
    return electronAPI.invoke('project:getAll');
  }

  static async createProject(data: Partial<Project>): Promise<Project> {
    return electronAPI.invoke('project:create', data);
  }

  static async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    return electronAPI.invoke('project:update', projectId, updates);
  }

  static async deleteProject(projectId: string): Promise<void> {
    return electronAPI.invoke('project:delete', projectId);
  }

  // Analytics operations
  static async getDailyStats(date: Date): Promise<any> {
    return electronAPI.invoke('analytics:getDailyStats', date.toISOString());
  }

  static async getWeeklyStats(weekStart: Date): Promise<any> {
    return electronAPI.invoke('analytics:getWeeklyStats', weekStart.toISOString());
  }

  static async getProductivityAnalysis(startDate: Date, endDate: Date): Promise<any> {
    return electronAPI.invoke('analytics:getProductivityAnalysis', startDate.toISOString(), endDate.toISOString());
  }

  static async getTimeInsights(startDate: Date, endDate: Date): Promise<any> {
    return electronAPI.invoke('analytics:getTimeInsights', startDate.toISOString(), endDate.toISOString());
  }

  static async getTodayStats(): Promise<any> {
    return electronAPI.invoke('analytics:getTodayStats');
  }

  static async getThisWeekStats(): Promise<any> {
    return electronAPI.invoke('analytics:getThisWeekStats');
  }

  static async refreshAnalyticsCache(): Promise<{ success: boolean; message: string }> {
    return electronAPI.invoke('analytics:refreshCache');
  }

  static async getRecommendations(startDate: Date, endDate: Date): Promise<string[]> {
    return electronAPI.invoke('analytics:getRecommendations', startDate.toISOString(), endDate.toISOString());
  }

  static async calculateProjectDistribution(
    timeRange: 'today' | 'week' | 'month' | 'year' | 'custom',
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    return electronAPI.invoke(
      'analytics:calculateProjectDistribution', 
      timeRange,
      startDate?.toISOString(),
      endDate?.toISOString()
    );
  }

  // Background services
  static async getBackgroundServicesStatus(): Promise<any> {
    return electronAPI.invoke('backgroundServices:getStatus');
  }

  static async startBackgroundService(serviceName: string): Promise<boolean> {
    return electronAPI.invoke('backgroundServices:start', serviceName);
  }

  static async stopBackgroundService(serviceName: string): Promise<boolean> {
    return electronAPI.invoke('backgroundServices:stop', serviceName);
  }

  // Report operations
  static async generateReport(params: any): Promise<any> {
    return electronAPI.invoke('report:generate', params);
  }

  static async generateDailyReport(date?: Date): Promise<any> {
    return electronAPI.invoke('report:generateDaily', date?.toISOString());
  }

  static async generateWeeklyReport(weekStart?: Date): Promise<any> {
    return electronAPI.invoke('report:generateWeekly', weekStart?.toISOString());
  }

  static async generateProjectReport(projectId: string, startDate: Date, endDate: Date): Promise<any> {
    return electronAPI.invoke('report:generateProject', projectId, startDate.toISOString(), endDate.toISOString());
  }

  static async exportReport(report: any, format: string, outputPath?: string): Promise<{ path: string; success: boolean }> {
    return electronAPI.invoke('report:export', report, format, outputPath);
  }

  static async openExportedFile(filePath: string): Promise<boolean> {
    return electronAPI.invoke('report:openExportedFile', filePath);
  }

  static async getRecentReports(): Promise<any[]> {
    return electronAPI.invoke('report:getRecentReports');
  }

  // Enhanced Project operations
  static async getProjectHierarchy(): Promise<any[]> {
    return electronAPI.invoke('project:getHierarchy');
  }

  static async getProjectTemplates(): Promise<any[]> {
    return electronAPI.invoke('project:getTemplates');
  }

  static async createProjectTemplate(projectId: string, name: string, description?: string): Promise<any> {
    return electronAPI.invoke('project:createTemplate', projectId, name, description);
  }

  static async bulkImportProjects(options: any): Promise<any> {
    return electronAPI.invoke('project:bulkImport', options);
  }

  static async archiveProject(projectId: string, includeChildren: boolean): Promise<void> {
    return electronAPI.invoke('project:archive', projectId, includeChildren);
  }

  // Project Analytics
  static async getProjectTimeStats(projectId: string): Promise<any> {
    return electronAPI.invoke('project:getTimeStats', projectId);
  }

  static async getProjectTrends(projectId: string, days: number, interval: 'daily' | 'weekly' | 'monthly'): Promise<any[]> {
    return electronAPI.invoke('project:getTrends', projectId, days, interval);
  }

  static async generateActivityHeatmap(projectId: string, days: number): Promise<any> {
    return electronAPI.invoke('project:generateHeatmap', projectId, days);
  }

  static async analyzeBudget(projectId: string, budgetLimit?: number): Promise<any> {
    return electronAPI.invoke('project:analyzeBudget', projectId, budgetLimit);
  }

  static async updateProjectBudget(projectId: string, budgetLimit: number): Promise<any> {
    // Update project with new budget limit then analyze
    await electronAPI.invoke('project:update', projectId, { settings: { budgetLimit } });
    return electronAPI.invoke('project:analyzeBudget', projectId, budgetLimit);
  }

  static async compareProjectPeriods(
    projectId: string,
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date
  ): Promise<any> {
    return electronAPI.invoke(
      'project:comparePeriods',
      projectId,
      period1Start.toISOString(),
      period1End.toISOString(),
      period2Start.toISOString(),
      period2End.toISOString()
    );
  }

  // Settings
  static async getSetting(key: string): Promise<any> {
    return electronAPI.invoke('settings:get', key);
  }

  static async setSetting(key: string, value: any): Promise<void> {
    return electronAPI.invoke('settings:set', key, value);
  }

  static async getSettings(): Promise<any> {
    return electronAPI.invoke('settings:getAll');
  }

  static async updateSettings(settings: any): Promise<any> {
    return electronAPI.invoke('settings:update', settings);
  }

  static async resetSettings(): Promise<any> {
    return electronAPI.invoke('settings:reset');
  }

  static async exportSettings(filePath: string): Promise<boolean> {
    return electronAPI.invoke('settings:export', filePath);
  }

  static async importSettings(filePath: string): Promise<any> {
    return electronAPI.invoke('settings:import', filePath);
  }

  static async validateShortcut(shortcut: string): Promise<boolean> {
    return electronAPI.invoke('settings:validateShortcut', shortcut);
  }

  // Goal operations
  static async getGoals(): Promise<Goal[]> {
    return electronAPI.invoke('goal:getAll');
  }

  static async getGoalById(goalId: string): Promise<Goal> {
    return electronAPI.invoke('goal:getById', goalId);
  }

  static async createGoal(goalData: any): Promise<Goal> {
    return electronAPI.invoke('goal:create', goalData);
  }

  static async updateGoal(goalId: string, updates: Partial<Goal>): Promise<Goal> {
    return electronAPI.invoke('goal:update', goalId, updates);
  }

  static async deleteGoal(goalId: string): Promise<void> {
    return electronAPI.invoke('goal:delete', goalId);
  }

  static async pauseGoal(goalId: string): Promise<Goal> {
    return electronAPI.invoke('goal:pause', goalId);
  }

  static async resumeGoal(goalId: string): Promise<Goal> {
    return electronAPI.invoke('goal:resume', goalId);
  }

  // Goal progress operations
  static async getGoalProgress(): Promise<GoalProgress[]> {
    return electronAPI.invoke('goal:getProgress');
  }

  static async updateGoalProgress(goalId: string, progressData: any): Promise<Goal> {
    return electronAPI.invoke('goal:updateProgress', goalId, progressData);
  }

  static async checkGoalProgress(): Promise<GoalProgress[]> {
    return electronAPI.invoke('goal:checkProgress');
  }

  // Achievement operations
  static async getAchievements(): Promise<Achievement[]> {
    return electronAPI.invoke('goal:getAchievements');
  }

  static async checkGoalAchievements(goalId: string): Promise<Achievement[]> {
    return electronAPI.invoke('goal:checkAchievements', goalId);
  }

  static async markAchievementNotified(achievementId: string): Promise<Achievement> {
    return electronAPI.invoke('goal:markAchievementNotified', achievementId);
  }

  // Goal analytics and insights
  static async getGoalStats(): Promise<GoalStats> {
    return electronAPI.invoke('goal:getStats');
  }

  static async getGoalInsights(): Promise<GoalInsight[]> {
    return electronAPI.invoke('goal:getInsights');
  }

  static async getTodaysGoals(): Promise<Goal[]> {
    return electronAPI.invoke('goal:getTodaysGoals', 'current-user'); // TODO: Add proper user ID
  }

  static async getWeeklyGoals(): Promise<Goal[]> {
    return electronAPI.invoke('goal:getWeeklyGoals', 'current-user'); // TODO: Add proper user ID
  }

  // Goal notifications
  static async generateGoalNotifications(): Promise<any[]> {
    return electronAPI.invoke('goal:generateNotifications');
  }

  static async getAchievementSuggestions(goalId: string): Promise<any[]> {
    return electronAPI.invoke('goal:getAchievementSuggestions', goalId);
  }

  // Event listeners
  static onActivityStarted(callback: (activity: Activity) => void): () => void {
    electronAPI.on('activity:started', callback);
    return () => electronAPI.off('activity:started', callback);
  }

  static onActivityStopped(callback: (activity: Activity) => void): () => void {
    electronAPI.on('activity:stopped', callback);
    return () => electronAPI.off('activity:stopped', callback);
  }

  static onActivityPaused(callback: (activity: Activity) => void): () => void {
    electronAPI.on('activity:paused', callback);
    return () => electronAPI.off('activity:paused', callback);
  }

  static onActivityResumed(callback: (activity: Activity) => void): () => void {
    electronAPI.on('activity:resumed', callback);
    return () => electronAPI.off('activity:resumed', callback);
  }

  static onActivitiesMerged(callback: (data: { mergedActivity: Activity; deletedIds: string[] }) => void): () => void {
    electronAPI.on('activities:merged', callback);
    return () => electronAPI.off('activities:merged', callback);
  }

  static onActivitySplit(callback: (data: { originalId: string; newActivities: Activity[] }) => void): () => void {
    electronAPI.on('activity:split', callback);
    return () => electronAPI.off('activity:split', callback);
  }

  static onAnalyticsUpdated(callback: (data: any) => void): () => void {
    electronAPI.on('analytics:updated', callback);
    return () => electronAPI.off('analytics:updated', callback);
  }

  static onNotification(callback: (notification: any) => void): () => void {
    electronAPI.on('show-notification', callback);
    return () => electronAPI.off('show-notification', callback);
  }

  // Goal event listeners
  static onGoalCreated(callback: (goal: Goal) => void): () => void {
    electronAPI.on('goal:created', callback);
    return () => electronAPI.off('goal:created', callback);
  }

  static onGoalUpdated(callback: (goal: Goal) => void): () => void {
    electronAPI.on('goal:updated', callback);
    return () => electronAPI.off('goal:updated', callback);
  }

  static onGoalDeleted(callback: (data: { id: string }) => void): () => void {
    electronAPI.on('goal:deleted', callback);
    return () => electronAPI.off('goal:deleted', callback);
  }

  static onGoalPaused(callback: (goal: Goal) => void): () => void {
    electronAPI.on('goal:paused', callback);
    return () => electronAPI.off('goal:paused', callback);
  }

  static onGoalResumed(callback: (goal: Goal) => void): () => void {
    electronAPI.on('goal:resumed', callback);
    return () => electronAPI.off('goal:resumed', callback);
  }

  static onGoalProgressUpdated(callback: (data: { goalId: string; progress: any }) => void): () => void {
    electronAPI.on('goal:progressUpdated', callback);
    return () => electronAPI.off('goal:progressUpdated', callback);
  }

  static onAchievementsEarned(callback: (achievements: Achievement[]) => void): () => void {
    electronAPI.on('achievements:earned', callback);
    return () => electronAPI.off('achievements:earned', callback);
  }

  static onGoalNotifications(callback: (notifications: any[]) => void): () => void {
    electronAPI.on('notifications:new', callback);
    return () => electronAPI.off('notifications:new', callback);
  }
}

// Legacy export for backward compatibility
export const ipcRenderer = electronAPI;