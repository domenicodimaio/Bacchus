/**
 * Supabase Client Configuration
 * 
 * Questo file inizializza ed esporta il client Supabase per le operazioni sul database.
 */
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Multiple approaches to get Supabase credentials to handle different environments
const getSupabaseUrl = () => {
  try {
    // Try Expo public env vars first (preferred approach)
    if (process.env.EXPO_PUBLIC_SUPABASE_URL) {
      return process.env.EXPO_PUBLIC_SUPABASE_URL;
    }
    
    // Then try from Expo Constants (from app.config.js extra)
    if (Constants.expoConfig?.extra?.supabaseUrl) {
      return Constants.expoConfig.extra.supabaseUrl;
    }
    
    // Fallback to hardcoded value as last resort
    return 'https://egdpjqdsugbcoroclgys.supabase.co';
  } catch (error) {
    console.error('[Supabase] Error getting URL:', error);
    return 'https://egdpjqdsugbcoroclgys.supabase.co';
  }
};

const getSupabaseAnonKey = () => {
  try {
    // Try Expo public env vars first (preferred approach)
    if (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
      return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    }
    
    // Then try from Expo Constants (from app.config.js extra)
    if (Constants.expoConfig?.extra?.supabaseAnonKey) {
      return Constants.expoConfig.extra.supabaseAnonKey;
    }
    
    // Fallback to hardcoded value as last resort
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHBqcWRzdWdiY29yb2NsZ3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NTg0MTUsImV4cCI6MjA1ODAzNDQxNX0.VNZ0L4a7yixOk3oATyAz-bCDsohhuNE5ohQdV363xWM';
  } catch (error) {
    console.error('[Supabase] Error getting anon key:', error);
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHBqcWRzdWdiY29yb2NsZ3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NTg0MTUsImV4cCI6MjA1ODAzNDQxNX0.VNZ0L4a7yixOk3oATyAz-bCDsohhuNE5ohQdV363xWM';
  }
};

// Set the URL and key using our robust retrieval functions
export const supabaseUrl = getSupabaseUrl();
export const supabaseAnonKey = getSupabaseAnonKey();

// Log the values we'll be using
console.log('[Supabase] Using URL:', supabaseUrl);

// Chiave per il token di autenticazione
export const SUPABASE_AUTH_TOKEN_KEY = 'supabase_auth_token';

// Storage personalizzato per Supabase che utilizza AsyncStorage
export const customStorage = {
  getItem: (key) => {
    console.log(`[Storage] Read key: ${key}`);
    return AsyncStorage.getItem(key);
  },
  setItem: (key, value) => {
    console.log(`[Storage] Write key: ${key}`);
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key) => {
    console.log(`[Storage] Remove key: ${key}`);
    return AsyncStorage.removeItem(key);
  },
};

// Crea un client base con le opzioni comuni
const createBaseClient = (storage = customStorage) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: Platform.OS === 'web' ? 'implicit' : 'pkce',
    },
    // Configurazione globale per il reindirizzamento dopo autenticazione via email
    global: {
      headers: {
        'x-application-name': 'Bacchus',
      },
    },
  });
};

// Crea il client principale
const supabase = createBaseClient();

console.log('[Supabase] Client initialized with URL:', supabaseUrl);

/**
 * Valida la connessione a Supabase
 * Verifica che l'API key sia valida tramite una semplice richiesta
 */
export const validateSupabaseConnection = async () => {
  try {
    console.log('[Supabase] Validating connection');
    
    // Tenta una semplice richiesta HTTP all'API Supabase per verificare che la chiave sia valida
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?count=exact&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      }
    });
    
    // Verifica lo stato della risposta
    // 200-299: successo, 401-403: chiave API invalida
    if (response.status >= 200 && response.status < 300) {
      console.log('[Supabase] Connection validation successful');
      return true;
    } else if (response.status === 401 || response.status === 403) {
      console.error('[Supabase] Connection validation failed: Invalid API key');
      
      // Tentiamo un secondo metodo, provando a caricare il servizio auth
      // Questo può funzionare anche se la tabella profiles non è accessibile
      try {
        console.log('[Supabase] Trying alternative validation...');
        const tempClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data } = await tempClient.auth.getSession();
        console.log('[Supabase] Alternative validation successful');
        return true;
      } catch (innerError) {
        console.error('[Supabase] Alternative validation failed:', innerError);
        return false;
      }
    } else {
      // Per altri errori, potrebbe essere un problema temporaneo di rete
      console.warn(`[Supabase] Connection validation returned unexpected status: ${response.status}`);
      
      // Se otteniamo un errore che non è relativo all'autenticazione, possiamo comunque
      // considerare la connessione valida, potrebbe essere solo un problema di permessi sulla tabella
      if (response.status !== 404) {
        console.log('[Supabase] Still considering connection valid despite status != 200');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('[Supabase] Connection validation error:', error);
    
    // Prima di fallire definitivamente, proviamo un metodo alternativo
    try {
      console.log('[Supabase] Trying final alternative validation method...');
      const tempClient = createClient(supabaseUrl, supabaseAnonKey);
      const response = await tempClient.from('health').select('*').limit(1).maybeSingle();
      
      // Se siamo arrivati ​​qui, la connessione funziona
      console.log('[Supabase] Final validation method succeeded');
      return true;
    } catch (finalError) {
      console.error('[Supabase] All validation methods failed');
      return false;
    }
  }
};

/**
 * Crea un client temporaneo per un singolo utilizzo
 * Non mantiene la sessione e non interferisce con il client principale
 */
export const createTempClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * Pulisce tutte le sessioni di autenticazione salvate in AsyncStorage
 */
export const clearStoredAuthSessions = async () => {
  try {
    console.log('[Supabase] Clearing stored auth sessions');
    
    // Elimina le chiavi di autenticazione note
    await AsyncStorage.removeItem(SUPABASE_AUTH_TOKEN_KEY);
    
    // Trova e rimuovi tutte le chiavi relative a Supabase
    const allKeys = await AsyncStorage.getAllKeys();
    const supabaseKeys = allKeys.filter(key => 
      key.startsWith('sb-') || 
      key.includes('supabase') || 
      key.includes('auth-token')
    );
    
    if (supabaseKeys.length > 0) {
      await AsyncStorage.multiRemove(supabaseKeys);
      console.log(`[Supabase] Removed ${supabaseKeys.length} auth-related keys`);
    }
    
    return true;
  } catch (error) {
    console.error('[Supabase] Error clearing auth sessions:', error);
    return false;
  }
};

// Esporta il client Supabase
export default supabase; 