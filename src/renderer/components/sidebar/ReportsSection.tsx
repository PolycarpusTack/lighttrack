import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { generateReport, exportReport } from '../../store/slices/reportsSlice';
import { ReportType, ExportFormat } from '../../../main/services/ReportGenerator';
import ReportPreview from './ReportPreview';
import ReportExportModal from './ReportExportModal';
import styles from './ReportsSection.module.css';

interface ReportTemplate {
  id: string;
  type: ReportType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const ReportsSection: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedReport, setSelectedReport] = useState<ReportTemplate | null>(null);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(),
    endDate: new Date()
  });
  const [showPreview, setShowPreview] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'daily',
      type: 'daily',
      name: 'Daily Summary',
      description: 'Automated end-of-day report with activity breakdown',
      icon: '📅',
      color: '#36A2EB'
    },
    {
      id: 'weekly',
      type: 'weekly',
      name: 'Weekly Report',
      description: 'Comprehensive weekly analysis with trends and insights',
      icon: '📊',
      color: '#4BC0C0'
    },
    {
      id: 'project',
      type: 'project',
      name: 'Project Report',
      description: 'Deep dive into specific project metrics and progress',
      icon: '📁',
      color: '#9966FF'
    },
    {
      id: 'custom',
      type: 'custom',
      name: 'Custom Report',
      description: 'Create a report with custom parameters and date range',
      icon: '⚙️',
      color: '#FF9F40'
    }
  ];

  const handleGenerateReport = async () => {
    if (!selectedReport) return;

    setIsGenerating(true);
    try {
      let params: any = {
        type: selectedReport.type,
        includeCharts: true,
        includeInsights: true
      };

      // Set date parameters based on report type
      switch (selectedReport.type) {
        case 'daily':
          params.startDate = new Date();
          params.startDate.setHours(0, 0, 0, 0);
          params.endDate = new Date();
          params.endDate.setHours(23, 59, 59, 999);
          break;
        
        case 'weekly':
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          params.startDate = weekStart;
          params.endDate = weekEnd;
          break;
        
        case 'custom':
          params.startDate = customDateRange.startDate;
          params.endDate = customDateRange.endDate;
          break;
      }

      const report = await dispatch(generateReport(params)).unwrap();
      setGeneratedReport(report);
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to generate report:', error);
      // Show error notification
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportReport = async (format: ExportFormat) => {
    if (!generatedReport) return;

    try {
      const exportPath = await dispatch(exportReport({ 
        report: generatedReport, 
        format 
      })).unwrap();
      
      // Show success notification with path
      console.log('Report exported to:', exportPath);
      setShowExportModal(false);
    } catch (error) {
      console.error('Failed to export report:', error);
      // Show error notification
    }
  };

  const renderReportTemplates = () => (
    <div className={styles.reportTemplates}>
      <h3>Report Types</h3>
      <div className={styles.templateGrid}>
        {reportTemplates.map((template) => (
          <div
            key={template.id}
            className={`${styles.templateCard} ${
              selectedReport?.id === template.id ? styles.selected : ''
            }`}
            onClick={() => setSelectedReport(template)}
            style={{ borderColor: template.color }}
          >
            <div className={styles.templateIcon}>{template.icon}</div>
            <div className={styles.templateInfo}>
              <h4>{template.name}</h4>
              <p>{template.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCustomParameters = () => {
    if (!selectedReport || selectedReport.type !== 'custom') return null;

    return (
      <div className={styles.customParameters}>
        <h3>Custom Parameters</h3>
        <div className={styles.dateRangePicker}>
          <div className={styles.dateInput}>
            <label>Start Date</label>
            <input
              type="date"
              value={customDateRange.startDate.toISOString().split('T')[0]}
              onChange={(e) => setCustomDateRange({
                ...customDateRange,
                startDate: new Date(e.target.value)
              })}
            />
          </div>
          <div className={styles.dateInput}>
            <label>End Date</label>
            <input
              type="date"
              value={customDateRange.endDate.toISOString().split('T')[0]}
              onChange={(e) => setCustomDateRange({
                ...customDateRange,
                endDate: new Date(e.target.value)
              })}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderRecentReports = () => (
    <div className={styles.recentReports}>
      <h3>Recent Reports</h3>
      <div className={styles.recentList}>
        <div className={styles.recentItem}>
          <div className={styles.recentIcon}>📅</div>
          <div className={styles.recentInfo}>
            <div className={styles.recentName}>Daily Summary - Today</div>
            <div className={styles.recentDate}>Generated 2 hours ago</div>
          </div>
          <button className={styles.viewBtn} onClick={() => {}}>
            View
          </button>
        </div>
        <div className={styles.recentItem}>
          <div className={styles.recentIcon}>📊</div>
          <div className={styles.recentInfo}>
            <div className={styles.recentName}>Weekly Report - Last Week</div>
            <div className={styles.recentDate}>Generated 3 days ago</div>
          </div>
          <button className={styles.viewBtn} onClick={() => {}}>
            View
          </button>
        </div>
      </div>
    </div>
  );

  const renderGenerateButton = () => (
    <div className={styles.generateSection}>
      <button
        className={styles.generateBtn}
        onClick={handleGenerateReport}
        disabled={!selectedReport || isGenerating}
        style={{ 
          backgroundColor: selectedReport?.color || '#36A2EB',
          opacity: (!selectedReport || isGenerating) ? 0.5 : 1
        }}
      >
        {isGenerating ? (
          <>
            <span className={styles.spinner}></span>
            Generating Report...
          </>
        ) : (
          <>
            Generate {selectedReport?.name || 'Report'}
          </>
        )}
      </button>
      
      {generatedReport && (
        <div className={styles.actionButtons}>
          <button 
            className={styles.previewBtn}
            onClick={() => setShowPreview(true)}
          >
            Preview
          </button>
          <button 
            className={styles.exportBtn}
            onClick={() => setShowExportModal(true)}
          >
            Export
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.reportsSection}>
      {renderReportTemplates()}
      {renderCustomParameters()}
      {renderGenerateButton()}
      {renderRecentReports()}

      {showPreview && generatedReport && (
        <ReportPreview
          report={generatedReport}
          onClose={() => setShowPreview(false)}
          onExport={() => setShowExportModal(true)}
        />
      )}

      {showExportModal && generatedReport && (
        <ReportExportModal
          report={generatedReport}
          onExport={handleExportReport}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};

export default ReportsSection;