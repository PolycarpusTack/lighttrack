import React from 'react';
import { useAppSelector } from '../../hooks/redux';
import styles from './StatusBar.module.css';

const StatusBar: React.FC = () => {
  const { current } = useAppSelector(state => state.activities);
  const { connectionStatus } = useAppSelector(state => state.app);

  return (
    <div className={styles.statusBar}>
      <div className={styles.statusItem}>
        <span className={styles.icon}>
          {current ? '🟢' : '⭕'}
        </span>
        <span>{current ? 'Tracking Active' : 'Not Tracking'}</span>
      </div>
      
      <div className={styles.statusItem}>
        <span className={styles.icon}>💾</span>
        <span>Auto-save enabled</span>
      </div>
      
      <div className={styles.statusItem}>
        <span className={styles.icon}>
          {connectionStatus === 'online' ? '🔌' : '📡'}
        </span>
        <span>
          {connectionStatus === 'online' ? 'Connected' : 'Offline'}
        </span>
      </div>
      
      <div className={styles.statusItem}>
        <span className={styles.icon}>⌨️</span>
        <span>Ctrl+Shift+P for commands</span>
      </div>
    </div>
  );
};

export default StatusBar;