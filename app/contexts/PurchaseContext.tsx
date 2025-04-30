import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import * as purchaseService from '../lib/services/purchase.service';
import { PremiumFeatures, PurchaseState, FREE_LIMITS } from '../types/purchases';

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
  
  // Inizializza il servizio acquisti
  const initializePurchases = async () => {
    console.log('Initializing purchases...');
    
    try {
      if (isInitialized) return true;
      
      // Check if premium simulation is enabled
      const simulatePremium = await AsyncStorage.getItem('SIMULATE_PREMIUM');
      if (simulatePremium === 'true') {
        console.log('SIMULATION: Premium mode enabled');
        setState(prev => ({
          ...prev,
          isPremium: true,
          isInitialized: true,
          isLoading: false
        }));
        return true;
      }
      
      const success = await purchaseService.initPurchases();
      if (!success) return false;
      
      // Se l'utente è loggato, imposta l'utente per gli acquisti
      if (user?.id) {
        await purchaseService.setUserForPurchases(user.id);
      }
      
      // Carica i prodotti
      const offerings = await purchaseService.getProducts();
      
      // Ottieni stato premium e ad-free
      const isPremium = await purchaseService.isPremium();
      const isAdFree = await purchaseService.isAdFree();
      
      // Ottieni il conteggio sessioni rimaste
      const remainingSessions = await purchaseService.getRemainingSessionsCount();
      
      // Aggiorna lo stato
      setState({
        ...state,
        isLoading: false,
        isPremium,
        isAdFree,
        currentOffering: offerings,
        products: offerings?.availablePackages || [],
        subscriptions: offerings?.availablePackages.filter((p: any) => p.packageType !== 'LIFETIME') || [],
        remainingFreeSessions: remainingSessions < 0 ? FREE_LIMITS.SESSIONS_PER_WEEK : remainingSessions,
      });
      
      setIsInitialized(true);
      return true;
    } catch (error) {
      console.error('Failed to initialize purchases in context:', error);
      setState({ ...state, isLoading: false });
      return false;
    }
  };
  
  // Effetto per inizializzare gli acquisti
  useEffect(() => {
    if (!isInitialized) {
      initializePurchases();
    }
  }, [isInitialized]);
  
  // Effetto per aggiornare l'utente quando cambia
  useEffect(() => {
    if (isInitialized && user?.id) {
      purchaseService.setUserForPurchases(user.id);
    }
  }, [user?.id, isInitialized]);
  
  // Acquista un abbonamento
  const purchaseSubscription = async (plan: 'monthly' | 'annual'): Promise<boolean> => {
    try {
      if (state.isLoading) return false;
      
      const result = await purchaseService.purchasePackage(state.subscriptions.find((p: any) => p.packageType === plan));
      
      if (result.success) {
        // Aggiorna lo stato
        setState({
          ...state,
          isPremium: true,
          isAdFree: true,
          customerInfo: result.customerInfo,
        });
        await AsyncStorage.setItem('PREMIUM_STATUS', 'true');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to purchase subscription:', error);
      Alert.alert(t('error', { ns: 'common' }), t('purchaseError'));
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
        setState({
          ...state,
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
        setState({
          ...state,
          isPremium,
          isAdFree,
          customerInfo: result.customerInfo,
        });
        await AsyncStorage.setItem('PREMIUM_STATUS', 'true');
        Alert.alert(t('success', { ns: 'common' }), t('purchaseRestored'));
        return true;
      }
      
      return result.success;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      Alert.alert(t('error', { ns: 'common' }), t('restoreError'));
      return false;
    }
  };
  
  // Ottiene le funzionalità premium disponibili
  const getPremiumFeatures = (): PremiumFeatures => {
    return {
      canUseWidgets: state.isPremium || Platform.OS !== 'ios',
      canUseLiveActivities: state.isPremium || Platform.OS !== 'ios',
      canCreateUnlimitedSessions: state.isPremium,
      sessionLimit: FREE_LIMITS.SESSIONS_PER_WEEK,
      remainingSessions: state.remainingFreeSessions,
      canExportData: state.isPremium,
      hasDetailedStatistics: state.isPremium,
      hasPersonalizedMetabolism: state.isPremium,
      canRemoveAds: state.isPremium || state.isAdFree,
    };
  };
  
  // Verifica se l'utente può creare una nuova sessione
  const checkCanCreateSession = async (): Promise<boolean> => {
    try {
      const canCreate = await purchaseService.canCreateNewSession();
      const remaining = await purchaseService.getRemainingSessionsCount();
      
      setState({
        ...state,
        remainingFreeSessions: remaining < 0 ? FREE_LIMITS.SESSIONS_PER_WEEK : remaining,
      });
      
      return canCreate;
    } catch (error) {
      console.error('Failed to check if can create session:', error);
      return state.isPremium || state.remainingFreeSessions > 0;
    }
  };
  
  // Incrementa il contatore sessioni
  const incrementSessionCounter = async (): Promise<number> => {
    if (state.isPremium) return -1; // Premium ha sessioni illimitate
    
    try {
      const newCount = await purchaseService.incrementSessionCount();
      const remaining = FREE_LIMITS.SESSIONS_PER_WEEK - newCount;
      
      setState({
        ...state,
        remainingFreeSessions: Math.max(0, remaining),
      });
      
      return remaining;
    } catch (error) {
      console.error('Failed to increment session counter:', error);
      return state.remainingFreeSessions - 1;
    }
  };
  
  // Funzioni per mostrare/nascondere lo schermo di sottoscrizione
  const showSubscriptionScreen = () => {
    try {
      console.log('[PurchaseContext] Mostrando la schermata abbonamento con modalità modale stabile');
      
      // Importante: impostiamo una variabile globale per impedire che altre navigazioni possano interferire
      if (typeof global !== 'undefined') {
        global.__SHOWING_SUBSCRIPTION_SCREEN__ = true;
        // Impostiamo questa flag per evitare che altri componenti inneschino automaticamente navigazioni
        global.__PREVENT_AUTO_NAVIGATION__ = true;
      }
      
      // Utilizziamo il metodo push invece di navigate per garantire che la schermata si apra come nuova
      router.push({
        pathname: '/onboarding/subscription-offer',
        params: { 
          source: 'direct', 
          fromWizard: 'false',
          ts: Date.now().toString(), // evita cache di navigazione
          permanent: 'true' // indica che questa schermata non deve essere chiusa automaticamente
        }
      });
      
      // Registriamo una funzione di protezione che impedisce la chiusura automatica
      setTimeout(() => {
        console.log('[PurchaseContext] Controllo che la schermata sia ancora attiva');
        if (global.__SHOWING_SUBSCRIPTION_SCREEN__) {
          const lastPathSegment = getLastPathSegment();
          if (lastPathSegment !== 'subscription-offer') {
            console.log('[PurchaseContext] La schermata è stata chiusa prematuramente, la riapro');
            router.push('/onboarding/subscription-offer');
          }
        }
      }, 1000);
    } catch (error) {
      console.error('[PurchaseContext] Errore nella navigazione:', error);
      
      // Mostriamo un fallback se la navigazione fallisce
      Alert.alert(
        t('error', { ns: 'common', defaultValue: 'Errore' }),
        t('errorGeneric', { ns: 'common', defaultValue: 'Si è verificato un errore. Riprova più tardi.' }),
        [{ text: 'OK' }]
      );
      
      // Ripristiniamo le variabili globali
      if (typeof global !== 'undefined') {
        global.__SHOWING_SUBSCRIPTION_SCREEN__ = false;
        global.__PREVENT_AUTO_NAVIGATION__ = false;
      }
    }
  };
  
  const hideSubscriptionScreen = () => {
    console.log('[hideSubscriptionScreen] Chiusura schermata subscription non più necessaria con navigazione router');
    // Questa funzione non è più necessaria con la navigazione router, ma la manteniamo
    // per retrocompatibilità. Il router gestirà la chiusura della schermata.
  };
  
  // Show upgrade prompt function
  const showUpgradePrompt = (reason?: string, source?: string) => {
    console.log(`[PurchaseContext] Richiesta di mostrare upgrade prompt: ragione=${reason}, fonte=${source}`);
    
    // Controlla se siamo già sulla schermata di abbonamento
    const lastPathSegment = getLastPathSegment();
    if (lastPathSegment === 'subscription-offer') {
      console.log('[PurchaseContext] Già sulla schermata abbonamento, ignoro richiesta');
      return;
    }
    
    try {
      console.log('[PurchaseContext] Navigazione diretta alla schermata premium');
      
      // Usiamo una navigazione diretta e sincronizzata
      router.navigate({
        pathname: '/onboarding/subscription-offer',
        params: { 
          source: source || 'direct', 
          fromWizard: 'false',
          ts: Date.now().toString() // evita cache di navigazione
        }
      });
    } catch (error) {
      console.error('[PurchaseContext] Errore nella navigazione alla schermata premium:', error);
      // Fallback in caso di errore
      Alert.alert(
        t('errorTitle', { ns: 'purchases', defaultValue: 'Errore' }),
        t('errorGeneric', { ns: 'purchases', defaultValue: 'Si è verificato un errore. Riprova più tardi.' })
      );
    }
  };
  
  // In PurchaseProvider, aggiungo questo useEffect per controllare lo stato simulato all'avvio
  useEffect(() => {
    const checkSimulatedPremium = async () => {
      try {
        if (__DEV__) {
          const debugSimulatePremium = await AsyncStorage.getItem('DEBUG_SIMULATE_PREMIUM');
          if (debugSimulatePremium === 'true') {
            console.log('[PurchaseContext] Debug simulate premium attivo, imposto state premium');
            setState({
              ...state,
              isLoading: false,
              isPremium: true,
              isAdFree: true,
              remainingFreeSessions: -1, // -1 means unlimited sessions for premium
            });
          }
        }
      } catch (error) {
        console.error('[PurchaseContext] Errore nel controllo modalità simulazione:', error);
      }
    };
    
    checkSimulatedPremium();
  }, []);
  
  // Implementazione sicura di getLastPathSegment senza usare hooks
  const getLastPathSegment = () => {
    try {
      // In React Native, use a safer approach without depending on window
      // This will store the last known route segment
      const currentPath = global.__CURRENT_PATHNAME__ || '';
      
      if (!currentPath) return '';
      
      const pathSegments = currentPath.split('/');
      return pathSegments[pathSegments.length - 1];
    } catch (error) {
      console.error('[getLastPathSegment] Errore:', error);
      return '';
    }
  };
  
  // This will be called from screens to update current path
  const updateCurrentPath = (path: string) => {
    if (typeof global !== 'undefined') {
      global.__CURRENT_PATHNAME__ = path;
    }
  };
  
  // Add a function to toggle the simulated premium state
  const toggleSimulatePremium = async (value: boolean) => {
    try {
      console.log(`[PurchaseContext] Toggling premium simulation to: ${value}`);
      
      if (value) {
        await AsyncStorage.setItem('SIMULATE_PREMIUM', 'true');
        setState(prev => ({
          ...prev,
          isPremium: true,
          isAdFree: true,
          remainingFreeSessions: -1, // -1 means unlimited sessions for premium
          isLoading: false
        }));
        console.log('[PurchaseContext] SIMULATION: Premium mode enabled');
        
        // Force reload app state
        router.setParams({ premium: 'true', ts: Date.now().toString() });
      } else {
        await AsyncStorage.removeItem('SIMULATE_PREMIUM');
        setState(prev => ({
          ...prev,
          isPremium: false,
          remainingFreeSessions: FREE_LIMITS.SESSIONS_PER_WEEK,
          isLoading: false
        }));
        console.log('[PurchaseContext] SIMULATION: Premium mode disabled');
        
        // Force reload app state
        router.setParams({ premium: 'false', ts: Date.now().toString() });
      }
      
      // Notify the change through an event for components that need to react
      if (Platform.OS === 'web') {
        window.dispatchEvent(new Event('premiumStatusChanged'));
      } else {
        // For React Native we'd typically use a more native approach
        // but for simplicity we'll just rely on the state change
      }
      
      return true;
    } catch (error) {
      console.error('[PurchaseContext] Error toggling simulate premium:', error);
      return false;
    }
  };
  
  // Valore del contesto
  const contextValue: PurchaseContextType = {
    isInitialized,
    isLoading: state.isLoading,
    isPremium: state.isPremium,
    isAdFree: state.isAdFree,
    products: state.products,
    subscriptions: state.subscriptions,
    remainingFreeSessions: state.remainingFreeSessions,
    isSubscriptionModalVisible: false,
    
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
  };
  
  return (
    <PurchaseContext.Provider value={contextValue}>
      {children}
    </PurchaseContext.Provider>
  );
};

export default PurchaseProvider; 