import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { 
  fetchSettings, 
  updateSettings, 
  resetSettings,
  exportSettings,
  importSettings,
  selectHasUnsavedChanges,
  selectLastSaved 
} from '../../store/slices/settingsSlice';
import ProfileSettings from './ProfileSettings';
import NotificationSettings from './NotificationSettings';
import AppearanceSettings from './AppearanceSettings';
import KeyboardShortcuts from './KeyboardShortcuts';
import PrivacySettings from './PrivacySettings';
import BackupSettings from './BackupSettings';
import IntegrationSettings from './IntegrationSettings';
import styles from './SettingsPage.module.css';

type SettingSection = 'profile' | 'appearance' | 'notifications' | 'shortcuts' | 'privacy' | 'backup' | 'integrations';

const SettingsPage: React.FC = () => {
  const dispatch = useDispatch();
  const { settings, isLoading, error } = useSelector((state: RootState) => state.settings);
  const hasUnsavedChanges = useSelector(selectHasUnsavedChanges);
  const lastSaved = useSelector(selectLastSaved);
  
  const [activeSection, setActiveSection] = useState<SettingSection>('profile');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    // Load settings on mount
    dispatch(fetchSettings());
  }, [dispatch]);

  const settingSections = [
    { id: 'profile', label: 'Profile', icon: '👤', description: 'Personal information and work schedule' },
    { id: 'appearance', label: 'Appearance', icon: '🎨', description: 'Theme, colors, and layout' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', description: 'Alerts, reminders, and integrations' },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: '⌨️', description: 'Customize keyboard shortcuts' },
    { id: 'privacy', label: 'Privacy', icon: '🔒', description: 'Data collection and sharing' },
    { id: 'backup', label: 'Backup & Sync', icon: '☁️', description: 'Data backup and cloud sync' },
    { id: 'integrations', label: 'Integrations', icon: '🔗', description: 'Third-party app connections' },
  ];

  const filteredSections = settingSections.filter(section =>
    section.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveChanges = async () => {
    if (settings && hasUnsavedChanges) {
      try {
        await dispatch(updateSettings(settings)).unwrap();
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    }
  };

  const handleResetSettings = async () => {
    try {
      await dispatch(resetSettings()).unwrap();
      setShowResetConfirm(false);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  };

  const handleExportSettings = async () => {
    try {
      const result = await window.electronAPI.invoke('dialog:showSaveDialog', {
        title: 'Export Settings',
        defaultPath: 'lighttrack-settings.json',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        await dispatch(exportSettings(result.filePath)).unwrap();
      }
    } catch (error) {
      console.error('Failed to export settings:', error);
    }
  };

  const handleImportSettings = async () => {
    try {
      const result = await window.electronAPI.invoke('dialog:showOpenDialog', {
        title: 'Import Settings',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        await dispatch(importSettings(result.filePaths[0])).unwrap();
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
    }
  };

  const renderActiveSection = () => {
    if (!settings) return null;

    switch (activeSection) {
      case 'profile':
        return <ProfileSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'shortcuts':
        return <KeyboardShortcuts />;
      case 'privacy':
        return <PrivacySettings />;
      case 'backup':
        return <BackupSettings />;
      case 'integrations':
        return <IntegrationSettings />;
      default:
        return null;
    }
  };

  if (isLoading && !settings) {
    return (
      <div className={styles.loading}>
        <span className={styles.loadingIcon}>⚙️</span>
        <span>Loading settings...</span>
      </div>
    );
  }

  return (
    <div className={styles.settingsPage}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.pageTitle}>⚙️ Settings</h1>
          <p className={styles.pageSubtitle}>
            Customize your LightTrack experience
          </p>
        </div>

        <div className={styles.headerActions}>
          {hasUnsavedChanges && (
            <button
              className={styles.saveButton}
              onClick={handleSaveChanges}
              disabled={isLoading}
            >
              Save Changes
            </button>
          )}
          
          <div className={styles.actionDropdown}>
            <button className={styles.dropdownToggle}>
              Actions ▼
            </button>
            <div className={styles.dropdownMenu}>
              <button onClick={handleExportSettings}>
                📤 Export Settings
              </button>
              <button onClick={handleImportSettings}>
                📥 Import Settings
              </button>
              <div className={styles.separator} />
              <button 
                onClick={() => setShowResetConfirm(true)}
                className={styles.dangerAction}
              >
                🔄 Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      {(hasUnsavedChanges || lastSaved) && (
        <div className={styles.statusBar}>
          {hasUnsavedChanges && (
            <span className={styles.unsavedIndicator}>
              ⚠️ You have unsaved changes
            </span>
          )}
          {lastSaved && (
            <span className={styles.lastSaved}>
              Last saved: {new Date(lastSaved).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className={styles.error}>
          <span className={styles.errorIcon}>❌</span>
          <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <div className={styles.searchSection}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Sidebar */}
        <div className={styles.sidebar}>
          <nav className={styles.settingsNav}>
            {filteredSections.map((section) => (
              <button
                key={section.id}
                className={`${styles.navItem} ${activeSection === section.id ? styles.active : ''}`}
                onClick={() => setActiveSection(section.id as SettingSection)}
              >
                <div className={styles.navItemContent}>
                  <span className={styles.navIcon}>{section.icon}</span>
                  <div className={styles.navText}>
                    <span className={styles.navLabel}>{section.label}</span>
                    <span className={styles.navDescription}>{section.description}</span>
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className={styles.contentArea}>
          <div className={styles.settingsContent}>
            {renderActiveSection()}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.modalHeader}>
              <h3>Reset Settings</h3>
            </div>
            <div className={styles.modalBody}>
              <p>
                Are you sure you want to reset all settings to their default values? 
                This action cannot be undone.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleResetSettings}
              >
                Reset Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;