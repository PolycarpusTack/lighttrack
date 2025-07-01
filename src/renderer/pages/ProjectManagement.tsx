import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  archiveProject,
  fetchProjectHierarchy,
  fetchProjectTemplates,
  bulkImportProjects
} from '../store/slices/projectsSlice';
import ProjectHierarchyTree from '../components/projects/ProjectHierarchyTree';
import ProjectCreateModal from '../components/projects/ProjectCreateModal';
import ProjectEditModal from '../components/projects/ProjectEditModal';
import ProjectTemplatesModal from '../components/projects/ProjectTemplatesModal';
import BulkImportModal from '../components/projects/BulkImportModal';
import ProjectCard from '../components/projects/ProjectCard';
import styles from './ProjectManagement.module.css';

type ViewMode = 'grid' | 'list' | 'hierarchy';

const ProjectManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    projects, 
    hierarchy,
    templates,
    isLoading, 
    error 
  } = useSelector((state: RootState) => state.projects);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchProjectHierarchy());
    dispatch(fetchProjectTemplates());
  }, [dispatch]);

  const handleCreateProject = async (projectData: any) => {
    try {
      await dispatch(createProject(projectData)).unwrap();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleUpdateProject = async (projectId: string, updates: any) => {
    try {
      await dispatch(updateProject({ projectId, updates })).unwrap();
      setShowEditModal(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleArchiveProject = async (projectId: string, includeChildren: boolean) => {
    if (confirm('Are you sure you want to archive this project?')) {
      try {
        await dispatch(archiveProject({ projectId, includeChildren })).unwrap();
      } catch (error) {
        console.error('Failed to archive project:', error);
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Are you sure you want to permanently delete this project? This action cannot be undone.')) {
      try {
        await dispatch(deleteProject(projectId)).unwrap();
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const handleBulkImport = async (importOptions: any) => {
    try {
      const result = await dispatch(bulkImportProjects(importOptions)).unwrap();
      setShowBulkImportModal(false);
      
      // Show import results
      alert(`Import completed!\nImported: ${result.imported.length}\nFailed: ${result.failed.length}`);
    } catch (error) {
      console.error('Bulk import failed:', error);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArchived = showArchived || !project.isArchived;
    return matchesSearch && matchesArchived;
  });

  const renderHeader = () => (
    <div className={styles.header}>
      <div className={styles.headerTop}>
        <h1>Project Management</h1>
        <div className={styles.headerActions}>
          <button
            className={styles.primaryBtn}
            onClick={() => setShowCreateModal(true)}
          >
            + New Project
          </button>
          <button
            className={styles.secondaryBtn}
            onClick={() => setShowTemplatesModal(true)}
          >
            Templates
          </button>
          <button
            className={styles.secondaryBtn}
            onClick={() => setShowBulkImportModal(true)}
          >
            Import
          </button>
        </div>
      </div>

      <div className={styles.headerControls}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.viewControls}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show Archived
          </label>

          <div className={styles.viewMode}>
            <button
              className={viewMode === 'grid' ? styles.active : ''}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ⊞
            </button>
            <button
              className={viewMode === 'list' ? styles.active : ''}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              ☰
            </button>
            <button
              className={viewMode === 'hierarchy' ? styles.active : ''}
              onClick={() => setViewMode('hierarchy')}
              title="Hierarchy View"
            >
              🌳
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGridView = () => (
    <div className={styles.projectGrid}>
      {filteredProjects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          onEdit={() => {
            setSelectedProject(project.id);
            setShowEditModal(true);
          }}
          onArchive={(includeChildren) => handleArchiveProject(project.id, includeChildren)}
          onDelete={() => handleDeleteProject(project.id)}
          onSelect={() => {
            // Navigate to project analytics
            window.location.href = `#/projects/${project.id}/analytics`;
          }}
        />
      ))}
    </div>
  );

  const renderListView = () => (
    <div className={styles.projectList}>
      <table className={styles.projectTable}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Total Time</th>
            <th>Status</th>
            <th>Billable</th>
            <th>Last Activity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredProjects.map(project => (
            <tr key={project.id} className={project.isArchived ? styles.archived : ''}>
              <td>
                <div className={styles.projectName}>
                  <span 
                    className={styles.colorIndicator}
                    style={{ backgroundColor: project.color }}
                  />
                  {project.icon && <span className={styles.icon}>{project.icon}</span>}
                  {project.name}
                </div>
              </td>
              <td>{formatDuration(project.totalTime)}</td>
              <td>
                <span className={`${styles.status} ${project.isArchived ? styles.archived : styles.active}`}>
                  {project.isArchived ? 'Archived' : 'Active'}
                </span>
              </td>
              <td>
                {project.settings.billable ? (
                  <span className={styles.billable}>
                    ${project.settings.hourlyRate}/hr
                  </span>
                ) : (
                  <span className={styles.nonBillable}>-</span>
                )}
              </td>
              <td>{project.updatedAt ? formatDate(new Date(project.updatedAt)) : '-'}</td>
              <td>
                <div className={styles.actions}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => {
                      setSelectedProject(project.id);
                      setShowEditModal(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className={styles.actionBtn}
                    onClick={() => handleArchiveProject(project.id, false)}
                  >
                    {project.isArchived ? 'Restore' : 'Archive'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderHierarchyView = () => (
    <div className={styles.hierarchyView}>
      <ProjectHierarchyTree
        hierarchy={hierarchy}
        onEdit={(projectId) => {
          setSelectedProject(projectId);
          setShowEditModal(true);
        }}
        onArchive={handleArchiveProject}
        onDelete={handleDeleteProject}
      />
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return <div className={styles.loading}>Loading projects...</div>;
    }

    if (error) {
      return <div className={styles.error}>Error: {error}</div>;
    }

    if (filteredProjects.length === 0) {
      return (
        <div className={styles.emptyState}>
          <h3>No projects found</h3>
          <p>Create your first project to start tracking time</p>
          <button
            className={styles.primaryBtn}
            onClick={() => setShowCreateModal(true)}
          >
            Create Project
          </button>
        </div>
      );
    }

    switch (viewMode) {
      case 'grid':
        return renderGridView();
      case 'list':
        return renderListView();
      case 'hierarchy':
        return renderHierarchyView();
    }
  };

  return (
    <div className={styles.projectManagement}>
      {renderHeader()}
      {renderContent()}

      {showCreateModal && (
        <ProjectCreateModal
          templates={templates}
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}

      {showEditModal && selectedProject && (
        <ProjectEditModal
          project={projects.find(p => p.id === selectedProject)!}
          projects={projects}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProject(null);
          }}
          onUpdate={(updates) => handleUpdateProject(selectedProject, updates)}
        />
      )}

      {showTemplatesModal && (
        <ProjectTemplatesModal
          templates={templates}
          onClose={() => setShowTemplatesModal(false)}
          onSelectTemplate={(templateId) => {
            setShowTemplatesModal(false);
            setShowCreateModal(true);
            // Template will be pre-selected in create modal
          }}
        />
      )}

      {showBulkImportModal && (
        <BulkImportModal
          projects={projects}
          onClose={() => setShowBulkImportModal(false)}
          onImport={handleBulkImport}
        />
      )}
    </div>
  );
};

const formatDuration = (milliseconds: number): string => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default ProjectManagement;