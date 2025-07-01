import React, { useState } from 'react';
import Modal from '../modals/Modal';
import styles from './ProjectTemplatesModal.module.css';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  baseProject: {
    color: string;
    icon?: string;
    settings: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectTemplatesModalProps {
  templates: ProjectTemplate[];
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
}

const ProjectTemplatesModal: React.FC<ProjectTemplatesModalProps> = ({
  templates,
  onClose,
  onSelectTemplate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const renderTemplateCard = (template: ProjectTemplate) => {
    const isSelected = selectedTemplate === template.id;
    
    return (
      <div
        key={template.id}
        className={`${styles.templateCard} ${isSelected ? styles.selected : ''}`}
        onClick={() => setSelectedTemplate(template.id)}
      >
        <div className={styles.templateHeader}>
          <div className={styles.templateInfo}>
            <span 
              className={styles.colorIndicator}
              style={{ backgroundColor: template.baseProject.color }}
            />
            <div className={styles.nameSection}>
              {template.baseProject.icon && (
                <span className={styles.icon}>{template.baseProject.icon}</span>
              )}
              <h3 className={styles.templateName}>{template.name}</h3>
            </div>
          </div>
          
          {isSelected && (
            <div className={styles.selectedIndicator}>
              ✓
            </div>
          )}
        </div>

        <p className={styles.templateDescription}>
          {template.description}
        </p>

        <div className={styles.templateDetails}>
          <div className={styles.detail}>
            <span className={styles.detailLabel}>Type</span>
            <span className={styles.detailValue}>
              {template.baseProject.settings.billable ? 'Billable' : 'Non-billable'}
            </span>
          </div>
          
          {template.baseProject.settings.billable && template.baseProject.settings.hourlyRate && (
            <div className={styles.detail}>
              <span className={styles.detailLabel}>Default Rate</span>
              <span className={styles.detailValue}>
                {formatCurrency(
                  template.baseProject.settings.hourlyRate,
                  template.baseProject.settings.currency
                )}/hr
              </span>
            </div>
          )}
          
          <div className={styles.detail}>
            <span className={styles.detailLabel}>Created</span>
            <span className={styles.detailValue}>
              {new Date(template.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {template.baseProject.settings.integrations && (
          <div className={styles.integrations}>
            <span className={styles.integrationsLabel}>Integrations:</span>
            <div className={styles.integrationsList}>
              {template.baseProject.settings.integrations.jira && (
                <span className={styles.integrationTag}>JIRA</span>
              )}
              {template.baseProject.settings.integrations.github && (
                <span className={styles.integrationTag}>GitHub</span>
              )}
              {template.baseProject.settings.integrations.trello && (
                <span className={styles.integrationTag}>Trello</span>
              )}
              {template.baseProject.settings.integrations.asana && (
                <span className={styles.integrationTag}>Asana</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const defaultTemplates = [
    {
      id: 'default-1',
      name: 'Client Project',
      description: 'Standard billable project template for client work with time tracking and invoicing',
      baseProject: {
        color: '#2196f3',
        icon: '💼',
        settings: {
          billable: true,
          hourlyRate: 75,
          currency: 'USD',
          timeGoals: { daily: 8 },
          notifications: { dailyReport: true, weeklyReport: true }
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'default-2',
      name: 'Internal Project',
      description: 'Non-billable template for internal projects, training, and company initiatives',
      baseProject: {
        color: '#4caf50',
        icon: '🏢',
        settings: {
          billable: false,
          timeGoals: { weekly: 20 },
          notifications: { weeklyReport: true }
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'default-3',
      name: 'Development Project',
      description: 'Template for software development with GitHub integration and code tracking',
      baseProject: {
        color: '#9c27b0',
        icon: '💻',
        settings: {
          billable: true,
          hourlyRate: 100,
          currency: 'USD',
          integrations: { github: true },
          notifications: { goalAlerts: true }
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'default-4',
      name: 'Research & Learning',
      description: 'Template for learning projects, skill development, and research activities',
      baseProject: {
        color: '#ff9800',
        icon: '📚',
        settings: {
          billable: false,
          timeGoals: { daily: 2, weekly: 10 },
          notifications: { goalAlerts: true }
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const allTemplates = [...templates, ...defaultTemplates];
  const displayTemplates = searchQuery ? filteredTemplates : allTemplates;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Project Templates"
      size="large"
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.info}>
            <p className={styles.infoText}>
              Select a template to pre-configure your project with common settings and integrations.
            </p>
          </div>
        </div>

        <div className={styles.templatesGrid}>
          {displayTemplates.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No templates found</h3>
              <p>
                {searchQuery 
                  ? 'No templates match your search criteria.'
                  : 'No templates available. You can create projects from scratch.'
                }
              </p>
            </div>
          ) : (
            displayTemplates.map(renderTemplateCard)
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
            className={styles.createButton}
            onClick={() => onSelectTemplate('')}
          >
            Create from Scratch
          </button>
          <button
            type="button"
            className={styles.selectButton}
            onClick={handleSelectTemplate}
            disabled={!selectedTemplate}
          >
            Use Template
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ProjectTemplatesModal;