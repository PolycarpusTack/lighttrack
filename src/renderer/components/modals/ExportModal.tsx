import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { exportActivities } from '../../store/slices/activitySlice';
import { showNotification } from '../../store/slices/uiSlice';
import { Activity } from '../../../shared/types/activity';
import { formatDuration, formatTime } from '../../../shared/utils/time';
import Modal from './Modal';
import styles from './ExportModal.module.css';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityIds: string[];
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  activityIds
}) => {
  const dispatch = useAppDispatch();
  const { todayActivities } = useAppSelector(state => state.activities);
  const [format, setFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeStats, setIncludeStats] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const selectedActivities = todayActivities.filter(activity => 
    activityIds.includes(activity.id)
  );

  const totalDuration = selectedActivities.reduce((sum, activity) => 
    sum + (activity.duration || 0), 0
  );

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const result = await dispatch(exportActivities({
        activityIds,
        format
      })).unwrap();

      dispatch(showNotification({
        type: 'success',
        title: 'Export Complete',
        message: `Successfully exported ${activityIds.length} activities to ${format.toUpperCase()}`
      }));

      // If we have a file path, we could trigger a download or show file location
      if (result.filePath) {
        // In a real app, this might open the file location or trigger a download
        console.log('Exported to:', result.filePath);
      }

      onClose();
    } catch (error) {
      dispatch(showNotification({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export activities. Please try again.'
      }));
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatDescription = () => {
    switch (format) {
      case 'csv':
        return 'Comma-separated values file. Good for importing into spreadsheet applications like Excel or Google Sheets.';
      case 'json':
        return 'JavaScript Object Notation file. Preserves all data structure and can be imported back into LightTrack.';
      case 'pdf':
        return 'Portable Document Format. Creates a formatted report suitable for sharing or printing.';
      default:
        return '';
    }
  };

  const getEstimatedFileSize = () => {
    const baseSize = selectedActivities.length * 0.5; // Rough estimate in KB
    switch (format) {
      case 'csv':
        return `~${Math.round(baseSize)}KB`;
      case 'json':
        return `~${Math.round(baseSize * 1.5)}KB`;
      case 'pdf':
        return `~${Math.round(baseSize * 3)}KB`;
      default:
        return 'Unknown';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Activities"
      size="medium"
    >
      <div className={styles.content}>
        <div className={styles.summary}>
          <h3 className={styles.summaryTitle}>Export Summary</h3>
          <div className={styles.summaryDetails}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Activities:</span>
              <span className={styles.summaryValue}>{selectedActivities.length}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Total Duration:</span>
              <span className={styles.summaryValue}>{formatDuration(totalDuration)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Date Range:</span>
              <span className={styles.summaryValue}>
                {selectedActivities.length > 0 ? (
                  <>
                    {formatTime(new Date(selectedActivities[selectedActivities.length - 1].startTime))} - {' '}
                    {formatTime(new Date(selectedActivities[0].startTime))}
                  </>
                ) : 'No activities'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.formatSection}>
          <h3 className={styles.sectionTitle}>Export Format</h3>
          <div className={styles.formatOptions}>
            {(['csv', 'json', 'pdf'] as const).map(formatOption => (
              <label key={formatOption} className={styles.formatOption}>
                <input
                  type="radio"
                  name="format"
                  value={formatOption}
                  checked={format === formatOption}
                  onChange={(e) => setFormat(e.target.value as 'csv' | 'json' | 'pdf')}
                  className={styles.radioInput}
                />
                <div className={styles.formatDetails}>
                  <div className={styles.formatName}>
                    {formatOption.toUpperCase()}
                    <span className={styles.formatSize}>{getEstimatedFileSize()}</span>
                  </div>
                  <div className={styles.formatDescription}>
                    {getFormatDescription()}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.optionsSection}>
          <h3 className={styles.sectionTitle}>Export Options</h3>
          <div className={styles.options}>
            <label className={styles.optionItem}>
              <input
                type="checkbox"
                checked={includeDetails}
                onChange={(e) => setIncludeDetails(e.target.checked)}
                className={styles.checkbox}
              />
              <div className={styles.optionInfo}>
                <div className={styles.optionName}>Include Activity Details</div>
                <div className={styles.optionDescription}>
                  Include descriptions, tags, and project information
                </div>
              </div>
            </label>
            
            <label className={styles.optionItem}>
              <input
                type="checkbox"
                checked={includeStats}
                onChange={(e) => setIncludeStats(e.target.checked)}
                className={styles.checkbox}
              />
              <div className={styles.optionInfo}>
                <div className={styles.optionName}>Include Statistics</div>
                <div className={styles.optionDescription}>
                  Add summary statistics and productivity metrics
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.exportButton}
            onClick={handleExport}
            disabled={isExporting || selectedActivities.length === 0}
          >
            {isExporting ? (
              <>
                <span className={styles.spinner}>⏳</span>
                Exporting...
              </>
            ) : (
              <>
                <span className={styles.icon}>📤</span>
                Export {format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportModal;