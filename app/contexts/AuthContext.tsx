import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../lib/services/auth.service';
import sessionService from '../lib/services/session.service';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import offlineService from '../lib/services/offline.service';
import profileService from '../lib/services/profile.service';

type User = {
  id: string;
  email: string;
  name?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  loginWithProvider: (provider: 'google' | 'apple') => Promise<{ success: boolean; error?: string }>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => ({ success: true }),
  resetPassword: async () => ({ success: false }),
  updatePassword: async (_, __) => ({ success: false }),
  loginWithProvider: async () => ({ success: false }),
});

export const useAuth = () => useContext(AuthContext);

// Storage keys per i dati dell'utente
const USER_STORAGE_KEY = 'bacchus_user';
const SUPABASE_AUTH_TOKEN_KEY = 'bacchus_auth_token';

/**
 * Utility function to clear all navigation blocking flags
 * This is needed to prevent infinite loops and navigation issues
 */
export const clearAllNavigationBlocks = () => {
  if (typeof global !== 'undefined') {
    console.log('AuthContext: Clearing all navigation blocking flags');
    global.__BLOCK_ALL_SCREENS__ = false;
    global.__WIZARD_AFTER_REGISTRATION__ = false;
    global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
    global.__PREVENT_ALL_REDIRECTS__ = false;
  }
};

/**
 * Utility function to prevent errors during initial auth check
 * Fixes the error: "Attempted to navigate before mounting the Root Layout component"
 */
export const safeNavigate = (router: any, path: string, options?: any) => {
  try {
    // Check if we have a router and if navigation is safe
    if (!router) {
      console.warn('Navigation not possible: router is not available');
      return false;
    }

    // Prevent navigation during initial mounting
    if (global.__PREVENT_ALL_REDIRECTS__) {
      console.warn('Navigation blocked by __PREVENT_ALL_REDIRECTS__ flag');
      return false;
    }

    // Set a temporary flag to prevent double navigation
    const tempKey = `__NAV_${Date.now()}`;
    global[tempKey] = true;

    // Use setTimeout to ensure navigation happens after all layout mounting is complete
    setTimeout(() => {
      try {
        if (global[tempKey]) {
          // Check if router.replace or router.push should be used
          const navMethod = options?.replace ? 'replace' : 'push';
          router[navMethod](path);
          console.log(`Safe navigation to ${path} successful using ${navMethod}`);
        }
        // Clean up the temporary flag
        global[tempKey] = false;
      } catch (innerErr) {
        console.error('Error during delayed navigation:', innerErr);
      }
    }, 100);

    return true;
  } catch (err) {
    console.error('Error in safeNavigate:', err);
    return false;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  // Carica l'utente e verifica la sessione all'avvio
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Prova a caricare l'utente dal local storage prima
        const userString = await AsyncStorage.getItem(USER_STORAGE_KEY);
        let cachedUser: User | null = null;
        
        if (userString) {
          cachedUser = JSON.parse(userString);
          setUser(cachedUser);
        }
        
        // Verifica se la sessione è ancora valida con Supabase
        const currentUser = await authService.getCurrentUser();
        
        if (currentUser) {
          const updatedUser: User = {
            id: currentUser.id,
            email: currentUser.email || '',
            name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || '',
          };
          
          setUser(updatedUser);
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        } else if (cachedUser) {
          // Se non c'è una sessione valida ma c'è un utente nello storage, cancellalo
          setUser(null);
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        // In caso di errore, cancella lo stato e forza il login
        setUser(null);
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
    
    // Imposta un listener per i cambiamenti di stato dell'autenticazione
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const authUser: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
          };
          
          setUser(authUser);
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
          
          // Sincronizza le sessioni con Supabase
          try {
            // Importiamo direttamente la funzione per evitare dipendenze cicliche
            const { syncWithSupabase } = require('../lib/services/session.service');
            if (syncWithSupabase && typeof syncWithSupabase === 'function') {
              console.log('Sincronizzazione sessioni dopo SIGNED_IN');
              await syncWithSupabase(session.user.id);
            } else {
              console.error('syncWithSupabase non è disponibile o non è una funzione');
            }
          } catch (syncError) {
            console.error('Errore nella sincronizzazione sessioni dopo SIGNED_IN:', syncError);
          }
        } else if (event === 'SIGNED_OUT') {
          // Cancella i dati utente dallo stato e dallo storage
          setUser(null);
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
        }
      }
    );
    
    // Cleanup della subscription quando il componente viene smontato
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      // Verifica se siamo offline
      const isOffline = await offlineService.isOffline();
      if (isOffline) {
        setIsLoading(false);
        return {
          success: false,
          error: t('cannotLoginOffline', { ns: 'auth' })
        };
      }
      
      // Esegui il login
      const response = await authService.signIn(email, password);
      
      if (!response.success || !response.user) {
        console.error('Login error:', response.error);
        setIsLoading(false);
        return {
          success: false,
          error: response.error || 'Login failed'
        };
      }
      
      // Salva i dati dell'utente
      const userData = response.user;
      const authUser: User = {
        id: userData.id,
        email: userData.email || '',
        name: userData.user_metadata?.name || userData.email?.split('@')[0] || '',
      };
      setUser(authUser);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
      
      // Salva la sessione di autenticazione se disponibile
      if (response.session) {
        await AsyncStorage.setItem(SUPABASE_AUTH_TOKEN_KEY, JSON.stringify({
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token
        }));
      }
      
      // Prima termina il login e poi esegui le sincronizzazioni in background
      setIsLoading(false);
      
      // Esegui sincronizzazioni in background
      setTimeout(async () => {
        try {
          console.log('🟢🟢🟢 DIAGNOSTICA: Inizio sincronizzazioni post-login in background 🟢🟢🟢');
          const userId = userData?.id;
          
          // Sincronizza i profili
          await profileService.syncProfiles();
          
          // Assicurati che il profilo attivo appartenga a questo utente
          const userProfiles = await profileService.getProfiles();
          if (userProfiles && userProfiles.length > 0) {
            const defaultProfile = userProfiles.find(p => p.isDefault) || userProfiles[0];
            await profileService.setCurrentUserProfile(defaultProfile);
            console.log('🟢 DIAGNOSTICA: Profilo attivo impostato dopo login:', defaultProfile.id);
          }
          
          // Sincronizza le sessioni
          if (userId) {
            console.log('🟢 DIAGNOSTICA: Avvio sincronizzazione sessioni con Supabase');
            await sessionService.syncWithSupabase(userId);
            
            // IMPORTANTE: Caricamento esplicito della cronologia dopo la sincronizzazione
            // Per garantire che sessionHistory sia sempre aggiornata
            const { history } = await sessionService.loadSessionsFromLocalStorage(userId);
            if (history && history.length > 0) {
              sessionService.setSessionHistory(history);
              console.log(`🟢 DIAGNOSTICA: Variabile globale sessionHistory aggiornata dopo login con ${history.length} sessioni`);
            }
            
            console.log('🟢 DIAGNOSTICA: Sincronizzazione sessioni completata');
          }
          
          // Verifica e ripara l'integrità delle sessioni
          await sessionService.ensureSessionIntegrity();
          
          console.log('🟢🟢🟢 DIAGNOSTICA: Sincronizzazioni post-login completate 🟢🟢🟢');
        } catch (syncError) {
          console.error('🟢 DIAGNOSTICA: Errore durante le sincronizzazioni post-login:', syncError);
        }
      }, 100);
      
      console.log('Login completato con successo');
      return { success: true };
    } catch (error) {
      console.error('Unexpected login error:', error);
      setIsLoading(false);
      return {
        success: false,
        error: t('unexpectedError', { ns: 'common' })
      };
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      setIsLoading(true);
      const response = await authService.signUp(email, password);
      
      if (response.success && response.user) {
        // Aggiorna i metadata dell'utente con il nome se fornito
        if (name) {
          await authService.updatePassword(''); // Hack per aggiornare i metadata
        }
        
        const authUser: User = {
          id: response.user.id,
          email: response.user.email || '',
          name: name || email.split('@')[0] || '',
        };
        
        setUser(authUser);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
        
        // Segna esplicitamente che l'utente NON ha completato il wizard del profilo
        // ma non forza il reindirizzamento, lasciamo che il flusso di navigazione lo faccia
        await authService.setProfileWizardCompleted(false);
        
        // Impostiamo una flag globale per evitare reindirizzamenti multipli durante il signup
        if (typeof global !== 'undefined') {
          global.__LOGIN_REDIRECT_IN_PROGRESS__ = true;
          
          // Rimuoviamo la flag dopo alcuni secondi per sicurezza
          setTimeout(() => {
            if (typeof global !== 'undefined') {
              global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
            }
          }, 5000);
        }
        
        setIsLoading(false);
        return { success: true };
      }
      
      setIsLoading(false);
      return { 
        success: response.success, 
        error: response.error 
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      setIsLoading(false);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      };
    }
  };

  const logout = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      // Controlla se l'utente attuale è un account ospite
      const currentUser = await authService.getCurrentUser();
      const isGuestAccount = !currentUser || currentUser.email?.includes('guest') || false;
      
      console.log('=== INIZIO PROCESSO DI LOGOUT COMPLETO ===');
      
      if (!isGuestAccount) {
        // Per utenti registrati, salva la sessione attiva prima del logout
        console.log('Salvataggio sessione attiva prima del logout');
        const activeSession = sessionService.getActiveSession();
        if (activeSession) {
          // Salva esplicitamente la sessione attiva nel database
          await sessionService.saveSessionToSupabase(activeSession, activeSession.isClosed ? false : true);
          
          // Salva anche tutte le sessioni della cronologia
          const histories = sessionService.getSessionHistory();
          if (histories && histories.length > 0) {
            console.log(`Salvataggio di ${histories.length} sessioni in cronologia prima del logout`);
            for (const session of histories) {
              await sessionService.saveSessionToSupabase(session, false);
            }
          }
        }
      } else {
        // Per utenti ospiti, pulisci i dati dell'ospite
        console.log('Pulizia dati ospite in corso...');
        await sessionService.clearAllSessions();
        // Rimuovi anche le chiavi di sessione degli ospiti
        await AsyncStorage.multiRemove(['guest_active_session', 'guest_session_history']);
      }
      
      console.log('=== PULIZIA RADICALE DI CACHE E STORAGE ===');
      
      // FASE 1: Pulizia dei profili
      await profileService.resetLocalProfiles();
      
      // FASE 2: Pulizia completa delle sessioni
      await sessionService.clearAllSessions();
      
      // FASE 3: Pulizia di TUTTE le chiavi di localStorage relative a utenti e sessioni
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Identifica tutte le chiavi che potrebbero contenere dati utente, profili, o sessioni
      const keysToRemove = allKeys.filter(key => 
        key.includes('user') || 
        key.includes('profile') || 
        key.includes('session') || 
        key.includes('guest') ||
        key.includes('active') ||
        key.includes('bacchus') ||
        key.includes('current')
      );
      
      if (keysToRemove.length > 0) {
        console.log(`Rimozione di ${keysToRemove.length} chiavi di localStorage:`, keysToRemove);
        await AsyncStorage.multiRemove(keysToRemove);
      }
      
      // FASE 4: Esegui il logout da Supabase
      const { error } = await authService.signOut();
      if (error) throw error;
      
      console.log('Logout effettuato con successo e cache completamente pulita');
      
      // FASE 5: Resetta lo stato
      setUser(null);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      
      // === RISOLUZIONE DEL PROBLEMA DI REINDIRIZZAMENTO ===
      // Pulizia RADICALE di tutte le flag di navigazione globali
      clearAllNavigationBlocks();
      
      // Registra un evento per assicurarci che non ci siano reindirizzamenti indesiderati
      console.log('Pulizia flag di navigazione globali completata');
      
      // Aggiungi un piccolo ritardo per garantire che tutte le operazioni siano completate
      // prima di reindirizzare alla schermata di login
      
      // FASE 6: Reindirizza direttamente alla schermata di login
      if (router) {
        setTimeout(() => {
          // Verifica nuovamente che tutte le flag siano disattivate prima di reindirizzare
          clearAllNavigationBlocks();
          console.log('Reindirizzamento alla schermata di login...');
          router.replace('/auth/login');
        }, 300); // Aumentato a 300ms per maggiore sicurezza
      }
      
      setIsLoading(false);
      return { success: true };
    } catch (error) {
      console.error('Errore durante il logout:', error);
      setIsLoading(false);
      return { 
        success: false, 
        error: error.message || 'Impossibile effettuare il logout' 
      };
    }
  };
  
  const resetPassword = async (email: string) => {
    try {
      const response = await authService.resetPassword(email);
      return {
        success: response.success,
        error: response.error
      };
    } catch (error: any) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: error.message || 'Failed to reset password'
      };
    }
  };
  
  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await authService.updatePassword(currentPassword, newPassword);
      return {
        success: response.success,
        error: response.error
      };
    } catch (error: any) {
      console.error('Update password error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update password'
      };
    }
  };
  
  const loginWithProvider = async (provider: 'google' | 'apple') => {
    try {
      const response = await authService.signInWithProvider(provider);
      return {
        success: response.success,
        error: response.error
      };
    } catch (error: any) {
      console.error(`Login with ${provider} error:`, error);
      return {
        success: false,
        error: error.message || `Failed to login with ${provider}`
      };
    }
  };

  // Migrazione dei dati da ospite a utente autenticato
  const migrateGuestDataToAuthenticatedUser = useCallback(async (userId: string) => {
    try {
      console.log('Migrazione dei dati ospite in corso...');
      
      // Fase 1: Carica i dati ospite
      const { active: guestActive, history: guestHistory } = await sessionService.loadSessionsFromLocalStorage(null);
      
      // Fase 2: Se ci sono dati ospite, migra a utente autenticato
      if (guestActive || (guestHistory && guestHistory.length > 0)) {
        console.log(`Trovati dati ospite: sessione attiva: ${!!guestActive}, sessioni nella cronologia: ${guestHistory?.length || 0}`);
        
        // Migra la sessione attiva
        if (guestActive) {
          const updatedSession = {
            ...guestActive,
            user_id: userId
          };
          await sessionService.saveSessionLocally(updatedSession, 'active');
          await sessionService.saveSessionToSupabase(updatedSession, true);
        }
        
        // Migra la cronologia
        if (guestHistory && guestHistory.length > 0) {
          const updatedHistory = guestHistory.map(session => ({
            ...session,
            user_id: userId
          }));
          
          await sessionService.saveSessionLocally(updatedHistory, 'history');
          
          // Sincronizza con Supabase
          for (const session of updatedHistory) {
            await sessionService.saveSessionToSupabase(session, false);
          }
        }
        
        // Elimina i dati ospite dopo la migrazione
        await AsyncStorage.removeItem('guest_active_session');
        await AsyncStorage.removeItem('guest_session_history');
        
        console.log('Migrazione dati ospite completata con successo');
        return true;
      } else {
        console.log('Nessun dato ospite trovato da migrare');
        return false;
      }
    } catch (error) {
      console.error('Errore durante la migrazione dei dati ospite:', error);
      return false;
    }
  }, [sessionService]);
  
  // Gestisci il cambiamento di sessione
  useEffect(() => {
    if (session && user) {
      // Se la sessione è nuova (login), migra i dati ospite
      migrateGuestDataToAuthenticatedUser(user.id)
        .then(() => {
          // Inizializza il servizio delle sessioni con l'ID utente
          if (sessionService) {
            sessionService.initSessionService(user.id);
          }
        })
        .catch(error => {
          console.error('Errore nella gestione della sessione:', error);
        });
    }
  }, [session, user, migrateGuestDataToAuthenticatedUser, sessionService]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
        resetPassword,
        updatePassword,
        loginWithProvider
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 