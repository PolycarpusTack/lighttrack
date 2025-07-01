import { KeyboardShortcutManager } from './KeyboardShortcutManager';
import { store } from '../store';

/**
 * Bridge between Redux settings and KeyboardShortcutManager
 * Keeps shortcuts synchronized between settings storage and runtime manager
 */
export class KeyboardShortcutBridge {
  private static instance: KeyboardShortcutBridge;
  private manager: KeyboardShortcutManager;
  private unsubscribe: (() => void) | null = null;

  private constructor() {
    this.manager = KeyboardShortcutManager.getInstance();
    this.initialize();
  }

  static getInstance(): KeyboardShortcutBridge {
    if (!KeyboardShortcutBridge.instance) {
      KeyboardShortcutBridge.instance = new KeyboardShortcutBridge();
    }
    return KeyboardShortcutBridge.instance;
  }

  private initialize(): void {
    // Subscribe to Redux store changes
    this.unsubscribe = store.subscribe(() => {
      this.syncShortcutsFromSettings();
    });

    // Initial sync
    this.syncShortcutsFromSettings();
  }

  /**
   * Sync shortcuts from Redux settings to KeyboardShortcutManager
   */
  private syncShortcutsFromSettings(): void {
    const state = store.getState();
    const shortcuts = state.settings?.settings?.shortcuts;
    
    if (!shortcuts) return;

    // Update each shortcut in the manager
    Object.entries(shortcuts).forEach(([id, keys]) => {
      try {
        const currentShortcut = this.manager.getShortcut(id);
        if (currentShortcut && currentShortcut.keys !== keys) {
          this.manager.updateShortcut(id, keys as string);
        }
      } catch (error) {
        console.error(`Failed to sync shortcut ${id}:`, error);
      }
    });
  }

  /**
   * Update a shortcut in both systems
   */
  updateShortcut(id: string, keys: string): { success: boolean; error?: string } {
    try {
      // Update in manager
      this.manager.updateShortcut(id, keys);
      
      // The settings will be updated through Redux actions
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset all shortcuts to defaults
   */
  resetToDefaults(): void {
    this.manager.resetToDefaults();
  }

  /**
   * Enable/disable a specific shortcut
   */
  setShortcutEnabled(id: string, enabled: boolean): void {
    this.manager.setShortcutEnabled(id, enabled);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

// Initialize the bridge when the module is loaded
KeyboardShortcutBridge.getInstance();