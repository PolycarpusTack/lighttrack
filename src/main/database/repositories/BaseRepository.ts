import { Repository, FindOptionsWhere, DeepPartial, FindManyOptions } from 'typeorm';
import { AppDataSource } from '../connection';
import { dbLogger } from '../../utils/logger';

export abstract class BaseRepository<T> {
  protected repository: Repository<T>;
  protected entityName: string;

  constructor(entityClass: any) {
    this.repository = AppDataSource.getRepository(entityClass);
    this.entityName = entityClass.name;
  }

  async findById(id: string): Promise<T | null> {
    try {
      return await this.repository.findOne({ where: { id } as any });
    } catch (error) {
      dbLogger.error(`Error finding ${this.entityName} by id:`, error);
      throw error;
    }
  }

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    try {
      return await this.repository.find(options);
    } catch (error) {
      dbLogger.error(`Error finding all ${this.entityName}:`, error);
      throw error;
    }
  }

  async findByConditions(conditions: FindOptionsWhere<T>): Promise<T[]> {
    try {
      return await this.repository.find({ where: conditions });
    } catch (error) {
      dbLogger.error(`Error finding ${this.entityName} by conditions:`, error);
      throw error;
    }
  }

  async create(data: DeepPartial<T>): Promise<T> {
    try {
      const entity = this.repository.create(data);
      return await this.repository.save(entity);
    } catch (error) {
      dbLogger.error(`Error creating ${this.entityName}:`, error);
      throw error;
    }
  }

  async update(id: string, data: DeepPartial<T>): Promise<T | null> {
    try {
      await this.repository.update(id, data as any);
      return await this.findById(id);
    } catch (error) {
      dbLogger.error(`Error updating ${this.entityName}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);
      return result.affected !== 0;
    } catch (error) {
      dbLogger.error(`Error deleting ${this.entityName}:`, error);
      throw error;
    }
  }

  async softDelete(id: string): Promise<boolean> {
    try {
      const result = await this.repository.update(id, { isDeleted: true } as any);
      return result.affected !== 0;
    } catch (error) {
      dbLogger.error(`Error soft deleting ${this.entityName}:`, error);
      throw error;
    }
  }

  async count(conditions?: FindOptionsWhere<T>): Promise<number> {
    try {
      return await this.repository.count({ where: conditions });
    } catch (error) {
      dbLogger.error(`Error counting ${this.entityName}:`, error);
      throw error;
    }
  }

  async exists(conditions: FindOptionsWhere<T>): Promise<boolean> {
    try {
      const count = await this.count(conditions);
      return count > 0;
    } catch (error) {
      dbLogger.error(`Error checking existence of ${this.entityName}:`, error);
      throw error;
    }
  }

  // Transaction support
  async transaction<R>(operation: (repository: Repository<T>) => Promise<R>): Promise<R> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation(queryRunner.manager.getRepository(this.repository.target));
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      dbLogger.error(`Transaction failed for ${this.entityName}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}