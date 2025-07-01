import React from 'react';
import { useAppSelector } from '../../hooks/redux';
import styles from './Sidebar.module.css';

interface SidebarProps {
  collapsed: boolean;
  selectedActivity: string;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, selectedActivity, onToggle }) => {
  const { projects } = useAppSelector(state => state.projects);
  const { current } = useAppSelector(state => state.activities);

  const getSidebarContent = () => {
    switch (selectedActivity) {
      case 'timer':
        return {
          header: 'TRACKER',
          items: [
            { icon: '📅', label: 'Today', active: true },
            { icon: '📆', label: 'This Week' },
            { icon: '📊', label: 'Reports' },
            { icon: '🏷️', label: 'Categories' }
          ],
          sections: [
            {
              header: 'PROJECTS',
              items: projects.slice(0, 5).map(project => ({
                icon: '💼',
                label: project.name,
                color: project.color
              }))
            }
          ]
        };
      
      case 'analytics':
        return {
          header: 'ANALYTICS',
          items: [
            { icon: '📊', label: 'Overview', active: true },
            { icon: '📈', label: 'Productivity' },
            { icon: '⏱️', label: 'Time Distribution' },
            { icon: '📅', label: 'Daily Patterns' }
          ],
          sections: [
            {
              header: 'REPORTS',
              items: [
                { icon: '📄', label: 'Weekly Summary' },
                { icon: '📄', label: 'Monthly Report' },
                { icon: '📤', label: 'Export Data' }
              ]
            }
          ]
        };
      
      case 'projects':
        return {
          header: 'PROJECTS',
          items: [
            { icon: '💼', label: 'All Projects', active: true },
            { icon: '⭐', label: 'Favorites' },
            { icon: '🕒', label: 'Recent' }
          ],
          sections: [
            {
              header: 'ACTIVE PROJECTS',
              items: projects.filter(p => !p.isArchived).map(project => ({
                icon: '💻',
                label: project.name,
                color: project.color
              }))
            }
          ]
        };
      
      case 'goals':
        return {
          header: 'GOALS',
          items: [
            { icon: '🎯', label: 'Daily Goals', active: true },
            { icon: '📅', label: 'Weekly Targets' },
            { icon: '📊', label: 'Progress Tracking' }
          ],
          sections: [
            {
              header: 'CURRENT GOALS',
              items: [
                { icon: '✅', label: '6h Daily Productive Time' },
                { icon: '⏱️', label: 'Reduce Meeting Time' },
                { icon: '🚀', label: 'Complete Sprint Tasks' }
              ]
            }
          ]
        };
      
      case 'settings':
        return {
          header: 'SETTINGS',
          items: [
            { icon: '👤', label: 'Profile', active: true },
            { icon: '🔔', label: 'Notifications' },
            { icon: '🎨', label: 'Appearance' },
            { icon: '⌨️', label: 'Keyboard Shortcuts' }
          ],
          sections: [
            {
              header: 'INTEGRATIONS',
              items: [
                { icon: '🔌', label: 'JIRA' },
                { icon: '🔌', label: 'GitHub' },
                { icon: '🔌', label: 'Calendar Sync' }
              ]
            }
          ]
        };
      
      default:
        return {
          header: 'MENU',
          items: [],
          sections: []
        };
    }
  };

  const content = getSidebarContent();

  if (collapsed) {
    return null;
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <span>{content.header}</span>
        <button className={styles.collapseButton} onClick={onToggle}>
          ◀
        </button>
      </div>
      
      <div className={styles.sidebarContent}>
        {content.items.map((item, index) => (
          <div 
            key={index}
            className={`${styles.treeItem} ${item.active ? styles.active : ''}`}
          >
            <span className={styles.treeIcon}>{item.icon}</span>
            <span className={styles.treeLabel}>{item.label}</span>
            {item.color && (
              <span 
                className={styles.colorDot}
                style={{ backgroundColor: item.color }}
              />
            )}
          </div>
        ))}
        
        {content.sections?.map((section, sectionIndex) => (
          <div key={sectionIndex} className={styles.section}>
            <div className={styles.sectionHeader}>{section.header}</div>
            {section.items.map((item, itemIndex) => (
              <div key={itemIndex} className={styles.treeItem}>
                <span className={styles.treeIcon}>{item.icon}</span>
                <span className={styles.treeLabel}>{item.label}</span>
                {item.color && (
                  <span 
                    className={styles.colorDot}
                    style={{ backgroundColor: item.color }}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;