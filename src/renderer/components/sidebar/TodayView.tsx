import React, { useState, useMemo } from 'react';
import { Activity } from '@shared/types/activity';
import { DailyStats } from '../../store/slices/analyticsSlice';
import { formatDuration, formatTime } from '../../utils/timeFormatters';
import QuickStartModal from './QuickStartModal';
import styles from './TodayView.module.css';

interface TodayViewProps {
  activities: Activity[];
  stats: DailyStats | null;
  onStartActivity: (name: string, projectId: string) => void;
  isLoading: boolean;
}

interface QuickAction {
  name: string;
  projectId: string;
  icon: string;
  color: string;
}

const TodayView: React.FC<TodayViewProps> = ({ 
  activities, 
  stats, 
  onStartActivity,
  isLoading 
}) => {
  const [showQuickStart, setShowQuickStart] = useState(false);

  // Default quick actions - can be customized by user
  const quickActions: QuickAction[] = [
    { name: 'Coding', projectId: 'default', icon: '💻', color: '#36A2EB' },
    { name: 'Meeting', projectId: 'default', icon: '🤝', color: '#FF6384' },
    { name: 'Break', projectId: 'break', icon: '☕', color: '#4BC0C0' },
    { name: 'Planning', projectId: 'default', icon: '📋', color: '#9966FF' }
  ];

  // Calculate summary stats
  const todaySummary = useMemo(() => {
    if (!stats) {
      return {
        totalTime: 0,
        productiveTime: 0,
        breakTime: 0,
        productivityScore: 0,
        focusScore: 0,
        activityCount: 0
      };
    }

    return {
      totalTime: stats.totalTime,
      productiveTime: stats.productiveTime || stats.totalTime - (stats.breakTime || 0),
      breakTime: stats.breakTime || 0,
      productivityScore: stats.productivityScore,
      focusScore: stats.focusScore,
      activityCount: stats.activityCount
    };
  }, [stats]);

  // Get recent activities (last 10)
  const recentActivities = useMemo(() => {
    return activities
      .slice(0, 10)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [activities]);

  // Group activities by project for quick stats
  const projectStats = useMemo(() => {
    const projectMap = new Map<string, { time: number; count: number }>();
    
    activities.forEach(activity => {
      const projectId = activity.projectId || 'No Project';
      const current = projectMap.get(projectId) || { time: 0, count: 0 };
      projectMap.set(projectId, {
        time: current.time + (activity.duration || 0),
        count: current.count + 1
      });
    });

    return Array.from(projectMap.entries())
      .map(([projectId, stats]) => ({ projectId, ...stats }))
      .sort((a, b) => b.time - a.time);
  }, [activities]);

  const handleQuickAction = (action: QuickAction) => {
    onStartActivity(action.name, action.projectId);
  };

  const renderSummaryCard = () => (
    <div className={styles.summaryCard}>
      <h3>Today's Summary</h3>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>Total Time</div>
          <div className={styles.summaryValue}>
            {formatDuration(todaySummary.totalTime)}
          </div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>Productive</div>
          <div className={styles.summaryValue}>
            {formatDuration(todaySummary.productiveTime)}
          </div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>Breaks</div>
          <div className={styles.summaryValue}>
            {formatDuration(todaySummary.breakTime)}
          </div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>Activities</div>
          <div className={styles.summaryValue}>
            {todaySummary.activityCount}
          </div>
        </div>
      </div>
      
      <div className={styles.scoreContainer}>
        <div className={styles.scoreItem}>
          <div className={styles.scoreLabel}>Productivity</div>
          <div className={styles.scoreBar}>
            <div 
              className={styles.scoreProgress}
              style={{ 
                width: `${todaySummary.productivityScore}%`,
                backgroundColor: getScoreColor(todaySummary.productivityScore)
              }}
            />
          </div>
          <div className={styles.scoreValue}>{todaySummary.productivityScore}%</div>
        </div>
        <div className={styles.scoreItem}>
          <div className={styles.scoreLabel}>Focus</div>
          <div className={styles.scoreBar}>
            <div 
              className={styles.scoreProgress}
              style={{ 
                width: `${todaySummary.focusScore}%`,
                backgroundColor: getScoreColor(todaySummary.focusScore)
              }}
            />
          </div>
          <div className={styles.scoreValue}>{todaySummary.focusScore}%</div>
        </div>
      </div>
    </div>
  );

  const renderQuickActions = () => (
    <div className={styles.quickActions}>
      <div className={styles.quickActionsHeader}>
        <h3>Quick Actions</h3>
        <button 
          className={styles.customizeBtn}
          onClick={() => setShowQuickStart(true)}
          title="Customize quick actions"
        >
          ⚙️
        </button>
      </div>
      <div className={styles.actionGrid}>
        {quickActions.map((action, index) => (
          <button
            key={index}
            className={styles.actionButton}
            onClick={() => handleQuickAction(action)}
            style={{ borderColor: action.color }}
          >
            <span className={styles.actionIcon}>{action.icon}</span>
            <span className={styles.actionName}>{action.name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderRecentActivities = () => (
    <div className={styles.recentActivities}>
      <h3>Recent Activities</h3>
      {recentActivities.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No activities tracked today</p>
          <button 
            className={styles.startTrackingBtn}
            onClick={() => setShowQuickStart(true)}
          >
            Start Tracking
          </button>
        </div>
      ) : (
        <div className={styles.activityList}>
          {recentActivities.map((activity) => (
            <div key={activity.id} className={styles.activityItem}>
              <div className={styles.activityInfo}>
                <div className={styles.activityName}>{activity.name}</div>
                <div className={styles.activityProject}>
                  {activity.projectId || 'No Project'}
                </div>
              </div>
              <div className={styles.activityMeta}>
                <div className={styles.activityTime}>
                  {formatTime(new Date(activity.startTime))}
                </div>
                <div className={styles.activityDuration}>
                  {formatDuration(activity.duration || 0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProjectBreakdown = () => {
    if (projectStats.length === 0) return null;

    return (
      <div className={styles.projectBreakdown}>
        <h3>Time by Project</h3>
        <div className={styles.projectList}>
          {projectStats.slice(0, 5).map(({ projectId, time, count }) => (
            <div key={projectId} className={styles.projectItem}>
              <div className={styles.projectName}>{projectId}</div>
              <div className={styles.projectStats}>
                <span className={styles.projectTime}>{formatDuration(time)}</span>
                <span className={styles.projectCount}>({count} activities)</span>
              </div>
              <div className={styles.projectBar}>
                <div 
                  className={styles.projectProgress}
                  style={{ 
                    width: `${(time / todaySummary.totalTime) * 100}%` 
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.todayView}>
        <div className={styles.loading}>Loading today's data...</div>
      </div>
    );
  }

  return (
    <div className={styles.todayView}>
      {renderSummaryCard()}
      {renderQuickActions()}
      {renderProjectBreakdown()}
      {renderRecentActivities()}
      
      {showQuickStart && (
        <QuickStartModal
          onClose={() => setShowQuickStart(false)}
          onStart={(name, projectId) => {
            onStartActivity(name, projectId);
            setShowQuickStart(false);
          }}
        />
      )}
    </div>
  );
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#4BC0C0';
  if (score >= 60) return '#36A2EB';
  if (score >= 40) return '#FFCE56';
  return '#FF6384';
};

export default TodayView;