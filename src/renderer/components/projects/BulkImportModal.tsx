import React, { useState } from 'react';
import { Project } from '@shared/types/project';
import Modal from '../modals/Modal';
import styles from './BulkImportModal.module.css';

interface BulkImportModalProps {
  projects: Project[];
  onClose: () => void;
  onImport: (importOptions: any) => void;
}

interface ImportItem {
  key: string;
  name: string;
  description?: string;
  selected: boolean;
  metadata?: any;
}

type ImportSource = 'jira' | 'github' | 'trello' | 'asana';

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  projects,
  onClose,
  onImport
}) => {
  const [currentStep, setCurrentStep] = useState<'source' | 'credentials' | 'select' | 'configure'>('source');
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [credentials, setCredentials] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableItems, setAvailableItems] = useState<ImportItem[]>([]);
  const [importConfig, setImportConfig] = useState({
    createSubprojects: true,
    preserveStructure: true,
    defaultColor: '#00bcd4',
    defaultIcon: '📁',
    makeBillable: false,
    hourlyRate: 75,
    currency: 'USD'
  });

  const sources = [
    {
      id: 'jira' as ImportSource,
      name: 'JIRA',
      description: 'Import projects from Atlassian JIRA',
      icon: '🔵',
      fields: [
        { key: 'domain', label: 'JIRA Domain', type: 'text', placeholder: 'yourcompany' },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'you@company.com' },
        { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'Your JIRA API token' }
      ]
    },
    {
      id: 'github' as ImportSource,
      name: 'GitHub',
      description: 'Import repositories from GitHub',
      icon: '⚫',
      fields: [
        { key: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...' },
        { key: 'organization', label: 'Organization (optional)', type: 'text', placeholder: 'Leave empty for personal repos' }
      ]
    },
    {
      id: 'trello' as ImportSource,
      name: 'Trello',
      description: 'Import boards from Trello',
      icon: '🔷',
      fields: [
        { key: 'apiKey', label: 'API Key', type: 'text', placeholder: 'Your Trello API key' },
        { key: 'token', label: 'Token', type: 'password', placeholder: 'Your Trello token' }
      ]
    },
    {
      id: 'asana' as ImportSource,
      name: 'Asana',
      description: 'Import projects from Asana',
      icon: '🔴',
      fields: [
        { key: 'accessToken', label: 'Personal Access Token', type: 'password', placeholder: 'Your Asana access token' },
        { key: 'workspaceId', label: 'Workspace ID (optional)', type: 'text', placeholder: 'Leave empty for default workspace' }
      ]
    }
  ];

  const handleSourceSelect = (source: ImportSource) => {
    setSelectedSource(source);
    setCurrentStep('credentials');
    setCredentials({});
    setError(null);
  };

  const handleCredentialsSubmit = async () => {
    if (!selectedSource) return;

    setIsLoading(true);
    setError(null);

    try {
      // Test credentials and fetch available items
      const response = await window.electronAPI.invoke('integration:fetch-items', {
        source: selectedSource,
        credentials
      });

      if (response.success) {
        const items: ImportItem[] = response.data.map((item: any) => ({
          key: item.key,
          name: item.name,
          description: item.description,
          selected: true,
          metadata: item
        }));
        
        setAvailableItems(items);
        setCurrentStep('select');
      } else {
        setError(response.message || 'Failed to connect to service');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemToggle = (key: string) => {
    setAvailableItems(prev => 
      prev.map(item => 
        item.key === key ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleSelectAll = () => {
    const allSelected = availableItems.every(item => item.selected);
    setAvailableItems(prev => 
      prev.map(item => ({ ...item, selected: !allSelected }))
    );
  };

  const handleConfigureAndImport = () => {
    const selectedItems = availableItems.filter(item => item.selected);
    
    if (selectedItems.length === 0) {
      setError('Please select at least one item to import');
      return;
    }

    const importOptions = {
      source: selectedSource,
      credentials,
      items: selectedItems,
      config: importConfig
    };

    onImport(importOptions);
  };

  const renderStepIndicator = () => (
    <div className={styles.stepIndicator}>
      <div className={`${styles.step} ${currentStep === 'source' ? styles.active : styles.completed}`}>
        <span className={styles.stepNumber}>1</span>
        <span className={styles.stepLabel}>Source</span>
      </div>
      <div className={`${styles.step} ${currentStep === 'credentials' ? styles.active : currentStep === 'select' || currentStep === 'configure' ? styles.completed : ''}`}>
        <span className={styles.stepNumber}>2</span>
        <span className={styles.stepLabel}>Connect</span>
      </div>
      <div className={`${styles.step} ${currentStep === 'select' ? styles.active : currentStep === 'configure' ? styles.completed : ''}`}>
        <span className={styles.stepNumber}>3</span>
        <span className={styles.stepLabel}>Select</span>
      </div>
      <div className={`${styles.step} ${currentStep === 'configure' ? styles.active : ''}`}>
        <span className={styles.stepNumber}>4</span>
        <span className={styles.stepLabel}>Configure</span>
      </div>
    </div>
  );

  const renderSourceSelection = () => (
    <div className={styles.sourceSelection}>
      <h3 className={styles.sectionTitle}>Choose Import Source</h3>
      <div className={styles.sourceGrid}>
        {sources.map(source => (
          <div
            key={source.id}
            className={`${styles.sourceCard} ${selectedSource === source.id ? styles.selected : ''}`}
            onClick={() => handleSourceSelect(source.id)}
          >
            <div className={styles.sourceIcon}>{source.icon}</div>
            <div className={styles.sourceInfo}>
              <h4 className={styles.sourceName}>{source.name}</h4>
              <p className={styles.sourceDescription}>{source.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCredentialsForm = () => {
    const source = sources.find(s => s.id === selectedSource);
    if (!source) return null;

    return (
      <div className={styles.credentialsForm}>
        <h3 className={styles.sectionTitle}>Connect to {source.name}</h3>
        <p className={styles.sectionDescription}>
          Enter your {source.name} credentials to import projects.
        </p>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleCredentialsSubmit(); }}>
          {source.fields.map(field => (
            <div key={field.key} className={styles.field}>
              <label className={styles.label}>{field.label}</label>
              <input
                type={field.type}
                className={styles.input}
                placeholder={field.placeholder}
                value={credentials[field.key] || ''}
                onChange={(e) => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                required
              />
            </div>
          ))}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => setCurrentStep('source')}
            >
              Back
            </button>
            <button
              type="submit"
              className={styles.nextButton}
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderItemSelection = () => (
    <div className={styles.itemSelection}>
      <div className={styles.selectionHeader}>
        <h3 className={styles.sectionTitle}>Select Items to Import</h3>
        <div className={styles.selectionControls}>
          <button
            type="button"
            className={styles.selectAllButton}
            onClick={handleSelectAll}
          >
            {availableItems.every(item => item.selected) ? 'Deselect All' : 'Select All'}
          </button>
          <span className={styles.selectionCount}>
            {availableItems.filter(item => item.selected).length} of {availableItems.length} selected
          </span>
        </div>
      </div>

      <div className={styles.itemsList}>
        {availableItems.map(item => (
          <div key={item.key} className={styles.itemCard}>
            <label className={styles.itemLabel}>
              <input
                type="checkbox"
                checked={item.selected}
                onChange={() => handleItemToggle(item.key)}
                className={styles.itemCheckbox}
              />
              <div className={styles.itemInfo}>
                <h4 className={styles.itemName}>{item.name}</h4>
                {item.description && (
                  <p className={styles.itemDescription}>{item.description}</p>
                )}
              </div>
            </label>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => setCurrentStep('credentials')}
        >
          Back
        </button>
        <button
          type="button"
          className={styles.nextButton}
          onClick={() => setCurrentStep('configure')}
          disabled={availableItems.filter(item => item.selected).length === 0}
        >
          Configure Import
        </button>
      </div>
    </div>
  );

  const renderConfiguration = () => (
    <div className={styles.configuration}>
      <h3 className={styles.sectionTitle}>Import Configuration</h3>
      
      <div className={styles.configSection}>
        <h4 className={styles.configSectionTitle}>Structure Options</h4>
        <div className={styles.configOptions}>
          <label className={styles.configOption}>
            <input
              type="checkbox"
              checked={importConfig.createSubprojects}
              onChange={(e) => setImportConfig(prev => ({ ...prev, createSubprojects: e.target.checked }))}
            />
            <span>Create sub-projects for complex items</span>
          </label>
          <label className={styles.configOption}>
            <input
              type="checkbox"
              checked={importConfig.preserveStructure}
              onChange={(e) => setImportConfig(prev => ({ ...prev, preserveStructure: e.target.checked }))}
            />
            <span>Preserve original hierarchy</span>
          </label>
        </div>
      </div>

      <div className={styles.configSection}>
        <h4 className={styles.configSectionTitle}>Default Project Settings</h4>
        <div className={styles.configFields}>
          <div className={styles.field}>
            <label className={styles.label}>Default Color</label>
            <input
              type="color"
              className={styles.colorInput}
              value={importConfig.defaultColor}
              onChange={(e) => setImportConfig(prev => ({ ...prev, defaultColor: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Default Icon</label>
            <input
              type="text"
              className={styles.input}
              value={importConfig.defaultIcon}
              onChange={(e) => setImportConfig(prev => ({ ...prev, defaultIcon: e.target.value }))}
              placeholder="📁"
            />
          </div>
        </div>
      </div>

      <div className={styles.configSection}>
        <h4 className={styles.configSectionTitle}>Billing Settings</h4>
        <div className={styles.configOptions}>
          <label className={styles.configOption}>
            <input
              type="checkbox"
              checked={importConfig.makeBillable}
              onChange={(e) => setImportConfig(prev => ({ ...prev, makeBillable: e.target.checked }))}
            />
            <span>Make imported projects billable</span>
          </label>
        </div>
        
        {importConfig.makeBillable && (
          <div className={styles.configFields}>
            <div className={styles.field}>
              <label className={styles.label}>Default Hourly Rate</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={styles.input}
                value={importConfig.hourlyRate}
                onChange={(e) => setImportConfig(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Currency</label>
              <select
                className={styles.select}
                value={importConfig.currency}
                onChange={(e) => setImportConfig(prev => ({ ...prev, currency: e.target.value }))}
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
          className={styles.backButton}
          onClick={() => setCurrentStep('select')}
        >
          Back
        </button>
        <button
          type="button"
          className={styles.importButton}
          onClick={handleConfigureAndImport}
        >
          Import Projects
        </button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'source':
        return renderSourceSelection();
      case 'credentials':
        return renderCredentialsForm();
      case 'select':
        return renderItemSelection();
      case 'configure':
        return renderConfiguration();
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Bulk Import Projects"
      size="large"
    >
      <div className={styles.container}>
        {renderStepIndicator()}
        <div className={styles.content}>
          {renderCurrentStep()}
        </div>
      </div>
    </Modal>
  );
};

export default BulkImportModal;