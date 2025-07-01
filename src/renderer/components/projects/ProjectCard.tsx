import React from 'react';
import { Project } from '@shared/types/project';
import styles from './ProjectCard.module.css';

interface ProjectCardProps {
  project: Project;
  onEdit: () => void;
  onArchive: (includeChildren: boolean) => void;
  onDelete: () => void;
  onSelect: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onEdit,
  onArchive,
  onDelete,
  onSelect
}) => {
  const formatDuration = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const calculateEarnings = (): string => {
    if (!project.settings.billable || !project.settings.hourlyRate) {
      return '-';
    }
    const hours = project.totalTime / (1000 * 60 * 60);
    const earnings = hours * project.settings.hourlyRate;
    return formatCurrency(earnings, project.settings.currency);
  };

  return (
    <div 
      className={`${styles.projectCard} ${project.isArchived ? styles.archived : ''}`}
      onClick={onSelect}
    >
      <div className={styles.header}>
        <div className={styles.projectInfo}>
          <span 
            className={styles.colorIndicator}
            style={{ backgroundColor: project.color }}
          />
          <div className={styles.nameSection}>
            {project.icon && <span className={styles.icon}>{project.icon}</span>}
            <h3 className={styles.name}>{project.name}</h3>
          </div>
        </div>
        
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <button 
            className={styles.actionBtn}
            onClick={onEdit}
            title="Edit Project"
          >
            ✏️
          </button>
          <button 
            className={styles.actionBtn}
            onClick={() => onArchive(false)}
            title={project.isArchived ? "Restore Project" : "Archive Project"}
          >
            {project.isArchived ? '📤' : '📥'}
          </button>
          <button 
            className={styles.actionBtn}
            onClick={onDelete}
            title="Delete Project"
          >
            🗑️
          </button>
        </div>
      </div>

      {project.description && (
        <p className={styles.description}>{project.description}</p>
      )}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Time</span>
          <span className={styles.statValue}>{formatDuration(project.totalTime)}</span>
        </div>
        
        {project.settings.billable && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>Rate</span>
            <span className={styles.statValue}>
              {formatCurrency(project.settings.hourlyRate || 0, project.settings.currency)}/hr
            </span>
          </div>
        )}
        
        <div className={styles.stat}>
          <span className={styles.statLabel}>Earnings</span>
          <span className={styles.statValue}>{calculateEarnings()}</span>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={`${styles.status} ${project.isArchived ? styles.archivedStatus : styles.activeStatus}`}>
          {project.isArchived ? 'Archived' : 'Active'}
        </span>
        <span className={styles.lastUpdated}>
          Updated {new Date(project.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

export default ProjectCard;