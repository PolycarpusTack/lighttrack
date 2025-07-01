import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setSelectedActivityIds, showContextMenu, hideContextMenu, openModal } from '../../store/slices/uiSlice';
import { TimelineRenderer, TimeScale, TimeRange } from './TimelineRenderer';
import { Activity } from '@shared/types/activity';
import { TimelineControls } from './TimelineControls';
import { ActivityTooltip } from './ActivityTooltip';
import { TimelineContextMenu } from './TimelineContextMenu';
import styles from './Timeline.module.css';

interface TimelineProps {
  className?: string;
}

interface MouseState {
  isDown: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  isSelecting: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<TimelineRenderer | null>(null);
  
  const dispatch = useDispatch();
  const activities = useSelector((state: RootState) => state.activity.activities);
  const projects = useSelector((state: RootState) => state.project.projects);
  const selectedActivityIds = useSelector((state: RootState) => state.ui.selectedActivityIds);
  const contextMenu = useSelector((state: RootState) => state.ui.contextMenu);

  const [timeScale, setTimeScale] = useState<TimeScale>(TimeScale.DAY);
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  });

  const [mouseState, setMouseState] = useState<MouseState>({
    isDown: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
    isSelecting: false
  });

  const [hoveredActivity, setHoveredActivity] = useState<Activity | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Initialize timeline renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!container) return;

    // Set canvas size
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Create renderer with project colors
    const blockColors: { [projectId: string]: string } = {};
    projects.forEach(project => {
      blockColors[project.id] = project.color;
    });

    rendererRef.current = new TimelineRenderer(canvas, {
      scale: timeScale,
      theme: {
        backgroundColor: '#ffffff',
        gridColor: '#e0e0e0',
        axisColor: '#f5f5f5',
        textColor: '#333333',
        blockColors,
        defaultBlockColor: '#2196F3',
        currentTimeColor: '#ff4444',
        selectionColor: '#3f51b5',
        hoverColor: '#5c6bc0'
      }
    });

    return () => {
      rendererRef.current = null;
    };
  }, [projects, timeScale]);

  // Render timeline when data changes
  useEffect(() => {
    if (rendererRef.current && activities.length > 0) {
      rendererRef.current.renderTimeline(activities, timeRange);
    }
  }, [activities, timeRange]);

  // Update selections
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setSelectedActivities(selectedActivityIds);
    }
  }, [selectedActivityIds]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      if (rendererRef.current) {
        rendererRef.current.renderTimeline(activities, timeRange);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activities, timeRange]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !rendererRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const activity = rendererRef.current.getActivityAt(x, y);
    
    setMouseState({
      isDown: true,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      isDragging: false,
      isSelecting: !activity
    });

    if (activity) {
      // Handle activity selection
      if (e.ctrlKey || e.metaKey) {
        // Toggle selection
        const newSelection = selectedActivityIds.includes(activity.id)
          ? selectedActivityIds.filter(id => id !== activity.id)
          : [...selectedActivityIds, activity.id];
        dispatch(setSelectedActivityIds(newSelection));
      } else if (e.shiftKey && selectedActivityIds.length > 0) {
        // Range selection - implement if needed
      } else {
        // Single selection
        dispatch(setSelectedActivityIds([activity.id]));
      }
    } else {
      // Clear selection if clicking empty space
      dispatch(setSelectedActivityIds([]));
    }
  }, [selectedActivityIds]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !rendererRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update hover state
    const activity = rendererRef.current.getActivityAt(x, y);
    if (activity !== hoveredActivity) {
      setHoveredActivity(activity);
      rendererRef.current.setHoveredActivity(activity?.id || null);
      
      if (activity) {
        setTooltipPosition({ x: e.clientX, y: e.clientY });
      } else {
        setTooltipPosition(null);
      }
    }

    // Handle dragging/selection
    if (mouseState.isDown) {
      const deltaX = Math.abs(x - mouseState.startX);
      const deltaY = Math.abs(y - mouseState.startY);
      
      if (!mouseState.isDragging && (deltaX > 3 || deltaY > 3)) {
        setMouseState(prev => ({ ...prev, isDragging: true }));
      }

      if (mouseState.isDragging && mouseState.isSelecting) {
        // Update selection rectangle
        setMouseState(prev => ({ ...prev, currentX: x, currentY: y }));
        
        // Select activities in rectangle
        const activities = rendererRef.current!.selectActivitiesInRect(
          mouseState.startX,
          mouseState.startY,
          x,
          y
        );
        
        const activityIds = activities.map(a => a.id);
        dispatch(setSelectedActivityIds(activityIds));
      }
    }
  }, [hoveredActivity, mouseState]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setMouseState({
      isDown: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isDragging: false,
      isSelecting: false
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredActivity(null);
    setTooltipPosition(null);
    if (rendererRef.current) {
      rendererRef.current.setHoveredActivity(null);
    }
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !rendererRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const activity = rendererRef.current.getActivityAt(x, y);
    if (activity) {
      // Open edit modal for activity
      dispatch(openModal({ type: 'editActivity', data: activity }));
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (!canvasRef.current || !rendererRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const activity = rendererRef.current.getActivityAt(x, y);
    if (activity) {
      // Show context menu for activity
      dispatch(showContextMenu({ 
        position: { x: e.clientX, y: e.clientY }, 
        activityId: activity.id 
      }));
    }
  }, []);

  const handleTimeScaleChange = useCallback((newScale: TimeScale) => {
    setTimeScale(newScale);
    if (rendererRef.current) {
      rendererRef.current.setTimeScale(newScale);
    }
  }, []);

  const handleTimeRangeChange = useCallback((newRange: TimeRange) => {
    setTimeRange(newRange);
  }, []);

  const handleZoomToday = useCallback(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    setTimeRange({ start, end });
    setTimeScale(TimeScale.DAY);
  }, []);

  const handleZoomWeek = useCallback(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    setTimeRange({ start, end });
    setTimeScale(TimeScale.WEEK);
  }, []);

  // Context menu handlers
  const handleContextMenuClose = useCallback(() => {
    dispatch(hideContextMenu());
  }, [dispatch]);

  const handleEditActivity = useCallback((activity: Activity) => {
    dispatch(openModal({ type: 'editActivity', data: activity }));
  }, [dispatch]);

  const handleDeleteActivity = useCallback((activity: Activity) => {
    dispatch(openModal({ 
      type: 'confirmation', 
      data: { 
        title: 'Delete Activity',
        message: `Are you sure you want to delete "${activity.name}"?`,
        onConfirm: () => {
          // Dispatch delete activity action
        }
      }
    }));
  }, [dispatch]);

  const handleSplitActivity = useCallback((activity: Activity) => {
    dispatch(openModal({ type: 'splitActivity', data: activity }));
  }, [dispatch]);

  const handleDuplicateActivity = useCallback((activity: Activity) => {
    // Dispatch duplicate activity action
  }, [dispatch]);

  // Get the activity for context menu
  const contextMenuActivity = contextMenu.activityId 
    ? activities.find(a => a.id === contextMenu.activityId)
    : null;

  return (
    <div className={`${styles.timeline} ${className || ''}`}>
      <TimelineControls
        timeScale={timeScale}
        timeRange={timeRange}
        onTimeScaleChange={handleTimeScaleChange}
        onTimeRangeChange={handleTimeRangeChange}
        onZoomToday={handleZoomToday}
        onZoomWeek={handleZoomWeek}
      />
      
      <div ref={containerRef} className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        />
        
        {/* Selection rectangle overlay */}
        {mouseState.isDragging && mouseState.isSelecting && (
          <div
            className={styles.selectionRect}
            style={{
              left: Math.min(mouseState.startX, mouseState.currentX),
              top: Math.min(mouseState.startY, mouseState.currentY),
              width: Math.abs(mouseState.currentX - mouseState.startX),
              height: Math.abs(mouseState.currentY - mouseState.startY)
            }}
          />
        )}
      </div>

      {/* Activity tooltip */}
      {hoveredActivity && tooltipPosition && (
        <ActivityTooltip
          activity={hoveredActivity}
          position={tooltipPosition}
        />
      )}

      {/* Context menu */}
      {contextMenu.visible && contextMenuActivity && (
        <TimelineContextMenu
          activity={contextMenuActivity}
          position={contextMenu.position}
          onClose={handleContextMenuClose}
          onEdit={handleEditActivity}
          onDelete={handleDeleteActivity}
          onSplit={handleSplitActivity}
          onDuplicate={handleDuplicateActivity}
        />
      )}
    </div>
  );
};

export default Timeline;