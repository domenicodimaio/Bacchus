/**
 * Utility functions for time formatting
 */

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