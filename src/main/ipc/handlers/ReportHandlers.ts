import { IpcMainInvokeEvent } from 'electron';
import { ReportGenerator, ReportType, ReportParams, ExportFormat } from '../../services/ReportGenerator';
import { logger } from '../../utils/logger';
import { shell } from 'electron';

/**
 * IPC handlers for report generation functionality
 */
export class ReportHandlers {
  private reportGenerator: ReportGenerator;

  constructor() {
    this.reportGenerator = ReportGenerator.getInstance();
  }

  /**
   * Get all IPC handlers for reports
   */
  getHandlers() {
    return [
      {
        channel: 'report:generate',
        handler: this.generateReport.bind(this),
        validator: (args: any[]) => args[0] && typeof args[0].type === 'string'
      },
      {
        channel: 'report:generateDaily',
        handler: this.generateDailyReport.bind(this),
        validator: (args: any[]) => !args[0] || !isNaN(Date.parse(args[0]))
      },
      {
        channel: 'report:generateWeekly',
        handler: this.generateWeeklyReport.bind(this),
        validator: (args: any[]) => !args[0] || !isNaN(Date.parse(args[0]))
      },
      {
        channel: 'report:generateProject',
        handler: this.generateProjectReport.bind(this),
        validator: (args: any[]) => args[0] && args[1] && args[2] && 
          typeof args[0] === 'string' && 
          !isNaN(Date.parse(args[1])) && 
          !isNaN(Date.parse(args[2]))
      },
      {
        channel: 'report:export',
        handler: this.exportReport.bind(this),
        validator: (args: any[]) => args[0] && args[1] && 
          typeof args[1] === 'string' &&
          ['PDF', 'CSV', 'JSON'].includes(args[1])
      },
      {
        channel: 'report:openExportedFile',
        handler: this.openExportedFile.bind(this),
        validator: (args: any[]) => args[0] && typeof args[0] === 'string'
      },
      {
        channel: 'report:getRecentReports',
        handler: this.getRecentReports.bind(this)
      }
    ];
  }

  /**
   * Generate a report with specified parameters
   */
  private async generateReport(event: IpcMainInvokeEvent, params: ReportParams): Promise<any> {
    try {
      logger.debug('Generating report', { params });
      
      // Convert date strings to Date objects
      if (params.startDate && typeof params.startDate === 'string') {
        params.startDate = new Date(params.startDate);
      }
      if (params.endDate && typeof params.endDate === 'string') {
        params.endDate = new Date(params.endDate);
      }
      
      const report = await this.reportGenerator.generateReport(params.type, params);
      
      logger.info('Report generated successfully', { 
        reportId: report.metadata.id,
        type: params.type 
      });
      
      // Store report metadata for recent reports list
      await this.storeReportMetadata(report);
      
      return report;
    } catch (error) {
      logger.error('Failed to generate report', { params, error });
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Generate daily report for a specific date (defaults to today)
   */
  private async generateDailyReport(event: IpcMainInvokeEvent, dateString?: string): Promise<any> {
    try {
      const date = dateString ? new Date(dateString) : new Date();
      
      logger.debug('Generating daily report', { date: date.toISOString() });
      
      const report = await this.reportGenerator.generateDailyReport(date);
      
      logger.info('Daily report generated successfully', { 
        reportId: report.metadata.id,
        date: date.toISOString() 
      });
      
      await this.storeReportMetadata(report);
      
      return report;
    } catch (error) {
      logger.error('Failed to generate daily report', { dateString, error });
      throw new Error(`Failed to generate daily report: ${error.message}`);
    }
  }

  /**
   * Generate weekly report starting from a specific date (defaults to current week)
   */
  private async generateWeeklyReport(event: IpcMainInvokeEvent, weekStartString?: string): Promise<any> {
    try {
      let weekStart: Date;
      
      if (weekStartString) {
        weekStart = new Date(weekStartString);
      } else {
        weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      }
      
      weekStart.setHours(0, 0, 0, 0);
      
      logger.debug('Generating weekly report', { weekStart: weekStart.toISOString() });
      
      const report = await this.reportGenerator.generateWeeklyReport(weekStart);
      
      logger.info('Weekly report generated successfully', { 
        reportId: report.metadata.id,
        weekStart: weekStart.toISOString() 
      });
      
      await this.storeReportMetadata(report);
      
      return report;
    } catch (error) {
      logger.error('Failed to generate weekly report', { weekStartString, error });
      throw new Error(`Failed to generate weekly report: ${error.message}`);
    }
  }

  /**
   * Generate project-specific report
   */
  private async generateProjectReport(
    event: IpcMainInvokeEvent, 
    projectId: string,
    startDateString: string,
    endDateString: string
  ): Promise<any> {
    try {
      const startDate = new Date(startDateString);
      const endDate = new Date(endDateString);
      
      logger.debug('Generating project report', { 
        projectId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      if (startDate > endDate) {
        throw new Error('Start date must be before end date');
      }
      
      const report = await this.reportGenerator.generateProjectReport(projectId, startDate, endDate);
      
      logger.info('Project report generated successfully', { 
        reportId: report.metadata.id,
        projectId
      });
      
      await this.storeReportMetadata(report);
      
      return report;
    } catch (error) {
      logger.error('Failed to generate project report', { 
        projectId,
        startDateString,
        endDateString,
        error 
      });
      throw new Error(`Failed to generate project report: ${error.message}`);
    }
  }

  /**
   * Export a generated report to file
   */
  private async exportReport(
    event: IpcMainInvokeEvent, 
    report: any,
    format: ExportFormat,
    outputPath?: string
  ): Promise<{ path: string; success: boolean }> {
    try {
      logger.debug('Exporting report', { 
        reportId: report.metadata.id,
        format,
        outputPath 
      });
      
      const exportPath = await this.reportGenerator.exportReport(report, format, outputPath);
      
      logger.info('Report exported successfully', { 
        reportId: report.metadata.id,
        format,
        path: exportPath 
      });
      
      return {
        path: exportPath,
        success: true
      };
    } catch (error) {
      logger.error('Failed to export report', { 
        reportId: report.metadata?.id,
        format,
        error 
      });
      throw new Error(`Failed to export report: ${error.message}`);
    }
  }

  /**
   * Open exported report file in system default application
   */
  private async openExportedFile(event: IpcMainInvokeEvent, filePath: string): Promise<boolean> {
    try {
      logger.debug('Opening exported file', { filePath });
      
      await shell.openPath(filePath);
      
      logger.info('Opened exported file', { filePath });
      
      return true;
    } catch (error) {
      logger.error('Failed to open exported file', { filePath, error });
      throw new Error(`Failed to open exported file: ${error.message}`);
    }
  }

  /**
   * Get list of recently generated reports
   */
  private async getRecentReports(event: IpcMainInvokeEvent): Promise<any[]> {
    try {
      logger.debug('Getting recent reports');
      
      // TODO: Implement report metadata storage and retrieval
      // For now, return empty array
      const recentReports: any[] = [];
      
      logger.debug('Retrieved recent reports', { count: recentReports.length });
      
      return recentReports;
    } catch (error) {
      logger.error('Failed to get recent reports', error);
      throw new Error(`Failed to get recent reports: ${error.message}`);
    }
  }

  /**
   * Store report metadata for recent reports list
   */
  private async storeReportMetadata(report: any): Promise<void> {
    try {
      // TODO: Implement report metadata storage
      // This could be stored in a local SQLite table or JSON file
      logger.debug('Storing report metadata', { reportId: report.metadata.id });
    } catch (error) {
      logger.error('Failed to store report metadata', error);
      // Non-critical error, don't throw
    }
  }
}