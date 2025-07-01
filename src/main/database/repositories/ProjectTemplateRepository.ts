import { Repository } from 'typeorm';
import { getRepository } from '../connection';
import { ProjectSettings } from '@shared/types/project';
import { logger } from '../../utils/logger';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  baseProject: {
    color: string;
    icon?: string;
    settings: ProjectSettings;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectTemplateRepository {
  private repository: Repository<ProjectTemplate> | null = null;

  private async getRepo(): Promise<Repository<ProjectTemplate>> {
    if (!this.repository) {
      const connection = await getRepository();
      // For now, we'll store templates in a JSON file or a simple table
      // In production, this would be a proper entity
      this.repository = connection.getRepository('ProjectTemplate' as any);
    }
    return this.repository;
  }

  async create(template: ProjectTemplate): Promise<ProjectTemplate> {
    try {
      // For now, using file-based storage
      const templates = await this.loadTemplates();
      templates.push(template);
      await this.saveTemplates(templates);
      
      logger.info('Project template created', { templateId: template.id });
      return template;
    } catch (error) {
      logger.error('Failed to create project template', error);
      throw error;
    }
  }

  async findById(id: string): Promise<ProjectTemplate | null> {
    try {
      const templates = await this.loadTemplates();
      return templates.find(t => t.id === id) || null;
    } catch (error) {
      logger.error('Failed to find project template', { id, error });
      throw error;
    }
  }

  async findAll(): Promise<ProjectTemplate[]> {
    try {
      return await this.loadTemplates();
    } catch (error) {
      logger.error('Failed to find all project templates', error);
      throw error;
    }
  }

  async update(id: string, updates: Partial<ProjectTemplate>): Promise<ProjectTemplate> {
    try {
      const templates = await this.loadTemplates();
      const index = templates.findIndex(t => t.id === id);
      
      if (index === -1) {
        throw new Error('Template not found');
      }

      templates[index] = {
        ...templates[index],
        ...updates,
        updatedAt: new Date()
      };

      await this.saveTemplates(templates);
      
      logger.info('Project template updated', { templateId: id });
      return templates[index];
    } catch (error) {
      logger.error('Failed to update project template', { id, error });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const templates = await this.loadTemplates();
      const filtered = templates.filter(t => t.id !== id);
      
      if (filtered.length === templates.length) {
        throw new Error('Template not found');
      }

      await this.saveTemplates(filtered);
      logger.info('Project template deleted', { templateId: id });
    } catch (error) {
      logger.error('Failed to delete project template', { id, error });
      throw error;
    }
  }

  // Temporary file-based storage implementation
  private async loadTemplates(): Promise<ProjectTemplate[]> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const { app } = require('electron');
      
      const templatePath = path.join(app.getPath('userData'), 'project-templates.json');
      
      try {
        const data = await fs.readFile(templatePath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        // File doesn't exist yet
        return this.getDefaultTemplates();
      }
    } catch (error) {
      logger.error('Failed to load templates', error);
      return this.getDefaultTemplates();
    }
  }

  private async saveTemplates(templates: ProjectTemplate[]): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const { app } = require('electron');
      
      const templatePath = path.join(app.getPath('userData'), 'project-templates.json');
      await fs.writeFile(templatePath, JSON.stringify(templates, null, 2));
    } catch (error) {
      logger.error('Failed to save templates', error);
      throw error;
    }
  }

  private getDefaultTemplates(): ProjectTemplate[] {
    return [
      {
        id: 'default-billable',
        name: 'Billable Project',
        description: 'Template for client billable projects',
        baseProject: {
          color: '#36A2EB',
          icon: '💰',
          settings: {
            billable: true,
            hourlyRate: 100,
            currency: 'USD',
            notifications: {
              dailyReport: true,
              weeklyReport: true,
              goalAlerts: true
            }
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'default-internal',
        name: 'Internal Project',
        description: 'Template for internal company projects',
        baseProject: {
          color: '#4BC0C0',
          icon: '🏢',
          settings: {
            billable: false,
            timeGoals: {
              weekly: 20 * 60 * 60 * 1000 // 20 hours
            },
            notifications: {
              weeklyReport: true,
              goalAlerts: true
            }
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'default-personal',
        name: 'Personal Project',
        description: 'Template for personal side projects',
        baseProject: {
          color: '#9966FF',
          icon: '🚀',
          settings: {
            billable: false,
            notifications: {
              goalAlerts: true
            }
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }
}