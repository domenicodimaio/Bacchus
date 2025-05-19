import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import * as purchaseService from '../lib/services/purchase.service';
import { PremiumFeatures, PurchaseState, FREE_LIMITS } from '../types/purchases';

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
  initializePurchases: () => Promise<boolean>;
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
  
  // Inizializza il servizio acquisti
  const initializePurchases = async () => {
    console.log('Initializing purchases...');
    
    try {
      if (isInitialized) return true;
      
      // Check if premium simulation is enabled
      const simulatePremium = await AsyncStorage.getItem(STORAGE_KEYS.SIMULATE_PREMIUM);
      if (simulatePremium === 'true') {
        console.log('SIMULATION: Premium mode enabled');
        safeSetState({
          isPremium: true,
          isAdFree: true,
          isLoading: false
        });
        setIsInitialized(true);
        return true;
      }
      
      // Inizializza il servizio acquisti
      const success = await purchaseService.initPurchases();
      
      // Anche se l'inizializzazione fallisce, continuiamo per non bloccare l'app
      // Ottieni stato premium e ad-free
      const isPremium = await purchaseService.isPremium();
      const isAdFree = await purchaseService.isAdFree();
      
      // Ottenere prodotti potrebbe fallire, iniziamo con lista vuota
      let products = [];
      let subscriptions = [];
      
      try {
        // Carica i prodotti (operazione che potrebbe fallire)
        const offerings = await purchaseService.getProducts();
        if (offerings) {
          products = offerings.availablePackages || [];
          subscriptions = offerings.availablePackages.filter((p: any) => p.packageType !== 'LIFETIME') || [];
        }
      } catch (productsError) {
        console.error('Failed to load products:', productsError);
      }
      
      // Ottieni il conteggio sessioni rimaste
      const remainingSessions = await purchaseService.getRemainingSessionsCount();
      
      // Aggiorna lo stato
      safeSetState({
        isLoading: false,
        isPremium,
        isAdFree,
        products: products,
        subscriptions: subscriptions,
        remainingFreeSessions: remainingSessions < 0 ? FREE_LIMITS.SESSIONS_PER_WEEK : remainingSessions,
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
      purchaseService.setUserForPurchases(user.id).catch(error => {
        console.error('Error setting user for purchases:', error);
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
      if (state.isPremium) return Infinity;
      
      // Incrementa il contatore e ottieni il valore aggiornato
      const remaining = await purchaseService.incrementSessionCount();
      
      // Aggiorna lo stato
      safeSetState({ remainingFreeSessions: remaining });
      
      return remaining;
    } catch (error) {
      console.error('Error incrementing session counter:', error);
      return state.remainingFreeSessions; // In caso di errore, mantieni il conteggio attuale
    }
  };
  
  // Funzioni di UI per mostrare/nascondere la finestra di abbonamento
  const showSubscriptionScreen = () => {
    setIsSubscriptionModalVisible(true);
  };
  
  const hideSubscriptionScreen = () => {
    setIsSubscriptionModalVisible(false);
  };
  
  // Acquista un abbonamento
  const purchaseSubscription = async (plan: 'monthly' | 'annual'): Promise<boolean> => {
    try {
      if (state.isLoading) return false;
      
      // Trova l'abbonamento corrispondente
      const sub = state.subscriptions.find((p: any) => p.packageType === plan);
      if (!sub) {
        console.error('Subscription plan not found:', plan);
        return false;
      }
      
      const result = await purchaseService.purchasePackage(sub);
      
      if (result.success) {
        // Aggiorna lo stato
        safeSetState({
          isPremium: true,
          isAdFree: true,
          customerInfo: result.customerInfo,
        });
        await AsyncStorage.setItem(STORAGE_KEYS.PREMIUM_STATUS, 'true');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to purchase subscription:', error);
      
      // Mostra l'errore all'utente
      try {
        Alert.alert(t('error', { ns: 'common' }), t('purchaseError'));
      } catch (alertError) {
        console.error('Error showing alert:', alertError);
      }
      
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
        
        await AsyncStorage.setItem(STORAGE_KEYS.PREMIUM_STATUS, isPremium ? 'true' : 'false');
        
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
      let message = t('upgradeBenefits', { ns: 'purchases' });
      
      if (reason === 'session_limit') {
        message = t('sessionLimitReached', { ns: 'purchases' });
      } else if (reason === 'export') {
        message = t('exportPremiumFeature', { ns: 'purchases' });
      } else if (reason === 'stats') {
        message = t('statsPremiumFeature', { ns: 'purchases' });
      }
      
      // Mostra l'alert
      Alert.alert(
        t('upgradeTitle', { ns: 'purchases' }),
        message,
        [
          {
            text: t('notNow', { ns: 'common' }),
            style: 'cancel'
          },
          {
            text: t('learnMore', { ns: 'purchases' }),
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
      // Salva il valore
      await AsyncStorage.setItem(STORAGE_KEYS.SIMULATE_PREMIUM, value ? 'true' : 'false');
      
      // Imposta anche lo stato di simulazione nel servizio
      await purchaseService.setMockPremiumStatus(value);
      
      // Aggiorna lo stato
      safeSetState({
        isPremium: value,
        isAdFree: value
      });
      
      return true;
    } catch (error) {
      console.error('Error toggling simulated premium status:', error);
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
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
};

export default PurchaseProvider; 