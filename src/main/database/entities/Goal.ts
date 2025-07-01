import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Project } from './Project';
import { Achievement } from './Achievement';

@Entity('goals')
@Index(['userId', 'isActive'])
@Index(['type', 'period'])
export class Goal {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  userId: string;

  @Column('text')
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('text')
  type: 'daily' | 'weekly' | 'project' | 'habit';

  @Column('simple-json')
  target: {
    value: number;
    unit: 'hours' | 'minutes' | 'sessions' | 'days' | 'tasks';
    comparison: 'minimum' | 'maximum' | 'exact';
  };

  @Column('text')
  period: 'day' | 'week' | 'month' | 'year' | 'ongoing';

  @Column('text', { nullable: true })
  projectId?: string;

  @ManyToOne(() => Project, project => project.goals, { nullable: true })
  @JoinColumn({ name: 'projectId' })
  project?: Project;

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('datetime')
  startDate: Date;

  @Column('datetime', { nullable: true })
  endDate?: Date;

  @Column('simple-json')
  settings: {
    notifications: {
      reminders: boolean;
      achievements: boolean;
      dailyProgress: boolean;
      weeklyProgress: boolean;
    };
    autoReset: boolean;
    allowPartialCredit: boolean;
    streakRequired?: number;
    gracePeriod?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Achievement, achievement => achievement.goal)
  achievements: Achievement[];

  // Progress tracking fields (denormalized for performance)
  @Column('integer', { default: 0 })
  currentStreak: number;

  @Column('integer', { default: 0 })
  longestStreak: number;

  @Column('datetime', { nullable: true })
  lastProgressUpdate?: Date;

  @Column('simple-json', { nullable: true })
  progressHistory?: Array<{
    date: string;
    value: number;
    achieved: boolean;
    notes?: string;
  }>;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  // Helper methods
  getCurrentProgress(): number {
    if (!this.progressHistory || this.progressHistory.length === 0) {
      return 0;
    }

    const today = new Date().toISOString().split('T')[0];
    
    switch (this.period) {
      case 'day':
        const todayProgress = this.progressHistory.find(p => p.date === today);
        return todayProgress?.value || 0;
        
      case 'week':
        const weekStart = this.getWeekStart(new Date());
        const weekProgress = this.progressHistory
          .filter(p => new Date(p.date) >= weekStart)
          .reduce((sum, p) => sum + p.value, 0);
        return weekProgress;
        
      case 'month':
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const monthProgress = this.progressHistory
          .filter(p => new Date(p.date) >= monthStart)
          .reduce((sum, p) => sum + p.value, 0);
        return monthProgress;
        
      default:
        return this.progressHistory.reduce((sum, p) => sum + p.value, 0);
    }
  }

  getProgressPercentage(): number {
    const current = this.getCurrentProgress();
    return Math.min(100, (current / this.target.value) * 100);
  }

  isCompleted(): boolean {
    const current = this.getCurrentProgress();
    
    switch (this.target.comparison) {
      case 'minimum':
        return current >= this.target.value;
      case 'maximum':
        return current <= this.target.value;
      case 'exact':
        return current === this.target.value;
      default:
        return current >= this.target.value;
    }
  }

  calculateStreak(): number {
    if (!this.progressHistory || this.progressHistory.length === 0) {
      return 0;
    }

    const sortedHistory = [...this.progressHistory]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let streak = 0;
    const today = new Date();

    for (const entry of sortedHistory) {
      const entryDate = new Date(entry.date);
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak && entry.achieved) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  shouldSendReminder(): boolean {
    if (!this.settings.notifications.reminders || !this.isActive) {
      return false;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Check if already achieved today
    const todayProgress = this.progressHistory?.find(p => p.date === today);
    if (todayProgress?.achieved) {
      return false;
    }

    // Send reminder if it's been more than 2 hours since last update
    if (this.lastProgressUpdate) {
      const hoursSinceUpdate = (now.getTime() - this.lastProgressUpdate.getTime()) / (1000 * 60 * 60);
      return hoursSinceUpdate >= 2;
    }

    return true;
  }
}