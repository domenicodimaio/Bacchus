/**
 * BACWidgetService.ts
 * 
 * Servizio per condividere i dati del BAC con i widget e le Live Activities
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Se il dispositivo è iOS, importa le funzionalità necessarie per l'integrazione
let ActivityState: any = null;
let widgetCenter: any = null;
let ActivityAuthorizationInfo: any = null;

// Verifica se il dispositivo è iOS e carica i moduli nativi
if (Platform.OS === 'ios') {
  try {
    // Importazione nativa del modulo WidgetKit
    widgetCenter = require('react-native').NativeModules.WidgetKit;
    
    // Importazione nativa dei moduli ActivityKit
    const ActivityKit = require('react-native').NativeModules.ActivityKit;
    ActivityState = ActivityKit?.ActivityState;
    ActivityAuthorizationInfo = ActivityKit?.ActivityAuthorizationInfo;
  } catch (error) {
    console.error('Errore nel caricamento dei moduli nativi:', error);
  }
}

// Chiavi di storage per i dati BAC
const WIDGET_BAC_KEY = '@widget_bac_data';

// Interfaccia per i dati del BAC utilizzati dai widget
export interface BACWidgetData {
  currentBAC: number;
  timeToZero: number; // tempo in ore per BAC = 0
  timeToLegal: number; // tempo in ore per BAC = 0.5
  lastUpdated: number; // timestamp
  dangerLevel: string;
}

/**
 * Aggiorna i dati del BAC per widget e Live Activities
 */
export async function updateBACWidgetData(data: BACWidgetData): Promise<void> {
  try {
    // Salva i dati in AsyncStorage
    await AsyncStorage.setItem(WIDGET_BAC_KEY, JSON.stringify(data));
    
    // Se siamo su iOS, aggiorna i widget
    if (Platform.OS === 'ios' && widgetCenter) {
      widgetCenter.reloadAllTimelines();
      
      // Aggiorna le Live Activities attive
      await updateLiveActivities(data);
    }
  } catch (error) {
    console.error('Errore nell\'aggiornamento dei dati widget:', error);
  }
}

/**
 * Ottiene i dati BAC salvati
 */
export async function getBACWidgetData(): Promise<BACWidgetData | null> {
  try {
    const data = await AsyncStorage.getItem(WIDGET_BAC_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Errore nel recupero dei dati widget:', error);
    return null;
  }
}

// ID dell'attività Live Activity attiva
let activeActivityId: string | null = null;

/**
 * Avvia una Live Activity per il monitoraggio BAC
 */
export async function startBACLiveActivity(data: BACWidgetData): Promise<boolean> {
  // Verifica se siamo su iOS e se ActivityKit è disponibile
  if (Platform.OS !== 'ios' || !ActivityState) {
    return false;
  }
  
  try {
    // Verifica l'autorizzazione per le Live Activities
    const authInfo = await ActivityAuthorizationInfo.requestAuthorization();
    if (!authInfo.enabled) {
      console.log('Live Activities non autorizzate');
      return false;
    }
    
    // Se c'è già un'attività attiva, la aggiorniamo invece di crearne una nuova
    if (activeActivityId) {
      await updateLiveActivities(data);
      return true;
    }
    
    // Crea una nuova Live Activity
    const attributes = {
      currentBAC: data.currentBAC.toFixed(2),
      timeToZero: formatTimeToHoursMinutes(data.timeToZero),
      timeToLegal: formatTimeToHoursMinutes(data.timeToLegal),
      dangerLevel: data.dangerLevel,
    };
    
    const content = {
      state: attributes,
      staleDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Scade dopo 24 ore
    };
    
    // Avvia l'attività con tipo "BACMonitor"
    const response = await ActivityState.request("BACMonitor", attributes, content);
    if (response.activityId) {
      activeActivityId = response.activityId;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Errore nell\'avvio della Live Activity:', error);
    return false;
  }
}

/**
 * Aggiorna tutte le Live Activities attive
 */
async function updateLiveActivities(data: BACWidgetData): Promise<void> {
  if (Platform.OS !== 'ios' || !ActivityState || !activeActivityId) {
    return;
  }
  
  try {
    const attributes = {
      currentBAC: data.currentBAC.toFixed(2),
      timeToZero: formatTimeToHoursMinutes(data.timeToZero),
      timeToLegal: formatTimeToHoursMinutes(data.timeToLegal),
      dangerLevel: data.dangerLevel,
    };
    
    // Aggiorna l'attività esistente
    await ActivityState.updateActivity(activeActivityId, { state: attributes });
  } catch (error) {
    console.error('Errore nell\'aggiornamento delle Live Activities:', error);
  }
}

/**
 * Termina le Live Activities attive
 */
export async function endBACLiveActivity(): Promise<void> {
  if (Platform.OS !== 'ios' || !ActivityState || !activeActivityId) {
    return;
  }
  
  try {
    await ActivityState.endActivity(activeActivityId);
    activeActivityId = null;
  } catch (error) {
    console.error('Errore nella terminazione della Live Activity:', error);
  }
}

/**
 * Formatta il tempo in ore in un formato leggibile (ore e minuti)
 */
function formatTimeToHoursMinutes(timeInHours: number): string {
  const hours = Math.floor(timeInHours);
  const minutes = Math.round((timeInHours - hours) * 60);
  
  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
} 