import React, { useState } from 'react';
import { Project } from '@shared/types/project';
import styles from './ProjectHierarchyTree.module.css';

interface ProjectHierarchy {
  project: Project;
  children: ProjectHierarchy[];
  totalTime: number;
  depth: number;
}

interface ProjectHierarchyTreeProps {
  hierarchy: ProjectHierarchy[];
  onEdit: (projectId: string) => void;
  onArchive: (projectId: string, includeChildren: boolean) => void;
  onDelete: (projectId: string) => void;
}

interface TreeNodeProps {
  node: ProjectHierarchy;
  onEdit: (projectId: string) => void;
  onArchive: (projectId: string, includeChildren: boolean) => void;
  onDelete: (projectId: string) => void;
  isLast?: boolean;
  parentPath?: string;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  onEdit,
  onArchive,
  onDelete,
  isLast = false,
  parentPath = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showActions, setShowActions] = useState(false);

  const { project, children, totalTime } = node;
  const hasChildren = children.length > 0;

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
    const hours = totalTime / (1000 * 60 * 60);
    const earnings = hours * project.settings.hourlyRate;
    return formatCurrency(earnings, project.settings.currency);
  };

  const getIndentStyle = () => {
    return {
      paddingLeft: `${node.depth * 24}px`
    };
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleNodeClick = () => {
    // Could navigate to project details or start timer
    console.log('Navigate to project:', project.id);
  };

  const renderConnector = () => {
    if (node.depth === 0) return null;

    return (
      <div className={styles.connector}>
        <div className={`${styles.line} ${isLast ? styles.lastLine : ''}`} />
        <div className={styles.branch} />
      </div>
    );
  };

  return (
    <div className={styles.treeNode}>
      <div 
        className={`${styles.nodeContent} ${project.isArchived ? styles.archived : ''}`}
        style={getIndentStyle()}
        onClick={handleNodeClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {renderConnector()}

        {/* Expand/Collapse Button */}
        <button
          className={`${styles.expandButton} ${!hasChildren ? styles.noChildren : ''}`}
          onClick={handleToggleExpand}
          disabled={!hasChildren}
        >
          {hasChildren ? (isExpanded ? '▼' : '▶') : '●'}
        </button>

        {/* Project Info */}
        <div className={styles.projectInfo}>
          <span 
            className={styles.colorIndicator}
            style={{ backgroundColor: project.color }}
          />
          
          <div className={styles.nameSection}>
            {project.icon && <span className={styles.icon}>{project.icon}</span>}
            <span className={styles.name}>{project.name}</span>
            {project.isArchived && (
              <span className={styles.archivedBadge}>Archived</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Time</span>
            <span className={styles.statValue}>{formatDuration(totalTime)}</span>
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

        {/* Actions */}
        <div className={`${styles.actions} ${showActions ? styles.visible : ''}`}>
          <button 
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(project.id);
            }}
            title="Edit Project"
          >
            ✏️
          </button>
          <button 
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              const includeChildren = confirm(
                hasChildren 
                  ? 'Archive this project and all its sub-projects?' 
                  : 'Archive this project?'
              );
              onArchive(project.id, includeChildren);
            }}
            title={project.isArchived ? "Restore Project" : "Archive Project"}
          >
            {project.isArchived ? '📤' : '📥'}
          </button>
          <button 
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project.id);
            }}
            title="Delete Project"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className={styles.children}>
          {children.map((child, index) => (
            <TreeNode
              key={child.project.id}
              node={child}
              onEdit={onEdit}
              onArchive={onArchive}
              onDelete={onDelete}
              isLast={index === children.length - 1}
              parentPath={parentPath + project.id + '/'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectHierarchyTree: React.FC<ProjectHierarchyTreeProps> = ({
  hierarchy,
  onEdit,
  onArchive,
  onDelete
}) => {
  if (hierarchy.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3>No projects found</h3>
        <p>Create a project to see it in the hierarchy</p>
      </div>
    );
  }

  return (
    <div className={styles.hierarchyTree}>
      <div className={styles.header}>
        <div className={styles.headerColumn}>Project</div>
        <div className={styles.headerColumn}>Time</div>
        <div className={styles.headerColumn}>Rate</div>
        <div className={styles.headerColumn}>Earnings</div>
        <div className={styles.headerColumn}>Actions</div>
      </div>
      
      <div className={styles.tree}>
        {hierarchy.map((node, index) => (
          <TreeNode
            key={node.project.id}
            node={node}
            onEdit={onEdit}
            onArchive={onArchive}
            onDelete={onDelete}
            isLast={index === hierarchy.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectHierarchyTree;