import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { GoalType, GoalPeriod } from '@shared/types/goal';
import Modal from '../modals/Modal';
import styles from './GoalCreateModal.module.css';

interface GoalCreateModalProps {
  onClose: () => void;
  onCreate: (goalData: any) => void;
}

const GoalCreateModal: React.FC<GoalCreateModalProps> = ({
  onClose,
  onCreate
}) => {
  const { projects } = useSelector((state: RootState) => state.projects);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'daily' as GoalType,
    targetValue: 1,
    targetUnit: 'hours' as 'hours' | 'minutes' | 'sessions' | 'days' | 'tasks',
    targetComparison: 'minimum' as 'minimum' | 'maximum' | 'exact',
    period: 'day' as GoalPeriod,
    projectId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    hasEndDate: false,
    notifications: {
      reminders: true,
      achievements: true,
      dailyProgress: true,
      weeklyProgress: false
    },
    autoReset: true,
    allowPartialCredit: true,
    streakRequired: 7,
    gracePeriod: 2
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const goalTypeOptions = [
    { value: 'daily', label: 'Daily Goal', description: 'Complete every day', icon: '📅' },
    { value: 'weekly', label: 'Weekly Goal', description: 'Complete every week', icon: '📋' },
    { value: 'project', label: 'Project Goal', description: 'Time spent on a specific project', icon: '🎯' },
    { value: 'habit', label: 'Habit Goal', description: 'Build a consistent habit', icon: '🔄' }
  ];

  const targetUnitOptions = {
    daily: ['hours', 'minutes', 'sessions', 'tasks'],
    weekly: ['hours', 'sessions', 'tasks'],
    project: ['hours', 'minutes', 'sessions'],
    habit: ['sessions', 'days']
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Goal name is required';
    }
    
    if (formData.targetValue <= 0) {
      newErrors.targetValue = 'Target value must be greater than 0';
    }
    
    if (formData.type === 'project' && !formData.projectId) {
      newErrors.projectId = 'Project selection is required for project goals';
    }
    
    if (formData.hasEndDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }
    
    if (formData.type === 'habit' && formData.streakRequired < 1) {
      newErrors.streakRequired = 'Streak requirement must be at least 1';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const goalData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      type: formData.type,
      target: {
        value: formData.targetValue,
        unit: formData.targetUnit,
        comparison: formData.targetComparison
      },
      period: formData.period,
      projectId: formData.projectId || undefined,
      startDate: new Date(formData.startDate),
      endDate: formData.hasEndDate && formData.endDate ? new Date(formData.endDate) : undefined,
      isActive: true,
      settings: {
        notifications: formData.notifications,
        autoReset: formData.autoReset,
        allowPartialCredit: formData.allowPartialCredit,
        streakRequired: formData.type === 'habit' ? formData.streakRequired : undefined,
        gracePeriod: formData.gracePeriod
      }
    };

    onCreate(goalData);
  };

  const handleTypeChange = (newType: GoalType) => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      targetUnit: targetUnitOptions[newType][0] as any,
      period: newType === 'daily' ? 'day' : 
             newType === 'weekly' ? 'week' : 
             newType === 'habit' ? 'day' : 'ongoing',
      projectId: newType !== 'project' ? '' : prev.projectId
    }));
  };

  const renderGoalTypeSelector = () => (
    <div className={styles.typeSelector}>
      <label className={styles.label}>Goal Type</label>
      <div className={styles.typeOptions}>
        {goalTypeOptions.map(option => (
          <button
            key={option.value}
            type="button"
            className={`${styles.typeOption} ${formData.type === option.value ? styles.selected : ''}`}
            onClick={() => handleTypeChange(option.value as GoalType)}
          >
            <span className={styles.typeIcon}>{option.icon}</span>
            <div className={styles.typeInfo}>
              <span className={styles.typeName}>{option.label}</span>
              <span className={styles.typeDescription}>{option.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderTargetSettings = () => (
    <div className={styles.targetSettings}>
      <label className={styles.label}>Target</label>
      <div className={styles.targetRow}>
        <div className={styles.targetComparison}>
          <select
            className={styles.select}
            value={formData.targetComparison}
            onChange={(e) => setFormData(prev => ({ ...prev, targetComparison: e.target.value as any }))}
          >
            <option value="minimum">At least</option>
            <option value="exact">Exactly</option>
            <option value="maximum">At most</option>
          </select>
        </div>
        
        <div className={styles.targetValue}>
          <input
            type="number"
            min="0"
            step="0.5"
            className={`${styles.input} ${errors.targetValue ? styles.error : ''}`}
            value={formData.targetValue}
            onChange={(e) => setFormData(prev => ({ ...prev, targetValue: parseFloat(e.target.value) || 0 }))}
          />
        </div>
        
        <div className={styles.targetUnit}>
          <select
            className={styles.select}
            value={formData.targetUnit}
            onChange={(e) => setFormData(prev => ({ ...prev, targetUnit: e.target.value as any }))}
          >
            {targetUnitOptions[formData.type].map(unit => (
              <option key={unit} value={unit}>
                {unit.charAt(0).toUpperCase() + unit.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {errors.targetValue && <span className={styles.errorText}>{errors.targetValue}</span>}
    </div>
  );

  const renderProjectSelector = () => {
    if (formData.type !== 'project') return null;
    
    return (
      <div className={styles.field}>
        <label className={styles.label}>Project *</label>
        <select
          className={`${styles.select} ${errors.projectId ? styles.error : ''}`}
          value={formData.projectId}
          onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
        >
          <option value="">Select a project</option>
          {projects.filter(p => !p.isArchived).map(project => (
            <option key={project.id} value={project.id}>
              {project.icon} {project.name}
            </option>
          ))}
        </select>
        {errors.projectId && <span className={styles.errorText}>{errors.projectId}</span>}
      </div>
    );
  };

  const renderTimelineSettings = () => (
    <div className={styles.timelineSettings}>
      <div className={styles.field}>
        <label className={styles.label}>Start Date</label>
        <input
          type="date"
          className={styles.input}
          value={formData.startDate}
          onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.hasEndDate}
            onChange={(e) => setFormData(prev => ({ ...prev, hasEndDate: e.target.checked }))}
          />
          <span>Set end date</span>
        </label>
        
        {formData.hasEndDate && (
          <input
            type="date"
            className={`${styles.input} ${errors.endDate ? styles.error : ''}`}
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
            min={formData.startDate}
          />
        )}
        {errors.endDate && <span className={styles.errorText}>{errors.endDate}</span>}
      </div>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className={styles.advancedSettings}>
      <h4 className={styles.sectionTitle}>Notifications</h4>
      <div className={styles.checkboxGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.notifications.reminders}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              notifications: { ...prev.notifications, reminders: e.target.checked }
            }))}
          />
          <span>Daily reminders</span>
        </label>
        
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.notifications.achievements}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              notifications: { ...prev.notifications, achievements: e.target.checked }
            }))}
          />
          <span>Achievement notifications</span>
        </label>
        
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.notifications.dailyProgress}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              notifications: { ...prev.notifications, dailyProgress: e.target.checked }
            }))}
          />
          <span>Daily progress updates</span>
        </label>
      </div>

      <h4 className={styles.sectionTitle}>Behavior</h4>
      <div className={styles.checkboxGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.autoReset}
            onChange={(e) => setFormData(prev => ({ ...prev, autoReset: e.target.checked }))}
          />
          <span>Auto-reset for recurring goals</span>
        </label>
        
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.allowPartialCredit}
            onChange={(e) => setFormData(prev => ({ ...prev, allowPartialCredit: e.target.checked }))}
          />
          <span>Allow partial credit</span>
        </label>
      </div>

      {formData.type === 'habit' && (
        <div className={styles.field}>
          <label className={styles.label}>Streak Requirement</label>
          <input
            type="number"
            min="1"
            className={`${styles.input} ${errors.streakRequired ? styles.error : ''}`}
            value={formData.streakRequired}
            onChange={(e) => setFormData(prev => ({ ...prev, streakRequired: parseInt(e.target.value) || 1 }))}
          />
          {errors.streakRequired && <span className={styles.errorText}>{errors.streakRequired}</span>}
        </div>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Create New Goal"
      size="large"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="goalName" className={styles.label}>
            Goal Name *
          </label>
          <input
            id="goalName"
            type="text"
            className={`${styles.input} ${errors.name ? styles.error : ''}`}
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter your goal name"
          />
          {errors.name && <span className={styles.errorText}>{errors.name}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="description" className={styles.label}>
            Description
          </label>
          <textarea
            id="description"
            className={styles.textarea}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description of your goal"
            rows={3}
          />
        </div>

        {renderGoalTypeSelector()}
        {renderTargetSettings()}
        {renderProjectSelector()}
        {renderTimelineSettings()}
        {renderAdvancedSettings()}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
          >
            Create Goal
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default GoalCreateModal;