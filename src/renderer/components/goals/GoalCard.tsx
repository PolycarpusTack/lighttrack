import React from 'react';
import { Goal, GoalProgress } from '@shared/types/goal';
import styles from './GoalCard.module.css';

interface GoalCardProps {
  goal: Goal & { progress?: GoalProgress };
  onEdit: () => void;
  onPause: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
  compact?: boolean;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onEdit,
  onPause,
  onDelete,
  onViewDetails,
  compact = false
}) => {
  const progress = goal.progress;
  const percentage = progress?.percentage || 0;
  const isCompleted = percentage >= 100;
  const isOverdue = goal.endDate && new Date(goal.endDate) < new Date() && !isCompleted;

  const formatTarget = (): string => {
    return `${goal.target.value} ${goal.target.unit}`;
  };

  const formatCurrent = (): string => {
    if (!progress) return '0';
    return `${Math.round(progress.current * 100) / 100}`;
  };

  const formatTimeRemaining = (): string => {
    if (!goal.endDate) return 'No deadline';
    
    const now = new Date();
    const end = new Date(goal.endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Overdue';
    
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 1) return '1 day left';
    if (days <= 7) return `${days} days left`;
    if (days <= 30) return `${Math.ceil(days / 7)} weeks left`;
    return `${Math.ceil(days / 30)} months left`;
  };

  const getStatusColor = (): string => {
    if (isCompleted) return 'var(--color-success)';
    if (isOverdue) return 'var(--color-error)';
    if (progress?.status === 'at_risk') return 'var(--color-warning)';
    if (progress?.status === 'behind') return 'var(--color-error)';
    return 'var(--accent-primary)';
  };

  const getStatusText = (): string => {
    if (isCompleted) return 'Completed';
    if (isOverdue) return 'Overdue';
    if (!progress) return 'Not started';
    
    switch (progress.status) {
      case 'on_track': return 'On track';
      case 'at_risk': return 'At risk';
      case 'behind': return 'Behind';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      default: return 'In progress';
    }
  };

  const getTypeIcon = (): string => {
    switch (goal.type) {
      case 'daily': return '📅';
      case 'weekly': return '📋';
      case 'project': return '🎯';
      case 'habit': return '🔄';
      default: return '📊';
    }
  };

  return (
    <div 
      className={`${styles.goalCard} ${compact ? styles.compact : ''} ${isCompleted ? styles.completed : ''} ${isOverdue ? styles.overdue : ''}`}
      onClick={onViewDetails}
    >
      <div className={styles.header}>
        <div className={styles.goalInfo}>
          <span className={styles.typeIcon}>{getTypeIcon()}</span>
          <div className={styles.nameSection}>
            <h3 className={styles.name}>{goal.name}</h3>
            <span className={styles.type}>{goal.type.charAt(0).toUpperCase() + goal.type.slice(1)} Goal</span>
          </div>
        </div>
        
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <button 
            className={styles.actionBtn}
            onClick={onEdit}
            title="Edit Goal"
          >
            ✏️
          </button>
          <button 
            className={styles.actionBtn}
            onClick={onPause}
            title={goal.isActive ? "Pause Goal" : "Resume Goal"}
          >
            {goal.isActive ? '⏸️' : '▶️'}
          </button>
          <button 
            className={styles.actionBtn}
            onClick={onDelete}
            title="Delete Goal"
          >
            🗑️
          </button>
        </div>
      </div>

      {goal.description && !compact && (
        <p className={styles.description}>{goal.description}</p>
      )}

      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={styles.progressText}>
            {formatCurrent()} / {formatTarget()}
          </span>
          <span className={styles.percentage}>
            {Math.round(percentage)}%
          </span>
        </div>
        
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ 
              width: `${Math.min(100, percentage)}%`,
              backgroundColor: getStatusColor()
            }}
          />
        </div>
      </div>

      {!compact && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Status</span>
            <span 
              className={styles.statValue}
              style={{ color: getStatusColor() }}
            >
              {getStatusText()}
            </span>
          </div>
          
          {progress && progress.streak > 0 && (
            <div className={styles.stat}>
              <span className={styles.statLabel}>Streak</span>
              <span className={styles.statValue}>
                🔥 {progress.streak} days
              </span>
            </div>
          )}
          
          <div className={styles.stat}>
            <span className={styles.statLabel}>Timeline</span>
            <span className={styles.statValue}>
              {formatTimeRemaining()}
            </span>
          </div>
        </div>
      )}

      {!compact && progress && progress.projectedCompletion && !isCompleted && (
        <div className={styles.projection}>
          <span className={styles.projectionLabel}>Projected completion:</span>
          <span className={styles.projectionDate}>
            {new Date(progress.projectedCompletion).toLocaleDateString()}
          </span>
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.period}>
          {goal.period === 'ongoing' ? 'Ongoing' : `Per ${goal.period}`}
        </span>
        <span className={styles.lastUpdated}>
          Updated {new Date(goal.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

export default GoalCard;