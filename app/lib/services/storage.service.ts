/**
 * Storage Service
 * 
 * Gestisce l'accesso unificato al storage locale dell'app.
 * Fornisce funzioni wrapper per AsyncStorage con gestione degli errori.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ===== CHIAVI STANDARDIZZATE =====
export const STORAGE_KEYS = {
  // Authentication
  USER_DATA: 'bacchus_user_data',
  USER_SESSION: 'bacchus_user_session', 
  SUPABASE_AUTH_TOKEN: 'bacchus_supabase_auth_token',
  
  // Profiles
  PROFILES: 'bacchus_profiles',
  GUEST_PROFILES: 'bacchus_guest_profiles',
  ACTIVE_PROFILE: 'bacchus_active_profile',
  CURRENT_PROFILE: 'bacchus_current_profile',
  
  // Sessions
  ACTIVE_SESSIONS: 'bacchus_active_sessions',
  SESSION_HISTORY: 'bacchus_session_history',
  LAST_KNOWN_SESSION: 'bacchus_last_known_session',
  
  // Purchase
  PREMIUM_STATUS: 'bacchus_premium_status',
  SIMULATE_PREMIUM: 'bacchus_simulate_premium',
  SESSION_COUNT: 'bacchus_session_count',
  WEEKLY_SESSION_RESET: 'bacchus_weekly_session_reset',
  CUSTOMER_INFO: 'bacchus_customer_info',
  
  // Settings
  LANGUAGE: 'bacchus_language',
  THEME: 'bacchus_theme',
  OFFLINE_MODE: 'bacchus_offline_mode',
  LAST_SYNC: 'bacchus_last_sync',
  
  // Flags
  WIZARD_COMPLETED: 'bacchus_wizard_completed',
  DEV_MODE_COUNT: 'bacchus_dev_mode_count',
  REMOTE_LOGGING: 'bacchus_remote_logging',
} as const;

// ===== INTERFACCE =====
export interface StorageData {
  [key: string]: any;
}

export interface UserProfile {
  id: string;
  name: string;
  weight: number;
  gender: 'male' | 'female';
  age?: number;
  drinking_frequency?: string;
  emoji?: string;
  color?: string;
}

// ===== STORAGE SERVICE =====
class StorageService {
  /**
   * Ottieni un valore dallo storage
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      
      // Prova a parsare come JSON, altrimenti restituisci stringa
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      console.error(`[STORAGE] Errore lettura ${key}:`, error);
      return null;
    }
  }

  /**
   * Salva un valore nello storage
   */
  async set(key: string, value: any): Promise<boolean> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      console.error(`[STORAGE] Errore scrittura ${key}:`, error);
      return false;
    }
  }

  /**
   * Rimuovi un valore dallo storage
   */
  async remove(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[STORAGE] Errore rimozione ${key}:`, error);
      return false;
    }
  }

  /**
   * Rimuovi multipli valori dallo storage
   */
  async removeMultiple(keys: string[]): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error(`[STORAGE] Errore rimozione multipla:`, error);
      return false;
    }
  }

  /**
   * Pulisci tutto lo storage
   */
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error(`[STORAGE] Errore pulizia completa:`, error);
      return false;
    }
  }

  /**
   * Ottieni tutte le chiavi dello storage
   */
  async getAllKeys(): Promise<readonly string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error(`[STORAGE] Errore ottenimento chiavi:`, error);
      return [];
    }
  }

  /**
   * Ottieni multipli valori dallo storage
   */
  async getMultiple(keys: string[]): Promise<Record<string, any>> {
    try {
      const keyValuePairs = await AsyncStorage.multiGet(keys);
      const result: Record<string, any> = {};
      
      keyValuePairs.forEach(([key, value]) => {
        if (value !== null) {
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        }
      });
      
      return result;
    } catch (error) {
      console.error(`[STORAGE] Errore lettura multipla:`, error);
      return {};
    }
  }

  /**
   * Salva multipli valori nello storage
   */
  async setMultiple(data: Record<string, any>): Promise<boolean> {
    try {
      const keyValuePairs = Object.entries(data).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : JSON.stringify(value)
      ] as [string, string]);
      
      await AsyncStorage.multiSet(keyValuePairs);
      return true;
    } catch (error) {
      console.error(`[STORAGE] Errore scrittura multipla:`, error);
      return false;
    }
  }

  // ===== METODI SPECIFICI PER DOMINI =====

  /**
   * User data helpers
   */
  async getUserData() {
    return this.get(STORAGE_KEYS.USER_DATA);
  }

  async setUserData(userData: any) {
    return this.set(STORAGE_KEYS.USER_DATA, userData);
  }

  /**
   * Profile helpers
   */
  async getProfiles(): Promise<UserProfile[]> {
    return (await this.get<UserProfile[]>(STORAGE_KEYS.PROFILES)) || [];
  }

  async setProfiles(profiles: UserProfile[]) {
    return this.set(STORAGE_KEYS.PROFILES, profiles);
  }

  async getActiveProfileId(): Promise<string | null> {
    return this.get<string>(STORAGE_KEYS.ACTIVE_PROFILE);
  }

  async setActiveProfileId(profileId: string) {
    return this.set(STORAGE_KEYS.ACTIVE_PROFILE, profileId);
  }

  /**
   * Premium helpers  
   */
  async isPremiumSimulated(): Promise<boolean> {
    const value = await this.get<string>(STORAGE_KEYS.SIMULATE_PREMIUM);
    return value === 'true';
  }

  async setPremiumSimulation(enabled: boolean) {
    return this.set(STORAGE_KEYS.SIMULATE_PREMIUM, enabled.toString());
  }

  /**
   * Wizard helpers
   */
  async isWizardCompleted(): Promise<boolean> {
    const value = await this.get<string>(STORAGE_KEYS.WIZARD_COMPLETED);
    return value === 'true';
  }

  async setWizardCompleted(completed: boolean) {
    return this.set(STORAGE_KEYS.WIZARD_COMPLETED, completed.toString());
  }

  /**
   * Pulizia dati specifici per logout
   */
  async clearUserData(): Promise<boolean> {
    const keysToRemove = [
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.USER_SESSION,
      STORAGE_KEYS.SUPABASE_AUTH_TOKEN,
      STORAGE_KEYS.ACTIVE_PROFILE,
      STORAGE_KEYS.CURRENT_PROFILE,
      STORAGE_KEYS.ACTIVE_SESSIONS,
      STORAGE_KEYS.LAST_KNOWN_SESSION,
    ];
    
    return this.removeMultiple(keysToRemove);
  }

  /**
   * Pulizia dati specifici per reset app
   */
  async clearAllAppData(): Promise<boolean> {
    const keysToKeep = [
      STORAGE_KEYS.LANGUAGE, // Mantieni impostazioni lingua
      STORAGE_KEYS.THEME,    // Mantieni tema
    ] as string[];
    
    try {
      const allKeys = await this.getAllKeys();
      const keysToRemove = Array.from(allKeys).filter(key => 
        !keysToKeep.includes(key) && key.startsWith('bacchus_')
      );
      
      return this.removeMultiple(keysToRemove);
    } catch (error) {
      console.error('[STORAGE] Errore pulizia app data:', error);
      return false;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService; 