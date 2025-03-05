/**
 * Utility functions for BAC calculations
 */

// Tasso di metabolismo dell'alcol (g/L per ora) - valore aggiornato basato su studi scientifici
// Referenza: NHTSA (National Highway Traffic Safety Administration)
const METABOLISM_RATE = 0.015; // La maggior parte degli studi indica 0.015-0.018 g/L/h

/**
 * Calcola il tasso alcolemico (BAC) in base ai parametri forniti
 * Implementazione della formula di Widmark con correzioni moderne
 */
export function calculateBAC(
  gender: 'male' | 'female',
  weightKg: number,
  alcoholGrams: number,
  timeSinceConsumptionHours: number
): number {
  // Fattore di distribuzione dell'alcol (Widmark factor)
  // Basato su studi più recenti con valori più accurati
  const r = gender === 'male' ? 0.68 : 0.55;
  
  // Validazione dei dati di input
  if (weightKg <= 0 || alcoholGrams < 0 || timeSinceConsumptionHours < 0) {
    console.warn('BAC Calculator: parametri non validi', { 
      gender, weightKg, alcoholGrams, timeSinceConsumptionHours 
    });
    return 0;
  }
  
  // Algoritmo di Widmark modificato:
  // BAC = (A / (r * W)) - (M * t)
  // A = grammi di alcol
  // r = fattore di distribuzione
  // W = peso in kg
  // M = tasso di metabolismo
  // t = tempo in ore
  
  // Calcola il BAC iniziale
  const initialBac = alcoholGrams / (r * weightKg);
  
  // Consideriamo che l'assorbimento dell'alcol non è immediato
  // L'alcol raggiunge il picco nel sangue dopo circa 30-60 minuti
  let adjustedTimeSinceConsumption = timeSinceConsumptionHours;
  
  // Se il tempo è inferiore a 1 ora, calcoliamo l'assorbimento progressivo
  if (timeSinceConsumptionHours < 1) {
    // Percentuale di alcol assorbito (cresce linearmente fino a 1 ora)
    const absorptionPercentage = Math.min(1, timeSinceConsumptionHours);
    
    // BAC attuale è una percentuale del BAC massimo
    return initialBac * absorptionPercentage;
  } else {
    // Dopo 1 ora, sottraiamo il metabolismo dall'ora successiva
    adjustedTimeSinceConsumption = timeSinceConsumptionHours - 1;
    
    // BAC finale = BAC iniziale - (metabolismo * tempo)
    let bac = initialBac - (METABOLISM_RATE * adjustedTimeSinceConsumption);
    
    // Assicuriamoci che il BAC non sia negativo
    return Math.max(0, bac);
  }
}

/**
 * Calcola il tempo necessario per tornare completamente sobri (BAC = 0.0)
 * @param currentBAC Tasso alcolemico attuale
 * @returns Tempo in minuti
 */
export function calculateTimeToSober(currentBAC: number): number {
  // Se il BAC è già 0, non c'è tempo di recupero
  if (currentBAC <= 0.01) return 0;
  
  // Tempo in ore = BAC / tasso di metabolismo per ora
  // Aggiungiamo un fattore di sicurezza leggero (5%)
  const hoursToSober = (currentBAC / METABOLISM_RATE) * 1.05;
  
  // Converti in minuti e arrotonda per eccesso
  const minutesToSober = Math.ceil(hoursToSober * 60);
  
  console.log('BAC Calculator - Time to Sober:', {
    currentBAC,
    metabolismRate: METABOLISM_RATE,
    hoursToSober,
    minutesToSober
  });
  
  return minutesToSober;
}

/**
 * Calcola il tempo necessario per raggiungere il limite legale (BAC = 0.5)
 * @param currentBAC Tasso alcolemico attuale
 * @returns Tempo in minuti, 0 se già sotto il limite
 */
export function calculateTimeToLegalLimit(currentBAC: number): number {
  // Se già sotto il limite legale, restituisci 0
  if (currentBAC <= 0.5) return 0;
  
  // Tempo in ore = (BAC - limite legale) / tasso di metabolismo per ora
  // Aggiungiamo un fattore di sicurezza leggero (5%)
  const hoursToLegal = ((currentBAC - 0.5) / METABOLISM_RATE) * 1.05;
  
  // Converti in minuti e arrotonda per eccesso
  const minutesToLegal = Math.ceil(hoursToLegal * 60);
  
  console.log('BAC Calculator - Time to Legal:', {
    currentBAC,
    legalLimit: 0.5,
    metabolismRate: METABOLISM_RATE,
    hoursToLegal,
    minutesToLegal
  });
  
  return minutesToLegal;
}

/**
 * Formatta il tempo in minuti in un formato leggibile (ore e minuti)
 * @param timeInMinutes Tempo in minuti
 * @returns Stringa formattata (es. "2h 30m")
 */
export function formatTimeToSober(timeInMinutes: number): string {
  if (timeInMinutes <= 0) return '0h 00m';
  
  const hours = Math.floor(timeInMinutes / 60);
  const minutes = timeInMinutes % 60;
  
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
} 