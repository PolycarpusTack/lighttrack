import React from 'react';
import { Achievement } from '@shared/types/goal';
import styles from './AchievementBadge.module.css';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  onClick?: () => void;
  earned?: boolean;
  progress?: number; // For upcoming achievements
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  size = 'medium',
  showDetails = true,
  onClick,
  earned = true,
  progress
}) => {
  const formatEarnedDate = (): string => {
    return new Date(achievement.earnedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTypeDisplayName = (): string => {
    switch (achievement.type) {
      case 'goal_completed': return 'Goal Master';
      case 'streak_milestone': return 'Streak Champion';
      case 'time_milestone': return 'Time Warrior';
      case 'consistency_badge': return 'Consistency Pro';
      case 'improvement_badge': return 'Growth Mindset';
      case 'first_goal': return 'Goal Starter';
      case 'productive_week': return 'Productivity Beast';
      case 'early_bird': return 'Early Riser';
      case 'night_owl': return 'Night Worker';
      default: return 'Achiever';
    }
  };

  const getRarityLevel = (): 'common' | 'rare' | 'epic' | 'legendary' => {
    switch (achievement.type) {
      case 'first_goal':
        return 'common';
      case 'goal_completed':
      case 'consistency_badge':
        return 'rare';
      case 'streak_milestone':
        if (achievement.value && achievement.value >= 100) return 'legendary';
        if (achievement.value && achievement.value >= 30) return 'epic';
        return 'rare';
      case 'time_milestone':
        if (achievement.value && achievement.value >= 1000) return 'legendary';
        if (achievement.value && achievement.value >= 100) return 'epic';
        return 'rare';
      case 'improvement_badge':
      case 'productive_week':
        return 'epic';
      case 'early_bird':
      case 'night_owl':
        return 'rare';
      default:
        return 'common';
    }
  };

  const getRarityColor = (): string => {
    const rarity = getRarityLevel();
    switch (rarity) {
      case 'common': return '#94a3b8';
      case 'rare': return '#3b82f6';
      case 'epic': return '#8b5cf6';
      case 'legendary': return '#f59e0b';
      default: return achievement.color;
    }
  };

  const getProgressBar = () => {
    if (!progress || earned) return null;
    
    return (
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    );
  };

  return (
    <div 
      className={`
        ${styles.achievementBadge} 
        ${styles[size]} 
        ${styles[getRarityLevel()]}
        ${!earned ? styles.unearned : ''}
        ${onClick ? styles.clickable : ''}
      `}
      onClick={onClick}
      style={{ '--achievement-color': getRarityColor() } as React.CSSProperties}
    >
      <div className={styles.badgeInner}>
        <div className={styles.iconContainer}>
          <span className={styles.icon}>{achievement.icon}</span>
          {getRarityLevel() === 'legendary' && (
            <div className={styles.legendaryGlow} />
          )}
        </div>

        {showDetails && (
          <div className={styles.details}>
            <div className={styles.header}>
              <h4 className={styles.name}>{achievement.name}</h4>
              <span className={styles.type}>{getTypeDisplayName()}</span>
            </div>

            <p className={styles.description}>{achievement.description}</p>

            {achievement.value && earned && (
              <div className={styles.value}>
                {achievement.type === 'streak_milestone' && `${achievement.value} days`}
                {achievement.type === 'time_milestone' && `${achievement.value} hours`}
                {achievement.type === 'improvement_badge' && `${achievement.value}% improvement`}
              </div>
            )}

            {getProgressBar()}

            {earned && (
              <div className={styles.earnedInfo}>
                <span className={styles.earnedDate}>
                  Earned {formatEarnedDate()}
                </span>
                <span className={styles.rarity}>{getRarityLevel().toUpperCase()}</span>
              </div>
            )}
          </div>
        )}

        {!showDetails && earned && (
          <div className={styles.compactInfo}>
            <span className={styles.compactName}>{achievement.name}</span>
            {achievement.value && (
              <span className={styles.compactValue}>
                {achievement.type === 'streak_milestone' && `${achievement.value}d`}
                {achievement.type === 'time_milestone' && `${achievement.value}h`}
              </span>
            )}
          </div>
        )}

        {achievement.isRecent?.() && (
          <div className={styles.newBadge}>NEW!</div>
        )}
      </div>
    </div>
  );
};

export default AchievementBadge;