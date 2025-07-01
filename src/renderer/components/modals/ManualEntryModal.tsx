import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { addActivity } from '../../store/slices/activitySlice';
import { showNotification } from '../../store/slices/uiSlice';
import Modal from './Modal';
import styles from './ManualEntryModal.module.css';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose
}) => {
  const dispatch = useAppDispatch();
  const { projects } = useAppSelector(state => state.projects);
  
  const [formData, setFormData] = useState({
    name: '',
    projectId: 'default',
    description: '',
    startTime: '',
    endTime: '',
    tags: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Activity name is required';
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }
    
    if (formData.startTime && formData.endTime) {
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
    const endTime = new Date(formData.endTime);
    const duration = endTime.getTime() - startTime.getTime();

    const activity = {
      name: formData.name.trim(),
      projectId: formData.projectId,
      description: formData.description.trim() || undefined,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };

    dispatch(addActivity(activity));
    dispatch(showNotification({
      type: 'success',
      title: 'Activity Added',
      message: `"${activity.name}" has been added to your timeline`
    }));

    // Reset form and close modal
    setFormData({
      name: '',
      projectId: 'default',
      description: '',
      startTime: '',
      endTime: '',
      tags: ''
    });
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      projectId: 'default',
      description: '',
      startTime: '',
      endTime: '',
      tags: ''
    });
    setErrors({});
    onClose();
  };

  // Set default date to today
  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Manual Activity"
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
              max={new Date().toISOString().slice(0, 16)}
            />
            {errors.startTime && <span className={styles.errorText}>{errors.startTime}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="endTime" className={styles.label}>
              End Time *
            </label>
            <input
              id="endTime"
              type="datetime-local"
              className={`${styles.input} ${errors.endTime ? styles.error : ''}`}
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              max={new Date().toISOString().slice(0, 16)}
            />
            {errors.endTime && <span className={styles.errorText}>{errors.endTime}</span>}
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
            className={styles.cancelButton}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
          >
            Add Activity
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ManualEntryModal;