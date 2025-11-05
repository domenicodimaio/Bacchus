/**
 * Servizio per la gestione della localizzazione dell'app
 * 
 * Gestisce la configurazione della lingua in base alla regione geografica dell'utente
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as Localization from 'expo-localization'; // DISABILITATO per build stabile
import { I18nManager } from 'react-native';
import i18n from '../../i18n';
import { LANGUAGE_STORAGE_KEY } from '../../i18n';

// Codici dei paesi dove l'italiano è la lingua predefinita
const ITALIAN_COUNTRIES = ['IT', 'CH', 'SM', 'VA'];

/**
 * Determina la lingua predefinita in base alla lingua del dispositivo
 */
export const getDefaultLanguage = (): string => {
  try {
    // 🌍 RIATTIVATO: Rilevamento automatico lingua per Italia vs Mondo
    console.log('🌐 Rilevamento automatico lingua dispositivo...');
    
    // Usa React Native per ottenere la locale del dispositivo
    const { Platform, NativeModules } = require('react-native');
    let deviceLocale = 'en';
    
    if (Platform.OS === 'ios') {
      // iOS: usa NativeModules per ottenere la locale
      deviceLocale = NativeModules.SettingsManager?.settings?.AppleLocale || 
                   NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] || 'en';
    } else {
      // Android: usa NativeModules per ottenere la locale
      deviceLocale = NativeModules.I18nManager?.localeIdentifier || 'en';
    }
    
    console.log('🌐 Device locale rilevata:', deviceLocale);
    
    // Estrai il codice lingua (es: "it-IT" -> "it", "en-US" -> "en")
    const languageCode = deviceLocale.split('-')[0].toLowerCase();
    
    // 🇮🇹 LOGICA ITALIA: Se la lingua è italiana, usa italiano
    if (languageCode === 'it') {
      console.log('🇮🇹 Dispositivo italiano rilevato - usando italiano');
      return 'it';
    }
    
    // 🌍 LOGICA MONDO: Tutti gli altri paesi usano inglese
    console.log('🌍 Dispositivo non italiano rilevato - usando inglese');
    return 'en';
    
  } catch (error) {
    console.error('Error getting device locale:', error);
    return 'it'; // Default a italiano (lingua principale dell'app)
  }
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