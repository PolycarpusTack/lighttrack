import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { splitActivity } from '../../store/slices/activitySlice';
import { showNotification } from '../../store/slices/uiSlice';
import { Activity } from '../../../shared/types/activity';
import { formatTime, formatDuration } from '../../../shared/utils/time';
import Modal from './Modal';
import styles from './SplitActivityModal.module.css';

interface SplitActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity;
}

const SplitActivityModal: React.FC<SplitActivityModalProps> = ({
  isOpen,
  onClose,
  activity
}) => {
  const dispatch = useAppDispatch();
  const [splitTime, setSplitTime] = useState('');
  const [firstActivityName, setFirstActivityName] = useState('');
  const [secondActivityName, setSecondActivityName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activity && isOpen) {
      // Set default split time to middle of activity
      const start = new Date(activity.startTime).getTime();
      const end = activity.endTime ? new Date(activity.endTime).getTime() : Date.now();
      const midpoint = new Date(start + (end - start) / 2);
      setSplitTime(midpoint.toISOString().slice(0, 16));
      
      // Set default names
      setFirstActivityName(activity.name);
      setSecondActivityName(activity.name);
    }
  }, [activity, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!firstActivityName.trim()) {
      newErrors.firstActivityName = 'First activity name is required';
    }
    
    if (!secondActivityName.trim()) {
      newErrors.secondActivityName = 'Second activity name is required';
    }
    
    if (!splitTime) {
      newErrors.splitTime = 'Split time is required';
    } else {
      const split = new Date(splitTime);
      const start = new Date(activity.startTime);
      const end = activity.endTime ? new Date(activity.endTime) : new Date();
      
      if (split <= start) {
        newErrors.splitTime = 'Split time must be after activity start';
      } else if (split >= end) {
        newErrors.splitTime = 'Split time must be before activity end';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    dispatch(splitActivity({
      activityId: activity.id,
      splitTime
    }));

    dispatch(showNotification({
      type: 'success',
      title: 'Activity Split',
      message: `"${activity.name}" has been split into two activities`
    }));

    handleClose();
  };

  const handleClose = () => {
    setSplitTime('');
    setFirstActivityName('');
    setSecondActivityName('');
    setErrors({});
    onClose();
  };

  if (!activity) return null;

  const startTime = new Date(activity.startTime);
  const endTime = activity.endTime ? new Date(activity.endTime) : new Date();
  const splitDateTime = splitTime ? new Date(splitTime) : null;
  
  const firstDuration = splitDateTime ? splitDateTime.getTime() - startTime.getTime() : 0;
  const secondDuration = splitDateTime ? endTime.getTime() - splitDateTime.getTime() : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Split Activity"
      size="medium"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.activityInfo}>
          <h3 className={styles.originalTitle}>Original Activity</h3>
          <div className={styles.originalDetails}>
            <div><strong>Name:</strong> {activity.name}</div>
            <div><strong>Duration:</strong> {formatDuration(activity.duration || 0)}</div>
            <div><strong>Time:</strong> {formatTime(startTime)} - {formatTime(endTime)}</div>
          </div>
        </div>

        <div className={styles.splitSection}>
          <div className={styles.field}>
            <label htmlFor="splitTime" className={styles.label}>
              Split Time *
            </label>
            <input
              id="splitTime"
              type="datetime-local"
              className={`${styles.input} ${errors.splitTime ? styles.error : ''}`}
              value={splitTime}
              onChange={(e) => setSplitTime(e.target.value)}
              min={new Date(activity.startTime).toISOString().slice(0, 16)}
              max={activity.endTime ? new Date(activity.endTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
            />
            {errors.splitTime && <span className={styles.errorText}>{errors.splitTime}</span>}
          </div>
        </div>

        <div className={styles.resultSection}>
          <div className={styles.resultActivity}>
            <h4 className={styles.resultTitle}>First Activity</h4>
            <div className={styles.field}>
              <label htmlFor="firstActivityName" className={styles.label}>
                Activity Name *
              </label>
              <input
                id="firstActivityName"
                type="text"
                className={`${styles.input} ${errors.firstActivityName ? styles.error : ''}`}
                value={firstActivityName}
                onChange={(e) => setFirstActivityName(e.target.value)}
                placeholder="Name for first part"
              />
              {errors.firstActivityName && <span className={styles.errorText}>{errors.firstActivityName}</span>}
            </div>
            <div className={styles.timeInfo}>
              <div><strong>Time:</strong> {formatTime(startTime)} - {splitDateTime ? formatTime(splitDateTime) : ''}</div>
              <div><strong>Duration:</strong> {formatDuration(firstDuration)}</div>
            </div>
          </div>

          <div className={styles.resultActivity}>
            <h4 className={styles.resultTitle}>Second Activity</h4>
            <div className={styles.field}>
              <label htmlFor="secondActivityName" className={styles.label}>
                Activity Name *
              </label>
              <input
                id="secondActivityName"
                type="text"
                className={`${styles.input} ${errors.secondActivityName ? styles.error : ''}`}
                value={secondActivityName}
                onChange={(e) => setSecondActivityName(e.target.value)}
                placeholder="Name for second part"
              />
              {errors.secondActivityName && <span className={styles.errorText}>{errors.secondActivityName}</span>}
            </div>
            <div className={styles.timeInfo}>
              <div><strong>Time:</strong> {splitDateTime ? formatTime(splitDateTime) : ''} - {formatTime(endTime)}</div>
              <div><strong>Duration:</strong> {formatDuration(secondDuration)}</div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
          >
            Split Activity
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SplitActivityModal;