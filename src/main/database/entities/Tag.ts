import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  Index,
  BeforeInsert
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Activity } from './Activity';

@Entity('tags')
@Index(['name'], { unique: true })
export class Tag {
  @PrimaryColumn('text')
  id: string;

  @Column('text', { unique: true })
  name: string;

  @Column('text', { nullable: true })
  color?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => Activity, activity => activity.tags)
  activities: Activity[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}