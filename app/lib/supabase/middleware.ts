/**
 * Supabase Auth Middleware
 * 
 * This file contains middleware functionality to handle authentication state
 * and protect routes that require authentication.
 */
import { router } from 'expo-router';
import supabase from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Key for storing authentication state
const AUTH_STATE_KEY = 'supabase_auth_state';

/**
 * Middleware to check if user is authenticated
 * Returns the user if authenticated, otherwise redirects to login
 */
export const requireAuth = async (redirectTo = '/login') => {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data.user) {
      router.replace(redirectTo as any);
      return null;
    }
    
    return data.user;
  } catch (error) {
    console.error('Auth check failed:', error);
    router.replace(redirectTo as any);
    return null;
  }
};

/**
 * Middleware to check if user is NOT authenticated
 * Redirects to specified path if already authenticated
 */
export const requireGuest = async (redirectTo = '/session') => {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (!error && data.user) {
      router.replace(redirectTo as any);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Guest check failed:', error);
    return true; // assume guest on error
  }
};

/**
 * Store authentication state
 */
export const storeAuthState = async (session: any) => {
  try {
    const serializedSession = JSON.stringify(session);
    await AsyncStorage.setItem(AUTH_STATE_KEY, serializedSession);
    return true;
  } catch (error) {
    console.error('Failed to store auth state:', error);
    return false;
  }
};

/**
 * Retrieve authentication state
 */
export const getStoredAuthState = async () => {
  try {
    const serializedSession = await AsyncStorage.getItem(AUTH_STATE_KEY);
    
    if (!serializedSession) {
      return null;
    }
    
    return JSON.parse(serializedSession);
  } catch (error) {
    console.error('Failed to retrieve auth state:', error);
    return null;
  }
};

/**
 * Clear authentication state
 */
export const clearAuthState = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_STATE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear auth state:', error);
    return false;
  }
};

/**
 * Setup auth state listener
 * This should be called on app initialization to setup auth state change listeners
 */
export const setupAuthStateListener = () => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      await storeAuthState(session);
    } else if (event === 'SIGNED_OUT') {
      await clearAuthState();
      console.log('User not authenticated, redirecting to login');
      router.replace('/auth/login' as any);
    }
  });
};

export default {
  requireAuth,
  requireGuest,
  storeAuthState,
  getStoredAuthState,
  clearAuthState,
  setupAuthStateListener
}; 