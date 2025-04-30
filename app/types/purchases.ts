/**
 * Definizione dei tipi per il sistema di acquisti in-app
 */

/**
 * Tipi di prodotti disponibili
 */
export enum ProductType {
  PREMIUM_SUBSCRIPTION_MONTHLY = 'premium_monthly',
  PREMIUM_SUBSCRIPTION_YEARLY = 'premium_yearly',
  REMOVE_ADS = 'remove_ads'
}

/**
 * Stringa di identificazione per prodotti Apple e Google Play
 */
export interface StoreProductIds {
  ios: string;
  android: string;
}

/**
 * Mappa di identificativi prodotto per gli store
 */
export const PRODUCT_IDS: Record<ProductType, StoreProductIds> = {
  [ProductType.PREMIUM_SUBSCRIPTION_MONTHLY]: {
    ios: 'com.bacchus.app.premium.monthly',
    android: 'com.bacchus.app.premium.monthly',
  },
  [ProductType.PREMIUM_SUBSCRIPTION_YEARLY]: {
    ios: 'com.bacchus.app.premium.yearly',
    android: 'com.bacchus.app.premium.yearly',
  },
  [ProductType.REMOVE_ADS]: {
    ios: 'com.bacchus.app.removeads',
    android: 'com.bacchus.app.removeads',
  },
};

/**
 * Tipo per le entitlement (autorizzazioni premium)
 */
export enum Entitlement {
  PREMIUM = 'premium',
  AD_FREE = 'ad_free'
}

/**
 * Interfaccia per lo stato degli acquisti dell'utente
 */
export interface PurchaseState {
  isLoading: boolean;
  isPremium: boolean;
  isAdFree: boolean;
  products: any[];
  subscriptions: any[];
  currentOffering: any;
  customerInfo: any;
  activeSessions: number;
  remainingFreeSessions: number; // Per la versione gratuita che ha un limite di sessioni a settimana
}

/**
 * Interfaccia per le funzionalità premium
 */
export interface PremiumFeatures {
  // Widget e Live Activities
  canUseWidgets: boolean;
  canUseLiveActivities: boolean;
  
  // Limiti sessioni
  canCreateUnlimitedSessions: boolean;
  sessionLimit: number;
  remainingSessions: number;
  
  // Altre funzionalità
  canExportData: boolean;
  hasDetailedStatistics: boolean;
  hasPersonalizedMetabolism: boolean;
  canRemoveAds: boolean;
}

/**
 * Limitazioni per utenti non premium
 */
export const FREE_LIMITS = {
  SESSIONS_PER_WEEK: 2,  // Numero massimo di sessioni settimanali per utenti free
}; 