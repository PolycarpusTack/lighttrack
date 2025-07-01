import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateNotifications } from '../../store/slices/settingsSlice';
import { NotificationSettings as NotificationSettingsType } from '@shared/types/settings';
import SettingsSection from './SettingsSection';
import styles from './NotificationSettings.module.css';

const NotificationSettings: React.FC = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings.settings);
  const notifications = settings?.notifications;

  const [testNotification, setTestNotification] = useState<string | null>(null);

  if (!notifications) return null;

  const handleNotificationUpdate = (updates: Partial<NotificationSettingsType>) => {
    dispatch(updateNotifications({
      ...notifications,
      ...updates
    }));
  };

  const handleRemindersUpdate = (updates: any) => {
    handleNotificationUpdate({
      reminders: {
        ...notifications.reminders,
        ...updates
      }
    });
  };

  const handleGoalsUpdate = (updates: any) => {
    handleNotificationUpdate({
      goals: {
        ...notifications.goals,
        ...updates
      }
    });
  };

  const handleSoundUpdate = (updates: any) => {
    handleNotificationUpdate({
      sound: {
        ...notifications.sound,
        ...updates
      }
    });
  };

  const handleSlackUpdate = (updates: any) => {
    handleNotificationUpdate({
      integrations: {
        ...notifications.integrations,
        slack: {
          ...notifications.integrations.slack,
          ...updates
        }
      }
    });
  };

  const handleEmailUpdate = (updates: any) => {
    handleNotificationUpdate({
      integrations: {
        ...notifications.integrations,
        email: {
          ...notifications.integrations.email,
          ...updates
        }
      }
    });
  };

  const handleDesktopUpdate = (updates: any) => {
    handleNotificationUpdate({
      integrations: {
        ...notifications.integrations,
        desktop: {
          ...notifications.integrations.desktop,
          ...updates
        }
      }
    });
  };

  const handleTestNotification = async (type: string) => {
    setTestNotification(type);
    
    // Simulate sending test notification
    try {
      switch (type) {
        case 'desktop':
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification('LightTrack Test', {
                body: 'This is a test desktop notification',
                icon: '/icon.png'
              });
            } else if (Notification.permission !== 'denied') {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                new Notification('LightTrack Test', {
                  body: 'This is a test desktop notification',
                  icon: '/icon.png'
                });
              }
            }
          }
          break;
        case 'sound':
          // Play test sound
          const audio = new Audio('/notification.mp3');
          audio.volume = notifications.sound.volume;
          audio.play().catch(() => {
            console.log('Could not play test sound');
          });
          break;
        default:
          console.log(`Test ${type} notification`);
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
    
    setTimeout(() => setTestNotification(null), 2000);
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className={styles.notificationSettings}>
      <SettingsSection
        title="Reminder Settings"
        description="Control when and how you receive productivity reminders"
      >
        <div className={styles.reminderSettings}>
          <div className={styles.toggleSection}>
            <div className={styles.mainToggle}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>Enable Reminders</span>
                <span className={styles.toggleDescription}>
                  Receive notifications when idle for too long
                </span>
              </div>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={notifications.reminders.enabled}
                  onChange={(e) => handleRemindersUpdate({ enabled: e.target.checked })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
          </div>

          {notifications.reminders.enabled && (
            <div className={styles.reminderOptions}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Idle Time (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    className={styles.input}
                    value={notifications.reminders.idleTime}
                    onChange={(e) => handleRemindersUpdate({ 
                      idleTime: parseInt(e.target.value) || 15 
                    })}
                  />
                  <span className={styles.fieldHint}>
                    Show reminder after this many minutes of inactivity
                  </span>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Frequency</label>
                  <select
                    className={styles.select}
                    value={notifications.reminders.frequency}
                    onChange={(e) => handleRemindersUpdate({ frequency: e.target.value as any })}
                  >
                    <option value="once">Show once</option>
                    <option value="repeat">Repeat every interval</option>
                  </select>
                </div>
              </div>

              <div className={styles.quietHours}>
                <div className={styles.quietHoursToggle}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={notifications.reminders.quietHours.enabled}
                      onChange={(e) => handleRemindersUpdate({
                        quietHours: {
                          ...notifications.reminders.quietHours,
                          enabled: e.target.checked
                        }
                      })}
                    />
                    <span>Enable quiet hours</span>
                  </label>
                </div>

                {notifications.reminders.quietHours.enabled && (
                  <div className={styles.timeRange}>
                    <div className={styles.field}>
                      <label className={styles.label}>Start</label>
                      <input
                        type="time"
                        className={styles.input}
                        value={notifications.reminders.quietHours.start}
                        onChange={(e) => handleRemindersUpdate({
                          quietHours: {
                            ...notifications.reminders.quietHours,
                            start: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>End</label>
                      <input
                        type="time"
                        className={styles.input}
                        value={notifications.reminders.quietHours.end}
                        onChange={(e) => handleRemindersUpdate({
                          quietHours: {
                            ...notifications.reminders.quietHours,
                            end: e.target.value
                          }
                        })}
                      />
                    </div>
                  </div>
                )}

                {notifications.reminders.quietHours.enabled && (
                  <div className={styles.quietHoursPreview}>
                    <span className={styles.previewLabel}>Quiet hours:</span>
                    <span className={styles.previewTime}>
                      {formatTime(notifications.reminders.quietHours.start)} - {formatTime(notifications.reminders.quietHours.end)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Goal Notifications"
        description="Stay motivated with goal progress and achievement notifications"
      >
        <div className={styles.goalNotifications}>
          <div className={styles.notificationOptions}>
            <div className={styles.optionGroup}>
              <h4 className={styles.subheading}>Progress Updates</h4>
              <div className={styles.checkboxList}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={notifications.goals.dailyProgress}
                    onChange={(e) => handleGoalsUpdate({ dailyProgress: e.target.checked })}
                  />
                  <span>Daily progress summaries</span>
                </label>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={notifications.goals.weeklyReport}
                    onChange={(e) => handleGoalsUpdate({ weeklyReport: e.target.checked })}
                  />
                  <span>Weekly goal reports</span>
                </label>
              </div>
            </div>

            <div className={styles.optionGroup}>
              <h4 className={styles.subheading}>Achievements</h4>
              <div className={styles.checkboxList}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={notifications.goals.achievements}
                    onChange={(e) => handleGoalsUpdate({ achievements: e.target.checked })}
                  />
                  <span>Achievement unlocked notifications</span>
                </label>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={notifications.goals.streakMilestones}
                    onChange={(e) => handleGoalsUpdate({ streakMilestones: e.target.checked })}
                  />
                  <span>Streak milestone celebrations</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Sound Settings"
        description="Configure audio feedback for notifications and events"
      >
        <div className={styles.soundSettings}>
          <div className={styles.soundControls}>
            <div className={styles.mainToggle}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>Enable Sounds</span>
                <span className={styles.toggleDescription}>
                  Play audio cues for notifications and events
                </span>
              </div>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={notifications.sound.enabled}
                  onChange={(e) => handleSoundUpdate({ enabled: e.target.checked })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>

            {notifications.sound.enabled && (
              <div className={styles.soundOptions}>
                <div className={styles.volumeControl}>
                  <label className={styles.label}>Volume</label>
                  <div className={styles.volumeSlider}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      className={styles.slider}
                      value={notifications.sound.volume}
                      onChange={(e) => handleSoundUpdate({ volume: parseFloat(e.target.value) })}
                    />
                    <span className={styles.volumeValue}>
                      {Math.round(notifications.sound.volume * 100)}%
                    </span>
                  </div>
                </div>

                <div className={styles.soundTypes}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={notifications.sound.notifications}
                      onChange={(e) => handleSoundUpdate({ notifications: e.target.checked })}
                    />
                    <span>Notification sounds</span>
                  </label>

                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={notifications.sound.achievements}
                      onChange={(e) => handleSoundUpdate({ achievements: e.target.checked })}
                    />
                    <span>Achievement sounds</span>
                  </label>
                </div>

                <button
                  className={`${styles.testButton} ${testNotification === 'sound' ? styles.testing : ''}`}
                  onClick={() => handleTestNotification('sound')}
                  disabled={testNotification === 'sound'}
                >
                  {testNotification === 'sound' ? 'Playing...' : 'Test Sound'}
                </button>
              </div>
            )}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Desktop Notifications"
        description="Configure native desktop notification behavior"
      >
        <div className={styles.desktopSettings}>
          <div className={styles.mainToggle}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>Desktop Notifications</span>
              <span className={styles.toggleDescription}>
                Show native desktop notifications
              </span>
            </div>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={notifications.integrations.desktop.enabled}
                onChange={(e) => handleDesktopUpdate({ enabled: e.target.checked })}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          {notifications.integrations.desktop.enabled && (
            <div className={styles.desktopOptions}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Position</label>
                  <select
                    className={styles.select}
                    value={notifications.integrations.desktop.position}
                    onChange={(e) => handleDesktopUpdate({ position: e.target.value })}
                  >
                    <option value="topRight">Top Right</option>
                    <option value="topLeft">Top Left</option>
                    <option value="bottomRight">Bottom Right</option>
                    <option value="bottomLeft">Bottom Left</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Duration (seconds)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    className={styles.input}
                    value={notifications.integrations.desktop.duration}
                    onChange={(e) => handleDesktopUpdate({ 
                      duration: parseInt(e.target.value) || 5 
                    })}
                  />
                </div>
              </div>

              <div className={styles.desktopTypes}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={notifications.integrations.desktop.showProgress}
                    onChange={(e) => handleDesktopUpdate({ showProgress: e.target.checked })}
                  />
                  <span>Show progress updates</span>
                </label>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={notifications.integrations.desktop.showAchievements}
                    onChange={(e) => handleDesktopUpdate({ showAchievements: e.target.checked })}
                  />
                  <span>Show achievement notifications</span>
                </label>
              </div>

              <button
                className={`${styles.testButton} ${testNotification === 'desktop' ? styles.testing : ''}`}
                onClick={() => handleTestNotification('desktop')}
                disabled={testNotification === 'desktop'}
              >
                {testNotification === 'desktop' ? 'Sending...' : 'Test Desktop Notification'}
              </button>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Email Notifications"
        description="Receive periodic reports and updates via email"
        collapsible={true}
        defaultCollapsed={!notifications.integrations.email.enabled}
      >
        <div className={styles.emailSettings}>
          <div className={styles.mainToggle}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>Email Notifications</span>
              <span className={styles.toggleDescription}>
                Send reports and achievements to your email
              </span>
            </div>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={notifications.integrations.email.enabled}
                onChange={(e) => handleEmailUpdate({ enabled: e.target.checked })}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          {notifications.integrations.email.enabled && (
            <div className={styles.emailOptions}>
              <div className={styles.field}>
                <label className={styles.label}>Email Address</label>
                <input
                  type="email"
                  className={styles.input}
                  value={notifications.integrations.email.address || ''}
                  onChange={(e) => handleEmailUpdate({ address: e.target.value })}
                  placeholder="your.email@example.com"
                />
              </div>

              <div className={styles.emailTypes}>
                <h4 className={styles.subheading}>Report Types</h4>
                <div className={styles.checkboxList}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={notifications.integrations.email.weeklyReport}
                      onChange={(e) => handleEmailUpdate({ weeklyReport: e.target.checked })}
                    />
                    <span>Weekly productivity reports</span>
                  </label>

                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={notifications.integrations.email.monthlyReport}
                      onChange={(e) => handleEmailUpdate({ monthlyReport: e.target.checked })}
                    />
                    <span>Monthly summary reports</span>
                  </label>

                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={notifications.integrations.email.achievements}
                      onChange={(e) => handleEmailUpdate({ achievements: e.target.checked })}
                    />
                    <span>Achievement highlights</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Slack Integration"
        description="Share progress updates with your Slack workspace"
        collapsible={true}
        defaultCollapsed={!notifications.integrations.slack.enabled}
      >
        <div className={styles.slackSettings}>
          <div className={styles.mainToggle}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>Slack Notifications</span>
              <span className={styles.toggleDescription}>
                Post updates to your Slack channels
              </span>
            </div>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={notifications.integrations.slack.enabled}
                onChange={(e) => handleSlackUpdate({ enabled: e.target.checked })}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          {notifications.integrations.slack.enabled && (
            <div className={styles.slackOptions}>
              <div className={styles.field}>
                <label className={styles.label}>Webhook URL</label>
                <input
                  type="url"
                  className={styles.input}
                  value={notifications.integrations.slack.webhookUrl || ''}
                  onChange={(e) => handleSlackUpdate({ webhookUrl: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                />
                <span className={styles.fieldHint}>
                  <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer">
                    How to create a Slack webhook
                  </a>
                </span>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Channel</label>
                <input
                  type="text"
                  className={styles.input}
                  value={notifications.integrations.slack.channel || ''}
                  onChange={(e) => handleSlackUpdate({ channel: e.target.value })}
                  placeholder="#productivity"
                />
              </div>

              <div className={styles.slackTypes}>
                <h4 className={styles.subheading}>Update Types</h4>
                <div className={styles.checkboxList}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={notifications.integrations.slack.dailyReport}
                      onChange={(e) => handleSlackUpdate({ dailyReport: e.target.checked })}
                    />
                    <span>Daily progress reports</span>
                  </label>

                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={notifications.integrations.slack.goalAchievements}
                      onChange={(e) => handleSlackUpdate({ goalAchievements: e.target.checked })}
                    />
                    <span>Goal achievements</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  );
};

export default NotificationSettings;