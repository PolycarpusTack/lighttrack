import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './EditorTabs.module.css';

interface Tab {
  id: string;
  label: string;
  route?: string;
  active?: boolean;
}

interface EditorTabsProps {
  tabs: Tab[];
}

const EditorTabs: React.FC<EditorTabsProps> = ({ tabs }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabClick = (tab: Tab) => {
    if (tab.route) {
      navigate(tab.route);
    }
  };

  const isTabActive = (tab: Tab) => {
    if (tab.active !== undefined) return tab.active;
    if (tab.route) return location.pathname === tab.route;
    return false;
  };

  return (
    <div className={styles.editorTabs}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`${styles.tab} ${isTabActive(tab) ? styles.active : ''}`}
          onClick={() => handleTabClick(tab)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default EditorTabs;