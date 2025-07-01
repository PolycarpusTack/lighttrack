import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import styles from './QuickStartModal.module.css';

interface QuickStartModalProps {
  onClose: () => void;
  onStart: (name: string, projectId: string) => void;
}

const QuickStartModal: React.FC<QuickStartModalProps> = ({ onClose, onStart }) => {
  const [activityName, setActivityName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [recentActivities, setRecentActivities] = useState<string[]>([]);
  
  const projects = useSelector((state: RootState) => state.projects.projects);

  useEffect(() => {
    // Load recent activity names from local storage
    const stored = localStorage.getItem('recentActivityNames');
    if (stored) {
      setRecentActivities(JSON.parse(stored).slice(0, 5));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activityName.trim()) return;
    
    // Save to recent activities
    const updated = [activityName, ...recentActivities.filter(a => a !== activityName)].slice(0, 5);
    localStorage.setItem('recentActivityNames', JSON.stringify(updated));
    
    onStart(activityName, selectedProjectId || 'default');
  };

  const handleRecentClick = (name: string) => {
    setActivityName(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modalContent} 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.modalHeader}>
          <h2>Quick Start Activity</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.quickStartForm}>
          <div className={styles.formGroup}>
            <label htmlFor="activityName">Activity Name</label>
            <input
              id="activityName"
              type="text"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              placeholder="What are you working on?"
              className={styles.input}
              autoFocus
            />
          </div>

          {recentActivities.length > 0 && (
            <div className={styles.recentSection}>
              <p className={styles.recentLabel}>Recent:</p>
              <div className={styles.recentList}>
                {recentActivities.map((name, index) => (
                  <button
                    key={index}
                    type="button"
                    className={styles.recentItem}
                    onClick={() => handleRecentClick(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="project">Project</label>
            <select
              id="project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className={styles.select}
            >
              <option value="">No Project</option>
              {projects
                .filter(p => !p.isArchived)
                .map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
            </select>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.startBtn}
              disabled={!activityName.trim()}
            >
              Start Tracking
            </button>
          </div>
        </form>

        <div className={styles.shortcuts}>
          <p>Shortcuts:</p>
          <div className={styles.shortcutList}>
            <span><kbd>Enter</kbd> Start</span>
            <span><kbd>Esc</kbd> Cancel</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStartModal;