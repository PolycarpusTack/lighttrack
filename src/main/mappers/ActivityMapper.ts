import { Activity as ActivityEntity } from '../database/entities/Activity';
import { Activity as ActivityDto } from '@shared/types/activity';
import { BaseMapper } from './BaseMapper';

class ActivityMapperClass extends BaseMapper<ActivityEntity, ActivityDto> {
  /**
   * Convert TypeORM Activity entity to shared Activity DTO
   */
  toDto(entity: ActivityEntity): ActivityDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      projectId: entity.projectId,
      categoryId: entity.categoryId,
      startTime: entity.startTime,
      endTime: entity.endTime,
      duration: entity.getDuration(),
      isPaused: entity.isPaused,
      pausedDuration: entity.pausedDuration,
      pauseStartTime: entity.pauseStartTime,
      applicationName: entity.applicationName,
      windowTitle: entity.windowTitle,
      isManualEntry: entity.isManualEntry,
      tags: entity.tags?.map(tag => tag.name) || [],
      metadata: entity.metadata || {},
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  // toDtoArray is inherited from BaseMapper

  /**
   * Convert shared Activity DTO to partial TypeORM Activity entity for creation
   */
  toCreateEntity(dto: Partial<ActivityDto>): Partial<ActivityEntity> {
    const entity: Partial<ActivityEntity> = {
      name: dto.name,
      description: dto.description,
      projectId: dto.projectId,
      categoryId: dto.categoryId,
      startTime: dto.startTime,
      endTime: dto.endTime,
      isPaused: dto.isPaused,
      pausedDuration: dto.pausedDuration,
      pauseStartTime: dto.pauseStartTime,
      applicationName: dto.applicationName,
      windowTitle: dto.windowTitle,
      isManualEntry: dto.isManualEntry,
      metadata: dto.metadata,
    };

    return this.removeUndefined(entity);
  }

  // toUpdateEntity is inherited from BaseMapper
}

// Export singleton instance
export const ActivityMapper = new ActivityMapperClass();