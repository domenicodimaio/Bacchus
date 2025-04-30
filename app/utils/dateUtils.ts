/**
 * Utility per la formattazione delle date
 */

/**
 * Formatta la data di una sessione in un formato leggibile
 * @param dateValue La data da formattare (string o Date)
 * @returns La data formattata
 */
export const formatSessionDate = (dateValue: Date | string): string => {
  try {
    // Se il valore è nullo o indefinito, ritorna un valore di default
    if (!dateValue) return 'Data non disponibile';
    
    // Converti in data se è una stringa
    let date: Date;
    if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      return 'Formato data non valido';
    }
    
    // Verifica che la data sia valida
    if (isNaN(date.getTime())) {
      return 'Data non valida';
    }
    
    // Formattazione semplice e affidabile
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleDateString(undefined, options);
  } catch (error) {
    return 'Errore data';
  }
};

/**
 * Formatta un timestamp in orario leggibile (HH:MM)
 * @param dateValue La data da formattare (string o Date)
 * @returns L'orario formattato
 */
export const formatTime = (dateValue: Date | string): string => {
  try {
    if (!dateValue) return '--:--';
    
    let date: Date;
    if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else {
      date = dateValue;
    }
    
    if (isNaN(date.getTime())) {
      return '--:--';
    }
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return '--:--';
  }
};

/**
 * Calcola la durata tra due date in formato leggibile
 * @param startDate Data di inizio
 * @param endDate Data di fine (opzionale, default: now)
 * @returns Durata formattata (es. "2h 30m")
 */
export const formatDuration = (startDate: Date | string, endDate?: Date | string): string => {
  try {
    if (!startDate) return '0h 00m';
    
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = endDate 
      ? (typeof endDate === 'string' ? new Date(endDate) : endDate)
      : new Date();
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return '0h 00m';
    }
    
    const durationMs = end.getTime() - start.getTime();
    if (durationMs <= 0) return '0h 00m';
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  } catch (error) {
    return '0h 00m';
  }
}; 