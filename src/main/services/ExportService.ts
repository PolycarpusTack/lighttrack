import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { Activity as ActivityDto } from '@shared/types/activity';
import { Project as ProjectDto } from '@shared/types/project';
import { serviceLogger } from '../utils/logger';

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  activities: string[];
  includeDetails?: boolean;
  groupBy?: 'none' | 'project' | 'date' | 'category';
  dateRange?: {
    start: Date;
    end: Date;
  };
  projects?: ProjectDto[];
}

export interface ExportResult {
  filePath: string;
  fileSize: number;
  activityCount: number;
  format: string;
}

/**
 * Service for exporting activities in various formats
 * Supports CSV, JSON, and PDF text formats with grouping options
 */
export class ExportService {
  private static instance: ExportService;
  
  /**
   * Get the singleton instance of ExportService
   * @returns {ExportService} The service instance
   */
  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  /**
   * Export activities to a file in the specified format
   * @param activities - Array of activities to export
   * @param options - Export configuration including format and grouping
   * @returns Export result with file path and metadata
   * @throws {Error} If export format is unsupported
   */
  async exportActivities(
    activities: ActivityDto[], 
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Create exports directory if it doesn't exist
      const exportsDir = path.join(app.getPath('userData'), 'exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `lighttrack-export-${timestamp}.${options.format}`;
      const filePath = path.join(exportsDir, filename);

      let fileContent: string;
      
      switch (options.format) {
        case 'csv':
          fileContent = this.generateCSV(activities, options);
          break;
        case 'json':
          fileContent = this.generateJSON(activities, options);
          break;
        case 'pdf':
          // For now, generate a text representation that could be converted to PDF
          fileContent = this.generatePDFText(activities, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Write file
      fs.writeFileSync(filePath, fileContent, 'utf8');
      
      // Get file stats
      const stats = fs.statSync(filePath);
      
      const result: ExportResult = {
        filePath,
        fileSize: stats.size,
        activityCount: activities.length,
        format: options.format,
      };

      serviceLogger.info(`Exported ${activities.length} activities to ${filePath}`);
      return result;
      
    } catch (error) {
      serviceLogger.error('Failed to export activities:', error);
      throw error;
    }
  }

  /**
   * Generate CSV content from activities
   * @param activities - Activities to export
   * @param options - Export options
   * @returns CSV formatted string
   * @private
   */
  private generateCSV(activities: ActivityDto[], options: ExportOptions): string {
    const headers = [
      'ID',
      'Name',
      'Description',
      'Project ID',
      'Start Time',
      'End Time',
      'Duration (minutes)',
      'Is Paused',
      'Paused Duration (minutes)',
      'Application',
      'Window Title',
      'Manual Entry',
      'Tags',
      'Created At',
      'Updated At'
    ];

    const rows = activities.map(activity => [
      activity.id,
      `"${activity.name.replace(/"/g, '""')}"`,
      `"${(activity.description || '').replace(/"/g, '""')}"`,
      activity.projectId,
      activity.startTime.toISOString(),
      activity.endTime ? activity.endTime.toISOString() : '',
      Math.round(activity.duration / (1000 * 60)),
      activity.isPaused.toString(),
      Math.round(activity.pausedDuration / (1000 * 60)),
      `"${(activity.applicationName || '').replace(/"/g, '""')}"`,
      `"${(activity.windowTitle || '').replace(/"/g, '""')}"`,
      activity.isManualEntry.toString(),
      `"${activity.tags.join(', ')}"`,
      activity.createdAt ? activity.createdAt.toISOString() : '',
      activity.updatedAt ? activity.updatedAt.toISOString() : ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Generate JSON content from activities with metadata
   * @param activities - Activities to export
   * @param options - Export options including grouping
   * @returns JSON formatted string
   * @private
   */
  private generateJSON(activities: ActivityDto[], options: ExportOptions): string {
    const exportData = {
      meta: {
        exportDate: new Date().toISOString(),
        format: 'json',
        activityCount: activities.length,
        options: {
          includeDetails: options.includeDetails,
          groupBy: options.groupBy,
          dateRange: options.dateRange,
        },
      },
      activities: options.groupBy === 'none' 
        ? activities 
        : this.groupActivities(activities, options.groupBy!),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate human-readable text format for PDF conversion
   * @param activities - Activities to export
   * @param options - Export options including grouping
   * @returns Formatted text suitable for PDF generation
   * @private
   */
  private generatePDFText(activities: ActivityDto[], options: ExportOptions): string {
    const lines: string[] = [];
    
    // Header
    lines.push('LIGHTTRACK TIME TRACKING EXPORT');
    lines.push('================================');
    lines.push(`Export Date: ${new Date().toLocaleDateString()}`);
    lines.push(`Total Activities: ${activities.length}`);
    lines.push('');

    // Group activities if requested
    if (options.groupBy && options.groupBy !== 'none') {
      const grouped = this.groupActivities(activities, options.groupBy);
      
      Object.entries(grouped).forEach(([groupName, groupActivities]) => {
        lines.push(`${groupName.toUpperCase()}`);
        lines.push('-'.repeat(groupName.length));
        
        groupActivities.forEach(activity => {
          lines.push(`${activity.name}`);
          lines.push(`  Duration: ${this.formatDuration(activity.duration)}`);
          lines.push(`  Time: ${activity.startTime.toLocaleString()} - ${activity.endTime?.toLocaleString() || 'Ongoing'}`);
          if (activity.description) {
            lines.push(`  Description: ${activity.description}`);
          }
          lines.push('');
        });
        
        lines.push('');
      });
    } else {
      // List all activities
      activities.forEach(activity => {
        lines.push(`${activity.name}`);
        lines.push(`  Duration: ${this.formatDuration(activity.duration)}`);
        lines.push(`  Time: ${activity.startTime.toLocaleString()} - ${activity.endTime?.toLocaleString() || 'Ongoing'}`);
        if (activity.description) {
          lines.push(`  Description: ${activity.description}`);
        }
        lines.push('');
      });
    }

    return lines.join('\n');
  }

  /**
   * Group activities by specified criteria
   * @param activities - Activities to group
   * @param groupBy - Grouping criteria: 'project', 'date', or 'category'
   * @returns Map of group keys to activities
   * @private
   */
  private groupActivities(activities: ActivityDto[], groupBy: string): Record<string, ActivityDto[]> {
    const grouped: Record<string, ActivityDto[]> = {};

    activities.forEach(activity => {
      let groupKey: string;
      
      switch (groupBy) {
        case 'project':
          groupKey = activity.projectId;
          break;
        case 'date':
          groupKey = activity.startTime.toDateString();
          break;
        case 'category':
          groupKey = activity.categoryId || 'No Category';
          break;
        default:
          groupKey = 'All Activities';
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(activity);
    });

    return grouped;
  }

  /**
   * Format duration from milliseconds to human-readable string
   * @param milliseconds - Duration in milliseconds
   * @returns Formatted string like "2h 30m" or "45m"
   * @private
   */
  private formatDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Get or create the exports directory
   * @returns Path to the exports directory
   */
  async getExportsDirectory(): Promise<string> {
    const exportsDir = path.join(app.getPath('userData'), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    return exportsDir;
  }

  /**
   * Get list of previous exports with metadata
   * @returns Array of export file information sorted by creation date (newest first)
   */
  async getExportHistory(): Promise<Array<{ filename: string; size: number; created: Date }>> {
    try {
      const exportsDir = await this.getExportsDirectory();
      const files = fs.readdirSync(exportsDir);
      
      return files
        .filter(file => file.startsWith('lighttrack-export-'))
        .map(filename => {
          const filePath = path.join(exportsDir, filename);
          const stats = fs.statSync(filePath);
          return {
            filename,
            size: stats.size,
            created: stats.birthtime,
          };
        })
        .sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      serviceLogger.error('Failed to get export history:', error);
      return [];
    }
  }
}