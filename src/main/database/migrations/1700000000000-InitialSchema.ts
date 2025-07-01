import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';
import { Migration } from './Migration';

export class InitialSchema1700000000000 implements Migration {
  version = 1;
  name = 'InitialSchema1700000000000';
  description = 'Create initial database schema';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create clients table
    await queryRunner.createTable(
      new Table({
        name: 'clients',
        columns: [
          {
            name: 'id',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'text',
            isUnique: true,
          },
          {
            name: 'email',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create projects table
    await queryRunner.createTable(
      new Table({
        name: 'projects',
        columns: [
          {
            name: 'id',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'text',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'text',
            default: "'#00bcd4'",
          },
          {
            name: 'icon',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isArchived',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'parentId',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'clientId',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'budgetHours',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'hourlyRate',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'currency',
            type: 'text',
            default: "'USD'",
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['parentId'],
            referencedTableName: 'projects',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['clientId'],
            referencedTableName: 'clients',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true
    );

    // Create categories table
    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          {
            name: 'id',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'text',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'text',
            default: "'#757575'",
          },
          {
            name: 'icon',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create activities table
    await queryRunner.createTable(
      new Table({
        name: 'activities',
        columns: [
          {
            name: 'id',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'text',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'projectId',
            type: 'text',
          },
          {
            name: 'categoryId',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'startTime',
            type: 'datetime',
          },
          {
            name: 'endTime',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'isPaused',
            type: 'boolean',
            default: false,
          },
          {
            name: 'pausedDuration',
            type: 'integer',
            default: 0,
          },
          {
            name: 'pauseStartTime',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'applicationName',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'windowTitle',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isManualEntry',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'syncStatus',
            type: 'text',
            default: "'pending'",
          },
          {
            name: 'syncVersion',
            type: 'integer',
            default: 1,
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['projectId'],
            referencedTableName: 'projects',
            referencedColumnNames: ['id'],
          },
          {
            columnNames: ['categoryId'],
            referencedTableName: 'categories',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true
    );

    // Create tags table
    await queryRunner.createTable(
      new Table({
        name: 'tags',
        columns: [
          {
            name: 'id',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'text',
            isUnique: true,
          },
          {
            name: 'color',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create activity_tags junction table
    await queryRunner.createTable(
      new Table({
        name: 'activity_tags',
        columns: [
          {
            name: 'activityId',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'tagId',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['activityId'],
            referencedTableName: 'activities',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['tagId'],
            referencedTableName: 'tags',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    // Create goals table
    await queryRunner.createTable(
      new Table({
        name: 'goals',
        columns: [
          {
            name: 'id',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'text',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'text',
          },
          {
            name: 'targetType',
            type: 'text',
          },
          {
            name: 'targetValue',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'currentValue',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'projectId',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'startDate',
            type: 'date',
          },
          {
            name: 'endDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isCompleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'completedAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['projectId'],
            referencedTableName: 'projects',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    // Create analytics_cache table
    await queryRunner.createTable(
      new Table({
        name: 'analytics_cache',
        columns: [
          {
            name: 'id',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'cacheKey',
            type: 'text',
            isUnique: true,
          },
          {
            name: 'cacheType',
            type: 'text',
          },
          {
            name: 'dateRangeStart',
            type: 'date',
          },
          {
            name: 'dateRangeEnd',
            type: 'date',
          },
          {
            name: 'data',
            type: 'text',
          },
          {
            name: 'calculatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'expiresAt',
            type: 'datetime',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create settings table
    await queryRunner.createTable(
      new Table({
        name: 'settings',
        columns: [
          {
            name: 'key',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'value',
            type: 'text',
          },
          {
            name: 'type',
            type: 'text',
          },
          {
            name: 'category',
            type: 'text',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create export_history table
    await queryRunner.createTable(
      new Table({
        name: 'export_history',
        columns: [
          {
            name: 'id',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'exportType',
            type: 'text',
          },
          {
            name: 'dateRangeStart',
            type: 'date',
          },
          {
            name: 'dateRangeEnd',
            type: 'date',
          },
          {
            name: 'filters',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'filePath',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'fileSize',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'activityCount',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'exportStatus',
            type: 'text',
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'completedAt',
            type: 'datetime',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex('activities', new Index({
      name: 'IDX_ACTIVITIES_START_TIME',
      columnNames: ['startTime'],
    }));

    await queryRunner.createIndex('activities', new Index({
      name: 'IDX_ACTIVITIES_PROJECT_ID',
      columnNames: ['projectId'],
    }));

    await queryRunner.createIndex('activities', new Index({
      name: 'IDX_ACTIVITIES_SYNC_STATUS',
      columnNames: ['syncStatus'],
    }));

    await queryRunner.createIndex('projects', new Index({
      name: 'IDX_PROJECTS_NAME',
      columnNames: ['name'],
    }));

    await queryRunner.createIndex('projects', new Index({
      name: 'IDX_PROJECTS_ARCHIVED',
      columnNames: ['isArchived'],
    }));

    await queryRunner.createIndex('tags', new Index({
      name: 'IDX_TAGS_NAME',
      columnNames: ['name'],
    }));

    await queryRunner.createIndex('goals', new Index({
      name: 'IDX_GOALS_ACTIVE',
      columnNames: ['isActive'],
    }));

    await queryRunner.createIndex('goals', new Index({
      name: 'IDX_GOALS_DATES',
      columnNames: ['startDate', 'endDate'],
    }));

    await queryRunner.createIndex('analytics_cache', new Index({
      name: 'IDX_CACHE_KEY',
      columnNames: ['cacheKey'],
    }));

    await queryRunner.createIndex('analytics_cache', new Index({
      name: 'IDX_CACHE_DATES',
      columnNames: ['dateRangeStart', 'dateRangeEnd'],
    }));

    await queryRunner.createIndex('analytics_cache', new Index({
      name: 'IDX_CACHE_EXPIRES',
      columnNames: ['expiresAt'],
    }));

    await queryRunner.createIndex('settings', new Index({
      name: 'IDX_SETTINGS_CATEGORY',
      columnNames: ['category'],
    }));

    await queryRunner.createIndex('export_history', new Index({
      name: 'IDX_EXPORT_STATUS',
      columnNames: ['exportStatus'],
    }));

    await queryRunner.createIndex('export_history', new Index({
      name: 'IDX_EXPORT_CREATED',
      columnNames: ['createdAt'],
    }));

    await queryRunner.createIndex('categories', new Index({
      name: 'IDX_CATEGORIES_NAME',
      columnNames: ['name'],
    }));

    await queryRunner.createIndex('clients', new Index({
      name: 'IDX_CLIENTS_NAME',
      columnNames: ['name'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order due to foreign key constraints
    await queryRunner.dropTable('export_history');
    await queryRunner.dropTable('settings');
    await queryRunner.dropTable('analytics_cache');
    await queryRunner.dropTable('goals');
    await queryRunner.dropTable('activity_tags');
    await queryRunner.dropTable('tags');
    await queryRunner.dropTable('activities');
    await queryRunner.dropTable('categories');
    await queryRunner.dropTable('projects');
    await queryRunner.dropTable('clients');
  }
}