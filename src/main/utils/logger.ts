import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Enhanced logging service for LightTrack
 * Provides structured logging with multiple transports and log rotation
 */
export class Logger {
  private static instance: winston.Logger;

  static getInstance(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = Logger.createLogger();
    }
    return Logger.instance;
  }

  private static createLogger(): winston.Logger {
    const logDir = path.join(app.getPath('userData'), 'logs');
    
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let output = `${timestamp} [${level}] ${message}`;
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
          output += ` ${JSON.stringify(meta)}`;
        }
        
        return output;
      })
    );

    // Main log file with rotation
    const fileRotateTransport = new DailyRotateFile({
      filename: path.join(logDir, 'lighttrack-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
      auditFile: path.join(logDir, '.log-audit.json')
    });

    // Error log file
    const errorFileTransport = new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: logFormat,
      auditFile: path.join(logDir, '.error-audit.json')
    });

    // Console transport for development
    const consoleTransport = new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
    });

    // Create transports array
    const transports: winston.transport[] = [
      fileRotateTransport,
      errorFileTransport
    ];

    // Add console transport in development
    if (process.env.NODE_ENV === 'development' || process.env.ENABLE_CONSOLE_LOGS === 'true') {
      transports.push(consoleTransport);
    }

    // Create logger instance
    const logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { service: 'lighttrack' },
      transports,
      
      // Exception handlers
      exceptionHandlers: [
        new winston.transports.File({ 
          filename: path.join(logDir, 'exceptions.log'),
          format: logFormat
        })
      ],
      
      // Rejection handlers for unhandled promise rejections
      rejectionHandlers: [
        new winston.transports.File({ 
          filename: path.join(logDir, 'rejections.log'),
          format: logFormat
        })
      ],

      // Exit on handled exceptions
      exitOnError: false
    });

    // Log successful initialization
    logger.info('Logger initialized', {
      logDir,
      level: logger.level,
      transports: transports.length,
      environment: process.env.NODE_ENV || 'production'
    });

    return logger;
  }

  /**
   * Create a child logger with additional context
   */
  static createChildLogger(service: string, additionalMeta?: object): winston.Logger {
    return Logger.getInstance().child({
      service,
      ...additionalMeta
    });
  }

  /**
   * Log performance metrics
   */
  static logPerformance(operation: string, duration: number, metadata?: object): void {
    Logger.getInstance().info('Performance metric', {
      operation,
      duration,
      unit: 'ms',
      ...metadata
    });
  }

  /**
   * Log user action for analytics
   */
  static logUserAction(action: string, metadata?: object): void {
    Logger.getInstance().info('User action', {
      action,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Log security event
   */
  static logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', metadata?: object): void {
    const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    
    Logger.getInstance().log(level, 'Security event', {
      event,
      severity,
      timestamp: new Date().toISOString(),
      type: 'security',
      ...metadata
    });
  }
}

// Export the singleton logger instance
export const logger = Logger.getInstance();

// Create specialized loggers
export const dbLogger = logger.child({ module: 'database' });
export const ipcLogger = logger.child({ module: 'ipc' });
export const serviceLogger = logger.child({ module: 'service' });

// Export logger methods for convenience
export const logInfo = (message: string, meta?: any) => logger.info(message, meta);
export const logError = (message: string, error?: any) => logger.error(message, error);
export const logWarn = (message: string, meta?: any) => logger.warn(message, meta);
export const logDebug = (message: string, meta?: any) => logger.debug(message, meta);

export default logger;