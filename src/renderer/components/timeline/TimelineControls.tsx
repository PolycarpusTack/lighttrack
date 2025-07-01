import React from 'react';
import { TimeScale, TimeRange } from './TimelineRenderer';
import styles from './TimelineControls.module.css';

interface TimelineControlsProps {
  timeScale: TimeScale;
  timeRange: TimeRange;
  onTimeScaleChange: (scale: TimeScale) => void;
  onTimeRangeChange: (range: TimeRange) => void;
  onZoomToday: () => void;
  onZoomWeek: () => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  timeScale,
  timeRange,
  onTimeScaleChange,
  onTimeRangeChange,
  onZoomToday,
  onZoomWeek,
}) => {
  const handlePrevious = () => {
    const duration = timeRange.end.getTime() - timeRange.start.getTime();
    const newStart = new Date(timeRange.start.getTime() - duration);
    const newEnd = new Date(timeRange.end.getTime() - duration);
    onTimeRangeChange({ start: newStart, end: newEnd });
  };

  const handleNext = () => {
    const duration = timeRange.end.getTime() - timeRange.start.getTime();
    const newStart = new Date(timeRange.start.getTime() + duration);
    const newEnd = new Date(timeRange.end.getTime() + duration);
    onTimeRangeChange({ start: newStart, end: newEnd });
  };

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: timeRange.start.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    };

    const startStr = timeRange.start.toLocaleDateString(undefined, options);
    const endStr = timeRange.end.toLocaleDateString(undefined, options);
    
    if (startStr === endStr) {
      return startStr;
    }
    
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className={styles.controls}>
      <div className={styles.navigation}>
        <button 
          onClick={handlePrevious}
          className={styles.navButton}
          title="Previous period"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <span className={styles.dateRange}>
          {formatDateRange()}
        </span>
        
        <button 
          onClick={handleNext}
          className={styles.navButton}
          title="Next period"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className={styles.scaleButtons}>
        <button
          onClick={() => onTimeScaleChange(TimeScale.HOUR)}
          className={`${styles.scaleButton} ${timeScale === TimeScale.HOUR ? styles.active : ''}`}
        >
          Hour
        </button>
        <button
          onClick={() => onTimeScaleChange(TimeScale.DAY)}
          className={`${styles.scaleButton} ${timeScale === TimeScale.DAY ? styles.active : ''}`}
        >
          Day
        </button>
        <button
          onClick={() => onTimeScaleChange(TimeScale.WEEK)}
          className={`${styles.scaleButton} ${timeScale === TimeScale.WEEK ? styles.active : ''}`}
        >
          Week
        </button>
        <button
          onClick={() => onTimeScaleChange(TimeScale.MONTH)}
          className={`${styles.scaleButton} ${timeScale === TimeScale.MONTH ? styles.active : ''}`}
        >
          Month
        </button>
      </div>

      <div className={styles.quickActions}>
        <button 
          onClick={onZoomToday}
          className={styles.quickButton}
          title="Jump to today"
        >
          Today
        </button>
        <button 
          onClick={onZoomWeek}
          className={styles.quickButton}
          title="View this week"
        >
          This Week
        </button>
      </div>

      <div className={styles.viewOptions}>
        <button className={styles.optionButton} title="Timeline settings">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M8 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM0 8a8 8 0 1116 0A8 8 0 010 8z" fill="currentColor"/>
            <path d="M6.5 8a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" fill="white"/>
          </svg>
        </button>
      </div>
    </div>
  );
};