import React from 'react';
import { Activity } from '@shared/types/activity';
import styles from './TimelineContextMenu.module.css';

interface TimelineContextMenuProps {
  activity: Activity;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onSplit: (activity: Activity) => void;
  onDuplicate: (activity: Activity) => void;
}

export const TimelineContextMenu: React.FC<TimelineContextMenuProps> = ({
  activity,
  position,
  onClose,
  onEdit,
  onDelete,
  onSplit,
  onDuplicate,
}) => {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleMenuAction = (action: () => void) => {
    action();
    onClose();
  };

  // Position menu to avoid going off screen
  const menuStyle: React.CSSProperties = {
    left: position.x,
    top: position.y,
    transform: position.x > window.innerWidth - 200 ? 'translateX(-100%)' : undefined,
  };

  return (
    <div 
      ref={menuRef}
      className={styles.contextMenu} 
      style={menuStyle}
    >
      <div className={styles.menuHeader}>
        <span className={styles.activityName}>{activity.name}</span>
      </div>
      
      <div className={styles.menuDivider} />
      
      <button 
        className={styles.menuItem}
        onClick={() => handleMenuAction(() => onEdit(activity))}
      >
        <svg className={styles.menuIcon} width="16" height="16" viewBox="0 0 16 16">
          <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61z" fill="currentColor"/>
        </svg>
        Edit Activity
      </button>
      
      <button 
        className={styles.menuItem}
        onClick={() => handleMenuAction(() => onSplit(activity))}
      >
        <svg className={styles.menuIcon} width="16" height="16" viewBox="0 0 16 16">
          <path d="M14 7h-4v2h4v2l3-3-3-3v2zM8 7H2v2h6V7zM8 3H2v2h6V3zM8 11H2v2h6v-2z" fill="currentColor"/>
        </svg>
        Split Activity
      </button>
      
      <button 
        className={styles.menuItem}
        onClick={() => handleMenuAction(() => onDuplicate(activity))}
      >
        <svg className={styles.menuIcon} width="16" height="16" viewBox="0 0 16 16">
          <path d="M4 2a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V2z" fill="currentColor"/>
          <path d="M2 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-1h-1v1a1 1 0 01-1 1H2a1 1 0 01-1-1V7a1 1 0 011-1h1V5H2z" fill="currentColor"/>
        </svg>
        Duplicate Activity
      </button>
      
      <div className={styles.menuDivider} />
      
      <button 
        className={`${styles.menuItem} ${styles.destructive}`}
        onClick={() => handleMenuAction(() => onDelete(activity))}
      >
        <svg className={styles.menuIcon} width="16" height="16" viewBox="0 0 16 16">
          <path d="M6.5 1h3a.5.5 0 01.5.5v1H6v-1a.5.5 0 01.5-.5zM11 2.5v-1A1.5 1.5 0 009.5 0h-3A1.5 1.5 0 005 1.5v1H2.506a.58.58 0 000 1.157h.538l.853 10.66A2 2 0 005.885 16h4.23a2 2 0 001.988-1.683l.853-10.66h.538a.58.58 0 000-1.157H11z" fill="currentColor"/>
        </svg>
        Delete Activity
      </button>
    </div>
  );
};