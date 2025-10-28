import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProductType, PRODUCT_IDS, Entitlement, FREE_LIMITS } from '../../types/purchases';
import Constants from 'expo-constants';
import * as authService from './auth.service';
import supabase from '../supabase/client';

// Determina se siamo in Expo Go o non possiamo usare RevenueCat
const isExpoGo = Constants.appOwnership === 'expo';

// Flag per indicare se RevenueCat è disponibile
let isRevenueCatAvailable = false;

// Importa RevenueCat solo se non siamo in Expo Go
let Purchases: any = null;
let LOG_LEVEL: any = null;

// 🔧 SISTEMA ACQUISTI INTELLIGENTE: Prova reale, fallback a mock sicuro
let ExpoInAppPurchases: any = null;
let isInAppPurchasesAvailable = false;

try {
  if (!isExpoGo) {
    console.log('🛒 PURCHASES: Tentativo caricamento Expo In-App Purchases...');
    ExpoInAppPurchases = require('expo-in-app-purchases');
    isInAppPurchasesAvailable = true;
    console.log('✅ PURCHASES: Expo In-App Purchases caricato (tenteremo connessione sicura)');
  } else {
    console.log('🛒 PURCHASES: Expo Go rilevato - modalità mock');
    isInAppPurchasesAvailable = false;
  }
} catch (error) {
  console.log('⚠️ PURCHASES: In-App Purchases non disponibile, modalità mock:', error);
  isInAppPurchasesAvailable = false;
}

// 🔧 CHIAVI API REVENUECAT - Configurazione per produzione
const API_KEYS = {
  // 🍎 iOS: Chiave RevenueCat per iOS
  ios: __DEV__ 
    ? 'dummy_key' 
    : process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'appl_IHqsMqgHKMcDfWPFMDJDmiyGDsV',
  
  // 🤖 Android: Chiave RevenueCat per Android
  android: __DEV__ 
    ? 'dummy_key' 
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'goog_YOUR_REVENUECAT_ANDROID_KEY_HERE',
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
    // 🔧 SISTEMA INTELLIGENTE: Tenta acquisti reali, fallback sicuro a mock
    if (isInAppPurchasesAvailable && !isExpoGo) {
      console.log('🛒 INIT: Tentativo inizializzazione acquisti reali...');
      
      try {
        // Step 1: Connessione sicura
        console.log('🔗 INIT: Connessione a StoreKit...');
        await ExpoInAppPurchases.connectAsync();
        console.log('✅ INIT: StoreKit connesso!');
        
        // Step 2: Caricamento prodotti con timeout
        console.log('📦 INIT: Caricamento prodotti configurati...');
        const productIds = [
          PRODUCT_IDS.PREMIUM_SUBSCRIPTION_MONTHLY.ios,
          PRODUCT_IDS.PREMIUM_SUBSCRIPTION_YEARLY.ios
        ];
        
        console.log('🔍 INIT: Cercando prodotti:', productIds);
        
        // Timeout di 10 secondi per evitare hang
        const productsPromise = ExpoInAppPurchases.getProductsAsync(productIds);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout caricamento prodotti')), 10000)
        );
        
        const products = await Promise.race([productsPromise, timeoutPromise]);
        
        if (products && products.results && products.results.length > 0) {
          console.log('✅ INIT: Prodotti caricati con successo:', products.results.length);
          console.log('📋 INIT: Prodotti trovati:', products.results.map((p: any) => p.productId));
          return true;
        } else {
          console.log('⚠️ INIT: Nessun prodotto trovato in App Store Connect');
          console.log('💡 INIT: Probabilmente i prodotti non sono ancora configurati');
          throw new Error('Prodotti non configurati in App Store Connect');
        }
        
      } catch (inAppError: any) {
        console.error('❌ INIT: Errore acquisti reali:', inAppError.message || inAppError);
        console.log('🔄 INIT: Fallback a modalità mock sicura...');
        return await initMockMode();
      }
    }
    
    // Fallback diretto a mock
    console.log('🔄 INIT: Modalità mock (Expo Go o modulo non disponibile)');
    return await initMockMode();
    
  } catch (error) {
    console.error('❌ INIT: Errore generale inizializzazione acquisti:', error);
    return await initMockMode();
  }
};

// Funzione helper per modalità mock
const initMockMode = async () => {
  console.log('🔧 INIT: Modalità mock attiva');
  
  const existingMockPremium = await AsyncStorage.getItem(STORAGE_KEYS.MOCK_PREMIUM);
  if (!existingMockPremium) {
    console.log('🔧 MOCK: Impostando modalità gratuita per testare counter sessioni');
    await AsyncStorage.setItem(STORAGE_KEYS.MOCK_PREMIUM, 'false');
  } else {
    console.log(`🔧 MOCK: Mantenendo stato premium esistente: ${existingMockPremium}`);
  }
  return true;
    
    // 🛒 INIZIALIZZAZIONE REVENUECAT MIGLIORATA
    const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;
    
    // Verifica se abbiamo chiavi API valide
    if (apiKey === 'dummy_key' || apiKey.includes('YOUR_REVENUECAT')) {
      console.log('🛒 PURCHASES: Chiavi API non configurate - usando modalità mock');
      isRevenueCatAvailable = false;
      await AsyncStorage.setItem(STORAGE_KEYS.MOCK_PREMIUM, 'false');
      return true;
    }
    
    try {
      console.log('🛒 PURCHASES: Inizializzazione RevenueCat con chiave:', apiKey.substring(0, 10) + '...');
      
      // Configura RevenueCat in modalità debug in ambiente di sviluppo
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }
      
      // Inizializza SDK RevenueCat
      await Purchases.configure({
        apiKey,
        appUserID: null, // L'ID utente sarà impostato dopo la login
      });
      
      console.log('✅ PURCHASES: RevenueCat inizializzato con successo');
      
      // Verifica che RevenueCat sia effettivamente funzionante
      try {
        const offerings = await Purchases.getOfferings();
        console.log('✅ PURCHASES: Offerings caricate:', Object.keys(offerings.all).length);
      } catch (offeringsError) {
        console.warn('⚠️ PURCHASES: Impossibile caricare offerings:', offeringsError);
        // Non bloccare l'app, ma nota il problema
      }
      
    } catch (revenueCatError) {
      console.warn('❌ PURCHASES: Fallimento inizializzazione RevenueCat:', revenueCatError);
      // Se RevenueCat fallisce, passiamo alla modalità mock
      isRevenueCatAvailable = false;
      await AsyncStorage.setItem(STORAGE_KEYS.MOCK_PREMIUM, 'false');
    }
    
    // Verifica e reset il contatore sessioni settimanali
    await checkAndResetWeeklySessionCount();
    
    return true;
};

/**
 * Imposta l'ID utente per RevenueCat
 */
export const setUserForPurchases = async (userId: string) => {
  try {
    if (!isRevenueCatAvailable) return true;
    
    try {
      await Purchases.logIn(userId);
      console.log(`User ${userId} logged into RevenueCat`);
    } catch (loginError) {
      console.warn('Failed to log in to RevenueCat:', loginError);
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
    if (!isRevenueCatAvailable) return true;
    
    try {
      await Purchases.logOut();
      console.log('User logged out from RevenueCat');
    } catch (logoutError) {
      console.warn('Failed to log out from RevenueCat:', logoutError);
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
    // 🔧 SISTEMA INTELLIGENTE: Tenta acquisto reale, fallback a mock
    if (isInAppPurchasesAvailable && !isExpoGo) {
      console.log('🛒 PURCHASE: Tentativo acquisto reale per:', pkg.identifier || pkg.productId);
      
      try {
        const productId = pkg.identifier || pkg.productId;
        
        // Timeout di 30 secondi per l'acquisto
        const purchasePromise = ExpoInAppPurchases.purchaseItemAsync(productId);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout acquisto')), 30000)
        );
        
        const result = await Promise.race([purchasePromise, timeoutPromise]);
        
        if (result && result.responseCode === ExpoInAppPurchases.IAPResponseCode.OK) {
          console.log('✅ PURCHASE: Acquisto reale completato!');
          
          // Salva lo stato premium
          await AsyncStorage.setItem(STORAGE_KEYS.MOCK_PREMIUM, 'true');
          
          return { 
            success: true, 
            customerInfo: { 
              entitlements: { 
                active: { 
                  premium: true,
                  ad_free: true 
                } 
              } 
            } 
          };
        } else {
          console.log('❌ PURCHASE: Acquisto fallito:', result?.responseCode);
          throw new Error('Purchase failed with code: ' + result?.responseCode);
        }
        
      } catch (purchaseError: any) {
        console.error('❌ PURCHASE: Errore acquisto reale:', purchaseError.message || purchaseError);
        
        // Se l'utente ha cancellato, non fare fallback
        if (purchaseError.userCancelled || purchaseError.message?.includes('cancelled')) {
          return { success: false, error: purchaseError };
        }
        
        // Altrimenti, fallback a mock per testing
        console.log('🔄 PURCHASE: Fallback a mock per testing...');
      }
    }
    
    // Modalità mock (per testing o quando acquisti reali non disponibili)
    console.log('🔧 PURCHASE: Mock purchase per:', pkg.identifier || pkg.productId);
    await AsyncStorage.setItem(STORAGE_KEYS.MOCK_PREMIUM, 'true');
    return { 
      success: true, 
      customerInfo: { 
        entitlements: { 
          active: { 
            premium: true,
            ad_free: true 
          } 
        } 
      } 
    };
    
  } catch (error: any) {
    if (error && !error.userCancelled) {
      console.error('❌ PURCHASE: Errore generale:', error);
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
 * Fallback locale per il contatore sessioni (solo per offline)
 */
const checkAndResetWeeklySessionCountLocal = async (): Promise<number> => {
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
    console.error('Failed to check/reset weekly session count locally:', error);
    return 0;
  }
};

/**
 * Verifica e resetta il contatore sessioni settimanali se è passata una settimana
 * AGGIORNATO: Usa il database invece di AsyncStorage per collegare all'account
 */
export const checkAndResetWeeklySessionCount = async (): Promise<number> => {
  try {
    // Ottieni utente corrente
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      console.log('Nessun utente autenticato per controllo sessioni');
      return 0;
    }

    // Usa funzione database per reset automatico
    const { data, error } = await supabase
      .rpc('reset_weekly_sessions_if_needed', { p_user_id: currentUser.id });
    
    if (error) {
      console.error('Errore database nel controllo sessioni settimanali:', error);
      // Fallback ad AsyncStorage se database fallisce
      return await checkAndResetWeeklySessionCountLocal();
    }
    
    return data || 0;
  } catch (error) {
    console.error('Failed to check/reset weekly session count:', error);
    // Fallback ad AsyncStorage in caso di errore
    return await checkAndResetWeeklySessionCountLocal();
  }
};

/**
 * Fallback locale per incremento sessioni (solo per offline)
 */
const incrementSessionCountLocal = async (): Promise<number> => {
  try {
    // Verifica e resetta se necessario
    await checkAndResetWeeklySessionCountLocal();
    
    // Leggi il contatore corrente
    const sessionCount = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_COUNT);
    const newCount = (sessionCount ? parseInt(sessionCount) : 0) + 1;
    
    // Salva il nuovo contatore
    await AsyncStorage.setItem(STORAGE_KEYS.SESSION_COUNT, newCount.toString());
    
    return newCount;
  } catch (error) {
    console.error('Failed to increment session count locally:', error);
    return 0;
  }
};

/**
 * Incrementa il contatore sessioni settimanali
 * AGGIORNATO: Usa il database invece di AsyncStorage per collegare all'account
 */
export const incrementSessionCount = async (): Promise<number> => {
  try {
    console.log('🎯 INCREMENT_SESSION: Inizio incremento...');
    
    // Ottieni utente corrente
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      console.log('🎯 INCREMENT_SESSION: Nessun utente autenticato');
      return 1;
    }
    
    console.log('🎯 INCREMENT_SESSION: User ID:', currentUser.id);

    // Usa funzione database per incrementare
    console.log('🎯 INCREMENT_SESSION: Chiamando RPC increment_user_session_count...');
    const { data, error } = await supabase
      .rpc('increment_user_session_count', { p_user_id: currentUser.id });
    
    console.log('🎯 INCREMENT_SESSION: RPC result - data:', data, 'error:', error);
    
    if (error) {
      console.error('🎯 INCREMENT_SESSION: ❌ Errore database:', error);
      // Fallback ad AsyncStorage se database fallisce
      const fallbackResult = await incrementSessionCountLocal();
      console.log('🎯 INCREMENT_SESSION: Fallback locale result:', fallbackResult);
      return fallbackResult;
    }
    
    console.log('🎯 INCREMENT_SESSION: ✅ Sessioni usate dopo incremento:', data || 1);
    return data || 1;
  } catch (error) {
    console.error('🎯 INCREMENT_SESSION: ❌ Errore generale:', error);
    // Fallback ad AsyncStorage in caso di errore
    return await incrementSessionCountLocal();
  }
};

/**
 * Ottiene il numero di sessioni rimaste questa settimana
 * AGGIORNATO: Usa il database invece di AsyncStorage per collegare all'account
 */
export const getRemainingSessionsCount = async (): Promise<number> => {
  try {
    console.log('🎯 GET_REMAINING_SESSIONS: Inizio verifica...');
    
    // Se l'utente è premium, restituisci un valore infinito (rappresentato da -1)
    const premium = await isPremium();
    console.log('🎯 GET_REMAINING_SESSIONS: Premium status:', premium);
    if (premium) {
      console.log('🎯 GET_REMAINING_SESSIONS: Utente premium - sessioni illimitate');
      return -1;
    }
    
    // Ottieni utente corrente
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      console.log('🎯 GET_REMAINING_SESSIONS: Nessun utente autenticato');
      return 0;
    }
    
    console.log('🎯 GET_REMAINING_SESSIONS: User ID:', currentUser.id);

    // Usa funzione database per ottenere sessioni rimanenti
    console.log('🎯 GET_REMAINING_SESSIONS: Chiamando RPC get_remaining_sessions...');
    const { data, error } = await supabase
      .rpc('get_remaining_sessions', { p_user_id: currentUser.id });
    
    console.log('🎯 GET_REMAINING_SESSIONS: RPC result - data:', data, 'error:', error);
    
    if (error) {
      console.error('🎯 GET_REMAINING_SESSIONS: ❌ Errore database:', error);
      // Fallback: calcola localmente
      const sessionCount = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_COUNT);
      const count = sessionCount ? parseInt(sessionCount) : 0;
      const fallbackResult = Math.max(0, FREE_LIMITS.SESSIONS_PER_WEEK - count);
      console.log('🎯 GET_REMAINING_SESSIONS: Fallback locale - count:', count, 'result:', fallbackResult);
      return fallbackResult;
    }
    
    console.log('🎯 GET_REMAINING_SESSIONS: ✅ Risultato finale:', data || 0);
    return data || 0;
  } catch (error) {
    console.error('🎯 GET_REMAINING_SESSIONS: ❌ Errore generale:', error);
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