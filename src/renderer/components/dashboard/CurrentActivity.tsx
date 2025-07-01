import React, { useEffect, useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { startActivity, stopActivity, pauseActivity, resumeActivity } from '../../store/slices/activitySlice';
import { formatDuration } from '@shared/utils/time';
import { Project } from '@shared/types/project';
import styles from './CurrentActivity.module.css';

const CurrentActivity: React.FC = () => {
  const dispatch = useAppDispatch();
  const { current } = useAppSelector(state => state.activities);
  const { projects } = useAppSelector(state => state.projects);
  const [duration, setDuration] = useState(0);
  const [activityName, setActivityName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('default');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (current && !current.isPaused) {
      const updateTimer = () => {
        const elapsed = Date.now() - new Date(current.startTime).getTime() - current.pausedDuration;
        setDuration(elapsed);
      };
      
      // Update immediately
      updateTimer();
      
      // Then update every 100ms for smooth display
      intervalRef.current = setInterval(updateTimer, 100);
    } else if (current && current.isPaused) {
      // Keep showing the paused duration
      const elapsed = new Date(current.pauseStartTime || Date.now()).getTime() - new Date(current.startTime).getTime() - current.pausedDuration;
      setDuration(elapsed);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [current]);

  const handleStartStop = () => {
    if (current) {
      dispatch(stopActivity(current.id));
      // Reset input fields
      setActivityName('');
      setSelectedProjectId('default');
    } else {
      dispatch(startActivity({ 
        name: activityName || 'Untitled Activity',
        projectId: selectedProjectId
      }));
    }
  };

  const handlePauseResume = () => {
    if (!current) return;
    
    if (current.isPaused) {
      dispatch(resumeActivity(current.id));
    } else {
      dispatch(pauseActivity(current.id));
    }
  };

  const currentProject = projects.find(p => p.id === (current?.projectId || selectedProjectId));

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !current && activityName.trim()) {
      handleStartStop();
    }
  };

  if (!current) {
    return (
      <div className={styles.currentActivity}>
        <div className={styles.activityHeader}>
          <h2 className={styles.activityTitle}>Start Tracking</h2>
        </div>
        
        <div className={styles.activityInput}>
          <input
            type="text"
            className={styles.activityNameInput}
            placeholder="What are you working on?"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            onKeyPress={handleKeyPress}
            autoFocus
          />
          <select
            className={styles.projectSelect}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <button 
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleStartStop}
          >
            <span className={styles.icon}>▶️</span>
            Start
          </button>
        </div>

        <div className={styles.noActivity}>
          <div className={styles.noActivityIcon}>⏱️</div>
          <div className={styles.noActivityText}>No activity in progress</div>
          <div className={styles.noActivityHint}>Enter a task name and press Enter or click Start</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.currentActivity}>
      <div className={styles.activityHeader}>
        <h2 className={styles.activityTitle}>Currently Tracking</h2>
        <div className={styles.controlButtons}>
          <button 
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={handlePauseResume}
            disabled={!current}
          >
            <span className={styles.icon}>
              {current.isPaused ? '▶️' : '⏸️'}
            </span>
            {current.isPaused ? 'Resume' : 'Pause'}
          </button>
          <button 
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleStartStop}
          >
            <span className={styles.icon}>⏹️</span>
            Stop
          </button>
        </div>
      </div>
      
      <div className={styles.activityTimer}>
        {formatDuration(duration, 'long')}
        {current.isPaused && <span className={styles.pausedIndicator}>(Paused)</span>}
      </div>
      
      <div className={styles.activityDetails}>
        <div className={styles.activityDetail}>
          <span className={styles.icon}>📝</span>
          <span>{current.name}</span>
        </div>
        <div className={styles.activityDetail}>
          <span className={styles.icon}>📁</span>
          <span className={styles.projectIndicator}>
            <span 
              className={styles.projectColor} 
              style={{ backgroundColor: currentProject?.color || '#00bcd4' }}
            />
            {currentProject?.name || 'Uncategorized'}
          </span>
        </div>
        {current.applicationName && (
          <div className={styles.activityDetail}>
            <span className={styles.icon}>💻</span>
            <span>{current.applicationName}</span>
          </div>
        )}
        {current.tags && current.tags.length > 0 && (
          <div className={styles.activityDetail}>
            <span className={styles.icon}>🏷️</span>
            <span>{current.tags.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentActivity;