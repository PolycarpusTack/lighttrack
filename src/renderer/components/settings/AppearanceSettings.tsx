import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateAppearance, setTheme, setAccentColor } from '../../store/slices/settingsSlice';
import { AppearanceSettings as AppearanceSettingsType } from '@shared/types/settings';
import SettingsSection from './SettingsSection';
import styles from './AppearanceSettings.module.css';

const AppearanceSettings: React.FC = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings.settings);
  const appearance = settings?.appearance;

  if (!appearance) return null;

  const themeOptions = [
    { value: 'light', label: 'Light', icon: '☀️', description: 'Light theme for bright environments' },
    { value: 'dark', label: 'Dark', icon: '🌙', description: 'Dark theme for low-light environments' },
    { value: 'auto', label: 'Auto', icon: '🌗', description: 'Follow system preference' },
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small', preview: '12px' },
    { value: 'medium', label: 'Medium', preview: '14px' },
    { value: 'large', label: 'Large', preview: '16px' },
  ];

  const densityOptions = [
    { value: 'compact', label: 'Compact', description: 'More content, less spacing' },
    { value: 'normal', label: 'Normal', description: 'Balanced spacing and content' },
    { value: 'spacious', label: 'Spacious', description: 'More spacing, easier on the eyes' },
  ];

  const colorSchemes = [
    { id: 'default', name: 'Default', colors: ['#3b82f6', '#1e40af', '#1d4ed8'] },
    { id: 'blue', name: 'Ocean Blue', colors: ['#0ea5e9', '#0284c7', '#0369a1'] },
    { id: 'green', name: 'Forest Green', colors: ['#10b981', '#059669', '#047857'] },
    { id: 'purple', name: 'Royal Purple', colors: ['#8b5cf6', '#7c3aed', '#6d28d9'] },
    { id: 'orange', name: 'Sunset Orange', colors: ['#f59e0b', '#d97706', '#b45309'] },
    { id: 'custom', name: 'Custom', colors: [] },
  ];

  const handleAppearanceUpdate = (updates: Partial<AppearanceSettingsType>) => {
    dispatch(updateAppearance(updates));
  };

  const handleColorSchemeChange = (schemeId: string) => {
    if (schemeId === 'custom') {
      handleAppearanceUpdate({ colorScheme: 'custom' });
    } else {
      const scheme = colorSchemes.find(s => s.id === schemeId);
      if (scheme && scheme.colors.length > 0) {
        handleAppearanceUpdate({
          colorScheme: schemeId as any,
          accentColor: scheme.colors[0]
        });
        dispatch(setAccentColor(scheme.colors[0]));
      }
    }
  };

  return (
    <div className={styles.appearanceSettings}>
      <SettingsSection
        title="Theme"
        description="Choose your preferred theme and appearance"
      >
        <div className={styles.themeSection}>
          <div className={styles.themeOptions}>
            {themeOptions.map(option => (
              <button
                key={option.value}
                className={`${styles.themeOption} ${appearance.theme === option.value ? styles.active : ''}`}
                onClick={() => dispatch(setTheme(option.value as any))}
              >
                <div className={styles.themePreview}>
                  <span className={styles.themeIcon}>{option.icon}</span>
                  <div className={`${styles.themeDemo} ${styles[option.value]}`}>
                    <div className={styles.themeDemoHeader}></div>
                    <div className={styles.themeDemoContent}>
                      <div className={styles.themeDemoSidebar}></div>
                      <div className={styles.themeDemoMain}></div>
                    </div>
                  </div>
                </div>
                <div className={styles.themeInfo}>
                  <span className={styles.themeLabel}>{option.label}</span>
                  <span className={styles.themeDescription}>{option.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Color Scheme"
        description="Customize the accent colors and overall color palette"
      >
        <div className={styles.colorSection}>
          <div className={styles.colorSchemes}>
            {colorSchemes.map(scheme => (
              <button
                key={scheme.id}
                className={`${styles.colorScheme} ${appearance.colorScheme === scheme.id ? styles.active : ''}`}
                onClick={() => handleColorSchemeChange(scheme.id)}
              >
                <div className={styles.schemePreview}>
                  {scheme.colors.length > 0 ? (
                    <div className={styles.colorDots}>
                      {scheme.colors.map((color, index) => (
                        <div
                          key={index}
                          className={styles.colorDot}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className={styles.customIcon}>🎨</div>
                  )}
                </div>
                <span className={styles.schemeName}>{scheme.name}</span>
              </button>
            ))}
          </div>

          {appearance.colorScheme === 'custom' && (
            <div className={styles.customColors}>
              <h4 className={styles.subsectionTitle}>Custom Colors</h4>
              <div className={styles.colorInputs}>
                <div className={styles.colorField}>
                  <label className={styles.label}>Primary Color</label>
                  <div className={styles.colorInputGroup}>
                    <input
                      type="color"
                      className={styles.colorInput}
                      value={appearance.accentColor}
                      onChange={(e) => dispatch(setAccentColor(e.target.value))}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={appearance.accentColor}
                      onChange={(e) => dispatch(setAccentColor(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Typography & Layout"
        description="Adjust text size and interface density for better readability"
      >
        <div className={styles.typographySection}>
          {/* Font Size */}
          <div className={styles.fontSizeSection}>
            <h4 className={styles.subsectionTitle}>Font Size</h4>
            <div className={styles.fontSizeOptions}>
              {fontSizeOptions.map(option => (
                <button
                  key={option.value}
                  className={`${styles.fontSizeOption} ${appearance.fontSize === option.value ? styles.active : ''}`}
                  onClick={() => handleAppearanceUpdate({ fontSize: option.value as any })}
                >
                  <span className={styles.fontPreview} style={{ fontSize: option.preview }}>
                    Aa
                  </span>
                  <span className={styles.fontLabel}>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Layout Density */}
          <div className={styles.densitySection}>
            <h4 className={styles.subsectionTitle}>Layout Density</h4>
            <div className={styles.densityOptions}>
              {densityOptions.map(option => (
                <button
                  key={option.value}
                  className={`${styles.densityOption} ${appearance.density === option.value ? styles.active : ''}`}
                  onClick={() => handleAppearanceUpdate({ density: option.value as any })}
                >
                  <div className={styles.densityPreview}>
                    <div className={`${styles.densityDemo} ${styles[option.value]}`}>
                      <div className={styles.densityItem}></div>
                      <div className={styles.densityItem}></div>
                      <div className={styles.densityItem}></div>
                    </div>
                  </div>
                  <div className={styles.densityInfo}>
                    <span className={styles.densityLabel}>{option.label}</span>
                    <span className={styles.densityDescription}>{option.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Accessibility"
        description="Settings to improve accessibility and reduce motion"
      >
        <div className={styles.accessibilitySection}>
          <div className={styles.accessibilityOptions}>
            <div className={styles.toggleOption}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>Animations</span>
                <span className={styles.toggleDescription}>
                  Enable smooth transitions and animations
                </span>
              </div>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={appearance.animations}
                  onChange={(e) => handleAppearanceUpdate({ animations: e.target.checked })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>

            <div className={styles.toggleOption}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>Reduced Motion</span>
                <span className={styles.toggleDescription}>
                  Reduce or disable motion for better accessibility
                </span>
              </div>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={appearance.reducedMotion}
                  onChange={(e) => handleAppearanceUpdate({ reducedMotion: e.target.checked })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Live Preview */}
      <SettingsSection
        title="Preview"
        description="See how your changes look in real-time"
      >
        <div className={styles.previewSection}>
          <div className={styles.previewWindow}>
            <div className={styles.previewHeader}>
              <div className={styles.previewTitle}>LightTrack Preview</div>
              <div className={styles.previewControls}>
                <div className={styles.previewButton}></div>
                <div className={styles.previewButton}></div>
                <div className={styles.previewButton}></div>
              </div>
            </div>
            <div className={styles.previewContent}>
              <div className={styles.previewSidebar}>
                <div className={styles.previewNavItem} style={{ backgroundColor: appearance.accentColor }}></div>
                <div className={styles.previewNavItem}></div>
                <div className={styles.previewNavItem}></div>
              </div>
              <div className={styles.previewMain}>
                <div className={styles.previewCard}>
                  <div className={styles.previewCardHeader}></div>
                  <div className={styles.previewCardContent}>
                    <div className={styles.previewProgress} style={{ backgroundColor: appearance.accentColor }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};

export default AppearanceSettings;