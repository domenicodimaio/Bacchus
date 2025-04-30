// Polyfill diretto per crypto.getRandomValues
import 'react-native-get-random-values';

import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { View, StyleSheet, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { ActiveProfilesProvider, useUserProfile } from './contexts/ProfileContext';
import { PurchaseProvider } from './contexts/PurchaseContext';
import { COLORS } from './constants/theme';
import { validateSupabaseConnection, restoreSession } from './lib/supabase/client';
import * as SplashScreen from 'expo-splash-screen';
import sessionService from './lib/services/session.service';
import profileService from './lib/services/profile.service';
import Constants from 'expo-constants';
import supabase from './lib/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from './lib/services/auth.service';
import Toast from 'react-native-toast-message';

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

// Chiave per lo storage
const FIRST_APP_LAUNCH_KEY = 'bacchus_first_app_launch';

// Carica le risorse prima di mostrare l'app
async function cacheResourcesAsync() {
  try {
    console.log('🔍🔍🔍 DIAGNOSTICA: Inizio cacheResourcesAsync 🔍🔍🔍');
    
    // Verifica se l'utente è autenticato
    const { data: { session } } = await supabase.auth.getSession();
    const sessionRestored = session !== null;
    
    console.log('🔍 DIAGNOSTICA: Sessione ripristinata:', sessionRestored);
    
    // Se l'utente è già autenticato all'avvio dell'app
    if (sessionRestored && session?.user) {
      try {
        const user = session.user;
        console.log('🔍 DIAGNOSTICA: Sessione utente esistente trovata, caricamento completo dei dati utente...');
        
        // Per gli utenti autenticati all'avvio, eseguiamo un'inizializzazione completa
        // Carichiamo i profili dell'utente con refresh forzato
        await profileService.getProfiles(true);
        console.log('🔍 DIAGNOSTICA: Profili utente caricati correttamente');
        
        // Questo replica esattamente quello che succede al login
        await sessionService.initSessionService(user.id);
        
        console.log('🔍 DIAGNOSTICA: Servizio sessioni inizializzato con ID utente specifico');
        
        // IMPORTANTE: Carica esplicitamente la cronologia da localStorage come avviene nel login
        // Questo passaggio è FONDAMENTALE perché è ciò che succede anche durante il login
        const userId = user.id;
        
        // Prima verifichiamo se ci sono sessioni con AsyncStorage.getAllKeys per diagnosi
        const allKeys = await AsyncStorage.getAllKeys();
        const sessionKeys = allKeys.filter(key => key.includes('session'));
        console.log(`🔍 DIAGNOSTICA: Chiavi di sessione trovate in AsyncStorage: ${sessionKeys.join(', ')}`);
        
        // Caricamento forzato della cronologia
        const { history } = await sessionService.loadSessionsFromLocalStorage(userId);
        console.log(`🔍 DIAGNOSTICA: Avvio app: caricate ${history?.length || 0} sessioni nella variabile globale`);
        
        // SOLUZIONE DEFINITIVA: Aggiorniamo esplicitamente la variabile globale sessionHistory nel service
        // Questo è il passaggio cruciale che mancava e che causava la cronologia vuota dopo il riavvio dell'app
        if (history && history.length > 0) {
          sessionService.setSessionHistory(history);
          console.log(`🔍 DIAGNOSTICA: Variabile globale sessionHistory aggiornata con ${history.length} sessioni`);
      
          // Verifica che getSessionHistory restituisca la cronologia aggiornata
          const currentHistory = sessionService.getSessionHistory();
          console.log(`🔍 DIAGNOSTICA: Verifica getSessionHistory: restituisce ${currentHistory.length} sessioni`);
          
          // Sincronizza con Supabase per sicurezza
          await sessionService.syncWithSupabase(userId);
          console.log("Sincronizzazione con Supabase completata all'avvio");
        } else {
          console.log('🔍 DIAGNOSTICA: Nessuna sessione trovata nella cronologia, verifico su Supabase...');
          // Forza la sincronizzazione con Supabase per recuperare eventuali sessioni remote
          await sessionService.syncWithSupabase(userId);
          
          // Verifica se ora abbiamo sessioni
          const currentHistory = sessionService.getSessionHistory();
          console.log(`🔍 DIAGNOSTICA: Verifica getSessionHistory dopo syncWithSupabase: restituisce ${currentHistory.length} sessioni`);
        }
      } catch (userError) {
        console.error('🔍 DIAGNOSTICA: Errore durante il caricamento dati utente:', userError);
      }
    } else {
      // Inizializza normalmente per utenti non autenticati
    await sessionService.initSessionService();
    }
      
    return true;
  } catch (error) {
    console.error('🔍 DIAGNOSTICA: Errore durante il caching delle risorse:', error);
    return false;
  }
}

// Mantieni visibile la splash screen
SplashScreen.preventAutoHideAsync().catch((err) => {
  console.warn('Errore prevenzione nascondimento splash screen:', err);
});

// Schermata mostrata prima che il resto dell'app si carichi
function InitialLoading() {
  return null;
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [appIsReady, setAppIsReady] = useState(false);
  
  // Inizializza l'app e carica i dati necessari
  useEffect(() => {
    async function prepare() {
      try {
        // Pre-carica le risorse prima di nascondere la splash screen
        await Promise.all([
          cacheResourcesAsync(),
          // Usiamo un timeout breve per garantire un'esperienza fluida
          new Promise(resolve => setTimeout(resolve, 600))
        ]);
      } catch (e) {
        console.warn('Errore durante la preparazione dell\'app:', e);
      } finally {
        // Al termine, impostiamo l'app come pronta
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Gestisce la transizione dalla splash screen
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      try {
        // NON facciamo nulla qui, la splash screen nativa verrà gestita dallo schermo iniziale
        // Questo consente alla nostra splash screen personalizzata di prendere il controllo
        console.log('Layout app pronto - la splash screen viene gestita dalla schermata iniziale');
      } catch (e) {
        console.warn('Errore nella gestione del layout:', e);
      }
    }
  }, [appIsReady]);

  // Controllo immediato all'avvio dell'app per reindirizzare gli utenti correttamente
  useEffect(() => {
    // Usiamo una variabile per evitare redirezioni multiple
    let hasRedirected = false;
    
    async function checkUserStatus() {
      try {
        // CRITICAL FIX: Block ALL navigation during the post-registration flow
        if (global.__BLOCK_ALL_SCREENS__ === true) {
          console.log("🔴 LAYOUT: BLOCKING ALL NAVIGATION during critical account creation flow");
          
          // Force profile wizard if needed (safety check)
          if (!pathname.includes('profile-wizard')) {
            console.log("🔴 LAYOUT: Forcing redirect to profile-wizard");
            hasRedirected = true;
            router.replace('/onboarding/profile-wizard');
          }
          
          // Skip ALL other navigation logic
          return;
        }
        
        // IMPORTANT: If redirects are being prevented, don't do ANY navigation logic
        if (global.__PREVENT_ALL_REDIRECTS__ === true) {
          console.log("LAYOUT: All redirects are being prevented, skipping navigation checks completely");
          return;
        }
        
        // Check for post-registration wizard flow - SKIP ALL OTHER CHECKS
        const showWizardAfterRegistration = global.__WIZARD_AFTER_REGISTRATION__ === true;
        if (showWizardAfterRegistration) {
          console.log("LAYOUT: Post-registration wizard flow detected, skipping navigation checks");
          
          // Only redirect to profile-wizard if not already in onboarding
          if (!pathname.includes('profile-wizard')) {
            console.log("LAYOUT: Force redirect to wizard after registration");
            hasRedirected = true;
            router.replace('/onboarding/profile-wizard');
          }
          
          // Skip all other navigation logic
          return;
        }
        
        // Se stiamo già caricando o abbiamo già fatto un redirect, non facciamo nulla
        if (hasRedirected) return;
        
        // Se stiamo mostrando la schermata di sottoscrizione, non facciamo reindirizzamenti
        if (typeof global !== 'undefined' && global.__SHOWING_SUBSCRIPTION_SCREEN__) {
          console.log("[RootLayout] Skip redirection because subscription screen is active");
          return;
        }
        
        // Se c'è un reindirizzamento post-login già in corso, non effettuare altri reindirizzamenti
        if (typeof global !== 'undefined' && global.__LOGIN_REDIRECT_IN_PROGRESS__) {
          console.log("[RootLayout] Skip redirection because login redirect is already in progress");
          return;
        }
        
        // Verifica che l'utente sia autenticato
        const isAuthenticated = await authService.isAuthenticated();
        
        if (isAuthenticated) {
          // Verifica se l'utente ha completato il wizard del profilo
          const hasCompletedWizard = await authService.hasCompletedProfileWizard();
          
          // Percorsi di onboarding
          const isOnboardingRoute = pathname.startsWith('/onboarding');
          const isDashboardRoute = pathname.startsWith('/dashboard');
          
          // Check if this is a post-registration redirect
          const isPostRegistration = global.__LOGIN_REDIRECT_IN_PROGRESS__ === true;
          
          // If we're in the middle of registration flow, only redirect to wizard if not already there
          if (isPostRegistration) {
            console.log("LAYOUT: Post-registration flow detected");
            
            // Only redirect to profile-wizard if not already in onboarding
            if (!isOnboardingRoute && !hasCompletedWizard) {
              console.log("LAYOUT: Post-registration redirect to wizard");
              hasRedirected = true;
              router.replace('/onboarding/profile-wizard');
              return;
            }
            
            // Do nothing else during post-registration flow
            return;
          }
          
          // Evita reindirizzamenti inutili se l'utente è già nella pagina corretta
          // Se l'utente deve completare il wizard, assicurati che vada alla pagina giusta
          if (!hasCompletedWizard && !isOnboardingRoute) {
            console.log("LAYOUT: Utente autenticato ma wizard non completato, redirect a /onboarding/profile-wizard");
            hasRedirected = true; // Imposta il flag prima del redirect
            router.replace('/onboarding/profile-wizard');
            return;
          }
          
          // Se l'utente ha già completato il wizard ma sta cercando di accedervi, mandalo alla dashboard
          if (hasCompletedWizard && isOnboardingRoute && !isDashboardRoute) {
            console.log("LAYOUT: Utente ha già completato il wizard, redirect alla dashboard");
            hasRedirected = true; // Imposta il flag prima del redirect
            router.replace('/dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('Error in initial auth check:', error);
      }
    }
    
    checkUserStatus();
    
    // Pulisci il flag quando il componente viene smontato
    return () => {
      hasRedirected = false;
    };
  }, [pathname]);

  if (!appIsReady) {
    return <InitialLoading />;
  }

  return (
    <GestureHandlerRootView style={styles.container} onLayout={onLayoutRootView}>
      <ThemeProvider>
        <SafeAreaProvider>
          <ToastProvider>
            <OfflineProvider>
              <AuthProvider>
                <ActiveProfilesProvider>
                  <PurchaseProvider>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        animation: 'fade',
                        contentStyle: { backgroundColor: COLORS.background },
                        // Disable swipe gesture globally
                        gestureEnabled: false,
                        // Opzione per mostrare la X di chiusura per gli screen modali
                        presentation: 'card',
                        animationDuration: 200,
                      }}
                    >
                      <StatusBar style="light" />
                      <Stack.Screen 
                        name="index" 
                        options={{ 
                          animation: 'fade',
                        }} 
                      />
                      <Stack.Screen 
                        name="auth/login"
                        options={{
                          animation: 'fade',
                        }}
                      />
                      <Stack.Screen 
                        name="dashboard/index"
                        options={{
                          animation: 'fade',
                          // Disable swipe back for main screen
                          gestureEnabled: false,
                        }}
                      />
                      <Stack.Screen 
                        name="session/index"
                        options={{
                          animation: 'fade',
                          // Disable swipe back for main screen
                          gestureEnabled: false,
                        }}
                      />
                      <Stack.Screen 
                        name="session/add-drink"
                        options={{
                          animation: 'fade',
                          // Enable gesture for sub-screens
                          gestureEnabled: true,
                        }}
                      />
                      <Stack.Screen 
                        name="session/add-food"
                        options={{
                          animation: 'fade',
                          // Enable gesture for sub-screens
                          gestureEnabled: true,
                        }}
                      />
                      <Stack.Screen 
                        name="settings/index"
                        options={{
                          animation: 'fade',
                          // Enable swipe back for settings screen
                          gestureEnabled: true,
                          gestureDirection: 'horizontal',
                        }}
                      />
                      <Stack.Screen 
                        name="settings/subscriptions"
                        options={{
                          animation: 'fade',
                          // Enable swipe back for settings screen
                          gestureEnabled: true,
                          gestureDirection: 'horizontal',
                        }}
                      />
                      <Stack.Screen 
                        name="onboarding/subscription-offer"
                        options={{
                          animation: 'fade',
                          // Disable header for premium offer screen
                          headerShown: false,
                          gestureEnabled: true,
                          gestureDirection: 'vertical',
                        }}
                      />
                      <Stack.Screen 
                        name="onboarding/profile-wizard"
                        options={{
                          animation: 'fade',
                          headerShown: false,
                          gestureEnabled: false,
                        }}
                      />
                      <Stack.Screen 
                        name="history/index"
                        options={{
                          animation: 'fade',
                          gestureEnabled: true,
                        }}
                      />
                      <Stack.Screen 
                        name="profiles/index"
                        options={{
                          animation: 'fade',
                          gestureEnabled: true,
                        }}
                      />
                    </Stack>
                    <Toast />
                  </PurchaseProvider>
                </ActiveProfilesProvider>
              </AuthProvider>
            </OfflineProvider>
          </ToastProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0c1620',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  splashImage: {
    width: '80%',
    height: '80%'
  }
}); 