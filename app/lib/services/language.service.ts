/**
 * Servizio per la gestione della localizzazione dell'app
 * 
 * Gestisce la configurazione della lingua in base alla regione geografica dell'utente
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';
import i18n from '../../i18n';
import { LANGUAGE_STORAGE_KEY } from '../../i18n';

// Codici dei paesi dove l'italiano è la lingua predefinita
const ITALIAN_COUNTRIES = ['IT', 'CH', 'SM', 'VA'];

/**
 * Determina la lingua predefinita in base alla regione dell'utente
 */
export const getDefaultLanguage = (): string => {
  // Ottieni la regione del dispositivo
  const region = Localization.region;
  const deviceLanguage = Localization.locale.split('-')[0];
  
  console.log(`Device region: ${region}, language: ${deviceLanguage}`);
  
  // Se la regione è l'Italia o un altro paese di lingua italiana, usa l'italiano
  if (region && ITALIAN_COUNTRIES.includes(region)) {
    return 'it';
  }
  
  // Altrimenti usa l'inglese come default
  return 'en';
};

/**
 * Inizializza la lingua dell'app
 */
export const initializeLanguage = async (): Promise<string> => {
  try {
    // Controlla se l'utente ha già selezionato una lingua
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    
    if (savedLanguage) {
      // Usa la lingua salvata
      await setLanguage(savedLanguage);
      return savedLanguage;
    }
    
    // Altrimenti imposta la lingua in base alla regione
    const defaultLang = getDefaultLanguage();
    await setLanguage(defaultLang);
    return defaultLang;
  } catch (error) {
    console.error('Error initializing language:', error);
    // In caso di errore, default a inglese
    await setLanguage('en');
    return 'en';
  }
};

/**
 * Imposta la lingua dell'app
 */
export const setLanguage = async (language: string): Promise<boolean> => {
  try {
    // Cambia la lingua nell'app
    await i18n.changeLanguage(language);
    
    // Salva la scelta dell'utente
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    
    // Gestione RTL per lingue che lo richiedono (non necessario per IT/EN)
    const isRTL = false; // Per ora non abbiamo lingue RTL
    I18nManager.forceRTL(isRTL);
    
    return true;
  } catch (error) {
    console.error('Error setting language:', error);
    return false;
  }
};

/**
 * Ottiene la lingua corrente dell'app
 */
export const getCurrentLanguage = (): string => {
  return i18n.language || 'en';
};

/**
 * Verifica se la lingua corrente è quella predefinita per la regione dell'utente
 */
export const isUsingDefaultLanguage = (): boolean => {
  const currentLang = getCurrentLanguage();
  const defaultLang = getDefaultLanguage();
  return currentLang === defaultLang;
};

export default {
  getDefaultLanguage,
  initializeLanguage,
  setLanguage,
  getCurrentLanguage,
  isUsingDefaultLanguage
}; 