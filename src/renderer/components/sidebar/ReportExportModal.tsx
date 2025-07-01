import React, { useState } from 'react';
import { ExportFormat } from '../../../main/services/ReportGenerator';
import styles from './ReportExportModal.module.css';

interface ReportExportModalProps {
  report: any;
  onExport: (format: ExportFormat) => void;
  onClose: () => void;
}

interface ExportOption {
  format: ExportFormat;
  name: string;
  description: string;
  icon: string;
  features: string[];
}

const ReportExportModal: React.FC<ReportExportModalProps> = ({ report, onExport, onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('PDF');
  const [isExporting, setIsExporting] = useState(false);

  const exportOptions: ExportOption[] = [
    {
      format: 'PDF',
      name: 'PDF Document',
      description: 'Professional report with charts and formatting',
      icon: '📄',
      features: [
        'Professional formatting',
        'Embedded charts and graphs',
        'Print-ready layout',
        'Easy sharing'
      ]
    },
    {
      format: 'CSV',
      name: 'CSV Spreadsheet',
      description: 'Raw data for analysis in Excel or Google Sheets',
      icon: '📊',
      features: [
        'Import into spreadsheets',
        'Raw activity data',
        'Custom analysis',
        'Data manipulation'
      ]
    },
    {
      format: 'JSON',
      name: 'JSON Data',
      description: 'Structured data for developers and integrations',
      icon: '{ }',
      features: [
        'Complete data structure',
        'API integration ready',
        'Programmatic access',
        'Backup and archival'
      ]
    }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedFormat);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Export Report</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.exportOptions}>
          {exportOptions.map((option) => (
            <div
              key={option.format}
              className={`${styles.exportOption} ${
                selectedFormat === option.format ? styles.selected : ''
              }`}
              onClick={() => setSelectedFormat(option.format)}
            >
              <div className={styles.optionHeader}>
                <span className={styles.optionIcon}>{option.icon}</span>
                <div className={styles.optionInfo}>
                  <h3>{option.name}</h3>
                  <p>{option.description}</p>
                </div>
                <input
                  type="radio"
                  name="exportFormat"
                  value={option.format}
                  checked={selectedFormat === option.format}
                  onChange={() => setSelectedFormat(option.format)}
                  className={styles.radio}
                />
              </div>
              <ul className={styles.featureList}>
                {option.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.reportInfo}>
          <h3>Report Details</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Type:</label>
              <span>{getReportTypeName(report.metadata.type)}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Generated:</label>
              <span>{new Date(report.metadata.generatedAt).toLocaleString()}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Activities:</label>
              <span>{report.summary.activityCount}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Total Time:</label>
              <span>{formatDuration(report.summary.totalTime)}</span>
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelBtn}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className={styles.exportBtn}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <span className={styles.spinner}></span>
                Exporting...
              </>
            ) : (
              `Export as ${selectedFormat}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const getReportTypeName = (type: string): string => {
  switch (type) {
    case 'daily':
      return 'Daily Summary';
    case 'weekly':
      return 'Weekly Analysis';
    case 'project':
      return 'Project Report';
    case 'custom':
      return 'Custom Report';
    default:
      return 'Report';
  }
};

const formatDuration = (milliseconds: number): string => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

export default ReportExportModal;