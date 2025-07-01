import { format, differenceInSeconds, startOfDay, endOfDay } from 'date-fns';

export const formatDuration = (milliseconds: number, format: 'short' | 'long' = 'short'): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (format === 'long') {
    // HH:MM:SS format for timer display
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Short format for activity lists
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

export const formatTime = (date: Date | string): string => {
  return format(new Date(date), 'HH:mm:ss');
};

export const formatDate = (date: Date | string): string => {
  return format(new Date(date), 'yyyy-MM-dd');
};

export const formatDateTime = (date: Date | string): string => {
  return format(new Date(date), 'yyyy-MM-dd HH:mm:ss');
};

export const getDayBounds = (date: Date = new Date()) => {
  return {
    start: startOfDay(date),
    end: endOfDay(date)
  };
};

export const calculateDuration = (start: Date, end: Date): number => {
  return differenceInSeconds(end, start) * 1000;
};