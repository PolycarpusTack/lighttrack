import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux';
import styles from './CommandPalette.module.css';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  action: () => void;
}

const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const commands: Command[] = [
    {
      id: 'start-tracking',
      label: 'Start/Stop Tracking',
      shortcut: 'Ctrl+Shift+T',
      icon: '⏱️',
      action: () => {
        // Dispatch start/stop action
        console.log('Toggle tracking');
      }
    },
    {
      id: 'add-manual',
      label: 'Add Manual Entry',
      shortcut: 'Ctrl+M',
      icon: '➕',
      action: () => {
        console.log('Add manual entry');
      }
    },
    {
      id: 'view-analytics',
      label: 'View Analytics',
      shortcut: 'Ctrl+A',
      icon: '📊',
      action: () => {
        navigate('/analytics');
      }
    },
    {
      id: 'export-csv',
      label: 'Export to CSV',
      shortcut: 'Ctrl+E',
      icon: '📤',
      action: () => {
        console.log('Export to CSV');
      }
    },
    {
      id: 'view-goals',
      label: 'View Goals',
      shortcut: 'Ctrl+G',
      icon: '🎯',
      action: () => {
        navigate('/goals');
      }
    },
    {
      id: 'create-goal',
      label: 'Create New Goal',
      shortcut: 'Ctrl+Shift+G',
      icon: '🎯',
      action: () => {
        navigate('/goals');
        // TODO: Open create goal modal
      }
    },
    {
      id: 'todays-goals',
      label: "View Today's Goals",
      icon: '📅',
      action: () => {
        navigate('/goals');
        // TODO: Filter to today's goals
      }
    }
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleCommandSelect = (command: Command) => {
    command.action();
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={() => setIsOpen(false)} />
      <div className={styles.commandPalette}>
        <input
          ref={inputRef}
          type="text"
          className={styles.commandInput}
          placeholder="Type a command or search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={styles.commandResults}>
          {filteredCommands.map((command, index) => (
            <div
              key={command.id}
              className={`${styles.commandItem} ${index === selectedIndex ? styles.selected : ''}`}
              onClick={() => handleCommandSelect(command)}
            >
              <span className={styles.icon}>{command.icon}</span>
              <span className={styles.commandLabel}>{command.label}</span>
              {command.shortcut && (
                <span className={styles.commandShortcut}>{command.shortcut}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default CommandPalette;