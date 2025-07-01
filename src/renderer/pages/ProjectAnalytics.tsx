import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { Pie, Line, Bar } from 'react-chartjs-2';
import {
  fetchProjectStats,
  fetchProjectTrends,
  fetchActivityHeatmap,
  fetchBudgetAnalysis
} from '../store/slices/projectAnalyticsSlice';
import ActivityHeatmap from '../components/analytics/ActivityHeatmap';
import BudgetTracker from '../components/analytics/BudgetTracker';
import ProjectTimeCard from '../components/analytics/ProjectTimeCard';
import TrendChart from '../components/analytics/TrendChart';
import styles from './ProjectAnalytics.module.css';

type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all';

const ProjectAnalytics: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [trendInterval, setTrendInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  const { 
    projects,
    currentProject 
  } = useSelector((state: RootState) => state.projects);
  
  const {
    stats,
    trends,
    heatmapData,
    budgetAnalysis,
    isLoading,
    error
  } = useSelector((state: RootState) => state.projectAnalytics);

  const project = projects.find(p => p.id === projectId);

  useEffect(() => {
    if (projectId) {
      loadAnalyticsData();
    }
  }, [projectId, timeRange, trendInterval]);

  const loadAnalyticsData = () => {
    if (!projectId) return;

    dispatch(fetchProjectStats(projectId));
    dispatch(fetchProjectTrends({ 
      projectId, 
      days: getDaysForRange(timeRange),
      interval: trendInterval 
    }));
    dispatch(fetchActivityHeatmap({ projectId, days: 365 }));
    
    if (project?.settings.billable) {
      dispatch(fetchBudgetAnalysis(projectId));
    }
  };

  const getDaysForRange = (range: TimeRange): number => {
    switch (range) {
      case 'today': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'year': return 365;
      case 'all': return 9999;
    }
  };

  const renderHeader = () => (
    <div className={styles.header}>
      <div className={styles.headerInfo}>
        <button 
          className={styles.backBtn}
          onClick={() => window.history.back()}
        >
          ← Back
        </button>
        <h1>
          <span 
            className={styles.projectColor}
            style={{ backgroundColor: project?.color }}
          />
          {project?.icon && <span className={styles.projectIcon}>{project.icon}</span>}
          {project?.name || 'Project'} Analytics
        </h1>
      </div>

      <div className={styles.headerControls}>
        <div className={styles.timeRangeSelector}>
          {(['today', 'week', 'month', 'year', 'all'] as TimeRange[]).map(range => (
            <button
              key={range}
              className={timeRange === range ? styles.active : ''}
              onClick={() => setTimeRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTimeStats = () => {
    if (!stats) return null;

    return (
      <div className={styles.statsGrid}>
        <ProjectTimeCard
          title="Total Time"
          value={stats.totalTime}
          format="duration"
          icon="⏱️"
          color="#36A2EB"
        />
        <ProjectTimeCard
          title="Today"
          value={stats.todayTime}
          format="duration"
          icon="📅"
          color="#4BC0C0"
        />
        <ProjectTimeCard
          title="This Week"
          value={stats.weekTime}
          format="duration"
          icon="📊"
          color="#9966FF"
        />
        <ProjectTimeCard
          title="This Month"
          value={stats.monthTime}
          format="duration"
          icon="📈"
          color="#FF9F40"
        />
        <ProjectTimeCard
          title="Activities"
          value={stats.activityCount}
          format="number"
          icon="🎯"
          color="#FF6384"
        />
        <ProjectTimeCard
          title="Avg Session"
          value={stats.averageSessionLength}
          format="duration"
          icon="⏳"
          color="#FFCE56"
        />
      </div>
    );
  };

  const renderTrends = () => {
    if (!trends || trends.length === 0) return null;

    const chartData = {
      labels: trends.map(t => formatDateLabel(t.date, trendInterval)),
      datasets: [
        {
          label: 'Time Tracked',
          data: trends.map(t => t.time / (1000 * 60 * 60)), // Convert to hours
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          yAxisID: 'y',
          tension: 0.4
        },
        {
          label: 'Productivity Score',
          data: trends.map(t => t.productivity),
          borderColor: '#4BC0C0',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          yAxisID: 'y1',
          tension: 0.4
        }
      ]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      scales: {
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: {
            display: true,
            text: 'Hours'
          }
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Productivity %'
          },
          min: 0,
          max: 100,
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    };

    return (
      <div className={styles.trendsSection}>
        <div className={styles.sectionHeader}>
          <h2>Activity Trends</h2>
          <div className={styles.intervalSelector}>
            <button
              className={trendInterval === 'daily' ? styles.active : ''}
              onClick={() => setTrendInterval('daily')}
            >
              Daily
            </button>
            <button
              className={trendInterval === 'weekly' ? styles.active : ''}
              onClick={() => setTrendInterval('weekly')}
            >
              Weekly
            </button>
            <button
              className={trendInterval === 'monthly' ? styles.active : ''}
              onClick={() => setTrendInterval('monthly')}
            >
              Monthly
            </button>
          </div>
        </div>
        <div className={styles.chartContainer}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    );
  };

  const renderHeatmap = () => {
    if (!heatmapData) return null;

    return (
      <div className={styles.heatmapSection}>
        <h2>Activity Heatmap</h2>
        <ActivityHeatmap
          data={heatmapData}
          onCellClick={(cell) => {
            // Navigate to specific day
            console.log('Cell clicked:', cell);
          }}
        />
        <div className={styles.heatmapLegend}>
          <span>Less</span>
          <div className={styles.legendScale}>
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className={styles.legendCell}
                style={{ backgroundColor: getHeatmapColor(level) }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    );
  };

  const renderBudgetTracking = () => {
    if (!project?.settings.billable || !budgetAnalysis) return null;

    return (
      <div className={styles.budgetSection}>
        <h2>Budget & Earnings</h2>
        <BudgetTracker
          analysis={budgetAnalysis}
          onUpdateBudget={(newBudget) => {
            // Update project budget
            console.log('Update budget:', newBudget);
          }}
        />
      </div>
    );
  };

  const renderInsights = () => {
    const insights = [];

    if (stats) {
      // Most productive day
      if (stats.todayTime > stats.averageSessionLength * 2) {
        insights.push({
          type: 'positive',
          icon: '🎯',
          text: 'Great progress today! You\'ve tracked more than usual.'
        });
      }

      // Low activity warning
      if (stats.weekTime < 10 * 60 * 60 * 1000) { // Less than 10 hours this week
        insights.push({
          type: 'warning',
          icon: '⚠️',
          text: 'Activity is lower than usual this week. Consider scheduling focused work time.'
        });
      }

      // Consistency
      if (trends && trends.length > 7) {
        const recentTrends = trends.slice(-7);
        const consistentDays = recentTrends.filter(t => t.time > 0).length;
        if (consistentDays >= 5) {
          insights.push({
            type: 'positive',
            icon: '🔥',
            text: `${consistentDays}-day streak! Keep up the consistent work.`
          });
        }
      }
    }

    if (insights.length === 0) return null;

    return (
      <div className={styles.insightsSection}>
        <h2>Insights</h2>
        <div className={styles.insightsList}>
          {insights.map((insight, index) => (
            <div 
              key={index} 
              className={`${styles.insight} ${styles[insight.type]}`}
            >
              <span className={styles.insightIcon}>{insight.icon}</span>
              <span className={styles.insightText}>{insight.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.projectAnalytics}>
        <div className={styles.loading}>Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.projectAnalytics}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.projectAnalytics}>
      {renderHeader()}
      
      <div className={styles.content}>
        {renderTimeStats()}
        {renderTrends()}
        {renderInsights()}
        {renderHeatmap()}
        {renderBudgetTracking()}
      </div>
    </div>
  );
};

const formatDateLabel = (date: string, interval: 'daily' | 'weekly' | 'monthly'): string => {
  const d = new Date(date);
  
  switch (interval) {
    case 'daily':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'weekly':
      return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'monthly':
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
};

const getHeatmapColor = (level: number): string => {
  const colors = ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];
  return colors[level] || colors[0];
};

export default ProjectAnalytics;