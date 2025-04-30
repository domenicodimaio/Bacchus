/**
 * Utility per la formattazione delle date
 */

/**
 * Formatta il tempo trascorso dall'inizio della sessione
 * @param startTime Orario di inizio
 * @returns Stringa formattata (es. "2h 30m")
 */
export function formatTimeSinceStart(startTime: Date | string | undefined): string {
  if (!startTime) return '0h 0m';
  
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const now = new Date();
  
  // Calcola la differenza in minuti
  const diffMs = now.getTime() - start.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  // Converti in ore e minuti
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  return `${hours}h ${minutes}m`;
}

/**
 * Formatta una data in formato leggibile
 * @param date Data da formattare
 * @returns Stringa formattata (es. "15 Mar 2023, 14:30")
 */
export function formatReadableDate(date: Date | string | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatta un orario in formato HH:MM
 * @param date Data da formattare
 * @returns Stringa formattata (es. "14:30")
 */
export function formatTime(date: Date | string | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calcola e formatta la durata tra due date
 * @param startDate Data di inizio
 * @param endDate Data di fine (opzionale, default = ora)
 * @returns Stringa formattata (es. "2h 30m")
 */
export function formatDuration(startDate: Date | string | undefined, endDate?: Date | string): string {
  if (!startDate) return '0h 0m';
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = endDate 
    ? (typeof endDate === 'string' ? new Date(endDate) : endDate) 
    : new Date();
  
  // Calcola la differenza in minuti
  const diffMs = end.getTime() - start.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  // Converti in ore e minuti
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  return `${hours}h ${minutes}m`;
} 