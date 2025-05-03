/**
 * Configurazione Internazionalizzazione (i18n)
 * 
 * Questo file configura l'internazionalizzazione per l'app, supportando italiano e inglese
 */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

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

// Per debug
console.log('🌐 [i18n] Inizializzazione del sistema di traduzione');
console.log('🌐 [i18n] Lingue disponibili: IT, EN');

// Chiave di storage per la lingua selezionata
export const LANGUAGE_STORAGE_KEY = 'bacchus_language';

// Lingua di default per l'app (italiano)
export const DEFAULT_LANGUAGE = 'it';

// Lingue supportate
export const SUPPORTED_LANGUAGES = [
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
];

// Verifica presenza file di traduzione e registra per debug
const verifyTranslationFiles = () => {
  const translations = {
    it: {
      common: Boolean(commonIT && Object.keys(commonIT).length),
      session: Boolean(sessionIT && Object.keys(sessionIT).length),
      profile: Boolean(profileIT && Object.keys(profileIT).length),
      settings: Boolean(settingsIT && Object.keys(settingsIT).length),
      auth: Boolean(authIT && Object.keys(authIT).length),
      dashboard: Boolean(dashboardIT && Object.keys(dashboardIT).length),
      purchases: Boolean(purchasesIT && Object.keys(purchasesIT).length)
    },
    en: {
      common: Boolean(commonEN && Object.keys(commonEN).length),
      session: Boolean(sessionEN && Object.keys(sessionEN).length),
      profile: Boolean(profileEN && Object.keys(profileEN).length),
      settings: Boolean(settingsEN && Object.keys(settingsEN).length),
      auth: Boolean(authEN && Object.keys(authEN).length),
      dashboard: Boolean(dashboardEN && Object.keys(dashboardEN).length),
      purchases: Boolean(purchasesEN && Object.keys(purchasesEN).length)
    }
  };
  
  console.log('🌐 [i18n] Verifica file di traduzione:');
  console.log('🌐 [i18n] IT:', translations.it);
  console.log('🌐 [i18n] EN:', translations.en);
  
  return translations;
};

// Esegui verifica
const translationStatus = verifyTranslationFiles();

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

// Ottieni la lingua del dispositivo
const getDeviceLanguage = (): string => {
  try {
    const locale = Localization.locale;
    const deviceLang = locale.split('-')[0];
    console.log(`🌐 [i18n] Lingua del dispositivo rilevata: ${deviceLang}`);
    // Verifica se la lingua del dispositivo è supportata
    if (deviceLang === 'it' || deviceLang === 'en') {
      return deviceLang;
    }
  } catch (error) {
    console.error('🌐 [i18n] Errore nel rilevare la lingua del dispositivo:', error);
  }
  // Fallback alla lingua predefinita
  return DEFAULT_LANGUAGE;
};

// Inizializzazione di i18next
console.log('🌐 [i18n] Avvio inizializzazione i18next...');
i18next
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(), // Usa la lingua del dispositivo come default iniziale
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
    parseMissingKeyHandler: (key) => {
      console.warn(`🌐 [i18n] CHIAVE MANCANTE: "${key}" (${i18next.language})`);
      return key;
    },
    missingKeyHandler: (lng, ns, key) => {
      console.warn(`🌐 [i18n] Traduzione mancante: ${ns}:${key}, lingua: ${lng}`);
    }
  }, (err, t) => {
    if (err) {
      console.error('🌐 [i18n] Errore nell\'inizializzazione di i18next:', err);
    } else {
      console.log(`🌐 [i18n] i18next inizializzato con successo. Lingua attuale: ${i18next.language}`);
      // Verifica funzionamento con alcune traduzioni di base
      try {
        const testIt = i18next.getFixedT('it');
        const testEn = i18next.getFixedT('en');
        console.log('🌐 [i18n] Test traduzioni:');
        console.log(`🌐 [i18n] IT - settings: "${testIt('settings', { ns: 'common' })}"`);
        console.log(`🌐 [i18n] EN - settings: "${testEn('settings', { ns: 'common' })}"`);
      } catch (testErr) {
        console.error('🌐 [i18n] Errore nel test delle traduzioni:', testErr);
      }
    }
  });

// Funzione per caricare lo stato della lingua da AsyncStorage
export const loadLanguageFromStorage = async (): Promise<string> => {
  try {
    console.log('🌐 [i18n] Caricamento lingua da AsyncStorage...');
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    console.log(`🌐 [i18n] Lingua trovata in storage: ${savedLanguage || 'nessuna'}`);
    
    if (savedLanguage && (savedLanguage === 'it' || savedLanguage === 'en')) {
      try {
        await i18next.changeLanguage(savedLanguage);
        console.log(`🌐 [i18n] Lingua cambiata con successo: ${savedLanguage}`);
        return savedLanguage;
      } catch (langError) {
        console.error('🌐 [i18n] Errore in i18next.changeLanguage:', langError);
        // Fallback alla lingua di default in caso di errore
        await i18next.changeLanguage(DEFAULT_LANGUAGE);
        return DEFAULT_LANGUAGE;
      }
    } else {
      // Se non c'è una lingua salvata, usa la lingua del dispositivo
      const deviceLang = getDeviceLanguage();
      console.log(`🌐 [i18n] Nessuna lingua in storage, uso quella del dispositivo: ${deviceLang}`);
      await i18next.changeLanguage(deviceLang);
      return deviceLang;
    }
  } catch (error) {
    console.error('🌐 [i18n] Errore nel caricare la lingua da storage:', error);
    return DEFAULT_LANGUAGE;
  }
};

// Funzione per salvare la lingua selezionata
export const saveLanguageToStorage = async (languageCode: string): Promise<boolean> => {
  try {
    console.log(`🌐 [i18n] Salvataggio lingua in AsyncStorage: ${languageCode}`);
    
    // Verifichiamo che il codice lingua sia supportato
    if (languageCode !== 'it' && languageCode !== 'en') {
      console.warn(`🌐 [i18n] Language code '${languageCode}' not supported, defaulting to 'it'`);
      languageCode = 'it';
    }
    
    // Salviamo la lingua
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
    
    // Cambiamo la lingua attiva
    await i18next.changeLanguage(languageCode);
    console.log(`🌐 [i18n] Lingua salvata e attivata: ${languageCode}`);
    
    return true;
  } catch (error) {
    console.error('🌐 [i18n] Errore nel salvare la lingua:', error);
    return false;
  }
};

// Carica la lingua salvata all'avvio
loadLanguageFromStorage().then(lang => {
  console.log(`🌐 [i18n] Lingua inizializzata all'avvio: ${lang}`);
}).catch(err => {
  console.error('🌐 [i18n] Errore nell\'inizializzare la lingua all\'avvio:', err);
});

export default i18next; 