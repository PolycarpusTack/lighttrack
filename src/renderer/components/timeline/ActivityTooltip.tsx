import React from 'react';
import { Activity } from '@shared/types/activity';
import styles from './ActivityTooltip.module.css';

interface ActivityTooltipProps {
  activity: Activity;
  position: { x: number; y: number };
}

export const ActivityTooltip: React.FC<ActivityTooltipProps> = ({ activity, position }) => {
  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const calculateDuration = (): number => {
    if (activity.endTime) {
      return new Date(activity.endTime).getTime() - new Date(activity.startTime).getTime();
    }
    return activity.duration || 0;
  };

  // Position tooltip to avoid going off screen
  const tooltipStyle: React.CSSProperties = {
    left: position.x + 10,
    top: position.y - 10,
    transform: position.x > window.innerWidth - 250 ? 'translateX(-100%)' : undefined,
  };

  return (
    <div className={styles.tooltip} style={tooltipStyle}>
      <div className={styles.header}>
        <h4 className={styles.activityName}>{activity.name}</h4>
        {activity.isPaused && (
          <span className={styles.pausedBadge}>Paused</span>
        )}
      </div>
      
      {activity.description && (
        <p className={styles.description}>{activity.description}</p>
      )}

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span className={styles.label}>Duration:</span>
          <span className={styles.value}>{formatDuration(calculateDuration())}</span>
        </div>
        
        <div className={styles.detailRow}>
          <span className={styles.label}>Start:</span>
          <span className={styles.value}>{formatTime(new Date(activity.startTime))}</span>
        </div>
        
        {activity.endTime && (
          <div className={styles.detailRow}>
            <span className={styles.label}>End:</span>
            <span className={styles.value}>{formatTime(new Date(activity.endTime))}</span>
          </div>
        )}

        {activity.applicationName && (
          <div className={styles.detailRow}>
            <span className={styles.label}>App:</span>
            <span className={styles.value}>{activity.applicationName}</span>
          </div>
        )}

        {activity.windowTitle && (
          <div className={styles.detailRow}>
            <span className={styles.label}>Window:</span>
            <span className={styles.value} title={activity.windowTitle}>
              {activity.windowTitle.length > 30 
                ? `${activity.windowTitle.substring(0, 30)}...` 
                : activity.windowTitle
              }
            </span>
          </div>
        )}

        {activity.tags.length > 0 && (
          <div className={styles.detailRow}>
            <span className={styles.label}>Tags:</span>
            <div className={styles.tags}>
              {activity.tags.map((tag, index) => (
                <span key={index} className={styles.tag}>{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {activity.isManualEntry && (
        <div className={styles.footer}>
          <span className={styles.manualBadge}>Manual Entry</span>
        </div>
      )}
    </div>
  );
};