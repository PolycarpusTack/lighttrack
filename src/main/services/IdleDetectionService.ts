import { powerMonitor } from 'electron';
import { EventEmitter } from 'events';
import { ActivityService } from './ActivityService';
import { serviceLogger } from '../utils/logger';
import { IDLE_CHECK_INTERVAL_MS, IDLE_THRESHOLD_MS } from '../constants';

export interface IdleState {
  isIdle: boolean;
  idleTime: number;
  lastActiveTime: Date;
}

/**
 * Service for detecting user idle state and automatically pausing activities
 * Uses Electron's powerMonitor API for system-level idle detection
 */
export class IdleDetectionService extends EventEmitter {
  private static instance: IdleDetectionService;
  private activityService: ActivityService;
  private idleCheckInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private lastActiveTime: Date = new Date();
  private wasIdle: boolean = false;
  private pausedActivityId: string | null = null;

  private constructor() {
    super();
    this.activityService = ActivityService.getInstance();
  }

  /**
   * Get the singleton instance of IdleDetectionService
   * @returns {IdleDetectionService} The service instance
   */
  static getInstance(): IdleDetectionService {
    if (!IdleDetectionService.instance) {
      IdleDetectionService.instance = new IdleDetectionService();
    }
    return IdleDetectionService.instance;
  }

  /**
   * Start monitoring for idle state
   * Automatically pauses current activity when idle is detected
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      serviceLogger.warn('Idle detection already monitoring');
      return;
    }

    try {
      this.isMonitoring = true;
      this.lastActiveTime = new Date();
      
      // Set up idle check interval
      this.idleCheckInterval = setInterval(() => {
        this.checkIdleState();
      }, IDLE_CHECK_INTERVAL_MS);

      // Listen to system events
      powerMonitor.on('suspend', this.handleSystemSuspend.bind(this));
      powerMonitor.on('resume', this.handleSystemResume.bind(this));
      powerMonitor.on('lock-screen', this.handleScreenLock.bind(this));
      powerMonitor.on('unlock-screen', this.handleScreenUnlock.bind(this));

      serviceLogger.info('Idle detection monitoring started');
      this.emit('monitoring:started');
    } catch (error) {
      serviceLogger.error('Failed to start idle monitoring:', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  /**
   * Stop monitoring for idle state
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }

    // Remove system event listeners
    powerMonitor.removeAllListeners('suspend');
    powerMonitor.removeAllListeners('resume');
    powerMonitor.removeAllListeners('lock-screen');
    powerMonitor.removeAllListeners('unlock-screen');

    this.isMonitoring = false;
    serviceLogger.info('Idle detection monitoring stopped');
    this.emit('monitoring:stopped');
  }

  /**
   * Get current idle state information
   * @returns Current idle state with time information
   */
  getIdleState(): IdleState {
    const idleTime = powerMonitor.getSystemIdleTime() * 1000; // Convert to milliseconds
    const isIdle = idleTime >= IDLE_THRESHOLD_MS;

    return {
      isIdle,
      idleTime,
      lastActiveTime: this.lastActiveTime,
    };
  }

  /**
   * Check idle state and handle transitions
   * @private
   */
  private async checkIdleState(): Promise<void> {
    try {
      const idleState = this.getIdleState();
      
      if (idleState.isIdle && !this.wasIdle) {
        // Transition to idle
        await this.handleIdleStart();
      } else if (!idleState.isIdle && this.wasIdle) {
        // Transition from idle to active
        await this.handleIdleEnd();
      }

      // Update last active time if not idle
      if (!idleState.isIdle) {
        this.lastActiveTime = new Date();
      }

      this.wasIdle = idleState.isIdle;
    } catch (error) {
      serviceLogger.error('Error checking idle state:', error);
    }
  }

  /**
   * Handle transition to idle state
   * @private
   */
  private async handleIdleStart(): Promise<void> {
    try {
      serviceLogger.info('User went idle');
      
      // Get current activity
      const currentActivity = await this.activityService.getCurrentActivity();
      
      if (currentActivity && !currentActivity.isPaused) {
        // Pause the current activity
        await this.activityService.pauseActivity(currentActivity.id);
        this.pausedActivityId = currentActivity.id;
        
        this.emit('idle:started', {
          activityId: currentActivity.id,
          timestamp: new Date(),
        });
        
        serviceLogger.info(`Paused activity ${currentActivity.name} due to idle`);
      }
    } catch (error) {
      serviceLogger.error('Error handling idle start:', error);
    }
  }

  /**
   * Handle transition from idle to active state
   * @private
   */
  private async handleIdleEnd(): Promise<void> {
    try {
      serviceLogger.info('User became active');
      
      // Check if we paused an activity
      if (this.pausedActivityId) {
        const shouldResume = await this.shouldResumeActivity();
        
        if (shouldResume) {
          // Resume the paused activity
          await this.activityService.resumeActivity(this.pausedActivityId);
          
          this.emit('idle:ended', {
            activityId: this.pausedActivityId,
            timestamp: new Date(),
            resumed: true,
          });
          
          serviceLogger.info(`Resumed activity after idle`);
        } else {
          this.emit('idle:ended', {
            activityId: this.pausedActivityId,
            timestamp: new Date(),
            resumed: false,
          });
        }
        
        this.pausedActivityId = null;
      }
    } catch (error) {
      serviceLogger.error('Error handling idle end:', error);
    }
  }

  /**
   * Determine if activity should be automatically resumed
   * @private
   */
  private async shouldResumeActivity(): Promise<boolean> {
    // In the future, this could check user preferences
    // For now, always resume if it was paused by idle detection
    return true;
  }

  /**
   * Handle system suspend event
   * @private
   */
  private async handleSystemSuspend(): Promise<void> {
    try {
      serviceLogger.info('System suspended');
      
      const currentActivity = await this.activityService.getCurrentActivity();
      if (currentActivity && !currentActivity.isPaused) {
        await this.activityService.pauseActivity(currentActivity.id);
        this.pausedActivityId = currentActivity.id;
        
        this.emit('system:suspended', {
          activityId: currentActivity.id,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      serviceLogger.error('Error handling system suspend:', error);
    }
  }

  /**
   * Handle system resume event
   * @private
   */
  private async handleSystemResume(): Promise<void> {
    try {
      serviceLogger.info('System resumed');
      
      this.emit('system:resumed', {
        timestamp: new Date(),
      });
      
      // Don't auto-resume after system suspend
      // User should manually resume
      this.pausedActivityId = null;
    } catch (error) {
      serviceLogger.error('Error handling system resume:', error);
    }
  }

  /**
   * Handle screen lock event
   * @private
   */
  private async handleScreenLock(): Promise<void> {
    try {
      serviceLogger.info('Screen locked');
      
      const currentActivity = await this.activityService.getCurrentActivity();
      if (currentActivity && !currentActivity.isPaused) {
        await this.activityService.pauseActivity(currentActivity.id);
        this.pausedActivityId = currentActivity.id;
        
        this.emit('screen:locked', {
          activityId: currentActivity.id,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      serviceLogger.error('Error handling screen lock:', error);
    }
  }

  /**
   * Handle screen unlock event
   * @private
   */
  private async handleScreenUnlock(): Promise<void> {
    try {
      serviceLogger.info('Screen unlocked');
      
      this.emit('screen:unlocked', {
        timestamp: new Date(),
      });
      
      // Don't auto-resume after screen lock
      // User should manually resume
      this.pausedActivityId = null;
    } catch (error) {
      serviceLogger.error('Error handling screen unlock:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}