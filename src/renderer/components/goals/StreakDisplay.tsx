import React from 'react';
import { GoalProgress } from '@shared/types/goal';
import styles from './StreakDisplay.module.css';

interface StreakDisplayProps {
  progress: GoalProgress;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({
  progress,
  showDetails = true,
  size = 'medium'
}) => {
  const { streak, longestStreak, dailyProgress } = progress;

  const renderStreakIcons = () => {
    const recent = dailyProgress.slice(-7); // Last 7 days
    return (
      <div className={styles.streakIcons}>
        {recent.map((day, index) => (
          <div
            key={index}
            className={`${styles.dayIcon} ${day.achieved ? styles.achieved : styles.missed}`}
            title={`${new Date(day.date).toLocaleDateString()}: ${day.achieved ? 'Achieved' : 'Missed'}`}
          >
            {day.achieved ? '🔥' : '○'}
          </div>
        ))}
      </div>
    );
  };

  const getStreakMessage = () => {
    if (streak === 0) return 'Start your streak today!';
    if (streak === 1) return 'Great start! Keep it going.';
    if (streak < 7) return `${streak} days strong!`;
    if (streak < 30) return `Amazing ${streak}-day streak!`;
    if (streak < 100) return `Incredible ${streak}-day streak!`;
    return `Legendary ${streak}-day streak!`;
  };

  const getStreakColor = () => {
    if (streak === 0) return 'var(--text-muted)';
    if (streak < 7) return 'var(--color-warning)';
    if (streak < 30) return 'var(--accent-primary)';
    if (streak < 100) return 'var(--color-success)';
    return '#ff6b6b'; // Special color for 100+ streaks
  };

  return (
    <div className={`${styles.streakDisplay} ${styles[size]}`}>
      <div className={styles.streakHeader}>
        <div className={styles.streakCount} style={{ color: getStreakColor() }}>
          <span className={styles.flame}>🔥</span>
          <span className={styles.number}>{streak}</span>
          <span className={styles.label}>day streak</span>
        </div>
        
        {longestStreak > streak && (
          <div className={styles.record}>
            <span className={styles.recordLabel}>Record:</span>
            <span className={styles.recordValue}>{longestStreak}</span>
          </div>
        )}
      </div>

      {showDetails && (
        <>
          <div className={styles.streakMessage}>
            {getStreakMessage()}
          </div>

          {dailyProgress.length > 0 && (
            <div className={styles.weeklyProgress}>
              <div className={styles.weekLabel}>Last 7 days</div>
              {renderStreakIcons()}
            </div>
          )}

          <div className={styles.streakStats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Success Rate</span>
              <span className={styles.statValue}>
                {dailyProgress.length > 0 
                  ? Math.round((dailyProgress.filter(d => d.achieved).length / dailyProgress.length) * 100)
                  : 0
                }%
              </span>
            </div>
            
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total Days</span>
              <span className={styles.statValue}>{dailyProgress.length}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StreakDisplay;