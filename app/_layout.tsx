// Polyfill diretto per crypto.getRandomValues
import 'react-native-get-random-values';

import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, StyleSheet, LogBox, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from './components/Toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import DebugConsole from './components/DebugConsole';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ActiveProfilesProvider } from './contexts/ProfileContext';
import { PurchaseProvider } from './contexts/PurchaseContext';
import { hasCompletedProfileWizard } from './lib/services/auth.service';
import './lib/services/logging.service'; // Inizializza il servizio di logging

// 🔧 FIX CRITICO: Rendi AsyncStorage globale per compatibilità
// Questo risolve "Property 'AsyncStorage' doesn't exist" in produzione
if (typeof global !== 'undefined') {
  (global as any).AsyncStorage = AsyncStorage;
}

// Ignora alcuni warning specifici
LogBox.ignoreLogs([
  'Warning: ...',
  'Non-serializable values were found in the navigation state',
  "Overwriting fontFamily style attribute preprocessor",
  "ViewPropTypes will be removed",
  "ColorPropType will be removed",
  "expo-permissions is now deprecated",
  "[react-native-gesture-handler] Seems like you're using an old API",
  "AsyncStorage has been extracted from react-native",
]);

// Mantieni visibile la splash screen
SplashScreen.preventAutoHideAsync().catch((err) => {
  console.warn('Errore splash screen:', err);
});

// Componente di navigazione che usa l'AuthContext
function NavigationHandler() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [hasProfileInDB, setHasProfileInDB] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);

  // Verifica profilo nel database quando utente è autenticato
  useEffect(() => {
    async function checkUserProfile() {
      if (!isAuthenticated || !user || checkingProfile) return;
      
      setCheckingProfile(true);
      try {
        console.log('[NAVIGATION] Controllo profilo per utente:', user.id);
        
        // Importa dinamicamente per evitare dipendenze circolari
        const supabase = (await import('./lib/supabase/client')).default;
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, name, gender, age')
          .eq('user_id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('[NAVIGATION] Errore controllo profilo:', error);
          setHasProfileInDB(false);
          return;
        }
        
        const hasValidProfile = profile && profile.name && profile.gender && profile.age;
        console.log('[NAVIGATION] Profilo trovato:', !!profile, 'Valido:', hasValidProfile);
        setHasProfileInDB(hasValidProfile);
        
      } catch (error) {
        console.error('[NAVIGATION] Errore verifica profilo:', error);
        setHasProfileInDB(false);
      } finally {
        setCheckingProfile(false);
      }
    }
    
    checkUserProfile();
  }, [isAuthenticated, user]);

  useEffect(() => {
    // 🔧 LOGICA SEMPLIFICATA: Solo redirect essenziali
    if (isLoading || checkingProfile) return;

    const currentPath = segments.join('/');
    console.log('[NAVIGATION] Auth:', isAuthenticated, 'Path:', currentPath);

    // 🚫 NON interferire mai con onboarding/wizard
    if (currentPath.includes('onboarding') || currentPath.includes('profile-wizard')) return;

    // ✅ Solo 2 regole semplici:
    // 1. Non autenticato → Login
    if (!isAuthenticated && !currentPath.startsWith('auth')) {
      console.log('[NAVIGATION] → Login (non autenticato)');
      router.replace('/auth/login');
      return;
    }
    
    // 2. Autenticato su login → Dashboard  
    if (isAuthenticated && currentPath === 'auth/login') {
      console.log('[NAVIGATION] → Dashboard (già autenticato)');
      router.replace('/(tabs)/dashboard');
      return;
    }
  }, [isLoading, isAuthenticated, segments, checkingProfile]);

  return null;
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  // Inizializzazione minima
  useEffect(() => {
    async function prepare() {
      try {
        console.log('[LAYOUT] Preparazione minima...');
        
        // Delay minimo
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('[LAYOUT] Pronto');
      } catch (e) {
        console.warn('Errore preparazione:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Nascondi splash screen quando pronto
  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(e => console.warn('Errore hide splash:', e));
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ToastProvider>
            <ErrorBoundary>
              <AuthProvider>
                <ActiveProfilesProvider>
                  <PurchaseProvider>
                    <NavigationHandler />
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        animation: 'fade',
                        contentStyle: { backgroundColor: 'transparent' },
                        // 🚫 CRITICO: DISABILITA TUTTI I SWIPE BACK - RICHIESTA UTENTE
                        gestureEnabled: false,
                        fullScreenGestureEnabled: false,
                        gestureDirection: 'horizontal',
                      }}
                    />
                    <StatusBar style="auto" />
                    <DebugConsole />
                  </PurchaseProvider>
                </ActiveProfilesProvider>
              </AuthProvider>
            </ErrorBoundary>
          </ToastProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0c2348',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
}); 