import React, { useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { Activity } from '@shared/types/activity';
import { formatDuration, formatTime } from '@shared/utils/time';
import { openModal } from '../../store/slices/uiSlice';
import { mergeActivities, bulkDeleteActivities } from '../../store/slices/activitySlice';
import styles from './ActivityList.module.css';

interface ActivityListProps {
  activities: Activity[];
  isLoading: boolean;
}

interface GroupedActivities {
  [key: string]: Activity[];
}

const ActivityList: React.FC<ActivityListProps> = ({ activities, isLoading }) => {
  const dispatch = useAppDispatch();
  const { projects } = useAppSelector(state => state.projects);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['current']));

  // Group activities by time blocks
  const groupedActivities = useMemo(() => {
    const now = new Date();
    const groups: GroupedActivities = {
      current: [],
      morning: [],
      afternoon: [],
      evening: []
    };

    activities.forEach(activity => {
      const startTime = new Date(activity.startTime);
      const hour = startTime.getHours();

      if (!activity.endTime) {
        groups.current.push(activity);
      } else if (hour < 12) {
        groups.morning.push(activity);
      } else if (hour < 17) {
        groups.afternoon.push(activity);
      } else {
        groups.evening.push(activity);
      }
    });

    // Sort each group by start time (newest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    });

    return groups;
  }, [activities]);

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleActivitySelection = (activityId: string) => {
    const newSelected = new Set(selectedActivities);
    if (newSelected.has(activityId)) {
      newSelected.delete(activityId);
    } else {
      newSelected.add(activityId);
    }
    setSelectedActivities(newSelected);
  };

  const handleEdit = (activity: Activity) => {
    dispatch(openModal({
      type: 'editActivity',
      data: { activity }
    }));
  };

  const handleMerge = () => {
    if (selectedActivities.size < 2) {
      dispatch(openModal({
        type: 'confirmation',
        data: {
          title: 'Select Activities to Merge',
          message: 'Please select at least 2 activities to merge.',
          type: 'info'
        }
      }));
      return;
    }

    dispatch(openModal({
      type: 'confirmation',
      data: {
        title: 'Merge Activities',
        message: `Are you sure you want to merge ${selectedActivities.size} activities? This will combine them into a single activity.`,
        confirmText: 'Merge Activities',
        confirmStyle: 'primary',
        onConfirm: () => {
          dispatch(mergeActivities(Array.from(selectedActivities)));
          setSelectedActivities(new Set());
        }
      }
    }));
  };

  const handleSplit = (activity: Activity) => {
    dispatch(openModal({
      type: 'splitActivity',
      data: { activity }
    }));
  };

  const handleExport = () => {
    if (selectedActivities.size === 0) {
      dispatch(openModal({
        type: 'confirmation',
        data: {
          title: 'No Activities Selected',
          message: 'Please select at least one activity to export.',
          confirmText: 'OK'
        }
      }));
      return;
    }

    dispatch(openModal({
      type: 'export',
      data: { activityIds: Array.from(selectedActivities) }
    }));
  };

  const handleCategorize = () => {
    if (selectedActivities.size === 0) {
      dispatch(openModal({
        type: 'confirmation',
        data: {
          title: 'No Activities Selected',
          message: 'Please select at least one activity to categorize.',
          confirmText: 'OK'
        }
      }));
      return;
    }

    dispatch(openModal({
      type: 'bulkCategorize',
      data: { activityIds: Array.from(selectedActivities) }
    }));
  };

  const handleBulkDelete = () => {
    if (selectedActivities.size === 0) return;

    dispatch(openModal({
      type: 'confirmation',
      data: {
        title: 'Delete Activities',
        message: `Are you sure you want to delete ${selectedActivities.size} activities? This action cannot be undone.`,
        confirmText: 'Delete',
        confirmStyle: 'danger',
        onConfirm: () => {
          dispatch(bulkDeleteActivities(Array.from(selectedActivities)));
          setSelectedActivities(new Set());
        }
      }
    }));
  };

  const getProjectColor = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.color || '#00bcd4';
  };

  const getGroupLabel = (groupName: string) => {
    const labels: { [key: string]: string } = {
      current: 'In Progress',
      morning: 'Morning (Before 12 PM)',
      afternoon: 'Afternoon (12 PM - 5 PM)',
      evening: 'Evening (After 5 PM)'
    };
    return labels[groupName] || groupName;
  };

  const getGroupIcon = (groupName: string) => {
    const icons: { [key: string]: string } = {
      current: '⏱️',
      morning: '🌅',
      afternoon: '☀️',
      evening: '🌙'
    };
    return icons[groupName] || '📅';
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingIcon}>⏳</div>
        <div className={styles.loadingText}>Loading activities...</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📭</div>
        <div className={styles.emptyText}>No activities tracked today</div>
        <div className={styles.emptyHint}>Start tracking to see your activities here</div>
      </div>
    );
  }

  return (
    <div className={styles.activityList}>
      {selectedActivities.size > 0 && (
        <div className={styles.bulkActions}>
          <span className={styles.selectedCount}>
            {selectedActivities.size} selected
          </span>
          <div className={styles.bulkActionGroup}>
            <button className={styles.bulkAction} onClick={handleMerge}>
              <span className={styles.icon}>🔗</span>
              Merge
            </button>
            <button className={styles.bulkAction} onClick={handleExport}>
              <span className={styles.icon}>📤</span>
              Export
            </button>
            <button className={styles.bulkAction} onClick={handleCategorize}>
              <span className={styles.icon}>🏷️</span>
              Categorize
            </button>
            <button className={styles.bulkAction} onClick={handleBulkDelete}>
              <span className={styles.icon}>🗑️</span>
              Delete
            </button>
            <button className={styles.bulkAction} onClick={() => setSelectedActivities(new Set())}>
              <span className={styles.icon}>❌</span>
              Clear
            </button>
          </div>
        </div>
      )}

      {Object.entries(groupedActivities).map(([groupName, groupActivities]) => {
        if (groupActivities.length === 0) return null;

        const isExpanded = expandedGroups.has(groupName);
        const totalDuration = groupActivities.reduce((sum, a) => sum + (a.duration || 0), 0);

        return (
          <div key={groupName} className={styles.activityGroup}>
            <div 
              className={styles.groupHeader}
              onClick={() => toggleGroup(groupName)}
            >
              <div className={styles.groupInfo}>
                <span className={styles.groupIcon}>{getGroupIcon(groupName)}</span>
                <span className={styles.groupLabel}>{getGroupLabel(groupName)}</span>
                <span className={styles.groupCount}>({groupActivities.length})</span>
              </div>
              <div className={styles.groupMeta}>
                <span className={styles.groupDuration}>
                  {formatDuration(totalDuration)}
                </span>
                <span className={styles.expandIcon}>
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {isExpanded && (
              <div className={styles.groupActivities}>
                {groupActivities.map(activity => (
                  <div 
                    key={activity.id}
                    className={`${styles.activityItem} ${selectedActivities.has(activity.id) ? styles.selected : ''}`}
                  >
                    <div className={styles.activityMain}>
                      <input
                        type="checkbox"
                        className={styles.activityCheckbox}
                        checked={selectedActivities.has(activity.id)}
                        onChange={() => toggleActivitySelection(activity.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className={styles.activityInfo}>
                        <div className={styles.activityName}>{activity.name}</div>
                        <div className={styles.activityMeta}>
                          <span className={styles.metaItem}>
                            <span 
                              className={styles.projectDot}
                              style={{ backgroundColor: getProjectColor(activity.projectId) }}
                            />
                            {projects.find(p => p.id === activity.projectId)?.name || 'Uncategorized'}
                          </span>
                          {activity.applicationName && (
                            <span className={styles.metaItem}>
                              💻 {activity.applicationName}
                            </span>
                          )}
                          <span className={styles.metaItem}>
                            🕐 {formatTime(activity.startTime)}
                            {activity.endTime && ` - ${formatTime(activity.endTime)}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.activityActions}>
                      <span className={styles.activityDuration}>
                        {formatDuration(activity.duration || 0)}
                      </span>
                      <button 
                        className={styles.actionBtn}
                        onClick={() => handleEdit(activity)}
                        title="Edit activity"
                      >
                        ✏️
                      </button>
                      <button 
                        className={styles.actionBtn}
                        onClick={() => handleSplit(activity)}
                        title="Split activity"
                      >
                        ✂️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ActivityList;