// Application Constants
export const APP_NAME = 'LightTrack';
export const APP_VERSION = '2.0.0';

// Timing Constants
export const TIMER_INTERVAL_MS = 1000;
export const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
export const IDLE_CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds
export const AUTO_SAVE_INTERVAL_MS = 30 * 1000; // 30 seconds

// UI Constants  
export const DEFAULT_PROJECT_COLOR = '#00bcd4';
export const DEFAULT_PROJECT_ID = 'default';
export const DEFAULT_PROJECT_NAME = 'General';

// Export Constants
export const MAX_EXPORT_FILE_SIZE_MB = 100;
export const EXPORT_FILENAME_PREFIX = 'lighttrack-export';
export const EXPORTS_FOLDER_NAME = 'exports';

// Database Constants
export const DB_NAME = 'lighttrack.db';
export const DB_VERSION = 1;
export const MIGRATION_TABLE_NAME = 'migrations';

// IPC Channel Prefixes
export const IPC_CHANNELS = {
  ACTIVITY: 'activity:',
  PROJECT: 'project:',
  SETTINGS: 'settings:',
  EXPORT: 'export:',
  SYNC: 'sync:',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  // Activity errors
  ACTIVITY_NOT_FOUND: 'Activity not found',
  ACTIVITY_ALREADY_RUNNING: 'An activity is already running',
  NO_ACTIVITY_TO_STOP: 'No activity is currently running',
  NO_ACTIVITY_TO_PAUSE: 'No activity to pause',
  NO_ACTIVITY_TO_RESUME: 'No activity to resume',
  MERGE_DIFFERENT_PROJECTS: 'Cannot merge activities from different projects',
  SPLIT_TIME_OUT_OF_RANGE: 'Split time must be within activity duration',
  
  // Project errors  
  PROJECT_NOT_FOUND: 'Project not found',
  PROJECT_NAME_REQUIRED: 'Project name is required',
  PROJECT_HAS_ACTIVITIES: 'Cannot delete project with existing activities',
  DEFAULT_PROJECT_DELETE: 'Cannot delete the default project',
  
  // Export errors
  EXPORT_FAILED: 'Failed to export activities',
  INVALID_EXPORT_FORMAT: 'Invalid export format',
  NO_ACTIVITIES_TO_EXPORT: 'No activities selected for export',
  
  // Database errors
  DATABASE_ERROR: 'Database operation failed',
  DATABASE_CONNECTION_FAILED: 'Failed to connect to database',
  DATABASE_TRANSACTION_FAILED: 'Database transaction failed',
  
  // Validation errors
  INVALID_DATE_RANGE: 'Invalid date range',
  INVALID_INPUT: 'Invalid input provided',
} as const;

// Validation Patterns
export const VALIDATION_PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  COLOR_HEX: /^#[0-9a-f]{6}$/i,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;