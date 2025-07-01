import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updatePrivacy } from '../../store/slices/settingsSlice';
import { PrivacySettings as PrivacySettingsType } from '@shared/types/settings';
import SettingsSection from './SettingsSection';
import styles from './PrivacySettings.module.css';

const PrivacySettings: React.FC = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings.settings);
  const privacy = settings?.privacy;

  if (!privacy) return null;

  const handlePrivacyUpdate = (updates: Partial<PrivacySettingsType>) => {
    dispatch(updatePrivacy({
      ...privacy,
      ...updates
    }));
  };

  const privacyOptions = [
    {
      key: 'collectAnalytics',
      title: 'Analytics Collection',
      description: 'Allow anonymous analytics to help improve the application',
      details: 'Collects anonymized usage patterns and feature preferences to guide development. No personal data is included.',
      checked: privacy.collectAnalytics,
      category: 'data-collection'
    },
    {
      key: 'shareData',
      title: 'Data Sharing',
      description: 'Share anonymized data with third-party services for insights',
      details: 'Enables sharing of aggregated, anonymized metrics with trusted analytics providers for better insights.',
      checked: privacy.shareData,
      category: 'data-collection'
    },
    {
      key: 'usageStatistics',
      title: 'Usage Statistics',
      description: 'Collect usage statistics to improve performance and features',
      details: 'Tracks feature usage frequency and performance metrics to optimize the application experience.',
      checked: privacy.usageStatistics,
      category: 'data-collection'
    },
    {
      key: 'crashReporting',
      title: 'Crash Reporting',
      description: 'Automatically send crash reports to help fix bugs',
      details: 'Sends technical details about application crashes to help identify and fix issues quickly.',
      checked: privacy.crashReporting,
      category: 'diagnostics'
    },
    {
      key: 'localOnly',
      title: 'Local Data Only',
      description: 'Keep all data stored locally on your device',
      details: 'Prevents any data from being transmitted to external servers. All processing happens locally.',
      checked: privacy.localOnly,
      category: 'storage'
    },
    {
      key: 'encryptData',
      title: 'Data Encryption',
      description: 'Encrypt sensitive data stored on your device',
      details: 'Uses AES-256 encryption to secure your personal data and activity records.',
      checked: privacy.encryptData,
      category: 'security'
    }
  ];

  const dataCollectionOptions = privacyOptions.filter(option => option.category === 'data-collection');
  const diagnosticsOptions = privacyOptions.filter(option => option.category === 'diagnostics');
  const storageOptions = privacyOptions.filter(option => option.category === 'storage');
  const securityOptions = privacyOptions.filter(option => option.category === 'security');

  const renderPrivacyOption = (option: typeof privacyOptions[0]) => (
    <div key={option.key} className={styles.privacyOption}>
      <label className={styles.optionLabel}>
        <div className={styles.optionToggle}>
          <input
            type="checkbox"
            checked={option.checked}
            onChange={(e) => handlePrivacyUpdate({ [option.key]: e.target.checked })}
          />
          <span className={styles.toggleSlider}></span>
        </div>
        <div className={styles.optionContent}>
          <div className={styles.optionTitle}>{option.title}</div>
          <div className={styles.optionDescription}>{option.description}</div>
          <div className={styles.optionDetails}>{option.details}</div>
        </div>
      </label>
    </div>
  );

  const getPrivacyScore = (): { score: number; level: string; color: string } => {
    const enabledOptions = privacyOptions.filter(option => option.checked).length;
    const totalOptions = privacyOptions.length;
    const score = Math.round((enabledOptions / totalOptions) * 100);

    if (score <= 30) return { score, level: 'High Privacy', color: '#10b981' };
    if (score <= 60) return { score, level: 'Balanced', color: '#f59e0b' };
    return { score, level: 'Enhanced Features', color: '#ef4444' };
  };

  const privacyScore = getPrivacyScore();

  return (
    <div className={styles.privacySettings}>
      <SettingsSection
        title="Privacy Overview"
        description="Control how your data is collected, stored, and used"
      >
        <div className={styles.privacyOverview}>
          <div className={styles.privacyScore}>
            <div className={styles.scoreIndicator}>
              <div 
                className={styles.scoreRing}
                style={{ '--score-color': privacyScore.color } as React.CSSProperties}
              >
                <div className={styles.scoreValue}>
                  {privacyScore.score}%
                </div>
              </div>
            </div>
            <div className={styles.scoreInfo}>
              <div className={styles.scoreLabel}>Privacy Level</div>
              <div 
                className={styles.scoreLevel}
                style={{ color: privacyScore.color }}
              >
                {privacyScore.level}
              </div>
              <div className={styles.scoreDescription}>
                {privacyScore.score <= 30 
                  ? 'Maximum privacy protection with minimal data collection'
                  : privacyScore.score <= 60
                  ? 'Balanced approach between privacy and functionality'
                  : 'Enhanced features with comprehensive data collection'
                }
              </div>
            </div>
          </div>

          <div className={styles.privacyHighlights}>
            <div className={styles.highlight}>
              <span className={styles.highlightIcon}>🔒</span>
              <div className={styles.highlightContent}>
                <span className={styles.highlightTitle}>Always Encrypted</span>
                <span className={styles.highlightText}>Local data encryption is always enabled</span>
              </div>
            </div>
            
            <div className={styles.highlight}>
              <span className={styles.highlightIcon}>🔐</span>
              <div className={styles.highlightContent}>
                <span className={styles.highlightTitle}>No Personal Data</span>
                <span className={styles.highlightText}>Analytics never include personal information</span>
              </div>
            </div>
            
            <div className={styles.highlight}>
              <span className={styles.highlightIcon}>🏠</span>
              <div className={styles.highlightContent}>
                <span className={styles.highlightTitle}>Your Choice</span>
                <span className={styles.highlightText}>Full control over what data leaves your device</span>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Data Collection"
        description="Control what data is collected to improve the application"
      >
        <div className={styles.privacyGroup}>
          {dataCollectionOptions.map(renderPrivacyOption)}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Diagnostics & Support"
        description="Help us identify and fix issues in the application"
      >
        <div className={styles.privacyGroup}>
          {diagnosticsOptions.map(renderPrivacyOption)}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Data Storage"
        description="Choose how and where your data is stored"
      >
        <div className={styles.privacyGroup}>
          {storageOptions.map(renderPrivacyOption)}
          
          {privacy.localOnly && (
            <div className={styles.localOnlyWarning}>
              <span className={styles.warningIcon}>ℹ️</span>
              <div className={styles.warningContent}>
                <span className={styles.warningTitle}>Local Only Mode Active</span>
                <span className={styles.warningText}>
                  With local-only mode enabled, cloud sync and backup features will be disabled. 
                  Your data will only be stored on this device.
                </span>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Security"
        description="Additional security measures for your data"
      >
        <div className={styles.privacyGroup}>
          {securityOptions.map(renderPrivacyOption)}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Data Management"
        description="Manage your existing data and privacy preferences"
        collapsible={true}
        defaultCollapsed={true}
      >
        <div className={styles.dataManagement}>
          <div className={styles.managementOption}>
            <div className={styles.managementInfo}>
              <span className={styles.managementTitle}>Export My Data</span>
              <span className={styles.managementDescription}>
                Download all your data in a portable format
              </span>
            </div>
            <button className={styles.managementButton}>
              Export Data
            </button>
          </div>

          <div className={styles.managementOption}>
            <div className={styles.managementInfo}>
              <span className={styles.managementTitle}>Clear Analytics Data</span>
              <span className={styles.managementDescription}>
                Remove all collected analytics and usage data
              </span>
            </div>
            <button className={`${styles.managementButton} ${styles.destructive}`}>
              Clear Data
            </button>
          </div>

          <div className={styles.managementOption}>
            <div className={styles.managementInfo}>
              <span className={styles.managementTitle}>Reset Privacy Settings</span>
              <span className={styles.managementDescription}>
                Reset all privacy settings to their default values
              </span>
            </div>
            <button className={`${styles.managementButton} ${styles.destructive}`}>
              Reset Settings
            </button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Privacy Policy"
        description="Learn more about how we handle your data"
        collapsible={true}
        defaultCollapsed={true}
      >
        <div className={styles.privacyPolicy}>
          <div className={styles.policySection}>
            <h4 className={styles.policyTitle}>Data We Collect</h4>
            <ul className={styles.policyList}>
              <li>Application usage patterns and feature interactions</li>
              <li>Performance metrics and crash reports (if enabled)</li>
              <li>Anonymous device and system information</li>
              <li>User preferences and settings (never synchronized without permission)</li>
            </ul>
          </div>

          <div className={styles.policySection}>
            <h4 className={styles.policyTitle}>How We Use Your Data</h4>
            <ul className={styles.policyList}>
              <li>Improve application performance and stability</li>
              <li>Develop new features based on usage patterns</li>
              <li>Fix bugs and resolve technical issues</li>
              <li>Provide better user experience</li>
            </ul>
          </div>

          <div className={styles.policySection}>
            <h4 className={styles.policyTitle}>Data Protection</h4>
            <ul className={styles.policyList}>
              <li>All data is encrypted in transit and at rest</li>
              <li>No personally identifiable information is collected</li>
              <li>Data is never sold or shared with third parties</li>
              <li>You can delete your data at any time</li>
            </ul>
          </div>

          <div className={styles.policyLinks}>
            <a href="#" className={styles.policyLink}>Full Privacy Policy</a>
            <a href="#" className={styles.policyLink}>Terms of Service</a>
            <a href="#" className={styles.policyLink}>Contact Privacy Team</a>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};

export default PrivacySettings;