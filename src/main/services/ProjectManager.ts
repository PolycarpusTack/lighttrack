import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Project, ProjectSettings } from '@shared/types/project';
import { ProjectRepository } from '../database/repositories/ProjectRepository';
import { ActivityRepository } from '../database/repositories/ActivityRepository';
import { logger } from '../utils/logger';
import { IntegrationService } from './IntegrationService';
import { ProjectTemplate, ProjectTemplateRepository } from '../database/repositories/ProjectTemplateRepository';

export interface ProjectInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
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
  templateId?: string;
}

export interface ProjectHierarchy {
  project: Project;
  children: ProjectHierarchy[];
  totalTime: number;
  depth: number;
}

export interface BulkImportOptions {
  source: 'jira' | 'github' | 'trello' | 'asana';
  credentials?: any;
  mapping?: {
    nameField?: string;
    descriptionField?: string;
    colorField?: string;
  };
  parentProjectId?: string;
}

export interface BulkImportResult {
  imported: Project[];
  failed: Array<{ name: string; error: string }>;
  totalProcessed: number;
}

export class ProjectManager extends EventEmitter {
  private static instance: ProjectManager;
  private projects: Map<string, Project>;
  private projectRepository: ProjectRepository;
  private activityRepository: ActivityRepository;
  private templateRepository: ProjectTemplateRepository;
  private integrationService: IntegrationService;

  static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  constructor() {
    super();
    this.projects = new Map();
    this.projectRepository = new ProjectRepository();
    this.activityRepository = new ActivityRepository();
    this.templateRepository = new ProjectTemplateRepository();
    this.integrationService = IntegrationService.getInstance();
  }

  async initialize(): Promise<void> {
    try {
      const projects = await this.projectRepository.findAll();
      projects.forEach(project => {
        this.projects.set(project.id, project);
      });
      logger.info('ProjectManager initialized', { projectCount: projects.length });
    } catch (error) {
      logger.error('Failed to initialize ProjectManager', error);
      throw error;
    }
  }

  /**
   * Create a new project with full configuration
   */
  async createProject(data: ProjectInput): Promise<Project> {
    try {
      logger.info('Creating new project', { name: data.name });

      // Apply template if specified
      let projectData = { ...data };
      if (data.templateId) {
        const template = await this.templateRepository.findById(data.templateId);
        if (template) {
          projectData = this.applyTemplate(data, template);
        }
      }

      const project: Project = {
        id: this.generateId(),
        name: projectData.name,
        description: projectData.description,
        color: projectData.color || this.generateColor(),
        icon: projectData.icon,
        parentId: projectData.parentId,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalTime: 0,
        isArchived: false,
        settings: {
          billable: projectData.billable || false,
          hourlyRate: projectData.hourlyRate,
          currency: projectData.currency || 'USD',
          timeGoals: projectData.timeGoals,
          notifications: projectData.notifications || {
            dailyReport: false,
            weeklyReport: false,
            goalAlerts: true
          }
        }
      };

      // Validate parent hierarchy
      if (project.parentId) {
        await this.validateHierarchy(project.parentId, project.id);
      }

      // Save to database
      const savedProject = await this.saveProject(project);
      
      // Sync with integrations if configured
      if (savedProject.settings.integrations) {
        await this.syncWithIntegrations(savedProject);
      }

      // Update cache
      this.projects.set(savedProject.id, savedProject);

      // Emit event
      this.emit('projectCreated', savedProject);

      logger.info('Project created successfully', { 
        projectId: savedProject.id, 
        name: savedProject.name 
      });

      return savedProject;
    } catch (error) {
      logger.error('Failed to create project', { data, error });
      throw new Error(`Project creation failed: ${error.message}`);
    }
  }

  /**
   * Update an existing project
   */
  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    try {
      const existingProject = await this.projectRepository.findById(projectId);
      if (!existingProject) {
        throw new Error('Project not found');
      }

      // Validate parent hierarchy if changing parent
      if (updates.parentId && updates.parentId !== existingProject.parentId) {
        await this.validateHierarchy(updates.parentId, projectId);
      }

      const updatedProject = {
        ...existingProject,
        ...updates,
        updatedAt: new Date()
      };

      const savedProject = await this.projectRepository.update(projectId, updatedProject);
      
      // Update cache
      this.projects.set(projectId, savedProject);

      // Emit event
      this.emit('projectUpdated', savedProject);

      return savedProject;
    } catch (error) {
      logger.error('Failed to update project', { projectId, updates, error });
      throw error;
    }
  }

  /**
   * Get project hierarchy (parent/child relationships)
   */
  async getProjectHierarchy(): Promise<ProjectHierarchy[]> {
    const allProjects = Array.from(this.projects.values());
    const rootProjects = allProjects.filter(p => !p.parentId && !p.isArchived);
    
    const buildHierarchy = async (project: Project, depth: number = 0): Promise<ProjectHierarchy> => {
      const children = allProjects
        .filter(p => p.parentId === project.id && !p.isArchived)
        .sort((a, b) => a.name.localeCompare(b.name));

      const childHierarchies = await Promise.all(
        children.map(child => buildHierarchy(child, depth + 1))
      );

      const totalTime = project.totalTime + 
        childHierarchies.reduce((sum, child) => sum + child.totalTime, 0);

      return {
        project,
        children: childHierarchies,
        totalTime,
        depth
      };
    };

    const hierarchies = await Promise.all(
      rootProjects
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(project => buildHierarchy(project))
    );

    return hierarchies;
  }

  /**
   * Bulk import projects from external sources
   */
  async bulkImport(options: BulkImportOptions): Promise<BulkImportResult> {
    logger.info('Starting bulk import', { source: options.source });

    const result: BulkImportResult = {
      imported: [],
      failed: [],
      totalProcessed: 0
    };

    try {
      let externalProjects: any[] = [];

      // Fetch projects from external source
      switch (options.source) {
        case 'jira':
          externalProjects = await this.integrationService.fetchJiraProjects(options.credentials);
          break;
        case 'github':
          externalProjects = await this.integrationService.fetchGitHubRepos(options.credentials);
          break;
        case 'trello':
          externalProjects = await this.integrationService.fetchTrelloBoards(options.credentials);
          break;
        case 'asana':
          externalProjects = await this.integrationService.fetchAsanaProjects(options.credentials);
          break;
        default:
          throw new Error(`Unsupported import source: ${options.source}`);
      }

      result.totalProcessed = externalProjects.length;

      // Import each project
      for (const externalProject of externalProjects) {
        try {
          const projectInput = this.mapExternalProject(externalProject, options);
          const project = await this.createProject(projectInput);
          result.imported.push(project);
        } catch (error) {
          result.failed.push({
            name: externalProject.name || externalProject.key || 'Unknown',
            error: error.message
          });
          logger.error('Failed to import project', { externalProject, error });
        }
      }

      logger.info('Bulk import completed', {
        source: options.source,
        imported: result.imported.length,
        failed: result.failed.length,
        total: result.totalProcessed
      });

      this.emit('bulkImportCompleted', result);

      return result;
    } catch (error) {
      logger.error('Bulk import failed', { options, error });
      throw new Error(`Bulk import failed: ${error.message}`);
    }
  }

  /**
   * Create a project template from existing project
   */
  async createTemplate(projectId: string, templateName: string, description?: string): Promise<ProjectTemplate> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const template: ProjectTemplate = {
      id: this.generateId(),
      name: templateName,
      description: description || `Template based on ${project.name}`,
      baseProject: {
        color: project.color,
        icon: project.icon,
        settings: project.settings
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const savedTemplate = await this.templateRepository.create(template);
    
    logger.info('Project template created', { 
      templateId: savedTemplate.id,
      projectId 
    });

    return savedTemplate;
  }

  /**
   * Get all project templates
   */
  async getTemplates(): Promise<ProjectTemplate[]> {
    return await this.templateRepository.findAll();
  }

  /**
   * Archive a project and optionally its children
   */
  async archiveProject(projectId: string, includeChildren: boolean = false): Promise<void> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const projectsToArchive = [project];

    if (includeChildren) {
      const children = await this.getChildProjects(projectId);
      projectsToArchive.push(...children);
    }

    for (const proj of projectsToArchive) {
      await this.updateProject(proj.id, { isArchived: true });
    }

    logger.info('Projects archived', { 
      count: projectsToArchive.length,
      includeChildren 
    });
  }

  /**
   * Calculate total budget for billable projects
   */
  async calculateProjectBudget(projectId: string): Promise<{
    totalEarned: number;
    projectedEarnings: number;
    hoursTracked: number;
    hourlyRate: number;
    currency: string;
  }> {
    const project = await this.projectRepository.findById(projectId);
    if (!project || !project.settings.billable) {
      throw new Error('Project not found or not billable');
    }

    const activities = await this.activityRepository.findByProject(projectId);
    const totalMs = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const hoursTracked = totalMs / (1000 * 60 * 60);
    const hourlyRate = project.settings.hourlyRate || 0;

    return {
      totalEarned: hoursTracked * hourlyRate,
      projectedEarnings: 0, // TODO: Calculate based on time goals
      hoursTracked,
      hourlyRate,
      currency: project.settings.currency || 'USD'
    };
  }

  private async validateHierarchy(parentId: string, childId: string): Promise<void> {
    // Check for circular dependencies
    let currentId = parentId;
    const visited = new Set<string>([childId]);

    while (currentId) {
      if (visited.has(currentId)) {
        throw new Error('Circular dependency detected in project hierarchy');
      }
      visited.add(currentId);

      const parent = await this.projectRepository.findById(currentId);
      if (!parent) {
        throw new Error('Parent project not found');
      }
      currentId = parent.parentId || '';
    }
  }

  private async getChildProjects(projectId: string): Promise<Project[]> {
    const allProjects = await this.projectRepository.findAll();
    const children: Project[] = [];
    
    const findChildren = (parentId: string) => {
      const directChildren = allProjects.filter(p => p.parentId === parentId);
      for (const child of directChildren) {
        children.push(child);
        findChildren(child.id);
      }
    };

    findChildren(projectId);
    return children;
  }

  private mapExternalProject(external: any, options: BulkImportOptions): ProjectInput {
    const mapping = options.mapping || {};
    
    return {
      name: external[mapping.nameField || 'name'] || external.name || external.key,
      description: external[mapping.descriptionField || 'description'] || external.description,
      color: external[mapping.colorField || 'color'] || this.generateColor(),
      parentId: options.parentProjectId,
      settings: {
        integrations: this.getIntegrationSettings(external, options.source)
      }
    };
  }

  private getIntegrationSettings(external: any, source: string): any {
    switch (source) {
      case 'jira':
        return {
          jira: {
            issueKey: external.key,
            projectKey: external.projectKey || external.key
          }
        };
      case 'github':
        return {
          github: {
            repoUrl: external.html_url || external.url,
            defaultBranch: external.default_branch || 'main'
          }
        };
      default:
        return {};
    }
  }

  private applyTemplate(input: ProjectInput, template: ProjectTemplate): ProjectInput {
    return {
      ...input,
      color: input.color || template.baseProject.color,
      icon: input.icon || template.baseProject.icon,
      billable: input.billable ?? template.baseProject.settings.billable,
      hourlyRate: input.hourlyRate ?? template.baseProject.settings.hourlyRate,
      currency: input.currency ?? template.baseProject.settings.currency,
      timeGoals: input.timeGoals || template.baseProject.settings.timeGoals,
      notifications: input.notifications || template.baseProject.settings.notifications
    };
  }

  private async saveProject(project: Project): Promise<Project> {
    return await this.projectRepository.create(project);
  }

  private async syncWithIntegrations(project: Project): Promise<void> {
    try {
      await this.integrationService.syncProject(project);
    } catch (error) {
      logger.error('Failed to sync with integrations', { projectId: project.id, error });
      // Don't throw - integration sync is non-critical
    }
  }

  private generateId(): string {
    return uuidv4();
  }

  private generateColor(): string {
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F',
      '#BB8FCE', '#85C1E2', '#F8C471', '#82E0AA', '#F8B5C3'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  async dispose(): Promise<void> {
    this.projects.clear();
    this.removeAllListeners();
    logger.info('ProjectManager disposed');
  }
}