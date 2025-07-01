import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Activity } from './Activity';
import { Client } from './Client';
import { Goal } from './Goal';

@Entity('projects')
@Index(['name'], { unique: true })
@Index(['isArchived'])
export class Project {
  @PrimaryColumn('text')
  id: string;

  @Column('text', { unique: true })
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('text', { default: '#00bcd4' })
  color: string;

  @Column('text', { nullable: true })
  icon?: string;

  @Column('boolean', { default: false })
  isArchived: boolean;

  @Column('boolean', { default: false })
  isDeleted: boolean;

  @Column('text', { nullable: true })
  parentId?: string;

  @ManyToOne(() => Project, project => project.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Project;

  @OneToMany(() => Project, project => project.parent)
  children: Project[];

  @Column('text', { nullable: true })
  clientId?: string;

  @ManyToOne(() => Client, client => client.projects, { nullable: true })
  @JoinColumn({ name: 'clientId' })
  client?: Client;

  @Column('integer', { nullable: true })
  budgetHours?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  hourlyRate?: number;

  @Column('text', { default: 'USD' })
  currency: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('simple-json', { nullable: true })
  metadata?: Record<string, any>;

  @OneToMany(() => Activity, activity => activity.project)
  activities: Activity[];

  @OneToMany(() => Goal, goal => goal.project)
  goals: Goal[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  // Helper methods
  getTotalTime(): number {
    return this.activities
      .filter(a => !a.isDeleted)
      .reduce((total, activity) => total + activity.getDuration(), 0);
  }

  getBudgetRemaining(): number {
    if (!this.budgetHours) return 0;
    const hoursUsed = this.getTotalTime() / (1000 * 60 * 60);
    return Math.max(0, this.budgetHours - hoursUsed);
  }
}