/**
 * Auth Service
 * 
 * Gestisce l'autenticazione degli utenti tramite Supabase.
 * Fornisce funzioni per login, registrazione, reset della password, ecc.
 */

import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../supabase/client';
import { storeAuthState } from '../supabase/middleware';
import offlineService from './offline.service';

// Chiavi dello storage
const AUTH_STATE_KEY = 'alcoltest_auth_state';
const USER_SESSION_KEY = 'alcoltest_user_session';

/**
 * Interfaccia per le risposte di autenticazione
 */
export interface AuthResponse {
  success: boolean;
  user?: User | null;
  session?: Session | null;
  error?: string;
}

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
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (data?.session) {
      await storeAuthState(data.session);
      return {
        success: true,
        user: data.user,
        session: data.session
      };
    }
    
    return {
      success: true,
      user: data.user,
      error: 'Verification email sent. Please check your inbox.'
    };
  } catch (error: any) {
    console.error('Sign up error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to create account'
    };
  }
};

/**
 * Accede con email e password
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
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (data?.session) {
      await storeAuthState(data.session);
      return {
        success: true,
        user: data.user,
        session: data.session
      };
    }
    
    return {
      success: false,
      error: 'No session returned'
    };
  } catch (error: any) {
    console.error('Sign in error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to sign in'
    };
  }
};

/**
 * Accede con provider OAuth (Google, Apple)
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
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'alcoltest://auth/callback'
      }
    });
    
    if (error) throw error;
    
    return {
      success: true,
    };
  } catch (error: any) {
    console.error(`Sign in with ${provider} error:`, error.message);
    return {
      success: false,
      error: error.message || `Failed to sign in with ${provider}`
    };
  }
};

/**
 * Effettua il logout
 */
export const signOut = async (): Promise<AuthResponse> => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    // Rimuovi lo stato di autenticazione dal locale storage
    await AsyncStorage.removeItem(AUTH_STATE_KEY);
    await AsyncStorage.removeItem(USER_SESSION_KEY);
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('Sign out error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to sign out'
    };
  }
};

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
      redirectTo: 'alcoltest://auth/reset-password'
    });
    
    if (error) throw error;
    
    return {
      success: true,
      error: 'Password reset email sent. Please check your inbox.'
    };
  } catch (error: any) {
    console.error('Reset password error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to send password reset email'
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
    
    // Se sono fornite entrambe le password, dobbiamo prima autenticare l'utente
    if (currentPassword && newPassword) {
      // Ottieni l'email dell'utente corrente
      const user = await getCurrentUser();
      if (!user || !user.email) {
        return {
          success: false,
          error: 'User not found or email not available'
        };
      }
      
      // Riautentichiamo l'utente per verificare la password attuale
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      
      if (signInError) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }
      
      // Ora aggiorniamo la password
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      return {
        success: true,
        user: data.user
      };
    }
    // Caso in cui è specificata solo la nuova password (ad esempio dopo un reset)
    else if (newPassword) {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      return {
        success: true,
        user: data.user
      };
    }
    else {
      return {
        success: false,
        error: 'New password is required'
      };
    }
  } catch (error: any) {
    console.error('Update password error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to update password'
    };
  }
};

/**
 * Ottiene l'utente corrente
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Ottiene la sessione corrente
 */
export const getCurrentSession = async (): Promise<Session | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Get current session error:', error);
    return null;
  }
};

/**
 * Verifica se l'utente è autenticato
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getCurrentSession();
  return !!session;
};

/**
 * Imposta un listener per i cambiamenti di stato dell'autenticazione
 */
export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

export default {
  signUp,
  signIn,
  signInWithProvider,
  signOut,
  resetPassword,
  updatePassword,
  getCurrentUser,
  getCurrentSession,
  isAuthenticated,
  onAuthStateChange
}; 