import { Activity } from '@shared/types/activity';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BlockPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TimelineTheme {
  backgroundColor: string;
  gridColor: string;
  axisColor: string;
  textColor: string;
  blockColors: {
    [projectId: string]: string;
  };
  defaultBlockColor: string;
  currentTimeColor: string;
  selectionColor: string;
  hoverColor: string;
}

export enum TimeScale {
  HOUR = 'hour',
  DAY = 'day', 
  WEEK = 'week',
  MONTH = 'month'
}

export interface TimelineOptions {
  scale: TimeScale;
  showGrid: boolean;
  showCurrentTime: boolean;
  trackHeight: number;
  headerHeight: number;
  theme: TimelineTheme;
}

/**
 * Canvas-based timeline renderer for activity visualization
 * Provides high-performance rendering of time blocks with zoom and interaction support
 */
export class TimelineRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: TimelineOptions;
  private viewport: ViewportBounds;
  private timeRange: TimeRange;
  private activities: Activity[] = [];
  private selectedActivityIds: Set<string> = new Set();
  private hoveredActivityId: string | null = null;
  private pixelsPerMs: number = 0;
  private trackPositions: Map<string, number> = new Map();

  // Constants
  private static readonly BLOCK_HEIGHT = 24;
  private static readonly TRACK_PADDING = 8;
  private static readonly AXIS_HEIGHT = 40;
  private static readonly MIN_BLOCK_WIDTH = 2;
  private static readonly TIME_LABEL_HEIGHT = 20;

  constructor(canvas: HTMLCanvasElement, options: Partial<TimelineOptions> = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;

    this.options = {
      scale: TimeScale.DAY,
      showGrid: true,
      showCurrentTime: true,
      trackHeight: TimelineRenderer.BLOCK_HEIGHT + TimelineRenderer.TRACK_PADDING * 2,
      headerHeight: TimelineRenderer.AXIS_HEIGHT,
      theme: this.getDefaultTheme(),
      ...options
    };

    this.viewport = {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height
    };

    this.setupEventListeners();
  }

  /**
   * Render the complete timeline with activities
   */
  renderTimeline(activities: Activity[], timeRange: TimeRange): void {
    this.activities = activities;
    this.timeRange = timeRange;
    this.calculateScale();
    this.calculateTrackPositions();

    this.clearCanvas();
    this.drawBackground();
    this.drawTimeAxis();
    this.drawGrid();
    this.drawActivityBlocks();
    this.drawCurrentTimeIndicator();
    this.drawSelectionOverlay();
  }

  /**
   * Update the time scale for zooming
   */
  setTimeScale(scale: TimeScale): void {
    this.options.scale = scale;
    this.calculateScale();
    this.render();
  }

  /**
   * Get activity at specific pixel coordinates
   */
  getActivityAt(x: number, y: number): Activity | null {
    for (const activity of this.activities) {
      const position = this.calculateBlockPosition(activity);
      if (x >= position.x && x <= position.x + position.width &&
          y >= position.y && y <= position.y + position.height) {
        return activity;
      }
    }
    return null;
  }

  /**
   * Select activities within a rectangle
   */
  selectActivitiesInRect(startX: number, startY: number, endX: number, endY: number): Activity[] {
    const selected: Activity[] = [];
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    for (const activity of this.activities) {
      const position = this.calculateBlockPosition(activity);
      if (position.x < maxX && position.x + position.width > minX &&
          position.y < maxY && position.y + position.height > minY) {
        selected.push(activity);
      }
    }

    return selected;
  }

  /**
   * Convert time to pixel position
   */
  timeToPixel(time: Date): number {
    const ms = time.getTime() - this.timeRange.start.getTime();
    return ms * this.pixelsPerMs + this.viewport.x;
  }

  /**
   * Convert pixel position to time
   */
  pixelToTime(x: number): Date {
    const ms = (x - this.viewport.x) / this.pixelsPerMs;
    return new Date(this.timeRange.start.getTime() + ms);
  }

  /**
   * Convert duration to pixel width
   */
  durationToPixel(durationMs: number): number {
    return Math.max(durationMs * this.pixelsPerMs, TimelineRenderer.MIN_BLOCK_WIDTH);
  }

  /**
   * Set selected activities
   */
  setSelectedActivities(activityIds: string[]): void {
    this.selectedActivityIds = new Set(activityIds);
    this.render();
  }

  /**
   * Set hovered activity
   */
  setHoveredActivity(activityId: string | null): void {
    this.hoveredActivityId = activityId;
    this.render();
  }

  /**
   * Get track position for a project
   */
  private getTrackPosition(projectId: string): number {
    return this.trackPositions.get(projectId) || 0;
  }

  /**
   * Calculate block position for an activity
   */
  private calculateBlockPosition(activity: Activity): BlockPosition {
    const x = this.timeToPixel(new Date(activity.startTime));
    const duration = activity.endTime 
      ? new Date(activity.endTime).getTime() - new Date(activity.startTime).getTime()
      : activity.duration || 0;
    const width = this.durationToPixel(duration);
    const y = this.getTrackPosition(activity.projectId) + TimelineRenderer.TRACK_PADDING;
    
    return { 
      x, 
      y, 
      width, 
      height: TimelineRenderer.BLOCK_HEIGHT 
    };
  }

  /**
   * Calculate pixels per millisecond based on current scale and viewport
   */
  private calculateScale(): void {
    const timeSpanMs = this.timeRange.end.getTime() - this.timeRange.start.getTime();
    this.pixelsPerMs = this.viewport.width / timeSpanMs;
  }

  /**
   * Calculate track positions for projects
   */
  private calculateTrackPositions(): void {
    this.trackPositions.clear();
    const projects = new Set(this.activities.map(a => a.projectId));
    let yOffset = this.options.headerHeight;

    for (const projectId of projects) {
      this.trackPositions.set(projectId, yOffset);
      yOffset += this.options.trackHeight;
    }
  }

  /**
   * Clear the canvas
   */
  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw background
   */
  private drawBackground(): void {
    this.ctx.fillStyle = this.options.theme.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw time axis
   */
  private drawTimeAxis(): void {
    const { ctx, options } = this;
    
    ctx.fillStyle = options.theme.axisColor;
    ctx.fillRect(0, 0, this.canvas.width, options.headerHeight);

    ctx.fillStyle = options.theme.textColor;
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw time labels based on scale
    const labelInterval = this.getLabelInterval();
    const startTime = new Date(Math.floor(this.timeRange.start.getTime() / labelInterval) * labelInterval);
    
    for (let time = startTime.getTime(); time <= this.timeRange.end.getTime(); time += labelInterval) {
      const x = this.timeToPixel(new Date(time));
      if (x >= 0 && x <= this.canvas.width) {
        const label = this.formatTimeLabel(new Date(time));
        ctx.fillText(label, x, options.headerHeight / 2);
      }
    }
  }

  /**
   * Draw grid lines
   */
  private drawGrid(): void {
    if (!this.options.showGrid) return;

    const { ctx, options } = this;
    ctx.strokeStyle = options.theme.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Vertical grid lines
    const gridInterval = this.getGridInterval();
    const startTime = new Date(Math.floor(this.timeRange.start.getTime() / gridInterval) * gridInterval);
    
    for (let time = startTime.getTime(); time <= this.timeRange.end.getTime(); time += gridInterval) {
      const x = this.timeToPixel(new Date(time));
      if (x >= 0 && x <= this.canvas.width) {
        ctx.moveTo(x, options.headerHeight);
        ctx.lineTo(x, this.canvas.height);
      }
    }

    // Horizontal grid lines
    for (const [, yPos] of this.trackPositions) {
      ctx.moveTo(0, yPos);
      ctx.lineTo(this.canvas.width, yPos);
    }

    ctx.stroke();
  }

  /**
   * Draw activity blocks
   */
  private drawActivityBlocks(): void {
    const { ctx, options } = this;

    for (const activity of this.activities) {
      const position = this.calculateBlockPosition(activity);
      
      // Skip if block is outside viewport
      if (position.x + position.width < 0 || position.x > this.canvas.width) {
        continue;
      }

      // Determine block color
      let fillColor = options.theme.blockColors[activity.projectId] || options.theme.defaultBlockColor;
      
      if (this.selectedActivityIds.has(activity.id)) {
        fillColor = options.theme.selectionColor;
      } else if (this.hoveredActivityId === activity.id) {
        fillColor = options.theme.hoverColor;
      }

      // Draw block
      ctx.fillStyle = fillColor;
      ctx.fillRect(position.x, position.y, position.width, position.height);

      // Draw block border
      ctx.strokeStyle = this.darkenColor(fillColor, 0.2);
      ctx.lineWidth = 1;
      ctx.strokeRect(position.x, position.y, position.width, position.height);

      // Draw activity name if block is wide enough
      if (position.width > 50) {
        ctx.fillStyle = options.theme.textColor;
        ctx.font = '10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        const text = this.truncateText(activity.name, position.width - 8);
        ctx.fillText(text, position.x + 4, position.y + position.height / 2);
      }
    }
  }

  /**
   * Draw current time indicator
   */
  private drawCurrentTimeIndicator(): void {
    if (!this.options.showCurrentTime) return;

    const now = new Date();
    if (now >= this.timeRange.start && now <= this.timeRange.end) {
      const x = this.timeToPixel(now);
      
      this.ctx.strokeStyle = this.options.theme.currentTimeColor;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.options.headerHeight);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
  }

  /**
   * Draw selection overlay
   */
  private drawSelectionOverlay(): void {
    // Implementation for selection rectangle would go here
  }

  /**
   * Re-render the timeline
   */
  private render(): void {
    if (this.activities.length > 0 && this.timeRange) {
      this.renderTimeline(this.activities, this.timeRange);
    }
  }

  /**
   * Setup event listeners for interactions
   */
  private setupEventListeners(): void {
    // Mouse event handlers will be implemented in the React component
  }

  /**
   * Get interval for time labels based on scale
   */
  private getLabelInterval(): number {
    switch (this.options.scale) {
      case TimeScale.HOUR:
        return 15 * 60 * 1000; // 15 minutes
      case TimeScale.DAY:
        return 60 * 60 * 1000; // 1 hour
      case TimeScale.WEEK:
        return 24 * 60 * 60 * 1000; // 1 day
      case TimeScale.MONTH:
        return 7 * 24 * 60 * 60 * 1000; // 1 week
      default:
        return 60 * 60 * 1000;
    }
  }

  /**
   * Get interval for grid lines
   */
  private getGridInterval(): number {
    return this.getLabelInterval() / 4;
  }

  /**
   * Format time label based on scale
   */
  private formatTimeLabel(time: Date): string {
    switch (this.options.scale) {
      case TimeScale.HOUR:
        return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case TimeScale.DAY:
        return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case TimeScale.WEEK:
        return time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      case TimeScale.MONTH:
        return time.toLocaleDateString([], { month: 'short', day: 'numeric' });
      default:
        return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  /**
   * Truncate text to fit within width
   */
  private truncateText(text: string, maxWidth: number): string {
    const metrics = this.ctx.measureText(text);
    if (metrics.width <= maxWidth) {
      return text;
    }

    let truncated = text;
    while (this.ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    
    return truncated + '...';
  }

  /**
   * Darken a color by a percentage
   */
  private darkenColor(color: string, percent: number): string {
    // Simple color darkening - in a real implementation you'd use a proper color library
    return color; // Simplified for now
  }

  /**
   * Get default theme
   */
  private getDefaultTheme(): TimelineTheme {
    return {
      backgroundColor: '#ffffff',
      gridColor: '#e0e0e0',
      axisColor: '#f5f5f5',
      textColor: '#333333',
      blockColors: {},
      defaultBlockColor: '#2196F3',
      currentTimeColor: '#ff4444',
      selectionColor: '#3f51b5',
      hoverColor: '#5c6bc0'
    };
  }
}