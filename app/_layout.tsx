// Polyfill diretto per crypto.getRandomValues
import 'react-native-get-random-values';

import React, { useEffect, useState, useCallback, ReactNode } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { View, StyleSheet, LogBox, Text, Platform, TouchableOpacity, NativeModules } from 'react-native';
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
import { validateSupabaseConnection } from './lib/supabase/client';
import * as SplashScreen from 'expo-splash-screen';
import sessionService from './lib/services/session.service';
import profileService from './lib/services/profile.service';
import Constants from 'expo-constants';
import supabase from './lib/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from './lib/services/auth.service';
import Toast from 'react-native-toast-message';
import i18n, { ALL_NAMESPACES, SUPPORTED_LANGUAGES } from './i18n';

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

// Assicura che le traduzioni siano completamente caricate
const ensureTranslationsLoaded = async () => {
  try {
    console.log('🌐 [i18n] Assicurazione caricamento completo traduzioni');
    
    // Controlla se i18n è inizializzato
    if (!i18n.isInitialized) {
      console.log('🌐 [i18n] In attesa dell\'inizializzazione...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Forza il caricamento di tutti i namespace per entrambe le lingue
    for (const lang of SUPPORTED_LANGUAGES) {
      for (const ns of ALL_NAMESPACES) {
        try {
          // Verifica se il namespace è già caricato
          if (!i18n.hasResourceBundle(lang, ns)) {
            // Se non è caricato, tenta di caricarlo
            console.log(`🌐 [i18n] Caricamento forzato: ${lang}:${ns}`);
            
            // Aggiungi il bundle manualmente
            const data = require(`./locales/${lang}/${ns}.json`);
            i18n.addResourceBundle(lang, ns, data, true, true);
          }
        } catch (error) {
          console.error(`🌐 [i18n] Errore nel caricamento del namespace ${lang}:${ns}:`, error);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('🌐 [i18n] Errore durante la verifica delle traduzioni:', error);
    return false;
  }
};

// Carica le risorse prima di mostrare l'app
async function cacheResourcesAsync() {
  try {
    console.log('🔍 DIAGNOSTICA: Inizio cacheResourcesAsync');
    
    // Assicura che le traduzioni siano caricate
    await ensureTranslationsLoaded();
    console.log('🔍 DIAGNOSTICA: Traduzioni verificate');
    
    // Verifica basica della sessione
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('🔍 DIAGNOSTICA: Verifica sessione completata');
    } catch (sessionError) {
      console.error('🔍 DIAGNOSTICA: Errore verificando la sessione:', sessionError.message);
    }
    
    // Inizializzazione minimale
    await sessionService.initSessionService();
    console.log('🔍 DIAGNOSTICA: Servizio sessioni inizializzato');
    
    return true;
  } catch (error) {
    console.error('🔍 DIAGNOSTICA: Errore durante il caching delle risorse:', error);
    return true; // Return true anche in caso di errore per permettere all'app di continuare
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

// Definizione dei tipi per ErrorBoundary
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Semplice componente di ErrorBoundary
class CustomErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#14233B' }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Si è verificato un errore
          </Text>
          <Text style={{ color: 'white', textAlign: 'center', marginBottom: 20 }}>
            L'applicazione ha riscontrato un problema. Prova a riavviare l'app.
          </Text>
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={{ padding: 12, backgroundColor: '#00F7FF', borderRadius: 8 }}
              onPress={() => {
                try {
                  // Prova a riavviare l'app
                  if (Platform.OS === 'ios') {
                    NativeModules.DevSettings?.reload();
                  } else if (Platform.OS === 'android') {
                    const { RNReload } = NativeModules;
                    if (RNReload) {
                      RNReload.reload();
                    } else {
                      NativeModules.DevSettings?.reload();
                    }
                  }
                } catch (err) {
                  console.error('Failed to reload app:', err);
                }
              }}
            >
              <Text style={{ color: '#14233B', fontWeight: 'bold' }}>Riavvia</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return this.props.children;
  }
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
  useEffect(() => {
    const hideSplash = async () => {
      if (appIsReady) {
        try {
          // Nascondi la splash screen quando l'app è pronta
          await SplashScreen.hideAsync();
          console.log('Splash screen nascosta dal layout');
        } catch (e) {
          console.warn('Errore nella gestione splash screen:', e);
        }
      }
    };

    hideSplash();
  }, [appIsReady]);

  // Controllo immediato all'avvio dell'app per reindirizzare gli utenti correttamente
  useEffect(() => {
    // Usiamo una variabile per evitare redirezioni multiple
    let hasRedirected = false;
    
    async function checkUserStatus() {
      try {
        // Se abbiamo già eseguito un reindirizzamento, non facciamo nulla
        if (hasRedirected) return;
        
        // Verifica base che l'utente sia autenticato
        const isAuthenticated = await authService.isAuthenticated();
        console.log('LAYOUT: Stato utente verificato - autenticato:', isAuthenticated);
        
        // Reindirizzamento semplificato
        if (isAuthenticated) {
          // Se l'utente è autenticato ma sta cercando di accedere alla pagina di login, mandalo alla dashboard
          if (pathname === '/auth/login') {
            console.log('LAYOUT: Utente già autenticato, redirect alla dashboard');
            hasRedirected = true;
            router.replace('/dashboard');
          }
        } else {
          // Se l'utente non è autenticato e sta cercando di accedere a pagine protette, mandalo al login
          if (pathname !== '/' && 
              pathname !== '/auth/login' && 
              pathname !== '/auth/signup' &&
              !pathname.includes('/auth/login-diagnostic') && 
              !pathname.includes('/auth/auth-callback') &&
              !pathname.includes('/auth/login-callback')) {
            console.log('LAYOUT: Utente non autenticato, redirect al login');
            hasRedirected = true;
            router.replace('/auth/login');
          }
        }
      } catch (error) {
        console.error('Error in initial auth check:', error);
      }
    }
    
    // Attendiamo che l'app sia pronta prima di eseguire il controllo
    if (appIsReady) {
      checkUserStatus();
    }
    
    // Pulisci il flag quando il componente viene smontato
    return () => {
      hasRedirected = false;
    };
  }, [pathname, appIsReady]);

  if (!appIsReady) {
    return <InitialLoading />;
  }

  // Semplifica il rendering principale
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <SafeAreaProvider>
            <PurchaseProvider>
              <StatusBar style="light" />
              <CustomErrorBoundary>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'fade',
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />
              </CustomErrorBoundary>
            </PurchaseProvider>
          </SafeAreaProvider>
        </AuthProvider>
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