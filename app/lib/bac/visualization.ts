/**
 * BAC Visualization Utilities
 * 
 * This module provides functions to generate data points for BAC visualization
 * over time, including:
 * - Time series data for charts
 * - Predictive BAC values
 * - Color coding for BAC levels
 */

import { BAC_COLORS } from '../../constants/bac';
import { calculateBAC, BACDangerLevel, getBACDangerLevel } from './calculator';
import { Profile as BACProfile, Drink as BACDrink, Food as BACFood } from './calculator';

// Definizione locale della costante metabolismo
const METABOLISM_RATE = 0.017; // g/L per ora (valore scientifico)

// Interface for profile data needed for BAC calculations
export interface ProfileData {
  gender: 'male' | 'female';
  weightKg: number;
}

// Interface for drink records used in BAC calculations
export interface DrinkRecord {
  timeConsumed: Date;
  alcoholGrams: number;
}

// Interface for food records used in BAC calculations
export interface FoodRecord {
  timeConsumed: Date;
  absorptionFactor: number;
}

// Time point structure for BAC data visualization
export interface TimePoint {
  time: Date;
  bac: number;
  status: BACDangerLevel;
  color: string;
}

/**
 * Generate a time series of BAC data points based on user's drink and food consumption
 */
export function generateBACTimeSeries(
  profile: ProfileData,
  drinks: DrinkRecord[],
  food: FoodRecord[],
  startTime: Date,
  endTime: Date,
  intervalMinutes: number = 15
): TimePoint[] {
  console.log(`Generazione serie BAC - Inizio: ${startTime.toISOString()}, Fine: ${endTime.toISOString()}, Intervallo: ${intervalMinutes}min`);
  
  // Validazione input
  if (!profile || !drinks || !Array.isArray(drinks) || !startTime || !endTime) {
    console.error('Parametri invalidi in generateBACTimeSeries', { profile, drinks: drinks?.length, startTime, endTime });
    return [];
  }
  
  // Assicurati che startTime ed endTime siano oggetti Date validi
  let validStartTime: Date, validEndTime: Date;
  
  try {
    validStartTime = startTime instanceof Date ? new Date(startTime.getTime()) : new Date(startTime);
    if (isNaN(validStartTime.getTime())) {
      console.error('Data di inizio invalida:', startTime);
      validStartTime = new Date(); // Fallback a data corrente
    }
  } catch (e) {
    console.error('Errore nel parsing della data di inizio:', e);
    validStartTime = new Date();
  }
  
  try {
    validEndTime = endTime instanceof Date ? new Date(endTime.getTime()) : new Date(endTime);
    if (isNaN(validEndTime.getTime())) {
      console.error('Data di fine invalida:', endTime);
      // Usa il tempo corrente + 6 ore come fallback
      validEndTime = new Date();
      validEndTime.setHours(validEndTime.getHours() + 6);
    }
  } catch (e) {
    console.error('Errore nel parsing della data di fine:', e);
    validEndTime = new Date();
    validEndTime.setHours(validEndTime.getHours() + 6);
  }
  
  // Assicurati che endTime sia successivo a startTime
  if (validEndTime <= validStartTime) {
    console.warn('endTime <= startTime, aggiusto automaticamente');
    validEndTime = new Date(validStartTime.getTime());
    validEndTime.setHours(validEndTime.getHours() + 6);
  }
  
  console.log(`Date valide - Inizio: ${validStartTime.toISOString()}, Fine: ${validEndTime.toISOString()}`);
  
  const result: TimePoint[] = [];
  
  // If no drinks, return zero BAC for the time period
  if (drinks.length === 0) {
    console.log('Nessun drink, generando serie con BAC a zero');
    const current = new Date(validStartTime);
    while (current <= validEndTime) {
      result.push({
        time: new Date(current),
        bac: 0,
        status: BACDangerLevel.SAFE,
        color: BAC_COLORS.safe
      });
      current.setMinutes(current.getMinutes() + intervalMinutes);
    }
    console.log(`Serie generata: ${result.length} punti, tutti a zero`);
    return result;
  }
  
  // Valida ogni drink e converti le date
  const validatedDrinks: DrinkRecord[] = [];
  for (const drink of drinks) {
    if (!drink.timeConsumed || isNaN(drink.alcoholGrams)) {
      console.warn('Drink invalido ignorato:', drink);
      continue;
    }
    
    let drinkTime: Date;
    try {
      drinkTime = drink.timeConsumed instanceof Date ? 
        new Date(drink.timeConsumed.getTime()) : 
        new Date(drink.timeConsumed);
        
      if (isNaN(drinkTime.getTime())) {
        console.warn('Tempo consumo drink invalido:', drink.timeConsumed);
        continue;
      }
    } catch (e) {
      console.error('Errore nel parsing del tempo di consumo:', e);
      continue;
    }
    
    validatedDrinks.push({
      timeConsumed: drinkTime,
      alcoholGrams: Number(drink.alcoholGrams)
    });
  }
  
  console.log(`Drinks validati: ${validatedDrinks.length} su ${drinks.length}`);
  
  if (validatedDrinks.length === 0) {
    console.warn('Nessun drink valido, generando serie con BAC a zero');
    const current = new Date(validStartTime);
    while (current <= validEndTime) {
      result.push({
        time: new Date(current),
        bac: 0,
        status: BACDangerLevel.SAFE,
        color: BAC_COLORS.safe
      });
      current.setMinutes(current.getMinutes() + intervalMinutes);
    }
    return result;
  }
  
  // Sort drinks by time consumed
  const sortedDrinks = [...validatedDrinks].sort(
    (a, b) => a.timeConsumed.getTime() - b.timeConsumed.getTime()
  );
  
  // Get the earliest drink time
  const firstDrinkTime = sortedDrinks[0].timeConsumed;
  console.log(`Primo drink consumato alle: ${firstDrinkTime.toISOString()}`);
  
  // Valida e converti anche i dati del cibo
  let validatedFood: FoodRecord[] = [];
  if (food && Array.isArray(food) && food.length > 0) {
    validatedFood = food.filter(item => {
      if (!item.timeConsumed) return false;
      
      try {
        const foodTime = item.timeConsumed instanceof Date ? 
          item.timeConsumed : 
          new Date(item.timeConsumed);
          
        return !isNaN(foodTime.getTime());
      } catch (e) {
        return false;
      }
    });
    
    validatedFood.sort((a, b) => {
      const timeA = a.timeConsumed instanceof Date ? a.timeConsumed.getTime() : new Date(a.timeConsumed).getTime();
      const timeB = b.timeConsumed instanceof Date ? b.timeConsumed.getTime() : new Date(b.timeConsumed).getTime();
      return timeA - timeB;
    });
    
    console.log(`Cibo validato: ${validatedFood.length} elementi`);
  }
  
  // Aggiungi un punto iniziale al tempo di inizio con BAC=0
  // Solo se il tempo di inizio è prima del primo drink
  if (validStartTime < firstDrinkTime) {
    // Aggiungi un punto iniziale con BAC=0
    console.log(`Aggiunto punto iniziale a ${validStartTime.toISOString()} con BAC=0`);
    result.push({
      time: new Date(validStartTime),
      bac: 0,
      status: BACDangerLevel.SAFE,
      color: BAC_COLORS.safe
    });
    
    // Aggiungi anche un punto appena prima del primo drink (5 minuti prima) con BAC=0
    // per avere una transizione migliore nel grafico
    const preFirstDrinkTime = new Date(firstDrinkTime);
    preFirstDrinkTime.setMinutes(preFirstDrinkTime.getMinutes() - 5);
    
    if (preFirstDrinkTime > validStartTime) {
      console.log(`Aggiunto punto pre-drink a ${preFirstDrinkTime.toISOString()} con BAC=0`);
      result.push({
        time: preFirstDrinkTime,
        bac: 0,
        status: BACDangerLevel.SAFE,
        color: BAC_COLORS.safe
      });
    }
  }
  
  // Function to calculate food absorption factor at a given time
  const getFoodFactor = (time: Date): number => {
    // Default absorption factor is 1.0 (no food effect)
    let factor = 1.0;
    
    // Find all food consumed before the given time
    const relevantFood = validatedFood.filter(f => f.timeConsumed <= time);
    
    if (relevantFood.length === 0) {
      return factor;
    }
    
    // Sort food by time consumed (most recent first)
    const sortedFood = [...relevantFood].sort(
      (a, b) => b.timeConsumed.getTime() - a.timeConsumed.getTime()
    );
    
    // Use the most recent food's absorption factor
    // Food effect diminishes over time (4 hours)
    const mostRecentFood = sortedFood[0];
    const hoursSinceFoodConsumed = 
      (time.getTime() - mostRecentFood.timeConsumed.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceFoodConsumed <= 4) {
      // Linear diminishing effect over 4 hours
      const diminishFactor = Math.max(0, 1 - (hoursSinceFoodConsumed / 4));
      // Calculate effect (lower number = stronger effect)
      factor = 1.0 - ((1.0 - mostRecentFood.absorptionFactor) * diminishFactor);
    }
    
    return factor;
  };
  
  // Generate time points
  const current = new Date(validStartTime);
  while (current <= validEndTime) {
    // Calculate total alcohol grams at this point
    const relevantDrinks = validatedDrinks.filter(d => d.timeConsumed <= current);
    const totalAlcoholGrams = relevantDrinks.reduce(
      (sum, drink) => sum + drink.alcoholGrams, 0
    );
    
    // Calculate hours since first drink
    const hoursSinceFirstDrink = 
      (current.getTime() - firstDrinkTime.getTime()) / (1000 * 60 * 60);
    
    // Get food absorption factor
    const foodFactor = getFoodFactor(current);
    
    // Calculate BAC
    const bac = calculateBAC(
      profile.gender,
      profile.weightKg,
      totalAlcoholGrams,
      hoursSinceFirstDrink,
      foodFactor
    );
    
    // Get danger level and appropriate color
    const status = getBACDangerLevel(bac);
    let color;
    
    switch (status) {
      case BACDangerLevel.SAFE:
        color = BAC_COLORS.safe;
        break;
      case BACDangerLevel.CAUTION:
        color = BAC_COLORS.caution;
        break;
      case BACDangerLevel.DANGER:
        color = BAC_COLORS.danger;
        break;
      case BACDangerLevel.EXTREME:
        color = BAC_COLORS.critical;
        break;
      default:
        color = '#ffffff';
    }
    
    // Add the data point
    result.push({
      time: new Date(current),
      bac,
      status,
      color
    });
    
    // Move to the next time interval
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }
  
  return result;
}

/**
 * Calculate when user will be sober (BAC < 0.01)
 */
export function calculateSoberTime(
  currentBAC: number,
  currentTime: Date = new Date()
): Date {
  const hoursToSober = currentBAC / METABOLISM_RATE;
  const soberTime = new Date(currentTime);
  soberTime.setHours(soberTime.getHours() + Math.floor(hoursToSober));
  soberTime.setMinutes(
    soberTime.getMinutes() + Math.round((hoursToSober % 1) * 60)
  );
  return soberTime;
}

/**
 * Generate data for a BAC gauge visualization
 */
export interface GaugeData {
  value: number;
  status: string;
  color: string;
}

export function generateBACGaugeData(bac: number): GaugeData {
  const status = getBACDangerLevel(bac);
  let statusText;
  let color;
  
  switch (status) {
    case BACDangerLevel.SAFE:
      statusText = 'Safe';
      color = BAC_COLORS.safe;
      break;
    case BACDangerLevel.CAUTION:
      statusText = 'Caution';
      color = BAC_COLORS.caution;
      break;
    case BACDangerLevel.DANGER:
      statusText = 'Danger';
      color = BAC_COLORS.danger;
      break;
    case BACDangerLevel.EXTREME:
      statusText = 'Extreme';
      color = BAC_COLORS.critical;
      break;
    default:
      statusText = 'Unknown';
      color = '#ffffff';
  }
  
  return {
    value: bac,
    status: statusText,
    color
  };
}

/**
 * Get color based on BAC danger level
 */
export function getBACColor(bac: number): string {
  const status = getBACDangerLevel(bac);
  
  switch (status) {
    case BACDangerLevel.SAFE:
      return BAC_COLORS.safe;
    case BACDangerLevel.CAUTION:
      return BAC_COLORS.caution;
    case BACDangerLevel.DANGER:
      return BAC_COLORS.danger;
    case BACDangerLevel.EXTREME:
      return BAC_COLORS.critical;
    default:
      return '#ffffff';
  }
}

/**
 * Format BAC for display
 */
export function formatBAC(bac: number): string {
  return bac.toFixed(3);
}

/**
 * Format time for display
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours} hr`;
  } else {
    return `${hours} hr ${mins} min`;
  }
}

/**
 * Get display color for BAC status
 */
export const getStatusColor = (status: 'safe' | 'caution' | 'danger'): string => {
  switch (status) {
    case 'safe':
      return BAC_COLORS.safe;
    case 'caution':
      return BAC_COLORS.caution;
    case 'danger':
      return BAC_COLORS.danger;
    default:
      return BAC_COLORS.safe;
  }
};

/**
 * Format BAC value for display
 */
export const formatBACValue = (bac: number): string => {
  return bac.toFixed(2);
};

/**
 * Format time for display
 */
export const formatTimeValue = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format a date for display
 */
export const formatDateValue = (date: Date): string => {
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Format duration between two dates
 */
export const formatDurationValue = (startDate: Date, endDate: Date): string => {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${diffHrs}h ${diffMins}m`;
}; 