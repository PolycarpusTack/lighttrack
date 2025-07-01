import { Project as ProjectEntity } from '../database/entities/Project';
import { Project as ProjectDto, ProjectSettings } from '@shared/types/project';
import { BaseMapper } from './BaseMapper';

class ProjectMapperClass extends BaseMapper<ProjectEntity, ProjectDto> {
  /**
   * Convert TypeORM Project entity to shared Project DTO
   */
  toDto(entity: ProjectEntity): ProjectDto {
    // Extract settings from metadata or create defaults
    const settings: ProjectSettings = entity.metadata?.settings || {
      billable: false,
      currency: entity.currency || 'USD',
      hourlyRate: entity.hourlyRate,
      timeGoals: {},
      notifications: {
        dailyReport: false,
        weeklyReport: false,
        goalAlerts: false,
      },
      integrations: {},
    };

    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      color: entity.color,
      icon: entity.icon,
      parentId: entity.parentId,
      isArchived: entity.isArchived,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      totalTime: entity.getTotalTime(),
      settings,
    };
  }

  // toDtoArray is inherited from BaseMapper

  /**
   * Convert shared Project DTO to partial TypeORM Project entity for creation
   */
  toCreateEntity(dto: Partial<ProjectDto>): Partial<ProjectEntity> {
    const entity: Partial<ProjectEntity> = {
      name: dto.name,
      description: dto.description,
      color: dto.color,
      icon: dto.icon,
      parentId: dto.parentId,
      isArchived: dto.isArchived,
      currency: dto.settings?.currency,
      hourlyRate: dto.settings?.hourlyRate,
      metadata: {
        settings: dto.settings,
        ...dto.settings?.integrations,
      },
    };

    return this.removeUndefined(entity);
  }

  // toUpdateEntity is inherited from BaseMapper
}

// Export singleton instance
export const ProjectMapper = new ProjectMapperClass();