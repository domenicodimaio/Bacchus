/**
 * Configurazione Internazionalizzazione (i18n)
 * 
 * Questo file configura l'internazionalizzazione per l'app, supportando italiano e inglese
 */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importazione statica delle risorse di traduzione
import commonIT from './locales/it/common.json';
import commonEN from './locales/en/common.json';
import sessionIT from './locales/it/session.json';
import sessionEN from './locales/en/session.json';
import profileIT from './locales/it/profile.json';
import profileEN from './locales/en/profile.json';
import settingsIT from './locales/it/settings.json';
import settingsEN from './locales/en/settings.json';
import authIT from './locales/it/auth.json';
import authEN from './locales/en/auth.json';
import dashboardIT from './locales/it/dashboard.json';
import dashboardEN from './locales/en/dashboard.json';

// Chiave di storage per la lingua selezionata
export const LANGUAGE_STORAGE_KEY = 'alcoltest_language';

// Lingua predefinita - Italiano
export const DEFAULT_LANGUAGE = 'it';

// Lingue supportate
export const SUPPORTED_LANGUAGES = [
  { code: 'it', name: 'Italiano' },
  { code: 'en', name: 'English' }
];

// Risorse di traduzione
const resources = {
  it: {
    common: commonIT,
    session: sessionIT,
    profile: profileIT,
    settings: settingsIT,
    auth: authIT,
    dashboard: dashboardIT
  },
  en: {
    common: commonEN,
    session: sessionEN,
    profile: profileEN,
    settings: settingsEN,
    auth: authEN,
    dashboard: dashboardEN
  }
};

// Inizializzazione di i18next
i18next
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map(lang => lang.code),
    ns: ['common', 'dashboard', 'profile', 'session', 'settings', 'auth'],
    defaultNS: 'common',
    debug: __DEV__,
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

/**
 * Carica la lingua preferita dallo storage locale
 */
export const loadStoredLanguage = async () => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage) {
      await changeLanguage(storedLanguage);
      return storedLanguage;
    }
  } catch (error) {
    console.error('Errore durante il caricamento della lingua salvata:', error);
  }
  
  return DEFAULT_LANGUAGE;
};

/**
 * Cambia la lingua dell'applicazione
 */
export const changeLanguage = async (language: string) => {
  try {
    await i18next.changeLanguage(language);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    return true;
  } catch (error) {
    console.error('Errore durante il cambio lingua:', error);
    return false;
  }
};

export default i18next; 