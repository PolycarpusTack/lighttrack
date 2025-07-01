import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateShortcuts, updateShortcut, validateShortcut } from '../../store/slices/settingsSlice';
import { KeyboardShortcuts as KeyboardShortcutsType, defaultShortcuts } from '@shared/types/settings';
import SettingsSection from './SettingsSection';
import styles from './KeyboardShortcuts.module.css';

interface ShortcutGroup {
  id: string;
  name: string;
  icon: string;
  shortcuts: {
    key: string;
    label: string;
    description: string;
    category: 'navigation' | 'actions' | 'global';
  }[];
}

const KeyboardShortcuts: React.FC = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings.settings);
  const shortcuts = settings?.shortcuts;

  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [recordingKeys, setRecordingKeys] = useState<string[]>([]);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!shortcuts) return null;

  const shortcutGroups: ShortcutGroup[] = [
    {
      id: 'navigation',
      name: 'Navigation',
      icon: '🧭',
      shortcuts: [
        { key: 'openDashboard', label: 'Open Dashboard', description: 'Navigate to main dashboard', category: 'navigation' },
        { key: 'openTimeline', label: 'Open Timeline', description: 'View activity timeline', category: 'navigation' },
        { key: 'openAnalytics', label: 'Open Analytics', description: 'View analytics and reports', category: 'navigation' },
        { key: 'openGoals', label: 'Open Goals', description: 'Manage goals and achievements', category: 'navigation' },
        { key: 'openProjects', label: 'Open Projects', description: 'Manage projects', category: 'navigation' },
        { key: 'openSettings', label: 'Open Settings', description: 'Access application settings', category: 'navigation' },
      ]
    },
    {
      id: 'actions',
      name: 'Actions',
      icon: '⚡',
      shortcuts: [
        { key: 'startStop', label: 'Start/Stop Timer', description: 'Toggle time tracking', category: 'actions' },
        { key: 'pause', label: 'Pause Timer', description: 'Pause current activity', category: 'actions' },
        { key: 'quickEntry', label: 'Quick Entry', description: 'Add manual time entry', category: 'actions' },
        { key: 'commandPalette', label: 'Command Palette', description: 'Open command palette', category: 'actions' },
        { key: 'search', label: 'Global Search', description: 'Search across all data', category: 'actions' },
      ]
    },
    {
      id: 'global',
      name: 'Global',
      icon: '🌐',
      shortcuts: [
        { key: 'toggleMinimize', label: 'Toggle Minimize', description: 'Minimize/restore window', category: 'global' },
        { key: 'focusMode', label: 'Focus Mode', description: 'Enter distraction-free mode', category: 'global' },
      ]
    }
  ];

  // Filter shortcuts based on search query
  const filteredGroups = shortcutGroups.map(group => ({
    ...group,
    shortcuts: group.shortcuts.filter(shortcut =>
      shortcut.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcuts[shortcut.key].toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.shortcuts.length > 0);

  // Key recording functionality
  useEffect(() => {
    if (editingShortcut && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingShortcut]);

  const formatShortcut = (shortcut: string): string => {
    return shortcut
      .replace(/Ctrl/g, '⌘')
      .replace(/Alt/g, '⌥')
      .replace(/Shift/g, '⇧')
      .replace(/Meta/g, '⌘')
      .replace(/\+/g, ' + ');
  };

  const parseShortcut = (shortcut: string): string => {
    return shortcut
      .replace(/⌘/g, 'Ctrl')
      .replace(/⌥/g, 'Alt')
      .replace(/⇧/g, 'Shift')
      .replace(/ \+ /g, '+');
  };

  const handleKeyDown = async (event: React.KeyboardEvent) => {
    if (!editingShortcut) return;

    event.preventDefault();
    event.stopPropagation();

    const keys: string[] = [];
    
    // Add modifiers
    if (event.ctrlKey || event.metaKey) keys.push('Ctrl');
    if (event.altKey) keys.push('Alt');
    if (event.shiftKey) keys.push('Shift');
    
    // Add main key (exclude modifier keys themselves)
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
      keys.push(event.key.length === 1 ? event.key.toUpperCase() : event.key);
    }

    if (keys.length > 1) { // Must have at least one modifier + main key
      const shortcutString = keys.join('+');
      setRecordingKeys(keys);

      // Check for conflicts
      try {
        const isValid = await dispatch(validateShortcut(shortcutString)).unwrap();
        if (!isValid) {
          const conflictingAction = Object.entries(shortcuts).find(
            ([key, value]) => key !== editingShortcut && value === shortcutString
          );
          
          if (conflictingAction) {
            const conflictingShortcut = shortcutGroups
              .flatMap(g => g.shortcuts)
              .find(s => s.key === conflictingAction[0]);
            
            setConflictWarning(`This shortcut is already used by "${conflictingShortcut?.label || conflictingAction[0]}"`);
          } else {
            setConflictWarning('This shortcut conflicts with system shortcuts');
          }
        } else {
          setConflictWarning(null);
        }
      } catch (error) {
        setConflictWarning('Unable to validate shortcut');
      }
    } else {
      setRecordingKeys(keys);
      setConflictWarning(null);
    }
  };

  const handleShortcutSave = () => {
    if (!editingShortcut || recordingKeys.length < 2) return;

    const shortcutString = recordingKeys.join('+');
    if (!conflictWarning) {
      dispatch(updateShortcut({ key: editingShortcut, value: shortcutString }));
    }
    
    setEditingShortcut(null);
    setRecordingKeys([]);
    setConflictWarning(null);
  };

  const handleShortcutCancel = () => {
    setEditingShortcut(null);
    setRecordingKeys([]);
    setConflictWarning(null);
  };

  const handleResetToDefaults = () => {
    dispatch(updateShortcuts(defaultShortcuts));
  };

  const handleResetSingle = (key: string) => {
    dispatch(updateShortcut({ key, value: defaultShortcuts[key] }));
  };

  const isShortcutModified = (key: string): boolean => {
    return shortcuts[key] !== defaultShortcuts[key];
  };

  const renderShortcutInput = (shortcutKey: string, shortcutData: any) => {
    const isEditing = editingShortcut === shortcutKey;
    const currentShortcut = isEditing && recordingKeys.length > 0 
      ? recordingKeys.join('+') 
      : shortcuts[shortcutKey];

    return (
      <div className={styles.shortcutInput}>
        <div 
          className={`${styles.shortcutDisplay} ${isEditing ? styles.recording : ''} ${conflictWarning ? styles.conflict : ''}`}
          onClick={() => !isEditing && setEditingShortcut(shortcutKey)}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              className={styles.keyRecorder}
              value={recordingKeys.length > 0 ? formatShortcut(recordingKeys.join('+')) : 'Press keys...'}
              onKeyDown={handleKeyDown}
              placeholder="Press shortcut keys..."
              readOnly
            />
          ) : (
            <span className={styles.shortcutKeys}>
              {formatShortcut(currentShortcut)}
            </span>
          )}
        </div>

        <div className={styles.shortcutActions}>
          {isEditing ? (
            <>
              <button
                className={`${styles.saveButton} ${conflictWarning ? styles.disabled : ''}`}
                onClick={handleShortcutSave}
                disabled={!!conflictWarning || recordingKeys.length < 2}
                title="Save shortcut"
              >
                ✓
              </button>
              <button
                className={styles.cancelButton}
                onClick={handleShortcutCancel}
                title="Cancel"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.editButton}
                onClick={() => setEditingShortcut(shortcutKey)}
                title="Edit shortcut"
              >
                ✏️
              </button>
              {isShortcutModified(shortcutKey) && (
                <button
                  className={styles.resetButton}
                  onClick={() => handleResetSingle(shortcutKey)}
                  title="Reset to default"
                >
                  🔄
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.keyboardShortcuts}>
      <SettingsSection
        title="Keyboard Shortcuts"
        description="Customize keyboard shortcuts to speed up your workflow"
      >
        <div className={styles.shortcutsContainer}>
          {/* Header Actions */}
          <div className={styles.shortcutsHeader}>
            <div className={styles.searchContainer}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search shortcuts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            
            <button
              className={styles.resetAllButton}
              onClick={handleResetToDefaults}
              title="Reset all shortcuts to defaults"
            >
              Reset All
            </button>
          </div>

          {/* Conflict Warning */}
          {conflictWarning && (
            <div className={styles.conflictWarning}>
              <span className={styles.warningIcon}>⚠️</span>
              <span>{conflictWarning}</span>
            </div>
          )}

          {/* Recording Instructions */}
          {editingShortcut && (
            <div className={styles.recordingInstructions}>
              <span className={styles.recordingIcon}>⌨️</span>
              <span>Press your desired key combination. Use Ctrl, Alt, or Shift + another key.</span>
            </div>
          )}

          {/* Shortcut Groups */}
          <div className={styles.shortcutGroups}>
            {filteredGroups.map(group => (
              <div key={group.id} className={styles.shortcutGroup}>
                <div className={styles.groupHeader}>
                  <span className={styles.groupIcon}>{group.icon}</span>
                  <h4 className={styles.groupTitle}>{group.name}</h4>
                  <span className={styles.groupCount}>({group.shortcuts.length})</span>
                </div>

                <div className={styles.shortcutList}>
                  {group.shortcuts.map(shortcut => (
                    <div
                      key={shortcut.key}
                      className={`${styles.shortcutItem} ${isShortcutModified(shortcut.key) ? styles.modified : ''}`}
                    >
                      <div className={styles.shortcutInfo}>
                        <div className={styles.shortcutName}>
                          {shortcut.label}
                          {isShortcutModified(shortcut.key) && (
                            <span className={styles.modifiedIndicator} title="Modified from default">●</span>
                          )}
                        </div>
                        <div className={styles.shortcutDescription}>
                          {shortcut.description}
                        </div>
                      </div>

                      {renderShortcutInput(shortcut.key, shortcut)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredGroups.length === 0 && searchQuery && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🔍</span>
              <h3>No shortcuts found</h3>
              <p>Try adjusting your search query to find shortcuts.</p>
            </div>
          )}

          {/* Shortcuts Legend */}
          <div className={styles.shortcutsLegend}>
            <h4 className={styles.legendTitle}>Keyboard Legend</h4>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}>
                <span className={styles.legendKey}>⌘ / Ctrl</span>
                <span className={styles.legendDescription}>Control key</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendKey}>⌥ / Alt</span>
                <span className={styles.legendDescription}>Alt key</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendKey}>⇧ / Shift</span>
                <span className={styles.legendDescription}>Shift key</span>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};

export default KeyboardShortcuts;