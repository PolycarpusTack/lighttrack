import {
  Entity,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryColumn
} from 'typeorm';
import { Activity } from './Activity';
import { Tag } from './Tag';

@Entity('activity_tags')
export class ActivityTag {
  @PrimaryColumn('text')
  activityId: string;

  @PrimaryColumn('text')
  tagId: string;

  @ManyToOne(() => Activity, activity => activity.tags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activityId' })
  activity: Activity;

  @ManyToOne(() => Tag, tag => tag.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tagId' })
  tag: Tag;

  @CreateDateColumn()
  createdAt: Date;
}