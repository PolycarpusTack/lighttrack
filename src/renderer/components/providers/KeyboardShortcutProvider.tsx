import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { startActivity, stopActivity, pauseActivity, resumeActivity } from '../../store/slices/activitySlice';
import { openModal, setCommandPaletteOpen, setSearchOpen } from '../../store/slices/uiSlice';

interface KeyboardShortcutProviderProps {
  children: React.ReactNode;
}

/**
 * Provides keyboard shortcut functionality throughout the application
 * Sets up all global keyboard shortcuts and their handlers
 */
export const KeyboardShortcutProvider: React.FC<KeyboardShortcutProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { current: currentActivity } = useAppSelector(state => state.activity);

  // Activity shortcuts
  useKeyboardShortcut('startStop', () => {
    if (currentActivity) {
      // Stop current activity
      dispatch(stopActivity(currentActivity.id));
    } else {
      // Open quick entry modal to start new activity
      dispatch(openModal({ type: 'quickStart' }));
    }
  }, [currentActivity, dispatch]);

  useKeyboardShortcut('pause', () => {
    if (currentActivity) {
      if (currentActivity.isPaused) {
        dispatch(resumeActivity(currentActivity.id));
      } else {
        dispatch(pauseActivity(currentActivity.id));
      }
    }
  }, [currentActivity, dispatch]);

  useKeyboardShortcut('quickEntry', () => {
    dispatch(openModal({ type: 'quickStart' }));
  }, [dispatch]);

  // Navigation shortcuts
  useKeyboardShortcut('openDashboard', () => {
    navigate('/');
  }, [navigate]);

  useKeyboardShortcut('openTimeline', () => {
    navigate('/timeline');
  }, [navigate]);

  useKeyboardShortcut('openAnalytics', () => {
    navigate('/analytics');
  }, [navigate]);

  // General shortcuts
  useKeyboardShortcut('commandPalette', () => {
    dispatch(setCommandPaletteOpen(true));
  }, [dispatch]);

  useKeyboardShortcut('search', () => {
    dispatch(setSearchOpen(true));
  }, [dispatch]);

  // Initialize keyboard shortcut manager
  useEffect(() => {
    // Manager is initialized via singleton pattern
    console.log('Keyboard shortcuts initialized');
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  return <>{children}</>;
};

export default KeyboardShortcutProvider;