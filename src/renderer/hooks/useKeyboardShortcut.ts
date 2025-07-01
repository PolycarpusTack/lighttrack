import { useEffect, useCallback, useRef } from 'react';
import { KeyboardShortcutManager, ShortcutCallback } from '../services/KeyboardShortcutManager';

/**
 * Hook for registering a keyboard shortcut
 * Automatically handles cleanup on unmount
 */
export function useKeyboardShortcut(
  shortcutId: string,
  callback: ShortcutCallback,
  deps: React.DependencyList = []
): void {
  const manager = KeyboardShortcutManager.getInstance();
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Create a stable callback that uses the ref
    const stableCallback: ShortcutCallback = () => {
      return callbackRef.current();
    };

    // Register the shortcut
    manager.register(shortcutId, stableCallback);

    // Cleanup on unmount
    return () => {
      manager.unregister(shortcutId);
    };
  }, [shortcutId, ...deps]);
}

/**
 * Hook for getting all keyboard shortcuts
 * Useful for displaying shortcuts in settings or help
 */
export function useKeyboardShortcuts() {
  const manager = KeyboardShortcutManager.getInstance();
  
  const shortcuts = manager.getShortcuts();
  const getPlatformKeys = useCallback((keys: string) => {
    return manager.getPlatformKeys(keys);
  }, [manager]);
  
  const updateShortcut = useCallback((id: string, keys: string) => {
    try {
      manager.updateShortcut(id, keys);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [manager]);
  
  const setShortcutEnabled = useCallback((id: string, enabled: boolean) => {
    manager.setShortcutEnabled(id, enabled);
  }, [manager]);
  
  const resetToDefaults = useCallback(() => {
    manager.resetToDefaults();
  }, [manager]);
  
  return {
    shortcuts,
    getPlatformKeys,
    updateShortcut,
    setShortcutEnabled,
    resetToDefaults,
  };
}

/**
 * Hook for getting shortcuts by category
 */
export function useKeyboardShortcutsByCategory(category: 'activity' | 'navigation' | 'general') {
  const manager = KeyboardShortcutManager.getInstance();
  return manager.getShortcutsByCategory(category);
}

/**
 * Hook for global shortcut management
 */
export function useGlobalShortcuts() {
  const manager = KeyboardShortcutManager.getInstance();
  
  const setEnabled = useCallback((enabled: boolean) => {
    manager.setEnabled(enabled);
  }, [manager]);
  
  const isEnabled = manager.isEnabled();
  
  return {
    isEnabled,
    setEnabled,
  };
}