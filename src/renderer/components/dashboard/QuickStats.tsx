import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { formatDuration } from '@shared/utils/time';
import styles from './QuickStats.module.css';

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface QuickStatsProps {
  todayTotal: number;
  projectCount: number;
  productivityScore: number;
  breakCount: number;
}

const QuickStats: React.FC<QuickStatsProps> = ({
  todayTotal,
  projectCount,
  productivityScore,
  breakCount
}) => {
  const { todayActivities } = useAppSelector(state => state.activities);
  const { activeGoals } = useAppSelector(state => state.goals);
  
  // Calculate additional stats
  const [stats, setStats] = useState<StatCard[]>([]);

  useEffect(() => {
    // Calculate productivity score based on activities
    const calculateProductivityScore = () => {
      if (todayActivities.length === 0) return 0;
      
      // Calculate based on focused time vs total time
      const focusedTime = todayActivities
        .filter(a => !a.tags?.includes('break') && !a.tags?.includes('meeting'))
        .reduce((sum, a) => sum + (a.duration || 0), 0);
      
      const totalTime = todayActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
      
      return totalTime > 0 ? Math.round((focusedTime / totalTime) * 100) : 0;
    };

    // Count unique projects
    const countUniqueProjects = () => {
      const projectIds = new Set(todayActivities.map(a => a.projectId));
      return projectIds.size;
    };

    // Count breaks
    const countBreaks = () => {
      return todayActivities.filter(a => 
        a.tags?.includes('break') || 
        a.name?.toLowerCase().includes('break')
      ).length;
    };

    const updatedStats: StatCard[] = [
      {
        label: 'Today Total',
        value: formatDuration(todayTotal),
        icon: '⏱️',
        color: 'var(--accent-primary)',
        trend: {
          value: 12, // This would come from comparing with previous period
          isPositive: true
        }
      },
      {
        label: 'Active Projects',
        value: projectCount || countUniqueProjects(),
        icon: '📁',
        color: 'var(--color-info)',
        trend: {
          value: 2,
          isPositive: true
        }
      },
      {
        label: 'Productivity Score',
        value: `${productivityScore || calculateProductivityScore()}%`,
        icon: '📈',
        color: productivityScore >= 80 ? 'var(--color-success)' : 'var(--color-warning)',
        trend: {
          value: 5,
          isPositive: productivityScore >= 75
        }
      },
      {
        label: 'Breaks Taken',
        value: breakCount || countBreaks(),
        icon: '☕',
        color: 'var(--color-info)',
      }
    ];

    setStats(updatedStats);
  }, [todayActivities, todayTotal, projectCount, productivityScore, breakCount]);

  return (
    <div className={styles.statsGrid}>
      {stats.map((stat, index) => (
        <div key={index} className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statIcon} style={{ color: stat.color }}>
              {stat.icon}
            </span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
          
          <div className={styles.statValue} style={{ color: stat.color }}>
            {stat.value}
          </div>
          
          {stat.trend && (
            <div className={`${styles.statTrend} ${stat.trend.isPositive ? styles.positive : styles.negative}`}>
              <span className={styles.trendIcon}>
                {stat.trend.isPositive ? '↑' : '↓'}
              </span>
              <span className={styles.trendValue}>
                {Math.abs(stat.trend.value)}%
              </span>
              <span className={styles.trendLabel}>
                from last week
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default QuickStats;