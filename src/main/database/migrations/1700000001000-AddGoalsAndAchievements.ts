import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class AddGoalsAndAchievements1700000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create goals table
    await queryRunner.createTable(
      new Table({
        name: 'goals',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'target',
            type: 'text', // JSON
            isNullable: false,
          },
          {
            name: 'period',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'projectId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'startDate',
            type: 'datetime',
            isNullable: false,
          },
          {
            name: 'endDate',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'pausedAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'settings',
            type: 'text', // JSON
            isNullable: false,
          },
          {
            name: 'currentProgress',
            type: 'real',
            default: 0,
          },
          {
            name: 'currentStreak',
            type: 'integer',
            default: 0,
          },
          {
            name: 'longestStreak',
            type: 'integer',
            default: 0,
          },
          {
            name: 'lastUpdated',
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
        ],
        indices: [
          new Index('IDX_GOAL_USER_ID', ['userId']),
          new Index('IDX_GOAL_TYPE', ['type']),
          new Index('IDX_GOAL_PROJECT_ID', ['projectId']),
          new Index('IDX_GOAL_ACTIVE', ['isActive']),
          new Index('IDX_GOAL_START_DATE', ['startDate']),
        ],
      }),
      true
    );

    // Create achievements table
    await queryRunner.createTable(
      new Table({
        name: 'achievements',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'goalId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '7',
            isNullable: false,
          },
          {
            name: 'rarity',
            type: 'varchar',
            length: '20',
            default: "'common'",
          },
          {
            name: 'value',
            type: 'real',
            isNullable: true,
          },
          {
            name: 'isNotified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'earnedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new Index('IDX_ACHIEVEMENT_USER_ID', ['userId']),
          new Index('IDX_ACHIEVEMENT_GOAL_ID', ['goalId']),
          new Index('IDX_ACHIEVEMENT_TYPE', ['type']),
          new Index('IDX_ACHIEVEMENT_RARITY', ['rarity']),
          new Index('IDX_ACHIEVEMENT_EARNED_AT', ['earnedAt']),
        ],
      }),
      true
    );

    // Add foreign key constraints
    await queryRunner.createForeignKey(
      'goals',
      new ForeignKey({
        columnNames: ['projectId'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_GOAL_PROJECT',
      })
    );

    await queryRunner.createForeignKey(
      'achievements',
      new ForeignKey({
        columnNames: ['goalId'],
        referencedTableName: 'goals',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_ACHIEVEMENT_GOAL',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.dropForeignKey('achievements', 'FK_ACHIEVEMENT_GOAL');
    await queryRunner.dropForeignKey('goals', 'FK_GOAL_PROJECT');

    // Drop tables
    await queryRunner.dropTable('achievements');
    await queryRunner.dropTable('goals');
  }
}