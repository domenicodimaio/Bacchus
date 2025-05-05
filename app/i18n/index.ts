/**
 * Configurazione Internazionalizzazione (i18n)
 * 
 * Questo file configura l'internazionalizzazione per l'app, supportando italiano e inglese
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Importazione diretta delle risorse di traduzione
import en_common from '../locales/en/common.json';
import en_settings from '../locales/en/settings.json';
import en_session from '../locales/en/session.json';
import en_auth from '../locales/en/auth.json';
import en_dashboard from '../locales/en/dashboard.json';
import en_profile from '../locales/en/profile.json';
import en_purchases from '../locales/en/purchases.json';

import it_common from '../locales/it/common.json';
import it_settings from '../locales/it/settings.json';
import it_session from '../locales/it/session.json';
import it_auth from '../locales/it/auth.json';
import it_dashboard from '../locales/it/dashboard.json';
import it_profile from '../locales/it/profile.json';
import it_purchases from '../locales/it/purchases.json';

// Per debug
console.log('🌐 [i18n] Inizializzazione del sistema di traduzione');
console.log('🌐 [i18n] Lingue disponibili: IT, EN');

// Chiave di storage
const APP_LANGUAGE = 'APP_LANGUAGE';

// Valore di fallback
const FALLBACK_LANGUAGE = 'en';

// Risorse di traduzione
const resources = {
  en: {
    common: en_common,
    settings: en_settings,
    session: en_session,
    auth: en_auth,
    dashboard: en_dashboard,
    profile: en_profile,
    purchases: en_purchases
  },
  it: {
    common: it_common,
    settings: it_settings,
    session: it_session,
    auth: it_auth,
    dashboard: it_dashboard,
    profile: it_profile,
    purchases: it_purchases
  }
};

// Stampa per debug il numero di chiavi caricate
console.log('🌐 [i18n] Chiavi caricate:');
console.log('🌐 [i18n] en:', Object.keys(resources.en).length, 'namespaces');
console.log('🌐 [i18n] it:', Object.keys(resources.it).length, 'namespaces');

// Inizializzazione di i18next in modo semplificato senza operazioni asincrone
i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false, // Disabilita suspense per evitare problemi
    },
  });

// Carica la lingua dalle impostazioni salvate
export const loadLanguageFromStorage = async (): Promise<string> => {
  try {
    // Prova a caricare la lingua salvata
    const savedLanguage = await SecureStore.getItemAsync(APP_LANGUAGE);
    
    // Se esiste, utilizzala
    if (savedLanguage) {
      await changeLanguage(savedLanguage);
      return savedLanguage;
    }
    
    // Altrimenti, usa la lingua predefinita
    await changeLanguage(FALLBACK_LANGUAGE);
    return FALLBACK_LANGUAGE;
  } catch (error) {
    console.error('Errore nel caricamento della lingua:', error);
    return FALLBACK_LANGUAGE;
  }
};

// Cambia la lingua attiva
export const changeLanguage = async (lng: string): Promise<void> => {
  try {
    // Verifica che la lingua richiesta sia supportata
    if (!resources[lng]) {
      console.warn(`Lingua '${lng}' non supportata, uso fallback: ${FALLBACK_LANGUAGE}`);
      lng = FALLBACK_LANGUAGE;
    }
    
    // Applica la lingua
    await i18n.changeLanguage(lng);
    
    // Salva la lingua nelle impostazioni
    await SecureStore.setItemAsync(APP_LANGUAGE, lng);
    
    console.log(`🌐 [i18n] Lingua impostata: ${lng}`);
    return;
  } catch (error) {
    console.error('Errore nel cambio lingua:', error);
    // In caso di errore, assicurati che l'app continui a funzionare
    i18n.changeLanguage(FALLBACK_LANGUAGE).catch(() => {});
  }
};

// Esporta i18n come default
export default i18n; 