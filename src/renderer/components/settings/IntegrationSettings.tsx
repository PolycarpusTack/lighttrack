import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateIntegrations } from '../../store/slices/settingsSlice';
import { IntegrationSettings as IntegrationSettingsType } from '@shared/types/settings';
import SettingsSection from './SettingsSection';
import styles from './IntegrationSettings.module.css';

const IntegrationSettings: React.FC = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings.settings);
  const integrations = settings?.integrations;

  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [connectionResults, setConnectionResults] = useState<Record<string, { success: boolean; message: string }>>({});

  if (!integrations) return null;

  const handleIntegrationUpdate = (updates: Partial<IntegrationSettingsType>) => {
    dispatch(updateIntegrations({
      ...integrations,
      ...updates
    }));
  };

  const handleJiraUpdate = (updates: any) => {
    handleIntegrationUpdate({
      jira: {
        ...integrations.jira,
        ...updates
      }
    });
  };

  const handleGithubUpdate = (updates: any) => {
    handleIntegrationUpdate({
      github: {
        ...integrations.github,
        ...updates
      }
    });
  };

  const handleCalendarUpdate = (updates: any) => {
    handleIntegrationUpdate({
      calendar: {
        ...integrations.calendar,
        ...updates
      }
    });
  };

  const testConnection = async (integration: string) => {
    setTestingConnection(integration);
    
    try {
      // Simulate API testing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock test results
      const success = Math.random() > 0.3; // 70% success rate for demo
      setConnectionResults(prev => ({
        ...prev,
        [integration]: {
          success,
          message: success 
            ? 'Connection successful!' 
            : 'Failed to connect. Please check your credentials.'
        }
      }));
    } catch (error) {
      setConnectionResults(prev => ({
        ...prev,
        [integration]: {
          success: false,
          message: 'Connection test failed.'
        }
      }));
    } finally {
      setTestingConnection(null);
      
      // Clear result after 5 seconds
      setTimeout(() => {
        setConnectionResults(prev => {
          const newResults = { ...prev };
          delete newResults[integration];
          return newResults;
        });
      }, 5000);
    }
  };

  const getConnectionStatusIcon = (integration: string) => {
    if (testingConnection === integration) return '⏳';
    const result = connectionResults[integration];
    if (result) return result.success ? '✅' : '❌';
    return '🔗';
  };

  return (
    <div className={styles.integrationSettings}>
      <SettingsSection
        title="Third-Party Integrations"
        description="Connect LightTrack with your favorite productivity tools"
      >
        <div className={styles.integrationsOverview}>
          <div className={styles.overviewGrid}>
            <div className={styles.overviewCard}>
              <div className={styles.cardIcon}>🔧</div>
              <div className={styles.cardContent}>
                <span className={styles.cardTitle}>3 Integrations</span>
                <span className={styles.cardDescription}>Available to connect</span>
              </div>
            </div>
            
            <div className={styles.overviewCard}>
              <div className={styles.cardIcon}>🔌</div>
              <div className={styles.cardContent}>
                <span className={styles.cardTitle}>
                  {Object.values(integrations).filter(integration => integration?.enabled).length} Active
                </span>
                <span className={styles.cardDescription}>Currently connected</span>
              </div>
            </div>
            
            <div className={styles.overviewCard}>
              <div className={styles.cardIcon}>🔒</div>
              <div className={styles.cardContent}>
                <span className={styles.cardTitle}>Secure</span>
                <span className={styles.cardDescription}>Encrypted connections</span>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Jira Integration"
        description="Connect with Atlassian Jira to sync tasks and track work items"
        collapsible={true}
        defaultCollapsed={!integrations.jira?.enabled}
      >
        <div className={styles.integration}>
          <div className={styles.integrationHeader}>
            <div className={styles.integrationInfo}>
              <div className={styles.integrationLogo}>
                <span className={styles.logoIcon}>🏃‍♂️</span>
              </div>
              <div className={styles.integrationDetails}>
                <h4 className={styles.integrationTitle}>Atlassian Jira</h4>
                <p className={styles.integrationDescription}>
                  Sync issues, track progress, and create time entries from Jira tickets
                </p>
              </div>
            </div>
            
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={integrations.jira?.enabled || false}
                onChange={(e) => handleJiraUpdate({ enabled: e.target.checked })}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          {integrations.jira?.enabled && (
            <div className={styles.integrationConfig}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Jira URL</label>
                  <input
                    type="url"
                    className={styles.input}
                    value={integrations.jira?.apiUrl || ''}
                    onChange={(e) => handleJiraUpdate({ apiUrl: e.target.value })}
                    placeholder="https://yourcompany.atlassian.net"
                  />
                </div>
                
                <div className={styles.field}>
                  <label className={styles.label}>Username/Email</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={integrations.jira?.username || ''}
                    onChange={(e) => handleJiraUpdate({ username: e.target.value })}
                    placeholder="your.email@company.com"
                  />
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>API Token</label>
                  <input
                    type="password"
                    className={styles.input}
                    value={integrations.jira?.apiToken || ''}
                    onChange={(e) => handleJiraUpdate({ apiToken: e.target.value })}
                    placeholder="Enter your Jira API token"
                  />
                  <span className={styles.fieldHint}>
                    <a href="https://id.atlassian.com/manage/api-tokens" target="_blank" rel="noopener noreferrer">
                      Create an API token
                    </a>
                  </span>
                </div>
                
                <div className={styles.field}>
                  <label className={styles.label}>Sync Interval (minutes)</label>
                  <select
                    className={styles.select}
                    value={integrations.jira?.syncInterval || 15}
                    onChange={(e) => handleJiraUpdate({ syncInterval: parseInt(e.target.value) })}
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>
              </div>

              <div className={styles.connectionTest}>
                <button
                  className={`${styles.testButton} ${testingConnection === 'jira' ? styles.testing : ''}`}
                  onClick={() => testConnection('jira')}
                  disabled={testingConnection === 'jira' || !integrations.jira?.apiUrl || !integrations.jira?.username}
                >
                  {getConnectionStatusIcon('jira')} {testingConnection === 'jira' ? 'Testing...' : 'Test Connection'}
                </button>
                
                {connectionResults.jira && (
                  <span className={`${styles.testResult} ${connectionResults.jira.success ? styles.success : styles.error}`}>
                    {connectionResults.jira.message}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="GitHub Integration"
        description="Connect with GitHub to track commits and link repositories to projects"
        collapsible={true}
        defaultCollapsed={!integrations.github?.enabled}
      >
        <div className={styles.integration}>
          <div className={styles.integrationHeader}>
            <div className={styles.integrationInfo}>
              <div className={styles.integrationLogo}>
                <span className={styles.logoIcon}>🐙</span>
              </div>
              <div className={styles.integrationDetails}>
                <h4 className={styles.integrationTitle}>GitHub</h4>
                <p className={styles.integrationDescription}>
                  Track commits, link repositories to projects, and monitor development activity
                </p>
              </div>
            </div>
            
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={integrations.github?.enabled || false}
                onChange={(e) => handleGithubUpdate({ enabled: e.target.checked })}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          {integrations.github?.enabled && (
            <div className={styles.integrationConfig}>
              <div className={styles.field}>
                <label className={styles.label}>Access Token</label>
                <input
                  type="password"
                  className={styles.input}
                  value={integrations.github?.accessToken || ''}
                  onChange={(e) => handleGithubUpdate({ accessToken: e.target.value })}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                />
                <span className={styles.fieldHint}>
                  <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">
                    Generate a personal access token
                  </a> with repo permissions
                </span>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Repositories to Sync</label>
                <div className={styles.repoList}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="owner/repository-name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = e.currentTarget.value.trim();
                        if (value && !integrations.github?.syncRepos?.includes(value)) {
                          handleGithubUpdate({
                            syncRepos: [...(integrations.github?.syncRepos || []), value]
                          });
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                  
                  {integrations.github?.syncRepos && integrations.github.syncRepos.length > 0 && (
                    <div className={styles.repoTags}>
                      {integrations.github.syncRepos.map((repo, index) => (
                        <div key={index} className={styles.repoTag}>
                          <span>{repo}</span>
                          <button
                            className={styles.removeRepo}
                            onClick={() => {
                              const newRepos = integrations.github?.syncRepos?.filter((_, i) => i !== index) || [];
                              handleGithubUpdate({ syncRepos: newRepos });
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className={styles.fieldHint}>
                  Press Enter to add repositories (format: owner/repository)
                </span>
              </div>

              <div className={styles.connectionTest}>
                <button
                  className={`${styles.testButton} ${testingConnection === 'github' ? styles.testing : ''}`}
                  onClick={() => testConnection('github')}
                  disabled={testingConnection === 'github' || !integrations.github?.accessToken}
                >
                  {getConnectionStatusIcon('github')} {testingConnection === 'github' ? 'Testing...' : 'Test Connection'}
                </button>
                
                {connectionResults.github && (
                  <span className={`${styles.testResult} ${connectionResults.github.success ? styles.success : styles.error}`}>
                    {connectionResults.github.message}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Calendar Integration"
        description="Sync with your calendar to automatically track meetings and events"
        collapsible={true}
        defaultCollapsed={!integrations.calendar?.enabled}
      >
        <div className={styles.integration}>
          <div className={styles.integrationHeader}>
            <div className={styles.integrationInfo}>
              <div className={styles.integrationLogo}>
                <span className={styles.logoIcon}>📅</span>
              </div>
              <div className={styles.integrationDetails}>
                <h4 className={styles.integrationTitle}>Calendar Sync</h4>
                <p className={styles.integrationDescription}>
                  Automatically track time spent in meetings and calendar events
                </p>
              </div>
            </div>
            
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={integrations.calendar?.enabled || false}
                onChange={(e) => handleCalendarUpdate({ enabled: e.target.checked })}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          {integrations.calendar?.enabled && (
            <div className={styles.integrationConfig}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Calendar Provider</label>
                  <select
                    className={styles.select}
                    value={integrations.calendar?.provider || 'google'}
                    onChange={(e) => handleCalendarUpdate({ provider: e.target.value as any })}
                  >
                    <option value="google">Google Calendar</option>
                    <option value="outlook">Microsoft Outlook</option>
                    <option value="ical">iCal (CalDAV)</option>
                  </select>
                </div>
                
                {integrations.calendar?.provider === 'ical' && (
                  <div className={styles.field}>
                    <label className={styles.label}>Calendar URL</label>
                    <input
                      type="url"
                      className={styles.input}
                      value={integrations.calendar?.syncUrl || ''}
                      onChange={(e) => handleCalendarUpdate({ syncUrl: e.target.value })}
                      placeholder="https://calendar.server.com/path/to/calendar.ics"
                    />
                  </div>
                )}
              </div>

              {integrations.calendar?.provider !== 'ical' && (
                <div className={styles.oauthInfo}>
                  <div className={styles.oauthStatus}>
                    <span className={styles.statusIcon}>🔐</span>
                    <div className={styles.statusContent}>
                      <span className={styles.statusTitle}>OAuth Authentication Required</span>
                      <span className={styles.statusDescription}>
                        Click "Connect" to securely authenticate with {integrations.calendar.provider === 'google' ? 'Google' : 'Microsoft'}
                      </span>
                    </div>
                    <button className={styles.connectButton}>
                      Connect to {integrations.calendar.provider === 'google' ? 'Google' : 'Microsoft'}
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.connectionTest}>
                <button
                  className={`${styles.testButton} ${testingConnection === 'calendar' ? styles.testing : ''}`}
                  onClick={() => testConnection('calendar')}
                  disabled={testingConnection === 'calendar' || (integrations.calendar?.provider === 'ical' && !integrations.calendar?.syncUrl)}
                >
                  {getConnectionStatusIcon('calendar')} {testingConnection === 'calendar' ? 'Testing...' : 'Test Connection'}
                </button>
                
                {connectionResults.calendar && (
                  <span className={`${styles.testResult} ${connectionResults.calendar.success ? styles.success : styles.error}`}>
                    {connectionResults.calendar.message}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Integration Tips"
        description="Get the most out of your integrations"
        collapsible={true}
        defaultCollapsed={true}
      >
        <div className={styles.integrationTips}>
          <div className={styles.tip}>
            <span className={styles.tipIcon}>💡</span>
            <div className={styles.tipContent}>
              <h4 className={styles.tipTitle}>Automatic Time Tracking</h4>
              <p className={styles.tipDescription}>
                When calendar integration is enabled, LightTrack will automatically create time entries for your meetings and events.
              </p>
            </div>
          </div>

          <div className={styles.tip}>
            <span className={styles.tipIcon}>🔄</span>
            <div className={styles.tipContent}>
              <h4 className={styles.tipTitle}>Two-Way Sync</h4>
              <p className={styles.tipDescription}>
                Jira integration allows you to create time logs in Jira when you track time on associated issues in LightTrack.
              </p>
            </div>
          </div>

          <div className={styles.tip}>
            <span className={styles.tipIcon}>📊</span>
            <div className={styles.tipContent}>
              <h4 className={styles.tipTitle}>Enhanced Analytics</h4>
              <p className={styles.tipDescription}>
                GitHub integration provides detailed insights into your development patterns and coding time distribution.
              </p>
            </div>
          </div>

          <div className={styles.tip}>
            <span className={styles.tipIcon}>🔒</span>
            <div className={styles.tipContent}>
              <h4 className={styles.tipTitle}>Security & Privacy</h4>
              <p className={styles.tipDescription}>
                All integration credentials are encrypted and stored securely. You can revoke access at any time.
              </p>
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};

export default IntegrationSettings;