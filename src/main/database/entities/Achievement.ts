import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Goal } from './Goal';

export type AchievementType = 
  | 'goal_completed' 
  | 'streak_milestone' 
  | 'time_milestone' 
  | 'consistency_badge' 
  | 'improvement_badge'
  | 'first_goal'
  | 'productive_week'
  | 'early_bird'
  | 'night_owl';

@Entity('achievements')
@Index(['goalId'])
@Index(['type'])
@Index(['earnedAt'])
export class Achievement {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  goalId: string;

  @ManyToOne(() => Goal, goal => goal.achievements)
  @JoinColumn({ name: 'goalId' })
  goal: Goal;

  @Column('text')
  type: AchievementType;

  @Column('text')
  name: string;

  @Column('text')
  description: string;

  @Column('text')
  icon: string;

  @Column('text')
  color: string;

  @Column('integer', { nullable: true })
  value?: number; // For milestone achievements

  @Column('boolean', { default: false })
  isNotified: boolean; // Track if user has been notified

  @CreateDateColumn()
  earnedAt: Date;

  @Column('simple-json', { nullable: true })
  metadata?: {
    streakLength?: number;
    timeSpent?: number;
    projectId?: string;
    milestoneValue?: number;
    [key: string]: any;
  };

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  // Helper methods
  getDisplayText(): string {
    switch (this.type) {
      case 'goal_completed':
        return `🎉 Goal "${this.name}" completed!`;
      case 'streak_milestone':
        return `🔥 ${this.metadata?.streakLength || this.value} day streak!`;
      case 'time_milestone':
        return `⏰ ${this.value} hours milestone reached!`;
      case 'consistency_badge':
        return `📅 Consistency champion!`;
      case 'improvement_badge':
        return `📈 Improvement detected!`;
      case 'first_goal':
        return `🌟 First goal created!`;
      case 'productive_week':
        return `💪 Productive week achieved!`;
      case 'early_bird':
        return `🌅 Early bird achiever!`;
      case 'night_owl':
        return `🦉 Night owl dedication!`;
      default:
        return `🏆 ${this.name}`;
    }
  }

  getShareText(): string {
    return `Just earned the "${this.name}" achievement in LightTrack! ${this.description}`;
  }

  isRecent(): boolean {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.earnedAt > oneDayAgo;
  }
}