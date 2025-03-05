import React, { createContext, useState, useContext, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../lib/services/auth.service';

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
  logout: () => Promise<void>;
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
  logout: async () => {},
  resetPassword: async () => ({ success: false }),
  updatePassword: async (_, __) => ({ success: false }),
  loginWithProvider: async () => ({ success: false }),
});

export const useAuth = () => useContext(AuthContext);

// Chiave per lo storage
const USER_STORAGE_KEY = 'alcoltest_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        } else if (event === 'SIGNED_OUT') {
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

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.signIn(email, password);
      
      if (response.success && response.user) {
        const authUser: User = {
          id: response.user.id,
          email: response.user.email || '',
          name: response.user.user_metadata?.name || email.split('@')[0] || '',
        };
        
        setUser(authUser);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
        
        return { success: true };
      }
      
      return { 
        success: false, 
        error: response.error || 'Login failed' 
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      };
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
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
        
        return { success: true };
      }
      
      return { 
        success: response.success, 
        error: response.error 
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      };
    }
  };

  const logout = async () => {
    try {
      await authService.signOut();
      setUser(null);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } catch (error) {
      console.error('Logout error:', error);
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