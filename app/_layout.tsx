// Polyfill diretto per crypto.getRandomValues
import 'react-native-get-random-values';

// Rimosso deviceForcePhone - non funziona

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
// Rimosso usePhoneStyles - non funziona

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
  const [dataPreloadComplete, setDataPreloadComplete] = useState(false);

  // 🚀 PRELOAD DATI CRITICI: Premium status e sessione attiva PRIMA del render UI
  useEffect(() => {
    async function preloadCriticalData() {
      if (!isAuthenticated || !user) {
        setDataPreloadComplete(true);
        return;
      }
      
      console.log('[PRELOAD] 🚀 Inizio preload dati critici per UX migliore...');
      const startTime = Date.now();
      
      try {
        // Importa i servizi necessari
        const purchaseService = await import('./lib/services/purchase.service');
        const sessionService = await import('./lib/services/session.service');
        
        // ⚡ PARALLELO: Carica premium status E sessione attiva contemporaneamente
        const [premiumResult, sessionResult] = await Promise.allSettled([
          // 1. Precarica premium status da RevenueCat
          (async () => {
            console.log('[PRELOAD] 🔑 Caricamento premium status...');
            await purchaseService.setUserForPurchases(user.id);
            await purchaseService.refreshCustomerInfo();
            const isPremium = await purchaseService.isPremium();
            console.log('[PRELOAD] ✅ Premium status:', isPremium);
            return isPremium;
          })(),
          
          // 2. Precarica sessione attiva da storage/Supabase
          (async () => {
            console.log('[PRELOAD] 📊 Caricamento sessione attiva...');
            await sessionService.syncWithSupabase(user.id);
            const session = sessionService.activeSession;
            console.log('[PRELOAD] ✅ Sessione attiva:', session ? 'Trovata' : 'Nessuna');
            return session;
          })()
        ]);
        
        // Log risultati
        if (premiumResult.status === 'fulfilled') {
          console.log('[PRELOAD] ✅ Premium precaricato:', premiumResult.value);
        } else {
          console.warn('[PRELOAD] ⚠️ Errore precaricamento premium:', premiumResult.reason);
        }
        
        if (sessionResult.status === 'fulfilled') {
          console.log('[PRELOAD] ✅ Sessione precaricata:', sessionResult.value ? 'SI' : 'NO');
        } else {
          console.warn('[PRELOAD] ⚠️ Errore precaricamento sessione:', sessionResult.reason);
        }
        
        const elapsed = Date.now() - startTime;
        console.log(`[PRELOAD] ✅ Preload completato in ${elapsed}ms`);
        
      } catch (error) {
        console.error('[PRELOAD] ❌ Errore preload dati critici:', error);
      } finally {
        // Sempre completa il preload per non bloccare l'UI
        setDataPreloadComplete(true);
      }
    }
    
    preloadCriticalData();
  }, [isAuthenticated, user]);

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
    // ⚡ BLOCCA navigazione finché preload non è completo
    if (isLoading || checkingProfile || !dataPreloadComplete) return;

    const currentPath = segments.join('/');
    console.log('[NAVIGATION] Auth:', isAuthenticated, 'Path:', currentPath, 'Preload:', dataPreloadComplete);

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
  }, [isLoading, isAuthenticated, segments, checkingProfile, dataPreloadComplete]);

  return null;
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showingSplash, setShowingSplash] = useState(true);

  // Inizializzazione minima
  useEffect(() => {
    async function prepare() {
      try {
        console.log('[LAYOUT] Preparazione app...');
        
        // Delay minimo per font loading
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('[LAYOUT] App pronta');
      } catch (e) {
        console.warn('Errore preparazione:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // ⚡ Nascondi splash SOLO dopo che appIsReady è true
  // Il preload dati avviene dentro NavigationHandler
  useEffect(() => {
    if (appIsReady) {
      // Delay minimo per garantire UI stabile
      setTimeout(() => {
        setShowingSplash(false);
        SplashScreen.hideAsync().catch(e => console.warn('Errore hide splash:', e));
      }, 500);
    }
  }, [appIsReady]);

  if (showingSplash) {
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
                      screenOptions={({ route }) => {
                        // 🔥 FIX BUG 3: Abilita swipe back SOLO per schermate specifiche
                        const routeName = route.name || '';
                        const gestureRoutes = ['session-details', 'add-drink', 'add-food', 'settings', 'profiles/edit'];
                        const shouldEnable = gestureRoutes.some(r => routeName.includes(r));
                        
                        return {
                          headerShown: false,
                          animation: 'fade',
                          contentStyle: { backgroundColor: 'transparent' },
                          gestureEnabled: shouldEnable,
                          fullScreenGestureEnabled: shouldEnable,
                          gestureDirection: 'horizontal'
                        };
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

// Rimosso PhoneLayoutWrapper - non funziona

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