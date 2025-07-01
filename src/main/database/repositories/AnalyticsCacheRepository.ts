import { Repository } from 'typeorm';
import { BaseRepository } from './BaseRepository';
import { AnalyticsCache } from '../entities/AnalyticsCache';
import { logger } from '../../utils/logger';

/**
 * Repository for managing analytics cache data
 * Provides efficient caching for expensive analytics calculations
 */
export class AnalyticsCacheRepository extends BaseRepository<AnalyticsCache> {
  constructor() {
    super(AnalyticsCache);
  }

  /**
   * Get cached data by key
   */
  async get(cacheKey: string): Promise<{ data: any; createdAt: Date } | null> {
    try {
      const entry = await this.repository.findOne({
        where: { 
          cacheKey,
          expiresAt: this.connection.manager.getRepository(AnalyticsCache)
            .createQueryBuilder()
            .where('expiresAt > :now', { now: new Date() })
            .getQueryBuilder() as any
        }
      });

      if (!entry) {
        return null;
      }

      // Parse JSON data
      const data = typeof entry.data === 'string' ? JSON.parse(entry.data) : entry.data;
      
      return {
        data,
        createdAt: entry.calculatedAt
      };
    } catch (error) {
      logger.error('Failed to get cache entry', { cacheKey, error });
      return null;
    }
  }

  /**
   * Set cache data with TTL
   */
  async set(cacheKey: string, data: any, ttlMs: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMs);
      const serializedData = JSON.stringify(data);

      // Check if entry exists
      const existing = await this.repository.findOne({ where: { cacheKey } });

      if (existing) {
        // Update existing entry
        existing.data = serializedData;
        existing.calculatedAt = new Date();
        existing.expiresAt = expiresAt;
        await this.repository.save(existing);
      } else {
        // Create new entry
        const newEntry = this.repository.create({
          cacheKey,
          cacheType: this.determineCacheType(cacheKey),
          data: serializedData,
          calculatedAt: new Date(),
          expiresAt
        });
        await this.repository.save(newEntry);
      }

      logger.debug('Cache entry saved', { cacheKey, ttlMs });
    } catch (error) {
      logger.error('Failed to set cache entry', { cacheKey, error });
      throw error;
    }
  }

  /**
   * Invalidate a cache entry
   */
  async invalidate(cacheKey: string): Promise<void> {
    try {
      await this.repository.delete({ cacheKey });
      logger.debug('Cache entry invalidated', { cacheKey });
    } catch (error) {
      logger.error('Failed to invalidate cache entry', { cacheKey, error });
      throw error;
    }
  }

  /**
   * Invalidate multiple cache entries by pattern
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      await this.repository
        .createQueryBuilder()
        .delete()
        .where('cacheKey LIKE :pattern', { pattern: `%${pattern}%` })
        .execute();
      
      logger.debug('Cache entries invalidated by pattern', { pattern });
    } catch (error) {
      logger.error('Failed to invalidate cache entries by pattern', { pattern, error });
      throw error;
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpired(): Promise<number> {
    try {
      const result = await this.repository
        .createQueryBuilder()
        .delete()
        .where('expiresAt < :now', { now: new Date() })
        .execute();
      
      const deletedCount = result.affected || 0;
      
      if (deletedCount > 0) {
        logger.info('Cleared expired cache entries', { count: deletedCount });
      }
      
      return deletedCount;
    } catch (error) {
      logger.error('Failed to clear expired cache entries', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    totalSize: number;
    typeBreakdown: { [type: string]: number };
  }> {
    try {
      const [totalEntries, expiredEntries, typeBreakdown] = await Promise.all([
        // Total entries
        this.repository.count(),
        
        // Expired entries
        this.repository.count({
          where: {
            expiresAt: this.connection.manager.getRepository(AnalyticsCache)
              .createQueryBuilder()
              .where('expiresAt < :now', { now: new Date() })
              .getQueryBuilder() as any
          }
        }),
        
        // Type breakdown
        this.repository
          .createQueryBuilder('cache')
          .select('cache.cacheType', 'type')
          .addSelect('COUNT(*)', 'count')
          .groupBy('cache.cacheType')
          .getRawMany()
      ]);

      // Calculate total size (approximate)
      const allEntries = await this.repository.find({ select: ['data'] });
      const totalSize = allEntries.reduce((size, entry) => {
        return size + (typeof entry.data === 'string' ? entry.data.length : JSON.stringify(entry.data).length);
      }, 0);

      // Convert type breakdown to object
      const typeBreakdownObj: { [type: string]: number } = {};
      typeBreakdown.forEach(item => {
        typeBreakdownObj[item.type] = parseInt(item.count);
      });

      return {
        totalEntries,
        expiredEntries,
        totalSize,
        typeBreakdown: typeBreakdownObj
      };
    } catch (error) {
      logger.error('Failed to get cache stats', error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        totalSize: 0,
        typeBreakdown: {}
      };
    }
  }

  /**
   * Get all cache keys matching a pattern
   */
  async getKeysByPattern(pattern: string): Promise<string[]> {
    try {
      const entries = await this.repository
        .createQueryBuilder('cache')
        .select('cache.cacheKey')
        .where('cache.cacheKey LIKE :pattern', { pattern: `%${pattern}%` })
        .getMany();
      
      return entries.map(entry => entry.cacheKey);
    } catch (error) {
      logger.error('Failed to get cache keys by pattern', { pattern, error });
      return [];
    }
  }

  /**
   * Warm cache with pre-calculated data
   */
  async warmCache(entries: Array<{ key: string; data: any; ttlMs: number }>): Promise<void> {
    try {
      for (const entry of entries) {
        await this.set(entry.key, entry.data, entry.ttlMs);
      }
      
      logger.info('Cache warmed', { count: entries.length });
    } catch (error) {
      logger.error('Failed to warm cache', error);
      throw error;
    }
  }

  /**
   * Get the most recently accessed cache entries
   */
  async getRecentEntries(limit: number = 10): Promise<AnalyticsCache[]> {
    try {
      return await this.repository.find({
        order: { calculatedAt: 'DESC' },
        take: limit
      });
    } catch (error) {
      logger.error('Failed to get recent cache entries', error);
      return [];
    }
  }

  /**
   * Determine cache type from key
   */
  private determineCacheType(cacheKey: string): string {
    if (cacheKey.startsWith('daily_')) return 'daily_stats';
    if (cacheKey.startsWith('weekly_')) return 'weekly_stats';
    if (cacheKey.startsWith('monthly_')) return 'monthly_stats';
    if (cacheKey.startsWith('productivity_')) return 'productivity_analysis';
    if (cacheKey.startsWith('insights_')) return 'insights';
    return 'other';
  }

  /**
   * Optimize cache by removing least recently used entries when over limit
   */
  async optimizeCache(maxEntries: number = 1000): Promise<void> {
    try {
      const totalEntries = await this.repository.count();
      
      if (totalEntries <= maxEntries) {
        return;
      }

      // Get oldest entries to remove
      const entriesToRemove = totalEntries - maxEntries;
      const oldestEntries = await this.repository.find({
        order: { calculatedAt: 'ASC' },
        take: entriesToRemove,
        select: ['id']
      });

      if (oldestEntries.length > 0) {
        await this.repository.delete(oldestEntries.map(e => e.id));
        logger.info('Cache optimized', { removedEntries: oldestEntries.length });
      }
    } catch (error) {
      logger.error('Failed to optimize cache', error);
    }
  }

  /**
   * Setup periodic cache cleanup
   */
  setupPeriodicCleanup(intervalMinutes: number = 60): NodeJS.Timer {
    return setInterval(async () => {
      try {
        await this.clearExpired();
        await this.optimizeCache();
      } catch (error) {
        logger.error('Cache cleanup failed', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
}