export interface Activity {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  categoryId?: string;
  startTime: Date;
  endTime?: Date | null;
  duration: number; // in milliseconds
  isPaused: boolean;
  pausedDuration: number;
  pauseStartTime?: Date;
  applicationName?: string;
  windowTitle?: string;
  isManualEntry: boolean;
  tags: string[];
  metadata: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ActivityFilter {
  projectId?: string;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  isManualEntry?: boolean;
}

export interface ActivityStats {
  totalTime: number;
  activeTime: number;
  pausedTime: number;
  activityCount: number;
  averageDuration: number;
}

export type ActivityStatus = 'active' | 'paused' | 'stopped';