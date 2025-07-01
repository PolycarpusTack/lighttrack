import React, { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTodayActivities, updateTodayTotal } from '../store/slices/activitySlice';
import { fetchProjects } from '../store/slices/projectSlice';
import { openModal } from '../store/slices/uiSlice';
import CurrentActivity from '../components/dashboard/CurrentActivity';
import QuickStats from '../components/dashboard/QuickStats';
import ActivityList from '../components/dashboard/ActivityList';
import EditorTabs from '../components/common/EditorTabs';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { todayActivities, isLoading, current } = useAppSelector(state => state.activities);
  const { projects } = useAppSelector(state => state.projects);
  
  // Calculate today's total from activities
  const todayTotal = useMemo(() => {
    let total = todayActivities.reduce((sum, activity) => {
      return sum + (activity.duration || 0);
    }, 0);

    // Add current activity duration if tracking
    if (current && !current.isPaused) {
      const currentDuration = Date.now() - new Date(current.startTime).getTime() - current.pausedDuration;
      total += currentDuration;
    }

    return total;
  }, [todayActivities, current]);

  // Calculate additional stats
  const stats = useMemo(() => {
    const uniqueProjects = new Set(todayActivities.map(a => a.projectId));
    const breakActivities = todayActivities.filter(a => 
      a.tags?.includes('break') || a.name?.toLowerCase().includes('break')
    );
    
    // Calculate productivity score
    const focusedTime = todayActivities
      .filter(a => !a.tags?.includes('break') && !a.tags?.includes('meeting'))
      .reduce((sum, a) => sum + (a.duration || 0), 0);
    
    const productivityScore = todayTotal > 0 ? Math.round((focusedTime / todayTotal) * 100) : 0;

    return {
      projectCount: uniqueProjects.size,
      breakCount: breakActivities.length,
      productivityScore
    };
  }, [todayActivities, todayTotal]);

  useEffect(() => {
    // Fetch initial data
    dispatch(fetchTodayActivities());
    dispatch(fetchProjects());
  }, [dispatch]);

  useEffect(() => {
    // Update today's total in store
    dispatch(updateTodayTotal(todayTotal));
  }, [dispatch, todayTotal]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', route: '/', active: true },
    { id: 'timeline', label: 'Timeline', route: '/timeline' },
    { id: 'analytics', label: 'Analytics', route: '/analytics' }
  ];

  const handleAddManualEntry = () => {
    dispatch(openModal({
      type: 'manualEntry',
      data: {}
    }));
  };

  return (
    <div className={styles.dashboardContainer}>
      <EditorTabs tabs={tabs} />
      
      <div className={styles.dashboardContent}>
        <CurrentActivity />
        
        <QuickStats 
          todayTotal={todayTotal}
          projectCount={stats.projectCount}
          productivityScore={stats.productivityScore}
          breakCount={stats.breakCount}
        />
        
        <div className={styles.activitiesSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Today's Activities</h3>
            <button 
              className={styles.btnSecondary}
              onClick={handleAddManualEntry}
            >
              <span className={styles.icon}>➕</span>
              Add Manual Entry
            </button>
          </div>
          
          <ActivityList 
            activities={todayActivities}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;