/**
 * Configurazione Internazionalizzazione (i18n)
 * 
 * Questo file configura l'internazionalizzazione per l'app, supportando italiano e inglese
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as Localization from 'expo-localization'; // DISABILITATO per build stabile
import { Platform, NativeModules } from 'react-native';
import config from '../lib/config';

// CRITICAL FIX: Use require syntax for translation files to ensure they are bundled correctly
// This is important for production builds especially with Hermes engine

// Define translation resources directly to avoid any loading issues
const resources = {
  en: {
    common: require('../locales/en/common.json'),
    settings: require('../locales/en/settings.json'),
    session: require('../locales/en/session.json'),
    auth: require('../locales/en/auth.json'),
    dashboard: require('../locales/en/dashboard.json'),
    profile: require('../locales/en/profile.json'),
    purchases: require('../locales/en/purchases.json')
  },
  it: {
    common: require('../locales/it/common.json'),
    settings: require('../locales/it/settings.json'),
    session: require('../locales/it/session.json'),
    auth: require('../locales/it/auth.json'),
    dashboard: require('../locales/it/dashboard.json'),
    profile: require('../locales/it/profile.json'),
    purchases: require('../locales/it/purchases.json')
  }
};

// Chiave di storage
export const LANGUAGE_STORAGE_KEY = 'APP_LANGUAGE';

// Lingue supportate
export const SUPPORTED_LANGUAGES = ['it', 'en'];

// Lista di tutti i namespace
export const ALL_NAMESPACES = ['common', 'settings', 'session', 'auth', 'dashboard', 'profile', 'purchases'];

// Ottieni la lingua del dispositivo
const getDeviceLanguage = () => {
  try {
    // 🌍 RIATTIVATO: Rilevamento automatico lingua per Italia vs Mondo
    console.log('🌐 [i18n] Rilevamento automatico lingua dispositivo...');
    
    // Usa React Native per ottenere la locale del dispositivo
    let deviceLocale = 'en';
    
    if (Platform.OS === 'ios') {
      // iOS: usa NativeModules per ottenere la locale
      deviceLocale = NativeModules.SettingsManager?.settings?.AppleLocale || 
                   NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] || 'en';
    } else {
      // Android: usa NativeModules per ottenere la locale
      deviceLocale = NativeModules.I18nManager?.localeIdentifier || 'en';
    }
    
    console.log('🌐 [i18n] Device locale rilevata:', deviceLocale);
    
    // Estrai il codice lingua (es: "it-IT" -> "it", "en-US" -> "en")
    const languageCode = deviceLocale.split('-')[0].toLowerCase();
    
    // 🇮🇹 LOGICA ITALIA: Se la lingua è italiana, usa italiano
    if (languageCode === 'it') {
      console.log('🇮🇹 [i18n] Dispositivo italiano rilevato - usando italiano');
      return 'it';
    }
    
    // 🌍 LOGICA MONDO: Tutti gli altri paesi usano inglese
    console.log('🌍 [i18n] Dispositivo non italiano rilevato - usando inglese');
    return 'en';
    
  } catch (error) {
    console.error('🌐 [i18n] Errore nel determinare la lingua del dispositivo:', error);
    // Fallback: italiano (lingua principale dell'app)
    return 'it';
  }
};

// Valore di fallback - usiamo italiano come lingua principale dell'app
const FALLBACK_LANGUAGE = 'it';

// Precarica tutti i namespace per assicurarsi che siano disponibili immediatamente
const preloadAllNamespaces = async () => {
  const lng = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY) || getDeviceLanguage();
  
  // Forza il caricamento di tutti i namespace per entrambe le lingue
  for (const ns of ALL_NAMESPACES) {
    for (const lang of SUPPORTED_LANGUAGES) {
      try {
        console.log(`🌐 [i18n] Precaricamento namespace: ${lang}:${ns}`);
        i18n.addResourceBundle(lang, ns, resources[lang][ns], true, true);
      } catch (error) {
        console.error(`🌐 [i18n] Errore nel precaricare il namespace ${lang}:${ns}:`, error);
      }
    }
  }
  
  return true;
};

// Initialize i18n with the bundled resources
async function initializeI18n() {
  try {
    console.log('🌐 [i18n] Initializing i18n...');
    
    // Try to get stored language preference
    let storedLanguage: string | null = null;
    try {
      storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch (error) {
      console.error('🌐 [i18n] Error getting stored language:', error);
    }
    
    // Use device language if no stored preference
    const initialLanguage = storedLanguage || getDeviceLanguage();
    console.log('🌐 [i18n] Initial language:', initialLanguage);
    
    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: initialLanguage,
        fallbackLng: FALLBACK_LANGUAGE,
        compatibilityJSON: 'v4',
        interpolation: {
          escapeValue: false
        },
        react: {
          useSuspense: false,
        },
        returnNull: false,
        returnEmptyString: false,
        missingKeyHandler: (lng, ns, key) => {
          console.warn(`🌐 [i18n] Missing translation - lng: ${lng}, ns: ${ns}, key: ${key}`);
        },
        appendNamespaceToCIMode: true,
        debug: __DEV__ // Abilita il debug solo in modalità sviluppo
      });
    
    // Precarica tutti i namespace immediatamente dopo l'inizializzazione
    await preloadAllNamespaces();
    
    console.log('🌐 [i18n] Initialized successfully with language:', i18n.language);
    return true;
  } catch (error) {
    console.error('🌐 [i18n] Error initializing i18n:', error);
    return false;
  }
}

// Execute initialization immediately
initializeI18n().catch(error => {
  console.error('🌐 [i18n] Fatal error initializing i18n:', error);
});

// Function to change language
export const changeLanguage = async (lng: string): Promise<boolean> => {
  try {
    if (!SUPPORTED_LANGUAGES.includes(lng)) {
      console.error('🌐 [i18n] Trying to set unsupported language:', lng);
      return false;
    }
    
    await i18n.changeLanguage(lng);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    console.log('🌐 [i18n] Language changed to:', lng);
    
    // Ricarica tutti i namespace dopo il cambio lingua
    await preloadAllNamespaces();
    
    return true;
  } catch (error) {
    console.error('🌐 [i18n] Error changing language:', error);
    return false;
  }
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || FALLBACK_LANGUAGE;
};

// Function to get a translation with fallback
export const t = (key: string, namespace: string = 'common', defaultValue: string = ''): string => {
  try {
    if (!i18n.isInitialized) {
      console.warn('🌐 [i18n] i18n not initialized yet, using fallback value');
      return defaultValue || key;
    }
    
    const translation = i18n.t(key, { ns: namespace, defaultValue });
    
    // If translation is missing, return the fallback string
    if (!translation || translation === key) {
      return defaultValue || key;
    }
    
    return translation;
  } catch (error) {
    console.error('🌐 [i18n] Error getting translation:', error);
    return defaultValue || key;
  }
};

// Function to verify if all translations are loaded and available
export const verifyTranslations = (): boolean => {
  try {
    const currentLng = i18n.language || FALLBACK_LANGUAGE;
    
    // Verifica se tutti i namespace sono caricati
    for (const ns of ALL_NAMESPACES) {
      const hasNamespace = i18n.hasResourceBundle(currentLng, ns);
      if (!hasNamespace) {
        console.warn(`🌐 [i18n] Missing resource bundle: ${currentLng}:${ns}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('🌐 [i18n] Error verifying translations:', error);
    return false;
  }
};

// Funzioni per la gestione del linguaggio in storage
export const loadLanguageFromStorage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    console.error('🌐 [i18n] Error loading language from storage:', error);
    return null;
  }
};

export const saveLanguageToStorage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error('🌐 [i18n] Error saving language to storage:', error);
  }
};

export default i18n; 