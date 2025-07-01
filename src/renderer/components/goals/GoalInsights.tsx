import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { GoalInsight } from '@shared/types/goal';
import { fetchGoalInsights, removeExpiredInsights } from '../../store/slices/goalsSlice';
import styles from './GoalInsights.module.css';

interface GoalInsightsProps {
  goalId?: string; // If provided, show insights for specific goal
  limit?: number;
  showHeader?: boolean;
}

const GoalInsights: React.FC<GoalInsightsProps> = ({
  goalId,
  limit = 5,
  showHeader = true
}) => {
  const dispatch = useDispatch();
  const { insights, goals, progress, isLoading } = useSelector((state: RootState) => state.goals);
  const [refreshing, setRefreshing] = useState(false);

  // Filter insights by goal if goalId is provided
  const filteredInsights = goalId 
    ? insights.filter(insight => insight.goalId === goalId)
    : insights;

  const displayInsights = filteredInsights
    .sort((a, b) => {
      // Sort by priority first, then by date
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
    })
    .slice(0, limit);

  useEffect(() => {
    // Clean up expired insights on mount
    dispatch(removeExpiredInsights());
  }, [dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchGoalInsights()).unwrap();
    } catch (error) {
      console.error('Failed to refresh insights:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getInsightIcon = (type: GoalInsight['type']): string => {
    switch (type) {
      case 'suggestion': return '💡';
      case 'warning': return '⚠️';
      case 'celebration': return '🎉';
      case 'tip': return '💭';
      case 'milestone': return '🏆';
      default: return '📊';
    }
  };

  const getPriorityColor = (priority: GoalInsight['priority']): string => {
    switch (priority) {
      case 'high': return 'var(--color-error)';
      case 'medium': return 'var(--color-warning)';
      case 'low': return 'var(--color-success)';
      default: return 'var(--text-secondary)';
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  const getGoalName = (goalId: string): string => {
    const goal = goals.find(g => g.id === goalId);
    return goal ? goal.name : 'Unknown Goal';
  };

  if (displayInsights.length === 0 && !isLoading) {
    return (
      <div className={styles.emptyInsights}>
        <span className={styles.emptyIcon}>🤖</span>
        <h3>No Insights Available</h3>
        <p>
          {goalId 
            ? 'Continue working on this goal to get personalized insights and suggestions.'
            : 'Work on your goals to receive AI-powered insights and recommendations.'
          }
        </p>
        {!goalId && (
          <button className={styles.refreshButton} onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Generating...' : 'Generate Insights'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.goalInsights}>
      {showHeader && (
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h3 className={styles.title}>
              🤖 AI Insights
              {goalId && ` for ${getGoalName(goalId)}`}
            </h3>
            <span className={styles.subtitle}>
              Personalized recommendations based on your progress
            </span>
          </div>
          
          <button 
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            title="Refresh insights"
          >
            <span className={`${styles.refreshIcon} ${refreshing ? styles.spinning : ''}`}>
              🔄
            </span>
          </button>
        </div>
      )}

      <div className={styles.insightsList}>
        {displayInsights.map((insight) => (
          <div 
            key={insight.id} 
            className={`${styles.insightCard} ${styles[insight.priority]}`}
          >
            <div className={styles.insightHeader}>
              <div className={styles.insightMeta}>
                <span className={styles.insightIcon}>
                  {getInsightIcon(insight.type)}
                </span>
                <span className={styles.insightType}>
                  {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
                </span>
                <span 
                  className={styles.priorityBadge}
                  style={{ color: getPriorityColor(insight.priority) }}
                >
                  {insight.priority.toUpperCase()}
                </span>
              </div>
              
              <span className={styles.timestamp}>
                {formatTimeAgo(insight.generatedAt)}
              </span>
            </div>
            
            <div className={styles.insightContent}>
              <h4 className={styles.insightTitle}>{insight.title}</h4>
              <p className={styles.insightMessage}>{insight.message}</p>
              
              {!goalId && (
                <div className={styles.goalReference}>
                  <span className={styles.goalRefLabel}>Goal:</span>
                  <span className={styles.goalRefName}>
                    {getGoalName(insight.goalId)}
                  </span>
                </div>
              )}
              
              {insight.actionable && (
                <div className={styles.actionSuggestion}>
                  <span className={styles.actionIcon}>→</span>
                  <span className={styles.actionText}>
                    {insight.actionable}
                  </span>
                </div>
              )}
              
              {insight.data && (
                <div className={styles.insightData}>
                  {Object.entries(insight.data).map(([key, value]) => (
                    <div key={key} className={styles.dataItem}>
                      <span className={styles.dataKey}>
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                      </span>
                      <span className={styles.dataValue}>
                        {typeof value === 'number' && key.includes('percentage') 
                          ? `${value.toFixed(1)}%`
                          : String(value)
                        }
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {filteredInsights.length > limit && (
        <div className={styles.showMore}>
          <span className={styles.moreCount}>
            +{filteredInsights.length - limit} more insights available
          </span>
        </div>
      )}
    </div>
  );
};

export default GoalInsights;