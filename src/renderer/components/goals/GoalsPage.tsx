import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { 
  fetchGoals, 
  fetchGoalProgress, 
  fetchGoalStats,
  fetchTodaysGoals,
  fetchWeeklyGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  pauseGoal,
  resumeGoal,
  setCurrentGoal
} from '../../store/slices/goalsSlice';
import { Goal, GoalType } from '@shared/types/goal';
import GoalCard from './GoalCard';
import GoalCreateModal from './GoalCreateModal';
import GoalEditModal from './GoalEditModal';
import GoalDetailsModal from './GoalDetailsModal';
import GoalInsights from './GoalInsights';
import AchievementBadge from './AchievementBadge';
import styles from './GoalsPage.module.css';

const GoalsPage: React.FC = () => {
  const dispatch = useDispatch();
  const { 
    goals, 
    todaysGoals, 
    weeklyGoals, 
    achievements, 
    stats, 
    currentGoal,
    isLoading, 
    error 
  } = useSelector((state: RootState) => state.goals);

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('all');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | GoalType>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'created' | 'streak'>('created');

  useEffect(() => {
    // Load all goal data on mount
    dispatch(fetchGoals());
    dispatch(fetchGoalProgress());
    dispatch(fetchGoalStats());
    dispatch(fetchTodaysGoals());
    dispatch(fetchWeeklyGoals());
  }, [dispatch]);

  // Filter and sort goals
  const filteredGoals = goals
    .filter(goal => {
      if (activeFilter === 'active') return goal.isActive;
      if (activeFilter === 'completed') return !goal.isActive; // Simplified
      if (activeFilter === 'paused') return !goal.isActive && goal.pausedAt;
      return true;
    })
    .filter(goal => {
      if (activeTypeFilter === 'all') return true;
      return goal.type === activeTypeFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'progress':
          // Note: Would need progress data to sort properly
          return 0;
        case 'streak':
          // Note: Would need streak data to sort properly
          return 0;
        case 'created':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const recentAchievements = achievements
    .filter(a => a.isRecent?.())
    .slice(0, 5);

  const handleCreateGoal = async (goalData: any) => {
    try {
      await dispatch(createGoal(goalData)).unwrap();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const handleUpdateGoal = async (goalId: string, updates: Partial<Goal>) => {
    try {
      await dispatch(updateGoal({ goalId, updates })).unwrap();
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update goal:', error);
    }
  };

  const handleDeleteGoal = async () => {
    if (!currentGoal) return;
    
    try {
      await dispatch(deleteGoal(currentGoal.id)).unwrap();
      setShowDetailsModal(false);
      dispatch(setCurrentGoal(null));
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const handlePauseGoal = async () => {
    if (!currentGoal) return;
    
    try {
      await dispatch(pauseGoal(currentGoal.id)).unwrap();
    } catch (error) {
      console.error('Failed to pause goal:', error);
    }
  };

  const handleResumeGoal = async () => {
    if (!currentGoal) return;
    
    try {
      await dispatch(resumeGoal(currentGoal.id)).unwrap();
    } catch (error) {
      console.error('Failed to resume goal:', error);
    }
  };

  const openGoalDetails = (goal: Goal) => {
    dispatch(setCurrentGoal(goal));
    setShowDetailsModal(true);
  };

  const openGoalEdit = () => {
    setShowDetailsModal(false);
    setShowEditModal(true);
  };

  const getFilterCounts = () => {
    const active = goals.filter(g => g.isActive).length;
    const completed = goals.filter(g => !g.isActive && !g.pausedAt).length; // Simplified
    const paused = goals.filter(g => !g.isActive && g.pausedAt).length;
    
    return { active, completed, paused, all: goals.length };
  };

  const filterCounts = getFilterCounts();

  return (
    <div className={styles.goalsPage}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.pageTitle}>🎯 Goals</h1>
          <p className={styles.pageSubtitle}>
            Track your progress and achieve your objectives
          </p>
        </div>
        
        <div className={styles.headerActions}>
          <button
            className={styles.createButton}
            onClick={() => setShowCreateModal(true)}
          >
            <span className={styles.createIcon}>+</span>
            New Goal
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className={styles.statsSection}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.totalGoals}</span>
            <span className={styles.statLabel}>Total Goals</span>
          </div>
          
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.activeGoals}</span>
            <span className={styles.statLabel}>Active</span>
          </div>
          
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.completedGoals}</span>
            <span className={styles.statLabel}>Completed</span>
          </div>
          
          <div className={styles.statCard}>
            <span className={styles.statValue}>{Math.round(stats.averageProgress)}%</span>
            <span className={styles.statLabel}>Avg Progress</span>
          </div>
          
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.totalStreakDays}</span>
            <span className={styles.statLabel}>Total Streak Days</span>
          </div>
        </div>
      )}

      {/* Quick Views */}
      <div className={styles.quickViews}>
        {todaysGoals.length > 0 && (
          <div className={styles.quickView}>
            <h3>📅 Today's Goals ({todaysGoals.length})</h3>
            <div className={styles.quickGoalsList}>
              {todaysGoals.slice(0, 3).map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onClick={() => openGoalDetails(goal)}
                  compact={true}
                />
              ))}
              {todaysGoals.length > 3 && (
                <span className={styles.moreCount}>+{todaysGoals.length - 3} more</span>
              )}
            </div>
          </div>
        )}

        {recentAchievements.length > 0 && (
          <div className={styles.quickView}>
            <h3>🏆 Recent Achievements</h3>
            <div className={styles.achievementsList}>
              {recentAchievements.map(achievement => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  size="small"
                  showDetails={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters and Controls */}
      <div className={styles.controls}>
        <div className={styles.filters}>
          {/* Status Filter */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Status:</span>
            <div className={styles.filterButtons}>
              {[
                { key: 'all', label: `All (${filterCounts.all})` },
                { key: 'active', label: `Active (${filterCounts.active})` },
                { key: 'completed', label: `Completed (${filterCounts.completed})` },
                { key: 'paused', label: `Paused (${filterCounts.paused})` }
              ].map(filter => (
                <button
                  key={filter.key}
                  className={`${styles.filterButton} ${activeFilter === filter.key ? styles.active : ''}`}
                  onClick={() => setActiveFilter(filter.key as any)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Type:</span>
            <div className={styles.filterButtons}>
              {[
                { key: 'all', label: 'All', icon: '🎯' },
                { key: 'daily', label: 'Daily', icon: '📅' },
                { key: 'weekly', label: 'Weekly', icon: '📋' },
                { key: 'project', label: 'Project', icon: '🎯' },
                { key: 'habit', label: 'Habit', icon: '🔄' }
              ].map(filter => (
                <button
                  key={filter.key}
                  className={`${styles.filterButton} ${activeTypeFilter === filter.key ? styles.active : ''}`}
                  onClick={() => setActiveTypeFilter(filter.key as any)}
                >
                  <span className={styles.filterIcon}>{filter.icon}</span>
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.viewControls}>
          <div className={styles.sortSelect}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={styles.select}
            >
              <option value="created">Sort by Created</option>
              <option value="name">Sort by Name</option>
              <option value="progress">Sort by Progress</option>
              <option value="streak">Sort by Streak</option>
            </select>
          </div>

          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ⊞
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.goalsSection}>
          {error && (
            <div className={styles.error}>
              <span className={styles.errorIcon}>⚠️</span>
              <span>Failed to load goals: {error}</span>
            </div>
          )}

          {isLoading && filteredGoals.length === 0 ? (
            <div className={styles.loading}>
              <span className={styles.loadingIcon}>⏳</span>
              <span>Loading your goals...</span>
            </div>
          ) : filteredGoals.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🎯</span>
              <h3>No Goals Found</h3>
              <p>
                {activeFilter === 'all'
                  ? 'Create your first goal to start tracking your progress!'
                  : `No ${activeFilter} goals found. Try adjusting your filters.`
                }
              </p>
              {activeFilter === 'all' && (
                <button
                  className={styles.createButton}
                  onClick={() => setShowCreateModal(true)}
                >
                  <span className={styles.createIcon}>+</span>
                  Create Your First Goal
                </button>
              )}
            </div>
          ) : (
            <div className={`${styles.goalsList} ${styles[viewMode]}`}>
              {filteredGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onClick={() => openGoalDetails(goal)}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          <GoalInsights limit={3} />
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <GoalCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGoal}
        />
      )}

      {showEditModal && currentGoal && (
        <GoalEditModal
          goal={currentGoal}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdateGoal}
        />
      )}

      {showDetailsModal && currentGoal && (
        <GoalDetailsModal
          goal={currentGoal}
          onClose={() => setShowDetailsModal(false)}
          onEdit={openGoalEdit}
          onDelete={handleDeleteGoal}
          onPause={handlePauseGoal}
          onResume={handleResumeGoal}
        />
      )}
    </div>
  );
};

export default GoalsPage;