/**
 * BAC Service
 * 
 * Gestisce i calcoli e le conversioni del tasso alcolemico (BAC).
 */

import { 
  calculateBAC as calculateBACFormula, 
  calculateAlcoholGrams,
  getBACDangerLevel
} from '../bac/calculator';
import { DrinkRecord, FoodRecord } from '../bac/visualization';
import { 
  BAC_LIMITS, 
  BAC_COLORS,
  METABOLISM_RATE,
  getBACLevel
} from '../../constants/bac';
import { 
  calculateTimeToSober, 
  calculateTimeToLegalLimit, 
  formatTimeToSober 
} from '../../utils/bacCalculator';

/**
 * Enumera i possibili stati del BAC
 */
export type BACStatus = 'safe' | 'caution' | 'warning' | 'danger' | 'critical';

/**
 * Rappresenta una sessione di consumo
 */
export interface BACSession {
  drinks: DrinkRecord[];
  foods: FoodRecord[];
  gender: 'male' | 'female';
  weightKg: number;
  drinkingFrequency: 'rarely' | 'occasionally' | 'regularly' | 'frequently';
}

/**
 * Calcola il BAC basato su un profilo utente e una lista di bevande e cibi
 */
export function calculateBAC(session: BACSession): number {
  if (session.drinks.length === 0) return 0;
  
  // Ordina bevande e cibi per orario di consumo
  const sortedDrinks = [...session.drinks].sort(
    (a, b) => a.timeConsumed.getTime() - b.timeConsumed.getTime()
  );
  
  const sortedFoods = [...session.foods].sort(
    (a, b) => a.timeConsumed.getTime() - b.timeConsumed.getTime()
  );
  
  // Calcola il totale dei grammi di alcol
  const totalAlcoholGrams = sortedDrinks.reduce(
    (sum, drink) => sum + drink.alcoholGrams, 0
  );
  
  // Trova il tempo della prima bevanda
  const firstDrinkTime = sortedDrinks[0].timeConsumed;
  
  // Calcola le ore trascorse dalla prima bevanda
  const now = new Date();
  const hoursSinceFirstDrink = (now.getTime() - firstDrinkTime.getTime()) / (1000 * 60 * 60);
  
  // Calcola il fattore di assorbimento in base ai cibi consumati
  let foodAbsorptionFactor = 1.0;
  
  if (sortedFoods.length > 0) {
    // Trova il cibo più recente
    const lastFood = sortedFoods[sortedFoods.length - 1];
    const hoursSinceLastFood = (now.getTime() - lastFood.timeConsumed.getTime()) / (1000 * 60 * 60);
    
    // L'effetto del cibo diminuisce nel tempo (massimo 4 ore)
    if (hoursSinceLastFood <= 4) {
      // Fattore di decadimento dell'effetto nel tempo - più realistico
      // Un pasto pesante (absorptionFactor = 0.5) ha effetto per 3-4 ore
      // Un pasto leggero (absorptionFactor = 0.8) ha effetto per 1-2 ore
      const hoursToPeak = lastFood.absorptionFactor < 0.7 ? 1 : 0.5; // Tempo al massimo effetto del cibo
      
      // Se siamo prima del picco, l'assorbimento diminuisce (il cibo sta facendo effetto)
      // Se siamo dopo il picco, l'assorbimento aumenta (l'effetto del cibo diminuisce)
      if (hoursSinceLastFood < hoursToPeak) {
        // Andiamo dal valore iniziale (1.0) fino all'absorptionFactor del cibo
        const progressToMaxEffect = hoursSinceLastFood / hoursToPeak;
        foodAbsorptionFactor = 1.0 - ((1.0 - lastFood.absorptionFactor) * progressToMaxEffect);
      } else {
        // Andiamo dal absorptionFactor del cibo fino a 1.0 in modo graduale
        const remainingEffectTime = 4 - hoursToPeak;
        const progressToNoEffect = Math.min(1, (hoursSinceLastFood - hoursToPeak) / remainingEffectTime);
        foodAbsorptionFactor = lastFood.absorptionFactor + ((1.0 - lastFood.absorptionFactor) * progressToNoEffect);
      }
    }
  }
  
  // Log per debug
  console.log('BAC Service - Food Factors:', {
    hasFoods: sortedFoods.length > 0,
    lastFood: sortedFoods.length > 0 ? sortedFoods[sortedFoods.length - 1] : null,
    foodAbsorptionFactor,
    totalAlcoholGrams,
    hoursSinceFirstDrink
  });
  
  // Calcola il BAC usando la formula Widmark
  return calculateBACFormula(
    session.gender,
    session.weightKg,
    totalAlcoholGrams,
    hoursSinceFirstDrink,
    foodAbsorptionFactor
  );
}

/**
 * Calcola il tempo stimato per tornare completamente sobri (BAC = 0.0)
 * @returns Stringa formattata (es. "2h 30m") o oggetto Date
 */
export function calculateSoberTime(bac: number, returnDate: boolean = false): string | Date {
  // Se il BAC è già praticamente zero, restituisci un valore immediato
  if (bac <= 0.01) return returnDate ? new Date() : '0h 00m';
  
  // Calcola il tempo in ore per tornare a BAC 0.0
  // Formula: Ore = BAC attuale / tasso metabolismo
  const hoursToSober = bac / METABOLISM_RATE;
  
  // Converti in minuti per calcoli più precisi
  const soberTimeMinutes = Math.ceil(hoursToSober * 60);
  
  // Log dettagliato per debug
  console.log('BAC Service - calculateSoberTime:', {
    bac,
    metabolismRate: METABOLISM_RATE,
    hoursToSober,
    soberTimeMinutes
  });
  
  if (returnDate) {
    try {
      // Crea un oggetto Date con il tempo calcolato
      const soberDate = new Date();
      
      // Converti minuti in ore e minuti
      const hours = Math.floor(soberTimeMinutes / 60);
      const minutes = Math.floor(soberTimeMinutes % 60);
      
      soberDate.setHours(soberDate.getHours() + hours);
      soberDate.setMinutes(soberDate.getMinutes() + minutes);
      
      // Verifica che la data sia valida
      if (isNaN(soberDate.getTime())) {
        console.warn('calculateSoberTime: Data non valida generata!', {
          bac,
          soberTimeMinutes,
          hours,
          minutes
        });
        return new Date(); // Fallback a data corrente
      }
      
      // Log per debug
      console.log('BAC Service - Sober Time:', {
        bac,
        soberTimeMinutes,
        hours,
        minutes,
        soberDate: soberDate.toISOString()
      });
      
      return soberDate;
    } catch (error) {
      console.error('Error in calculateSoberTime:', error);
      return new Date(); // Fallback a data corrente in caso di errore
    }
  }
  
  // Formatta il tempo come stringa direttamente invece di usare formatTimeToSober
  const hours = Math.floor(soberTimeMinutes / 60);
  const minutes = Math.floor(soberTimeMinutes % 60);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

/**
 * Calcola il tempo stimato per raggiungere il limite legale (BAC = 0.5)
 * @returns Stringa formattata (es. "1h 15m") o oggetto Date
 */
export function calculateLegalTime(bac: number, returnDate: boolean = false): string | Date {
  // Se il BAC è già sotto il limite legale, restituisci un valore immediato
  if (bac <= BAC_LIMITS.legalLimit) return returnDate ? new Date() : '0h 00m';
  
  // Calcola il tempo in ore per ritornare al limite legale
  // Formula: Ore = (BAC attuale - Limite legale) / tasso metabolismo
  const hoursToLegal = (bac - BAC_LIMITS.legalLimit) / METABOLISM_RATE;
  
  // Converti in minuti per calcoli più precisi
  const legalTimeMinutes = Math.ceil(hoursToLegal * 60);
  
  // Log dettagliato per debug
  console.log('BAC Service - calculateLegalTime:', {
    bac,
    limit: BAC_LIMITS.legalLimit,
    metabolismRate: METABOLISM_RATE,
    hoursToLegal,
    legalTimeMinutes
  });
  
  if (returnDate) {
    try {
      // Crea un oggetto Date con il tempo calcolato
      const legalDate = new Date();
      
      // Converti minuti in ore e minuti
      const hours = Math.floor(legalTimeMinutes / 60);
      const minutes = Math.floor(legalTimeMinutes % 60);
      
      legalDate.setHours(legalDate.getHours() + hours);
      legalDate.setMinutes(legalDate.getMinutes() + minutes);
      
      // Verifica che la data sia valida
      if (isNaN(legalDate.getTime())) {
        console.warn('calculateLegalTime: Data non valida generata!', {
          bac,
          legalTimeMinutes,
          hours,
          minutes
        });
        return new Date(); // Fallback a data corrente
      }
      
      // Log per debug
      console.log('BAC Service - Legal Time:', {
        bac,
        legalTimeMinutes,
        hours,
        minutes,
        legalDate: legalDate.toISOString()
      });
      
      return legalDate;
    } catch (error) {
      console.error('Error in calculateLegalTime:', error);
      return new Date(); // Fallback a data corrente in caso di errore
    }
  }
  
  // Formatta il tempo come stringa
  const hours = Math.floor(legalTimeMinutes / 60);
  const minutes = Math.floor(legalTimeMinutes % 60);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

/**
 * Calcola il livello di pericolo del BAC
 */
export function calculateBACStatus(bac: number): BACStatus {
  return getBACLevel(bac);
}

/**
 * Converte il BAC interno (0-0.5) nel valore visualizzato in g/L (0-5.0)
 * In Italia e in molti paesi europei, il BAC viene misurato in g/L, quindi
 * moltiplichiamo per 10 il valore per ottenere la scala corretta.
 */
export function getBACDisplayValue(bac: number): string {
  return (bac * 10).toFixed(2);
}

export default {
  calculateBAC,
  calculateSoberTime,
  calculateLegalTime,
  calculateBACStatus,
  getBACDisplayValue,
  calculateAlcoholGrams
}; 