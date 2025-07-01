import React, { useState, useEffect } from 'react';
import { Project } from '@shared/types/project';
import Modal from '../modals/Modal';
import styles from './ProjectEditModal.module.css';

interface ProjectEditModalProps {
  project: Project;
  projects: Project[];
  onClose: () => void;
  onUpdate: (updates: Partial<Project>) => void;
}

const ProjectEditModal: React.FC<ProjectEditModalProps> = ({
  project,
  projects,
  onClose,
  onUpdate
}) => {
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || '',
    color: project.color,
    icon: project.icon || '',
    parentId: project.parentId || '',
    billable: project.settings.billable || false,
    hourlyRate: project.settings.hourlyRate || 0,
    currency: project.settings.currency || 'USD',
    isArchived: project.isArchived
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const availableColors = [
    '#00bcd4', '#2196f3', '#4caf50', '#ff9800', 
    '#f44336', '#9c27b0', '#673ab7', '#3f51b5',
    '#009688', '#8bc34a', '#ffeb3b', '#795548'
  ];

  const availableIcons = [
    '📁', '💼', '🎯', '⚡', '🚀', '💎', '🎨', '📊',
    '🔧', '💻', '📱', '🌟', '🎭', '🎪', '🎸', '⚽'
  ];

  useEffect(() => {
    const originalData = {
      name: project.name,
      description: project.description || '',
      color: project.color,
      icon: project.icon || '',
      parentId: project.parentId || '',
      billable: project.settings.billable || false,
      hourlyRate: project.settings.hourlyRate || 0,
      currency: project.settings.currency || 'USD',
      isArchived: project.isArchived
    };

    const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [formData, project]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (
      projects.some(p => 
        p.id !== project.id && 
        p.name.toLowerCase() === formData.name.toLowerCase()
      )
    ) {
      newErrors.name = 'A project with this name already exists';
    }
    
    if (formData.parentId === project.id) {
      newErrors.parentId = 'A project cannot be its own parent';
    }
    
    if (formData.billable && formData.hourlyRate <= 0) {
      newErrors.hourlyRate = 'Hourly rate must be greater than 0 for billable projects';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const updates: Partial<Project> = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color,
      icon: formData.icon || undefined,
      parentId: formData.parentId || undefined,
      isArchived: formData.isArchived,
      settings: {
        ...project.settings,
        billable: formData.billable,
        hourlyRate: formData.billable ? formData.hourlyRate : undefined,
        currency: formData.currency
      }
    };

    onUpdate(updates);
  };

  const handleReset = () => {
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color,
      icon: project.icon || '',
      parentId: project.parentId || '',
      billable: project.settings.billable || false,
      hourlyRate: project.settings.hourlyRate || 0,
      currency: project.settings.currency || 'USD',
      isArchived: project.isArchived
    });
    setErrors({});
  };

  const availableParents = projects.filter(p => 
    !p.isArchived && 
    p.id !== project.id && 
    !isDescendant(p.id, project.id)
  );

  const isDescendant = (potentialParentId: string, projectId: string): boolean => {
    const potentialParent = projects.find(p => p.id === potentialParentId);
    if (!potentialParent || !potentialParent.parentId) return false;
    if (potentialParent.parentId === projectId) return true;
    return isDescendant(potentialParent.parentId, projectId);
  };

  const formatDuration = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Edit Project"
      size="medium"
    >
      <div className={styles.container}>
        {/* Project Stats */}
        <div className={styles.statsSection}>
          <h4 className={styles.statsTitle}>Project Statistics</h4>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total Time</span>
              <span className={styles.statValue}>{formatDuration(project.totalTime)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Created</span>
              <span className={styles.statValue}>
                {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Last Updated</span>
              <span className={styles.statValue}>
                {new Date(project.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Basic Information */}
          <div className={styles.field}>
            <label htmlFor="projectName" className={styles.label}>
              Project Name *
            </label>
            <input
              id="projectName"
              type="text"
              className={`${styles.input} ${errors.name ? styles.error : ''}`}
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter project name"
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
              placeholder="Optional project description"
              rows={3}
            />
          </div>

          {/* Visual Settings */}
          <div className={styles.visualSettings}>
            <div className={styles.field}>
              <label className={styles.label}>Color</label>
              <div className={styles.colorPicker}>
                {availableColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`${styles.colorOption} ${formData.color === color ? styles.selected : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Icon</label>
              <div className={styles.iconPicker}>
                <button
                  type="button"
                  className={`${styles.iconOption} ${!formData.icon ? styles.selected : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, icon: '' }))}
                >
                  None
                </button>
                {availableIcons.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`${styles.iconOption} ${formData.icon === icon ? styles.selected : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hierarchy */}
          <div className={styles.field}>
            <label className={styles.label}>Parent Project</label>
            <select
              className={`${styles.select} ${errors.parentId ? styles.error : ''}`}
              value={formData.parentId}
              onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value }))}
            >
              <option value="">None (Root Project)</option>
              {availableParents.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.parentId && <span className={styles.errorText}>{errors.parentId}</span>}
          </div>

          {/* Project Status */}
          <div className={styles.statusSection}>
            <div className={styles.checkboxField}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isArchived}
                  onChange={(e) => setFormData(prev => ({ ...prev, isArchived: e.target.checked }))}
                />
                <span className={styles.checkboxText}>Archive this project</span>
              </label>
              <p className={styles.helpText}>
                Archived projects are hidden from most views but can be restored
              </p>
            </div>
          </div>

          {/* Billing Settings */}
          <div className={styles.billingSection}>
            <div className={styles.checkboxField}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.billable}
                  onChange={(e) => setFormData(prev => ({ ...prev, billable: e.target.checked }))}
                />
                <span className={styles.checkboxText}>This is a billable project</span>
              </label>
            </div>

            {formData.billable && (
              <div className={styles.billingFields}>
                <div className={styles.field}>
                  <label className={styles.label}>Hourly Rate *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={`${styles.input} ${errors.hourlyRate ? styles.error : ''}`}
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                  {errors.hourlyRate && <span className={styles.errorText}>{errors.hourlyRate}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Currency</label>
                  <select
                    className={styles.select}
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AUD">AUD (A$)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.resetButton}
              onClick={handleReset}
              disabled={!hasChanges}
            >
              Reset
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={!hasChanges}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ProjectEditModal;