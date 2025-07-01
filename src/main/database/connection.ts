import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { app } from 'electron';
import path from 'path';
import { Activity } from './entities/Activity';
import { Project } from './entities/Project';
import { Tag } from './entities/Tag';
import { Goal } from './entities/Goal';
import { Achievement } from './entities/Achievement';
import { ActivityTag } from './entities/ActivityTag';
import { AnalyticsCache } from './entities/AnalyticsCache';
import { Setting } from './entities/Setting';
import { ExportHistory } from './entities/ExportHistory';
import { Client } from './entities/Client';
import { Category } from './entities/Category';

// Get the appropriate database path
const getDatabasePath = (): string => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'lighttrack.db');
};

// Create TypeORM data source
export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: getDatabasePath(),
  synchronize: false, // Use migrations in production
  logging: process.env.NODE_ENV === 'development',
  entities: [
    Activity,
    Project,
    Tag,
    Goal,
    Achievement,
    ActivityTag,
    AnalyticsCache,
    Setting,
    ExportHistory,
    Client,
    Category
  ],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  subscribers: [],
});

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('Database connection initialized');
    
    // Run pending migrations
    await AppDataSource.runMigrations();
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Close database connection
export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Database connection closed');
  }
}

// Export for direct access if needed
export default AppDataSource;