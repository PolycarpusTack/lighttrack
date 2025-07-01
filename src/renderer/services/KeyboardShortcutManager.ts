import { EventEmitter } from 'events';

export interface ShortcutDefinition {
  id: string;
  keys: string;
  description: string;
  category: 'activity' | 'navigation' | 'general';
  enabled: boolean;
}

export interface ShortcutMap {
  [key: string]: string;
}

export type ShortcutCallback = () => void | Promise<void>;

/**
 * Manages keyboard shortcuts for the application
 * Handles registration, execution, and customization of shortcuts
 */
export class KeyboardShortcutManager extends EventEmitter {
  private static instance: KeyboardShortcutManager;
  private shortcuts: Map<string, ShortcutDefinition> = new Map();
  private callbacks: Map<string, ShortcutCallback> = new Map();
  private activeKeys: Set<string> = new Set();
  private enabled: boolean = true;

  // Default shortcuts configuration
  private readonly defaultShortcuts: ShortcutDefinition[] = [
    // Activity shortcuts
    {
      id: 'startStop',
      keys: 'Ctrl+Shift+Space',
      description: 'Start/Stop activity tracking',
      category: 'activity',
      enabled: true,
    },
    {
      id: 'pause',
      keys: 'Ctrl+Shift+T',
      description: 'Pause current activity',
      category: 'activity',
      enabled: true,
    },
    {
      id: 'quickEntry',
      keys: 'Ctrl+Shift+N',
      description: 'Quick activity entry',
      category: 'activity',
      enabled: true,
    },
    // Navigation shortcuts
    {
      id: 'openDashboard',
      keys: 'Ctrl+1',
      description: 'Open Dashboard',
      category: 'navigation',
      enabled: true,
    },
    {
      id: 'openTimeline',
      keys: 'Ctrl+2',
      description: 'Open Timeline',
      category: 'navigation',
      enabled: true,
    },
    {
      id: 'openAnalytics',
      keys: 'Ctrl+3',
      description: 'Open Analytics',
      category: 'navigation',
      enabled: true,
    },
    // General shortcuts
    {
      id: 'commandPalette',
      keys: 'Ctrl+Shift+P',
      description: 'Open command palette',
      category: 'general',
      enabled: true,
    },
    {
      id: 'search',
      keys: 'Ctrl+K',
      description: 'Search',
      category: 'general',
      enabled: true,
    },
  ];

  private constructor() {
    super();
    this.initialize();
  }

  static getInstance(): KeyboardShortcutManager {
    if (!KeyboardShortcutManager.instance) {
      KeyboardShortcutManager.instance = new KeyboardShortcutManager();
    }
    return KeyboardShortcutManager.instance;
  }

  /**
   * Initialize the keyboard shortcut manager
   */
  private initialize(): void {
    // Load default shortcuts
    this.loadDefaultShortcuts();

    // Load custom shortcuts from storage
    this.loadCustomShortcuts();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Load default shortcuts
   */
  private loadDefaultShortcuts(): void {
    this.defaultShortcuts.forEach(shortcut => {
      this.shortcuts.set(shortcut.id, { ...shortcut });
    });
  }

  /**
   * Load custom shortcuts from storage
   */
  private loadCustomShortcuts(): void {
    try {
      const customShortcuts = localStorage.getItem('keyboard-shortcuts');
      if (customShortcuts) {
        const shortcuts = JSON.parse(customShortcuts) as ShortcutDefinition[];
        shortcuts.forEach(shortcut => {
          this.shortcuts.set(shortcut.id, shortcut);
        });
      }
    } catch (error) {
      console.error('Failed to load custom shortcuts:', error);
    }
  }

  /**
   * Save shortcuts to storage
   */
  private saveShortcuts(): void {
    try {
      const shortcuts = Array.from(this.shortcuts.values());
      localStorage.setItem('keyboard-shortcuts', JSON.stringify(shortcuts));
      this.emit('shortcuts:saved');
    } catch (error) {
      console.error('Failed to save shortcuts:', error);
    }
  }

  /**
   * Set up keyboard event listeners
   */
  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Handle window blur to reset active keys
    window.addEventListener('blur', () => {
      this.activeKeys.clear();
    });
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Check if we're in an input field
    const target = event.target as HTMLElement;
    if (this.isInputElement(target)) {
      return;
    }

    // Build the key combination string
    const keyCombo = this.buildKeyCombo(event);
    
    // Check if this matches any registered shortcut
    for (const [id, shortcut] of this.shortcuts.entries()) {
      if (shortcut.enabled && this.normalizeKeys(shortcut.keys) === keyCombo) {
        event.preventDefault();
        event.stopPropagation();
        
        // Execute the callback
        const callback = this.callbacks.get(id);
        if (callback) {
          callback();
          this.emit('shortcut:executed', { id, keys: shortcut.keys });
        }
        
        break;
      }
    }

    // Track active keys
    this.activeKeys.add(event.key.toLowerCase());
  }

  /**
   * Handle keyup events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    this.activeKeys.delete(event.key.toLowerCase());
  }

  /**
   * Check if element is an input field
   */
  private isInputElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      element.contentEditable === 'true'
    );
  }

  /**
   * Build key combination string from keyboard event
   */
  private buildKeyCombo(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    // Platform-specific modifier key
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey;
    
    if (ctrlKey) parts.push('Ctrl');
    if (event.shiftKey) parts.push('Shift');
    if (event.altKey) parts.push('Alt');
    
    // Add the main key
    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      parts.push(key);
    }
    
    return parts.join('+');
  }

  /**
   * Normalize key combination string for comparison
   */
  private normalizeKeys(keys: string): string {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    let normalized = keys;
    
    // Replace Cmd with Ctrl for cross-platform compatibility
    if (isMac) {
      normalized = normalized.replace(/Ctrl/g, 'Cmd');
    }
    
    return normalized;
  }

  /**
   * Register a shortcut callback
   */
  register(id: string, callback: ShortcutCallback): void {
    this.callbacks.set(id, callback);
    this.emit('shortcut:registered', id);
  }

  /**
   * Unregister a shortcut callback
   */
  unregister(id: string): void {
    this.callbacks.delete(id);
    this.emit('shortcut:unregistered', id);
  }

  /**
   * Update a shortcut's key combination
   */
  updateShortcut(id: string, keys: string): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      // Check for conflicts
      const conflict = this.checkForConflicts(keys, id);
      if (conflict) {
        throw new Error(`Shortcut "${keys}" conflicts with "${conflict.description}"`);
      }
      
      shortcut.keys = keys;
      this.saveShortcuts();
      this.emit('shortcut:updated', { id, keys });
    }
  }

  /**
   * Check for shortcut conflicts
   */
  private checkForConflicts(keys: string, excludeId?: string): ShortcutDefinition | null {
    const normalizedKeys = this.normalizeKeys(keys);
    
    for (const [id, shortcut] of this.shortcuts.entries()) {
      if (id !== excludeId && this.normalizeKeys(shortcut.keys) === normalizedKeys) {
        return shortcut;
      }
    }
    
    return null;
  }

  /**
   * Enable/disable a shortcut
   */
  setShortcutEnabled(id: string, enabled: boolean): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = enabled;
      this.saveShortcuts();
      this.emit('shortcut:toggled', { id, enabled });
    }
  }

  /**
   * Get all shortcuts
   */
  getShortcuts(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: ShortcutDefinition['category']): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category);
  }

  /**
   * Get a specific shortcut
   */
  getShortcut(id: string): ShortcutDefinition | undefined {
    return this.shortcuts.get(id);
  }

  /**
   * Reset shortcuts to defaults
   */
  resetToDefaults(): void {
    this.shortcuts.clear();
    this.loadDefaultShortcuts();
    this.saveShortcuts();
    this.emit('shortcuts:reset');
  }

  /**
   * Enable/disable all shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.emit('shortcuts:enabled', enabled);
  }

  /**
   * Check if shortcuts are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get platform-specific key display
   */
  getPlatformKeys(keys: string): string {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    if (isMac) {
      return keys
        .replace(/Ctrl/g, '⌘')
        .replace(/Shift/g, '⇧')
        .replace(/Alt/g, '⌥')
        .replace(/\+/g, '');
    }
    
    return keys;
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this.removeAllListeners();
    this.callbacks.clear();
    this.activeKeys.clear();
  }
}