import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProductType, PRODUCT_IDS, Entitlement, FREE_LIMITS } from '../../types/purchases';
import Constants from 'expo-constants';

// Determina se siamo in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Importa RevenueCat solo se non siamo in Expo Go
let Purchases: any = null;
let LOG_LEVEL: any = null;

if (!isExpoGo) {
  try {
    // Importa dinamicamente solo se non siamo in Expo Go
    const RevenueCat = require('react-native-purchases');
    Purchases = RevenueCat.default;
    LOG_LEVEL = RevenueCat.LOG_LEVEL;
  } catch (error) {
    console.log('RevenueCat non disponibile', error);
  }
}

// Chiavi API RevenueCat per iOS e Android
const API_KEYS = {
  ios: 'appl_xxxxxxxxxxxxxxxx', // Sostituire con la chiave API RevenueCat per iOS
  android: 'goog_xxxxxxxxxxxxxxxx', // Sostituire con la chiave API RevenueCat per Android
};

// Chiavi AsyncStorage per gli acquisti
const STORAGE_KEYS = {
  CUSTOMER_INFO: 'bacchus_customer_info',
  SESSION_COUNT: 'bacchus_session_count',
  WEEKLY_SESSION_RESET: 'bacchus_weekly_session_reset',
  MOCK_PREMIUM: 'bacchus_mock_premium', // Per testare lo stato premium in Expo Go
};

/**
 * Inizializza il servizio di acquisti
 */
export const initPurchases = async () => {
  try {
    // Se siamo in Expo Go, usa l'implementazione mock
    if (isExpoGo) {
      console.log('Inizializzazione servizio acquisti in modalità mock (Expo Go)');
      return true;
    }
    
    const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;
    
    // Configura RevenueCat in modalità debug in ambiente di sviluppo
    // Controlla che Purchases sia definito prima di chiamare i suoi metodi
    if (__DEV__ && typeof Purchases !== 'undefined' && Purchases !== null) {
      try {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      } catch (logError) {
        console.warn('Failed to set RevenueCat log level:', logError);
      }
    }
    
    // Inizializza SDK RevenueCat solo se non siamo in Expo Go e Purchases è disponibile
    if (typeof Purchases !== 'undefined' && Purchases !== null) {
      try {
      await Purchases.configure({
        apiKey,
        appUserID: null, // L'ID utente sarà impostato dopo la login
      });
      } catch (configError) {
        console.warn('Failed to configure RevenueCat:', configError);
      }
    } else {
      console.log('RevenueCat SDK not available, using mock implementation');
    }
    
    console.log('Purchase service initialized');
    
    // Verifica e reset il contatore sessioni settimanali se necessario
    await checkAndResetWeeklySessionCount();
    
    return true;
  } catch (error) {
    console.error('Failed to initialize purchases:', error);
    return false;
  }
};

/**
 * Imposta l'ID utente per RevenueCat
 */
export const setUserForPurchases = async (userId: string) => {
  try {
    if (isExpoGo) return true;
    
    if (typeof Purchases !== 'undefined' && Purchases !== null) {
      try {
      await Purchases.logIn(userId);
      console.log(`User ${userId} logged into RevenueCat`);
      } catch (loginError) {
        console.warn('Failed to log in to RevenueCat:', loginError);
      }
    }
    return true;
  } catch (error) {
    console.error('Failed to set user for purchases:', error);
    return false;
  }
};

/**
 * Resetta l'utente per RevenueCat (al logout)
 */
export const resetUserForPurchases = async () => {
  try {
    if (isExpoGo) return true;
    
    if (typeof Purchases !== 'undefined' && Purchases !== null) {
      try {
      await Purchases.logOut();
      console.log('User logged out from RevenueCat');
      } catch (logoutError) {
        console.warn('Failed to log out from RevenueCat:', logoutError);
      }
    }
    return true;
  } catch (error) {
    console.error('Failed to reset user for purchases:', error);
    return false;
  }
};

/**
 * Ottiene le informazioni del cliente
 */
export const getCustomerInfo = async () => {
  try {
    if (isExpoGo) {
      // In Expo Go, controlla se l'utente è stato impostato come "premium" nel mock
      const mockPremium = await AsyncStorage.getItem(STORAGE_KEYS.MOCK_PREMIUM);
      return mockPremium === 'true' ? { entitlements: { active: { premium: true, ad_free: true } } } : { entitlements: { active: {} } };
    }
    
    if (typeof Purchases !== 'undefined' && Purchases !== null) {
      try {
      const customerInfo = await Purchases.getCustomerInfo();
      // Salva le informazioni in AsyncStorage per l'accesso offline
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMER_INFO, JSON.stringify(customerInfo));
      return customerInfo;
      } catch (infoError) {
        console.warn('Failed to get RevenueCat customer info:', infoError);
      }
    }
    
    // Se RevenueCat non è disponibile, prova a recuperare i dati da AsyncStorage
    try {
      const storedInfo = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOMER_INFO);
      if (storedInfo) {
        return JSON.parse(storedInfo);
      }
    } catch (storageError) {
      console.error('Failed to get stored customer info:', storageError);
    }
    
    // Se non ci sono dati, restituisci un mock vuoto
    return { entitlements: { active: {} } };
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return { entitlements: { active: {} } };
  }
};

/**
 * Controlla se l'utente ha un'autorizzazione specifica
 */
export const hasEntitlement = async (entitlement: Entitlement): Promise<boolean> => {
  try {
    if (isExpoGo) {
      // In Expo Go, controlla se l'utente è stato impostato come "premium" nel mock
      const mockPremium = await AsyncStorage.getItem(STORAGE_KEYS.MOCK_PREMIUM);
      if (entitlement === Entitlement.PREMIUM) {
        return mockPremium === 'true';
      } else if (entitlement === Entitlement.AD_FREE) {
        return mockPremium === 'true';
      }
      return false;
    }
    
    const customerInfo = await getCustomerInfo();
    if (!customerInfo || !customerInfo.entitlements || !customerInfo.entitlements.active) return false;
    
    return !!customerInfo.entitlements.active[entitlement];
  } catch (error) {
    console.error(`Failed to check entitlement ${entitlement}:`, error);
    return false;
  }
};

/**
 * Ottiene tutti i prodotti disponibili
 */
export const getProducts = async () => {
  try {
    if (isExpoGo) {
      // In Expo Go, restituisci prodotti mockati
      return {
        identifier: 'default',
        serverDescription: 'Mock offerings for testing',
        availablePackages: [
          {
            identifier: 'premium_monthly',
            packageType: 'MONTHLY',
            product: {
              price: 2.99,
              currencyCode: 'EUR',
              identifier: 'com.bacchus.app.premium.monthly',
              title: 'Premium Monthly',
              description: 'Abbonamento mensile a Bacchus Premium'
            }
          },
          {
            identifier: 'premium_yearly',
            packageType: 'ANNUAL',
            product: {
              price: 24.99,
              currencyCode: 'EUR',
              identifier: 'com.bacchus.app.premium.yearly',
              title: 'Premium Yearly',
              description: 'Abbonamento annuale a Bacchus Premium'
            }
          },
          {
            identifier: 'remove_ads',
            packageType: 'LIFETIME',
            product: {
              price: 4.99,
              currencyCode: 'EUR',
              identifier: 'com.bacchus.app.removeads',
              title: 'Remove Ads',
              description: 'Rimuovi le pubblicità per sempre'
            }
          }
        ]
      };
    }
    
    if (typeof Purchases !== 'undefined' && Purchases !== null) {
      try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
      } catch (offeringsError) {
        console.warn('Failed to get RevenueCat offerings:', offeringsError);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get products:', error);
    return null;
  }
};

/**
 * Acquista un pacchetto
 */
export const purchasePackage = async (pkg: any) => {
  try {
    if (isExpoGo) {
      // In Expo Go, simula un acquisto riuscito
      console.log('Mock purchase in Expo Go:', pkg.identifier);
      await AsyncStorage.setItem(STORAGE_KEYS.MOCK_PREMIUM, 'true');
      return { 
        success: true, 
        customerInfo: { 
          entitlements: { 
            active: { 
              premium: pkg.identifier.includes('premium'),
              ad_free: true 
            } 
          } 
        } 
      };
    }
    
    if (Purchases) {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMER_INFO, JSON.stringify(customerInfo));
      return { success: true, customerInfo };
    }
    
    return { success: false, error: 'Purchases SDK not available' };
  } catch (error: any) {
    if (error && !error.userCancelled) {
      console.error('Purchase failed:', error);
    }
    return { success: false, error };
  }
};

/**
 * Ripristina gli acquisti dell'utente
 */
export const restorePurchases = async () => {
  try {
    if (isExpoGo) {
      // In Expo Go, simula un ripristino riuscito
      const mockPremium = await AsyncStorage.getItem(STORAGE_KEYS.MOCK_PREMIUM);
      return { 
        success: true, 
        customerInfo: { 
          entitlements: { 
            active: mockPremium === 'true' ? { premium: true, ad_free: true } : {} 
          } 
        } 
      };
    }
    
    if (Purchases) {
      const customerInfo = await Purchases.restorePurchases();
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMER_INFO, JSON.stringify(customerInfo));
      return { success: true, customerInfo };
    }
    
    return { success: false, error: 'Purchases SDK not available' };
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    return { success: false, error };
  }
};

/**
 * Verifica se l'utente è premium
 */
export const isPremium = async (): Promise<boolean> => {
  return hasEntitlement(Entitlement.PREMIUM);
};

/**
 * Verifica se l'utente ha rimosso le pubblicità
 */
export const isAdFree = async (): Promise<boolean> => {
  const adFree = await hasEntitlement(Entitlement.AD_FREE);
  const premium = await isPremium();
  return adFree || premium; // Premium include anche ad-free
};

/**
 * Gestione del conteggio sessioni settimanali (per utenti non premium)
 */

/**
 * Verifica e resetta il contatore sessioni settimanali se è passata una settimana
 */
export const checkAndResetWeeklySessionCount = async (): Promise<number> => {
  try {
    const lastResetTimestamp = await AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_SESSION_RESET);
    const now = new Date().getTime();
    
    // Se è passata una settimana o non c'è un timestamp precedente, resetta il contatore
    if (!lastResetTimestamp || now - parseInt(lastResetTimestamp) > 7 * 24 * 60 * 60 * 1000) {
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_COUNT, '0');
      await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_SESSION_RESET, now.toString());
      return 0;
    }
    
    // Altrimenti restituisci il contatore attuale
    const sessionCount = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_COUNT);
    return sessionCount ? parseInt(sessionCount) : 0;
  } catch (error) {
    console.error('Failed to check/reset weekly session count:', error);
    return 0;
  }
};

/**
 * Incrementa il contatore sessioni settimanali
 */
export const incrementSessionCount = async (): Promise<number> => {
  try {
    // Verifica e resetta se necessario
    await checkAndResetWeeklySessionCount();
    
    // Leggi il contatore corrente
    const sessionCount = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_COUNT);
    const newCount = (sessionCount ? parseInt(sessionCount) : 0) + 1;
    
    // Salva il nuovo contatore
    await AsyncStorage.setItem(STORAGE_KEYS.SESSION_COUNT, newCount.toString());
    
    return newCount;
  } catch (error) {
    console.error('Failed to increment session count:', error);
    return 0;
  }
};

/**
 * Ottiene il numero di sessioni rimaste questa settimana
 */
export const getRemainingSessionsCount = async (): Promise<number> => {
  try {
    // Se l'utente è premium, restituisci un valore infinito (rappresentato da -1)
    const premium = await isPremium();
    if (premium) return -1;
    
    // Altrimenti calcola le sessioni rimaste
    const sessionCount = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_COUNT);
    const count = sessionCount ? parseInt(sessionCount) : 0;
    
    return Math.max(0, FREE_LIMITS.SESSIONS_PER_WEEK - count);
  } catch (error) {
    console.error('Failed to get remaining sessions count:', error);
    return 0;
  }
};

/**
 * Verifica se l'utente può creare una nuova sessione
 */
export const canCreateNewSession = async (): Promise<boolean> => {
  try {
    // Se l'utente è premium, può sempre creare nuove sessioni
    const premium = await isPremium();
    if (premium) return true;
    
    // Altrimenti verifica il contatore
    const remainingSessions = await getRemainingSessionsCount();
    return remainingSessions > 0;
  } catch (error) {
    console.error('Failed to check if user can create new session:', error);
    return false;
  }
};

/**
 * Solo per scopi di sviluppo: imposta lo stato premium per il mock
 */
export const setMockPremiumStatus = async (isPremium: boolean): Promise<void> => {
  if (isExpoGo) {
    await AsyncStorage.setItem(STORAGE_KEYS.MOCK_PREMIUM, isPremium ? 'true' : 'false');
    console.log(`Mock premium status set to ${isPremium}`);
  }
}; 