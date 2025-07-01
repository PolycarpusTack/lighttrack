import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { hideNotification } from '../../store/slices/uiSlice';
import styles from './NotificationContainer.module.css';

const NotificationContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { notifications } = useAppSelector(state => state.ui);

  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.duration && notification.duration > 0) {
        setTimeout(() => {
          dispatch(hideNotification(notification.id));
        }, notification.duration);
      }
    });
  }, [notifications, dispatch]);

  if (notifications.length === 0) {
    return null;
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  return (
    <div className={styles.notificationContainer}>
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`${styles.notification} ${styles[notification.type]}`}
        >
          <span className={styles.icon}>
            {getNotificationIcon(notification.type)}
          </span>
          <div className={styles.content}>
            <div className={styles.title}>{notification.title}</div>
            {notification.message && (
              <div className={styles.message}>{notification.message}</div>
            )}
          </div>
          <button 
            className={styles.closeButton}
            onClick={() => dispatch(hideNotification(notification.id))}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;