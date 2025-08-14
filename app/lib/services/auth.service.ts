/**
 * Auth Service
 * 
 * Gestisce l'autenticazione degli utenti tramite Supabase.
 * Fornisce funzioni per login, registrazione, reset della password, ecc.
 */

import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase, { 
  SUPABASE_AUTH_TOKEN_KEY,
  clearStoredAuthSessions,
  validateSupabaseConnection,
  createTempClient,
  supabaseUrl
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
import * as AppleAuthentication from 'expo-apple-authentication';
import { remoteLogger, logError, logInfo } from './logging.service';
import storageService, { STORAGE_KEYS } from './storage.service';

// Variabili usate per le importazioni ritardate, per evitare dipendenze cicliche
let profileService: any = null;
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

// Chiavi per storage locale - ora usa STORAGE_KEYS centralizzato
export const USER_DATA_KEY = STORAGE_KEYS.USER_DATA;
export const USER_SESSION_KEY = STORAGE_KEYS.USER_SESSION;
export const SELECTED_PROFILE_KEY = STORAGE_KEYS.ACTIVE_PROFILE;

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
  needsEmailConfirmation?: boolean;
  isMockUser?: boolean;
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
 * VERSIONE SEMPLIFICATA SENZA RETRY AGGRESSIVO
 */
export const signUp = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    console.log('[AUTH] === INIZIO REGISTRAZIONE ===');
    console.log('[AUTH] Email:', email);
    
    // 🔧 PRODUZIONE: Timeout più lunghi e retry logic per TestFlight
    const MAX_RETRIES = 3; // Aumentato da 2 a 3
    const TIMEOUT_MS = 30000; // 30 secondi invece di 15 per TestFlight
    const CONNECTION_TIMEOUT = 8000; // 8 secondi per check connessione
    
    // Verifica connessione offline (con timeout)
    const isOffline = await Promise.race([
      offlineService.isOffline(),
      new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout connessione')), CONNECTION_TIMEOUT)
      )
    ]).catch(() => true); // Se timeout, assume offline
    
    if (isOffline) {
      return {
        success: false,
        error: 'Nessuna connessione internet disponibile'
      };
    }
    
    // Pulisci storage precedente
    await storageService.removeMultiple([
      USER_DATA_KEY,
      USER_SESSION_KEY,
      SELECTED_PROFILE_KEY,
      SUPABASE_AUTH_TOKEN_KEY,
      'bacchus_profiles',
      'bacchus_wizard_cache'
    ]);
    
    console.log('[AUTH] Storage pulito, tentativo registrazione...');
    
    // 🔧 PRODUZIONE: Registrazione con retry e timeout
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[AUTH] Tentativo registrazione ${attempt}/${MAX_RETRIES}`);
      
      try {
        // REGISTRAZIONE CON TIMEOUT ESPLICITO
        const registrationPromise = supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            emailRedirectTo: undefined // Disabilita redirect email per evitare problemi
          }
        });
        
        // 🔧 PRODUZIONE: Timeout esplicito
        const { data, error } = await Promise.race([
          registrationPromise,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout registrazione')), TIMEOUT_MS)
          )
        ]);
        
        if (error) {
          console.error(`[AUTH] Errore registrazione tentativo ${attempt}:`, error.message);
          lastError = error;
          
          // 🔧 PRODUZIONE: Retry solo per errori di rete
          if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('fetch')) {
            if (attempt < MAX_RETRIES) {
              console.log(`[AUTH] 🔄 Retry ${attempt}/${MAX_RETRIES} dopo ${attempt * 2} secondi per errore: ${error.message}`);
              await new Promise(resolve => setTimeout(resolve, attempt * 2000));
              continue;
            } else {
              console.error(`[AUTH] ❌ Tutti i ${MAX_RETRIES} tentativi falliti per errore di rete: ${error.message}`);
            }
          } else {
            console.error(`[AUTH] ❌ Errore non recuperabile al tentativo ${attempt}: ${error.message}`);
          }
          
          // Gestione errori specifica (NON retry)
          if (error.message.includes('User already registered')) {
            return {
              success: false,
              error: 'Email già registrata. Prova ad accedere invece di registrarti.'
            };
          } else if (error.message.includes('Password should be at least')) {
            return {
              success: false,
              error: 'Password troppo debole. Usa almeno 6 caratteri.'
            };
          } else if (error.message.includes('Invalid email')) {
            return {
              success: false,
              error: 'Indirizzo email non valido.'
            };
          } else if (error.message.includes('rate') || error.message.includes('limit')) {
            return {
              success: false,
              error: 'Troppe richieste. Riprova tra qualche minuto.'
            };
          } else {
            return {
              success: false,
              error: error.message || 'Errore durante la registrazione.'
            };
          }
        }
        
        // 🔧 PRODUZIONE: Verifica utente creato
        if (!data.user) {
          console.error('[AUTH] Nessun utente creato');
          return {
            success: false,
            error: 'Errore durante la creazione account.'
          };
        }
        
        console.log('[AUTH] ✅ Utente registrato:', data.user.id);
        console.log('[AUTH] Conferma email richiesta:', !data.session);
        
        // Salva i dati dell'utente
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at
        }));
        
        // Se c'è una sessione, salvala
        if (data.session) {
          await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(data.session));
          console.log('[AUTH] ✅ Sessione salvata, utente già verificato');
          
          return {
            success: true,
            user: data.user,
            session: data.session,
            redirectToProfileCreation: true,
            needsEmailConfirmation: false
          };
        } else {
          console.log('[AUTH] ✅ Registrazione completata, conferma email necessaria');
          
          return {
            success: true,
            user: data.user,
            session: null,
            redirectToProfileCreation: false,
            needsEmailConfirmation: true
          };
        }
        
      } catch (attemptError: any) {
        console.error(`[AUTH] Errore tentativo ${attempt}:`, attemptError.message);
        lastError = attemptError;
        
        // 🔧 PRODUZIONE: Retry per timeout/network
        if (attemptError.message.includes('Timeout') || attemptError.message.includes('network')) {
          if (attempt < MAX_RETRIES) {
            console.log(`[AUTH] Retry per timeout/network dopo ${attempt * 2} secondi...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          }
        }
        
        // Altri errori non fanno retry
        break;
      }
    }
    
    // 🔧 PRODUZIONE: Se arriviamo qui, tutti i tentativi sono falliti
    console.error('[AUTH] Tutti i tentativi di registrazione falliti');
    
    // Messaggi di errore più informativi per l'utente
    const errorMessage = lastError?.message || 'Errore durante la registrazione';
    console.error(`[AUTH] 🔴 Errore finale: ${errorMessage}`);
    
    if (lastError?.message?.includes('Timeout')) {
      return {
        success: false,
        error: 'La registrazione sta impiegando troppo tempo. Controlla la tua connessione internet e riprova. Se il problema persiste, riprova tra qualche minuto.'
      };
    } else if (lastError?.message?.includes('network') || lastError?.message?.includes('fetch')) {
      return {
        success: false,
        error: 'Problema di connessione al server. Verifica la tua connessione internet e riprova.'
      };
    } else if (lastError?.message?.includes('already registered')) {
      return {
        success: false,
        error: 'Questa email è già registrata. Prova ad accedere invece di registrarti.'
      };
    } else {
      return {
        success: false,
        error: `Errore durante la registrazione: ${errorMessage}. Riprova tra qualche minuto.`
      };
    }
    
  } catch (error) {
    console.error('[AUTH] Errore imprevisto durante registrazione:', error);
    
    // Gestione errori imprevisti più dettagliata
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    console.error(`[AUTH] 💥 Errore catch: ${errorMessage}`);
    
    return {
      success: false,
      error: 'Errore tecnico durante la registrazione. Verifica la tua connessione internet e riprova tra qualche minuto.'
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
    
    console.log(`🍎 AUTH: Avvio autenticazione con ${provider}...`);
    
    // Pulisci eventuali stati precedenti
    await clearStoredAuthSessions();
    
    if (provider === 'apple') {
      try {
        console.log('🍎 AUTH: Iniziando processo Apple Sign In...');
        
        // Log remoto dell'inizio del processo
        await logInfo('Apple Sign In Started', {
          provider: 'apple',
          platform: Platform.OS,
          timestamp: new Date().toISOString()
        });
        
        // Controlla se Apple Sign In è disponibile
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        console.log('🍎 AUTH: Apple Sign In disponibile:', isAvailable);
        
        if (!isAvailable) {
          await logError('Apple Sign In Not Available', null, {
            provider: 'apple',
            platform: Platform.OS,
            deviceCheck: 'failed'
          });
          
          return {
            success: false,
            error: 'Apple Sign In non è disponibile su questo dispositivo'
          };
        }
        
        console.log('🍎 AUTH: Richiesta credenziali Apple...');
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        
        console.log('🍎 AUTH: Credenziali Apple ricevute:', {
          user: credential.user,
          email: credential.email,
          hasIdentityToken: !!credential.identityToken,
          hasAuthorizationCode: !!credential.authorizationCode,
          fullName: credential.fullName
        });
        
        if (credential.identityToken) {
          console.log('🍎 AUTH: Inviando token a Supabase per autenticazione...');
          
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
            nonce: undefined,
          });
          
          console.log('🍎 AUTH: Risposta Supabase:', {
            hasUser: !!data?.user,
            hasSession: !!data?.session,
            userId: data?.user?.id,
            userEmail: data?.user?.email,
            error: error?.message
          });
          
          if (error) {
            console.error('🍎 AUTH: Errore Supabase:', error);
            
            // Analizza l'errore specifico di Supabase
            if (error.message?.includes('Invalid login')) {
              return {
                success: false,
                error: 'Il tuo account Apple non è riconosciuto. Prova prima a registrarti.'
              };
            } else if (error.message?.includes('Email not confirmed')) {
              return {
                success: false,
                error: 'Account Apple non confermato. Controlla le tue impostazioni Apple ID.'
              };
            } else if (error.message?.includes('signup')) {
              return {
                success: false,
                error: 'Primo accesso con Apple. L\'account verrà creato automaticamente.'
              };
            }
            
            throw error;
          }
          
          if (data?.session && data?.user) {
            console.log('🍎 AUTH: Login Apple completato con successo');
            
            // Salva i dati utente in AsyncStorage per offline
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
            await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(data.session));
            
            // Salva anche nel formato Supabase standard
            const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';
            const tokenKey = `sb-${projectRef}-auth-token`;
            await AsyncStorage.setItem(tokenKey, JSON.stringify(data.session));
            
            console.log('🍎 AUTH: Sessione salvata correttamente');
            
            return {
              success: true,
              data: {
                user: data.user,
                session: data.session
              }
            };
          } else {
            throw new Error('Nessuna sessione ricevuta da Supabase');
          }
        } else {
          throw new Error('Nessun token di identità ricevuto da Apple');
        }
        
      } catch (error: any) {
        console.error('🍎 AUTH: Errore dettagliato Apple:', error);
        
        // Log remoto dell'errore per debugging su TestFlight
        await logError('Apple Sign In Failed', error, {
          provider: 'apple',
          errorCode: error.code,
          errorName: error.name,
          platform: Platform.OS,
          critical: true
        });
        
        // Gestisci errori specifici di Apple
        if (error.code === 'ERR_REQUEST_CANCELED') {
          return {
            success: false,
            error: 'Accesso con Apple annullato dall\'utente'
          };
        } else if (error.code === 'ERR_REQUEST_NOT_HANDLED') {
          return {
            success: false,
            error: 'Apple Sign In non supportato su questo dispositivo'
          };
        } else if (error.code === 'ERR_REQUEST_NOT_INTERACTIVE') {
          return {
            success: false,
            error: 'Impossibile aprire Apple Sign In'
          };
        } else if (error.message?.includes('not available')) {
          return {
            success: false,
            error: 'Apple Sign In non disponibile. Assicurati di aver configurato correttamente l\'app nelle impostazioni Apple.'
          };
        } else if (error.message?.includes('invalid_request')) {
          return {
            success: false,
            error: 'Errore di configurazione Apple Sign In. Contatta il supporto.'
          };
        } else if (error.message?.includes('network')) {
          return {
            success: false,
            error: 'Errore di connessione. Verifica la tua connessione internet e riprova.'
          };
        }
        
        // Log completo per il debug
        console.error('🍎 AUTH: Errore completo Apple:', {
          message: error.message,
          code: error.code,
          name: error.name,
          stack: error.stack
        });
        
        // Altri errori
        return {
          success: false,
          error: `Errore durante l'autenticazione Apple: ${error.message || 'Errore sconosciuto'}`
        };
      }
    } else if (provider === 'google') {
      try {
        console.log('📱 AUTH: Iniziando OAuth flow Google...');
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            skipBrowserRedirect: false,
            redirectTo: 'bacchus://auth-callback'
          }
        });
        
        if (error) {
          return {
            success: false,
            error: error.message || 'Errore durante l\'autenticazione Google'
          };
        }
        
        return {
          success: false,
          error: 'oauth_in_progress',
          data: { provider: 'google' }
        };
        
      } catch (googleError: any) {
        console.error('📱 AUTH: Errore autenticazione Google:', googleError);
        return {
          success: false,
          error: `Errore Google: ${googleError.message || 'Errore sconosciuto'}`
        };
      }
    }
    
    return {
      success: false,
      error: 'Provider non supportato'
    };
  } catch (error: any) {
    console.error(`❌ AUTH: Errore generale durante il login con ${provider}:`, error);
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
  console.log('AUTH: Inizio logout immediato e sincrono');
  
  try {
    // 1. Pulisci IMMEDIATAMENTE tutti i flag globali
    if (typeof global !== 'undefined') {
      global.__WIZARD_AFTER_REGISTRATION__ = false;
      global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
      global.__PREVENT_ALL_REDIRECTS__ = false;
      global.__BLOCK_ALL_SCREENS__ = false;
      global.__SHOWING_SUBSCRIPTION_SCREEN__ = false;
    }
    
    // 2. Effettua il logout da Supabase IMMEDIATAMENTE
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('AUTH: Errore logout Supabase (continuo comunque):', error);
    }
    
    // 3. Pulisci AsyncStorage in modo sincrono
    const keysToRemove = [
      USER_DATA_KEY,
      USER_SESSION_KEY,
      SELECTED_PROFILE_KEY,
      'bacchus_wizard_cache',
      'registration_just_completed',
      'lastKnownSession',
      'activeSession',
      'bacchus_profiles',
      'bacchus_active_profile',
      'bacchus_current_profile',
      'apple_auth_in_progress',
      'apple_auth_timestamp'
    ];
    
    await AsyncStorage.multiRemove(keysToRemove);
    
    // 4. Pulisci sessioni di autenticazione
    await clearStoredAuthSessions();
    
    // 5. FORZA IMMEDIATAMENTE LA NAVIGAZIONE AL LOGIN
    const { router } = require('expo-router');
    
    // 6. Usa setTimeout(0) per forzare l'esecuzione immediata nel prossimo ciclo di eventi
    setTimeout(() => {
      console.log('AUTH: Forzando navigazione immediata al login...');
      try {
        router.replace('/auth/login');
        console.log('AUTH: Navigazione forzata completata');
      } catch (navError) {
        console.error('AUTH: Errore navigazione, riprovo...', navError);
        // Riprova con un fallback
        setTimeout(() => {
          router.push('/auth/login');
        }, 100);
      }
    }, 0);
    
    console.log('AUTH: Logout completato immediatamente');
    
    return { success: true };
  } catch (error: any) {
    console.error('AUTH: Errore durante logout:', error);
    
    // Anche in caso di errore, forza la pulizia e la navigazione
    try {
      await AsyncStorage.clear();
      
      // Forza comunque la navigazione
      const { router } = require('expo-router');
      setTimeout(() => {
        router.replace('/auth/login');
      }, 0);
    } catch (clearError) {
      console.error('AUTH: Errore pulizia di emergenza:', clearError);
    }
    
    return { success: true }; // Restituisce sempre successo per il logout
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
 * Versione SEMPLIFICATA per evitare loop
 */
export const hasCompletedProfileWizard = async (): Promise<boolean> => {
  try {
    console.log('[AUTH] Verifica completamento wizard...');
    
    // STEP 1: Controlla i flag diretti in AsyncStorage (più veloce e affidabile)
    const wizardCompleted = await AsyncStorage.getItem('profile_wizard_completed');
    const wizardCompletedAlt = await AsyncStorage.getItem('bacchus_wizard_completed');
    
    if (wizardCompleted === 'true' || wizardCompletedAlt === 'true') {
      console.log('[AUTH] ✅ Wizard completato (da AsyncStorage flag)');
      return true;
    }
    
    // STEP 2: Se non c'è flag, controlla se ci sono profili nel database
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.log('[AUTH] Utente non autenticato, wizard non completato');
      return false;
    }
    
    // STEP 3: Controlla se l'utente ha almeno un profilo nel database (RAPIDO)
    if (!(await offlineService.isOffline())) {
      try {
        console.log('[AUTH] Controllo rapido profili per utente:', currentUser.id);
        
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('user_id', currentUser.id)
          .limit(1);
        
        if (error) {
          console.error('[AUTH] Errore controllo profili:', error.message);
          return false;
        }
        
        if (profiles && profiles.length > 0) {
          console.log('[AUTH] ✅ Profilo trovato, wizard considerato completato');
          
          // Salva il flag per le prossime volte
          await AsyncStorage.setItem('profile_wizard_completed', 'true');
          return true;
        } else {
          console.log('[AUTH] Nessun profilo trovato, wizard da completare');
          return false;
        }
      } catch (dbError) {
        console.error('[AUTH] Errore controllo database:', dbError);
        return false;
      }
    }
    
    console.log('[AUTH] ❌ Wizard non completato');
    return false;
  } catch (error) {
    console.error('[AUTH] Errore verifica wizard:', error);
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
    console.log('Retrieving authentication session...');
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const userId = currentUser.id;
    
    if (!accessToken) {
      console.error('No access token available in the current session');
      return {
        success: false,
        error: 'No active session found'
      };
    }
    
    console.log('Access token retrieved, proceeding with account deletion');

    // Prima eliminiamo tutti i dati dell'utente nelle tabelle
    try {
      console.log('Deleting user data from tables...');
      
      // Elimina i profili
      const { error: profilesError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);
      
      if (profilesError) {
        console.error('Error deleting profiles:', profilesError);
      } else {
        console.log('Profiles deleted successfully');
      }
      
      // Elimina le sessioni attive
      try {
        const { error: sessionsError } = await supabase
          .from('active_sessions')
          .delete()
          .eq('user_id', userId);
        
        if (sessionsError && !sessionsError.message.includes('does not exist')) {
          console.error('Error deleting active sessions:', sessionsError);
          } else {
          console.log('Active sessions deleted successfully');
        }
      } catch (e) {
        console.warn('Error with active sessions table (might not exist):', e);
      }
      
      // Elimina la cronologia delle sessioni
      try {
        const { error: historyError } = await supabase
          .from('session_history')
          .delete()
          .eq('user_id', userId);
        
        if (historyError && !historyError.message.includes('does not exist')) {
          console.error('Error deleting session history:', historyError);
            } else {
          console.log('Session history deleted successfully');
        }
      } catch (e) {
        console.warn('Error with session history table (might not exist):', e);
      }
      
      console.log('User data deletion completed');
    } catch (error) {
      console.error('Error deleting user data:', error);
      // Continuiamo comunque con l'eliminazione dell'account
    }
    
    // Ora proviamo a eliminare l'account utente
    try {
      console.log('Deleting user account...');
      
      // ✅ CORREZIONE CRITICA: Utilizzare la vera API admin di Supabase per eliminare l'account
      // Invece di solo disabilitarlo, proviamo la vera eliminazione
      console.log('Attempting real account deletion...');
      
      // Metodo 1: Usare l'Admin API di Supabase se disponibile
      try {
        // Questo richiede che nel progetto Supabase sia abilitata l'API admin
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
        
        if (!deleteError) {
          console.log('✅ Account deleted successfully via admin API');
          await resetAllLocalData();
          await signOut();
          return { success: true };
        } else {
          console.warn('Admin delete failed, trying alternative method:', deleteError);
        }
      } catch (adminError) {
        console.warn('Admin API not available, trying alternative method:', adminError);
      }
      
      // Metodo 2: Eliminazione manuale completa se admin API non funziona
      console.log('Trying manual complete account deletion...');
      
      // Prima segna l'account come da eliminare nel metadata
      const { error: markError } = await supabase.auth.updateUser({
        data: { 
          account_deletion_requested: true, 
          deleted_at: new Date().toISOString(),
          email_backup: currentUser.email  // Backup per riferimento
        }
      });
      
      if (markError) {
        console.error('Failed to mark account for deletion:', markError);
      }
      
      // Poi tenta di eliminare usando il client edge function se disponibile
      try {
        const { data: deleteResult, error: edgeError } = await supabase.functions.invoke('delete-user', {
          body: { userId: userId }
        });
        
        if (!edgeError && deleteResult?.success) {
          console.log('✅ Account deleted successfully via edge function');
          await resetAllLocalData();
          await signOut();
          return { success: true };
        } else {
          console.warn('Edge function delete failed:', edgeError);
        }
      } catch (edgeError) {
        console.warn('Edge function not available:', edgeError);
      }
      
      // Metodo 3: Se tutto il resto fallisce, almeno logout e pulizia completa
      console.log('Account deletion not fully supported, performing logout and data cleanup...');
      
      // Esegui comunque logout e pulizia locale
      await resetAllLocalData();
      await signOut();
      
      // Informa l'utente che il logout è stato effettuato ma l'account potrebbe richiedere eliminazione manuale
      return { 
        success: true,
        error: 'partial_deletion' // Codice speciale per indicare eliminazione parziale
      };
      
    } catch (error) {
      console.error('Fatal error deleting user account:', error);
      
      // In caso di errore, almeno facciamo il logout
      await signOut();
    
    return {
        success: false,
        error: 'cannotDeleteAccount'
    };
    }
  } catch (error) {
    console.error('Fatal error in deleteAccount:', error);
    return {
      success: false,
      error: 'cannotDeleteAccount'
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