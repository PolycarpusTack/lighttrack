export interface Settings {
  key: string;
  profile: ProfileSettings;
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  shortcuts: KeyboardShortcuts;
  integrations: IntegrationSettings;
  privacy: PrivacySettings;
  backup: BackupSettings;
}

export interface ProfileSettings {
  name: string;
  email?: string;
  avatar?: string;
  timezone: string;
  workSchedule: WorkSchedule;
}

export interface WorkSchedule {
  workingHours: WorkingHours;
  breakPreferences: BreakPreferences;
  workDays: number[]; // 0-6, where 0 is Sunday
}

export interface WorkingHours {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export interface BreakPreferences {
  enabled: boolean;
  duration: number; // minutes
  frequency: number; // minutes between breaks
  longBreakDuration: number; // minutes
  longBreakFrequency: number; // breaks before long break
  reminders: boolean;
}

export interface TimeRange {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export interface NotificationSettings {
  reminders: {
    enabled: boolean;
    idleTime: number; // minutes before reminder
    frequency: 'once' | 'repeat';
    quietHours: TimeRange & { enabled: boolean };
  };
  
  goals: {
    dailyProgress: boolean;
    weeklyReport: boolean;
    achievements: boolean;
    streakMilestones: boolean;
  };
  
  integrations: {
    slack: SlackNotificationConfig;
    email: EmailNotificationConfig;
    desktop: DesktopNotificationConfig;
  };

  sound: {
    enabled: boolean;
    volume: number; // 0-1
    notifications: boolean;
    achievements: boolean;
  };
}

export interface SlackNotificationConfig {
  enabled: boolean;
  webhookUrl?: string;
  channel?: string;
  dailyReport: boolean;
  goalAchievements: boolean;
}

export interface EmailNotificationConfig {
  enabled: boolean;
  address?: string;
  weeklyReport: boolean;
  monthlyReport: boolean;
  achievements: boolean;
}

export interface DesktopNotificationConfig {
  enabled: boolean;
  position: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft';
  duration: number; // seconds
  showProgress: boolean;
  showAchievements: boolean;
}

export interface IntegrationSettings {
  jira?: {
    enabled: boolean;
    apiUrl: string;
    username: string;
    apiToken?: string;
    syncInterval?: number;
  };
  github?: {
    enabled: boolean;
    accessToken?: string;
    syncRepos?: string[];
  };
  calendar?: {
    enabled: boolean;
    provider: 'google' | 'outlook' | 'ical';
    syncUrl?: string;
  };
}

export interface KeyboardShortcuts {
  startStop: string;
  pause: string;
  quickEntry: string;
  openDashboard: string;
  openTimeline: string;
  openAnalytics: string;
  openGoals: string;
  openProjects: string;
  openSettings: string;
  commandPalette: string;
  search: string;
  toggleMinimize: string;
  focusMode: string;
  [key: string]: string;
}

export type ShortcutMap = KeyboardShortcuts;

export const defaultShortcuts: ShortcutMap = {
  startStop: 'Ctrl+Shift+Space',
  pause: 'Ctrl+Shift+P',
  quickEntry: 'Ctrl+Shift+N',
  openDashboard: 'Ctrl+1',
  openTimeline: 'Ctrl+2',
  openAnalytics: 'Ctrl+3',
  openGoals: 'Ctrl+4',
  openProjects: 'Ctrl+5',
  openSettings: 'Ctrl+,',
  commandPalette: 'Ctrl+Shift+P',
  search: 'Ctrl+K',
  toggleMinimize: 'Ctrl+M',
  focusMode: 'Ctrl+Shift+F',
};

export interface PrivacySettings {
  collectAnalytics: boolean;
  shareData: boolean;
  localOnly: boolean;
  encryptData: boolean;
  crashReporting: boolean;
  usageStatistics: boolean;
}

export interface AppearanceSettings {
  theme: 'dark' | 'light' | 'auto';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  density: 'compact' | 'normal' | 'spacious';
  animations: boolean;
  reducedMotion: boolean;
  colorScheme: 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'custom';
  customColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface BackupSettings {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupLocation: string;
  maxBackups: number;
  includeSettings: boolean;
  includeProjects: boolean;
  includeActivities: boolean;
  includeGoals: boolean;
  cloudSync: {
    enabled: boolean;
    provider?: 'dropbox' | 'google' | 'icloud';
    lastSync?: Date;
  };
}

// Default settings
export const defaultSettings: Partial<Settings> = {
  profile: {
    name: 'User',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    workSchedule: {
      workingHours: {
        start: '09:00',
        end: '17:00',
      },
      breakPreferences: {
        enabled: true,
        duration: 15,
        frequency: 90,
        longBreakDuration: 30,
        longBreakFrequency: 4,
        reminders: true,
      },
      workDays: [1, 2, 3, 4, 5], // Monday to Friday
    },
  },
  
  notifications: {
    reminders: {
      enabled: true,
      idleTime: 15,
      frequency: 'once',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
    },
    goals: {
      dailyProgress: true,
      weeklyReport: true,
      achievements: true,
      streakMilestones: true,
    },
    integrations: {
      slack: {
        enabled: false,
        dailyReport: false,
        goalAchievements: false,
      },
      email: {
        enabled: false,
        weeklyReport: false,
        monthlyReport: false,
        achievements: false,
      },
      desktop: {
        enabled: true,
        position: 'topRight',
        duration: 5,
        showProgress: true,
        showAchievements: true,
      },
    },
    sound: {
      enabled: true,
      volume: 0.5,
      notifications: true,
      achievements: true,
    },
  },
  
  appearance: {
    theme: 'auto',
    accentColor: '#3b82f6',
    fontSize: 'medium',
    density: 'normal',
    animations: true,
    reducedMotion: false,
    colorScheme: 'default',
  },
  
  shortcuts: defaultShortcuts,
  
  privacy: {
    collectAnalytics: true,
    shareData: false,
    localOnly: false,
    encryptData: true,
    crashReporting: true,
    usageStatistics: true,
  },
  
  backup: {
    autoBackup: true,
    backupFrequency: 'weekly',
    backupLocation: '',
    maxBackups: 10,
    includeSettings: true,
    includeProjects: true,
    includeActivities: true,
    includeGoals: true,
    cloudSync: {
      enabled: false,
    },
  },
  
  integrations: {
    jira: {
      enabled: false,
      apiUrl: '',
      username: '',
    },
    github: {
      enabled: false,
    },
    calendar: {
      enabled: false,
      provider: 'google',
    },
  },
};