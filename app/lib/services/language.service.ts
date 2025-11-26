/**
 * Servizio per la gestione della localizzazione dell'app
 * 
 * Gestisce la configurazione della lingua in base alla regione geografica dell'utente
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as Localization from 'expo-localization'; // DISABILITATO per build stabile
import { I18nManager, Platform, NativeModules } from 'react-native';
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
    let deviceLocale = 'en';
    
    if (Platform.OS === 'ios') {
      // iOS: usa NativeModules per ottenere la locale
      console.log('🌐 DEBUG: NativeModules.SettingsManager:', JSON.stringify(NativeModules.SettingsManager?.settings));
      
      // 🔥 FIX IPAD: Prova TUTTE le fonti possibili in ordine di priorità
      const sources = [
        // 1. Intl API (più affidabile su iPad)
        () => {
          if (typeof Intl !== 'undefined') {
            const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
            console.log('🌐 [1] Intl locale:', intlLocale);
            return intlLocale;
          }
          return null;
        },
        // 2. AppleLocale
        () => {
          const locale = NativeModules.SettingsManager?.settings?.AppleLocale;
          console.log('🌐 [2] AppleLocale:', locale);
          return locale;
        },
        // 3. AppleLanguages array
        () => {
          const locale = NativeModules.SettingsManager?.settings?.AppleLanguages?.[0];
          console.log('🌐 [3] AppleLanguages[0]:', locale);
          return locale;
        },
        // 4. AppleLocales array
        () => {
          const locale = NativeModules.SettingsManager?.settings?.AppleLocales?.[0];
          console.log('🌐 [4] AppleLocales[0]:', locale);
          return locale;
        },
        // 5. locale generico
        () => {
          const locale = NativeModules.SettingsManager?.settings?.locale;
          console.log('🌐 [5] locale:', locale);
          return locale;
        }
      ];
      
      // Prova ogni fonte fino a trovare una locale valida
      for (const source of sources) {
        try {
          const locale = source();
          if (locale && locale !== 'en-US' && locale !== 'en') {
            deviceLocale = locale;
            console.log('🌐 ✅ Locale trovata:', deviceLocale);
            break;
          }
        } catch (err) {
          console.log('🌐 ⚠️ Errore fonte locale:', err);
        }
      }
    } else {
      // Android: usa NativeModules per ottenere la locale
      deviceLocale = NativeModules.I18nManager?.localeIdentifier || 'en';
    }
    
    console.log('🌐 Device locale finale:', deviceLocale);
    
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
    // 🔥 FIX IPAD: Controlla SEMPRE la lingua del dispositivo, non usare solo cache
    const deviceLang = getDefaultLanguage();
    console.log('🌐 Lingua dispositivo rilevata:', deviceLang);
    
    // Controlla se l'utente ha già selezionato una lingua manualmente
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    console.log('🌐 Lingua salvata in cache:', savedLanguage);
    
    // Se la lingua del dispositivo è cambiata rispetto al cache, aggiorna
    if (savedLanguage && savedLanguage !== deviceLang) {
      console.log('🌐 ⚠️ Lingua dispositivo cambiata da', savedLanguage, 'a', deviceLang);
      console.log('🌐 Aggiornamento lingua a:', deviceLang);
      await setLanguage(deviceLang);
      return deviceLang;
    }
    
    if (savedLanguage) {
      // Usa la lingua salvata se non è cambiata
      console.log('🌐 Usando lingua salvata:', savedLanguage);
      await setLanguage(savedLanguage);
      return savedLanguage;
    }
    
    // Altrimenti imposta la lingua in base alla regione
    console.log('🌐 Nessuna lingua salvata, usando lingua dispositivo:', deviceLang);
    await setLanguage(deviceLang);
    return deviceLang;
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