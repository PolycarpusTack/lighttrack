import { Like } from 'typeorm';
import { BaseRepository } from './BaseRepository';
import { Tag } from '../entities/Tag';
import { dbLogger } from '../../utils/logger';

export class TagRepository extends BaseRepository<Tag> {
  constructor() {
    super(Tag);
  }

  async findByName(name: string): Promise<Tag | null> {
    try {
      return await this.repository.findOne({
        where: { name },
      });
    } catch (error) {
      dbLogger.error('Error finding tag by name:', error);
      throw error;
    }
  }

  async searchTags(query: string): Promise<Tag[]> {
    try {
      return await this.repository.find({
        where: {
          name: Like(`%${query}%`),
        },
        order: {
          name: 'ASC',
        },
      });
    } catch (error) {
      dbLogger.error('Error searching tags:', error);
      throw error;
    }
  }

  async findOrCreate(name: string, color?: string): Promise<Tag> {
    try {
      const existing = await this.findByName(name);
      if (existing) return existing;

      return await this.create({
        name,
        color: color || this.generateRandomColor(),
      });
    } catch (error) {
      dbLogger.error('Error finding or creating tag:', error);
      throw error;
    }
  }

  async findPopularTags(limit: number = 10): Promise<Array<{ tag: Tag; count: number }>> {
    try {
      const result = await this.repository
        .createQueryBuilder('tag')
        .leftJoin('tag.activities', 'activity')
        .where('activity.isDeleted = :isDeleted', { isDeleted: false })
        .groupBy('tag.id')
        .orderBy('COUNT(activity.id)', 'DESC')
        .limit(limit)
        .select(['tag', 'COUNT(activity.id) as count'])
        .getRawAndEntities();

      return result.entities.map((tag, index) => ({
        tag,
        count: parseInt(result.raw[index].count, 10),
      }));
    } catch (error) {
      dbLogger.error('Error finding popular tags:', error);
      throw error;
    }
  }

  private generateRandomColor(): string {
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7',
      '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
      '#009688', '#4caf50', '#8bc34a', '#cddc39',
      '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}