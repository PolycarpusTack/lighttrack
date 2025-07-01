import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { 
  fetchCurrentActivity,
  fetchTodayActivities,
  fetchWeekActivities,
  startActivity,
  stopActivity,
  pauseActivity,
  resumeActivity
} from '../../store/slices/activitySlice';
import {
  fetchTodayStats,
  fetchWeeklyStats
} from '../../store/slices/analyticsSlice';
import { Activity } from '@shared/types/activity';
import { formatDuration, formatTime } from '../../utils/timeFormatters';
import TodayView from './TodayView';
import WeekView from './WeekView';
import ReportsSection from './ReportsSection';
import styles from './TimerSidebar.module.css';

type SidebarView = 'today' | 'week' | 'reports';

interface TimerSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const TimerSidebar: React.FC<TimerSidebarProps> = ({ isCollapsed = false, onToggleCollapse }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [activeView, setActiveView] = useState<SidebarView>('today');
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const { 
    currentActivity, 
    todayActivities,
    weekActivities,
    isLoading 
  } = useSelector((state: RootState) => state.activities);
  
  const { 
    todayStats, 
    weeklyStats 
  } = useSelector((state: RootState) => state.analytics);

  // Update elapsed time for active timer
  useEffect(() => {
    if (!currentActivity || currentActivity.isPaused) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const start = new Date(currentActivity.startTime).getTime();
      const pausedDuration = currentActivity.pausedDuration || 0;
      setElapsedTime(now - start - pausedDuration);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentActivity]);

  // Load data on mount
  useEffect(() => {
    dispatch(fetchCurrentActivity());
    dispatch(fetchTodayActivities());
    dispatch(fetchWeekActivities());
    dispatch(fetchTodayStats());
    dispatch(fetchWeeklyStats());
  }, [dispatch]);

  const handleStartActivity = async (name: string, projectId: string) => {
    await dispatch(startActivity({ name, projectId }));
  };

  const handleStopActivity = async () => {
    if (currentActivity) {
      await dispatch(stopActivity(currentActivity.id));
    }
  };

  const handlePauseActivity = async () => {
    if (currentActivity && !currentActivity.isPaused) {
      await dispatch(pauseActivity(currentActivity.id));
    }
  };

  const handleResumeActivity = async () => {
    if (currentActivity && currentActivity.isPaused) {
      await dispatch(resumeActivity(currentActivity.id));
    }
  };

  const renderActiveTimer = () => {
    if (!currentActivity) return null;

    return (
      <div className={styles.activeTimer}>
        <div className={styles.timerHeader}>
          <h3>Active Timer</h3>
          <div className={styles.timerControls}>
            {currentActivity.isPaused ? (
              <button 
                className={styles.resumeBtn}
                onClick={handleResumeActivity}
                title="Resume"
              >
                ▶
              </button>
            ) : (
              <button 
                className={styles.pauseBtn}
                onClick={handlePauseActivity}
                title="Pause"
              >
                ⏸
              </button>
            )}
            <button 
              className={styles.stopBtn}
              onClick={handleStopActivity}
              title="Stop"
            >
              ⏹
            </button>
          </div>
        </div>
        
        <div className={styles.timerContent}>
          <div className={styles.activityName}>{currentActivity.name}</div>
          <div className={styles.projectName}>
            {currentActivity.projectId || 'No Project'}
          </div>
          <div className={`${styles.timerDisplay} ${currentActivity.isPaused ? styles.paused : ''}`}>
            {formatDuration(elapsedTime)}
          </div>
          {currentActivity.isPaused && (
            <div className={styles.pausedIndicator}>PAUSED</div>
          )}
        </div>
      </div>
    );
  };

  const renderViewSelector = () => (
    <div className={styles.viewSelector}>
      <button
        className={`${styles.viewBtn} ${activeView === 'today' ? styles.active : ''}`}
        onClick={() => setActiveView('today')}
      >
        Today
      </button>
      <button
        className={`${styles.viewBtn} ${activeView === 'week' ? styles.active : ''}`}
        onClick={() => setActiveView('week')}
      >
        This Week
      </button>
      <button
        className={`${styles.viewBtn} ${activeView === 'reports' ? styles.active : ''}`}
        onClick={() => setActiveView('reports')}
      >
        Reports
      </button>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'today':
        return (
          <TodayView
            activities={todayActivities}
            stats={todayStats}
            onStartActivity={handleStartActivity}
            isLoading={isLoading}
          />
        );
      case 'week':
        return (
          <WeekView
            activities={weekActivities}
            stats={weeklyStats}
            isLoading={isLoading}
          />
        );
      case 'reports':
        return <ReportsSection />;
      default:
        return null;
    }
  };

  if (isCollapsed) {
    return (
      <div className={`${styles.sidebar} ${styles.collapsed}`}>
        <button className={styles.expandBtn} onClick={onToggleCollapse}>
          ▶
        </button>
        {currentActivity && (
          <div className={styles.collapsedTimer}>
            <div className={styles.miniTimer}>
              {formatDuration(elapsedTime)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2>Timer & Tracker</h2>
        {onToggleCollapse && (
          <button className={styles.collapseBtn} onClick={onToggleCollapse}>
            ◀
          </button>
        )}
      </div>

      {renderActiveTimer()}
      {renderViewSelector()}
      
      <div className={styles.sidebarContent}>
        {renderContent()}
      </div>
    </div>
  );
};

export default TimerSidebar;