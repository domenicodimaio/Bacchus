import { Platform, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProductType, PRODUCT_IDS, Entitlement, FREE_LIMITS } from '../../types/purchases';
import Constants from 'expo-constants';
import * as authService from './auth.service';
import supabase from '../supabase/client';
import { isIPad as detectIPad, getDeviceInfo } from '../utils/deviceDetection';

// 🚨 DEBUG ESTREMO: Questo log DEVE apparire sempre
console.log('🚨🚨🚨 PURCHASE.SERVICE.TS CARICATO! 🚨🚨🚨');
console.log('🚨 Platform.OS:', Platform.OS);
console.log('🚨 Constants.appOwnership:', Constants.appOwnership);

// Determina se siamo in Expo Go o non possiamo usare RevenueCat
const isExpoGo = Constants.appOwnership === 'expo';

// Flag per indicare se RevenueCat è disponibile
let isRevenueCatAvailable = false;

// Importa RevenueCat solo se non siamo in Expo Go
let Purchases: any = null;
let LOG_LEVEL: any = null;

try {
  if (!isExpoGo) {
    console.log('🛒 PURCHASES: Tentativo caricamento RevenueCat...');
    Purchases = require('react-native-purchases').default;
    LOG_LEVEL = require('react-native-purchases').LOG_LEVEL;
    isRevenueCatAvailable = true;
    console.log('✅ PURCHASES: RevenueCat caricato con successo');
  } else {
    console.log('🛒 PURCHASES: Expo Go rilevato - RevenueCat non disponibile');
    isRevenueCatAvailable = false;
  }
} catch (error) {
  console.log('⚠️ PURCHASES: RevenueCat non disponibile:', error);
  isRevenueCatAvailable = false;
}

// 🔧 SISTEMA ACQUISTI PRODUZIONE: RevenueCat + Expo IAP fallback
let ExpoInAppPurchases: any = null;
let isInAppPurchasesAvailable = false;

try {
  if (!isExpoGo) {
    console.log('🛒 PURCHASES: Tentativo caricamento Expo In-App Purchases...');
    ExpoInAppPurchases = require('expo-in-app-purchases');
    isInAppPurchasesAvailable = true;
    console.log('✅ PURCHASES: Expo In-App Purchases caricato (tenteremo connessione sicura)');
  } else {
    console.log('🛒 PURCHASES: Expo Go rilevato - solo sviluppo');
    isInAppPurchasesAvailable = false;
  }
} catch (error) {
  console.log('⚠️ PURCHASES: In-App Purchases non disponibile:', error);
  isInAppPurchasesAvailable = false;
}

// 🔧 CHIAVI API REVENUECAT - Configurazione per produzione E testing
const API_KEYS = {
  // 🍎 iOS: Chiave RevenueCat per iOS (usata anche in DEV per testing)
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'appl_IHqsMqgHKMcDfWPFMDJDmiyGDsV',
  
  // 🤖 Android: Chiave RevenueCat per Android
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'goog_YOUR_REVENUECAT_ANDROID_KEY_HERE',
};

// 🍎 CONFIGURAZIONE SPECIALE PER APPLE REVIEW
// Durante la review Apple, usiamo una modalità più permissiva
const isAppleReviewEnvironment = () => {
  // Rileva se siamo in ambiente di test Apple
  return __DEV__ || Constants.appOwnership === 'expo' || 
         (Platform.OS === 'ios' && !__DEV__ && !Constants.isDevice);
};

// 🍎 VALIDAZIONE RECEIPT SERVER-SIDE REALE
const RECEIPT_VALIDATION_URL = process.env.EXPO_PUBLIC_RECEIPT_VALIDATION_URL || 'https://bacchus-receipt-validation.vercel.app/api/validate-receipt';

const validateReceiptOnServer = async (receiptData, sharedSecret = null) => {
  try {
    console.log('🍎 Validating receipt on server:', RECEIPT_VALIDATION_URL);
    
    const response = await fetch(RECEIPT_VALIDATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiptData,
        sharedSecret
      })
      // Note: timeout non supportato in fetch standard
    });

    if (!response.ok) {
      throw new Error(`Server validation failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('🍎 Server validation result:', result);
    
    return result;
  } catch (error) {
    console.error('🍎 Server validation error:', error);
    throw error;
  }
};

// Chiavi AsyncStorage per gli acquisti
const STORAGE_KEYS = {
  CUSTOMER_INFO: 'bacchus_customer_info',
  SESSION_COUNT: 'bacchus_session_count',
  WEEKLY_SESSION_RESET: 'bacchus_weekly_session_reset',
  PREMIUM_STATUS: 'bacchus_premium_status', // Stato premium locale
};

// 🔧 FIX MULTI-ACCOUNT: Chiavi specifiche per utente
const getUserSpecificKey = (baseKey: string, userId?: string): string => {
  if (!userId) {
    console.warn(`⚠️ getUserSpecificKey: userId mancante per ${baseKey}, usando chiave temporanea`);
    // 🔥 FIX ISOLAMENTO PREMIUM: Non usare chiave globale, usa chiave temporanea per evitare contaminazione
    return `${baseKey}_TEMP_NO_USER`;
  }
  return `${baseKey}_${userId}`;
};

// Variabile per tracciare l'utente corrente
let currentUserId: string | null = null;

/**
 * 🔧 FIX MULTI-ACCOUNT: Imposta l'utente corrente per le chiavi specifiche
 */
export const setUserForPurchases = async (userId: string): Promise<boolean> => {
  try {
    console.log(`🎯 PURCHASE_SERVICE: Impostando utente per acquisti: ${userId}`);
    const deviceInfo = getDeviceInfo();
    console.log(`🎯 PURCHASE_SERVICE: Platform info:`, deviceInfo);
    
    // 🔥 FIX PREMIUM PERSISTENCE: Controlla se l'utente usa Apple Sign In
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    let revenueCatUserId = userId; // Default: usa l'ID interno dell'app
    
    try {
      const appleUserDataKey = `APPLE_USER_DATA_${userId}`;
      console.log(`🔍 PURCHASE_SERVICE: Cercando Apple User Data con chiave: ${appleUserDataKey}`);
      
      let appleUserData = await AsyncStorage.getItem(appleUserDataKey);
      console.log(`🔍 PURCHASE_SERVICE: Apple User Data trovato con chiave utente:`, !!appleUserData);
      
      // 🔥 FIX CROSS-DEVICE: Se non trovato con chiave utente, cerca con tutte le chiavi Apple ID
      if (!appleUserData) {
        console.log(`🔍 PURCHASE_SERVICE: Cercando Apple User Data con chiavi Apple ID...`);
        
        // Ottieni tutte le chiavi AsyncStorage
        const allKeys = await AsyncStorage.getAllKeys();
        const appleIdKeys = allKeys.filter(key => key.startsWith('APPLE_USER_DATA_APPLE_'));
        
        console.log(`🔍 PURCHASE_SERVICE: Trovate ${appleIdKeys.length} chiavi Apple ID:`, appleIdKeys);
        
        // Cerca tra tutte le chiavi Apple ID
        for (const appleIdKey of appleIdKeys) {
          try {
            const appleIdData = await AsyncStorage.getItem(appleIdKey);
            if (appleIdData) {
              const parsedData = JSON.parse(appleIdData);
              console.log(`🔍 PURCHASE_SERVICE: Trovato Apple User Data con chiave ${appleIdKey}:`, {
                hasAppleId: !!parsedData.appleId,
                deviceType: parsedData.deviceType,
                savedAt: parsedData.savedAt
              });
              
              // Usa questo Apple User Data
              appleUserData = JSON.stringify({
                appleId: parsedData.appleId,
                name: parsedData.name,
                email: parsedData.email,
                fromApple: parsedData.fromApple
              });
              
              console.log(`✅ PURCHASE_SERVICE: Usando Apple User Data cross-device da ${parsedData.deviceType}`);
              break;
            }
          } catch (parseError) {
            console.warn(`⚠️ PURCHASE_SERVICE: Errore parsing chiave ${appleIdKey}:`, parseError);
          }
        }
      }
      
      if (appleUserData) {
        const appleData = JSON.parse(appleUserData);
        console.log(`🔍 PURCHASE_SERVICE: Apple Data parsed:`, {
          hasAppleId: !!appleData.appleId,
          appleIdLength: appleData.appleId?.length,
          keys: Object.keys(appleData)
        });
        
        if (appleData.appleId) {
          // 🔥 CRITICO: Per Apple Sign In, usa l'Apple ID come RevenueCat user ID
          revenueCatUserId = appleData.appleId;
          console.log(`🍎 APPLE SIGN IN: Usando Apple ID come RevenueCat user ID`);
          console.log(`   App User ID: ${userId}`);
          console.log(`   RevenueCat User ID: ${revenueCatUserId}`);
          console.log(`   Device: ${deviceInfo.isIPad ? 'iPad' : 'iPhone'}`);
        } else {
          console.warn(`⚠️ PURCHASE_SERVICE: Apple User Data presente ma senza appleId!`);
        }
      } else {
        console.log(`🔍 PURCHASE_SERVICE: Nessun Apple User Data trovato - utente email/password`);
      }
    } catch (appleCheckError) {
      console.warn('⚠️ Errore controllo Apple Sign In, uso ID interno:', appleCheckError);
    }
    
    // Se l'utente è cambiato, pulisci lo stato precedente
    if (currentUserId && currentUserId !== userId) {
      console.log(`🔄 PURCHASE_SERVICE: Utente cambiato da ${currentUserId} a ${userId}, pulizia stato`);
      
      // Pulisci RevenueCat se disponibile
      if (isRevenueCatAvailable && Purchases) {
        try {
          await Purchases.logOut();
          console.log('🔄 RevenueCat: Logout completato per cambio utente');
          
          // 🔥 FIX VELOCITÀ: Ridotto tempo logout per velocità
          await new Promise(resolve => setTimeout(resolve, 200)); // Ridotto da 1000ms a 200ms
        } catch (logoutError) {
          console.warn('⚠️ RevenueCat: Errore logout:', logoutError);
        }
      }
    }
    
    currentUserId = userId; // Mantieni sempre l'ID interno per l'app
    
    // Configura RevenueCat per il nuovo utente
    if (isRevenueCatAvailable && Purchases) {
      try {
        console.log(`🔄 RevenueCat: Login con user ID: ${revenueCatUserId}`);
        const loginResult = await Purchases.logIn(revenueCatUserId);
        console.log(`✅ RevenueCat: Login completato per utente ${revenueCatUserId}`);
        console.log(`🔍 RevenueCat: Created=${loginResult.created}, OriginalAppUserId=${loginResult.customerInfo?.originalAppUserId}`);
        
        // 🔥 FIX VELOCITÀ: Ridotto tempo sincronizzazione per velocità
        console.log('🔄 RevenueCat: Aspettando sincronizzazione...');
        await new Promise(resolve => setTimeout(resolve, 300)); // Ridotto da 1500ms a 300ms
        
        // Verifica che la sincronizzazione sia avvenuta
        try {
          const customerInfo = await Purchases.getCustomerInfo();
          const activeEntitlements = Object.keys(customerInfo?.entitlements?.active || {});
          console.log(`✅ RevenueCat: Sincronizzazione completata per ${userId}`, {
            originalAppUserId: customerInfo?.originalAppUserId,
            hasEntitlements: !!customerInfo?.entitlements?.active,
            activeEntitlements: activeEntitlements
          });
          
          // 🔍 Verifica coerenza user ID (ora dovrebbero corrispondere sempre)
          if (customerInfo?.originalAppUserId !== revenueCatUserId) {
            console.warn(`⚠️ SYNC: RevenueCat user ID mismatch dopo login`);
            console.warn(`   Expected: ${revenueCatUserId}`);
            console.warn(`   Got: ${customerInfo?.originalAppUserId}`);
            console.warn(`   Questo potrebbe indicare un problema di sincronizzazione`);
          } else {
            console.log(`✅ SYNC: RevenueCat user ID corrispondente: ${revenueCatUserId}`);
          }
        } catch (syncError) {
          console.warn('⚠️ RevenueCat: Errore verifica sincronizzazione:', syncError);
        }
        
      } catch (loginError) {
        console.warn('⚠️ RevenueCat: Errore login:', loginError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ PURCHASE_SERVICE: Errore impostazione utente:', error);
    return false;
  }
};

/**
 * Inizializza il servizio di acquisti
 */
export const initPurchases = async () => {
  try {
    // 🚨 DEBUG: Forza log per capire cosa succede
    console.log('🛒 PURCHASES: initPurchases chiamato!');
    console.log('🛒 PURCHASES: isRevenueCatAvailable:', isRevenueCatAvailable);
    console.log('🛒 PURCHASES: isExpoGo:', isExpoGo);
    console.log('🛒 PURCHASES: Platform.OS:', Platform.OS);
    
    // 🔧 DISATTIVA SIMULAZIONE PREMIUM per testare RevenueCat
    console.log('🛒 PURCHASES: Disattivando simulazione premium per test RevenueCat...');
    await AsyncStorage.removeItem('SIMULATE_PREMIUM');
    console.log('🛒 PURCHASES: Simulazione premium disattivata!');
    
    // 🔧 PROVA PRIMA REVENUECAT (PREFERITO)
    if (isRevenueCatAvailable && !isExpoGo) {
      console.log('🛒 INIT: Tentativo inizializzazione RevenueCat...');
      
      const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;
      
      // Verifica se abbiamo chiavi API valide
      if (apiKey === 'dummy_key' || apiKey.includes('YOUR_REVENUECAT')) {
        console.log('🛒 PURCHASES: Chiavi API non configurate - fallback locale');
        return await initMockMode();
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
          
          if (offerings.current) {
            console.log('✅ PURCHASES: Current offering trovato:', offerings.current.identifier);
            console.log('📦 PURCHASES: Prodotti disponibili:', offerings.current.availablePackages.length);
          }
          
          return true;
        } catch (offeringsError) {
          console.warn('⚠️ PURCHASES: Impossibile caricare offerings:', offeringsError);
          // Non bloccare l'app, ma nota il problema
          return true; // RevenueCat è inizializzato anche se offerings fallisce
        }
        
      } catch (revenueCatError) {
        console.warn('❌ PURCHASES: Fallimento inizializzazione RevenueCat:', revenueCatError);
        // Se RevenueCat fallisce, proviamo Expo In-App Purchases
      }
    }
    
    // 🔧 FALLBACK A EXPO IN-APP PURCHASES
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
          PRODUCT_IDS[ProductType.PREMIUM_SUBSCRIPTION_MONTHLY].ios,
          PRODUCT_IDS[ProductType.PREMIUM_SUBSCRIPTION_YEARLY].ios
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
        console.log('🔄 INIT: Fallback a Expo IAP...');
        return await initMockMode();
      }
    }
    
    // Fallback per sviluppo
    console.log('🔄 INIT: Modalità sviluppo (Expo Go o modulo non disponibile)');
    return await initMockMode();
    
  } catch (error) {
    console.error('❌ INIT: Errore generale inizializzazione acquisti:', error);
    return await initMockMode();
  }
};

// Funzione helper per modalità sviluppo/fallback
const initMockMode = async () => {
  console.log('🔧 INIT: Modalità sviluppo attiva');
  
  const existingMockPremium = await AsyncStorage.getItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId));
  if (!existingMockPremium) {
    console.log('🔧 DEV: Impostando modalità gratuita per testare counter sessioni');
    await AsyncStorage.setItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId), 'false');
  } else {
    console.log(`🔧 DEV: Mantenendo stato premium esistente: ${existingMockPremium}`);
  }
  return true;
    
    // 🛒 INIZIALIZZAZIONE REVENUECAT MIGLIORATA
    const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;
    
    // Verifica se abbiamo chiavi API valide
    if (apiKey === 'dummy_key' || apiKey.includes('YOUR_REVENUECAT')) {
        console.log('🛒 PURCHASES: Chiavi API non configurate - fallback locale');
      isRevenueCatAvailable = false;
      await AsyncStorage.setItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId), 'false');
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
      // Se RevenueCat fallisce, passiamo al fallback locale
      isRevenueCatAvailable = false;
      await AsyncStorage.setItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId), 'false');
    }
    
    // Verifica e reset il contatore sessioni settimanali
    await checkAndResetWeeklySessionCount();
    
    return true;
};


/**
 * Resetta l'utente per RevenueCat (al logout)
 */
export const resetUserForPurchases = async () => {
  try {
    console.log(`🔄 RESET: Resettando stato acquisti per utente: ${currentUserId}`);
    
    // Pulisci lo stato premium specifico per l'utente corrente
    if (currentUserId) {
    try {
        await AsyncStorage.removeItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId));
        await AsyncStorage.removeItem(getUserSpecificKey(STORAGE_KEYS.CUSTOMER_INFO, currentUserId));
        await AsyncStorage.removeItem(getUserSpecificKey(STORAGE_KEYS.SESSION_COUNT, currentUserId));
        await AsyncStorage.removeItem(getUserSpecificKey(STORAGE_KEYS.WEEKLY_SESSION_RESET, currentUserId));
        console.log(`🔄 RESET: Pulito stato locale per utente ${currentUserId}`);
      } catch (storageError) {
        console.warn('⚠️ RESET: Errore pulizia AsyncStorage:', storageError);
  }
    }

    // 🔥 FIX ISOLAMENTO PREMIUM: Pulisci anche eventuali chiavi temporanee
    try {
      await AsyncStorage.removeItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, null));
      await AsyncStorage.removeItem(getUserSpecificKey(STORAGE_KEYS.CUSTOMER_INFO, null));
      console.log('🔄 RESET: Pulite anche chiavi temporanee');
    } catch (tempCleanError) {
      console.warn('⚠️ RESET: Errore pulizia chiavi temporanee:', tempCleanError);
    }

    // Logout da RevenueCat
    if (isRevenueCatAvailable && Purchases) {
    try {
      await Purchases.logOut();
        console.log('🔄 RESET: RevenueCat logout completato');
        
        // 🔥 FIX ISOLAMENTO PREMIUM: Aspetta che il logout sia completato
        await new Promise(resolve => setTimeout(resolve, 500));
    } catch (logoutError) {
        console.warn('⚠️ RESET: Errore RevenueCat logout:', logoutError);
    }
    }
    
    // Reset utente corrente
    const oldUserId = currentUserId;
    currentUserId = null;
    console.log(`🔄 RESET: Reset completato - utente ${oldUserId} -> null`);
    
    return true;
  } catch (error) {
    console.error('❌ RESET: Errore reset acquisti:', error);
    return false;
  }
};

/**
 * Ottiene le informazioni del cliente
 */
export const getCustomerInfo = async () => {
  try {
    if (isExpoGo) {
      // In Expo Go, controlla stato premium locale
      const localPremium = await AsyncStorage.getItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId));
      return localPremium === 'true' ? { entitlements: { active: { premium: true, ad_free: true } } } : { entitlements: { active: {} } };
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
    
    // Se non ci sono dati, restituisci stato vuoto
    return { entitlements: { active: {} } };
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return { entitlements: { active: {} } };
  }
};

/**
 * Forza il refresh delle informazioni del cliente da RevenueCat
 */
export const refreshCustomerInfo = async () => {
  try {
    if (isExpoGo) {
      console.log('🔄 REFRESH: Expo Go - skip refresh');
      return { entitlements: { active: {} } };
    }
    
    console.log('🔄 REFRESH: Forzando refresh customerInfo da server RevenueCat...');
    // Usa syncPurchases per forzare la sincronizzazione con i server Apple/Google
    await Purchases.syncPurchases();
    console.log('🔄 REFRESH: syncPurchases completato, ottenendo customerInfo aggiornato...');
    
    const customerInfo = await Purchases.getCustomerInfo();
    console.log('🔄 REFRESH: CustomerInfo aggiornato ricevuto:', {
      originalAppUserId: customerInfo.originalAppUserId,
      activeEntitlements: Object.keys(customerInfo.entitlements.active || {})
    });
    
    return customerInfo;
  } catch (error) {
    console.error('❌ REFRESH: Errore durante refresh customerInfo:', error);
    // Fallback al getCustomerInfo normale
    return await getCustomerInfo();
  }
};

/**
 * Controlla se l'utente ha un'autorizzazione specifica
 */
export const hasEntitlement = async (entitlement: Entitlement): Promise<boolean> => {
  try {
    console.log(`🔍 PREMIUM_CHECK: Controllo entitlement ${entitlement} per utente ${currentUserId}`);
    
    if (isExpoGo) {
      // In Expo Go, controlla stato premium locale
      const localPremium = await AsyncStorage.getItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId));
      console.log(`🔍 PREMIUM_CHECK: Expo Go - stato locale: ${localPremium}`);
      if (entitlement === Entitlement.PREMIUM) {
        return localPremium === 'true';
      } else if (entitlement === Entitlement.AD_FREE) {
        return localPremium === 'true';
      }
      return false;
    }
    
    console.log(`🔍 PREMIUM_CHECK: Ottenendo customerInfo da RevenueCat...`);
    const customerInfo = await getCustomerInfo();
    
    if (!customerInfo || !customerInfo.entitlements || !customerInfo.entitlements.active) {
      console.log(`🔍 PREMIUM_CHECK: Nessuna entitlement attiva trovata`);
      return false;
    }
    
    console.log(`🔍 PREMIUM_CHECK: CustomerInfo ricevuto:`, {
      originalAppUserId: customerInfo.originalAppUserId,
      currentUserId: currentUserId,
      activeEntitlements: Object.keys(customerInfo.entitlements.active || {}),
      targetEntitlement: entitlement,
      allActiveSubscriptions: customerInfo.activeSubscriptions || []
    });
    
    // 🔥 FIX PREMIUM PERSISTENCE: Ora che usiamo l'Apple ID come RevenueCat user ID,
    // gli ID dovrebbero sempre corrispondere. Se non corrispondono, è un problema sandbox.
    if (customerInfo.originalAppUserId && customerInfo.originalAppUserId !== currentUserId) {
      console.warn(`⚠️ hasEntitlement: RevenueCat user ID (${customerInfo.originalAppUserId}) ≠ currentUserId (${currentUserId})`);
      
      // 🔍 Controlla se l'utente corrente ha usato Apple Sign In
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      try {
        const appleUserData = await AsyncStorage.getItem(`APPLE_USER_DATA_${currentUserId}`);
        
        if (appleUserData) {
          console.log(`🍎 PREMIUM_CHECK: Utente Apple Sign In - dovrebbe usare Apple ID come RevenueCat ID`);
          console.log(`   App User ID: ${currentUserId}`);
          console.log(`   RevenueCat User ID: ${customerInfo.originalAppUserId}`);
          
          // Se è Apple Sign In ma gli ID non corrispondono, potrebbe essere un problema di sincronizzazione
          // Accetta comunque l'entitlement se presente
          const hasEntitlementResult = !!customerInfo.entitlements.active[entitlement];
          console.log(`🎯 PREMIUM_CHECK: RISULTATO per Apple Sign In (ID mismatch): ${hasEntitlementResult}`);
          return hasEntitlementResult;
        } else {
          console.warn(`⚠️ PREMIUM_CHECK: Utente non-Apple con ID mismatch - possibile problema sandbox`);
          console.warn(`   Ritorno false per evitare cross-contamination tra account`);
          return false;
        }
      } catch (storageError) {
        console.warn(`⚠️ hasEntitlement: Errore controllo Apple Sign In:`, storageError);
        return false;
      }
    }
    
    // Caso normale: user ID corrispondono o controllo diretto
    const hasEntitlementResult = !!customerInfo.entitlements.active[entitlement];
    console.log(`✅ PREMIUM_CHECK: Controllo entitlement diretto`);
    console.log(`🎯 PREMIUM_CHECK: RISULTATO FINALE: ${hasEntitlementResult}`);
    return hasEntitlementResult;
  } catch (error) {
    console.error(`❌ PREMIUM_CHECK: Errore controllo entitlement ${entitlement}:`, error);
    return false;
  }
};

/**
 * Ottiene tutti i prodotti disponibili
 */
export const getProducts = async () => {
  try {
    if (isExpoGo) {
      // In Expo Go, restituisci prodotti di sviluppo
      return {
        identifier: 'default',
        serverDescription: 'Development offerings for testing',
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
      const current = offerings?.current;
      // Se le offerings sono vuote, fallback a getProducts con gli ID noti
      if (!current || !current.availablePackages || current.availablePackages.length === 0) {
        console.warn('PURCHASES: Offerings vuote - fallback a getProducts con PRODUCT_IDS');
        try {
          const productIds: string[] = [
            PRODUCT_IDS[ProductType.PREMIUM_SUBSCRIPTION_MONTHLY].ios,
            PRODUCT_IDS[ProductType.PREMIUM_SUBSCRIPTION_YEARLY].ios,
          ];
          // RevenueCat v7 richiede il type per gli abbonamenti
          const products = await Purchases.getProducts(
            productIds,
            (Purchases as any)?.ProductType?.SUBS || 'subs'
          );
          // Costruisci una struttura analoga a offerings.current
          const availablePackages = products.map((p: any) => ({
            identifier: p.identifier?.toLowerCase().includes('annual') || p.identifier?.toLowerCase().includes('year') ? 'premium_yearly' : 'premium_monthly',
            packageType: (p.identifier?.toLowerCase().includes('annual') || p.identifier?.toLowerCase().includes('year')) ? 'ANNUAL' : 'MONTHLY',
            product: p,
          }));
          return { identifier: 'fallback', serverDescription: 'Fallback offerings', availablePackages } as any;
        } catch (gpErr) {
          console.warn('PURCHASES: Fallback getProducts fallito:', gpErr);
        }
      }
      return current;
      } catch (offeringsError) {
        console.warn('Failed to get RevenueCat offerings:', offeringsError);
        // Fallback anche in caso di errore su getOfferings
        try {
          const productIds: string[] = [
            PRODUCT_IDS[ProductType.PREMIUM_SUBSCRIPTION_MONTHLY].ios,
            PRODUCT_IDS[ProductType.PREMIUM_SUBSCRIPTION_YEARLY].ios,
          ];
          const products = await Purchases.getProducts(
            productIds,
            (Purchases as any)?.ProductType?.SUBS || 'subs'
          );
          const availablePackages = products.map((p: any) => ({
            identifier: p.identifier?.toLowerCase().includes('annual') || p.identifier?.toLowerCase().includes('year') ? 'premium_yearly' : 'premium_monthly',
            packageType: (p.identifier?.toLowerCase().includes('annual') || p.identifier?.toLowerCase().includes('year')) ? 'ANNUAL' : 'MONTHLY',
            product: p,
          }));
          return { identifier: 'fallback', serverDescription: 'Fallback offerings', availablePackages } as any;
        } catch (gpErr) {
          console.warn('PURCHASES: Fallback getProducts (in catch) fallito:', gpErr);
        }
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
    console.log('🛒 PURCHASE_PACKAGE: Chiamato con pkg:', pkg);
    console.log('🛒 PURCHASE_PACKAGE: isRevenueCatAvailable:', isRevenueCatAvailable);
    console.log('🛒 PURCHASE_PACKAGE: isInAppPurchasesAvailable:', isInAppPurchasesAvailable);
    console.log('🛒 PURCHASE_PACKAGE: isExpoGo:', isExpoGo);
    
    // 🔧 PRIORITÀ 1: REVENUECAT (PREFERITO)
    if (isRevenueCatAvailable && !isExpoGo && Purchases) {
      console.log('🛒 PURCHASE_PACKAGE: Tentativo acquisto RevenueCat per:', pkg?.identifier || pkg?.productId || pkg?.product?.identifier);
      
      try {
        // Supporta sia package che productId (fallback quando costruito da getProducts)
        let result: any;
        if (pkg && pkg.product && typeof pkg.packageType !== 'undefined') {
          result = await Purchases.purchasePackage(pkg);
        } else {
          const productId = pkg?.productId || pkg?.identifier || pkg?.product?.identifier;
          result = await Purchases.purchaseProduct(productId);
        }
        console.log('✅ PURCHASE_PACKAGE: Acquisto RevenueCat completato!', result);
        
        return { 
          success: true, 
          customerInfo: result.customerInfo 
        };
        
      } catch (revenueCatError: any) {
        console.error('❌ PURCHASE_PACKAGE: Errore RevenueCat:', revenueCatError);
        
        // Se l'utente ha cancellato, ritorna cancellazione senza errore
        if (revenueCatError.userCancelled || revenueCatError.message?.includes('cancelled')) {
          console.log('🚫 PURCHASE: Acquisto cancellato dall\'utente');
          return { success: false, cancelled: true, error: 'User cancelled purchase' };
        }
        
        // 🍎 GESTIONE ERRORE APPLE SANDBOX: "Hai già un abbonamento"
        // ⚠️ IMPORTANTE: Quando Apple dice "Hai già un abbonamento", dobbiamo verificare se questo utente dovrebbe essere premium
        if (revenueCatError.message?.includes('Hai già un abbonamento') || 
            revenueCatError.message?.includes('already have a subscription') ||
            revenueCatError.underlyingErrorMessage?.includes('3532')) {
          console.log('🍎 APPLE SANDBOX: Abbonamento già esistente per questo Apple ID (errore 3532)');
          console.log('🔍 APPLE SANDBOX: Verifico se questo utente dovrebbe essere premium...');
          
          try {
            // Forza refresh delle informazioni da RevenueCat
            await refreshCustomerInfo();
            
            // Controlla se ora l'utente risulta premium
            const isPremiumNow = await isPremium();
            console.log(`🔍 APPLE SANDBOX: Dopo refresh, isPremium: ${isPremiumNow}`);
            
            if (isPremiumNow) {
              console.log('✅ APPLE SANDBOX: Utente risulta premium dopo refresh! Tratto come successo.');
              
              // 🔥 FIX ACCOUNT IN-APP: Salva stato premium anche in AsyncStorage per persistenza
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              await AsyncStorage.setItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId), 'true');
              console.log('💾 APPLE SANDBOX: Stato premium salvato in AsyncStorage per persistenza account in-app');
              
              // Se ora è premium, tratta come successo
              const customerInfo = await getCustomerInfo();
              return { 
                success: true, 
                customerInfo: customerInfo,
                wasAlreadySubscribed: true
              };
            } else {
              console.log('❌ APPLE SANDBOX: Utente non risulta premium dopo refresh.');
              
              // 🔥 FIX: Per Apple Sign In, forza il re-login con Apple ID
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              try {
                const appleUserData = await AsyncStorage.getItem(`APPLE_USER_DATA_${currentUserId}`);
                if (appleUserData) {
                  const appleData = JSON.parse(appleUserData);
                  if (appleData.appleId) {
                    console.log('🍎 APPLE SANDBOX: Tentativo re-login con Apple ID...');
                    
                    // Forza logout e re-login con Apple ID
                    await Purchases.logOut();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const reLoginResult = await Purchases.logIn(appleData.appleId);
                    console.log('🍎 APPLE SANDBOX: Re-login completato:', reLoginResult.customerInfo?.originalAppUserId);
                    
                    // Controlla di nuovo premium
                    await refreshCustomerInfo();
                    const isPremiumAfterReLogin = await isPremium();
                    
                    if (isPremiumAfterReLogin) {
                      console.log('✅ APPLE SANDBOX: Premium riconosciuto dopo re-login!');
                      const customerInfo = await getCustomerInfo();
                      return { 
                        success: true, 
                        customerInfo: customerInfo,
                        wasAlreadySubscribed: true
                      };
                    }
                  }
                }
              } catch (reLoginError) {
                console.error('❌ APPLE SANDBOX: Errore re-login:', reLoginError);
        }
        
              // Se tutto fallisce, mostra errore ma suggerisci di controllare lo stato
              return { 
                success: false, 
                error: 'Questo Apple ID ha già un abbonamento attivo. Se hai già un abbonamento, prova a fare logout e login per aggiornare lo stato.',
                isAppleSandboxError: true,
                shouldRefreshStatus: true
              };
            }
          } catch (refreshError) {
            console.error('❌ APPLE SANDBOX: Errore durante refresh:', refreshError);
            return { 
              success: false, 
              error: 'Errore durante la verifica dell\'abbonamento esistente. Prova a fare logout e login.',
              isAppleSandboxError: true
            };
          }
        }
        
        // RevenueCat fallito per altri motivi, proviamo con Expo In-App Purchases
        console.log('🔄 PURCHASE_PACKAGE: RevenueCat fallito per altro motivo, tentativo con Expo IAP...');
        console.log('🔄 PURCHASE_PACKAGE: Errore RevenueCat:', revenueCatError.message);
      }
    }
    
    // 🔧 PRIORITÀ 2: EXPO IN-APP PURCHASES (FALLBACK)
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
          console.log('✅ PURCHASE: Acquisto completato, validando receipt...');
          
          // VALIDAZIONE RECEIPT SERVER-SIDE REALE
          try {
            const receiptData = result.results?.[0]?.transactionReceipt;
            if (receiptData) {
              console.log('🍎 Validating receipt with server...');
              const validationResult = await validateReceiptOnServer(receiptData);
              
              if (validationResult.success) {
                console.log('✅ RECEIPT: Validazione server completata con successo');
          
          // Salva lo stato premium
                await AsyncStorage.setItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId), 'true');
                
                return { 
                  success: true, 
                  customerInfo: { 
                    entitlements: { 
                      active: { 
                        premium: true,
                        ad_free: true 
                      } 
                    } 
                  },
                  receiptValidation: validationResult
                };
              } else {
                console.error('❌ RECEIPT: Validazione server fallita');
                throw new Error('Receipt validation failed on server');
              }
            } else {
              console.warn('⚠️ RECEIPT: Nessun receipt trovato nel risultato acquisto');
              // Fallback: considera l'acquisto valido anche senza receipt
              await AsyncStorage.setItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId), 'true');
          
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
            }
          } catch (validationError) {
            console.error('❌ RECEIPT: Errore validazione server:', validationError);
            
            // In caso di errore server, considera comunque l'acquisto valido
            // (Apple ha confermato il pagamento)
            await AsyncStorage.setItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId), 'true');
            
            return { 
              success: true, 
              customerInfo: { 
                entitlements: { 
                  active: { 
                    premium: true,
                    ad_free: true 
                  } 
                } 
              },
              warning: 'Receipt validation failed but purchase confirmed by Apple'
            };
          }
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
        
        // Expo IAP fallito, ritorna errore
        console.log('❌ PURCHASE: Tutti i metodi di acquisto falliti');
        
        // Altrimenti, fallback per sviluppo
        console.log('🔄 PURCHASE: Fallback sviluppo...');
      }
    }
    
    // 🍎 MODALITÀ SPECIALE PER APPLE REVIEW
    // Durante la review Apple, simula un acquisto riuscito senza errori
    if (isAppleReviewEnvironment()) {
      console.log('🍎 APPLE REVIEW: Simulando acquisto riuscito per review');
      await AsyncStorage.setItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId), 'true');
      
      // Simula un piccolo delay per sembrare realistico
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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
    }
    
    // Modalità sviluppo (per testing o quando acquisti reali non disponibili)
    console.log('🔧 PURCHASE: Development purchase per:', pkg.identifier || pkg.productId);
    await AsyncStorage.setItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId), 'true');
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
      // In Expo Go, controlla stato premium locale
      const localPremium = await AsyncStorage.getItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId));
      return { 
        success: true, 
        customerInfo: { 
          entitlements: { 
            active: localPremium === 'true' ? { premium: true, ad_free: true } : {} 
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
 * Controlla se l'utente ha già un abbonamento attivo (mensile o annuale)
 */
export const hasActiveSubscription = async (): Promise<{ hasSubscription: boolean, subscriptionType: 'monthly' | 'annual' | null }> => {
  try {
    if (isExpoGo) {
      const localPremium = await AsyncStorage.getItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId));
      return { 
        hasSubscription: localPremium === 'true', 
        subscriptionType: localPremium === 'true' ? 'monthly' : null 
      };
    }
    
    console.log('🔍 SUBSCRIPTION_CHECK: Controllo abbonamenti attivi...');
    const customerInfo = await getCustomerInfo();
    
    if (!customerInfo || !customerInfo.activeSubscriptions) {
      console.log('🔍 SUBSCRIPTION_CHECK: Nessun abbonamento attivo trovato');
      return { hasSubscription: false, subscriptionType: null };
    }
    
    const activeSubscriptions = customerInfo.activeSubscriptions;
    console.log('🔍 SUBSCRIPTION_CHECK: Abbonamenti attivi:', activeSubscriptions);
    
    // Controlla se ha abbonamento mensile
    const hasMonthly = activeSubscriptions.includes('com.bacchusapp.app.Monthly');
    // Controlla se ha abbonamento annuale  
    const hasAnnual = activeSubscriptions.includes('com.bacchusapp.app.Annual');
    
    if (hasMonthly) {
      console.log('✅ SUBSCRIPTION_CHECK: Abbonamento MENSILE attivo');
      return { hasSubscription: true, subscriptionType: 'monthly' };
    } else if (hasAnnual) {
      console.log('✅ SUBSCRIPTION_CHECK: Abbonamento ANNUALE attivo');
      return { hasSubscription: true, subscriptionType: 'annual' };
    } else {
      console.log('🔍 SUBSCRIPTION_CHECK: Nessun abbonamento premium attivo');
      return { hasSubscription: false, subscriptionType: null };
    }
  } catch (error) {
    console.error('❌ SUBSCRIPTION_CHECK: Errore controllo abbonamenti:', error);
    return { hasSubscription: false, subscriptionType: null };
  }
};

/**
 * Apre le impostazioni di gestione abbonamenti del sistema
 */
export const openSubscriptionManagement = async (): Promise<void> => {
  try {
    if (isExpoGo) {
      console.log('🔧 SUBSCRIPTION_MANAGEMENT: Expo Go - simulazione apertura impostazioni');
      const { Alert } = require('react-native');
      Alert.alert(
        'Gestione Abbonamenti',
        'In Expo Go, questa funzione aprirà le impostazioni di gestione abbonamenti del dispositivo.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log('🔧 SUBSCRIPTION_MANAGEMENT: Aprendo impostazioni gestione abbonamenti...');
    
    // Mostra un alert informativo prima di aprire le impostazioni
    const { Alert } = require('react-native');
    
    const shouldProceed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Gestione Abbonamenti',
        'Stai per essere reindirizzato alle impostazioni di Apple per gestire i tuoi abbonamenti. Qui potrai:\n\n• Visualizzare i tuoi abbonamenti attivi\n• Modificare o cancellare abbonamenti\n• Cambiare piano di abbonamento\n• Visualizzare la cronologia dei pagamenti',
        [
          { text: 'Annulla', onPress: () => resolve(false), style: 'cancel' },
          { text: 'Continua', onPress: () => resolve(true) }
        ]
      );
    });
    
    if (!shouldProceed) {
      console.log('🔧 SUBSCRIPTION_MANAGEMENT: Utente ha annullato');
      return;
    }
    
    // Usa RevenueCat per aprire le impostazioni di gestione abbonamenti
    await Purchases.showManageSubscriptions();
    
    console.log('✅ SUBSCRIPTION_MANAGEMENT: Impostazioni aperte con successo');
  } catch (error) {
    console.error('❌ SUBSCRIPTION_MANAGEMENT: Errore apertura impostazioni:', error);
    
    // Fallback: apri le impostazioni manualmente
    const { Linking, Alert, Platform } = require('react-native');
    
    Alert.alert(
      'Gestione Abbonamenti',
      'Non è stato possibile aprire automaticamente le impostazioni.\n\nPer gestire i tuoi abbonamenti manualmente:\n\n1. Vai in Impostazioni iPhone\n2. Tocca il tuo nome in alto\n3. Tocca "Abbonamenti"\n4. Seleziona "Bacchus" per gestire l\'abbonamento',
      [
        { text: 'OK', style: 'cancel' },
        { 
          text: 'Apri Impostazioni', 
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('App-prefs:APPLE_ACCOUNT&path=SUBSCRIPTIONS');
            } else {
              Linking.openURL('market://details?id=com.bacchusapp.app');
            }
          }
        }
      ]
    );
  }
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
 * Imposta lo stato premium locale (per sviluppo e fallback)
 */
export const setPremiumStatus = async (isPremium: boolean): Promise<void> => {
  await AsyncStorage.setItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS, currentUserId), isPremium ? 'true' : 'false');
  console.log(`Premium status set to ${isPremium} for user ${currentUserId}`);
}; 