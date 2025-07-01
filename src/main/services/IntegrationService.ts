import { EventEmitter } from 'events';
import axios from 'axios';
import { Octokit } from '@octokit/rest';
import { Project } from '@shared/types/project';
import { logger } from '../utils/logger';

export interface JiraCredentials {
  domain: string;
  email: string;
  apiToken: string;
}

export interface GitHubCredentials {
  token: string;
  username?: string;
  organization?: string;
}

export interface TrelloCredentials {
  apiKey: string;
  token: string;
}

export interface AsanaCredentials {
  accessToken: string;
  workspaceId?: string;
}

export class IntegrationService extends EventEmitter {
  private static instance: IntegrationService;
  private octokit: Octokit | null = null;

  static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  /**
   * Fetch projects from JIRA
   */
  async fetchJiraProjects(credentials: JiraCredentials): Promise<any[]> {
    try {
      logger.info('Fetching JIRA projects', { domain: credentials.domain });

      const auth = Buffer.from(`${credentials.email}:${credentials.apiToken}`).toString('base64');
      const response = await axios.get(
        `https://${credentials.domain}.atlassian.net/rest/api/3/project`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        }
      );

      const projects = response.data.values || response.data;
      
      logger.info('JIRA projects fetched', { count: projects.length });
      
      return projects.map((project: any) => ({
        key: project.key,
        name: project.name,
        description: project.description,
        projectKey: project.key,
        id: project.id,
        avatarUrl: project.avatarUrls?.['48x48']
      }));
    } catch (error) {
      logger.error('Failed to fetch JIRA projects', error);
      throw new Error(`JIRA integration failed: ${error.response?.data?.errorMessages?.[0] || error.message}`);
    }
  }

  /**
   * Fetch repositories from GitHub
   */
  async fetchGitHubRepos(credentials: GitHubCredentials): Promise<any[]> {
    try {
      logger.info('Fetching GitHub repositories');

      this.octokit = new Octokit({
        auth: credentials.token
      });

      let repos: any[] = [];

      if (credentials.organization) {
        // Fetch organization repos
        const response = await this.octokit.repos.listForOrg({
          org: credentials.organization,
          per_page: 100,
          sort: 'updated'
        });
        repos = response.data;
      } else {
        // Fetch user repos
        const response = await this.octokit.repos.listForAuthenticatedUser({
          per_page: 100,
          sort: 'updated',
          visibility: 'all'
        });
        repos = response.data;
      }

      logger.info('GitHub repositories fetched', { count: repos.length });

      return repos.map(repo => ({
        key: repo.full_name,
        name: repo.name,
        description: repo.description,
        html_url: repo.html_url,
        default_branch: repo.default_branch,
        private: repo.private,
        language: repo.language,
        topics: repo.topics
      }));
    } catch (error) {
      logger.error('Failed to fetch GitHub repos', error);
      throw new Error(`GitHub integration failed: ${error.message}`);
    }
  }

  /**
   * Fetch boards from Trello
   */
  async fetchTrelloBoards(credentials: TrelloCredentials): Promise<any[]> {
    try {
      logger.info('Fetching Trello boards');

      const response = await axios.get(
        'https://api.trello.com/1/members/me/boards',
        {
          params: {
            key: credentials.apiKey,
            token: credentials.token,
            filter: 'open'
          }
        }
      );

      const boards = response.data;
      
      logger.info('Trello boards fetched', { count: boards.length });

      return boards.map((board: any) => ({
        key: board.id,
        name: board.name,
        description: board.desc,
        url: board.url,
        prefs: board.prefs
      }));
    } catch (error) {
      logger.error('Failed to fetch Trello boards', error);
      throw new Error(`Trello integration failed: ${error.message}`);
    }
  }

  /**
   * Fetch projects from Asana
   */
  async fetchAsanaProjects(credentials: AsanaCredentials): Promise<any[]> {
    try {
      logger.info('Fetching Asana projects');

      const headers = {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Accept': 'application/json'
      };

      let workspaceId = credentials.workspaceId;

      // If no workspace ID provided, fetch the first workspace
      if (!workspaceId) {
        const workspacesResponse = await axios.get(
          'https://app.asana.com/api/1.0/workspaces',
          { headers }
        );
        
        if (workspacesResponse.data.data.length > 0) {
          workspaceId = workspacesResponse.data.data[0].gid;
        } else {
          throw new Error('No Asana workspaces found');
        }
      }

      const response = await axios.get(
        `https://app.asana.com/api/1.0/workspaces/${workspaceId}/projects`,
        { headers }
      );

      const projects = response.data.data;
      
      logger.info('Asana projects fetched', { count: projects.length });

      return projects.map((project: any) => ({
        key: project.gid,
        name: project.name,
        description: project.notes,
        color: project.color,
        workspace: project.workspace
      }));
    } catch (error) {
      logger.error('Failed to fetch Asana projects', error);
      throw new Error(`Asana integration failed: ${error.response?.data?.errors?.[0]?.message || error.message}`);
    }
  }

  /**
   * Sync a project with its integration
   */
  async syncProject(project: Project): Promise<void> {
    if (!project.settings.integrations) {
      return;
    }

    try {
      if (project.settings.integrations.jira) {
        await this.syncWithJira(project);
      }

      if (project.settings.integrations.github) {
        await this.syncWithGitHub(project);
      }

      logger.info('Project synced with integrations', { projectId: project.id });
    } catch (error) {
      logger.error('Failed to sync project', { projectId: project.id, error });
      throw error;
    }
  }

  /**
   * Create JIRA issue link for project
   */
  async createJiraLink(project: Project, credentials: JiraCredentials): Promise<void> {
    if (!project.settings.integrations?.jira?.issueKey) {
      return;
    }

    try {
      const auth = Buffer.from(`${credentials.email}:${credentials.apiToken}`).toString('base64');
      
      // Add a comment to the JIRA issue
      await axios.post(
        `https://${credentials.domain}.atlassian.net/rest/api/3/issue/${project.settings.integrations.jira.issueKey}/comment`,
        {
          body: {
            type: 'doc',
            version: 1,
            content: [{
              type: 'paragraph',
              content: [{
                type: 'text',
                text: `Time tracking started for this issue in LightTrack. Project: ${project.name}`
              }]
            }]
          }
        },
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('JIRA link created', { 
        projectId: project.id,
        issueKey: project.settings.integrations.jira.issueKey 
      });
    } catch (error) {
      logger.error('Failed to create JIRA link', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Create GitHub issue link for project
   */
  async createGitHubLink(project: Project, credentials: GitHubCredentials): Promise<void> {
    if (!project.settings.integrations?.github?.repoUrl) {
      return;
    }

    try {
      const repoUrl = project.settings.integrations.github.repoUrl;
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      
      if (!match) {
        logger.warn('Invalid GitHub repo URL', { repoUrl });
        return;
      }

      const [, owner, repo] = match;

      this.octokit = new Octokit({
        auth: credentials.token
      });

      // Create a label for time tracking
      try {
        await this.octokit.issues.createLabel({
          owner,
          repo,
          name: 'lighttrack',
          color: '36A2EB',
          description: 'Time tracked with LightTrack'
        });
      } catch (error) {
        // Label might already exist
      }

      logger.info('GitHub link created', { 
        projectId: project.id,
        repo: `${owner}/${repo}`
      });
    } catch (error) {
      logger.error('Failed to create GitHub link', error);
      // Non-critical error, don't throw
    }
  }

  private async syncWithJira(project: Project): Promise<void> {
    // TODO: Implement JIRA sync
    logger.debug('JIRA sync not yet implemented', { projectId: project.id });
  }

  private async syncWithGitHub(project: Project): Promise<void> {
    // TODO: Implement GitHub sync
    logger.debug('GitHub sync not yet implemented', { projectId: project.id });
  }

  /**
   * Update integration setting
   */
  async updateIntegrationSetting(settingKey: string, value: any): Promise<void> {
    try {
      logger.info(`Updating integration setting: ${settingKey}`);
      
      // Handle specific integration settings
      if (settingKey.includes('jira')) {
        // Handle JIRA settings
        this.emit('jira-settings-updated', { key: settingKey, value });
      } else if (settingKey.includes('github')) {
        // Handle GitHub settings
        this.emit('github-settings-updated', { key: settingKey, value });
      } else if (settingKey.includes('calendar')) {
        // Handle Calendar settings
        this.emit('calendar-settings-updated', { key: settingKey, value });
      }
      
      logger.info(`Integration setting updated: ${settingKey}`);
    } catch (error) {
      logger.error('Error updating integration setting:', error);
      throw error;
    }
  }

  /**
   * Test integration credentials
   */
  async testCredentials(type: string, credentials: any): Promise<{ success: boolean; message: string }> {
    try {
      switch (type) {
        case 'jira':
          await this.fetchJiraProjects(credentials);
          return { success: true, message: 'JIRA connection successful' };
          
        case 'github':
          await this.fetchGitHubRepos(credentials);
          return { success: true, message: 'GitHub connection successful' };
          
        case 'trello':
          await this.fetchTrelloBoards(credentials);
          return { success: true, message: 'Trello connection successful' };
          
        case 'asana':
          await this.fetchAsanaProjects(credentials);
          return { success: true, message: 'Asana connection successful' };
          
        default:
          throw new Error(`Unknown integration type: ${type}`);
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Connection failed' 
      };
    }
  }
}