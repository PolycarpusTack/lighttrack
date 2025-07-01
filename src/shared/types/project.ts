export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parentId?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  totalTime: number;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  billable?: boolean;
  hourlyRate?: number;
  currency?: string;
  timeGoals?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  notifications?: {
    dailyReport?: boolean;
    weeklyReport?: boolean;
    goalAlerts?: boolean;
  };
  integrations?: {
    jira?: {
      issueKey?: string;
      projectKey?: string;
    };
    github?: {
      repoUrl?: string;
      defaultBranch?: string;
    };
  };
}

export interface ProjectStats {
  totalTime: number;
  todayTime: number;
  weekTime: number;
  monthTime: number;
  activityCount: number;
  lastActivity?: Date;
}