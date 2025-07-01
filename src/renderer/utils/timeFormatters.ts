/**
 * Utility functions for formatting time values
 */

/**
 * Format duration in milliseconds to human readable format
 * @param milliseconds - Duration in milliseconds
 * @param short - Use short format (1h 30m vs 1 hour 30 minutes)
 * @returns Formatted duration string
 */
export const formatDuration = (milliseconds: number, short: boolean = false): string => {
  if (milliseconds === 0) return short ? '0m' : '0 minutes';

  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(short ? `${hours}h` : `${hours} hour${hours !== 1 ? 's' : ''}`);
  }

  if (minutes > 0) {
    parts.push(short ? `${minutes}m` : `${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }

  // Only show seconds if less than 1 hour and not using short format
  if (!short && hours === 0 && seconds > 0) {
    parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
  }

  return parts.join(' ');
};

/**
 * Format a Date object to time string (HH:MM)
 * @param date - Date object
 * @param use24Hour - Use 24-hour format (default: false)
 * @returns Formatted time string
 */
export const formatTime = (date: Date, use24Hour: boolean = false): string => {
  if (use24Hour) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format a Date object to date string
 * @param date - Date object
 * @param format - Date format ('short' | 'medium' | 'long')
 * @returns Formatted date string
 */
export const formatDate = (date: Date, format: 'short' | 'medium' | 'long' = 'medium'): string => {
  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric'
      });
    case 'medium':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    case 'long':
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    default:
      return date.toLocaleDateString();
  }
};

/**
 * Format a Date object to relative time string (e.g., "2 hours ago")
 * @param date - Date object
 * @param now - Current date (optional, defaults to new Date())
 * @returns Relative time string
 */
export const formatRelativeTime = (date: Date, now: Date = new Date()): string => {
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return formatDate(date, 'short');
  }
};

/**
 * Get duration between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Duration in milliseconds
 */
export const getDuration = (startDate: Date, endDate: Date): number => {
  return endDate.getTime() - startDate.getTime();
};

/**
 * Format seconds to time components
 * @param seconds - Total seconds
 * @returns Object with hours, minutes, and seconds
 */
export const secondsToTimeComponents = (seconds: number): { hours: number; minutes: number; seconds: number } => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return { hours, minutes, seconds: secs };
};

/**
 * Parse time string (HH:MM) to Date object
 * @param timeString - Time string in HH:MM format
 * @param baseDate - Base date (optional, defaults to today)
 * @returns Date object
 */
export const parseTimeString = (timeString: string, baseDate: Date = new Date()): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/**
 * Get start of day for a given date
 * @param date - Input date
 * @returns Date object at start of day (00:00:00)
 */
export const startOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

/**
 * Get end of day for a given date
 * @param date - Input date
 * @returns Date object at end of day (23:59:59.999)
 */
export const endOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

/**
 * Get start of week for a given date (Sunday)
 * @param date - Input date
 * @returns Date object at start of week
 */
export const startOfWeek = (date: Date): Date => {
  const newDate = new Date(date);
  const day = newDate.getDay();
  newDate.setDate(newDate.getDate() - day);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

/**
 * Get end of week for a given date (Saturday)
 * @param date - Input date
 * @returns Date object at end of week
 */
export const endOfWeek = (date: Date): Date => {
  const newDate = new Date(date);
  const day = newDate.getDay();
  newDate.setDate(newDate.getDate() + (6 - day));
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};