import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Importa le traduzioni
const resources = {
  en: {
    translation: {
      // Dashboard
      dashboard: 'Dashboard',
      greeting: 'Hello',
      yourBAC: 'Your BAC',
      startSession: 'Start Session',
      viewHistory: 'View History',
      settings: 'Settings',
      
      // Profile
      profiles: 'Profiles',
      createProfile: 'Create Profile',
      editProfile: 'Edit Profile',
      gender: 'Gender',
      weight: 'Weight',
      height: 'Height',
      age: 'Age',
      male: 'Male',
      female: 'Female',
      other: 'Other',
      
      // Session
      session: 'Session',
      activeSession: 'Active Session',
      addDrink: 'Add Drink',
      endSession: 'End Session',
      drinkName: 'Drink Name',
      alcoholPercentage: 'Alcohol %',
      volume: 'Volume (ml)',
      timeToSober: 'Time to Sober',
      timeToLegal: 'Time to Legal Limit',
      noActiveSession: 'No Active Session',
      trackYourDrinks: 'Track Your Drinks',
      
      // History
      history: 'History',
      pastSessions: 'Past Sessions',
      noSessions: 'No past sessions found',
      maxBAC: 'Max BAC',
      duration: 'Duration',
      date: 'Date',
      drinks: 'Drinks',
      export: 'Export',
      
      // Common
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      
      // Tabs
      tabs: {
        dashboard: 'Home',
        session: 'Session',
        history: 'History',
        profiles: 'Profiles'
      },
      
      // BAC Status
      bacStatus: {
        safe: 'Safe',
        caution: 'Caution',
        danger: 'Danger'
      }
    },
    common: {
      tabs: {
        dashboard: 'Home',
        session: 'Session',
        history: 'History',
        profiles: 'Profiles'
      }
    },
    session: {
      noActiveSession: 'No Active Session',
      trackYourDrinks: 'Track Your Drinks'
    }
  },
  it: {
    translation: {
      // Dashboard
      dashboard: 'Dashboard',
      greeting: 'Ciao',
      yourBAC: 'Il tuo tasso alcolemico',
      startSession: 'Inizia Sessione',
      viewHistory: 'Visualizza Storico',
      settings: 'Impostazioni',
      
      // Profile
      profiles: 'Profili',
      createProfile: 'Crea Profilo',
      editProfile: 'Modifica Profilo',
      gender: 'Genere',
      weight: 'Peso',
      height: 'Altezza',
      age: 'Età',
      male: 'Uomo',
      female: 'Donna',
      other: 'Altro',
      
      // Session
      session: 'Sessione',
      activeSession: 'Sessione Attiva',
      addDrink: 'Aggiungi Drink',
      endSession: 'Termina Sessione',
      drinkName: 'Nome Drink',
      alcoholPercentage: 'Alcol %',
      volume: 'Volume (ml)',
      timeToSober: 'Tempo per Sobrietà',
      timeToLegal: 'Tempo per Limite Legale',
      noActiveSession: 'Nessuna Sessione Attiva',
      trackYourDrinks: 'Traccia i Tuoi Drink',
      
      // History
      history: 'Storico',
      pastSessions: 'Sessioni Passate',
      noSessions: 'Nessuna sessione passata trovata',
      maxBAC: 'Tasso Max',
      duration: 'Durata',
      date: 'Data',
      drinks: 'Drink',
      export: 'Esporta',
      
      // Common
      save: 'Salva',
      cancel: 'Annulla',
      delete: 'Elimina',
      confirm: 'Conferma',
      back: 'Indietro',
      next: 'Avanti',
      
      // Tabs
      tabs: {
        dashboard: 'Home',
        session: 'Sessione',
        history: 'Storico',
        profiles: 'Profili'
      },
      
      // BAC Status
      bacStatus: {
        safe: 'Sicuro',
        caution: 'Attenzione',
        danger: 'Pericolo'
      }
    },
    common: {
      tabs: {
        dashboard: 'Home',
        session: 'Sessione',
        history: 'Storico',
        profiles: 'Profili'
      }
    },
    session: {
      noActiveSession: 'Nessuna Sessione Attiva',
      trackYourDrinks: 'Traccia i Tuoi Drink'
    }
  }
};

const LANGUAGE_PERSISTENCE_KEY = 'alcoltest_language';

const setLanguageFromStorage = async () => {
  try {
    const language = await AsyncStorage.getItem(LANGUAGE_PERSISTENCE_KEY);
    if (language) {
      return language;
    }
  } catch (error) {
    console.error('Error reading language from storage:', error);
  }
  
  // Se non c'è una lingua salvata, usa la lingua del dispositivo o il default
  return Localization.locale.split('-')[0] || 'it';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'it', // Lingua di default
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    },
    defaultNS: 'translation',
    ns: ['translation', 'common', 'session']
  });

// Funzione per caricare la lingua dalle preferenze salvate
export const loadStoredLanguage = async () => {
  const language = await setLanguageFromStorage();
  await i18n.changeLanguage(language);
  return language;
};

export default i18n; 