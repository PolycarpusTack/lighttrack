import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import EditorTabs from '../components/common/EditorTabs';
import { RootState, AppDispatch } from '../store';
import {
  fetchTodayStats,
  fetchWeeklyStats,
  fetchTimeInsights,
  fetchRecommendations,
  fetchProjectDistribution,
  clearError,
  DailyStats,
  WeeklyStats,
  TimeInsight
} from '../store/slices/analyticsSlice';
import styles from './Analytics.module.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Analytics: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    todayStats,
    weeklyStats,
    projectDistribution,
    insights,
    recommendations,
    isLoading,
    error,
    cacheStatus
  } = useSelector((state: RootState) => state.analytics);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'insights'>('overview');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', route: '/' },
    { id: 'timeline', label: 'Timeline', route: '/timeline' },
    { id: 'analytics', label: 'Analytics', route: '/analytics', active: true }
  ];

  // Load analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, dispatch]);

  const loadAnalyticsData = async () => {
    try {
      const now = new Date();
      
      if (timeRange === 'today') {
        dispatch(fetchTodayStats());
      } else if (timeRange === 'week') {
        dispatch(fetchWeeklyStats());
      }

      // Load project distribution for enhanced pie chart
      dispatch(fetchProjectDistribution({ 
        timeRange: timeRange as 'today' | 'week' | 'month'
      }));

      // Load insights and recommendations
      const startDate = new Date();
      if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setDate(startDate.getDate() - 30);
      }

      dispatch(fetchTimeInsights({ startDate, endDate: now }));
      dispatch(fetchRecommendations({ startDate, endDate: now }));
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    }
  };

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      if (error) {
        dispatch(clearError());
      }
    };
  }, [error, dispatch]);

  // Enhanced Time by Project Pie Chart Data with percentages and activity counts
  const projectTimeData = useMemo(() => {
    // Prefer enhanced project distribution data when available
    if (projectDistribution && projectDistribution.length > 0) {
      const labels = projectDistribution.map(p => 
        p.projectName || `Project ${p.projectId.substring(0, 8)}...`
      );
      const data = projectDistribution.map(p => p.totalTime);
      const percentages = projectDistribution.map(p => p.percentage);
      const activityCounts = projectDistribution.map(p => p.activityCount);
      
      const colors = projectDistribution.map(p => 
        p.color || '#FF6384'
      );

      return {
        labels: labels.map((label, index) => 
          `${label} (${percentages[index]}% - ${activityCounts[index]} activities)`
        ),
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 2,
          // Store metadata for tooltip customization
          projectStats: projectDistribution
        }]
      };
    }
    
    // Fallback to legacy calculation from daily/weekly stats
    const projectTimes: { [key: string]: number } = {};
    
    if (timeRange === 'today' && todayStats) {
      Object.entries(todayStats.projectBreakdown).forEach(([projectId, time]) => {
        projectTimes[projectId] = time;
      });
    } else if (timeRange === 'week' && weeklyStats) {
      weeklyStats.dailyStats.forEach(day => {
        Object.entries(day.projectBreakdown).forEach(([projectId, time]) => {
          projectTimes[projectId] = (projectTimes[projectId] || 0) + time;
        });
      });
    }

    const labels = Object.keys(projectTimes);
    const data = Object.values(projectTimes);
    const totalTime = data.reduce((sum, time) => sum + time, 0);
    
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ];

    return {
      labels: labels.map((label, index) => {
        const percentage = totalTime > 0 ? Math.round((data[index] / totalTime) * 100) : 0;
        return `${label.substring(0, 8)}... (${percentage}%)`;
      }),
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 2
      }]
    };
  }, [projectDistribution, todayStats, weeklyStats, timeRange]);

  // Enhanced Productivity Trend Line Chart Data with Goal Progress
  const productivityTrendData = useMemo(() => {
    const labels: string[] = [];
    const productivityData: number[] = [];
    const focusData: number[] = [];
    const goalProgressData: number[] = [];

    if (timeRange === 'week' && weeklyStats) {
      weeklyStats.dailyStats.forEach(day => {
        labels.push(new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }));
        productivityData.push(day.productivityScore);
        focusData.push(day.focusScore);
        
        // Calculate daily goal progress (assume 8 hours daily goal)
        const dailyGoal = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
        const dailyProgress = Math.min((day.totalTime / dailyGoal) * 100, 100);
        goalProgressData.push(dailyProgress);
      });
    } else if (timeRange === 'today' && todayStats) {
      // For today, show current status
      labels.push('Today');
      productivityData.push(todayStats.productivityScore);
      focusData.push(todayStats.focusScore);
      
      const dailyGoal = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
      const dailyProgress = Math.min((todayStats.totalTime / dailyGoal) * 100, 100);
      goalProgressData.push(dailyProgress);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Productivity Score',
          data: productivityData,
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'Focus Score',
          data: focusData,
          borderColor: '#4BC0C0',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'Goal Progress (%)',
          data: goalProgressData,
          borderColor: '#FF9F40',
          backgroundColor: 'rgba(255, 159, 64, 0.1)',
          tension: 0.4,
          fill: false,
          borderDash: [5, 5],
          yAxisID: 'y1'
        }
      ]
    };
  }, [todayStats, weeklyStats, timeRange]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Productivity & Goal Progress Analytics'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            
            if (context.dataset.label === 'Goal Progress (%)') {
              label += Math.round(context.parsed.y) + '%';
            } else {
              label += Math.round(context.parsed.y);
            }
            
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time Period'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Score (0-100)'
        },
        min: 0,
        max: 100
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Goal Progress (%)'
        },
        min: 0,
        max: 100,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  // Pie chart options with enhanced tooltips
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 15,
          padding: 15,
          usePointStyle: true
        }
      },
      title: {
        display: true,
        text: 'Time Distribution by Project'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const dataset = context.dataset;
            const projectStats = dataset.projectStats;
            
            if (projectStats && projectStats[context.dataIndex]) {
              const stats = projectStats[context.dataIndex];
              return [
                `${stats.projectName || stats.projectId}: ${formatTime(stats.totalTime)}`,
                `${stats.percentage}% of total time`,
                `${stats.activityCount} activities`,
                `Avg: ${formatTime(stats.averageActivityDuration)}/activity`
              ];
            }
            
            // Fallback for legacy data
            const label = context.label || '';
            const value = formatTime(context.parsed);
            return `${label}: ${value}`;
          }
        }
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const renderOverviewTab = () => (
    <div className={styles.analyticsOverview}>
      <div className={styles.analyticsHeader}>
        <div className={styles.timeRangeSelector}>
          <button 
            className={timeRange === 'today' ? styles.active : ''}
            onClick={() => setTimeRange('today')}
          >
            Today
          </button>
          <button 
            className={timeRange === 'week' ? styles.active : ''}
            onClick={() => setTimeRange('week')}
          >
            This Week
          </button>
          <button 
            className={timeRange === 'month' ? styles.active : ''}
            onClick={() => setTimeRange('month')}
          >
            This Month
          </button>
        </div>
      </div>

      <div className={styles.analyticsGrid}>
        <div className={styles.chartContainer}>
          <h3>Time by Project</h3>
          <div className={styles.chartWrapper}>
            <Pie data={projectTimeData} options={pieChartOptions} />
          </div>
        </div>

        <div className={styles.chartContainer}>
          <h3>Productivity Trend</h3>
          <div className={styles.chartWrapper}>
            <Line data={productivityTrendData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className={styles.statsSummary}>
        {timeRange === 'today' && todayStats && (
          <div className={styles.statCard}>
            <h4>Today's Summary</h4>
            <p>Total Time: {formatTime(todayStats.totalTime)}</p>
            <p>Productivity Score: {todayStats.productivityScore}/100</p>
            <p>Focus Score: {todayStats.focusScore}/100</p>
          </div>
        )}
        
        {timeRange === 'week' && weeklyStats && (
          <div className={styles.statCard}>
            <h4>Weekly Summary</h4>
            <p>Total Time: {formatTime(weeklyStats.totalTime)}</p>
            <p>Average Productivity: {Math.round(weeklyStats.averageProductivity)}/100</p>
            <p>Average Focus: {Math.round(weeklyStats.averageFocus)}/100</p>
            <p>Consistency Score: {Math.round(weeklyStats.consistencyScore)}/100</p>
            <p>Weekly Goal Progress: {Math.round(weeklyStats.weeklyGoalProgress)}%</p>
            <p>Total Activities: {weeklyStats.totalActivities}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTrendsTab = () => (
    <div className={styles.analyticsTrends}>
      <div className={styles.trendCharts}>
        <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
          <h3>Productivity & Focus Trends</h3>
          <div className={`${styles.chartWrapper} ${styles.large}`}>
            <Line data={productivityTrendData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderInsightsTab = () => (
    <div className={styles.analyticsInsights}>
      <div className={styles.insightsGrid}>
        {insights.map((insight, index) => (
          <div key={index} className={styles.insightCard}>
            <h4>{insight.title}</h4>
            <p>{insight.description}</p>
            <div className={styles.insightValue}>
              {insight.value} {insight.unit}
            </div>
            {insight.recommendations.length > 0 && (
              <div className={styles.recommendations}>
                <h5>Recommendations:</h5>
                <ul>
                  {insight.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {recommendations.length > 0 && (
        <div className={styles.generalRecommendations}>
          <h3>General Recommendations</h3>
          <ul>
            {recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.analyticsPage}>
      <EditorTabs tabs={tabs} />
      
      <div className={styles.analyticsContent}>
        <div className={styles.analyticsNav}>
          <button 
            className={activeTab === 'overview' ? styles.active : ''}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={activeTab === 'trends' ? styles.active : ''}
            onClick={() => setActiveTab('trends')}
          >
            Trends
          </button>
          <button 
            className={activeTab === 'insights' ? styles.active : ''}
            onClick={() => setActiveTab('insights')}
          >
            Insights
          </button>
        </div>

        <div className={styles.analyticsBody}>
          {isLoading ? (
            <div className={styles.loading}>Loading analytics data...</div>
          ) : error ? (
            <div className={styles.error}>
              Error loading analytics: {error}
              <button onClick={loadAnalyticsData}>Retry</button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'trends' && renderTrendsTab()}
              {activeTab === 'insights' && renderInsightsTab()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;