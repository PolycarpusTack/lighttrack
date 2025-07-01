import { Integration, IntegrationConfig, SyncResult } from '@shared/types/integration';
import { Activity } from '@shared/types/activity';
import { Project } from '@shared/types/project';

export interface JiraConfig extends IntegrationConfig {
  apiUrl: string;
  username: string;
  apiToken: string;
  projectKey?: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status: string;
  assignee?: string;
  project: {
    id: string;
    key: string;
    name: string;
  };
  timeTracking?: {
    originalEstimate?: string;
    remainingEstimate?: string;
    timeSpent?: string;
  };
}

export interface JiraWorklog {
  issueId: string;
  timeSpentSeconds: number;
  started: string;
  comment?: string;
}

export class JiraIntegration implements Integration {
  private config: JiraConfig;
  private baseUrl: string;
  private headers: Headers;

  constructor(config: JiraConfig) {
    this.config = config;
    this.baseUrl = `${config.apiUrl}/rest/api/3`;
    
    // Basic auth header
    const auth = Buffer.from(`${config.username}:${config.apiToken}`).toString('base64');
    this.headers = new Headers({
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/myself`, {
        headers: this.headers
      });
      return response.ok;
    } catch (error) {
      console.error('JIRA connection test failed:', error);
      return false;
    }
  }

  async syncIssues(): Promise<SyncResult> {
    try {
      // Get assigned issues
      const jql = `assignee = currentUser() AND status not in (Done, Closed) ORDER BY priority DESC`;
      const response = await fetch(
        `${this.baseUrl}/search?jql=${encodeURIComponent(jql)}&maxResults=100`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`JIRA API error: ${response.statusText}`);
      }

      const data = await response.json();
      const issues: JiraIssue[] = data.issues;

      // Convert to projects
      const projects: Project[] = issues.map(issue => ({
        id: issue.key,
        name: `${issue.key}: ${issue.summary}`,
        description: issue.description,
        color: this.getProjectColor(issue.project.key),
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalTime: 0,
        settings: {
          integrations: {
            jira: {
              issueKey: issue.key,
              projectKey: issue.project.key
            }
          }
        }
      }));

      return {
        success: true,
        imported: projects.length,
        updated: 0,
        errors: [],
        data: projects
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        updated: 0,
        errors: [error.message],
        data: []
      };
    }
  }

  async pushTimeEntry(activity: Activity): Promise<void> {
    if (!activity.projectId.startsWith('JIRA-')) {
      return; // Not a JIRA issue
    }

    const worklog: JiraWorklog = {
      issueId: activity.projectId,
      timeSpentSeconds: Math.floor(activity.duration / 1000),
      started: new Date(activity.startTime).toISOString(),
      comment: activity.description || `Tracked with LightTrack: ${activity.name}`
    };

    const response = await fetch(
      `${this.baseUrl}/issue/${worklog.issueId}/worklog`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          timeSpentSeconds: worklog.timeSpentSeconds,
          started: worklog.started,
          comment: worklog.comment
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to log time to JIRA: ${response.statusText}`);
    }
  }

  async getIssue(issueKey: string): Promise<JiraIssue | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/issue/${issueKey}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return this.parseIssue(data);
    } catch (error) {
      console.error('Failed to fetch JIRA issue:', error);
      return null;
    }
  }

  private parseIssue(data: any): JiraIssue {
    return {
      id: data.id,
      key: data.key,
      summary: data.fields.summary,
      description: data.fields.description,
      status: data.fields.status.name,
      assignee: data.fields.assignee?.displayName,
      project: {
        id: data.fields.project.id,
        key: data.fields.project.key,
        name: data.fields.project.name
      },
      timeTracking: data.fields.timetracking
    };
  }

  private getProjectColor(projectKey: string): string {
    // Generate consistent color based on project key
    const colors = ['#00bcd4', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#3f51b5'];
    const index = projectKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  }
}