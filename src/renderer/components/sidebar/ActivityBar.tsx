import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ActivityBar.module.css';

interface ActivityBarProps {
  selectedActivity: string;
  onActivitySelect: (activity: string) => void;
}

interface ActivityItem {
  id: string;
  title: string;
  icon: string;
  route?: string;
}

const activities: ActivityItem[] = [
  { id: 'timer', title: 'Timer', icon: '⏱️', route: '/' },
  { id: 'analytics', title: 'Analytics', icon: '📊', route: '/analytics' },
  { id: 'projects', title: 'Projects', icon: '📁', route: '/projects' },
  { id: 'goals', title: 'Goals', icon: '🎯', route: '/goals' },
  { id: 'settings', title: 'Settings', icon: '⚙️', route: '/settings' },
];

const ActivityBar: React.FC<ActivityBarProps> = ({ selectedActivity, onActivitySelect }) => {
  const navigate = useNavigate();

  const handleActivityClick = (activity: ActivityItem) => {
    onActivitySelect(activity.id);
    if (activity.route) {
      navigate(activity.route);
    }
  };

  return (
    <div className={styles.activityBar}>
      {activities.map((activity) => (
        <button
          key={activity.id}
          className={`${styles.activityIcon} ${selectedActivity === activity.id ? styles.active : ''}`}
          onClick={() => handleActivityClick(activity)}
          title={activity.title}
          aria-label={activity.title}
        >
          <span className={styles.icon}>{activity.icon}</span>
        </button>
      ))}
    </div>
  );
};

export default ActivityBar;