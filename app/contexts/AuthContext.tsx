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
          
          // 🔧 FIX CRITICO: Riattiva caricamento profili
          await loadUserProfiles(currentUser.id);
          
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
      console.log('[AUTH_CONTEXT] Evento auth:', event);
      
      try {
        if (event === 'SIGNED_IN' && session) {
          const currentUser = session.user;
          setUser(currentUser);
          setSession(session);
          setAccessToken(session.access_token);
          setIsAuthenticated(true);
          
          console.log('[AUTH_CONTEXT] ✅ Login completato per:', currentUser.email);
          
          // Controllo stato wizard semplificato
          console.log('[AUTH_CONTEXT] Controllo stato wizard...');
          
          try {
            const wizardCompleted = await authService.hasCompletedProfileWizard();
            console.log('[AUTH_CONTEXT] Wizard completato:', wizardCompleted);
            setHasCompletedProfileWizard(wizardCompleted);
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
        
        // 🔧 FIX CRITICO: Forza caricamento profili dopo login
        console.log('[AUTH_CONTEXT] Caricamento profili dopo login...');
        await loadUserProfiles(result.user.id);
        
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
      console.log(`[AUTH_CONTEXT] Inizio login ${provider}...`);
      
      // Delega TUTTO al servizio - nessuna business logic qui
      const result = await authService.signInWithProvider(provider);
      
      if (result.success) {
        console.log(`[AUTH_CONTEXT] ✅ Login ${provider} completato`);
        
        // Solo gestione stato - nessuna logica business
        if (result.user) {
          setUser(result.user);
          setIsAuthenticated(true);
          
          if (result.session) {
            setSession(result.session);
            setAccessToken(result.session.access_token);
          }
          
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
      console.error(`[AUTH_CONTEXT] Errore durante il login con ${provider}:`, error);
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