import React, { useState } from 'react';
import styles from './BudgetTracker.module.css';

interface BudgetAnalysis {
  projectId: string;
  totalEarned: number;
  projectedMonthly: number;
  hoursTracked: number;
  billableHours: number;
  hourlyRate: number;
  currency: string;
  budgetUtilization: number;
  remainingBudget: number;
}

interface BudgetTrackerProps {
  analysis: BudgetAnalysis;
  onUpdateBudget?: (newBudget: number) => void;
}

const BudgetTracker: React.FC<BudgetTrackerProps> = ({ analysis, onUpdateBudget }) => {
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(0);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: analysis.currency
    }).format(amount);
  };

  const formatHours = (hours: number): string => {
    return hours.toFixed(2);
  };

  const handleUpdateBudget = () => {
    if (onUpdateBudget && budgetLimit > 0) {
      onUpdateBudget(budgetLimit);
      setShowBudgetModal(false);
    }
  };

  const getBudgetStatus = (): { color: string; label: string } => {
    if (analysis.budgetUtilization === 0) {
      return { color: '#666', label: 'No Budget Set' };
    }
    if (analysis.budgetUtilization < 70) {
      return { color: '#4BC0C0', label: 'On Track' };
    }
    if (analysis.budgetUtilization < 90) {
      return { color: '#FFCE56', label: 'Caution' };
    }
    return { color: '#FF6384', label: 'Near Limit' };
  };

  const budgetStatus = getBudgetStatus();

  return (
    <div className={styles.budgetTracker}>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>💰</span>
            <h3>Total Earned</h3>
          </div>
          <div className={styles.cardValue}>{formatCurrency(analysis.totalEarned)}</div>
          <div className={styles.cardDetail}>
            {formatHours(analysis.billableHours)} billable hours
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>📈</span>
            <h3>Monthly Projection</h3>
          </div>
          <div className={styles.cardValue}>{formatCurrency(analysis.projectedMonthly)}</div>
          <div className={styles.cardDetail}>
            Based on last 30 days
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>⏱️</span>
            <h3>Hourly Rate</h3>
          </div>
          <div className={styles.cardValue}>{formatCurrency(analysis.hourlyRate)}</div>
          <div className={styles.cardDetail}>
            per hour
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>📊</span>
            <h3>Hours Tracked</h3>
          </div>
          <div className={styles.cardValue}>{formatHours(analysis.hoursTracked)}</div>
          <div className={styles.cardDetail}>
            total hours
          </div>
        </div>
      </div>

      {analysis.budgetUtilization > 0 && (
        <div className={styles.budgetProgress}>
          <div className={styles.progressHeader}>
            <h3>Budget Utilization</h3>
            <span 
              className={styles.budgetStatus}
              style={{ color: budgetStatus.color }}
            >
              {budgetStatus.label}
            </span>
          </div>
          
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ 
                width: `${Math.min(analysis.budgetUtilization, 100)}%`,
                backgroundColor: budgetStatus.color
              }}
            />
          </div>
          
          <div className={styles.progressDetails}>
            <span>{analysis.budgetUtilization.toFixed(1)}% used</span>
            <span>{formatCurrency(analysis.remainingBudget)} remaining</span>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={styles.setBudgetBtn}
          onClick={() => setShowBudgetModal(true)}
        >
          {analysis.budgetUtilization > 0 ? 'Update Budget' : 'Set Budget'}
        </button>
      </div>

      {showBudgetModal && (
        <div className={styles.modalOverlay} onClick={() => setShowBudgetModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Set Project Budget</h3>
            <div className={styles.budgetForm}>
              <label>Budget Limit ({analysis.currency})</label>
              <input
                type="number"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(parseFloat(e.target.value))}
                placeholder="Enter budget amount"
                min="0"
                step="100"
              />
              <div className={styles.modalActions}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setShowBudgetModal(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={handleUpdateBudget}
                  disabled={budgetLimit <= 0}
                >
                  Save Budget
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetTracker;