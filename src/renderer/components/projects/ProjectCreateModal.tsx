import React, { useState, useEffect } from 'react';
import { Project } from '@shared/types/project';
import Modal from '../modals/Modal';
import styles from './ProjectCreateModal.module.css';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  baseProject: {
    color: string;
    icon?: string;
    settings: any;
  };
}

interface ProjectCreateModalProps {
  templates: ProjectTemplate[];
  projects: Project[];
  onClose: () => void;
  onCreate: (projectData: any) => void;
  selectedTemplateId?: string;
}

const ProjectCreateModal: React.FC<ProjectCreateModalProps> = ({
  templates,
  projects,
  onClose,
  onCreate,
  selectedTemplateId
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#00bcd4',
    icon: '',
    parentId: '',
    billable: false,
    hourlyRate: 0,
    currency: 'USD',
    templateId: selectedTemplateId || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (selectedTemplateId) {
      applyTemplate(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        name: template.name,
        description: template.description,
        color: template.baseProject.color,
        icon: template.baseProject.icon || '',
        billable: template.baseProject.settings.billable || false,
        hourlyRate: template.baseProject.settings.hourlyRate || 0,
        currency: template.baseProject.settings.currency || 'USD',
        templateId
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (projects.some(p => p.name.toLowerCase() === formData.name.toLowerCase())) {
      newErrors.name = 'A project with this name already exists';
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

    const projectData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color,
      icon: formData.icon || undefined,
      parentId: formData.parentId || undefined,
      isArchived: false,
      settings: {
        billable: formData.billable,
        hourlyRate: formData.billable ? formData.hourlyRate : undefined,
        currency: formData.currency,
        timeGoals: {},
        notifications: {
          dailyReport: true,
          weeklyReport: true,
          goalAlerts: true
        },
        integrations: {}
      }
    };

    onCreate(projectData);
  };

  const handleReset = () => {
    setFormData({
      name: '',
      description: '',
      color: '#00bcd4',
      icon: '',
      parentId: '',
      billable: false,
      hourlyRate: 0,
      currency: 'USD',
      templateId: ''
    });
    setErrors({});
  };

  const parentProjects = projects.filter(p => !p.isArchived && !p.parentId);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Create New Project"
      size="medium"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Template Selection */}
        {templates.length > 0 && (
          <div className={styles.field}>
            <label className={styles.label}>Start from Template</label>
            <select
              className={styles.select}
              value={formData.templateId}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, templateId: e.target.value }));
                if (e.target.value) {
                  applyTemplate(e.target.value);
                } else {
                  handleReset();
                }
              }}
            >
              <option value="">Create from scratch</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
            className={styles.select}
            value={formData.parentId}
            onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value }))}
          >
            <option value="">None (Root Project)</option>
            {parentProjects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
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
          >
            Reset
          </button>
          <button
            type="submit"
            className={styles.submitButton}
          >
            Create Project
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectCreateModal;