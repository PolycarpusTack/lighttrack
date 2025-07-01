/**
 * Shared type definitions for background services
 */

export interface IdleState {
  isIdle: boolean;
  idleTime: number;
  lastActiveTime: Date;
}

export interface AutoSaveState {
  isRunning: boolean;
  lastSaveTime: Date | null;
  pendingChanges: number;
  saveCount: number;
}

export interface BackgroundServicesState {
  idleDetection: {
    enabled: boolean;
    isRunning: boolean;
  };
  autoSave: {
    enabled: boolean;
    isRunning: boolean;
  };
}

export interface IdleEvent {
  activityId?: string;
  timestamp: Date;
  resumed?: boolean;
}

export interface AutoSaveEvent {
  savedCount: number;
  duration: number;
  timestamp: Date;
}