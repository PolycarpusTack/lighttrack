import { EventEmitter } from 'events';
import { IdleDetectionService } from './IdleDetectionService';
import { AutoSaveService } from './AutoSaveService';
import { serviceLogger } from '../utils/logger';

export interface BackgroundServicesState {
  idleDetection: {
    enabled: boolean;
    isRunning: boolean;
  };
  autoSave: {
    enabled: boolean;
    isRunning: boolean;
  };
}

/**
 * Manager for coordinating all background services
 * Provides centralized control and monitoring of background tasks
 */
export class BackgroundServicesManager extends EventEmitter {
  private static instance: BackgroundServicesManager;
  private idleDetectionService: IdleDetectionService;
  private autoSaveService: AutoSaveService;
  private servicesEnabled: {
    idleDetection: boolean;
    autoSave: boolean;
  } = {
    idleDetection: true,
    autoSave: true,
  };

  private constructor() {
    super();
    this.idleDetectionService = IdleDetectionService.getInstance();
    this.autoSaveService = AutoSaveService.getInstance();
    this.setupServiceListeners();
  }

  /**
   * Get the singleton instance of BackgroundServicesManager
   * @returns {BackgroundServicesManager} The manager instance
   */
  static getInstance(): BackgroundServicesManager {
    if (!BackgroundServicesManager.instance) {
      BackgroundServicesManager.instance = new BackgroundServicesManager();
    }
    return BackgroundServicesManager.instance;
  }

  /**
   * Initialize and start all enabled background services
   */
  async initialize(): Promise<void> {
    try {
      serviceLogger.info('Initializing background services...');

      // Start auto-save service
      if (this.servicesEnabled.autoSave) {
        await this.autoSaveService.start();
      }

      // Start idle detection service
      if (this.servicesEnabled.idleDetection) {
        await this.idleDetectionService.startMonitoring();
      }

      serviceLogger.info('Background services initialized successfully');
      this.emit('services:initialized');
    } catch (error) {
      serviceLogger.error('Failed to initialize background services:', error);
      throw error;
    }
  }

  /**
   * Shutdown all background services
   */
  async shutdown(): Promise<void> {
    try {
      serviceLogger.info('Shutting down background services...');

      // Stop all services
      await this.autoSaveService.stop();
      this.idleDetectionService.stopMonitoring();

      serviceLogger.info('Background services shut down successfully');
      this.emit('services:shutdown');
    } catch (error) {
      serviceLogger.error('Error shutting down background services:', error);
      throw error;
    }
  }

  /**
   * Enable or disable idle detection service
   * @param enabled - Whether to enable the service
   */
  async setIdleDetectionEnabled(enabled: boolean): Promise<void> {
    this.servicesEnabled.idleDetection = enabled;

    if (enabled) {
      await this.idleDetectionService.startMonitoring();
    } else {
      this.idleDetectionService.stopMonitoring();
    }

    this.emit('service:toggled', {
      service: 'idleDetection',
      enabled,
    });
  }

  /**
   * Enable or disable auto-save service
   * @param enabled - Whether to enable the service
   */
  async setAutoSaveEnabled(enabled: boolean): Promise<void> {
    this.servicesEnabled.autoSave = enabled;

    if (enabled) {
      await this.autoSaveService.start();
    } else {
      await this.autoSaveService.stop();
    }

    this.emit('service:toggled', {
      service: 'autoSave',
      enabled,
    });
  }

  /**
   * Get the current state of all background services
   * @returns State of all background services
   */
  getState(): BackgroundServicesState {
    const idleState = this.idleDetectionService.getIdleState();
    const autoSaveState = this.autoSaveService.getState();

    return {
      idleDetection: {
        enabled: this.servicesEnabled.idleDetection,
        isRunning: this.servicesEnabled.idleDetection && !idleState.isIdle,
      },
      autoSave: {
        enabled: this.servicesEnabled.autoSave,
        isRunning: autoSaveState.isRunning,
      },
    };
  }

  /**
   * Force auto-save to run immediately
   */
  async forceAutoSave(): Promise<void> {
    await this.autoSaveService.forceSave();
  }

  /**
   * Get idle detection state
   */
  getIdleState() {
    return this.idleDetectionService.getIdleState();
  }

  /**
   * Set up listeners for service events
   * @private
   */
  private setupServiceListeners(): void {
    // Forward idle detection events
    this.idleDetectionService.on('idle:started', (data) => {
      this.emit('idle:started', data);
    });

    this.idleDetectionService.on('idle:ended', (data) => {
      this.emit('idle:ended', data);
    });

    this.idleDetectionService.on('system:suspended', (data) => {
      this.emit('system:suspended', data);
    });

    this.idleDetectionService.on('system:resumed', (data) => {
      this.emit('system:resumed', data);
    });

    // Forward auto-save events
    this.autoSaveService.on('autosave:completed', (data) => {
      this.emit('autosave:completed', data);
    });

    this.autoSaveService.on('autosave:failed', (error) => {
      this.emit('autosave:failed', error);
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.shutdown();
    this.removeAllListeners();
    this.idleDetectionService.destroy();
    this.autoSaveService.destroy();
  }
}