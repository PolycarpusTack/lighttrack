import { Activity } from '@shared/types/activity';
import { Project } from '@shared/types/project';
import { ActivityRepository } from '../database/repositories/ActivityRepository';
import { ProjectRepository } from '../database/repositories/ProjectRepository';
import { AnalyticsService, DailyStats, WeeklyStats, TimeInsight } from './AnalyticsService';
import { ProjectTimeAnalytics, ProductivityAnalyzer } from './analytics';
import { logger } from '../utils/logger';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export type ReportType = 'daily' | 'weekly' | 'project' | 'custom';
export type ExportFormat = 'PDF' | 'CSV' | 'JSON';

export interface ReportParams {
  type: ReportType;
  startDate: Date;
  endDate: Date;
  projectId?: string;
  includeCharts?: boolean;
  includeInsights?: boolean;
  exportFormat?: ExportFormat;
}

export interface ReportMetadata {
  id: string;
  type: ReportType;
  generatedAt: Date;
  parameters: ReportParams;
  version: string;
}

export interface ReportSummary {
  totalTime: number;
  productiveTime: number;
  breakTime: number;
  activityCount: number;
  projectCount: number;
  averageSessionLength: number;
  productivityScore: number;
  focusScore: number;
}

export interface ReportChart {
  type: 'pie' | 'bar' | 'line' | 'calendar';
  title: string;
  data: any;
  options?: any;
}

export interface Report {
  metadata: ReportMetadata;
  summary: ReportSummary;
  details: any;
  charts: ReportChart[];
  insights: TimeInsight[];
  exportFormats: ExportFormat[];
}

export class ReportGenerator {
  private static instance: ReportGenerator;
  private activityRepository: ActivityRepository;
  private projectRepository: ProjectRepository;
  private analyticsService: AnalyticsService;
  private projectTimeAnalytics: ProjectTimeAnalytics;
  private productivityAnalyzer: ProductivityAnalyzer;

  static getInstance(): ReportGenerator {
    if (!ReportGenerator.instance) {
      ReportGenerator.instance = new ReportGenerator();
    }
    return ReportGenerator.instance;
  }

  constructor() {
    this.activityRepository = new ActivityRepository();
    this.projectRepository = new ProjectRepository();
    this.analyticsService = AnalyticsService.getInstance();
    this.projectTimeAnalytics = ProjectTimeAnalytics.getInstance();
    this.productivityAnalyzer = ProductivityAnalyzer.getInstance();
  }

  async generateReport(type: ReportType, params: ReportParams): Promise<Report> {
    logger.info('Generating report', { type, params });
    
    try {
      const data = await this.fetchReportData(params);
      const analysis = await this.analyzeData(data);
      const insights = await this.generateInsights(analysis);
      
      const report: Report = {
        metadata: this.createMetadata(type, params),
        summary: this.createSummary(data),
        details: this.formatDetails(data),
        charts: this.generateCharts(analysis),
        insights: insights,
        exportFormats: ['PDF', 'CSV', 'JSON']
      };

      logger.info('Report generated successfully', { reportId: report.metadata.id });
      return report;
    } catch (error) {
      logger.error('Failed to generate report', { type, params, error });
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  /**
   * Generate Daily Summary Report
   */
  async generateDailyReport(date: Date): Promise<Report> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.generateReport('daily', {
      type: 'daily',
      startDate: startOfDay,
      endDate: endOfDay,
      includeCharts: true,
      includeInsights: true
    });
  }

  /**
   * Generate Weekly Analysis Report
   */
  async generateWeeklyReport(weekStart: Date): Promise<Report> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return this.generateReport('weekly', {
      type: 'weekly',
      startDate: weekStart,
      endDate: weekEnd,
      includeCharts: true,
      includeInsights: true
    });
  }

  /**
   * Generate Project-specific Report
   */
  async generateProjectReport(projectId: string, startDate: Date, endDate: Date): Promise<Report> {
    return this.generateReport('project', {
      type: 'project',
      startDate,
      endDate,
      projectId,
      includeCharts: true,
      includeInsights: true
    });
  }

  /**
   * Export report in specified format
   */
  async exportReport(report: Report, format: ExportFormat, outputPath?: string): Promise<string> {
    const exportPath = outputPath || this.getDefaultExportPath(report, format);
    
    switch (format) {
      case 'PDF':
        return await this.exportToPDF(report, exportPath);
      case 'CSV':
        return await this.exportToCSV(report, exportPath);
      case 'JSON':
        return await this.exportToJSON(report, exportPath);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async fetchReportData(params: ReportParams): Promise<any> {
    const { startDate, endDate, projectId, type } = params;
    
    // Fetch activities
    let activities = await this.activityRepository.findByDateRange(startDate, endDate);
    
    if (projectId) {
      activities = activities.filter(a => a.projectId === projectId);
    }

    // Fetch additional data based on report type
    const data: any = { activities };

    if (type === 'daily') {
      data.dailyStats = await this.analyticsService.getDailyStats(startDate);
    } else if (type === 'weekly') {
      data.weeklyStats = await this.analyticsService.getWeeklyStats(startDate);
    }

    // Fetch projects
    data.projects = await this.projectRepository.findAll();
    
    // Fetch productivity analysis
    data.productivityAnalysis = await this.analyticsService.getProductivityAnalysis(startDate, endDate);
    
    return data;
  }

  private async analyzeData(data: any): Promise<any> {
    const { activities, projects } = data;
    
    const analysis: any = {
      activities,
      projects,
      totalTime: activities.reduce((sum: number, a: Activity) => sum + (a.duration || 0), 0)
    };

    // Project time distribution
    const projectDistribution = this.projectTimeAnalytics.calculateProjectDistribution(
      activities,
      'custom',
      data.startDate,
      data.endDate
    );
    analysis.projectDistribution = projectDistribution;

    // Productivity trends
    const dayCount = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const trends = await this.productivityAnalyzer.calculateTrends(activities, dayCount);
    analysis.trends = trends;

    // Pattern detection
    const patterns = this.productivityAnalyzer.detectPatterns(trends);
    analysis.patterns = patterns;

    return analysis;
  }

  private async generateInsights(analysis: any): Promise<TimeInsight[]> {
    const insights: TimeInsight[] = [];

    // Add pattern-based insights
    if (analysis.patterns) {
      analysis.patterns.forEach((pattern: any) => {
        insights.push({
          type: pattern.type,
          title: pattern.title,
          description: pattern.description,
          value: pattern.value,
          unit: pattern.unit,
          severity: pattern.severity,
          recommendations: pattern.recommendations,
          metadata: pattern.metadata
        });
      });
    }

    // Add custom insights based on analysis
    const avgDailyTime = analysis.totalTime / analysis.trends.daily.length;
    insights.push({
      type: 'productivity_trend',
      title: 'Average Daily Time',
      description: `You averaged ${this.formatDuration(avgDailyTime)} per day`,
      value: avgDailyTime,
      unit: 'milliseconds',
      severity: 'low',
      recommendations: avgDailyTime < 6 * 60 * 60 * 1000 
        ? ['Consider increasing your daily work hours for better productivity']
        : []
    });

    return insights;
  }

  private createMetadata(type: ReportType, params: ReportParams): ReportMetadata {
    return {
      id: `report_${type}_${Date.now()}`,
      type,
      generatedAt: new Date(),
      parameters: params,
      version: '1.0.0'
    };
  }

  private createSummary(data: any): ReportSummary {
    const { activities, productivityAnalysis } = data;
    
    const totalTime = activities.reduce((sum: number, a: Activity) => sum + (a.duration || 0), 0);
    const productiveTime = productivityAnalysis?.productiveTime || 0;
    const breakTime = totalTime - productiveTime;
    const projectCount = new Set(activities.map((a: Activity) => a.projectId)).size;
    const averageSessionLength = activities.length > 0 ? totalTime / activities.length : 0;

    return {
      totalTime,
      productiveTime,
      breakTime,
      activityCount: activities.length,
      projectCount,
      averageSessionLength,
      productivityScore: productivityAnalysis?.productivityScore || 0,
      focusScore: productivityAnalysis?.focusScore || 0
    };
  }

  private formatDetails(data: any): any {
    const { activities, projects, dailyStats, weeklyStats, productivityAnalysis } = data;
    
    return {
      activities: activities.map((a: Activity) => ({
        id: a.id,
        name: a.name,
        projectId: a.projectId,
        projectName: projects.find((p: Project) => p.id === a.projectId)?.name || 'Unknown',
        startTime: a.startTime,
        endTime: a.endTime,
        duration: a.duration,
        tags: a.tags
      })),
      dailyStats,
      weeklyStats,
      productivityAnalysis,
      projects: projects.map((p: Project) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        isArchived: p.isArchived
      }))
    };
  }

  private generateCharts(analysis: any): ReportChart[] {
    const charts: ReportChart[] = [];

    // Project distribution pie chart
    if (analysis.projectDistribution) {
      charts.push({
        type: 'pie',
        title: 'Time by Project',
        data: {
          labels: analysis.projectDistribution.projects.map((p: any) => p.projectName || p.projectId),
          datasets: [{
            data: analysis.projectDistribution.projects.map((p: any) => p.totalTime),
            backgroundColor: analysis.projectDistribution.projects.map((p: any) => p.color || '#FF6384')
          }]
        }
      });
    }

    // Daily productivity trend
    if (analysis.trends?.daily) {
      charts.push({
        type: 'line',
        title: 'Daily Productivity Trend',
        data: {
          labels: analysis.trends.daily.map((d: any) => new Date(d.date).toLocaleDateString()),
          datasets: [{
            label: 'Productivity Score',
            data: analysis.trends.daily.map((d: any) => d.productivityScore),
            borderColor: '#36A2EB',
            tension: 0.4
          }, {
            label: 'Focus Score',
            data: analysis.trends.daily.map((d: any) => d.focusScore),
            borderColor: '#4BC0C0',
            tension: 0.4
          }]
        }
      });
    }

    // Hourly distribution bar chart
    if (analysis.trends?.hourly) {
      charts.push({
        type: 'bar',
        title: 'Hourly Activity Distribution',
        data: {
          labels: analysis.trends.hourly.map((h: any) => `${h.hour}:00`),
          datasets: [{
            label: 'Active Time',
            data: analysis.trends.hourly.map((h: any) => h.totalTime),
            backgroundColor: '#FF6384'
          }]
        }
      });
    }

    // Weekly calendar heatmap
    if (analysis.trends?.daily && analysis.trends.daily.length >= 7) {
      charts.push({
        type: 'calendar',
        title: 'Weekly Activity Calendar',
        data: this.generateCalendarData(analysis.trends.daily)
      });
    }

    return charts;
  }

  private generateCalendarData(dailyData: any[]): any {
    // Transform daily data into calendar format
    return dailyData.map((day: any) => ({
      date: day.date,
      value: day.totalTime,
      level: this.getActivityLevel(day.totalTime),
      tooltip: `${new Date(day.date).toLocaleDateString()}: ${this.formatDuration(day.totalTime)}`
    }));
  }

  private getActivityLevel(time: number): number {
    const hours = time / (1000 * 60 * 60);
    if (hours === 0) return 0;
    if (hours < 2) return 1;
    if (hours < 4) return 2;
    if (hours < 6) return 3;
    return 4;
  }

  private getDefaultExportPath(report: Report, format: ExportFormat): string {
    const documentsPath = app.getPath('documents');
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `lighttrack_${report.metadata.type}_report_${timestamp}.${format.toLowerCase()}`;
    return path.join(documentsPath, 'LightTrack', 'Reports', filename);
  }

  private async exportToPDF(report: Report, exportPath: string): Promise<string> {
    // Ensure directory exists
    const dir = path.dirname(exportPath);
    await fs.promises.mkdir(dir, { recursive: true });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(exportPath);
      
      doc.pipe(stream);

      // Title page
      doc.fontSize(24).text('LightTrack Report', { align: 'center' });
      doc.fontSize(18).text(this.getReportTitle(report.metadata.type), { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${report.metadata.generatedAt.toLocaleString()}`, { align: 'center' });
      
      // Summary section
      doc.addPage();
      doc.fontSize(16).text('Summary', { underline: true });
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Total Time: ${this.formatDuration(report.summary.totalTime)}`);
      doc.text(`Productive Time: ${this.formatDuration(report.summary.productiveTime)}`);
      doc.text(`Break Time: ${this.formatDuration(report.summary.breakTime)}`);
      doc.text(`Activities: ${report.summary.activityCount}`);
      doc.text(`Projects: ${report.summary.projectCount}`);
      doc.text(`Average Session: ${this.formatDuration(report.summary.averageSessionLength)}`);
      doc.text(`Productivity Score: ${report.summary.productivityScore}/100`);
      doc.text(`Focus Score: ${report.summary.focusScore}/100`);

      // Insights section
      if (report.insights.length > 0) {
        doc.addPage();
        doc.fontSize(16).text('Insights', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        
        report.insights.forEach(insight => {
          doc.fontSize(14).text(insight.title, { underline: true });
          doc.fontSize(12).text(insight.description);
          if (insight.recommendations.length > 0) {
            doc.text('Recommendations:');
            insight.recommendations.forEach(rec => {
              doc.text(`  • ${rec}`);
            });
          }
          doc.moveDown();
        });
      }

      // Finalize PDF
      doc.end();
      
      stream.on('finish', () => {
        logger.info('PDF report exported', { path: exportPath });
        resolve(exportPath);
      });
      
      stream.on('error', reject);
    });
  }

  private async exportToCSV(report: Report, exportPath: string): Promise<string> {
    // Ensure directory exists
    const dir = path.dirname(exportPath);
    await fs.promises.mkdir(dir, { recursive: true });

    const csvLines: string[] = [];
    
    // Header
    csvLines.push('LightTrack Report');
    csvLines.push(`Type: ${report.metadata.type}`);
    csvLines.push(`Generated: ${report.metadata.generatedAt.toISOString()}`);
    csvLines.push('');

    // Summary
    csvLines.push('Summary');
    csvLines.push(`Total Time,${report.summary.totalTime}`);
    csvLines.push(`Productive Time,${report.summary.productiveTime}`);
    csvLines.push(`Break Time,${report.summary.breakTime}`);
    csvLines.push(`Activities,${report.summary.activityCount}`);
    csvLines.push(`Projects,${report.summary.projectCount}`);
    csvLines.push(`Productivity Score,${report.summary.productivityScore}`);
    csvLines.push(`Focus Score,${report.summary.focusScore}`);
    csvLines.push('');

    // Activities
    if (report.details.activities && report.details.activities.length > 0) {
      csvLines.push('Activities');
      csvLines.push('Name,Project,Start Time,End Time,Duration (ms),Tags');
      
      report.details.activities.forEach((activity: any) => {
        const tags = (activity.tags || []).join(';');
        csvLines.push(`"${activity.name}","${activity.projectName}","${activity.startTime}","${activity.endTime || ''}",${activity.duration},"${tags}"`);
      });
    }

    const csvContent = csvLines.join('\n');
    await fs.promises.writeFile(exportPath, csvContent, 'utf8');
    
    logger.info('CSV report exported', { path: exportPath });
    return exportPath;
  }

  private async exportToJSON(report: Report, exportPath: string): Promise<string> {
    // Ensure directory exists
    const dir = path.dirname(exportPath);
    await fs.promises.mkdir(dir, { recursive: true });

    const jsonContent = JSON.stringify(report, null, 2);
    await fs.promises.writeFile(exportPath, jsonContent, 'utf8');
    
    logger.info('JSON report exported', { path: exportPath });
    return exportPath;
  }

  private getReportTitle(type: ReportType): string {
    switch (type) {
      case 'daily':
        return 'Daily Summary Report';
      case 'weekly':
        return 'Weekly Analysis Report';
      case 'project':
        return 'Project Report';
      case 'custom':
        return 'Custom Report';
      default:
        return 'Report';
    }
  }

  private formatDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
}