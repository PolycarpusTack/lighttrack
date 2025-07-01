// Custom Error Classes for LightTrack

export class LightTrackError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends LightTrackError {
  constructor(entity: string, id?: string) {
    const message = id 
      ? `${entity} with id '${id}' not found`
      : `${entity} not found`;
    super(message, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends LightTrackError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class ConflictError extends LightTrackError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class UnauthorizedError extends LightTrackError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class DatabaseError extends LightTrackError {
  constructor(message: string, public originalError?: Error) {
    super(message, 'DATABASE_ERROR', 500);
  }
}

export class ExportError extends LightTrackError {
  constructor(message: string, public format?: string) {
    super(message, 'EXPORT_ERROR', 500);
  }
}

export class IPCError extends LightTrackError {
  constructor(message: string, public channel?: string) {
    super(message, 'IPC_ERROR', 500);
  }
}

// Error handler utility
export function isLightTrackError(error: unknown): error is LightTrackError {
  return error instanceof LightTrackError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function getErrorCode(error: unknown): string {
  if (isLightTrackError(error)) {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}