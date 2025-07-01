import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Index,
  BeforeInsert
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Project } from './Project';
import { Category } from './Category';
import { Tag } from './Tag';

@Entity('activities')
@Index(['startTime'])
@Index(['projectId'])
@Index(['syncStatus'])
export class Activity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('text')
  projectId: string;

  @ManyToOne(() => Project, project => project.activities)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('text', { nullable: true })
  categoryId?: string;

  @ManyToOne(() => Category, category => category.activities, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category?: Category;

  @Column('datetime')
  startTime: Date;

  @Column('datetime', { nullable: true })
  endTime?: Date;

  @Column('integer', { nullable: true })
  duration?: number; // milliseconds

  @Column('boolean', { default: false })
  isPaused: boolean;

  @Column('integer', { default: 0 })
  pausedDuration: number;

  @Column('datetime', { nullable: true })
  pauseStartTime?: Date;

  @Column('text', { nullable: true })
  applicationName?: string;

  @Column('text', { nullable: true })
  windowTitle?: string;

  @Column('boolean', { default: false })
  isManualEntry: boolean;

  @Column('boolean', { default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('text', { default: 'pending' })
  syncStatus: 'pending' | 'synced' | 'conflict';

  @Column('integer', { default: 1 })
  syncVersion: number;

  @Column('simple-json', { nullable: true })
  metadata?: Record<string, any>;

  @ManyToMany(() => Tag, tag => tag.activities)
  @JoinTable({
    name: 'activity_tags',
    joinColumn: { name: 'activityId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
  })
  tags: Tag[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  // Helper methods
  getDuration(): number {
    if (this.duration !== undefined) {
      return this.duration;
    }
    
    const end = this.endTime || new Date();
    return end.getTime() - this.startTime.getTime() - this.pausedDuration;
  }

  isRunning(): boolean {
    return !this.endTime && !this.isPaused;
  }
}