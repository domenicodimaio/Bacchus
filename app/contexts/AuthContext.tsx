/**
 * AuthContext.tsx
 * 
 * Contesto centrale per la gestione dell'autenticazione nell'app.
 * Fornisce:
 * - Stato di autenticazione dell'utente
 * - Funzioni per login, logout, registrazione
 * - Gestione del profilo utente attivo
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as authService from '../lib/services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import * as profileService from '../lib/services/profile.service';
import * as sessionService from '../lib/services/session.service';
import { Profile } from '../types/profile';

// Tipo per il contesto di autenticazione
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<{success: boolean; error?: string; redirectTo?: string}>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<{success: boolean; error?: string; redirectTo?: string}>;
  loginWithProvider: (provider: 'google' | 'apple') => Promise<{success: boolean; error?: string}>;
  resetPassword: (email: string) => Promise<{success: boolean; error?: string}>;
  updateCurrentSession: () => Promise<void>;
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
    // Funzione per caricare i dati iniziali
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Verifica se l'utente è autenticato
        const currentUser = await authService.getCurrentUser();
        
        // Imposta lo stato di autenticazione
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          
          // Carica i profili dell'utente
          await loadUserProfiles(currentUser.id);
          
          // Verifica se l'utente ha completato la procedura guidata del profilo
          const wizardCompleted = await authService.hasCompletedProfileWizard();
          setHasCompletedProfileWizard(wizardCompleted);
          
          console.log('AuthContext: Utente autenticato con ID', currentUser.id);
        } else {
          setIsAuthenticated(false);
          console.log('AuthContext: Nessun utente autenticato');
          setProfiles([]);
          setActiveProfile(null);
        }
      } catch (error) {
        console.error('AuthContext: Errore nel caricamento dei dati iniziali:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Avvia il caricamento dei dati
    loadInitialData();
    
    // Configura il listener per i cambiamenti di stato dell'autenticazione
    const { data: authListener } = authService.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Evento di autenticazione:', event);
      
      // Aggiorna lo stato in base all'evento
      if (event === 'SIGNED_IN' && session) {
        const currentUser = session.user;
        setUser(currentUser);
        setSession(session);
        setAccessToken(session.access_token);
        setIsAuthenticated(true);
        
        await loadUserProfiles(currentUser.id);
        const wizardCompleted = await authService.hasCompletedProfileWizard();
        setHasCompletedProfileWizard(wizardCompleted);
      } 
      else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setAccessToken(null);
        setIsAuthenticated(false);
        setProfiles([]);
        setActiveProfile(null);
        setHasCompletedProfileWizard(false);
      }
    });
    
    // Rimuovi il listener quando il componente viene smontato
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);
  
  // Carica i profili dell'utente
  const loadUserProfiles = async (userId: string) => {
    try {
      console.log('AuthContext: Caricamento profili per utente', userId);
      
      // Ottieni i profili dell'utente
      const userProfiles = await profileService.getProfiles(userId);
      setProfiles(userProfiles);
      
      // Se non ci sono profili, imposta activeProfile a null
      if (!userProfiles || userProfiles.length === 0) {
        setActiveProfile(null);
        return;
      }
      
      // Ottieni il profilo attivo
      const activeProfileId = await profileService.getActiveProfileId();
      
      // Se c'è un profilo attivo, trovalo e impostalo
      if (activeProfileId) {
        const foundProfile = userProfiles.find(p => p.id === activeProfileId);
        if (foundProfile) {
          setActiveProfile(foundProfile);
        } else {
          // Se il profilo attivo non esiste più, usa il primo profilo
          setActiveProfile(userProfiles[0]);
          await profileService.setActiveProfile(userProfiles[0].id);
        }
      } else {
        // Se non c'è un profilo attivo, usa il primo profilo
        setActiveProfile(userProfiles[0]);
        await profileService.setActiveProfile(userProfiles[0].id);
      }
    } catch (error) {
      console.error('AuthContext: Errore nel caricamento dei profili:', error);
      setProfileError('Errore nel caricamento dei profili');
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
        
        // Carica i profili dell'utente
        await loadUserProfiles(result.user.id);
        
        // Verifica se l'utente ha completato la procedura guidata del profilo
        const wizardCompleted = await authService.hasCompletedProfileWizard();
        setHasCompletedProfileWizard(wizardCompleted);
        
        // Determina dove reindirizzare l'utente
        let redirectTo = '/dashboard';
        if (!wizardCompleted) {
          redirectTo = '/onboarding/profile-wizard';
        }
        
        return { success: true, redirectTo };
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
          redirectTo: result.redirectToProfileCreation ? '/onboarding/profile-wizard' : '/dashboard'
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
  
  // Funzione per il login con provider (Google, Apple)
  const loginWithProvider = async (provider: 'google' | 'apple') => {
    try {
      setIsLoading(true);
      
      // Effettua il login con provider
      const result = await authService.signInWithProvider(provider);
      
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error || `Login con ${provider} fallito` };
      }
    } catch (error: any) {
      console.error(`AuthContext: Errore durante il login con ${provider}:`, error);
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
  
  // Cambia il profilo attivo
  const handleSetActiveProfile = async (profile: Profile) => {
    try {
      await profileService.setActiveProfile(profile.id);
      setActiveProfile(profile);
    } catch (error) {
      console.error('AuthContext: Errore nell\'impostazione del profilo attivo:', error);
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

export default AuthContext; 