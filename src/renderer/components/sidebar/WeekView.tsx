import React, { useMemo } from 'react';
import { Activity } from '@shared/types/activity';
import { WeeklyStats } from '../../store/slices/analyticsSlice';
import { formatDuration } from '../../utils/timeFormatters';
import styles from './WeekView.module.css';

interface WeekViewProps {
  activities: Activity[];
  stats: WeeklyStats | null;
  isLoading: boolean;
}

interface DayData {
  date: Date;
  dayName: string;
  totalTime: number;
  activityCount: number;
  productivityScore: number;
  isToday: boolean;
}

const WeekView: React.FC<WeekViewProps> = ({ activities, stats, isLoading }) => {
  // Generate week calendar data
  const weekCalendar = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    
    const days: DayData[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      
      const dayActivities = activities.filter(activity => {
        const activityDate = new Date(activity.startTime);
        return activityDate.toDateString() === date.toDateString();
      });
      
      const totalTime = dayActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
      
      // Find matching daily stats if available
      const dayStats = stats?.dailyStats.find(ds => 
        new Date(ds.date).toDateString() === date.toDateString()
      );
      
      days.push({
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        totalTime,
        activityCount: dayActivities.length,
        productivityScore: dayStats?.productivityScore || 0,
        isToday: date.toDateString() === today.toDateString()
      });
    }
    
    return days;
  }, [activities, stats]);

  // Calculate week comparisons
  const weekComparison = useMemo(() => {
    if (!stats) {
      return {
        totalTime: 0,
        avgDaily: 0,
        mostProductiveDay: null,
        leastProductiveDay: null,
        weeklyGoalProgress: 0,
        vsLastWeek: 0
      };
    }

    const avgDaily = stats.totalTime / 7;
    const sortedDays = [...weekCalendar].sort((a, b) => b.totalTime - a.totalTime);
    
    return {
      totalTime: stats.totalTime,
      avgDaily,
      mostProductiveDay: sortedDays[0],
      leastProductiveDay: sortedDays[sortedDays.length - 1],
      weeklyGoalProgress: stats.weeklyGoalProgress || 0,
      vsLastWeek: stats.trends?.timeChange || 0
    };
  }, [stats, weekCalendar]);

  // Get max time for scaling the bar chart
  const maxDayTime = Math.max(...weekCalendar.map(d => d.totalTime), 1);

  const renderWeekCalendar = () => (
    <div className={styles.weekCalendar}>
      <h3>Week Calendar</h3>
      <div className={styles.calendarGrid}>
        {weekCalendar.map((day, index) => (
          <div 
            key={index} 
            className={`${styles.calendarDay} ${day.isToday ? styles.today : ''}`}
          >
            <div className={styles.dayHeader}>
              <span className={styles.dayName}>{day.dayName}</span>
              <span className={styles.dayDate}>{day.date.getDate()}</span>
            </div>
            <div 
              className={styles.dayActivity}
              style={{ 
                backgroundColor: getActivityColor(day.totalTime),
                opacity: day.totalTime > 0 ? 0.8 : 0.1
              }}
            >
              {day.totalTime > 0 && (
                <div className={styles.dayTime}>
                  {formatDuration(day.totalTime, true)}
                </div>
              )}
            </div>
            <div className={styles.dayStats}>
              <span>{day.activityCount} activities</span>
              {day.productivityScore > 0 && (
                <span className={styles.productivityBadge}>
                  {day.productivityScore}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDailyTotals = () => (
    <div className={styles.dailyTotals}>
      <h3>Daily Totals</h3>
      <div className={styles.barChart}>
        {weekCalendar.map((day, index) => (
          <div key={index} className={styles.barContainer}>
            <div className={styles.barWrapper}>
              <div 
                className={`${styles.bar} ${day.isToday ? styles.todayBar : ''}`}
                style={{ 
                  height: `${(day.totalTime / maxDayTime) * 100}%`,
                  backgroundColor: getBarColor(day.totalTime)
                }}
              >
                {day.totalTime > 0 && (
                  <div className={styles.barValue}>
                    {formatDuration(day.totalTime, true)}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.barLabel}>{day.dayName}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderWeekGoals = () => (
    <div className={styles.weekGoals}>
      <h3>Week Goals</h3>
      <div className={styles.goalItem}>
        <div className={styles.goalHeader}>
          <span className={styles.goalLabel}>Weekly Target (40h)</span>
          <span className={styles.goalValue}>
            {weekComparison.weeklyGoalProgress}%
          </span>
        </div>
        <div className={styles.goalProgress}>
          <div 
            className={styles.goalBar}
            style={{ 
              width: `${Math.min(weekComparison.weeklyGoalProgress, 100)}%`,
              backgroundColor: weekComparison.weeklyGoalProgress >= 100 ? '#4BC0C0' : '#36A2EB'
            }}
          />
        </div>
      </div>
      
      {stats && (
        <>
          <div className={styles.goalStats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Average Daily</span>
              <span className={styles.statValue}>
                {formatDuration(weekComparison.avgDaily)}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Consistency</span>
              <span className={styles.statValue}>
                {stats.consistencyScore}%
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderComparison = () => (
    <div className={styles.comparison}>
      <h3>Week Comparison</h3>
      <div className={styles.comparisonGrid}>
        <div className={styles.comparisonItem}>
          <div className={styles.comparisonLabel}>Total Time</div>
          <div className={styles.comparisonValue}>
            {formatDuration(weekComparison.totalTime)}
          </div>
          {weekComparison.vsLastWeek !== 0 && (
            <div className={`${styles.comparisonChange} ${
              weekComparison.vsLastWeek > 0 ? styles.positive : styles.negative
            }`}>
              {weekComparison.vsLastWeek > 0 ? '↑' : '↓'} 
              {Math.abs(weekComparison.vsLastWeek)}%
            </div>
          )}
        </div>
        
        {weekComparison.mostProductiveDay && (
          <div className={styles.comparisonItem}>
            <div className={styles.comparisonLabel}>Most Productive</div>
            <div className={styles.comparisonValue}>
              {weekComparison.mostProductiveDay.dayName}
            </div>
            <div className={styles.comparisonDetail}>
              {formatDuration(weekComparison.mostProductiveDay.totalTime)}
            </div>
          </div>
        )}
        
        {stats && (
          <>
            <div className={styles.comparisonItem}>
              <div className={styles.comparisonLabel}>Avg Productivity</div>
              <div className={styles.comparisonValue}>
                {Math.round(stats.averageProductivity)}%
              </div>
            </div>
            <div className={styles.comparisonItem}>
              <div className={styles.comparisonLabel}>Avg Focus</div>
              <div className={styles.comparisonValue}>
                {Math.round(stats.averageFocus)}%
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className={styles.weekView}>
        <div className={styles.loading}>Loading week data...</div>
      </div>
    );
  }

  return (
    <div className={styles.weekView}>
      {renderWeekCalendar()}
      {renderDailyTotals()}
      {renderWeekGoals()}
      {renderComparison()}
    </div>
  );
};

const getActivityColor = (time: number): string => {
  const hours = time / (1000 * 60 * 60);
  if (hours === 0) return '#E0E0E0';
  if (hours < 2) return '#FFE0B2';
  if (hours < 4) return '#FFCC80';
  if (hours < 6) return '#FFB74D';
  if (hours < 8) return '#FFA726';
  return '#FF9800';
};

const getBarColor = (time: number): string => {
  const hours = time / (1000 * 60 * 60);
  if (hours >= 8) return '#4BC0C0';
  if (hours >= 6) return '#36A2EB';
  if (hours >= 4) return '#9966FF';
  if (hours >= 2) return '#FFCE56';
  return '#FF6384';
};

export default WeekView;