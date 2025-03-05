/**
 * BAC Calculator module
 * 
 * This module calculates the Blood Alcohol Concentration (BAC) based on:
 * - The Widmark formula with modifications
 * - Person's weight, gender, and drinking frequency
 * - Alcohol consumption details (amount, percentage)
 * - Food consumption and its effect on absorption
 */

import { METABOLISM_RATE } from '../../constants/bac';

export interface Profile {
  weight: number; // in kg
  gender: string; // 'Male' or 'Female'
  age: number;
  drinkingFrequency: string; // 'Rarely', 'Occasionally', or 'Frequently'
}

export interface Drink {
  volumeMl: number;
  alcoholPercentage: number;
  time: Date;
}

export interface Food {
  absorptionFactor: number; // 0-1, where lower means more reduction in absorption rate
  time: Date;
}

/**
 * Calculates the distribution ratio (r) based on gender
 * This is the proportion of body weight that alcohol is distributed to
 */
export function getDistributionRatio(gender: string): number {
  return gender === 'Male' ? 0.68 : 0.55; // Lower for females due to higher body fat percentage
}

/**
 * Calculates the metabolism rate (β) in g/L per hour
 * This is the rate at which alcohol is eliminated from the bloodstream
 */
export function getMetabolismRate(drinkingFrequency: string): number {
  switch (drinkingFrequency) {
    case 'Rarely':
      return 0.15; // g/L per hour
    case 'Occasionally':
      return 0.17; // g/L per hour
    case 'Frequently':
      return 0.20; // g/L per hour
    default:
      return 0.17; // Default rate
  }
}

/**
 * Calculates the absorption factor based on food intake
 * Food in stomach slows alcohol absorption
 */
export function calculateAbsorptionFactor(foods: Food[], drinkTime: Date): number {
  // Default absorption factor (no food)
  let absorptionFactor = 1.0;
  
  // Check for foods consumed within 2 hours before the drink
  for (const food of foods) {
    const timeDiffMs = drinkTime.getTime() - food.time.getTime();
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
    
    // If food was consumed within 2 hours before alcohol
    if (timeDiffHours > -2 && timeDiffHours < 2) {
      // Use the lowest absorption factor (most effect)
      absorptionFactor = Math.min(absorptionFactor, food.absorptionFactor);
    }
  }
  
  return absorptionFactor;
}

// Enum for BAC danger levels
export enum BACDangerLevel {
  SAFE = 'SAFE',
  CAUTION = 'CAUTION',
  DANGER = 'DANGER',
  EXTREME = 'EXTREME',
}

// Function to calculate alcohol grams from volume and percentage
export function calculateAlcoholGrams(volumeMl: number, alcoholPercentage: number): number {
  // Density of ethanol is approximately 0.789 g/ml
  const ethanolDensity = 0.789;
  
  // Calculate volume of pure alcohol in ml
  const pureAlcoholMl = volumeMl * (alcoholPercentage / 100);
  
  // Convert to grams
  const alcoholGrams = pureAlcoholMl * ethanolDensity;
  
  return alcoholGrams;
}

/**
 * Calculate time to reach legal limit (BAC < 0.05)
 * @param currentBAC Current BAC level in g/L
 * @param legalLimit Legal limit (default 0.5 g/L)
 * @returns Time in hours to reach legal limit
 */
export function calculateTimeToLegalLimit(
  currentBAC: number, 
  legalLimit: number = 0.5
): number {
  // If already below legal limit, return 0
  if (currentBAC <= legalLimit) return 0;
  
  // Calculate hours needed to metabolize enough alcohol to reach legal limit
  // Time = (Current BAC - Legal Limit) / Metabolism Rate
  return (currentBAC - legalLimit) / METABOLISM_RATE;
}

/**
 * Calculate the BAC at a specific time based on all drinks and food consumed
 * 
 * @param profile - User profile data
 * @param drinks - Array of drink records
 * @param foods - Array of food records
 * @param time - Time to calculate BAC for (defaults to current time)
 * @returns BAC in g/L
 */
export function calculateBACFromProfile(
  profile: Profile,
  drinks: Drink[],
  foods: Food[],
  time: Date = new Date()
): number {
  const { weight, gender, drinkingFrequency } = profile;
  
  // Get constants for calculations
  const r = getDistributionRatio(gender);
  const beta = getMetabolismRate(drinkingFrequency);
  
  // Convert weight to grams
  const weightInGrams = weight * 1000;
  
  // Initialize BAC
  let totalBAC = 0;
  
  // Process each drink
  for (const drink of drinks) {
    // Skip drinks consumed after the calculation time
    if (drink.time > time) continue;
    
    // Calculate time elapsed since drink in hours
    const timeDiffHours = (time.getTime() - drink.time.getTime()) / (1000 * 60 * 60);
    
    // Calculate absorption factor based on food intake
    const absorptionFactor = calculateAbsorptionFactor(foods, drink.time);
    
    // Calculate alcohol amount in grams
    const alcoholGrams = calculateAlcoholGrams(drink.volumeMl, drink.alcoholPercentage);
    
    // Calculate the drink's contribution to BAC based on Widmark formula
    let drinkBAC = (alcoholGrams / (weightInGrams * r)) * absorptionFactor;
    
    // Subtract metabolism over time
    // Only start metabolizing after 30 min (approximate absorption time)
    const metabolizingTime = Math.max(0, timeDiffHours - 0.5);
    const metabolized = beta * metabolizingTime;
    
    // Calculate remaining BAC from this drink
    drinkBAC = Math.max(0, drinkBAC - metabolized);
    
    // Add to total
    totalBAC += drinkBAC;
  }
  
  return totalBAC;
}

/**
 * Calculate the maximum BAC reached during a session
 */
export function calculateMaxBAC(
  profile: Profile,
  drinks: Drink[],
  foods: Food[]
): number {
  if (drinks.length === 0) return 0;
  
  // Sort drinks by time
  const sortedDrinks = [...drinks].sort((a, b) => a.time.getTime() - b.time.getTime());
  
  // Get the time of the last drink plus 1 hour (approximate time to peak BAC)
  const lastDrinkTime = sortedDrinks[sortedDrinks.length - 1].time;
  const peakTime = new Date(lastDrinkTime.getTime() + 60 * 60 * 1000);
  
  // Calculate BAC at peak time
  return calculateBACFromProfile(profile, drinks, foods, peakTime);
}

// Get the danger level based on BAC
export function getBACDangerLevel(bac: number): BACDangerLevel {
  if (bac < 0.03) {
    return BACDangerLevel.SAFE;
  } else if (bac < 0.08) {
    return BACDangerLevel.CAUTION;
  } else if (bac < 0.20) {
    return BACDangerLevel.DANGER;
  } else {
    return BACDangerLevel.EXTREME;
  }
}

// Get descriptive text for BAC levels
export function getBACStatusText(bac: number): string {
  if (bac < 0.03) {
    return "Safe - Minimal impairment";
  } else if (bac < 0.06) {
    return "Mild euphoria, relaxation";
  } else if (bac < 0.08) {
    return "Caution - Impaired judgment";
  } else if (bac < 0.12) {
    return "Danger - Legally impaired";
  } else if (bac < 0.20) {
    return "Severe impairment, poor coordination";
  } else if (bac < 0.30) {
    return "Extreme - Confusion, nausea";
  } else {
    return "Critical - Potential loss of consciousness";
  }
}

// Calculate time to sober (BAC < 0.01)
export function calculateTimeToSober(currentBAC: number): number {
  // Time in hours = BAC / metabolism rate per hour
  return currentBAC / METABOLISM_RATE;
}

// Existing function
export function calculateBAC(
  gender: 'male' | 'female',
  weightKg: number,
  alcoholGrams: number,
  hoursSinceFirstDrink: number,
  foodAbsorptionFactor: number = 1.0
): number {
  // Widmark factor (r) - body water content
  // Men: ~0.68, Women: ~0.55
  const widmarkFactor = gender === 'male' ? 0.68 : 0.55;
  
  // Calculate BAC without time adjustment
  // BAC = (A / (W * r)) * 100
  // A: alcohol in grams
  // W: weight in grams
  // r: Widmark factor
  const weightGrams = weightKg * 1000;
  let bac = (alcoholGrams / (weightGrams * widmarkFactor)) * 100;
  
  // Apply food absorption factor (slower alcohol absorption with food)
  // Food reduces peak BAC - more realistic modeling
  // Range from 0.1 (heavy meal) to 1.0 (empty stomach)
  bac = bac * foodAbsorptionFactor;
  
  // Subtract alcohol metabolized over time
  // Average metabolism rate from constants
  const metabolized = METABOLISM_RATE * hoursSinceFirstDrink;
  bac = Math.max(0, bac - metabolized);
  
  // Round to 3 decimal places for stability
  return Math.round(bac * 1000) / 1000;
} 