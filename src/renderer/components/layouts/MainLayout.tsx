import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import ActivityBar from '../sidebar/ActivityBar';
import Sidebar from '../sidebar/Sidebar';
import TimerSidebar from '../sidebar/TimerSidebar';
import TitleBar from '../common/TitleBar';
import StatusBar from '../common/StatusBar';
import FloatingTimer from '../common/FloatingTimer';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState('timer');
  const location = useLocation();

  const handleActivitySelect = (activity: string) => {
    setSelectedActivity(activity);
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className={styles.appContainer}>
      <TitleBar />
      <div className={styles.mainContainer}>
        <ActivityBar 
          selectedActivity={selectedActivity}
          onActivitySelect={handleActivitySelect}
        />
        {selectedActivity === 'timer' ? (
          <TimerSidebar 
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebar}
          />
        ) : (
          <Sidebar 
            collapsed={sidebarCollapsed}
            selectedActivity={selectedActivity}
            onToggle={toggleSidebar}
          />
        )}
        <main className={styles.contentArea}>
          {children}
        </main>
      </div>
      <StatusBar />
      <FloatingTimer />
    </div>
  );
};

export default MainLayout;