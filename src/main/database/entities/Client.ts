import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  BeforeInsert
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Project } from './Project';

@Entity('clients')
@Index(['name'], { unique: true })
export class Client {
  @PrimaryColumn('text')
  id: string;

  @Column('text', { unique: true })
  name: string;

  @Column('text', { nullable: true })
  email?: string;

  @Column('text', { nullable: true })
  phone?: string;

  @Column('text', { nullable: true })
  address?: string;

  @Column('text', { nullable: true })
  notes?: string;

  @Column('boolean', { default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Project, project => project.client)
  projects: Project[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}