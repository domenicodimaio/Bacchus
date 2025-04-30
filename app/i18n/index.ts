/**
 * Configurazione Internazionalizzazione (i18n)
 * 
 * Questo file configura l'internazionalizzazione per l'app, supportando italiano e inglese
 */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importazione statica delle risorse di traduzione
import commonIT from '../locales/it/common.json';
import commonEN from '../locales/en/common.json';
import sessionIT from '../locales/it/session.json';
import sessionEN from '../locales/en/session.json';
import profileIT from '../locales/it/profile.json';
import profileEN from '../locales/en/profile.json';
import settingsIT from '../locales/it/settings.json';
import settingsEN from '../locales/en/settings.json';
import authIT from '../locales/it/auth.json';
import authEN from '../locales/en/auth.json';
import dashboardIT from '../locales/it/dashboard.json';
import dashboardEN from '../locales/en/dashboard.json';
import purchasesIT from '../locales/it/purchases.json';
import purchasesEN from '../locales/en/purchases.json';

// Chiave di storage per la lingua selezionata
export const LANGUAGE_STORAGE_KEY = 'bacchus_language';

// Lingua di default per l'app (italiano)
export const DEFAULT_LANGUAGE = 'it';

// Lingue supportate
export const SUPPORTED_LANGUAGES = [
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
];

// Risorse di traduzione
const resources = {
  it: {
    common: commonIT,
    session: sessionIT,
    profile: profileIT,
    settings: settingsIT,
    auth: authIT,
    dashboard: dashboardIT,
    purchases: purchasesIT
  },
  en: {
    common: commonEN,
    session: sessionEN,
    profile: profileEN,
    settings: settingsEN,
    auth: authEN,
    dashboard: dashboardEN,
    purchases: purchasesEN
  }
};

// Inizializzazione di i18next
i18next
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map(lang => lang.code),
    ns: ['common', 'dashboard', 'profile', 'session', 'settings', 'auth', 'purchases'],
    defaultNS: 'common',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    },
    keySeparator: false,
    nsSeparator: ':',
    fallbackNS: 'common',
    compatibilityJSON: 'v4',
    returnNull: false,
    returnEmptyString: false,
    returnObjects: true,
    missingKeyHandler: (lng, ns, key) => {
      console.warn(`[i18n] Traduzione mancante: ${ns}:${key}, lingua: ${lng}`);
    }
  });

// Funzione per caricare lo stato della lingua da AsyncStorage
export const loadLanguageFromStorage = async (): Promise<string> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage) {
      await i18next.changeLanguage(savedLanguage);
      return savedLanguage;
    }
  } catch (error) {
    console.error('Error loading language from storage:', error);
  }
  return DEFAULT_LANGUAGE;
};

// Funzione per salvare la lingua selezionata
export const saveLanguageToStorage = async (languageCode: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
  } catch (error) {
    console.error('Error saving language to storage:', error);
  }
};

// Carica la lingua salvata all'avvio
loadLanguageFromStorage();

export default i18next; 