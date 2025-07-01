/**
 * Base mapper class for converting between entities and DTOs
 */
export abstract class BaseMapper<TEntity, TDto> {
  /**
   * Convert entity to DTO
   */
  abstract toDto(entity: TEntity): TDto;

  /**
   * Convert array of entities to DTOs
   */
  toDtoArray(entities: TEntity[]): TDto[] {
    return entities.map(entity => this.toDto(entity));
  }

  /**
   * Convert DTO to entity for creation
   */
  abstract toCreateEntity(dto: Partial<TDto>): Partial<TEntity>;

  /**
   * Convert DTO to entity for updates
   */
  toUpdateEntity(dto: Partial<TDto>): Partial<TEntity> {
    return this.toCreateEntity(dto);
  }

  /**
   * Remove undefined properties from object
   */
  protected removeUndefined<T extends object>(obj: T): T {
    const cleaned = { ...obj };
    Object.keys(cleaned).forEach(key => {
      if ((cleaned as any)[key] === undefined) {
        delete (cleaned as any)[key];
      }
    });
    return cleaned;
  }
}