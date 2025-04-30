/**
 * Utility functions for time and date formatting
 */

/**
 * Format a date to a readable string
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  if (!date) return '';
  
  try {
    // Format: "15 Mar 2023"
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format minutes to a readable duration (e.g. "2h 30m")
 * @param minutes Total minutes
 * @returns Formatted duration string
 */
export function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
}

/**
 * Get a time string from a date (e.g. "14:30")
 * @param date The date to extract time from
 * @returns Time string
 */
export function getTimeString(date: Date): string {
  if (!date) return '';
  
  try {
    // Format: "14:30"
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error getting time string:', error);
    return '';
  }
}

/**
 * Format time from minutes to a human-readable string (e.g. "2h 30m")
 */
export function formatTimeFromMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
}

/**
 * Format elapsed time from a start date to now
 */
export function formatElapsedTime(startDate: Date): string {
  const now = new Date();
  const elapsedMs = now.getTime() - startDate.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
  
  return formatTimeFromMinutes(elapsedMinutes);
} 