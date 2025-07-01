import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Goal, GoalProgress, Achievement } from '@shared/types/goal';
import Modal from '../modals/Modal';
import ProgressRing from './ProgressRing';
import StreakDisplay from './StreakDisplay';
import AchievementBadge from './AchievementBadge';
import styles from './GoalDetailsModal.module.css';

interface GoalDetailsModalProps {
  goal: Goal;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPause: () => void;
  onResume: () => void;
}

const GoalDetailsModal: React.FC<GoalDetailsModalProps> = ({
  goal,
  onClose,
  onEdit,
  onDelete,
  onPause,
  onResume
}) => {
  const { progress, achievements } = useSelector((state: RootState) => state.goals);
  const { projects } = useSelector((state: RootState) => state.projects);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'achievements'>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const goalProgress = progress[goal.id];
  const goalAchievements = achievements.filter(a => a.goalId === goal.id);
  const relatedProject = goal.projectId ? projects.find(p => p.id === goal.projectId) : null;

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTypeDisplayName = (): string => {
    switch (goal.type) {
      case 'daily': return 'Daily Goal';
      case 'weekly': return 'Weekly Goal';
      case 'project': return 'Project Goal';
      case 'habit': return 'Habit Goal';
      default: return 'Goal';
    }
  };

  const getStatusBadge = () => {
    if (!goal.isActive) {
      return <span className={`${styles.statusBadge} ${styles.paused}`}>Paused</span>;
    }
    
    if (!goalProgress) {
      return <span className={`${styles.statusBadge} ${styles.notStarted}`}>Not Started</span>;
    }
    
    if (goalProgress.percentage >= 100) {
      return <span className={`${styles.statusBadge} ${styles.completed}`}>Completed</span>;
    }
    
    if (goalProgress.percentage > 50) {
      return <span className={`${styles.statusBadge} ${styles.onTrack}`}>On Track</span>;
    }
    
    return <span className={`${styles.statusBadge} ${styles.behindGoal}`}>Behind Goal</span>;
  };

  const renderOverviewTab = () => (
    <div className={styles.overviewTab}>
      <div className={styles.goalInfo}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2 className={styles.goalName}>{goal.name}</h2>
            <div className={styles.metaInfo}>
              <span className={styles.goalType}>{getTypeDisplayName()}</span>
              {getStatusBadge()}
            </div>
          </div>
          
          {goalProgress && (
            <div className={styles.progressSection}>
              <ProgressRing 
                progress={goalProgress.percentage} 
                size={80} 
                strokeWidth={6}
                showLabel={true}
              />
            </div>
          )}
        </div>
        
        {goal.description && (
          <p className={styles.description}>{goal.description}</p>
        )}
        
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Target</span>
            <span className={styles.detailValue}>
              {goal.target.comparison === 'minimum' && 'At least '}
              {goal.target.comparison === 'maximum' && 'At most '}
              {goal.target.comparison === 'exact' && 'Exactly '}
              {goal.target.value} {goal.target.unit}
            </span>
          </div>
          
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Period</span>
            <span className={styles.detailValue}>
              {goal.period === 'day' && 'Daily'}
              {goal.period === 'week' && 'Weekly'}
              {goal.period === 'month' && 'Monthly'}
              {goal.period === 'ongoing' && 'Ongoing'}
            </span>
          </div>
          
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Start Date</span>
            <span className={styles.detailValue}>{formatDate(goal.startDate)}</span>
          </div>
          
          {goal.endDate && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>End Date</span>
              <span className={styles.detailValue}>{formatDate(goal.endDate)}</span>
            </div>
          )}
          
          {relatedProject && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Project</span>
              <span className={styles.detailValue}>
                {relatedProject.icon} {relatedProject.name}
              </span>
            </div>
          )}
          
          {goalProgress && (
            <>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Current Progress</span>
                <span className={styles.detailValue}>
                  {goalProgress.current} / {goal.target.value} {goal.target.unit}
                </span>
              </div>
              
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Current Streak</span>
                <span className={styles.detailValue}>{goalProgress.streak} days</span>
              </div>
            </>
          )}
        </div>
      </div>
      
      {goalProgress && goalProgress.streak > 0 && (
        <div className={styles.streakSection}>
          <h3>Streak Progress</h3>
          <StreakDisplay 
            streak={goalProgress.streak}
            dailyProgress={goalProgress.dailyProgress}
            showStats={true}
          />
        </div>
      )}
    </div>
  );

  const renderProgressTab = () => (
    <div className={styles.progressTab}>
      {goalProgress ? (
        <>
          <div className={styles.progressStats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{goalProgress.percentage.toFixed(1)}%</span>
              <span className={styles.statLabel}>Completion</span>
            </div>
            
            <div className={styles.statCard}>
              <span className={styles.statValue}>{goalProgress.current}</span>
              <span className={styles.statLabel}>Current Progress</span>
            </div>
            
            <div className={styles.statCard}>
              <span className={styles.statValue}>{goalProgress.streak}</span>
              <span className={styles.statLabel}>Current Streak</span>
            </div>
            
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {goalProgress.dailyProgress.filter(d => d.completed).length}
              </span>
              <span className={styles.statLabel}>Days Completed</span>
            </div>
          </div>
          
          <div className={styles.dailyProgressSection}>
            <h3>Daily Progress History</h3>
            <div className={styles.dailyProgressGrid}>
              {goalProgress.dailyProgress.slice(-30).map((day, index) => (
                <div
                  key={day.date.toISOString()}
                  className={`${styles.dayItem} ${day.completed ? styles.completed : styles.incomplete}`}
                  title={`${formatDate(day.date)}: ${day.value}/${goal.target.value} ${goal.target.unit}`}
                >
                  <span className={styles.dayDate}>
                    {new Date(day.date).getDate()}
                  </span>
                  <span className={styles.dayProgress}>
                    {((day.value / goal.target.value) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className={styles.noProgress}>
          <span className={styles.noProgressIcon}>📊</span>
          <h3>No Progress Data</h3>
          <p>Start working on this goal to see your progress here.</p>
        </div>
      )}
    </div>
  );

  const renderAchievementsTab = () => (
    <div className={styles.achievementsTab}>
      {goalAchievements.length > 0 ? (
        <>
          <div className={styles.achievementStats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{goalAchievements.length}</span>
              <span className={styles.statLabel}>Total Achievements</span>
            </div>
            
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {goalAchievements.filter(a => a.rarity === 'legendary').length}
              </span>
              <span className={styles.statLabel}>Legendary</span>
            </div>
            
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {goalAchievements.filter(a => a.rarity === 'epic').length}
              </span>
              <span className={styles.statLabel}>Epic</span>
            </div>
          </div>
          
          <div className={styles.achievementGrid}>
            {goalAchievements.map(achievement => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                size="medium"
                showDetails={true}
              />
            ))}
          </div>
        </>
      ) : (
        <div className={styles.noAchievements}>
          <span className={styles.noAchievementsIcon}>🏆</span>
          <h3>No Achievements Yet</h3>
          <p>Keep working on this goal to unlock achievements!</p>
        </div>
      )}
    </div>
  );

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title=""
      size="large"
      showHeader={false}
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'progress' ? styles.active : ''}`}
              onClick={() => setActiveTab('progress')}
            >
              Progress
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'achievements' ? styles.active : ''}`}
              onClick={() => setActiveTab('achievements')}
            >
              Achievements ({goalAchievements.length})
            </button>
          </div>
          
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className={styles.tabContent}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'progress' && renderProgressTab()}
          {activeTab === 'achievements' && renderAchievementsTab()}
        </div>
        
        <div className={styles.modalActions}>
          <div className={styles.actionGroup}>
            <button
              className={styles.editButton}
              onClick={onEdit}
            >
              Edit Goal
            </button>
            
            {goal.isActive ? (
              <button
                className={styles.pauseButton}
                onClick={onPause}
              >
                Pause Goal
              </button>
            ) : (
              <button
                className={styles.resumeButton}
                onClick={onResume}
              >
                Resume Goal
              </button>
            )}
          </div>
          
          <button
            className={`${styles.deleteButton} ${showDeleteConfirm ? styles.confirm : ''}`}
            onClick={handleDelete}
          >
            {showDeleteConfirm ? 'Confirm Delete' : 'Delete Goal'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default GoalDetailsModal;