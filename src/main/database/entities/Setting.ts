import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  Index
} from 'typeorm';

export type SettingType = 'string' | 'number' | 'boolean' | 'json';
export type SettingCategory = 'general' | 'tracking' | 'sync' | 'appearance' | 'export' | 'notifications';

@Entity('settings')
@Index(['category'])
export class Setting {
  @PrimaryColumn('text')
  key: string;

  @Column('text')
  value: string;

  @Column('text')
  type: SettingType;

  @Column('text')
  category: SettingCategory;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods to get typed values
  getValue<T = any>(): T {
    switch (this.type) {
      case 'boolean':
        return (this.value === 'true') as any;
      case 'number':
        return parseFloat(this.value) as any;
      case 'json':
        try {
          return JSON.parse(this.value);
        } catch {
          return null as any;
        }
      default:
        return this.value as any;
    }
  }

  setValue(value: any): void {
    switch (this.type) {
      case 'boolean':
        this.value = String(value);
        break;
      case 'number':
        this.value = String(value);
        break;
      case 'json':
        this.value = JSON.stringify(value);
        break;
      default:
        this.value = String(value);
    }
  }
}