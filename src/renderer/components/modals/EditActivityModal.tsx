import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { updateActivity, deleteActivity } from '../../store/slices/activitySlice';
import { showNotification, openModal } from '../../store/slices/uiSlice';
import { Activity } from '../../../shared/types/activity';
import Modal from './Modal';
import styles from './EditActivityModal.module.css';

interface EditActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity;
}

const EditActivityModal: React.FC<EditActivityModalProps> = ({
  isOpen,
  onClose,
  activity
}) => {
  const dispatch = useAppDispatch();
  const { projects } = useAppSelector(state => state.projects);
  
  const [formData, setFormData] = useState({
    name: '',
    projectId: '',
    description: '',
    startTime: '',
    endTime: '',
    tags: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activity && isOpen) {
      setFormData({
        name: activity.name,
        projectId: activity.projectId,
        description: activity.description || '',
        startTime: new Date(activity.startTime).toISOString().slice(0, 16),
        endTime: activity.endTime ? new Date(activity.endTime).toISOString().slice(0, 16) : '',
        tags: activity.tags?.join(', ') || ''
      });
    }
  }, [activity, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Activity name is required';
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    if (formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      
      if (end <= start) {
        newErrors.endTime = 'End time must be after start time';
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

    const startTime = new Date(formData.startTime);
    const endTime = formData.endTime ? new Date(formData.endTime) : null;
    const duration = endTime ? endTime.getTime() - startTime.getTime() : undefined;

    const updatedActivity: Partial<Activity> = {
      name: formData.name.trim(),
      projectId: formData.projectId,
      description: formData.description.trim() || undefined,
      startTime: startTime.toISOString(),
      endTime: endTime?.toISOString() || undefined,
      duration,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };

    dispatch(updateActivity({ id: activity.id, updates: updatedActivity }));
    dispatch(showNotification({
      type: 'success',
      title: 'Activity Updated',
      message: `"${updatedActivity.name}" has been updated`
    }));

    onClose();
  };

  const handleDelete = () => {
    dispatch(openModal({
      type: 'confirmation',
      data: {
        title: 'Delete Activity',
        message: `Are you sure you want to delete "${activity.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        confirmStyle: 'danger',
        onConfirm: () => {
          dispatch(deleteActivity(activity.id));
          dispatch(showNotification({
            type: 'success',
            title: 'Activity Deleted',
            message: `"${activity.name}" has been deleted`
          }));
          onClose();
        }
      }
    }));
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Activity"
      size="medium"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="activityName" className={styles.label}>
            Activity Name *
          </label>
          <input
            id="activityName"
            type="text"
            className={`${styles.input} ${errors.name ? styles.error : ''}`}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="What were you working on?"
          />
          {errors.name && <span className={styles.errorText}>{errors.name}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="project" className={styles.label}>
            Project
          </label>
          <select
            id="project"
            className={styles.select}
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
          >
            <option value="default">Default Project</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="description" className={styles.label}>
            Description
          </label>
          <textarea
            id="description"
            className={styles.textarea}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Additional details about this activity..."
            rows={3}
          />
        </div>

        <div className={styles.timeFields}>
          <div className={styles.field}>
            <label htmlFor="startTime" className={styles.label}>
              Start Time *
            </label>
            <input
              id="startTime"
              type="datetime-local"
              className={`${styles.input} ${errors.startTime ? styles.error : ''}`}
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />
            {errors.startTime && <span className={styles.errorText}>{errors.startTime}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="endTime" className={styles.label}>
              End Time
            </label>
            <input
              id="endTime"
              type="datetime-local"
              className={`${styles.input} ${errors.endTime ? styles.error : ''}`}
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
            {errors.endTime && <span className={styles.errorText}>{errors.endTime}</span>}
            <small className={styles.hint}>Leave empty for ongoing activities</small>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="tags" className={styles.label}>
            Tags
          </label>
          <input
            id="tags"
            type="text"
            className={styles.input}
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="meeting, coding, break (comma-separated)"
          />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={handleDelete}
          >
            Delete
          </button>
          <div className={styles.rightActions}>
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
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default EditActivityModal;