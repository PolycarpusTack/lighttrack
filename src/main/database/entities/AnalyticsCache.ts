import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  BeforeInsert
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export type CacheType = 'daily_stats' | 'weekly_stats' | 'monthly_stats' | 'project_stats';

@Entity('analytics_cache')
@Index(['cacheKey'], { unique: true })
@Index(['dateRangeStart', 'dateRangeEnd'])
@Index(['expiresAt'])
export class AnalyticsCache {
  @PrimaryColumn('text')
  id: string;

  @Column('text', { unique: true })
  cacheKey: string;

  @Column('text')
  cacheType: CacheType;

  @Column('date')
  dateRangeStart: Date;

  @Column('date')
  dateRangeEnd: Date;

  @Column('simple-json')
  data: Record<string, any>;

  @CreateDateColumn()
  calculatedAt: Date;

  @Column('datetime', { nullable: true })
  expiresAt?: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }
}