import { contextBridge, ipcRenderer } from 'electron';

// Allowed channels for security
const allowedChannels = {
  invoke: [
    'activity:start',
    'activity:stop',
    'activity:pause',
    'activity:resume',
    'activity:getTodayActivities',
    'activity:getFiltered',
    'project:getAll',
    'project:create',
    'project:update',
    'project:delete',
    'goal:getAll',
    'goal:create',
    'goal:update',
    'settings:get',
    'settings:update',
    'integration:sync',
    'window:minimize',
    'window:toggleDevTools',
    'db:query'
  ],
  on: [
    'activity:started',
    'activity:stopped',
    'activity:updated',
    'goal:achieved',
    'sync:completed',
    'navigate:settings',
    'tray:start-tracking'
  ]
};

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]) => {
    if (allowedChannels.invoke.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Channel ${channel} is not allowed`);
  },
  
  on: (channel: string, callback: (...args: any[]) => void) => {
    if (allowedChannels.on.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  off: (channel: string, callback: (...args: any[]) => void) => {
    if (allowedChannels.on.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },
  
  send: (channel: string, ...args: any[]) => {
    if (allowedChannels.invoke.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  }
});