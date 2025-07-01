import React from 'react';
import styles from './TitleBar.module.css';

const TitleBar: React.FC = () => {
  return (
    <div className={styles.titleBar}>
      <div className={styles.windowControls}>
        <div className={styles.appTitle}>LightTrack</div>
      </div>
      <div className={styles.dragRegion}></div>
      <div className={styles.windowActions}>
        <button className={styles.windowButton} title="Minimize">
          <span>–</span>
        </button>
        <button className={styles.windowButton} title="Maximize">
          <span>⬜</span>
        </button>
        <button className={styles.windowButton} title="Close">
          <span>✕</span>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;