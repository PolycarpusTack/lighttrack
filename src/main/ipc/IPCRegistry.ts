import { ipcMain } from 'electron';
import { IPCHandler } from './IPCHandler';
import { ipcLogger } from '../utils/logger';

export class IPCRegistry {
  private handlers: Map<string, IPCHandler> = new Map();

  register(handlers: IPCHandler[]): void {
    handlers.forEach(handler => {
      if (this.handlers.has(handler.channel)) {
        throw new Error(`Handler already registered for channel: ${handler.channel}`);
      }

      ipcMain.handle(handler.channel, async (event, ...args) => {
        try {
          // Validate arguments if validator provided
          if (handler.validator && !handler.validator(args)) {
            throw new Error('Invalid arguments');
          }

          // Check authorization if authorizer provided
          if (handler.authorize && !handler.authorize(event)) {
            throw new Error('Unauthorized');
          }

          // Execute handler
          const result = await handler.handler(event, ...args);
          
          // If handler returns an IPCResponse, return it directly
          if (result && typeof result === 'object' && 'success' in result) {
            return result;
          }
          
          // Otherwise wrap in success response
          return { success: true, data: result };
        } catch (error) {
          ipcLogger.error(`IPC Error [${handler.channel}]:`, error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            code: 'IPC_ERROR'
          };
        }
      });

      this.handlers.set(handler.channel, handler);
      ipcLogger.debug(`Registered IPC handler: ${handler.channel}`);
    });
  }

  unregisterAll(): void {
    this.handlers.forEach((handler, channel) => {
      ipcMain.removeHandler(channel);
      ipcLogger.debug(`Unregistered IPC handler: ${channel}`);
    });
    this.handlers.clear();
  }

  getRegisteredChannels(): string[] {
    return Array.from(this.handlers.keys());
  }

  isChannelRegistered(channel: string): boolean {
    return this.handlers.has(channel);
  }
}