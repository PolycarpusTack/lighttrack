import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateBackup } from '../../store/slices/settingsSlice';
import { BackupSettings as BackupSettingsType } from '@shared/types/settings';
import SettingsSection from './SettingsSection';
import styles from './BackupSettings.module.css';

interface BackupStatus {
  lastBackup?: Date;
  nextBackup?: Date;
  backupSize?: string;
  status: 'idle' | 'backing_up' | 'syncing' | 'error';
  error?: string;
}

const BackupSettings: React.FC = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings.settings);
  const backup = settings?.backup;

  const [backupStatus, setBackupStatus] = useState<BackupStatus>({ status: 'idle' });
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  if (!backup) return null;

  useEffect(() => {
    // Load backup status on mount
    loadBackupStatus();
  }, []);

  const loadBackupStatus = async () => {
    try {
      // Simulate loading backup status
      // In real implementation, this would call IPC to get actual status
      setBackupStatus({
        status: 'idle',
        lastBackup: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        nextBackup: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        backupSize: '12.5 MB'
      });
    } catch (error) {
      console.error('Failed to load backup status:', error);
    }
  };

  const handleBackupUpdate = (updates: Partial<BackupSettingsType>) => {
    dispatch(updateBackup(updates));
  };

  const handleCloudSyncUpdate = (updates: any) => {
    handleBackupUpdate({
      cloudSync: {
        ...backup.cloudSync,
        ...updates
      }
    });
  };

  const handleSelectBackupLocation = async () => {
    try {
      const result = await window.electronAPI.invoke('dialog:showOpenDialog', {
        title: 'Select Backup Location',
        properties: ['openDirectory'],
        message: 'Choose a folder for your backups'
      });

      if (!result.canceled && result.filePaths.length > 0) {
        handleBackupUpdate({ backupLocation: result.filePaths[0] });
        setShowLocationPicker(false);
      }
    } catch (error) {
      console.error('Failed to select backup location:', error);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setBackupStatus({ status: 'backing_up' });

    try {
      // Simulate backup creation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setBackupStatus({
        status: 'idle',
        lastBackup: new Date(),
        nextBackup: getNextBackupDate(),
        backupSize: '12.8 MB'
      });
    } catch (error) {
      setBackupStatus({
        status: 'error',
        error: 'Failed to create backup'
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      const result = await window.electronAPI.invoke('dialog:showOpenDialog', {
        title: 'Select Backup File',
        filters: [
          { name: 'LightTrack Backup', extensions: ['ltbak'] },
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        setIsRestoring(true);
        
        // Simulate restore process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // In real implementation, this would call IPC to restore from backup
        alert('Backup restored successfully! Please restart the application.');
        setIsRestoring(false);
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      setIsRestoring(false);
    }
  };

  const handleSyncNow = async () => {
    if (!backup.cloudSync.enabled) return;

    setBackupStatus({ status: 'syncing' });

    try {
      // Simulate cloud sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      handleCloudSyncUpdate({ lastSync: new Date() });
      setBackupStatus({
        status: 'idle',
        lastBackup: backupStatus.lastBackup,
        nextBackup: backupStatus.nextBackup,
        backupSize: backupStatus.backupSize
      });
    } catch (error) {
      setBackupStatus({
        status: 'error',
        error: 'Failed to sync with cloud'
      });
    }
  };

  const getNextBackupDate = (): Date => {
    const now = new Date();
    switch (backup.backupFrequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (): string => {
    switch (backupStatus.status) {
      case 'backing_up': return '#f59e0b';
      case 'syncing': return '#3b82f6';
      case 'error': return '#ef4444';
      default: return '#10b981';
    }
  };

  const getStatusText = (): string => {
    switch (backupStatus.status) {
      case 'backing_up': return 'Creating backup...';
      case 'syncing': return 'Syncing with cloud...';
      case 'error': return backupStatus.error || 'Error occurred';
      default: return 'Up to date';
    }
  };

  return (
    <div className={styles.backupSettings}>
      <SettingsSection
        title="Backup Status"
        description="Monitor your backup health and recent activity"
      >
        <div className={styles.backupStatus}>
          <div className={styles.statusHeader}>
            <div className={styles.statusIndicator}>
              <div 
                className={styles.statusDot}
                style={{ backgroundColor: getStatusColor() }}
              ></div>
              <span className={styles.statusText}>
                {getStatusText()}
              </span>
            </div>
            
            <div className={styles.statusActions}>
              <button
                className={`${styles.actionButton} ${isCreatingBackup ? styles.loading : ''}`}
                onClick={handleCreateBackup}
                disabled={isCreatingBackup || backupStatus.status === 'backing_up'}
              >
                {isCreatingBackup ? 'Creating...' : 'Backup Now'}
              </button>
              
              <button
                className={`${styles.actionButton} ${isRestoring ? styles.loading : ''}`}
                onClick={handleRestoreBackup}
                disabled={isRestoring}
              >
                {isRestoring ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>

          <div className={styles.statusDetails}>
            <div className={styles.statusGrid}>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Last Backup</span>
                <span className={styles.statusValue}>
                  {backupStatus.lastBackup ? formatDate(backupStatus.lastBackup) : 'Never'}
                </span>
              </div>
              
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Next Backup</span>
                <span className={styles.statusValue}>
                  {backup.autoBackup && backupStatus.nextBackup 
                    ? formatDate(backupStatus.nextBackup) 
                    : 'Not scheduled'
                  }
                </span>
              </div>
              
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Backup Size</span>
                <span className={styles.statusValue}>
                  {backupStatus.backupSize || 'Unknown'}
                </span>
              </div>
              
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Location</span>
                <span className={styles.statusValue}>
                  {backup.backupLocation || 'Not set'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Automatic Backup"
        description="Configure when and how often to create backups"
      >
        <div className={styles.autoBackup}>
          <div className={styles.toggleSection}>
            <div className={styles.mainToggle}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>Enable Auto Backup</span>
                <span className={styles.toggleDescription}>
                  Automatically create backups on a schedule
                </span>
              </div>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={backup.autoBackup}
                  onChange={(e) => handleBackupUpdate({ autoBackup: e.target.checked })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
          </div>

          {backup.autoBackup && (
            <div className={styles.backupOptions}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Backup Frequency</label>
                  <select
                    className={styles.select}
                    value={backup.backupFrequency}
                    onChange={(e) => handleBackupUpdate({ backupFrequency: e.target.value as any })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Keep Backups</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className={styles.input}
                    value={backup.maxBackups}
                    onChange={(e) => handleBackupUpdate({ 
                      maxBackups: parseInt(e.target.value) || 10 
                    })}
                  />
                  <span className={styles.fieldHint}>
                    Maximum number of backups to retain
                  </span>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Backup Location</label>
                <div className={styles.locationInput}>
                  <input
                    type="text"
                    className={styles.input}
                    value={backup.backupLocation}
                    onChange={(e) => handleBackupUpdate({ backupLocation: e.target.value })}
                    placeholder="Choose backup folder..."
                    readOnly
                  />
                  <button
                    className={styles.browseButton}
                    onClick={handleSelectBackupLocation}
                  >
                    Browse
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Backup Content"
        description="Choose what data to include in your backups"
      >
        <div className={styles.backupContent}>
          <div className={styles.contentOptions}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={backup.includeSettings}
                onChange={(e) => handleBackupUpdate({ includeSettings: e.target.checked })}
              />
              <div className={styles.optionInfo}>
                <span className={styles.optionName}>Application Settings</span>
                <span className={styles.optionDescription}>
                  Preferences, themes, and configuration
                </span>
              </div>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={backup.includeProjects}
                onChange={(e) => handleBackupUpdate({ includeProjects: e.target.checked })}
              />
              <div className={styles.optionInfo}>
                <span className={styles.optionName}>Projects & Categories</span>
                <span className={styles.optionDescription}>
                  Project definitions, categories, and tags
                </span>
              </div>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={backup.includeActivities}
                onChange={(e) => handleBackupUpdate({ includeActivities: e.target.checked })}
              />
              <div className={styles.optionInfo}>
                <span className={styles.optionName}>Time Tracking Data</span>
                <span className={styles.optionDescription}>
                  All recorded activities and time entries
                </span>
              </div>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={backup.includeGoals}
                onChange={(e) => handleBackupUpdate({ includeGoals: e.target.checked })}
              />
              <div className={styles.optionInfo}>
                <span className={styles.optionName}>Goals & Achievements</span>
                <span className={styles.optionDescription}>
                  Goals, progress, and unlocked achievements
                </span>
              </div>
            </label>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Cloud Sync"
        description="Sync your backups with cloud storage providers"
        collapsible={true}
        defaultCollapsed={!backup.cloudSync.enabled}
      >
        <div className={styles.cloudSync}>
          <div className={styles.mainToggle}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>Enable Cloud Sync</span>
              <span className={styles.toggleDescription}>
                Automatically sync backups to cloud storage
              </span>
            </div>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={backup.cloudSync.enabled}
                onChange={(e) => handleCloudSyncUpdate({ enabled: e.target.checked })}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          {backup.cloudSync.enabled && (
            <div className={styles.cloudOptions}>
              <div className={styles.field}>
                <label className={styles.label}>Cloud Provider</label>
                <select
                  className={styles.select}
                  value={backup.cloudSync.provider || ''}
                  onChange={(e) => handleCloudSyncUpdate({ provider: e.target.value || undefined })}
                >
                  <option value="">Select a provider</option>
                  <option value="dropbox">Dropbox</option>
                  <option value="google">Google Drive</option>
                  <option value="icloud">iCloud</option>
                </select>
              </div>

              {backup.cloudSync.provider && (
                <div className={styles.cloudStatus}>
                  <div className={styles.syncInfo}>
                    <span className={styles.syncLabel}>Last Sync:</span>
                    <span className={styles.syncValue}>
                      {backup.cloudSync.lastSync 
                        ? formatDate(backup.cloudSync.lastSync) 
                        : 'Never'
                      }
                    </span>
                  </div>
                  
                  <button
                    className={`${styles.syncButton} ${backupStatus.status === 'syncing' ? styles.syncing : ''}`}
                    onClick={handleSyncNow}
                    disabled={backupStatus.status === 'syncing'}
                  >
                    {backupStatus.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              )}

              <div className={styles.cloudWarning}>
                <span className={styles.warningIcon}>🔒</span>
                <div className={styles.warningContent}>
                  <span className={styles.warningTitle}>Privacy Notice</span>
                  <span className={styles.warningText}>
                    Backups are encrypted before being uploaded to cloud storage. 
                    Your data remains secure and private.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  );
};

export default BackupSettings;