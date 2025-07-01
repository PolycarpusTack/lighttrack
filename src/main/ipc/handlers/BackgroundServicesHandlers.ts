import { IpcMainInvokeEvent } from 'electron';
import { IPCHandler, createResponse, createErrorResponse } from '../IPCHandler';
import { BackgroundServicesManager } from '../../services/BackgroundServicesManager';
import { ipcLogger } from '../../utils/logger';
import { isLightTrackError, getErrorMessage } from '../../errors';

/**
 * IPC handlers for background services management
 */
export class BackgroundServicesHandlers {
  private backgroundServicesManager: BackgroundServicesManager;

  constructor() {
    this.backgroundServicesManager = BackgroundServicesManager.getInstance();
  }

  getHandlers(): IPCHandler[] {
    return [
      {
        channel: 'background:getState',
        handler: this.getState.bind(this),
      },
      {
        channel: 'background:setIdleDetection',
        handler: this.setIdleDetection.bind(this),
        validator: (args) => typeof args[0] === 'boolean',
      },
      {
        channel: 'background:setAutoSave',
        handler: this.setAutoSave.bind(this),
        validator: (args) => typeof args[0] === 'boolean',
      },
      {
        channel: 'background:forceAutoSave',
        handler: this.forceAutoSave.bind(this),
      },
      {
        channel: 'background:getIdleState',
        handler: this.getIdleState.bind(this),
      },
    ];
  }

  /**
   * Get the current state of all background services
   */
  private async getState(event: IpcMainInvokeEvent) {
    try {
      const state = this.backgroundServicesManager.getState();
      return createResponse(state);
    } catch (error) {
      const message = getErrorMessage(error);
      ipcLogger.error('Failed to get background services state', error);
      
      if (isLightTrackError(error)) {
        return createErrorResponse(message, error.code);
      }
      return createErrorResponse(message);
    }
  }

  /**
   * Enable or disable idle detection
   */
  private async setIdleDetection(event: IpcMainInvokeEvent, enabled: boolean) {
    try {
      await this.backgroundServicesManager.setIdleDetectionEnabled(enabled);
      return createResponse({ success: true, enabled });
    } catch (error) {
      const message = getErrorMessage(error);
      ipcLogger.error('Failed to set idle detection', error);
      
      if (isLightTrackError(error)) {
        return createErrorResponse(message, error.code);
      }
      return createErrorResponse(message);
    }
  }

  /**
   * Enable or disable auto-save
   */
  private async setAutoSave(event: IpcMainInvokeEvent, enabled: boolean) {
    try {
      await this.backgroundServicesManager.setAutoSaveEnabled(enabled);
      return createResponse({ success: true, enabled });
    } catch (error) {
      const message = getErrorMessage(error);
      ipcLogger.error('Failed to set auto-save', error);
      
      if (isLightTrackError(error)) {
        return createErrorResponse(message, error.code);
      }
      return createErrorResponse(message);
    }
  }

  /**
   * Force an immediate auto-save
   */
  private async forceAutoSave(event: IpcMainInvokeEvent) {
    try {
      await this.backgroundServicesManager.forceAutoSave();
      return createResponse({ success: true });
    } catch (error) {
      const message = getErrorMessage(error);
      ipcLogger.error('Failed to force auto-save', error);
      
      if (isLightTrackError(error)) {
        return createErrorResponse(message, error.code);
      }
      return createErrorResponse(message);
    }
  }

  /**
   * Get current idle state
   */
  private async getIdleState(event: IpcMainInvokeEvent) {
    try {
      const idleState = this.backgroundServicesManager.getIdleState();
      return createResponse(idleState);
    } catch (error) {
      const message = getErrorMessage(error);
      ipcLogger.error('Failed to get idle state', error);
      
      if (isLightTrackError(error)) {
        return createErrorResponse(message, error.code);
      }
      return createErrorResponse(message);
    }
  }
}