import { IpcMainInvokeEvent } from 'electron';

export interface IPCHandler {
  channel: string;
  handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any>;
  validator?: (args: any[]) => boolean;
  authorize?: (event: IpcMainInvokeEvent) => boolean;
}

export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export function createResponse<T>(data: T): IPCResponse<T> {
  return { success: true, data };
}

export function createErrorResponse(error: string, code?: string): IPCResponse {
  return { success: false, error, code };
}