import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateProfile } from '../../store/slices/settingsSlice';
import { ProfileSettings as ProfileSettingsType } from '@shared/types/settings';
import SettingsSection from './SettingsSection';
import styles from './ProfileSettings.module.css';

const ProfileSettings: React.FC = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings.settings);
  const profile = settings?.profile;

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  if (!profile) return null;

  const timezones = Intl.supportedValuesOf('timeZone');
  const workDayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  const handleProfileUpdate = (updates: Partial<ProfileSettingsType>) => {
    dispatch(updateProfile(updates));
  };

  const handleWorkScheduleUpdate = (updates: any) => {
    handleProfileUpdate({
      workSchedule: {
        ...profile.workSchedule,
        ...updates
      }
    });
  };

  const handleWorkingHoursUpdate = (updates: any) => {
    handleWorkScheduleUpdate({
      workingHours: {
        ...profile.workSchedule.workingHours,
        ...updates
      }
    });
  };

  const handleBreakPreferencesUpdate = (updates: any) => {
    handleWorkScheduleUpdate({
      breakPreferences: {
        ...profile.workSchedule.breakPreferences,
        ...updates
      }
    });
  };

  const handleWorkDaysToggle = (day: number) => {
    const workDays = profile.workSchedule.workDays.includes(day)
      ? profile.workSchedule.workDays.filter(d => d !== day)
      : [...profile.workSchedule.workDays, day].sort();
    
    handleWorkScheduleUpdate({ workDays });
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAvatarPreview(result);
        handleProfileUpdate({ avatar: result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={styles.profileSettings}>
      <SettingsSection
        title="Personal Information"
        description="Basic profile information and preferences"
      >
        <div className={styles.personalInfo}>
          {/* Avatar */}
          <div className={styles.avatarSection}>
            <label className={styles.label}>Profile Picture</label>
            <div className={styles.avatarContainer}>
              <div className={styles.avatar}>
                {(avatarPreview || profile.avatar) ? (
                  <img 
                    src={avatarPreview || profile.avatar} 
                    alt="Profile" 
                    className={styles.avatarImage}
                  />
                ) : (
                  <span className={styles.avatarPlaceholder}>
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className={styles.avatarActions}>
                <label className={styles.uploadButton}>
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className={styles.hiddenInput}
                  />
                </label>
                {profile.avatar && (
                  <button
                    className={styles.removeButton}
                    onClick={() => {
                      setAvatarPreview(null);
                      handleProfileUpdate({ avatar: undefined });
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div className={styles.field}>
            <label className={styles.label}>Name</label>
            <input
              type="text"
              className={styles.input}
              value={profile.name}
              onChange={(e) => handleProfileUpdate({ name: e.target.value })}
              placeholder="Your name"
            />
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              value={profile.email || ''}
              onChange={(e) => handleProfileUpdate({ email: e.target.value })}
              placeholder="your.email@example.com"
            />
            <span className={styles.fieldHint}>
              Used for notifications and data export
            </span>
          </div>

          {/* Timezone */}
          <div className={styles.field}>
            <label className={styles.label}>Timezone</label>
            <select
              className={styles.select}
              value={profile.timezone}
              onChange={(e) => handleProfileUpdate({ timezone: e.target.value })}
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Work Schedule"
        description="Define your working hours and break preferences"
      >
        <div className={styles.workSchedule}>
          {/* Working Hours */}
          <div className={styles.workingHours}>
            <h4 className={styles.subsectionTitle}>Working Hours</h4>
            <div className={styles.timeRange}>
              <div className={styles.field}>
                <label className={styles.label}>Start Time</label>
                <input
                  type="time"
                  className={styles.input}
                  value={profile.workSchedule.workingHours.start}
                  onChange={(e) => handleWorkingHoursUpdate({ start: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>End Time</label>
                <input
                  type="time"
                  className={styles.input}
                  value={profile.workSchedule.workingHours.end}
                  onChange={(e) => handleWorkingHoursUpdate({ end: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Work Days */}
          <div className={styles.workDays}>
            <h4 className={styles.subsectionTitle}>Work Days</h4>
            <div className={styles.dayButtons}>
              {workDayOptions.map(day => (
                <button
                  key={day.value}
                  className={`${styles.dayButton} ${
                    profile.workSchedule.workDays.includes(day.value) ? styles.active : ''
                  }`}
                  onClick={() => handleWorkDaysToggle(day.value)}
                >
                  {day.label.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Break Preferences */}
          <div className={styles.breakPreferences}>
            <h4 className={styles.subsectionTitle}>Break Preferences</h4>
            
            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={profile.workSchedule.breakPreferences.enabled}
                  onChange={(e) => handleBreakPreferencesUpdate({ enabled: e.target.checked })}
                />
                <span>Enable break reminders</span>
              </label>
            </div>

            {profile.workSchedule.breakPreferences.enabled && (
              <>
                <div className={styles.breakSettings}>
                  <div className={styles.field}>
                    <label className={styles.label}>Break Duration (minutes)</label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      className={styles.input}
                      value={profile.workSchedule.breakPreferences.duration}
                      onChange={(e) => handleBreakPreferencesUpdate({ 
                        duration: parseInt(e.target.value) || 15 
                      })}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Break Frequency (every X minutes)</label>
                    <input
                      type="number"
                      min="30"
                      max="480"
                      className={styles.input}
                      value={profile.workSchedule.breakPreferences.frequency}
                      onChange={(e) => handleBreakPreferencesUpdate({ 
                        frequency: parseInt(e.target.value) || 90 
                      })}
                    />
                  </div>
                </div>

                <div className={styles.breakSettings}>
                  <div className={styles.field}>
                    <label className={styles.label}>Long Break Duration (minutes)</label>
                    <input
                      type="number"
                      min="15"
                      max="120"
                      className={styles.input}
                      value={profile.workSchedule.breakPreferences.longBreakDuration}
                      onChange={(e) => handleBreakPreferencesUpdate({ 
                        longBreakDuration: parseInt(e.target.value) || 30 
                      })}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Long Break After (breaks)</label>
                    <input
                      type="number"
                      min="2"
                      max="10"
                      className={styles.input}
                      value={profile.workSchedule.breakPreferences.longBreakFrequency}
                      onChange={(e) => handleBreakPreferencesUpdate({ 
                        longBreakFrequency: parseInt(e.target.value) || 4 
                      })}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={profile.workSchedule.breakPreferences.reminders}
                      onChange={(e) => handleBreakPreferencesUpdate({ reminders: e.target.checked })}
                    />
                    <span>Show break reminder notifications</span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};

export default ProfileSettings;