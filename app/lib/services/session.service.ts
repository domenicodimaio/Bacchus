/**
 * Session Service
 * 
 * Gestisce le sessioni di consumo, tracciamento BAC, aggiunta di bevande e cibo.
 */

import { calculateAlcoholGrams, getBACDangerLevel } from '../bac/calculator';
import { 
  DrinkRecord, 
  FoodRecord, 
  calculateSoberTime, 
  generateBACTimeSeries,
  ProfileData,
  TimePoint
} from '../bac/visualization';
import {
  getProfiles,
  getProfileById,
  getFirstProfile,
} from './profile.service';
import { BAC_LIMITS, getBACLevel, METABOLISM_RATE } from '../../constants/bac';
import { calculateTimeToSober, calculateTimeToLegalLimit, formatTimeToSober } from '../../utils/bacCalculator';

// Implementazione locale della formula di Widmark per il calcolo del BAC
function calculateBAC(
  gender: string | 'male' | 'female',
  weightKg: number | string,
  alcoholGrams: number,
  hoursSinceFirstDrink: number | string,
  foodAbsorptionFactor: number = 1.0
): number {
  // Validazione dei parametri
  if (!gender || !weightKg || alcoholGrams === undefined || hoursSinceFirstDrink === undefined) {
    console.warn("⚠️ Parametri mancanti nel calcolo BAC, ritorno 0");
    return 0;
  }

  try {
    // Normalize gender
    const normalizedGender = (typeof gender === 'string' ? gender.toLowerCase() : 'male') as 'male' | 'female';
    
    // Normalize weight and validate
    let normalizedWeight: number;
    if (typeof weightKg === 'string') {
      normalizedWeight = parseFloat(weightKg);
    } else {
      normalizedWeight = weightKg;
    }
    
    // Controllo validità peso
    if (isNaN(normalizedWeight) || normalizedWeight <= 0) {
      console.warn("⚠️ Peso non valido nel calcolo BAC:", weightKg);
      normalizedWeight = 70; // Valore predefinito di sicurezza
    }
    
    // Normalize hours and validate
    let normalizedHours: number;
    if (typeof hoursSinceFirstDrink === 'string') {
      normalizedHours = parseFloat(hoursSinceFirstDrink);
    } else {
      normalizedHours = hoursSinceFirstDrink;
    }
    
    // Controllo validità ore
    if (isNaN(normalizedHours) || normalizedHours < 0) {
      console.warn("⚠️ Ore non valide nel calcolo BAC:", hoursSinceFirstDrink);
      normalizedHours = 0; // Valore predefinito di sicurezza
    }
    
    // Normalize alcohol grams and validate
    let normalizedAlcoholGrams: number;
    if (typeof alcoholGrams === 'string') {
      normalizedAlcoholGrams = parseFloat(alcoholGrams);
    } else {
      normalizedAlcoholGrams = alcoholGrams;
    }
    
    // Controllo validità grammi alcol
    if (isNaN(normalizedAlcoholGrams) || normalizedAlcoholGrams < 0) {
      console.warn("⚠️ Grammi alcol non validi nel calcolo BAC:", alcoholGrams);
      normalizedAlcoholGrams = 0; // Valore predefinito di sicurezza
    }
    
    // Normalize food factor and validate
    let normalizedFoodFactor: number;
    if (typeof foodAbsorptionFactor === 'string') {
      normalizedFoodFactor = parseFloat(foodAbsorptionFactor);
    } else {
      normalizedFoodFactor = foodAbsorptionFactor;
    }
    
    // Controllo validità fattore assorbimento
    if (isNaN(normalizedFoodFactor) || normalizedFoodFactor <= 0) {
      console.warn("⚠️ Fattore assorbimento non valido nel calcolo BAC:", foodAbsorptionFactor);
      normalizedFoodFactor = 1.0; // Valore predefinito di sicurezza
    }
    
    // Widmark factor (r) - body water content
    // Men: ~0.68, Women: ~0.55
    const widmarkFactor = normalizedGender === 'male' ? 0.68 : 0.55;
    
    // Calculate BAC without time adjustment
    // BAC = (A / (W * r)) * 1000
    // A: alcohol in grams
    // W: weight in grams
    // r: Widmark factor
    const weightGrams = normalizedWeight * 1000;
    let bac = (normalizedAlcoholGrams / (weightGrams * widmarkFactor)) * 1000;
    
    // Apply food absorption factor (slower alcohol absorption with food)
    bac = bac * normalizedFoodFactor;
    
    // Subtract alcohol metabolized over time
    // Average metabolism rate is about 0.015 g/L per hour
    const metabolized = METABOLISM_RATE * normalizedHours;
    bac = Math.max(0, bac - metabolized);
    
    console.log(`🧮 Calcolo BAC - Genere: ${normalizedGender}, Peso: ${normalizedWeight}kg, Alcol: ${normalizedAlcoholGrams}g, Ore: ${normalizedHours}, Assorbimento: ${normalizedFoodFactor}, BAC finale: ${bac.toFixed(4)} g/L`);
    
    return bac;
  } catch (error) {
    console.error('❌ Errore nel calcolo BAC:', error);
    return 0; // Valore predefinito in caso di errore
  }
}

// Tipo per il profilo dell'utente
export interface UserProfile {
  id: string;
  name: string;
  gender: 'male' | 'female';
  weightKg: number;
  age: number;
  height: number;
  drinkingFrequency: 'rarely' | 'occasionally' | 'regularly' | 'frequently';
}

// Tipo per la sessione di consumo
export interface Session {
  id: string;
  startTime: Date;
  sessionStartTime: Date;
  profile: UserProfile;
  drinks: Array<DrinkRecord & { 
    id: string; 
    name: string; 
    volume: string;
    time: string;
  }>;
  foods: Array<FoodRecord & { 
    id: string; 
    name: string;
    time: string;
  }>;
  currentBAC: number;
  status: 'safe' | 'caution' | 'warning' | 'danger' | 'critical';
  bacTimePoints: number[];
  soberTime: string;
  sessionDuration: string;
  timeToSober?: number; // Tempo in minuti per tornare sobri
  legalTime?: string; // Tempo formattato per raggiungere il limite legale
  timeToLegal?: number; // Tempo in minuti per raggiungere il limite legale
  bacSeries?: Array<{ time: string | Date; bac: number }>; // Serie temporale per il grafico BAC
}

// Stato globale delle sessioni
let activeSession: Session | null = null;
let sessionHistory: Session[] = [];

/**
 * Ottiene la sessione attiva o null se non esiste
 */
export function getActiveSession(): Session | null {
  return activeSession;
}

/**
 * Crea una nuova sessione
 */
export function createSession(profile: UserProfile): Session {
  const now = new Date();
  
  // Se esiste una sessione attiva, salvala prima nella cronologia
  if (activeSession) {
    console.log('Sessione attiva trovata, salvataggio automatico in cronologia');
    // Copia la sessione attuale nella cronologia
    sessionHistory.push({ ...activeSession });
  }
  
  // Crea una nuova sessione
  const newSession: Session = {
    id: Date.now().toString(),
    startTime: now,
    sessionStartTime: now,
    profile,
    drinks: [],
    foods: [],
    currentBAC: 0,
    status: 'safe',
    bacTimePoints: [0, 0, 0, 0],
    soberTime: '0h 00m',
    sessionDuration: '0h 00m'
  };
  
  // Imposta come sessione attiva
  activeSession = newSession;
  
  return newSession;
}

/**
 * Gets or creates a session with the first available profile
 */
export function getOrCreateSessionWithFirstProfile(): Session | null {
  const activeSession = getActiveSession();
  if (activeSession) return activeSession;
  
  // Ottieni il primo profilo disponibile
  const profile = getFirstProfile();
  if (!profile) return null;
  
  // Crea una nuova sessione con questo profilo
  return createSession(profile);
}

// Rimpiazza la vecchia funzione con la nuova
export const getOrCreateSessionWithDefaultProfile = getOrCreateSessionWithFirstProfile;

/**
 * Aggiunge una bevanda alla sessione attiva
 */
export function addDrink(drink: DrinkRecord & { 
  id: string; 
  name: string; 
  volume: string;
  time: string;
}): Session | null {
  if (!activeSession) return null;
  
  console.log("ℹ️ Aggiunta bevanda alla sessione:", JSON.stringify(drink, null, 2));
  
  // Verifica lo stato iniziale del BAC prima di aggiungere la bevanda
  const initialBAC = activeSession.currentBAC;
  console.log(`ℹ️ BAC prima dell'aggiunta: ${initialBAC.toFixed(3)}`);
  
  // Assicuriamoci che i grammi di alcol siano definiti come numero
  if (typeof drink.alcoholGrams === 'string') {
    drink.alcoholGrams = parseFloat(drink.alcoholGrams);
  }
  
  // Se non sono presenti i grammi di alcol, assegniamo un valore predefinito
  if (isNaN(drink.alcoholGrams) || drink.alcoholGrams === undefined) {
    console.warn("⚠️ alcoholGrams non definito, imposto valore predefinito 10g");
    drink.alcoholGrams = 10; // Valore predefinito ragionevole
  }
  
  // Se è la prima bevanda, assicuriamoci che il valore iniziale del BAC sia 0
  if (activeSession.drinks.length === 0) {
    activeSession.currentBAC = 0;
  }
  
  // Aggiungi la bevanda alla lista
  activeSession.drinks.push(drink);
  console.log(`ℹ️ Numero bevande dopo l'aggiunta: ${activeSession.drinks.length}`);
  
  // Ricalcola il BAC basato su tutte le bevande e cibi
  updateSessionBAC();
  
  // Debug log per verifica
  console.log(`ℹ️ BAC dopo l'aggiunta: ${activeSession.currentBAC.toFixed(3)} (differenza: ${(activeSession.currentBAC - initialBAC).toFixed(3)})`);
  console.log(`ℹ️ Stato sessione: ${activeSession.status}`);
  
  return activeSession;
}

/**
 * Aggiunge un cibo alla sessione attiva
 */
export function addFood(food: FoodRecord & { 
  id: string; 
  name: string;
  time: string;
}): Session | null {
  if (!activeSession) return null;
  
  // Aggiungi il cibo alla lista
  activeSession.foods.push(food);
  
  // Ricalcola il BAC basato su tutte le bevande e cibi
  updateSessionBAC();
  
  return activeSession;
}

/**
 * Rimuove una bevanda dalla sessione attiva
 */
export function removeDrink(drinkId: string): Session | null {
  if (!activeSession) return null;
  
  // Trova l'indice della bevanda
  const index = activeSession.drinks.findIndex(d => d.id === drinkId);
  
  if (index !== -1) {
    // Rimuovi la bevanda dalla lista
    activeSession.drinks.splice(index, 1);
    
    // Ricalcola il BAC
    updateSessionBAC();
  }
  
  return activeSession;
}

/**
 * Rimuove un cibo dalla sessione attiva
 */
export function removeFood(foodId: string): Session | null {
  if (!activeSession) return null;
  
  // Trova l'indice del cibo
  const index = activeSession.foods.findIndex(f => f.id === foodId);
  
  if (index !== -1) {
    // Rimuovi il cibo dalla lista
    activeSession.foods.splice(index, 1);
    
    // Ricalcola il BAC
    updateSessionBAC();
  }
  
  return activeSession;
}

/**
 * Aggiorna il BAC della sessione attiva
 * @returns La sessione aggiornata o null se non c'è una sessione attiva
 */
export function updateSessionBAC(): Session | null {
  if (!activeSession) {
    console.log('Nessuna sessione attiva da aggiornare');
    return null;
  }
  
  console.log('Aggiornamento BAC della sessione attiva');
  
  try {
    // Ottieni il profilo dalla sessione
    const profile = activeSession.profile;
    if (!profile) {
      console.error('Profilo mancante nella sessione attiva');
      return activeSession;
    }
    
    // Determina se ci sono bevande registrate
    if (!activeSession.drinks || activeSession.drinks.length === 0) {
      // Se non ci sono bevande, il BAC è 0
      console.log('Nessuna bevanda registrata, BAC impostato a 0');
      activeSession.currentBAC = 0;
      activeSession.status = 'safe';
      activeSession.bacSeries = [{ time: new Date().toISOString(), bac: 0 }];
      return activeSession;
    }
    
    // Calcola il BAC corrente usando i metodi esistenti
    try {
      console.log(`Calcolo BAC per profilo: ${profile.name} (${profile.gender}, ${profile.weightKg}kg)`);
      
      // Ordina le bevande per orario
      const sortedDrinks = [...activeSession.drinks].sort((a, b) => 
        new Date(a.time).getTime() - new Date(b.time).getTime()
      );
      
      // Calcola i punti della serie temporale
      const bacPoints: Array<{ time: string; bac: number }> = [];
      let runningBAC = 0;
      
      // Aggiungi punto iniziale
      const firstDrinkTime = new Date(sortedDrinks[0].time);
      const startTime = new Date(firstDrinkTime.getTime() - 30 * 60 * 1000); // 30 minuti prima
      bacPoints.push({ time: startTime.toISOString(), bac: 0 });
      
      // Calcola BAC per ogni bevanda
      for (const drink of sortedDrinks) {
        const drinkTime = new Date(drink.time);
        const hoursSinceStart = (drinkTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        // Calcola il metabolismo dell'alcol fino a questo punto
        const metabolized = 0.015 * hoursSinceStart;
        
        // Aggiungi l'effetto della bevanda
        const alcoholEffect = drink.alcoholGrams * 0.002;
        runningBAC = Math.max(0, runningBAC - metabolized + alcoholEffect);
        
        bacPoints.push({ time: drink.time, bac: runningBAC });
      }
      
      // Aggiungi punto finale (proiezione)
      const now = new Date();
      const hoursSinceLastDrink = (now.getTime() - new Date(sortedDrinks[sortedDrinks.length - 1].time).getTime()) / (1000 * 60 * 60);
      const finalBAC = Math.max(0, runningBAC - (0.015 * hoursSinceLastDrink));
      bacPoints.push({ time: now.toISOString(), bac: finalBAC });
      
      // Aggiorna bacSeries nella sessione
      activeSession.bacSeries = bacPoints;
      
      // Aggiorna il BAC corrente
      activeSession.currentBAC = finalBAC;
      
      // Aggiorna lo stato della sessione in base al BAC
      if (finalBAC >= BAC_LIMITS.penalHighThreshold) {
        activeSession.status = 'critical';
      } else if (finalBAC >= BAC_LIMITS.penalLowThreshold) {
        activeSession.status = 'danger';
      } else if (finalBAC >= BAC_LIMITS.cautionThreshold) {
        activeSession.status = 'warning';
      } else if (finalBAC > 0) {
        activeSession.status = 'caution';
      } else {
        activeSession.status = 'safe';
      }
      
      // Calcola il tempo per arrivare a sobrietà e al limite legale
      const timeToSoberMinutes = calculateTimeToSober(finalBAC);
      activeSession.soberTime = formatTimeToSober(timeToSoberMinutes);
      
      const timeToLegalMinutes = calculateTimeToLegalLimit(finalBAC);
      activeSession.legalTime = formatTimeToSober(timeToLegalMinutes);
      
      return activeSession;
      
    } catch (innerError) {
      console.error('Errore durante il calcolo del BAC:', innerError);
      return activeSession;
    }
    
  } catch (error) {
    console.error('Errore nel calcolo del BAC:', error);
    return activeSession;
  }
}

/**
 * Termina la sessione attiva e la aggiunge alla cronologia
 */
export function endSession(): Session | null {
  if (!activeSession) return null;
  
  // Salva la sessione nella cronologia
  sessionHistory.push({ ...activeSession });
  
  // Crea una copia da restituire
  const endedSession = { ...activeSession };
  
  // Resetta la sessione attiva
  activeSession = null;
  
  return endedSession;
}

/**
 * Elimina una sessione dalla cronologia
 */
export function deleteSession(sessionId: string): boolean {
  // Se la sessione da eliminare è quella attiva
  if (activeSession && activeSession.id === sessionId) {
    activeSession = null;
    return true;
  }
  
  // Altrimenti cerca nella cronologia
  const initialLength = sessionHistory.length;
  sessionHistory = sessionHistory.filter(session => session.id !== sessionId);
  
  // Ritorna true se una sessione è stata eliminata
  return sessionHistory.length < initialLength;
}

/**
 * Ottiene la cronologia delle sessioni
 */
export function getSessionHistory(): Session[] {
  return [...sessionHistory];
}

/**
 * Calcola il tempi stimati per raggiungere determinati livelli di BAC
 */
export function calculateBACTimeline(targetBAC: number): Date | null {
  if (!activeSession || activeSession.currentBAC === 0) return null;
  
  const { currentBAC } = activeSession;
  
  // Se il BAC attuale è inferiore al target, non si raggiungerà mai
  if (currentBAC < targetBAC) return null;
  
  // Calcola quante ore ci vorranno per raggiungere il target BAC
  const hoursToTarget = (currentBAC - targetBAC) / 0.015; // 0.015% per ora
  
  // Calcola la data/ora prevista
  const targetTime = new Date();
  targetTime.setHours(targetTime.getHours() + Math.floor(hoursToTarget));
  targetTime.setMinutes(
    targetTime.getMinutes() + Math.round((hoursToTarget % 1) * 60)
  );
  
  return targetTime;
}

export default {
  getActiveSession,
  createSession,
  getOrCreateSessionWithDefaultProfile,
  addDrink,
  addFood,
  removeDrink,
  removeFood,
  endSession,
  deleteSession,
  getSessionHistory,
  calculateBACTimeline,
}; 