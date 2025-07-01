import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { formatDuration } from '@shared/utils/time';
import styles from './FloatingTimer.module.css';

const FloatingTimer: React.FC = () => {
  const { current } = useAppSelector(state => state.activities);
  const { floatingTimerVisible } = useAppSelector(state => state.ui);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (current && !current.isPaused) {
      interval = setInterval(() => {
        const elapsed = Date.now() - new Date(current.startTime).getTime() - current.pausedDuration;
        setDuration(elapsed);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [current]);

  if (!current || !floatingTimerVisible) {
    return null;
  }

  return (
    <div className={styles.floatingTimer}>
      <span className={styles.icon}>⏱️</span>
      <span className={styles.duration}>{formatDuration(duration, 'long')}</span>
      <span className={styles.activityName}>{current.name}</span>
    </div>
  );
};

export default FloatingTimer;