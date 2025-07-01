export interface Integration {
  testConnection(): Promise<boolean>;
  syncIssues?(): Promise<SyncResult>;
  pushTimeEntry?(activity: any): Promise<void>;
}

export interface IntegrationConfig {
  enabled: boolean;
  name: string;
  type: 'jira' | 'github' | 'calendar';
}

export interface SyncResult {
  success: boolean;
  imported: number;
  updated: number;
  errors: string[];
  data?: any[];
}

export interface IntegrationStatus {
  type: string;
  connected: boolean;
  lastSync?: Date;
  error?: string;
}