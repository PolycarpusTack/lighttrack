import React from 'react';
import EditorTabs from '../components/common/EditorTabs';
import { Timeline as TimelineComponent } from '../components/timeline';
import styles from './Timeline.module.css';

const Timeline: React.FC = () => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', route: '/' },
    { id: 'timeline', label: 'Timeline', route: '/timeline', active: true },
    { id: 'analytics', label: 'Analytics', route: '/analytics' }
  ];

  return (
    <div className={styles.timelineContainer}>
      <EditorTabs tabs={tabs} />
      
      <div className={styles.timelineContent}>
        <TimelineComponent className={styles.timeline} />
      </div>
    </div>
  );
};

export default Timeline;