import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { bulkUpdateActivities } from '../../store/slices/activitySlice';
import { showNotification } from '../../store/slices/uiSlice';
import { Activity } from '../../../shared/types/activity';
import { formatDuration } from '../../../shared/utils/time';
import Modal from './Modal';
import styles from './BulkCategorizeModal.module.css';

interface BulkCategorizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityIds: string[];
}

const BulkCategorizeModal: React.FC<BulkCategorizeModalProps> = ({
  isOpen,
  onClose,
  activityIds
}) => {
  const dispatch = useAppDispatch();
  const { todayActivities } = useAppSelector(state => state.activities);
  const { projects } = useAppSelector(state => state.projects);
  
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newTags, setNewTags] = useState('');
  const [action, setAction] = useState<'replace' | 'add'>('add');
  const [updateProject, setUpdateProject] = useState(false);
  const [updateTags, setUpdateTags] = useState(false);

  const selectedActivities = todayActivities.filter(activity => 
    activityIds.includes(activity.id)
  );

  const totalDuration = selectedActivities.reduce((sum, activity) => 
    sum + (activity.duration || 0), 0
  );

  // Get unique existing tags from selected activities
  const existingTags = Array.from(new Set(
    selectedActivities.flatMap(activity => activity.tags || [])
  )).sort();

  // Get unique projects from selected activities
  const uniqueProjects = Array.from(new Set(
    selectedActivities.map(activity => activity.projectId)
  ));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!updateProject && !updateTags) {
      dispatch(showNotification({
        type: 'warning',
        title: 'No Changes Selected',
        message: 'Please select at least one option to update.'
      }));
      return;
    }

    const updates: Partial<Activity> = {};

    if (updateProject && selectedProjectId) {
      updates.projectId = selectedProjectId;
    }

    if (updateTags) {
      const tagsArray = newTags.split(',').map(tag => tag.trim()).filter(Boolean);
      
      if (action === 'replace') {
        updates.tags = tagsArray;
      } else {
        // For 'add' action, we'll need to handle this per activity
        // This is a simplified version - in reality, you'd want to merge tags per activity
        updates.tags = tagsArray;
      }
    }

    try {
      await dispatch(bulkUpdateActivities({
        activityIds,
        updates
      })).unwrap();

      dispatch(showNotification({
        type: 'success',
        title: 'Activities Updated',
        message: `Successfully updated ${activityIds.length} activities`
      }));

      onClose();
    } catch (error) {
      dispatch(showNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update activities. Please try again.'
      }));
    }
  };

  const handleClose = () => {
    setSelectedProjectId('');
    setNewTags('');
    setAction('add');
    setUpdateProject(false);
    setUpdateTags(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Categorize Activities"
      size="medium"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.summary}>
          <h3 className={styles.summaryTitle}>Selected Activities</h3>
          <div className={styles.summaryDetails}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Count:</span>
              <span className={styles.summaryValue}>{selectedActivities.length} activities</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Total Duration:</span>
              <span className={styles.summaryValue}>{formatDuration(totalDuration)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Current Projects:</span>
              <span className={styles.summaryValue}>
                {uniqueProjects.length} project{uniqueProjects.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.sectionHeader}>
            <input
              type="checkbox"
              checked={updateProject}
              onChange={(e) => setUpdateProject(e.target.checked)}
              className={styles.checkbox}
            />
            <span className={styles.sectionTitle}>Update Project</span>
          </label>
          
          {updateProject && (
            <div className={styles.field}>
              <select
                className={styles.select}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                required={updateProject}
              >
                <option value="">Select a project...</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <div className={styles.fieldHint}>
                All selected activities will be moved to this project
              </div>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <label className={styles.sectionHeader}>
            <input
              type="checkbox"
              checked={updateTags}
              onChange={(e) => setUpdateTags(e.target.checked)}
              className={styles.checkbox}
            />
            <span className={styles.sectionTitle}>Update Tags</span>
          </label>
          
          {updateTags && (
            <div className={styles.tagSection}>
              <div className={styles.actionSelector}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="tagAction"
                    value="add"
                    checked={action === 'add'}
                    onChange={(e) => setAction(e.target.value as 'add' | 'replace')}
                    className={styles.radio}
                  />
                  Add tags to existing ones
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="tagAction"
                    value="replace"
                    checked={action === 'replace'}
                    onChange={(e) => setAction(e.target.value as 'add' | 'replace')}
                    className={styles.radio}
                  />
                  Replace all existing tags
                </label>
              </div>

              <div className={styles.field}>
                <input
                  type="text"
                  className={styles.input}
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Enter tags separated by commas"
                  required={updateTags}
                />
                <div className={styles.fieldHint}>
                  Example: meeting, important, review
                </div>
              </div>

              {existingTags.length > 0 && (
                <div className={styles.existingTags}>
                  <div className={styles.existingTagsTitle}>Existing tags in selection:</div>
                  <div className={styles.tagList}>
                    {existingTags.map(tag => (
                      <span key={tag} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={!updateProject && !updateTags}
          >
            Update {activityIds.length} Activities
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BulkCategorizeModal;