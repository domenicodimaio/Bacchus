/**
 * Modello di dati condiviso per le sessioni e le bevande
 * Questo file centralizza tutte le interfacce necessarie per la gestione delle sessioni
 */

import { DrinkRecord } from '../lib/bac/visualization';

/** 
 * Definizione di un profilo utente utilizzato nelle sessioni
 */
export interface UserProfile {
  id: string;
  name: string;
  gender: 'male' | 'female';
  weightKg: number;
  age: number;
  height: number;
  drinkingFrequency: 'rarely' | 'occasionally' | 'regularly' | 'frequently';
  color?: string;
  emoji?: string;
  isDefault?: boolean;
  userId?: string;
  isGuest?: boolean;
  createdAt?: string;
  updatedAt?: string;
  hasCompletedWizard?: boolean;
}

/**
 * Definizione di una bevanda standard per l'aggiunta alla sessione
 * Utilizzata sia dal SessionContext che dal session.service
 */
export interface Drink {
  id: string;
  name: string;
  volume: string;
  time: string;
  alcoholPercentage: string | number;
  alcoholGrams: string | number;
  volumeInMl?: number;   // Per compatibilità con SessionContext
  size?: string;
  timeConsumed?: Date;
  timestamp?: string;
}

/**
 * Definizione di un alimento consumato durante la sessione
 */
export interface FoodRecord {
  id: string;
  name: string;
  icon: string;
  absorptionFactor: number;
  iconColor: string;
  timeConsumed: Date;
  time: string;
  volume?: string;
  size?: {
    id: string;
    name: string;
    multiplier: number;
  };
}

/**
 * Preset di alimenti predefiniti
 */
export interface FoodPreset extends Omit<FoodRecord, 'timeConsumed' | 'time' | 'id'> {
  id: string;
  name: string;
  icon: string;
  absorptionFactor: number;
  iconColor: string;
}

/**
 * Definizione completa di una sessione
 */
export interface Session {
  id: string;
  startTime: Date | string;
  sessionStartTime: Date | string;
  endTime?: Date | string;
  profile: UserProfile;
  drinks: Array<Drink>;
  foods: Array<FoodRecord>;
  currentBAC: number;
  status: 'safe' | 'caution' | 'warning' | 'danger' | 'critical';
  bacTimePoints: number[];
  soberTime: string;
  sessionDuration: string;
  timeToSober?: number;
  legalTime?: string;
  timeToLegal?: number;
  bacSeries?: Array<{ 
    time: string | Date; 
    bac: number;
    isDrinkPoint?: boolean;
    drinksCount?: number;
  }>;
  user_id?: string;
  updated_at?: string | Date;
  isClosed?: boolean;
  isActive?: boolean;
  profileId?: string;
  maxBac?: number;
}

/**
 * Tipo per i dati di tasso alcolemico
 */
export type BacData = {
  current: number;
  max: number;
  soberTime: Date | null;
  legalTime: Date | null;
  status: 'safe' | 'caution' | 'danger';
  timeSeries: { time: Date; bac: number }[];
};

/**
 * Tipo per i punti di dati BAC utilizzati nei grafici
 */
export interface BACRecord {
  time: string;
  bac: number;
}

export { DrinkRecord } from '../lib/bac/visualization'; 