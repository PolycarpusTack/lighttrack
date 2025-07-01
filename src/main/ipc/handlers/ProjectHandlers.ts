import { IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { IPCHandler, createResponse, createErrorResponse } from '../IPCHandler';
import { getProjectRepository } from '../../database/repositories';
import { ProjectMapper } from '../../mappers/ProjectMapper';
import { ProjectManager } from '../../services/ProjectManager';
import { ProjectAnalytics } from '../../services/ProjectAnalytics';
import { IntegrationService } from '../../services/IntegrationService';
import { ipcLogger } from '../../utils/logger';

export class ProjectHandlers {
  private projectRepository = getProjectRepository();
  private projectManager = ProjectManager.getInstance();
  private projectAnalytics = ProjectAnalytics.getInstance();
  private integrationService = IntegrationService.getInstance();
  
  getHandlers(): IPCHandler[] {
    return [
      {
        channel: 'project:getAll',
        handler: this.getAllProjects.bind(this)
      },
      {
        channel: 'project:getActive',
        handler: this.getActiveProjects.bind(this)
      },
      {
        channel: 'project:getById',
        handler: this.getProjectById.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'project:create',
        handler: this.createProject.bind(this),
        validator: (args) => args[0]?.name && typeof args[0].name === 'string'
      },
      {
        channel: 'project:update',
        handler: this.updateProject.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string' && args[1]
      },
      {
        channel: 'project:delete',
        handler: this.deleteProject.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'project:archive',
        handler: this.archiveProject.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'project:unarchive',
        handler: this.unarchiveProject.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'project:getStats',
        handler: this.getProjectStats.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      // Enhanced features
      {
        channel: 'project:getHierarchy',
        handler: this.getProjectHierarchy.bind(this)
      },
      {
        channel: 'project:getTemplates',
        handler: this.getTemplates.bind(this)
      },
      {
        channel: 'project:createTemplate',
        handler: this.createTemplate.bind(this),
        validator: (args) => args[0] && args[1] && typeof args[0] === 'string'
      },
      {
        channel: 'project:bulkImport',
        handler: this.bulkImport.bind(this),
        validator: (args) => args[0] && typeof args[0].source === 'string'
      },
      {
        channel: 'project:getTimeStats',
        handler: this.getProjectTimeStats.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'project:getTrends',
        handler: this.getProjectTrends.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'project:generateHeatmap',
        handler: this.generateActivityHeatmap.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'project:analyzeBudget',
        handler: this.analyzeBudget.bind(this),
        validator: (args) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'project:comparePeriods',
        handler: this.compareProjectPeriods.bind(this),
        validator: (args) => args[0] && args[1] && args[2] && args[3] && args[4]
      }
    ];
  }

  private async getAllProjects(event: IpcMainInvokeEvent) {
    try {
      const projects = await this.projectRepository.findAll({
        where: { isDeleted: false },
        relations: ['client', 'parent'],
        order: { name: 'ASC' }
      });
      const projectDtos = ProjectMapper.toDtoArray(projects);
      return createResponse(projectDtos);
    } catch (error) {
      const message = 'Failed to get all projects';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getActiveProjects(event: IpcMainInvokeEvent) {
    try {
      const projects = await this.projectRepository.findActive();
      const projectDtos = ProjectMapper.toDtoArray(projects);
      return createResponse(projectDtos);
    } catch (error) {
      const message = 'Failed to get active projects';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getProjectById(event: IpcMainInvokeEvent, id: string) {
    try {
      const project = await this.projectRepository.findById(id);
      const projectDto = project ? ProjectMapper.toDto(project) : null;
      return createResponse(projectDto);
    } catch (error) {
      const message = 'Failed to get project by id';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async createProject(event: IpcMainInvokeEvent, data: any) {
    try {
      const project = await this.projectRepository.create(data);
      const projectDto = ProjectMapper.toDto(project);
      
      // Notify all renderer windows
      this.broadcastUpdate('project:created', projectDto);
      
      return createResponse(projectDto);
    } catch (error) {
      const message = 'Failed to create project';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async updateProject(event: IpcMainInvokeEvent, id: string, data: any) {
    try {
      const project = await this.projectRepository.update(id, data);
      
      if (project) {
        // Notify all renderer windows
        this.broadcastUpdate('project:updated', project);
      }
      
      return createResponse(project);
    } catch (error) {
      const message = 'Failed to update project';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async deleteProject(event: IpcMainInvokeEvent, id: string) {
    try {
      const result = await this.projectRepository.softDelete(id);
      
      if (result) {
        // Notify all renderer windows
        this.broadcastUpdate('project:deleted', { id });
      }
      
      return createResponse(result);
    } catch (error) {
      const message = 'Failed to delete project';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async archiveProject(event: IpcMainInvokeEvent, id: string) {
    try {
      const project = await this.projectRepository.archiveProject(id);
      
      if (project) {
        // Notify all renderer windows
        this.broadcastUpdate('project:archived', project);
      }
      
      return createResponse(project);
    } catch (error) {
      const message = 'Failed to archive project';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async unarchiveProject(event: IpcMainInvokeEvent, id: string) {
    try {
      const project = await this.projectRepository.unarchiveProject(id);
      
      if (project) {
        // Notify all renderer windows
        this.broadcastUpdate('project:unarchived', project);
      }
      
      return createResponse(project);
    } catch (error) {
      const message = 'Failed to unarchive project';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getProjectStats(event: IpcMainInvokeEvent, id: string) {
    try {
      const stats = await this.projectRepository.getProjectStats(id);
      return createResponse(stats);
    } catch (error) {
      const message = 'Failed to get project stats';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private broadcastUpdate(channel: string, data: any): void {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send(channel, data);
    });
  }

  // Enhanced project features
  private async getProjectHierarchy(event: IpcMainInvokeEvent) {
    try {
      const hierarchy = await this.projectManager.getProjectHierarchy();
      return createResponse(hierarchy);
    } catch (error) {
      const message = 'Failed to get project hierarchy';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getTemplates(event: IpcMainInvokeEvent) {
    try {
      const templates = await this.projectManager.getTemplates();
      return createResponse(templates);
    } catch (error) {
      const message = 'Failed to get templates';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async createTemplate(event: IpcMainInvokeEvent, projectId: string, name: string, description?: string) {
    try {
      const template = await this.projectManager.createTemplate(projectId, name, description);
      return createResponse(template);
    } catch (error) {
      const message = 'Failed to create template';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async bulkImport(event: IpcMainInvokeEvent, options: any) {
    try {
      const result = await this.projectManager.bulkImport(options);
      return createResponse(result);
    } catch (error) {
      const message = 'Bulk import failed';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getProjectTimeStats(event: IpcMainInvokeEvent, projectId: string) {
    try {
      const stats = await this.projectAnalytics.getProjectTimeStats(projectId);
      return createResponse(stats);
    } catch (error) {
      const message = 'Failed to get project time stats';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async getProjectTrends(event: IpcMainInvokeEvent, projectId: string, days: number = 30, interval: 'daily' | 'weekly' | 'monthly' = 'daily') {
    try {
      const trends = await this.projectAnalytics.getProjectTrends(projectId, days, interval);
      return createResponse(trends);
    } catch (error) {
      const message = 'Failed to get project trends';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async generateActivityHeatmap(event: IpcMainInvokeEvent, projectId: string, days: number = 365) {
    try {
      const heatmap = await this.projectAnalytics.generateActivityHeatmap(projectId, days);
      return createResponse(heatmap);
    } catch (error) {
      const message = 'Failed to generate heatmap';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async analyzeBudget(event: IpcMainInvokeEvent, projectId: string, budgetLimit?: number) {
    try {
      const analysis = await this.projectAnalytics.analyzeBudget(projectId, budgetLimit);
      return createResponse(analysis);
    } catch (error) {
      const message = 'Failed to analyze budget';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }

  private async compareProjectPeriods(
    event: IpcMainInvokeEvent,
    projectId: string,
    period1StartString: string,
    period1EndString: string,
    period2StartString: string,
    period2EndString: string
  ) {
    try {
      const period1Start = new Date(period1StartString);
      const period1End = new Date(period1EndString);
      const period2Start = new Date(period2StartString);
      const period2End = new Date(period2EndString);
      
      const comparison = await this.projectAnalytics.compareProjectPeriods(
        projectId,
        period1Start,
        period1End,
        period2Start,
        period2End
      );
      
      return createResponse(comparison);
    } catch (error) {
      const message = 'Failed to compare project periods';
      ipcLogger.error(message, error);
      return createErrorResponse(error instanceof Error ? error.message : message);
    }
  }
}