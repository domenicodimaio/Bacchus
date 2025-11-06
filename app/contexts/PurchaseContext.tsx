import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import * as purchaseService from '../lib/services/purchase.service';
import { PremiumFeatures, PurchaseState, FREE_LIMITS } from '../types/purchases';

// 🚨 DEBUG ESTREMO: Questo log DEVE apparire sempre
console.log('🚨🚨🚨 PURCHASE_CONTEXT.TSX CARICATO! 🚨🚨🚨');

// Chiavi specifiche dello storage
const STORAGE_KEYS = {
  SIMULATE_PREMIUM: 'SIMULATE_PREMIUM',
  PREMIUM_STATUS: 'PREMIUM_STATUS',
  CURRENT_PATH: 'CURRENT_PATH'
};

// Contesto degli acquisti
interface PurchaseContextType {
  isInitialized: boolean;
  isLoading: boolean;
  isPremium: boolean;
  isAdFree: boolean;
  products: any[];
  subscriptions: any[];
  remainingFreeSessions: number;
  isSubscriptionModalVisible: boolean;
  
  // Funzioni
  initializePurchases: (force?: boolean) => Promise<boolean>;
  getPremiumFeatures: () => PremiumFeatures;
  purchaseSubscription: (plan: 'monthly' | 'annual') => Promise<boolean>;
  purchaseRemoveAds: () => Promise<any>;
  restorePurchases: () => Promise<boolean>;
  checkCanCreateSession: () => Promise<boolean>;
  incrementSessionCounter: () => Promise<number>;
  showUpgradePrompt: (reason?: string, source?: string) => void;
  showSubscriptionScreen: () => void;
  hideSubscriptionScreen: () => void;
  updateCurrentPath: (path: string) => void;
  toggleSimulatePremium: (value: boolean) => Promise<boolean>;
  
  // Testing functions (only available in development)
  enablePremiumTest?: () => Promise<boolean>;
  disablePremiumTest?: () => Promise<boolean>;
}

// Valore di default del contesto
const defaultContext: PurchaseContextType = {
  isInitialized: false,
  isLoading: true,
  isPremium: false,
  isAdFree: false,
  products: [],
  subscriptions: [],
  remainingFreeSessions: FREE_LIMITS.SESSIONS_PER_WEEK,
  isSubscriptionModalVisible: false,
  
  // Funzioni (implementate come no-op inizialmente)
  initializePurchases: async () => false,
  getPremiumFeatures: () => ({
    canUseWidgets: false,
    canUseLiveActivities: false,
    canCreateUnlimitedSessions: false,
    sessionLimit: FREE_LIMITS.SESSIONS_PER_WEEK,
    remainingSessions: 0,
    canExportData: false,
    hasDetailedStatistics: false,
    hasPersonalizedMetabolism: false,
    canRemoveAds: false,
  }),
  purchaseSubscription: async () => false,
  purchaseRemoveAds: async () => ({}),
  restorePurchases: async () => false,
  checkCanCreateSession: async () => true,
  incrementSessionCounter: async () => 0,
  showUpgradePrompt: () => {},
  showSubscriptionScreen: () => {},
  hideSubscriptionScreen: () => {},
  updateCurrentPath: () => {},
  toggleSimulatePremium: async () => false,
};

// Creazione del contesto
const PurchaseContext = createContext<PurchaseContextType>(defaultContext);

// Hook personalizzato per utilizzare il contesto
export const usePurchase = () => useContext(PurchaseContext);

// Provider del contesto
export const PurchaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation(['purchases', 'common']);
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscriptionModalVisible, setIsSubscriptionModalVisible] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>('/');
  
  // Stato principale
  const [state, setState] = useState<PurchaseState>({
    isLoading: true,
    isPremium: false,
    isAdFree: false,
    products: [],
    subscriptions: [],
    currentOffering: null,
    customerInfo: null,
    activeSessions: 0,
    remainingFreeSessions: FREE_LIMITS.SESSIONS_PER_WEEK,
  });
  
  // Versione sicura per settare lo stato
  const safeSetState = (newState: Partial<PurchaseState>) => {
    setState(prevState => ({
      ...prevState,
      ...newState
    }));
  };
  
  // 🔧 FIX MULTI-ACCOUNT: Helper per chiavi specifiche per utente
  const getUserSpecificKey = (baseKey: string): string => {
    if (!user?.id) {
      console.warn(`⚠️ PurchaseContext: userId mancante per ${baseKey}, usando chiave globale`);
      return baseKey;
    }
    return `${baseKey}_${user.id}`;
  };
  
  // 🔥 FIX PREMIUM: Inizializza automaticamente all'avvio
  useEffect(() => {
    console.log('🔥 PURCHASE_CONTEXT: Inizializzazione automatica all\'avvio...');
    initializePurchases();
  }, [user]); // Dipende da user per reinizializzare quando cambia utente
  
  // Inizializza il servizio acquisti
  const initializePurchases = async (force: boolean = false) => {
    console.log('🚨 PURCHASE_CONTEXT: initializePurchases chiamato!');
    console.log('🚨 PURCHASE_CONTEXT: isInitialized:', isInitialized, 'force:', force);
    
    try {
      if (isInitialized && !force) {
        console.log('🚨 PURCHASE_CONTEXT: Già inizializzato, esco');
        return true;
      }
      
      // 🔥 FIX PERSISTENZA: SEMPRE inizializza e controlla RevenueCat per abbonamenti attivi
      console.log('🎯 INIT: Inizializzazione servizio acquisti...');
      const success = await purchaseService.initPurchases();
      
      // 🔥 FIX PERSISTENZA: SEMPRE controlla RevenueCat per stato premium reale
      let isPremium = await purchaseService.isPremium();
      let isAdFree = await purchaseService.isAdFree();
      
      console.log('🎯 INIT: Stato da RevenueCat - isPremium:', isPremium, 'isAdFree:', isAdFree);
      
      // 🔥 FIX BUG 2: Controlla SIMULATE_PREMIUM solo se non premium da RevenueCat
      let simulatePremium = 'false';
      if (!isPremium) {
        simulatePremium = await AsyncStorage.getItem(getUserSpecificKey(STORAGE_KEYS.SIMULATE_PREMIUM)) || 'false';
        console.log('🎯 INIT: Controllo SIMULATE_PREMIUM:', simulatePremium);
        
        if (simulatePremium === 'true') {
          console.log('🎯 INIT: Modalità simulazione premium attiva');
          isPremium = true;
          isAdFree = true;
        }
      } else {
        console.log('🎯 INIT: Abbonamento attivo trovato su RevenueCat');
      }
      
      // Ottenere prodotti potrebbe fallire, iniziamo con lista vuota
      let products = [];
      let subscriptions = [];
      
      try {
        // Carica i prodotti (operazione che potrebbe fallire)
        console.log('🎯 INIT: Caricamento prodotti e subscriptions...');
        const offerings = await purchaseService.getProducts();
        console.log('🎯 INIT: Offerings ricevute:', offerings ? 'OK' : 'NULL');
        
        if (offerings) {
          products = offerings.availablePackages || [];
          subscriptions = (offerings.availablePackages || []).filter((p: any) => {
            const pkgType = p.packageType?.toUpperCase();
            return pkgType !== 'LIFETIME';
          });
          
          console.log('🎯 INIT: Products trovati:', products.length);
          console.log('🎯 INIT: Subscriptions trovati:', subscriptions.length);
          console.log('🎯 INIT: Package types:', subscriptions.map((s: any) => ({
            identifier: s.identifier,
            packageType: s.packageType,
            productId: s.product?.identifier
          })));
        } else {
          console.warn('🎯 INIT: Offerings è NULL - nessun prodotto disponibile');
        }
      } catch (productsError) {
        console.error('🎯 INIT: Failed to load products:', productsError);
      }
      
      // Ottieni il conteggio sessioni rimaste
      const remainingSessions = await purchaseService.getRemainingSessionsCount();
      
      // 🔧 FIX: Se l'utente è premium, sessioni infinite (-1), altrimenti usa il valore reale
      const finalRemainingSessions = isPremium ? -1 : Math.max(0, remainingSessions);
      
      console.log(`🎯 PURCHASE_CONTEXT INIT: isPremium=${isPremium}, isAdFree=${isAdFree}, remainingSessions=${remainingSessions}, final=${finalRemainingSessions}, simulatePremium=${simulatePremium}`);
      
      // Aggiorna lo stato
      safeSetState({
        isLoading: false,
        isPremium,
        isAdFree,
        products: products,
        subscriptions: subscriptions,
        remainingFreeSessions: finalRemainingSessions,
      });
      
      setIsInitialized(true);
      return true;
    } catch (error) {
      console.error('Failed to initialize purchases in context:', error);
      
      // In caso di errore, impostiamo comunque lo stato come inizializzato
      // per non bloccare l'app
      safeSetState({ 
        isLoading: false,
        isPremium: false,
        isAdFree: false 
      });
      setIsInitialized(true);
      return true; // Ritorniamo true anche in caso di errore
    }
  };
  
  // Effetto per inizializzare gli acquisti
  useEffect(() => {
    if (!isInitialized) {
      initializePurchases().catch(error => {
        console.error('Error in purchase initialization effect:', error);
        setIsInitialized(true); // Forza l'inizializzazione anche in caso di errore
      });
    }
  }, [isInitialized]);
  
  // Effetto per aggiornare l'utente quando cambia
  useEffect(() => {
    if (isInitialized && user?.id) {
      console.log(`🎯 USER CHANGED: Updating purchases for user ${user.id}`);
      
      // 🔧 FIX: Ricarica anche il counter sessioni quando cambia utente
      const reloadSessionCounter = async () => {
        try {
          // 🔥 FIX CRITICO: ASPETTA che setUserForPurchases finisca PRIMA di controllare premium
          console.log('🎯 USER CHANGED: Impostando utente per RevenueCat...');
          await purchaseService.setUserForPurchases(user.id);
          console.log('🎯 USER CHANGED: RevenueCat sincronizzato, ora controllo premium...');
          
          // 🔥 FIX PERSISTENZA: SEMPRE controlla RevenueCat per abbonamenti attivi
          console.log('🎯 USER CHANGED: Controllo stato premium da RevenueCat...');
          let isPremium = await purchaseService.isPremium();
          
          // 🔥 FIX BUG 2: Controlla SIMULATE_PREMIUM solo se non premium da RevenueCat
          let simulatePremium = 'false';
          if (!isPremium) {
            simulatePremium = await AsyncStorage.getItem(getUserSpecificKey(STORAGE_KEYS.SIMULATE_PREMIUM)) || 'false';
            if (simulatePremium === 'true') {
              console.log('🎯 USER CHANGED: Modalità simulazione premium attiva');
              isPremium = true;
            }
          } else {
            console.log('🎯 USER CHANGED: Abbonamento attivo trovato su RevenueCat');
          }
          
          const remainingSessions = await purchaseService.getRemainingSessionsCount();
          const finalRemainingSessions = isPremium ? -1 : Math.max(0, remainingSessions);
          
          console.log(`🎯 USER CHANGED RELOAD: isPremium=${isPremium}, remainingSessions=${remainingSessions}, final=${finalRemainingSessions}, simulatePremium=${simulatePremium}`);
          
          safeSetState({ 
            isPremium,
            isAdFree: isPremium, // Se premium simulato, anche ad-free
            remainingFreeSessions: finalRemainingSessions 
          });
        } catch (error) {
          console.error('Error reloading session counter for user change:', error);
        }
      };
      
      reloadSessionCounter();
    } else if (isInitialized && !user) {
      // 🔥 FIX: Reset stato quando utente fa logout
      console.log('🎯 USER LOGOUT: Resetting purchase state');
      safeSetState({
        isPremium: false,
        isAdFree: false,
        customerInfo: null,
        remainingFreeSessions: FREE_LIMITS.SESSIONS_PER_WEEK
      });
    }
  }, [user?.id, isInitialized]);
  
  // Restituisce le funzionalità premium disponibili
  const getPremiumFeatures = (): PremiumFeatures => {
    try {
      return {
        canUseWidgets: state.isPremium,
        canUseLiveActivities: state.isPremium,
        canCreateUnlimitedSessions: state.isPremium,
        sessionLimit: state.isPremium ? Infinity : FREE_LIMITS.SESSIONS_PER_WEEK,
        remainingSessions: state.remainingFreeSessions,
        canExportData: state.isPremium,
        hasDetailedStatistics: state.isPremium,
        hasPersonalizedMetabolism: state.isPremium,
        canRemoveAds: state.isPremium || state.isAdFree,
      };
    } catch (error) {
      console.error('Error getting premium features:', error);
      // Valore sicuro di default
      return {
        canUseWidgets: false,
        canUseLiveActivities: false,
        canCreateUnlimitedSessions: false,
        sessionLimit: FREE_LIMITS.SESSIONS_PER_WEEK,
        remainingSessions: state.remainingFreeSessions,
        canExportData: false,
        hasDetailedStatistics: false,
        hasPersonalizedMetabolism: false,
        canRemoveAds: false,
      };
    }
  };

  // Verifica se è possibile creare una nuova sessione
  const checkCanCreateSession = async (): Promise<boolean> => {
    try {
      // Se l'utente è premium, può creare sessioni illimitate
      if (state.isPremium) return true;
      
      // Altrimenti, controlla il contatore delle sessioni
      const canCreate = await purchaseService.canCreateNewSession();
      
      // Se l'utente non può creare una nuova sessione, mostra il prompt
      if (!canCreate) {
        showUpgradePrompt('session_limit');
      }
      
      return canCreate;
    } catch (error) {
      console.error('Error checking if can create session:', error);
      return true; // In caso di errore, consentiamo la creazione per non bloccare l'utente
    }
  };
  
  // Incrementa il contatore delle sessioni
  const incrementSessionCounter = async (): Promise<number> => {
    try {
      // Se l'utente è premium, non conta le sessioni
      if (state.isPremium) {
        console.log(`🎯 SESSION COUNTER: Utente premium - sessioni illimitate`);
        return -1; // -1 = infinite per premium
      }
      
      // 🔧 FIX: Incrementa il contatore (restituisce sessioni USATE)
      await purchaseService.incrementSessionCount();
      
      // 🔧 FIX: Ottieni le sessioni RIMANENTI separatamente
      const remaining = await purchaseService.getRemainingSessionsCount();
      
      // Aggiorna lo stato con le sessioni rimanenti corrette
      safeSetState({ remainingFreeSessions: Math.max(0, remaining) });
      
      console.log(`🎯 SESSION COUNTER: Sessioni rimanenti: ${remaining}`);
      
      return Math.max(0, remaining);
    } catch (error) {
      console.error('Error incrementing session counter:', error);
      return state.remainingFreeSessions; // In caso di errore, mantieni il conteggio attuale
    }
  };
  
  // Funzioni di UI per mostrare/nascondere la finestra di abbonamento
  const showSubscriptionScreen = () => {
    try {
      console.log('PURCHASE_CONTEXT: Showing subscription screen');
      
      // Aggiorna la variabile modale per compatibilità
      setIsSubscriptionModalVisible(true);
      
      // Naviga alla schermata subscription-offer in modo sicuro
      router.push({
        pathname: '/onboarding/subscription-offer',
        params: {
          source: 'purchase_context',
          ts: Date.now().toString()
        }
      } as any);
      
    } catch (error) {
      console.error('PURCHASE_CONTEXT: Error showing subscription screen:', error);
      
      // Fallback: almeno mostra l'alert di upgrade
      Alert.alert(
        t('premiumRequired', { ns: 'purchases', defaultValue: 'Premium Richiesto' }),
        t('upgradeMessage', { ns: 'purchases', defaultValue: 'Per accedere a questa funzionalità è necessario un abbonamento premium.' }),
        [
          { text: t('notNow', { ns: 'common', defaultValue: 'Non ora' }), style: 'cancel' },
          { text: t('viewPlans', { ns: 'purchases', defaultValue: 'Vedi piani' }), onPress: () => {
            // Ultimo tentativo di navigazione diretta
            try {
              router.replace('/onboarding/subscription-offer');
            } catch (navError) {
              console.error('PURCHASE_CONTEXT: Final navigation attempt failed:', navError);
            }
          }}
        ]
      );
    }
  };
  
  const hideSubscriptionScreen = () => {
    setIsSubscriptionModalVisible(false);
  };
  
  // Acquista un abbonamento
  const purchaseSubscription = async (plan: 'monthly' | 'annual'): Promise<boolean> => {
    try {
      console.log('PURCHASE: Inizio acquisto abbonamento:', plan);
      
      if (state.isLoading) {
        console.log('PURCHASE: Acquisto già in corso, ignoro richiesta');
        return false;
      }
      
      // Imposta lo stato di caricamento
      safeSetState({ isLoading: true });
      
      // 🔧 NORMALIZZAZIONE: 'monthly'/'annual' → 'MONTHLY'/'ANNUAL' (RevenueCat usa ANNUAL)
      const normalizedPlan = plan.toLowerCase() === 'monthly' ? 'MONTHLY' : 'ANNUAL';
      
      // Trova l'abbonamento corrispondente (case-insensitive), con più strategie
      let sub = state.subscriptions.find((p: any) => {
        const pkgType = typeof p.packageType === 'string' ? p.packageType.toUpperCase() : String(p.packageType).toUpperCase();
        return pkgType === normalizedPlan || pkgType === plan.toUpperCase() ||
               (normalizedPlan === 'ANNUAL' && (pkgType === 'YEARLY' || pkgType.includes('ANNU')) ||
                normalizedPlan === 'MONTHLY' && pkgType.includes('MONTH'));
      });
      
      // Fallback 1: match per identifier del package o del product
      if (!sub) {
        sub = state.subscriptions.find((p: any) => {
          const id = (p.identifier || '').toLowerCase();
          const pid = (p.product?.identifier || '').toLowerCase();
          return normalizedPlan === 'MONTHLY'
            ? id.includes('month') || pid.includes('month')
            : id.includes('year') || id.includes('annual') || pid.includes('year') || pid.includes('annual');
        });
      }
      
      // Fallback 2: se non abbiamo nulla in memoria, prova a ricaricare le offerings live
      if (!sub) {
        try {
          console.warn('PURCHASE: Nessun package trovato in cache. Riprovo a caricare offerings live...');
          const liveOfferings = await purchaseService.getProducts();
          const liveSubs = (liveOfferings?.availablePackages || []).filter((p: any) => {
            const pkgType = (p.packageType || '').toString().toUpperCase();
            return pkgType !== 'LIFETIME';
          });
          console.log('PURCHASE: Live subscriptions:', liveSubs.map((s: any) => ({
            identifier: s.identifier,
            packageType: s.packageType,
            productId: s.product?.identifier
          })));
          sub = liveSubs.find((p: any) => {
            const pkgType = (p.packageType || '').toString().toUpperCase();
            const id = (p.identifier || '').toLowerCase();
            const pid = (p.product?.identifier || '').toLowerCase();
            if (pkgType === normalizedPlan) return true;
            if (normalizedPlan === 'MONTHLY') return pkgType.includes('MONTH') || id.includes('month') || pid.includes('month');
            return pkgType.includes('ANNU') || pkgType.includes('YEAR') || id.includes('annual') || id.includes('year') || pid.includes('annual') || pid.includes('year');
          });
        } catch (reloadErr) {
          console.warn('PURCHASE: Errore durante reload offerings:', reloadErr);
        }
      }
      
      if (!sub) {
        console.error('PURCHASE: Piano abbonamento non trovato:', plan, '(normalizzato:', normalizedPlan + ')');
        console.log('PURCHASE: Abbonamenti disponibili (cache):', state.subscriptions.map((s: any) => ({
          identifier: s.identifier,
          packageType: s.packageType,
          productId: s.product?.identifier
        })));
        console.log('PURCHASE: Stato subscriptions completo:', JSON.stringify(state.subscriptions, null, 2));
        
        Alert.alert(
          t('error', { ns: 'common', defaultValue: 'Errore' }),
          t('subscriptionNotFound', { ns: 'purchases', defaultValue: 'Piano di abbonamento non trovato. Riprova più tardi.' })
        );
        
        safeSetState({ isLoading: false });
        return false;
      }
      
      console.log('PURCHASE: Piano trovato:', sub.identifier);
      
      // Effettua l'acquisto
      const result = await purchaseService.purchasePackage(sub);
      console.log('PURCHASE: Risultato acquisto:', result);
      
      if (result.success) {
        console.log('PURCHASE: Acquisto completato con successo');
        
        // Aggiorna lo stato
        safeSetState({
          isPremium: true,
          isAdFree: true,
          customerInfo: result.customerInfo,
          isLoading: false
        });
        
        // Salva lo stato premium
        await AsyncStorage.setItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS), 'true');
        
        // 🔧 FIX: Messaggio specifico per sandbox restore
        if (result.isAppleSandboxRestore) {
          console.log('🍎 SANDBOX: Abbonamento già attivo riconosciuto');
        }
        
        return true;
      } else {
        console.error('PURCHASE: Acquisto fallito:', result.error);
        
        // Se l'utente ha cancellato, non mostrare errore
        if (result.cancelled || (result.error && (result.error.includes('cancelled') || result.error.includes('canceled')))) {
          console.log('🚫 PURCHASE: Acquisto cancellato dall\'utente, nessun errore mostrato');
          safeSetState({ isLoading: false });
          return false;
        }
        
        // Gestisci altri errori
        let errorMessage = t('purchaseError', { ns: 'purchases', defaultValue: 'Errore durante l\'acquisto. Riprova.' });
        
        if (result.error) {
          if (result.isAppleSandboxError) {
            // Errore specifico Apple Sandbox - messaggio più chiaro
            errorMessage = 'Apple Sandbox: Hai già un abbonamento attivo su questo Apple ID.\n\n💡 Per testare con un altro account:\n1. Vai in Impostazioni iPhone\n2. App Store > Account Sandbox\n3. Esci e accedi con un altro account di test';
          } else if (result.error.includes('network') || result.error.includes('connection')) {
            errorMessage = t('networkError', { ns: 'common', defaultValue: 'Errore di connessione. Verifica la tua connessione internet.' });
          } else if (result.error.includes('payment')) {
            errorMessage = t('paymentError', { ns: 'purchases', defaultValue: 'Errore nel pagamento. Verifica il tuo metodo di pagamento.' });
          }
        }
        
        Alert.alert(
          t('error', { ns: 'common', defaultValue: 'Errore' }),
          errorMessage
        );
        
        safeSetState({ isLoading: false });
        return false;
      }
    } catch (error: any) {
      console.error('PURCHASE: Eccezione durante l\'acquisto:', error);
      
      // Gestisci l'errore
      let errorMessage = t('purchaseError', { ns: 'purchases', defaultValue: 'Errore durante l\'acquisto. Riprova.' });
      
      if (error.message) {
        if (error.message.includes('cancelled') || error.message.includes('canceled')) {
          errorMessage = t('purchaseCancelled', { ns: 'purchases', defaultValue: 'Acquisto annullato.' });
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = t('networkError', { ns: 'common', defaultValue: 'Errore di connessione. Verifica la tua connessione internet.' });
        }
      }
      
      // Mostra l'errore all'utente solo se non è un annullamento
      if (!error.message?.includes('cancelled') && !error.message?.includes('canceled')) {
        Alert.alert(
          t('error', { ns: 'common', defaultValue: 'Errore' }),
          errorMessage
        );
      }
      
      safeSetState({ isLoading: false });
      return false;
    }
  };
  
  // Acquista la rimozione delle pubblicità
  const purchaseRemoveAds = async () => {
    try {
      if (state.isLoading) return { success: false, error: 'Still loading products' };
      
      // Trova il prodotto per la rimozione delle pubblicità
      const removeAdsPackage = state.products.find((p: any) => p.packageType === 'LIFETIME');
      
      if (!removeAdsPackage) {
        return { success: false, error: 'No remove ads package found' };
      }
      
      const result = await purchaseService.purchasePackage(removeAdsPackage);
      
      if (result.success) {
        // Aggiorna lo stato
        safeSetState({
          isAdFree: true,
          customerInfo: result.customerInfo,
        });
      }
      
      return result;
    } catch (error) {
      console.error('Failed to purchase remove ads:', error);
      return { success: false, error };
    }
  };
  
  // Ripristina gli acquisti
  const restorePurchases = async (): Promise<boolean> => {
    try {
      const result = await purchaseService.restorePurchases();
      
      if (result.success) {
        const isPremium = await purchaseService.isPremium();
        const isAdFree = await purchaseService.isAdFree();
        
        // Aggiorna lo stato
        safeSetState({
          isPremium,
          isAdFree,
          customerInfo: result.customerInfo,
        });
        
        await AsyncStorage.setItem(getUserSpecificKey(STORAGE_KEYS.PREMIUM_STATUS), isPremium ? 'true' : 'false');
        
        // Mostra messaggio di successo
        try {
          Alert.alert(t('success', { ns: 'common' }), t('purchaseRestored'));
        } catch (alertError) {
          console.error('Error showing alert:', alertError);
        }
        
        return true;
      }
      
      return result.success;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      
      // Mostra l'errore all'utente
      try {
        Alert.alert(t('error', { ns: 'common' }), t('restoreError'));
      } catch (alertError) {
        console.error('Error showing alert:', alertError);
      }
      
      return false;
    }
  };
  
  // Mostra il prompt di upgrade
  const showUpgradePrompt = (reason?: string, source?: string) => {
    try {
      let message = t('upgradeBenefits', { ns: 'purchases', defaultValue: 'Aggiorna a Premium per funzionalità avanzate!' });
      
      if (reason === 'session_limit') {
        message = t('sessionLimitReached', { ns: 'purchases', defaultValue: 'Hai raggiunto il limite di sessioni gratuite per questa settimana. Aggiorna a Premium per sessioni illimitate!' });
      } else if (reason === 'export') {
        message = t('exportPremiumFeature', { ns: 'purchases', defaultValue: 'L\'esportazione dati è una funzionalità Premium. Aggiorna per accedere!' });
      } else if (reason === 'stats') {
        message = t('statsPremiumFeature', { ns: 'purchases', defaultValue: 'Le statistiche avanzate sono una funzionalità Premium. Aggiorna per accedere!' });
      }
      
      // Mostra l'alert
      Alert.alert(
        t('upgradeTitle', { ns: 'purchases', defaultValue: 'Aggiorna a Premium' }),
        message,
        [
          {
            text: t('notNow', { ns: 'common', defaultValue: 'Non ora' }),
            style: 'cancel'
          },
          {
            text: t('learnMore', { ns: 'purchases', defaultValue: 'Scopri Premium' }),
            onPress: () => {
              // Mostra la finestra di abbonamento
              showSubscriptionScreen();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error showing upgrade prompt:', error);
    }
  };
  
  // Funzione per attivare/disattivare la modalità premium simulata (per testing)
  const toggleSimulatePremium = async (value: boolean): Promise<boolean> => {
    try {
      console.log('🎯 TOGGLE_SIMULATE_PREMIUM: Valore ricevuto:', value);
      
      // Salva il valore
      await AsyncStorage.setItem(getUserSpecificKey(STORAGE_KEYS.SIMULATE_PREMIUM), value ? 'true' : 'false');
      console.log('🎯 TOGGLE_SIMULATE_PREMIUM: Salvato in AsyncStorage');
      
      // Imposta anche lo stato premium nel servizio
      await purchaseService.setPremiumStatus(value);
      console.log('🎯 TOGGLE_SIMULATE_PREMIUM: Aggiornato purchase service');
      
      // 🔧 FIX CRITICO: Ricalcola sessioni rimanenti in base al nuovo stato premium
      let newRemainingSessions;
      if (value) {
        // Se premium, sessioni illimitate
        newRemainingSessions = -1;
        console.log('🎯 TOGGLE_SIMULATE_PREMIUM: Premium attivato - sessioni illimitate');
      } else {
        // Se free, ricarica il conteggio dal database/storage
        try {
          newRemainingSessions = await purchaseService.getRemainingSessionsCount();
          console.log('🎯 TOGGLE_SIMULATE_PREMIUM: Free mode - sessioni rimanenti:', newRemainingSessions);
        } catch (error) {
          console.error('🎯 TOGGLE_SIMULATE_PREMIUM: Errore nel recupero sessioni:', error);
          newRemainingSessions = FREE_LIMITS.SESSIONS_PER_WEEK;
        }
      }
      
      // Aggiorna lo stato con tutti i valori necessari
      safeSetState({
        isPremium: value,
        isAdFree: value,
        remainingFreeSessions: newRemainingSessions
      });
      
      console.log('🎯 TOGGLE_SIMULATE_PREMIUM: Stato aggiornato - premium:', value, 'remaining:', newRemainingSessions);
      return true;
    } catch (error) {
      console.error('🎯 TOGGLE_SIMULATE_PREMIUM: ❌ Errore:', error);
      return false;
    }
  };
  
  // Aggiorna il percorso corrente
  const updateCurrentPath = (path: string) => {
    setCurrentPath(path);
    AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PATH, path).catch(error => {
      console.error('Error saving current path:', error);
    });
  };

  // Testing function - enable premium simulation for development
  const enablePremiumTest = async () => {
    if (__DEV__) {
      console.log('[PURCHASE_TEST] Enabling premium simulation for testing...');
      await AsyncStorage.setItem(getUserSpecificKey(STORAGE_KEYS.SIMULATE_PREMIUM), 'true');
      
      // Update state immediately
      safeSetState({
        isPremium: true,
        isAdFree: true,
        remainingFreeSessions: -1, // -1 means unlimited
      });
      
      console.log('[PURCHASE_TEST] ✅ Premium simulation enabled');
      return true;
    }
    return false;
  };
  
  // Testing function - disable premium simulation
  const disablePremiumTest = async () => {
    if (__DEV__) {
      console.log('[PURCHASE_TEST] Disabling premium simulation...');
      await AsyncStorage.removeItem(getUserSpecificKey(STORAGE_KEYS.SIMULATE_PREMIUM));
      
      // Update state to free version
      safeSetState({
        isPremium: false,
        isAdFree: false,
        remainingFreeSessions: FREE_LIMITS.SESSIONS_PER_WEEK,
      });
      
      console.log('[PURCHASE_TEST] ✅ Premium simulation disabled');
      return true;
    }
    return false;
  };

  return (
    <PurchaseContext.Provider
      value={{
        isInitialized,
        isLoading: state.isLoading,
        isPremium: state.isPremium,
        isAdFree: state.isAdFree,
        products: state.products,
        subscriptions: state.subscriptions,
        remainingFreeSessions: state.remainingFreeSessions,
        isSubscriptionModalVisible,
        
        initializePurchases,
        getPremiumFeatures,
        purchaseSubscription,
        purchaseRemoveAds,
        restorePurchases,
        checkCanCreateSession,
        incrementSessionCounter,
        showUpgradePrompt,
        showSubscriptionScreen,
        hideSubscriptionScreen,
        updateCurrentPath,
        toggleSimulatePremium,
        
        // Testing functions (only available in development)
        enablePremiumTest,
        disablePremiumTest,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
};

export default PurchaseProvider; 