import React from 'react';
import styles from './SettingsSection.module.css';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  children,
  collapsible = false,
  defaultCollapsed = false
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  return (
    <div className={styles.settingsSection}>
      <div 
        className={`${styles.sectionHeader} ${collapsible ? styles.clickable : ''}`}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <div className={styles.headerContent}>
          <h3 className={styles.sectionTitle}>{title}</h3>
          {description && (
            <p className={styles.sectionDescription}>{description}</p>
          )}
        </div>
        {collapsible && (
          <button className={styles.collapseButton}>
            <span className={`${styles.collapseIcon} ${isCollapsed ? styles.collapsed : ''}`}>
              ▼
            </span>
          </button>
        )}
      </div>
      
      {(!collapsible || !isCollapsed) && (
        <div className={styles.sectionContent}>
          {children}
        </div>
      )}
    </div>
  );
};

export default SettingsSection;