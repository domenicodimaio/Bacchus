/**
 * Supabase Client Configuration
 * 
 * This file initializes and exports the Supabase client for database operations.
 * It uses environment variables for the URL and API keys.
 */
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get environment variables
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://qnmtpoiavhfllrzuerqq.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubXRwb2lhdmhmbGxyenVlcnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjI4MDMsImV4cCI6MjA1NjMzODgwM30.2C3GDLsRJ2It_gPdt7JT_7nR7aP48Q2LopofdLtVgLA';

// Estrai il projectRef dal supabaseUrl
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || 'qnmtpoiavhfllrzuerqq';
// La chiave che Supabase usa per salvare il token di autenticazione
export const SUPABASE_AUTH_TOKEN_KEY = `sb-${projectRef}-auth-token`;

// Custom storage implementation that adds debug logs
const customStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (error) {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
    }
  },
};

// Initialize Supabase client with AsyncStorage for auth state persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    debug: __DEV__, // Abilita il debug solo in modalità sviluppo
  },
});

/**
 * Validation function to verify that the Supabase client is properly initialized
 */
export const validateSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Manually get session from storage and set it in Supabase client
 */
export const restoreSession = async (): Promise<boolean> => {
  try {
    const storedSession = await AsyncStorage.getItem(SUPABASE_AUTH_TOKEN_KEY);
    if (storedSession) {
      const parsedSession = JSON.parse(storedSession);
      
      const { data, error } = await supabase.auth.setSession({
        access_token: parsedSession.access_token,
        refresh_token: parsedSession.refresh_token,
      });
      
      if (error) {
        throw error;
      }
      
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

/**
 * Authentication functions
 */
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    // Assicurati che non ci siano sessioni precedenti
    await AsyncStorage.removeItem(SUPABASE_AUTH_TOKEN_KEY);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  } catch (e) {
    return { data: null, error: e };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Verifica che la sessione sia stata salvata correttamente
    if (data?.session) {
      const savedToken = await AsyncStorage.getItem(SUPABASE_AUTH_TOKEN_KEY);
      
      // Se per qualche motivo non è stata salvata, salviamola manualmente
      if (!savedToken) {
        await AsyncStorage.setItem(SUPABASE_AUTH_TOKEN_KEY, JSON.stringify(data.session));
      }
    }
    
    return { data, error };
  } catch (e) {
    return { data: null, error: e };
  }
};

export const signOut = async () => {
  try {
    // Prima rimuovi la sessione da AsyncStorage
    await AsyncStorage.removeItem(SUPABASE_AUTH_TOKEN_KEY);
    
    // Poi esegui il signout da Supabase
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (e) {
    return { error: e };
  }
};

export const resetPassword = async (email: string) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  } catch (e) {
    return { data: null, error: e };
  }
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async () => {
  try {
    // Prima prova a recuperare la sessione salvata
    const sessionStr = await AsyncStorage.getItem(SUPABASE_AUTH_TOKEN_KEY);
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        // Tenta di impostare la sessione
        const { data, error } = await supabase.auth.setSession(session);
        if (error) {
          if (error.message.includes('expired')) {
            await AsyncStorage.removeItem(SUPABASE_AUTH_TOKEN_KEY);
          }
        } else if (data?.user) {
          return data.user;
        }
      } catch (e) {
      }
    }
    
    // Se non abbiamo potuto ripristinare la sessione, proviamo a ottenere l'utente normalmente
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      // Se l'errore è AuthSessionMissingError, cancelliamo i dati di autenticazione
      if (error.message && error.message.includes('Auth session missing')) {
        await AsyncStorage.removeItem(SUPABASE_AUTH_TOKEN_KEY);
      }
      return null;
    }
    return user;
  } catch (e) {
    return null;
  }
};

/**
 * Subscribe to auth changes
 */
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    // Se l'utente si è autenticato, verifichiamo che la sessione sia salvata
    if (event === 'SIGNED_IN' && session) {
      AsyncStorage.getItem(SUPABASE_AUTH_TOKEN_KEY).then(storedSession => {
        if (!storedSession) {
          AsyncStorage.setItem(SUPABASE_AUTH_TOKEN_KEY, JSON.stringify(session));
        }
      });
    }
    // Se l'utente si è disconnesso, rimuoviamo la sessione
    else if (event === 'SIGNED_OUT') {
      AsyncStorage.removeItem(SUPABASE_AUTH_TOKEN_KEY);
    }
    
    callback(event, session);
  });
};

// Export the supabase instance for direct use
export default supabase; 