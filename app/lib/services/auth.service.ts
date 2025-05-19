/**
 * Auth Service
 * 
 * Gestisce l'autenticazione degli utenti tramite Supabase.
 * Fornisce funzioni per login, registrazione, reset della password, ecc.
 */

import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase, { 
  SUPABASE_AUTH_TOKEN_KEY, 
  supabaseUrl, 
  supabaseAnonKey,
  validateSupabaseConnection,
  clearStoredAuthSessions,
  createTempClient
} from '../supabase/client';
import { storeAuthState } from '../supabase/middleware';
import * as offlineService from './offline.service';
import { router } from "expo-router";
import { resetLocalProfiles, getProfiles } from './profile.service';
import sessionServiceDirect from './session.service';
import { clearUserData } from './session.service';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import config from '../config';

// Variabili usate per le importazioni ritardate, per evitare dipendenze cicliche
let profileService: any = null;
let storageService: any = null;
let sessionService: any = null;

// Funzione per importare i servizi dinamicamente quando necessario
const importServices = async () => {
  if (!profileService) {
    profileService = await import('./profile.service');
  }
  if (!sessionService) {
    sessionService = await import('./session.service');
  }
};

// Chiavi per storage locale
export const USER_DATA_KEY = 'bacchus_user_data';
export const USER_SESSION_KEY = 'bacchus_user_session';
export const SELECTED_PROFILE_KEY = 'bacchus_selected_profile';

// Supabase Admin client (diverso dal client principale importato sopra)
const supabaseAdmin = null; // Disabled admin client to avoid key issues

/**
 * Tipo per la risposta dell'autenticazione
 */
export type AuthResponse = {
  success: boolean;
  error?: string;
  user?: User;
  session?: Session;
  data?: any;
  redirectToProfileCreation?: boolean;
};

// Helper function to get environment variables from various sources
const getEnvVar = (key) => {
  if (process.env[key]) {
    return process.env[key];
  }
  
  // Check in Constants if available
  if (Constants?.expoConfig?.extra?.[key.toLowerCase()]) {
    return Constants.expoConfig.extra[key.toLowerCase()];
  }
  
  // Check in .env directly through the EXPO_PUBLIC prefix
  const publicKey = `EXPO_PUBLIC_${key}`;
  if (process.env[publicKey]) {
    return process.env[publicKey];
  }
  
  return undefined;
};

/**
 * Registra un nuovo utente con email e password
 */
export const signUp = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    // Verifica connessione
    const isOffline = await offlineService.isOffline();
    if (isOffline) {
      return {
        success: false,
        error: 'No internet connection available'
      };
    }
    
    // Prima della registrazione, pulisci qualsiasi token di autenticazione esistente
    await clearStoredAuthSessions();
    
    // Importa e inizializza il servizio sessioni
    const sessionServiceImport = await import('./session.service');
    
    // Verifica connessione a Supabase
    const isValidConnection = await validateSupabaseConnection();
    if (!isValidConnection) {
      console.error('[AUTH] Errore di connessione a Supabase durante registrazione.');
      return {
        success: false, 
        error: 'Errore di connessione al server. Verifica la tua connessione internet.'
      };
    }
    
    console.log('[AUTH] Registrazione utente:', email);
    
    // Registra utente con Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      console.error('[AUTH] Errore registrazione:', error.message);
      
      // Traduzioni dei messaggi di errore più comuni
      let errorMessage = error.message;
      if (error.message.includes('valid email')) {
        errorMessage = 'Inserisci un indirizzo email valido.';
      } else if (error.message.includes('least 6 characters')) {
        errorMessage = 'La password deve essere di almeno 6 caratteri.';
      } else if (error.message.includes('already registered')) {
        errorMessage = 'Email già registrata. Prova ad accedere.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
    
    if (!data.user) {
      console.error('[AUTH] Nessun utente restituito dopo la registrazione');
      return {
        success: false,
        error: 'Errore durante la registrazione. Riprova più tardi.'
      };
    }
    
    console.log('[AUTH] Utente registrato con successo:', data.user.id);

    // Redirigi alla schermata corretta
    // L'utente dovrebbe creare il proprio profilo
    console.log('[AUTH] Reindirizzamento per creazione profilo');
    
    // Restituisci il risultato
    return {
      success: true,
      user: data.user,
      session: data.session,
      redirectToProfileCreation: true
    };
    
  } catch (error) {
    console.error('[AUTH] Errore sconosciuto durante registrazione:', error);
    return {
      success: false,
      error: 'Errore durante la registrazione. Riprova più tardi.'
    };
  }
};

/**
 * Effettua il login con email e password
 */
export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    // Verifica connessione
    const isOffline = await offlineService.isOffline();
    if (isOffline) {
      return {
        success: false,
        error: 'No internet connection available'
      };
    }
    
    console.log('[AUTH] Tentativo di login con email:', email);
    
    // Prima di tentare il login, pulisci qualsiasi token di autenticazione esistente
    console.log('[AUTH] Pulizia token precedenti...');
    await clearStoredAuthSessions();
    
    // Importa e inizializza il servizio sessioni
    const sessionServiceImport = await import('./session.service');
    await sessionServiceImport.initSessionService();
    
    // Tenta di verificare la connessione a Supabase
    const isConnectionValid = await validateSupabaseConnection();
    
    // Utilizzare un client temporaneo per evitare problemi di sessione persistente
    const authClient = createTempClient();
    
    // Invio richiesta login a Supabase
    console.log('[AUTH] Invio richiesta login a Supabase...');
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password
    });
    
    // Se c'è un errore, mostriamolo
    if (error) {
      console.error('[AUTH] Errore durante il login Supabase:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
    
    // Login riuscito, salviamo i dati dell'utente
    if (!data.user) {
      return {
        success: false,
        error: 'Nessun dato utente ricevuto'
      };
    }
    
    // Salva i dati dell'utente
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify({
      id: data.user.id,
      email: data.user.email,
      createdAt: data.user.created_at
    }));
    
    // Salva la sessione
    if (data.session) {
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(data.session));
      
      // Formato della chiave Supabase: sb-{ref}-auth-token
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';
      const tokenKey = `sb-${projectRef}-auth-token`;
      
      await AsyncStorage.setItem(SUPABASE_AUTH_TOKEN_KEY, JSON.stringify(data.session));
      await AsyncStorage.setItem(tokenKey, JSON.stringify(data.session));
    }
    
    // Inizializza il servizio sessioni con l'ID utente
    await sessionServiceImport.initSessionService(data.user.id);
    
    // Login completato con successo
    return {
      success: true,
      user: data.user,
      session: data.session
    };
  } catch (error) {
    console.error('[AUTH] Errore imprevisto durante il login:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Effettua il login con provider OAuth (Google, Apple)
 */
export const signInWithProvider = async (provider: 'google' | 'apple'): Promise<AuthResponse> => {
  try {
    // Verifica connessione
    const isOffline = await offlineService.isOffline();
    if (isOffline) {
      return {
        success: false,
        error: 'No internet connection available'
      };
    }
    
    console.log(`AUTH: Tentativo di login con ${provider}...`);
    
    // Ottieni le configurazioni per OAuth dal modulo centralizzato
    const redirectTo = config.getRedirectUrl(provider);
    console.log(`AUTH: URL di redirezione per ${provider}:`, redirectTo);
    
    // Ottieni configurazioni specifiche per il provider
    const providerOptions = config.getOAuthConfig(provider);
    console.log(`AUTH: Opzioni per ${provider}:`, providerOptions);
    
    // Inizia il flusso di autenticazione OAuth
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: providerOptions
    });
    
    if (error) {
      console.error(`AUTH: Errore durante l'autenticazione con ${provider}:`, error);
      throw error;
    }
    
    if (!data.url) {
      console.error(`AUTH: Non è stata restituita una URL di autorizzazione da ${provider}`);
      return {
        success: false,
        error: `Errore durante l'autenticazione con ${provider}: URL mancante`
      };
    }
    
    console.log(`AUTH: URL di autorizzazione per ${provider} ottenuta:`, data.url);
    
    // Gestione speciale per evitare redirezioni esterne su Apple
    if (provider === 'apple' && Platform.OS === 'ios') {
      try {
        // Richiedi importazione dell'expo-auth-session
        const { exchangeCodeAsync } = require('expo-auth-session');
        // Apri la URL usando un WebBrowser interno
        const response = await Linking.openURL(data.url);
        console.log(`AUTH: Apertura browser interno per ${provider} completata`);
        return {
          success: true,
          // Il flusso di autenticazione continuerà in expo-router
        };
      } catch (err) {
        console.error(`AUTH: Errore nell'apertura del browser interno per ${provider}:`, err);
        return {
          success: false,
          error: `Impossibile aprire il browser per ${provider}`
        };
      }
    }
    
    // Apri la URL nel browser - questo è importante per il flusso di autenticazione
    try {
      const canOpen = await Linking.canOpenURL(data.url);
      
      if (canOpen) {
        await Linking.openURL(data.url);
        console.log(`AUTH: Browser aperto con URL di autorizzazione per ${provider}`);
        return {
          success: true,
          // Il flusso di autenticazione continuerà in expo-router
        };
      } else {
        console.error(`AUTH: Impossibile aprire la URL di autorizzazione per ${provider}`);
        return {
          success: false,
          error: `Impossibile aprire la URL di autorizzazione per ${provider}`
        };
      }
    } catch (error) {
      console.error(`AUTH: Errore durante l'apertura della URL di autorizzazione per ${provider}:`, error);
      return {
        success: false,
        error: `Errore durante l'apertura della URL di autorizzazione per ${provider}`
      };
    }
  } catch (error: any) {
    console.error(`AUTH: Errore generale durante il login con ${provider}:`, error);
    return {
      success: false,
      error: error?.message || `Errore durante il login con ${provider}`
    };
  }
};

/**
 * Effettua il logout dell'utente
 */
export const signOut = async (): Promise<AuthResponse> => {
  try {
    console.log('Starting logout process');
    
    // Prima di effettuare il logout, cancella i dati ospite
    await clearGuestData();
    
    // Effettua il logout da Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Errore durante il logout:', error);
    return {
      success: false,
      error: error.message || 'Impossibile effettuare il logout'
    };
  }
};

/**
 * Elimina completamente i dati dell'account ospite al logout
 * Questa funzione deve essere chiamata durante il processo di logout
 * per garantire che le sessioni dell'ospite non persistano
 */
export async function clearGuestData(): Promise<boolean> {
  try {
    console.log('Pulizia dati ospite in corso...');
    
    // Importa il servizio sessioni
    const sessionService = require('./session.service');
    
    // Ottieni la chiave per le sessioni ospite
    const guestSessionKeys = [
      'guest_active_session',
      'guest_session_history'
    ];
    
    // Rimuovi tutte le chiavi delle sessioni ospite da AsyncStorage
    await AsyncStorage.multiRemove(guestSessionKeys);
    
    // Rimuovi anche tutte le sessioni attive dalla memoria
    await sessionService.clearAllSessions();
    
    console.log('Pulizia dati ospite completata con successo');
    return true;
  } catch (error) {
    console.error('Errore durante la pulizia dei dati ospite:', error);
    return false;
  }
}

/**
 * Richiede il reset della password
 */
export const resetPassword = async (email: string): Promise<AuthResponse> => {
  try {
    // Verifica connessione
    const isOffline = await offlineService.isOffline();
    if (isOffline) {
      return {
        success: false,
        error: 'No internet connection available'
      };
    }
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'bacchus://reset-password-callback',
    });
    
    if (error) throw error;
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('Reset password error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Aggiorna la password dell'utente
 */
export const updatePassword = async (currentPassword?: string, newPassword?: string): Promise<AuthResponse> => {
  try {
    // Verifica connessione
    const isOffline = await offlineService.isOffline();
    if (isOffline) {
      return {
        success: false,
        error: 'No internet connection available'
      };
    }
    
    if (newPassword) {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      return {
        success: true,
        user: data.user
      };
    }
    
    return {
      success: false,
      error: 'New password is required'
    };
  } catch (error: any) {
    console.error('Update password error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Ottiene l'utente corrente da Supabase
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // Verifica connessione
    const isOffline = await offlineService.isOffline();
    if (isOffline) {
      // In modalità offline, prova a recuperare l'utente dal localStorage
      const userJson = await AsyncStorage.getItem(USER_DATA_KEY);
      if (userJson) {
        return JSON.parse(userJson) as User;
      }
      return null;
    }
    
    // Online, verifica se c'è una sessione attiva
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Aggiorna i dati utente nel localStorage
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify({
        id: user.id,
        email: user.email,
        createdAt: user.created_at
      }));
    }
    
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Verifica se l'utente è autenticato
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    // Verifica se l'utente è autenticato normalmente
    const user = await getCurrentUser();
    return !!user;
  } catch (error) {
    console.error('Is authenticated error:', error);
    return false;
  }
};

/**
 * Registra una funzione di callback per i cambiamenti di stato dell'autenticazione
 */
export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

/**
 * Salva le impostazioni del profilo
 */
export const saveProfileSettings = async (settings: any): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(SELECTED_PROFILE_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Save profile settings error:', error);
    return false;
  }
};

/**
 * Ottiene le impostazioni del profilo
 */
export const getProfileSettings = async (): Promise<any> => {
  try {
    const settingsJson = await AsyncStorage.getItem(SELECTED_PROFILE_KEY);
    if (settingsJson) {
      return JSON.parse(settingsJson);
    }
    return null;
  } catch (error) {
    console.error('Get profile settings error:', error);
    return null;
  }
};

/**
 * Reimposta completamente lo stato dell'autenticazione e della sessione
 * Questo è utile quando ci sono problemi con il flusso utente
 */
export const resetAuthState = async (): Promise<void> => {
  try {
    // Rimuovi i dati di autenticazione da AsyncStorage
    await AsyncStorage.removeItem(USER_DATA_KEY);
    await AsyncStorage.removeItem(USER_SESSION_KEY);
    await AsyncStorage.removeItem(SUPABASE_AUTH_TOKEN_KEY);
    
    console.log('Auth state reset successfully');
  } catch (error) {
    console.error('Error resetting auth state:', error);
  }
};

/**
 * Verifica se il wizard del profilo è stato completato
 */
export const hasCompletedProfileWizard = async (): Promise<boolean> => {
  try {
    console.log('Verifica completamento wizard...');
    
    // Verifica PRIMA in AsyncStorage (più veloce e affidabile)
    const profileSettingsStr = await AsyncStorage.getItem(SELECTED_PROFILE_KEY);
    if (profileSettingsStr) {
      const profileSettings = JSON.parse(profileSettingsStr);
      if (profileSettings.completedWizard === true) {
        console.log('Wizard completato (da AsyncStorage):', true);
        return true;
      }
    }
    
    // Se non troviamo in AsyncStorage, verifica se l'utente è autenticato
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.log('Utente non autenticato, wizard non completato');
      return false;
    }
    
    // Verifica quindi se ci sono profili con has_completed_wizard = true nel DB
    if (!(await offlineService.isOffline())) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('has_completed_wizard')
          .eq('user_id', currentUser.id)
          .eq('has_completed_wizard', true)
          .limit(1);
        
        if (error) {
          // Se l'errore è dovuto alla mancanza della colonna, lo ignoriamo
          if (error.code === 'PGRST204' && 
              error.message && 
              error.message.includes('has_completed_wizard')) {
            console.log('La colonna has_completed_wizard non esiste nel database. Utilizzo solo AsyncStorage.');
          } else {
            console.error('Error checking wizard completion from DB:', error);
          }
        } else if (data && data.length > 0) {
          // Se troviamo il flag nel DB, aggiorniamo anche AsyncStorage per la prossima volta
          const profileSettings = profileSettingsStr ? JSON.parse(profileSettingsStr) : {};
          profileSettings.completedWizard = true;
          await AsyncStorage.setItem(SELECTED_PROFILE_KEY, JSON.stringify(profileSettings));
          
          console.log('Wizard completato (da DB):', true);
          return true;
        }
      } catch (err) {
        console.error('Unexpected error checking wizard completion from DB:', err);
      }
    }
    
    // Se arriviamo qui, significa che non abbiamo trovato conferma del completamento
    console.log('Nessuna conferma trovata, wizard non completato');
    return false;
  } catch (error) {
    console.error('Error checking profile wizard completion:', error);
    return false;
  }
};

/**
 * Imposta lo stato di completamento del wizard del profilo
 * Versione ottimizzata per ridurre i ritardi
 */
export const setProfileWizardCompleted = async (completed: boolean = true): Promise<void> => {
  try {
    console.log('Aggiornamento stato completamento wizard:', completed);
    
    // OTTIMIZZAZIONE 1: Prima salviamo in AsyncStorage (veloce)
    // per garantire una risposta rapida all'UI
    const profileSettingsStr = await AsyncStorage.getItem(SELECTED_PROFILE_KEY);
    const profileSettings = profileSettingsStr ? JSON.parse(profileSettingsStr) : {};
    
    // Aggiorna lo stato del wizard
    profileSettings.completedWizard = completed;
    
    // Salva le impostazioni aggiornate in modo sincrono
    await AsyncStorage.setItem(SELECTED_PROFILE_KEY, JSON.stringify(profileSettings));
    console.log('Stato wizard salvato in AsyncStorage:', completed);
    
    // Verifica che il salvataggio sia stato effettivo
    const verifySettings = await AsyncStorage.getItem(SELECTED_PROFILE_KEY);
    if (verifySettings) {
      const parsedSettings = JSON.parse(verifySettings);
      if (parsedSettings.completedWizard !== completed) {
        console.error('ERRORE CRITICO: Il flag wizard non è stato salvato correttamente in AsyncStorage');
        // Riprova una volta
        await AsyncStorage.setItem(SELECTED_PROFILE_KEY, JSON.stringify({...profileSettings, completedWizard: completed}));
      }
    }
    
    // OTTIMIZZAZIONE 2: Avvia l'aggiornamento del database in background
    // senza attendere la risposta
    setTimeout(async () => {
      try {
        // Verifica se l'utente è autenticato
        const currentUser = await getCurrentUser();
        
        // Se l'utente è autenticato e online, aggiorna i suoi profili nel DB
        if (currentUser && !(await offlineService.isOffline())) {
          console.log('Aggiornamento profili nel database in background...');
          
          // Ottieni tutti i profili dell'utente
          const { data: userProfiles, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', currentUser.id);
          
          if (profileError) {
            console.error('Error fetching user profiles for wizard update:', profileError);
            return; // Uscita anticipata in caso di errore, senza bloccare l'UI
          }
          
          if (!userProfiles || userProfiles.length === 0) {
            console.log('Nessun profilo trovato per l\'aggiornamento del wizard');
            return; // Uscita anticipata, senza bloccare l'UI
          }
          
          // Aggiorna tutti i profili dell'utente in parallelo
          const updatePromises = userProfiles.map(async (profile) => {
            try {
              await supabase
                .from('profiles')
                .update({ has_completed_wizard: completed })
                .eq('id', profile.id);
            } catch (err) {
              console.error(`Unexpected error updating profile ${profile.id}:`, err);
            }
          });
          
          // Esegui tutte le promesse in parallelo
          await Promise.all(updatePromises);
          console.log('Tutti i profili aggiornati con successo nel database');
        }
      } catch (error) {
        console.error('Error in background profile wizard update:', error);
      }
    }, 0);
    
  } catch (error) {
    console.error('Error setting profile wizard completion status:', error);
  }
};

/**
 * Gestisce il passaggio alla modalità ospite
 * Pulisce correttamente le sessioni dell'utente autenticato
 */
export const switchToGuestMode = async (): Promise<boolean> => {
  try {
    console.log('Passaggio alla modalità ospite...');
    
    // Verifica se l'utente è autenticato
    const currentUser = await getCurrentUser();
    if (currentUser) {
      console.log('Utente autenticato trovato, eseguo logout e pulizia...');
      
      // Esegui il logout ma mantieni alcune impostazioni
      await signOut();
    } else {
      console.log('Nessun utente autenticato trovato, pulizia sessioni...');
      
      // Se non c'è un utente, reinizializza comunque il servizio sessioni
      await sessionServiceDirect.initSessionService();
    }
    
    console.log('Passaggio alla modalità ospite completato');
    return true;
  } catch (error) {
    console.error('Errore durante il passaggio alla modalità ospite:', error);
    return false;
  }
};

/**
 * Elimina tutti i dati dell'account dell'utente e lo disconnette
 */
export const deleteAccount = async (): Promise<AuthResponse> => {
  try {
    console.log('Starting account deletion process');
    
    // Verifica se l'utente è autenticato
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error('User not authenticated');
      return {
        success: false,
        error: 'User not authenticated'
      };
    }
    
    // Se siamo offline, non possiamo eliminare l'account
    if (await offlineService.isOffline()) {
      console.error('Cannot delete account while offline');
      return {
        success: false,
        error: 'Cannot delete account while offline'
      };
    }
    
    // Prima otteniamo la sessione attuale e i token necessari
    // QUESTO È CRUCIALE - Dobbiamo ottenere il token PRIMA di eliminare qualsiasi dato
    console.log('Retrieving authentication session...');
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const userId = currentUser.id;
    
    if (!accessToken) {
      console.error('No access token available in the current session');
      
      // Tentiamo comunque di proseguire con l'eliminazione
      console.log('Attempting to delete user data without token...');
    } else {
      console.log('Access token retrieved successfully');
    }

    // Tenta di eliminare le tabelle di dati dell'utente
    try {
      // Tenta di eliminare i profili
      await supabase.from('profiles').delete().eq('user_id', userId);
      console.log('User profiles deleted successfully');
    } catch (profileError) {
      console.error('Error deleting user profiles:', profileError);
    }
    
    // Verifica se esiste la tabella active_sessions prima di tentare l'eliminazione
    try {
      const { count } = await supabase
        .from('active_sessions')
        .select('*', { count: 'exact', head: true });
      
      if (count !== null) {
        // La tabella esiste, procedi con l'eliminazione
        await supabase.from('active_sessions').delete().eq('user_id', userId);
        console.log('Active sessions deleted successfully');
      } else {
        console.log('Active sessions table does not exist, skipping deletion');
      }
    } catch (sessionError) {
      console.log('Error checking/deleting active sessions:', sessionError);
    }
    
    // Verifica se esiste la tabella session_history prima di tentare l'eliminazione
    try {
      const { count } = await supabase
        .from('session_history')
        .select('*', { count: 'exact', head: true });
      
      if (count !== null) {
        // La tabella esiste, procedi con l'eliminazione
        await supabase.from('session_history').delete().eq('user_id', userId);
        console.log('Session history deleted successfully');
      } else {
        console.log('Session history table does not exist, skipping deletion');
      }
    } catch (historyError) {
      console.log('Error checking/deleting session history:', historyError);
    }
    
    // Tenta di eliminare l'account direttamente tramite gli endpoint di Supabase
    let accountDeleted = false;
    
    // METODO PRINCIPALE: Usa l'API di amministrazione se abbiamo il service role key
    const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://egdpjqdsugbcoroclgys.supabase.co';
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    // Log masked keys for debugging
    console.log('URL:', supabaseUrl);
    console.log('Service Role Key Available:', !!serviceRoleKey);
    console.log('Anon Key Available:', !!supabaseAnonKey);
    
    if (serviceRoleKey) {
      console.log('Attempting admin API deletion...');
      try {
        // Crea un client admin temporaneo 
        const tempSupabaseAdmin = createClient(
          supabaseUrl,
          serviceRoleKey
        );
        
        try {
          const { error } = await tempSupabaseAdmin.auth.admin.deleteUser(userId);
          if (!error) {
            console.log('User successfully deleted via supabaseAdmin API');
            accountDeleted = true;
          } else {
            console.error('Admin API deletion failed:', error);
          }
        } catch (adminClientError) {
          console.error('Error with supabaseAdmin client:', adminClientError);
        }
        
        // Fallback: chiamata REST diretta se il client admin fallisce
        if (!accountDeleted) {
          console.log('Admin client failed, trying direct REST API call...');
          
          try {
            const adminResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`
              }
            });
            
            console.log('Admin deletion status:', adminResponse.status);
            console.log('Admin deletion headers:', JSON.stringify(Object.fromEntries([...adminResponse.headers])));
            
            if (adminResponse.ok) {
              console.log('User successfully deleted via admin API');
              accountDeleted = true;
            } else {
              const errorText = await adminResponse.text();
              console.error('Admin API deletion failed:', errorText);
            }
          } catch (fetchError) {
            console.error('Fetch error with admin API deletion:', fetchError);
          }
        }
      } catch (adminError) {
        console.error('Error with admin API deletion:', adminError);
      }
    } else {
      console.warn('No service role key available, cannot use admin API');
    }
    
    // METODO ALTERNATIVO: Tenta di eliminare l'account con il token utente
    if (!accountDeleted && accessToken) {
      console.log('Attempting user self-deletion via auth API...');
      try {
        // Assicuriamoci che la richiesta includa sia l'apikey che l'authorization token
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey || '', // Aggiungiamo l'apikey anonima
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        console.log('User self-deletion response status:', userResponse.status);
        
        if (userResponse.ok) {
          console.log('User successfully deleted via user auth API');
          accountDeleted = true;
        } else {
          const errorText = await userResponse.text();
          console.error('User API deletion failed:', errorText);
          console.log('Response status:', userResponse.status);
          console.log('Response headers:', JSON.stringify(Object.fromEntries([...userResponse.headers])));
          
          // Trying alternative method with a different endpoint structure
          console.log('Attempting alternative user deletion method...');
          
          // Try with a more complete URL that includes both auth and rest endpoints
          try {
            const alternativeResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey || '',
                'Authorization': `Bearer ${accessToken}`
              }
            });
            
            console.log('Alternative deletion response status:', alternativeResponse.status);
            
            if (alternativeResponse.ok) {
              console.log('User successfully deleted via alternative method');
              accountDeleted = true;
            } else {
              const altErrorText = await alternativeResponse.text();
              console.error('Alternative deletion failed:', altErrorText);
              
              // If none of the above methods work, try a raw REST API call with specific headers
              const rawResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseAnonKey || '',
                  'Authorization': `Bearer ${accessToken}`,
                  'Prefer': 'return=minimal'
                }
              });
              
              console.log('Raw deletion response status:', rawResponse.status);
              if (rawResponse.ok) {
                console.log('At least user data deleted via raw deletion');
                // This doesn't delete the auth account but removes related data
              }
            }
          } catch (altError) {
            console.error('Error with alternative deletion method:', altError);
          }
        }
      } catch (userError) {
        console.error('Error with user API deletion:', userError);
      }
    }
    
    // In ogni caso, puliamo i dati locali
    try {
      console.log('Resetting all local data...');
      await resetAllLocalData();
      console.log('Local data reset completed');
    } catch (resetError) {
      console.error('Error resetting local data:', resetError);
    }

    // Se non siamo riusciti a eliminare l'account con i metodi sopra
    // ma siamo arrivati a questo punto, logghiamo l'utente e lo reindirizziamo
    // in modo che debba fare di nuovo il login
    if (!accountDeleted) {
      console.warn('Could not delete user account from Supabase Auth');
      try {
        await supabase.auth.signOut();
        console.log('User signed out successfully');
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
      }
      
      // Elimina anche tutti i token di autenticazione
      try {
        await resetAuthState();
        console.log('Auth state reset successfully');
      } catch (resetError) {
        console.error('Error resetting auth state:', resetError);
      }
      
      return {
        success: false,
        error: 'Could not delete account from authentication provider, but deleted all data'
      };
    }
    
    // Procedura di pulizia finale
    try {
      // Rimuovi i token e altri dati di autenticazione
      await AsyncStorage.removeItem(SUPABASE_AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_SESSION_KEY);
      await AsyncStorage.removeItem(USER_DATA_KEY);
      console.log('Auth tokens explicitly removed');
      
      // Effettua il logout
      await supabase.auth.signOut();
      console.log('User signed out successfully');
    } catch (finalError) {
      console.error('Error in final cleanup:', finalError);
    }
    
    // Reindirizza alla pagina iniziale invece che alla login
    console.log('Redirecting to home screen after account deletion');
    try {
      // Reset completo dello stato dell'app
      await resetAppState();
      
      // Reindirizza all'onboarding o alla home iniziale per consentire una nuova registrazione
      router.replace('/');
      
      // In alternativa prova a tornare indietro alla radice dell'app
      setTimeout(() => {
        if (router) {
          router.navigate('/');
        }
      }, 500);
    } catch (navError) {
      console.error('Navigation error after account deletion:', navError);
      // Fallback: tenta di ricaricare l'app
      try {
        router.replace('/');
      } catch (e) {
        console.error('Failed to navigate to home after account deletion:', e);
      }
    }
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('Delete account error:', error);
    return {
      success: false,
      error: error.message || 'An error occurred while deleting account'
    };
  }
};

/**
 * Elimina tutti i dati locali dell'app
 * Questa funzione viene utilizzata per un reset completo senza eliminare l'account
 */
export const resetAllLocalData = async (): Promise<boolean> => {
  try {
    console.log('Iniziando il reset completo dei dati locali...');
    
    // Ottieni tutte le chiavi in AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    console.log(`Trovate ${allKeys.length} chiavi in AsyncStorage`);
    
    // Verifica se l'utente è autenticato per eseguire prima il logout
    let currentUser = null;
    try {
      currentUser = await getCurrentUser();
    } catch (e) {
      // Ignora errori qui
    }
    
    if (currentUser) {
      console.log('Utente autenticato trovato, eseguo logout...');
      try {
        await supabase.auth.signOut();
        console.log('Logout effettuato');
      } catch (logoutError) {
        console.error('Errore durante il logout:', logoutError);
        // Continua comunque con il reset
      }
    }
    
    // Pulisci le sessioni - prima rimuoviamo dati dal server se possibile
    try {
      // Utilizziamo initSessionService invece di clearAllSessions per pulizia
      await sessionServiceDirect.initSessionService();
    } catch (e) {
      // Ignora errori qui
    }
    
    // Filtra le chiavi che manteniamo (come impostazioni di lingua)
    const keysToKeep = allKeys.filter(key => 
      key.includes('language') || 
      key.includes('i18n') || 
      key.includes('locale')
    );
    
    // Filtra le chiavi da eliminare (tutte tranne quelle da mantenere)
    const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));
    
    if (keysToRemove.length > 0) {
      // Rimuovi tutte le chiavi in blocco
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`Rimosse ${keysToRemove.length} chiavi da AsyncStorage`);
    }
    
    // Reset dei profili locali tramite il servizio dedicato
    try {
      await resetLocalProfiles();
      console.log('Profili utente resettati');
    } catch (e) {
      console.error('Errore reset profili:', e);
    }
    
    console.log('Reset completo dei dati locali completato con successo');
    
    // Riporta lo stato dell'app a quello iniziale
    resetAppState();
    
    return true;
  } catch (error) {
    console.error('Errore durante il reset completo dei dati locali:', error);
    return false;
  }
};

// Funzione per resettare lo stato dell'app
const resetAppState = () => {
  try {
    // Reset dello stato globale dell'app se necessario
    // Questa è una funzione di utility che può essere estesa
    // per resettare altri stati globali dell'app
    
    // Reimposta le variabili di stato globali
    // Questo dipende dall'architettura dell'app
  } catch (e) {
    console.error('Errore nel reset dello stato dell\'app:', e);
  }
};

/**
 * Resetta tutti i dati dell'utente
 */
export const resetUserData = async (): Promise<void> => {
  try {
    // Rimuovi i dati del profilo
    await AsyncStorage.removeItem(SELECTED_PROFILE_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
    
    // Importa i servizi necessari prima di usarli
    await importServices();
    
    // Resetta i profili locali
    if (profileService && profileService.resetLocalProfiles) {
      await profileService.resetLocalProfiles();
    }
    
    // Termina eventuali sessioni attive
    if (sessionService && sessionService.clearAllSessions) {
      await sessionService.clearAllSessions();
    }
    
    console.log('Dati utente ripristinati con successo');
  } catch (error) {
    console.error('Errore durante il reset dei dati utente:', error);
  }
};

// Esporta le funzioni come oggetto
export default {
  signUp,
  signIn,
  signInWithProvider,
  signOut,
  resetPassword,
  updatePassword,
  getCurrentUser,
  isAuthenticated,
  onAuthStateChange,
  saveProfileSettings,
  getProfileSettings,
  resetAuthState,
  hasCompletedProfileWizard,
  setProfileWizardCompleted,
  switchToGuestMode,
  deleteAccount,
  resetAllLocalData
}; 