import React from 'react';
import { Pie, Line, Bar } from 'react-chartjs-2';
import { formatDuration, formatDate } from '../../utils/timeFormatters';
import styles from './ReportPreview.module.css';

interface ReportPreviewProps {
  report: any;
  onClose: () => void;
  onExport: () => void;
}

const ReportPreview: React.FC<ReportPreviewProps> = ({ report, onClose, onExport }) => {
  const renderChart = (chart: any) => {
    switch (chart.type) {
      case 'pie':
        return <Pie data={chart.data} options={{ responsive: true, maintainAspectRatio: false }} />;
      case 'line':
        return <Line data={chart.data} options={{ responsive: true, maintainAspectRatio: false }} />;
      case 'bar':
        return <Bar data={chart.data} options={{ responsive: true, maintainAspectRatio: false }} />;
      case 'calendar':
        return renderCalendarChart(chart.data);
      default:
        return null;
    }
  };

  const renderCalendarChart = (data: any) => {
    return (
      <div className={styles.calendarChart}>
        {data.map((day: any, index: number) => (
          <div 
            key={index}
            className={styles.calendarDay}
            style={{ 
              backgroundColor: getHeatmapColor(day.level),
              opacity: day.level > 0 ? 1 : 0.3
            }}
            title={day.tooltip}
          >
            <span className={styles.dayLabel}>
              {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })[0]}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const getHeatmapColor = (level: number): string => {
    const colors = ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];
    return colors[level] || colors[0];
  };

  return (
    <div className={styles.previewOverlay}>
      <div className={styles.previewContainer}>
        <div className={styles.previewHeader}>
          <h2>{getReportTitle(report.metadata.type)}</h2>
          <div className={styles.headerActions}>
            <button className={styles.exportBtn} onClick={onExport}>
              Export
            </button>
            <button className={styles.closeBtn} onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className={styles.previewContent}>
          {/* Metadata */}
          <div className={styles.metadata}>
            <p>Generated: {formatDate(new Date(report.metadata.generatedAt), 'long')}</p>
            {report.metadata.parameters.startDate && (
              <p>
                Period: {formatDate(new Date(report.metadata.parameters.startDate), 'medium')} - 
                {formatDate(new Date(report.metadata.parameters.endDate), 'medium')}
              </p>
            )}
          </div>

          {/* Summary */}
          <div className={styles.summarySection}>
            <h3>Summary</h3>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <label>Total Time</label>
                <value>{formatDuration(report.summary.totalTime)}</value>
              </div>
              <div className={styles.summaryItem}>
                <label>Productive Time</label>
                <value>{formatDuration(report.summary.productiveTime)}</value>
              </div>
              <div className={styles.summaryItem}>
                <label>Activities</label>
                <value>{report.summary.activityCount}</value>
              </div>
              <div className={styles.summaryItem}>
                <label>Projects</label>
                <value>{report.summary.projectCount}</value>
              </div>
              <div className={styles.summaryItem}>
                <label>Productivity</label>
                <value>{report.summary.productivityScore}%</value>
              </div>
              <div className={styles.summaryItem}>
                <label>Focus</label>
                <value>{report.summary.focusScore}%</value>
              </div>
            </div>
          </div>

          {/* Charts */}
          {report.charts && report.charts.length > 0 && (
            <div className={styles.chartsSection}>
              <h3>Visualizations</h3>
              <div className={styles.chartsGrid}>
                {report.charts.map((chart: any, index: number) => (
                  <div key={index} className={styles.chartContainer}>
                    <h4>{chart.title}</h4>
                    <div className={styles.chartWrapper}>
                      {renderChart(chart)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {report.insights && report.insights.length > 0 && (
            <div className={styles.insightsSection}>
              <h3>Insights & Recommendations</h3>
              <div className={styles.insightsList}>
                {report.insights.map((insight: any, index: number) => (
                  <div key={index} className={styles.insightItem}>
                    <h4>{insight.title}</h4>
                    <p>{insight.description}</p>
                    {insight.recommendations && insight.recommendations.length > 0 && (
                      <ul className={styles.recommendations}>
                        {insight.recommendations.map((rec: string, i: number) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Activities */}
          {report.details?.activities && report.details.activities.length > 0 && (
            <div className={styles.activitiesSection}>
              <h3>Top Activities</h3>
              <div className={styles.activitiesTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Activity</th>
                      <th>Project</th>
                      <th>Duration</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.details.activities
                      .slice(0, 10)
                      .map((activity: any, index: number) => (
                        <tr key={index}>
                          <td>{activity.name}</td>
                          <td>{activity.projectName}</td>
                          <td>{formatDuration(activity.duration)}</td>
                          <td>{formatDate(new Date(activity.startTime), 'short')}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getReportTitle = (type: string): string => {
  switch (type) {
    case 'daily':
      return 'Daily Summary Report';
    case 'weekly':
      return 'Weekly Analysis Report';
    case 'project':
      return 'Project Report';
    case 'custom':
      return 'Custom Report';
    default:
      return 'Report';
  }
};

export default ReportPreview;