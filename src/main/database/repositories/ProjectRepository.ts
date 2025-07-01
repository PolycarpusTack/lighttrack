import { BaseRepository } from './BaseRepository';
import { Project } from '../entities/Project';
import { dbLogger } from '../../utils/logger';

export class ProjectRepository extends BaseRepository<Project> {
  constructor() {
    super(Project);
  }

  async findActive(): Promise<Project[]> {
    try {
      return await this.repository.find({
        where: {
          isArchived: false,
          isDeleted: false,
        },
        relations: ['client', 'parent'],
        order: {
          name: 'ASC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding active projects:', error);
      throw error;
    }
  }

  async findArchived(): Promise<Project[]> {
    try {
      return await this.repository.find({
        where: {
          isArchived: true,
          isDeleted: false,
        },
        relations: ['client', 'parent'],
        order: {
          name: 'ASC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding archived projects:', error);
      throw error;
    }
  }

  async findByClient(clientId: string): Promise<Project[]> {
    try {
      return await this.repository.find({
        where: {
          clientId,
          isDeleted: false,
        },
        relations: ['client', 'parent'],
        order: {
          name: 'ASC',
        },
      });
    } catch (error) {
      dbLogger.error('Error finding projects by client:', error);
      throw error;
    }
  }

  async findWithActivities(projectId: string): Promise<Project | null> {
    try {
      return await this.repository.findOne({
        where: {
          id: projectId,
          isDeleted: false,
        },
        relations: ['activities', 'client', 'parent', 'children', 'goals'],
      });
    } catch (error) {
      dbLogger.error('Error finding project with activities:', error);
      throw error;
    }
  }

  async archiveProject(id: string): Promise<Project | null> {
    try {
      await this.repository.update(id, { isArchived: true });
      return await this.findById(id);
    } catch (error) {
      dbLogger.error('Error archiving project:', error);
      throw error;
    }
  }

  async unarchiveProject(id: string): Promise<Project | null> {
    try {
      await this.repository.update(id, { isArchived: false });
      return await this.findById(id);
    } catch (error) {
      dbLogger.error('Error unarchiving project:', error);
      throw error;
    }
  }

  async updateBudget(id: string, budgetHours: number, hourlyRate?: number): Promise<Project | null> {
    try {
      const updateData: any = { budgetHours };
      if (hourlyRate !== undefined) {
        updateData.hourlyRate = hourlyRate;
      }
      
      await this.repository.update(id, updateData);
      return await this.findById(id);
    } catch (error) {
      dbLogger.error('Error updating project budget:', error);
      throw error;
    }
  }

  async getProjectStats(projectId: string): Promise<{
    totalTime: number;
    activityCount: number;
    budgetUsed: number;
    budgetRemaining: number;
    estimatedCost: number;
  }> {
    try {
      const project = await this.findWithActivities(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const totalTime = project.getTotalTime();
      const hoursUsed = totalTime / (1000 * 60 * 60);
      const budgetUsed = project.budgetHours ? (hoursUsed / project.budgetHours) * 100 : 0;
      const budgetRemaining = project.getBudgetRemaining();
      const estimatedCost = project.hourlyRate ? hoursUsed * project.hourlyRate : 0;

      return {
        totalTime,
        activityCount: project.activities.filter(a => !a.isDeleted).length,
        budgetUsed,
        budgetRemaining,
        estimatedCost,
      };
    } catch (error) {
      dbLogger.error('Error getting project stats:', error);
      throw error;
    }
  }

  async createDefaultProject(): Promise<Project> {
    try {
      const defaultExists = await this.exists({ id: 'default' });
      if (defaultExists) {
        return await this.findById('default') as Project;
      }

      return await this.create({
        id: 'default',
        name: 'General',
        description: 'Default project for general activities',
        color: '#00bcd4',
        isArchived: false,
        isDeleted: false,
      });
    } catch (error) {
      dbLogger.error('Error creating default project:', error);
      throw error;
    }
  }
}