import React, { useMemo } from 'react';
import styles from './ActivityHeatmap.module.css';

interface HeatmapCell {
  date: Date;
  value: number;
  level: 0 | 1 | 2 | 3 | 4;
  activities: number;
}

interface ActivityHeatmapData {
  projectId: string;
  heatmap: HeatmapCell[][];
  maxValue: number;
  totalDays: number;
}

interface ActivityHeatmapProps {
  data: ActivityHeatmapData;
  onCellClick?: (cell: HeatmapCell) => void;
  showMonthLabels?: boolean;
  showDayLabels?: boolean;
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ 
  data, 
  onCellClick,
  showMonthLabels = true,
  showDayLabels = true
}) => {
  const monthLabels = useMemo(() => {
    const labels: { month: string; col: number }[] = [];
    let lastMonth = -1;

    data.heatmap.forEach((week, weekIndex) => {
      week.forEach((cell) => {
        if (cell.date.getTime() > 0) {
          const month = cell.date.getMonth();
          if (month !== lastMonth) {
            labels.push({
              month: cell.date.toLocaleDateString('en-US', { month: 'short' }),
              col: weekIndex
            });
            lastMonth = month;
          }
        }
      });
    });

    return labels;
  }, [data.heatmap]);

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getCellColor = (level: number): string => {
    const colors = [
      '#ebedf0', // 0 - No activity
      '#c6e48b', // 1 - Light activity
      '#7bc96f', // 2 - Moderate activity
      '#239a3b', // 3 - High activity
      '#196127'  // 4 - Very high activity
    ];
    return colors[level] || colors[0];
  };

  const formatTooltip = (cell: HeatmapCell): string => {
    if (cell.date.getTime() === 0) return '';
    
    const dateStr = cell.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (cell.value === 0) {
      return `${dateStr}\nNo activity`;
    }

    const hours = Math.floor(cell.value / 60);
    const minutes = cell.value % 60;
    const timeStr = hours > 0 
      ? `${hours}h ${minutes}m` 
      : `${minutes}m`;

    return `${dateStr}\n${timeStr} tracked\n${cell.activities} ${cell.activities === 1 ? 'activity' : 'activities'}`;
  };

  const handleCellClick = (cell: HeatmapCell) => {
    if (onCellClick && cell.date.getTime() > 0) {
      onCellClick(cell);
    }
  };

  return (
    <div className={styles.heatmapContainer}>
      {showMonthLabels && (
        <div className={styles.monthLabels}>
          {monthLabels.map((label, index) => (
            <div
              key={index}
              className={styles.monthLabel}
              style={{ left: `${label.col * 13}px` }}
            >
              {label.month}
            </div>
          ))}
        </div>
      )}

      <div className={styles.heatmapWrapper}>
        {showDayLabels && (
          <div className={styles.dayLabels}>
            {dayLabels.map((day, index) => (
              <div key={index} className={styles.dayLabel}>
                {index % 2 === 1 ? day[0] : ''}
              </div>
            ))}
          </div>
        )}

        <div className={styles.heatmapGrid}>
          {data.heatmap.map((week, weekIndex) => (
            <div key={weekIndex} className={styles.weekColumn}>
              {week.map((cell, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`${styles.cell} ${
                    cell.date.getTime() > 0 ? styles.validCell : styles.emptyCell
                  }`}
                  style={{
                    backgroundColor: cell.date.getTime() > 0 
                      ? getCellColor(cell.level) 
                      : 'transparent'
                  }}
                  title={formatTooltip(cell)}
                  onClick={() => handleCellClick(cell)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total days:</span>
          <span className={styles.statValue}>{data.totalDays}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Active days:</span>
          <span className={styles.statValue}>
            {data.heatmap.flat().filter(cell => cell.value > 0).length}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Longest streak:</span>
          <span className={styles.statValue}>{calculateLongestStreak(data.heatmap)}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Current streak:</span>
          <span className={styles.statValue}>{calculateCurrentStreak(data.heatmap)}</span>
        </div>
      </div>
    </div>
  );
};

const calculateLongestStreak = (heatmap: HeatmapCell[][]): number => {
  let longestStreak = 0;
  let currentStreak = 0;

  const cells = heatmap.flat().filter(cell => cell.date.getTime() > 0);
  
  cells.forEach((cell) => {
    if (cell.value > 0) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  return longestStreak;
};

const calculateCurrentStreak = (heatmap: HeatmapCell[][]): number => {
  const cells = heatmap.flat().filter(cell => cell.date.getTime() > 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let currentStreak = 0;
  
  // Start from the most recent day and work backwards
  for (let i = cells.length - 1; i >= 0; i--) {
    const cell = cells[i];
    const cellDate = new Date(cell.date);
    cellDate.setHours(0, 0, 0, 0);
    
    // Skip future dates
    if (cellDate > today) continue;
    
    // If this is today or yesterday with activity, count it
    const dayDiff = Math.floor((today.getTime() - cellDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dayDiff === currentStreak && cell.value > 0) {
      currentStreak++;
    } else if (cell.value === 0 || dayDiff > currentStreak) {
      break;
    }
  }

  return currentStreak;
};

export default ActivityHeatmap;