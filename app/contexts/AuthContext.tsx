/**
 * AuthContext.tsx
 * 
 * Contesto centrale per la gestione dell'autenticazione nell'app.
 * Fornisce:
 * - Stato di autenticazione dell'utente
 * - Funzioni per login, logout, registrazione
 * - Gestione del profilo utente attivo
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../lib/services/auth.service';
// import * as profileService from '../lib/services/profile.service';
import * as sessionService from '../lib/services/session.service';
import { useTranslation } from 'react-i18next';

// Interfaccia temporanea per Profile
interface Profile {
  id: string;
  name: string;
  // Altri campi che potrebbero servire
  [key: string]: any;
}

// Tipo per il contesto di autenticazione
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<{success: boolean; error?: string; redirectTo?: string}>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<{success: boolean; error?: string; redirectTo?: string; needsEmailConfirmation?: boolean}>;
  loginWithProvider: (provider: 'google' | 'apple') => Promise<{success: boolean; error?: string; data?: any}>;
  resetPassword: (email: string) => Promise<{success: boolean; error?: string}>;
  updateCurrentSession: () => Promise<void>;
  deleteAccount: () => Promise<{success: boolean; error?: string}>;
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile) => void;
  profileError: string | null;
  refreshProfiles: () => Promise<void>;
  profiles: Profile[];
  updateUserData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  hasCompletedProfileWizard: boolean;
  setCompletedProfileWizard: (value: boolean) => void;
  refetchUserData: () => Promise<void>;
  migratePreviousUserData: () => Promise<void>;
}

// Creazione del contesto
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  accessToken: null,
  login: async () => ({ success: false }),
  logout: async () => {},
  signup: async () => ({ success: false }),
  loginWithProvider: async () => ({ success: false }),
  resetPassword: async () => ({ success: false }),
  updateCurrentSession: async () => {},
  deleteAccount: async () => ({ success: false }),
  activeProfile: null,
  setActiveProfile: () => {},
  profileError: null,
  refreshProfiles: async () => {},
  profiles: [],
  updateUserData: async () => {},
  clearAllData: async () => {},
  hasCompletedProfileWizard: false,
  setCompletedProfileWizard: () => {},
  refetchUserData: async () => {},
  migratePreviousUserData: async () => {}
});

// Provider del contesto di autenticazione
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { t } = useTranslation();
  
  // Stati del contesto
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [hasCompletedProfileWizard, setHasCompletedProfileWizard] = useState<boolean>(false);
  
  // Controlla lo stato di autenticazione all'avvio
  useEffect(() => {
    // Funzione per caricare i dati iniziali SEMPLIFICATA
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        console.log('[AUTH_CONTEXT] Caricamento dati iniziale semplificato...');
        
        // Controllo semplificato dello stato auth senza operazioni complesse
        const currentUser = await authService.getCurrentUser();
        
        if (currentUser) {
          console.log('[AUTH_CONTEXT] Utente trovato:', currentUser.id);
          setUser(currentUser);
          setIsAuthenticated(true);
          
          // 🔧 FIX CRITICO: Riattiva caricamento profili e sessioni
          await loadUserProfiles(currentUser.id);
          
          // 🔥 FIX PERSISTENZA CROSS-DEVICE: Sincronizza sessioni da Supabase all'avvio per caricare sessioni da altri dispositivi
          console.log('[AUTH_CONTEXT] Sincronizzazione sessioni da Supabase all\'avvio per cross-device...');
          const sessionService = require('../lib/services/session.service');
          try {
            await sessionService.syncWithSupabase(currentUser.id);
            console.log('[AUTH_CONTEXT] ✅ Sincronizzazione sessioni cross-device all\'avvio completata');
          } catch (syncError) {
            console.warn('[AUTH_CONTEXT] ⚠️ Errore sincronizzazione sessioni cross-device all\'avvio:', syncError);
            // Fallback: carica almeno le sessioni locali
            await sessionService.loadSessionHistoryFromStorage();
          }
          
          // 🔥 FIX REALTIME: Inizializza Supabase Realtime all'avvio
          console.log('[AUTH_CONTEXT] 🔴 Inizializzazione Supabase Realtime all\'avvio...');
          try {
            const realtimeService = require('../lib/services/realtime.service');
            await realtimeService.initRealtimeForUser(currentUser.id);
            console.log('[AUTH_CONTEXT] ✅ Realtime attivo all\'avvio');
          } catch (realtimeError) {
            console.warn('[AUTH_CONTEXT] ⚠️ Errore inizializzazione Realtime all\'avvio:', realtimeError);
          }
          
          // Controllo wizard semplificato
          try {
            const wizardCompleted = await authService.hasCompletedProfileWizard();
            setHasCompletedProfileWizard(wizardCompleted);
          } catch (wizardError) {
            console.log('[AUTH_CONTEXT] Errore controllo wizard, assumo non completato');
            setHasCompletedProfileWizard(false);
          }
          
        } else {
          console.log('[AUTH_CONTEXT] Nessun utente autenticato');
          setIsAuthenticated(false);
          setProfiles([]);
          setActiveProfile(null);
          setHasCompletedProfileWizard(false);
        }
      } catch (error) {
        console.error('[AUTH_CONTEXT] Errore caricamento dati iniziali:', error);
        // In caso di errore, imposta stato sicuro
        setIsAuthenticated(false);
        setUser(null);
        setProfiles([]);
        setActiveProfile(null);
        setHasCompletedProfileWizard(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Avvia il caricamento
    loadInitialData();
    
    // Listener auth semplificato
    const { data: authListener } = authService.onAuthStateChange(async (event, session) => {
      console.log('🚨 DEBUG_APPLE: onAuthStateChange evento:', event);
      console.log('[AUTH_CONTEXT] Evento auth:', event);
      
      try {
        if (event === 'SIGNED_IN' && session) {
          const currentUser = session.user;
          setUser(currentUser);
          setSession(session);
          setAccessToken(session.access_token);
          setIsAuthenticated(true);
          
          console.log('[AUTH_CONTEXT] ✅ Login completato per:', currentUser.email);
          
          // 🔥 FIX BUG 3: Ricarica i profili dopo il login
          console.log('[AUTH_CONTEXT] Ricaricamento profili dopo login...');
          await loadUserProfiles(currentUser.id);
          
          // 🔥 FIX PERSISTENZA CROSS-DEVICE: Sincronizza sessioni da Supabase per caricare sessioni da altri dispositivi
          console.log('[AUTH_CONTEXT] Sincronizzazione sessioni da Supabase per cross-device...');
          const sessionService = require('../lib/services/session.service');
          try {
            await sessionService.syncWithSupabase(currentUser.id);
            console.log('[AUTH_CONTEXT] ✅ Sincronizzazione sessioni cross-device completata');
          } catch (syncError) {
            console.warn('[AUTH_CONTEXT] ⚠️ Errore sincronizzazione sessioni cross-device:', syncError);
            // Fallback: carica almeno le sessioni locali
            await sessionService.loadSessionHistoryFromStorage();
          }
          
          // 🔥 FIX REALTIME: Inizializza Supabase Realtime per sync istantaneo
          console.log('[AUTH_CONTEXT] 🔴 Inizializzazione Supabase Realtime...');
          try {
            const realtimeService = require('../lib/services/realtime.service');
            await realtimeService.initRealtimeForUser(currentUser.id);
            console.log('[AUTH_CONTEXT] ✅ Realtime attivo - sync istantaneo abilitato');
          } catch (realtimeError) {
            console.warn('[AUTH_CONTEXT] ⚠️ Errore inizializzazione Realtime:', realtimeError);
          }
          
          // 🔥 FIX APPLE LOGIN: Controllo wizard COMPLETO per Apple Login
          console.log('🚨 DEBUG_APPLE: onAuthStateChange - Controllo wizard per Apple Login...');
          
          try {
            // Determina se è un login Apple (controlla provider metadata)
            const isAppleLogin = currentUser.app_metadata?.provider === 'apple' || 
                               currentUser.user_metadata?.iss === 'https://appleid.apple.com';
            
            console.log('🚨 DEBUG_APPLE: onAuthStateChange - isAppleLogin:', isAppleLogin);
            
            let needsWizard = false;
            
            if (isAppleLogin) {
              // 🔥 LOGICA APPLE COMPLETA: Verifica wizard flag, nuovo utente e profili
              console.log('🚨 DEBUG_APPLE: onAuthStateChange - Applicando logica Apple completa...');
              
              // 🔥 FIX: Prima controlla il flag del wizard completato
              const hasCompletedWizard = await authService.hasCompletedProfileWizard();
              
              // Controlla se ha profili validi
              const hasValidProfiles = profiles && profiles.length > 0 && 
                                     profiles.some(p => p.name && p.name.trim().length > 0);
              
              // Controlla se è account nuovo (creato negli ultimi 5 minuti)
              const accountAge = new Date().getTime() - new Date(currentUser.created_at).getTime();
              const isNewUser = accountAge < (5 * 60 * 1000); // 5 minuti
              
              console.log('🚨 DEBUG_APPLE: onAuthStateChange - Analisi:', {
                hasCompletedWizard,
                hasValidProfiles,
                profilesCount: profiles?.length || 0,
                isNewUser,
                accountAge: Math.round(accountAge / 1000) + 's'
              });
              
              // 🔥 FIX: DECISIONE WIZARD: Se NON ha completato wizard E (è nuovo utente O senza profili validi)
              needsWizard = !hasCompletedWizard && (isNewUser || !hasValidProfiles);
              
              console.log('🚨 DEBUG_APPLE: onAuthStateChange - needsWizard:', needsWizard);
            } else {
              // Per login non-Apple, usa logica semplice
              needsWizard = !(await authService.hasCompletedProfileWizard());
            }
            
            console.log('[AUTH_CONTEXT] Wizard necessario:', needsWizard);
            setHasCompletedProfileWizard(!needsWizard);
            
            // 🔥 FIX APPLE LOGIN: Se serve il wizard, naviga direttamente
            if (needsWizard) {
              console.log('🚨 DEBUG_APPLE: onAuthStateChange - Navigando al wizard...');
              const { router } = require('expo-router');
              
              // 🔧 FIX RACE CONDITION: Delay più lungo per evitare conflitti
              setTimeout(() => {
                console.log('🚨 DEBUG_APPLE: Eseguendo navigazione al wizard...');
                router.replace('/onboarding/profile-wizard');
              }, 500); // Delay più sicuro per evitare race condition
            }
          } catch (wizardError) {
            console.log('[AUTH_CONTEXT] Errore controllo wizard, assumo non completato');
            setHasCompletedProfileWizard(false);
          }
          
        } else if (event === 'SIGNED_OUT') {
          console.log('[AUTH_CONTEXT] ✅ Logout completato');
          setUser(null);
          setSession(null);
          setAccessToken(null);
          setIsAuthenticated(false);
          setProfiles([]);
          setActiveProfile(null);
          setHasCompletedProfileWizard(false);
        }
      } catch (listenerError) {
        console.error('[AUTH_CONTEXT] Errore nel listener auth:', listenerError);
      }
    });
    
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 🔧 FIX CRITICO: Implementazione completa loadUserProfiles
  const loadUserProfiles = async (userId: string) => {
    try {
      console.log('[AUTH_CONTEXT] 🔄 Caricamento profili per utente:', userId);
      
      // Carica profili dal ProfileService 
      const { getProfiles, getActiveProfile } = require('../lib/services/profile.service');
      
      // Forza refresh dei profili
      const userProfiles = await getProfiles(true);
      console.log('[AUTH_CONTEXT] ✅ Profili caricati:', userProfiles.length);
      
      setProfiles(userProfiles || []);
      
      // Carica profilo attivo
      if (userProfiles && userProfiles.length > 0) {
        const activeProfile = await getActiveProfile();
        if (activeProfile) {
          console.log('[AUTH_CONTEXT] ✅ Profilo attivo:', activeProfile.name);
          setActiveProfile(activeProfile);
        } else {
          // Se non c'è profilo attivo ma ci sono profili, usa il primo
          console.log('[AUTH_CONTEXT] ✅ Usando primo profilo come attivo');
          setActiveProfile(userProfiles[0]);
        }
      } else {
        console.log('[AUTH_CONTEXT] ⚠️ Nessun profilo trovato');
        setActiveProfile(null);
      }
      
      // Reset errore profili
      setProfileError(null);
      
    } catch (error) {
      console.error('[AUTH_CONTEXT] ❌ Errore caricamento profili:', error);
      setProfileError('Errore nel caricamento dei profili');
      // In caso di errore, non svuotare i profili esistenti
    }
  };
  
  // Funzione per aggiornare la sessione corrente
  const updateCurrentSession = async () => {
    try {
      // Ottieni l'utente corrente
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        
        // Aggiorna i profili
        await loadUserProfiles(currentUser.id);
      }
    } catch (error) {
      console.error('AuthContext: Errore nell\'aggiornamento della sessione:', error);
    }
  };
  
  // Funzione per il login
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Effettua il login
      const result = await authService.signIn(email, password);
      
      if (result.success && result.user) {
        // Login effettuato con successo
        setUser(result.user);
        
        if (result.session) {
          setSession(result.session);
          setAccessToken(result.session.access_token);
        }
        
        setIsAuthenticated(true);
        
        // 🔧 FIX CRITICO: Forza caricamento profili e sessioni dopo login
        console.log('[AUTH_CONTEXT] Caricamento profili dopo login...');
        await loadUserProfiles(result.user.id);
        
        // 🔥 FIX PERSISTENZA: Sincronizza sessioni da Supabase per cross-device
        console.log('[AUTH_CONTEXT] Sincronizzazione sessioni da Supabase...');
        const sessionService = require('../lib/services/session.service');
        await sessionService.syncWithSupabase(result.user.id);
        
        // Verifica se l'utente ha completato la procedura guidata del profilo
        const wizardCompleted = await authService.hasCompletedProfileWizard();
        setHasCompletedProfileWizard(wizardCompleted);
        
        // Non decidiamo la navigazione qui - lasciamo al NavigationHandler
        return { success: true };
      } else {
        // Login fallito
        return { success: false, error: result.error || 'Login fallito' };
      }
    } catch (error: any) {
      console.error('AuthContext: Errore durante il login:', error);
      return { success: false, error: error.message || 'Errore durante il login' };
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per il logout
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Effettua il logout
      await authService.signOut();
      
      // Resetta lo stato
      setUser(null);
      setSession(null);
      setAccessToken(null);
      setIsAuthenticated(false);
      setProfiles([]);
      setActiveProfile(null);
      setHasCompletedProfileWizard(false);
      
    } catch (error) {
      console.error('AuthContext: Errore durante il logout:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Funzione per la registrazione
  const signup = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Effettua la registrazione
      const result = await authService.signUp(email, password);
      
      if (result.success && result.user) {
        // Registrazione effettuata con successo
        setUser(result.user);
        
        if (result.session) {
          setSession(result.session);
          setAccessToken(result.session.access_token);
          setIsAuthenticated(true);
        }
        
        setHasCompletedProfileWizard(false);
        
        // Reindirizza alla creazione del profilo
        return { 
          success: true, 
          redirectTo: result.redirectToProfileCreation ? '/onboarding/profile-wizard' : '/dashboard',
          needsEmailConfirmation: result.needsEmailConfirmation
        };
      } else {
        // Registrazione fallita
        return { success: false, error: result.error || 'Registrazione fallita' };
      }
    } catch (error: any) {
      console.error('AuthContext: Errore durante la registrazione:', error);
      return { success: false, error: error.message || 'Errore durante la registrazione' };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Funzione per il login con provider (Google, Apple) - SEMPLIFICATA
  const loginWithProvider = async (provider: 'google' | 'apple') => {
    try {
      setIsLoading(true);
      console.log('🚨 DEBUG_APPLE: INIZIO loginWithProvider - QUESTO DEVE APPARIRE NEI LOG!');
      console.log(`APPLE_FLOW: [AUTH_CONTEXT] Inizio login ${provider}...`);
      
      // Delega TUTTO al servizio - nessuna business logic qui
      const result = await authService.signInWithProvider(provider);
      
      if (result.success) {
        console.log(`APPLE_FLOW: [AUTH_CONTEXT] ✅ Login ${provider} completato`);
        
        // Solo gestione stato - nessuna logica business
        if (result.user) {
          setUser(result.user);
          setIsAuthenticated(true);
          
          if (result.session) {
            setSession(result.session);
            setAccessToken(result.session.access_token);
          }
          
        // 🔥 FIX PERSISTENZA: Carica profili e sessioni dopo login con provider
        console.log('APPLE_FLOW: [AUTH_CONTEXT] Caricamento profili dopo login con provider...');
        await loadUserProfiles(result.user.id);
        
        // 🔥 FIX CRITICO APPLE: Se non ci sono profili, forza ricaricamento dal database
        if (profiles.length === 0) {
          console.log('APPLE_FLOW: [AUTH_CONTEXT] ⚠️ Nessun profilo trovato - ricaricamento forzato dal database...');
          setTimeout(async () => {
            try {
              await loadUserProfiles(result.user.id);
              console.log('APPLE_FLOW: [AUTH_CONTEXT] ✅ Ricaricamento profili completato');
            } catch (error) {
              console.error('APPLE_FLOW: [AUTH_CONTEXT] ❌ Errore ricaricamento profili:', error);
            }
          }, 2000); // Aumento a 2 secondi per permettere la sincronizzazione
        }
        
        // 🔥 FIX PERSISTENZA: Sincronizza sessioni da Supabase per cross-device
        console.log('[AUTH_CONTEXT] Sincronizzazione sessioni da Supabase...');
        const sessionService = require('../lib/services/session.service');
        await sessionService.syncWithSupabase(result.user.id);
        
        // Usa il servizio per controllare wizard (no duplicazione logica)
        try {
          const wizardCompleted = await authService.hasCompletedProfileWizard();
          setHasCompletedProfileWizard(wizardCompleted);
        } catch (error) {
          console.log(`[AUTH_CONTEXT] Errore controllo wizard, assumo non completato`);
          setHasCompletedProfileWizard(false);
        }
        }
        
        return { success: true, data: result.data };
      } else {
        console.log(`[AUTH_CONTEXT] Login ${provider} non riuscito:`, result.error);
        return { success: false, error: result.error || `Errore durante il login con ${provider}`, data: result.data };
      }
    } catch (error: any) {
      console.error(`APPLE_FLOW: [AUTH_CONTEXT] Errore durante il login con ${provider}:`, error);
      return { success: false, error: error.message || `Errore durante il login con ${provider}` };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Funzione per il reset della password
  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      
      // Effettua il reset della password
      const result = await authService.resetPassword(email);
      
      return { success: result.success, error: result.error };
    } catch (error: any) {
      console.error('AuthContext: Errore durante il reset della password:', error);
      return { success: false, error: error.message || 'Errore durante il reset della password' };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Funzione per controllare i profili dell'utente
  const refreshProfiles = async () => {
    if (user) {
      await loadUserProfiles(user.id);
    }
  };
  
  // Cambia il profilo attivo - PLACEHOLDER
  const handleSetActiveProfile = async (profile: Profile) => {
    try {
      console.log('[AUTH_CONTEXT] handleSetActiveProfile placeholder:', profile.id);
      // Per ora solo aggiorna lo stato locale
      setActiveProfile(profile);
    } catch (error) {
      console.error('[AUTH_CONTEXT] Errore nell\'impostazione del profilo attivo:', error);
    }
  };
  
  // Aggiorna i dati dell'utente
  const updateUserData = async () => {
    await updateCurrentSession();
  };
  
  // Cancella tutti i dati dell'utente
  const clearAllData = async () => {
    try {
      // Pulisci tutti i dati di sessione e profilo
      await authService.resetAuthState();
      
      // Resetta lo stato
      setUser(null);
      setSession(null);
      setAccessToken(null);
      setIsAuthenticated(false);
      setProfiles([]);
      setActiveProfile(null);
      setHasCompletedProfileWizard(false);
    } catch (error) {
      console.error('AuthContext: Errore durante la pulizia dei dati:', error);
    }
  };
  
  // Imposta lo stato del wizard del profilo
  const setCompletedProfileWizard = async (value: boolean) => {
    try {
      await authService.setProfileWizardCompleted(value);
      setHasCompletedProfileWizard(value);
    } catch (error) {
      console.error('AuthContext: Errore nell\'impostazione dello stato del wizard:', error);
    }
  };
  
  // Ricarica i dati dell'utente
  const refetchUserData = async () => {
    if (user) {
      await loadUserProfiles(user.id);
    }
  };
  
  // Funzione per migrare i dati utente precedenti
  const migratePreviousUserData = async () => {
    try {
      // Non implementato
      console.log('AuthContext: migratePreviousUserData non implementato');
    } catch (error) {
      console.error('AuthContext: Errore durante la migrazione dei dati utente:', error);
    }
  };
  
  // Funzione per eliminare l'account
  const deleteAccount = async () => {
    try {
      // Effettua la cancellazione dell'account
      const result = await authService.deleteAccount();
      
      if (result.success) {
        // Account cancellato con successo
        setUser(null);
        setSession(null);
        setAccessToken(null);
        setIsAuthenticated(false);
        setProfiles([]);
        setActiveProfile(null);
        setHasCompletedProfileWizard(false);
        
        return { success: true };
      } else {
        // Errore durante la cancellazione dell'account
        return { success: false, error: result.error || 'Errore durante la cancellazione dell\'account' };
      }
    } catch (error) {
      console.error('AuthContext: Errore durante la cancellazione dell\'account:', error);
      return { success: false, error: error.message || 'Errore durante la cancellazione dell\'account' };
    }
  };
  
  // Valore del contesto
  const value = {
        user,
        isLoading,
    isAuthenticated,
    accessToken,
        login,
        logout,
    signup,
    loginWithProvider,
        resetPassword,
    updateCurrentSession,
    deleteAccount,
    activeProfile,
    setActiveProfile: handleSetActiveProfile,
    profileError,
    refreshProfiles,
    profiles,
    updateUserData,
    clearAllData,
    hasCompletedProfileWizard,
    setCompletedProfileWizard,
    refetchUserData,
    migratePreviousUserData
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook per utilizzare il contesto di autenticazione
export const useAuth = () => useContext(AuthContext);

// Funzione utilitaria per pulire tutti i flag di navigazione
export const clearAllNavigationBlocks = () => {
  console.log('[clearAllNavigationBlocks] Pulizia di tutti i flag di navigazione...');
  
  if (typeof global !== 'undefined') {
    global.__WIZARD_AFTER_REGISTRATION__ = false;
    global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
    global.__PREVENT_ALL_REDIRECTS__ = false;
    global.__BLOCK_ALL_SCREENS__ = false;
    global.__SHOWING_SUBSCRIPTION_SCREEN__ = false;
    global.__PREVENT_AUTO_NAVIGATION__ = false;
    
    console.log('[clearAllNavigationBlocks] ✅ Tutti i flag di navigazione sono stati puliti');
  }
};

export default AuthContext; 