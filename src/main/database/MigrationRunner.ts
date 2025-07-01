import { DataSource } from 'typeorm';
import { logger } from '../utils/logger';

export class MigrationRunner {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  async runPendingMigrations(): Promise<void> {
    try {
      const pendingMigrations = await this.dataSource.showMigrations();
      
      if (pendingMigrations) {
        logger.info(`Found ${pendingMigrations} pending migrations`);
        
        const migrations = await this.dataSource.runMigrations({
          transaction: 'all',
        });
        
        logger.info(`Successfully ran ${migrations.length} migrations`);
        
        migrations.forEach((migration) => {
          logger.info(`- ${migration.name}`);
        });
      } else {
        logger.info('No pending migrations');
      }
    } catch (error) {
      logger.error('Failed to run migrations:', error);
      throw error;
    }
  }

  async revertLastMigration(): Promise<void> {
    try {
      await this.dataSource.undoLastMigration({
        transaction: 'all',
      });
      
      logger.info('Successfully reverted last migration');
    } catch (error) {
      logger.error('Failed to revert migration:', error);
      throw error;
    }
  }

  async getMigrationStatus(): Promise<{
    executed: string[];
    pending: string[];
  }> {
    try {
      const executedMigrations = await this.dataSource.migrations;
      const allMigrations = this.dataSource.migrations;
      
      const executedNames = executedMigrations.map(m => m.name);
      const pendingMigrations = allMigrations.filter(
        m => !executedNames.includes(m.name)
      );
      
      return {
        executed: executedNames,
        pending: pendingMigrations.map(m => m.name),
      };
    } catch (error) {
      logger.error('Failed to get migration status:', error);
      throw error;
    }
  }
}