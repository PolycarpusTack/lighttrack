import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  BeforeInsert
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export type ExportType = 'csv' | 'json' | 'pdf' | 'report';
export type ExportStatus = 'pending' | 'completed' | 'failed';

@Entity('export_history')
@Index(['exportStatus'])
@Index(['createdAt'])
export class ExportHistory {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  exportType: ExportType;

  @Column('date')
  dateRangeStart: Date;

  @Column('date')
  dateRangeEnd: Date;

  @Column('simple-json', { nullable: true })
  filters?: Record<string, any>;

  @Column('text', { nullable: true })
  filePath?: string;

  @Column('integer', { nullable: true })
  fileSize?: number;

  @Column('integer', { nullable: true })
  activityCount?: number;

  @Column('text')
  exportStatus: ExportStatus;

  @Column('text', { nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column('datetime', { nullable: true })
  completedAt?: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}