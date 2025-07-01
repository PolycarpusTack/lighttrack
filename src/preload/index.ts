import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: any[]) => void) => {
    // Whitelist channels we allow listening to
    const validChannels = [
      'activity:started',
      'activity:stopped',
      'activity:paused',
      'activity:resumed',
      'activity:updated',
      'activity:deleted',
      'activity:tick',
      'activities:merged',
      'activity:split',
      'activities:exported',
      'activities:bulkUpdated',
      'activities:bulkDeleted',
      'project:created',
      'project:updated',
      'project:deleted',
      'project:archived',
      'project:unarchived',
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    } else {
      console.warn(`Attempted to listen to invalid channel: ${channel}`);
    }
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.off(channel, callback);
  },
  send: (channel: string, ...args: any[]) => {
    // Whitelist channels we allow sending to
    const validChannels = [
      'log-message',
      'app-ready',
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      console.warn(`Attempted to send to invalid channel: ${channel}`);
    }
  }
});

// Declare the type for TypeScript
declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      off: (channel: string, callback: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
    };
  }
}