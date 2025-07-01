/**
 * Analytics Services Module
 * 
 * Exports all analytics-related services and interfaces
 * according to the LightTrack solution design specification
 */

// Core Services
export { ProjectTimeAnalytics } from './ProjectTimeAnalytics';
export { ProductivityAnalyzer } from './ProductivityAnalyzer';

// Project Time Analytics Exports
export type {
  TimeRange,
  ProjectStats,
  ProjectTimeDistribution
} from './ProjectTimeAnalytics';

// Productivity Analyzer Exports
export type {
  TrendData,
  DailyTrend,
  HourlyTrend,
  WeeklyTrend,
  CategoryTrend,
  InsightResult,
  PeakProductivityAnalysis
} from './ProductivityAnalyzer';