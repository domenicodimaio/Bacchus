/**
 * Configurazione centralizzata dell'app
 * 
 * Questo file contiene tutte le configurazioni che possono variare
 * tra ambiente di sviluppo e produzione.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

// Determina se siamo in modalità sviluppo o produzione
// In produzione, __DEV__ è sempre false, ma possiamo fare controlli aggiuntivi
const isDevMode = __DEV__;

// Determina se siamo in TestFlight (solo per iOS)
const isTestFlight = () => {
  // La detection precisa di TestFlight è complessa in Expo
  // Per semplicità, assumiamo che se non siamo in dev mode e siamo su iOS,
  // potremmo essere in TestFlight o App Store
  return Platform.OS === 'ios' && !isDevMode;
};

// Determina se siamo in produzione (App Store o Play Store)
const isProduction = !isDevMode;

// Ottieni il bundle ID corretto per l'app
const getBundleId = (): string => {
  // Bundle ID standard per produzione, sia iOS che Android
  const PRODUCTION_BUNDLE_ID = 'com.bacchusapp.app';
  
  // Bundle ID di sviluppo possono variare
  const IOS_DEV_BUNDLE_ID = 'com.domenicodimaio.bacchus';
  const ANDROID_DEV_BUNDLE_ID = 'com.bacchusapp.app';
  
  // In produzione o TestFlight, usa sempre il bundle ID di produzione
  if (isProduction) {
    return PRODUCTION_BUNDLE_ID;
  }
  
  // In sviluppo, usa bundle ID specifici per piattaforma
  if (Platform.OS === 'ios') {
    return IOS_DEV_BUNDLE_ID;
  } else if (Platform.OS === 'android') {
    return ANDROID_DEV_BUNDLE_ID;
  }
  
  // Fallback
  return 'bacchus';
};

// Ottieni gli URL di redirezione per OAuth con gestione degli schemi URL
const getRedirectUrl = (provider: string): string => {
  // Unified scheme per l'app
  const scheme = 'bacchus';
  
  // In produzione o TestFlight, usa sempre loopback in formato completo
  if (isProduction) {
    // Costruisci l'URL usando expo-linking che gestisce correttamente lo schema URL
    return Linking.createURL('login-callback', {
      scheme: scheme
    });
  }
  
  // In sviluppo, usa URL diretto
  return `${scheme}://login-callback`;
};

// Ottieni gli URL di redirezione per la conferma email
const getEmailRedirectUrl = (): string => {
  // Unified scheme per l'app
  const scheme = 'bacchus';
  
  // In produzione o TestFlight, usa sempre loopback in formato completo
  if (isProduction) {
    // Costruisci l'URL usando expo-linking che gestisce correttamente lo schema URL
    return Linking.createURL('auth-callback', {
      scheme: scheme
    });
  }
  
  // In sviluppo, usa URL diretto
  return `${scheme}://auth-callback`;
};

// Ottieni la configurazione per il provider OAuth
const getOAuthConfig = (provider: 'apple' | 'google'): Record<string, any> => {
  const redirectTo = getRedirectUrl(provider);
  
  const baseConfig = {
    redirectTo: redirectTo,
    skipBrowserRedirect: provider === 'apple' && Platform.OS === 'ios', // Evita redirezioni esterne per Apple
  };
  
  // Configurazioni specifiche per provider
  if (provider === 'apple') {
    // Per Apple, aggiungiamo configurazioni specifiche
    return {
      ...baseConfig,
      scopes: 'name email',
      // Su iOS, specifica il client ID che è il bundle ID
      ...(Platform.OS === 'ios' && {
        iosClient: getBundleId(),
      }),
    };
  }
  
  // Per Google, mantenere la configurazione base
  if (provider === 'google') {
    return {
      ...baseConfig,
      // Aggiungi parametri specifici per Google se necessario
    };
  }
  
  return baseConfig;
};

// Configurazione per il debug
const getDebugConfig = () => {
  return {
    // Mostra log in dev, su iOS e un minimo di log anche in produzione
    showDebugLogs: isDevMode || Platform.OS === 'ios', 
    // Log dettagliati solo in dev
    verbose: isDevMode,
    // Registra sempre gli errori
    recordErrors: true,
  };
};

// Determina se il caricamento dei bundle dovrebbe essere asincrono o sincrono
const shouldUseAsyncBundles = () => {
  // In produzione o TestFlight, usa caricamento asincrono
  // In dev, usa sempre caricamento sincrono per facilitare il debug
  return isProduction;
};

// Ottieni un'URL di deep linking secondo il formato corretto per l'ambiente
const getDeepLinkUrl = (path: string): string => {
  // Assicurati che il path inizi con /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Usa expo-linking per creare URL di deep linking compatibili con l'ambiente
  return Linking.createURL(normalizedPath.substring(1), {
    scheme: 'bacchus'
  });
};

// Ottieni l'URL di callback completo
const getAuthCallbackUrl = (): string => {
  return Linking.createURL('auth-callback', {
    scheme: 'bacchus'
  });
};

// Gestione delle traduzioni
const getTranslationConfig = () => {
  return {
    // In produzione, usa sempre il fallback se una chiave non è trovata
    useFallbackTranslations: isProduction,
    // In dev, mostra warning per chiavi mancanti
    showMissingKeyWarnings: isDevMode,
    // Directory delle traduzioni
    translationsDir: '/app/locales'
  };
};

// Esporta le configurazioni
export default {
  isDevMode,
  isProduction,
  isTestFlight,
  getBundleId,
  getRedirectUrl,
  getEmailRedirectUrl,
  getOAuthConfig,
  getDebugConfig,
  shouldUseAsyncBundles,
  getDeepLinkUrl, 
  getAuthCallbackUrl,
  getTranslationConfig,
}; 