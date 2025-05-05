import { useEffect, useState, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions, Animated, Easing, Text, ScrollView } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from './contexts/AuthContext';
import * as authService from './lib/services/auth.service';
import * as profileService from './lib/services/profile.service';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { repairDatabaseSchema } from './lib/supabase/repair-schema';
import Ionicons from '@expo/vector-icons/Ionicons';
// Importazione diretta delle risorse di traduzione per forzare il loro caricamento
import i18n from './i18n';
import { loadLanguageFromStorage } from './i18n';
// Importazione esplicita dei file di traduzione per garantire che vengano inclusi nel bundle
import commonIT from './locales/it/common.json';
import commonEN from './locales/en/common.json';
import sessionIT from './locales/it/session.json';
import sessionEN from './locales/en/session.json';
import profileIT from './locales/it/profile.json';
import profileEN from './locales/en/profile.json';
import settingsIT from './locales/it/settings.json';
import settingsEN from './locales/en/settings.json';
import authIT from './locales/it/auth.json';
import authEN from './locales/en/auth.json';
import dashboardIT from './locales/it/dashboard.json';
import dashboardEN from './locales/en/dashboard.json';
import purchasesIT from './locales/it/purchases.json';
import purchasesEN from './locales/en/purchases.json';

/**
 * PAGINA INIZIALE DELL'APP
 * 
 * Questa pagina determina dove indirizzare l'utente in base allo stato di autenticazione:
 * - Utente non autenticato -> Login (con splash screen)
 * - Utente autenticato ma senza profilo -> Wizard creazione profilo
 * - Utente autenticato con profilo -> Dashboard (direttamente)
 */

// Mantieni la splash screen visibile
ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  console.log('Errore nella prevenzione della chiusura automatica della splash screen');
});

// Sistema di debug globale
const DEBUG_LOGS = [];
const MAX_LOGS = 50;

// Funzione globale di debug
global.debugLog = (message, type = 'info') => {
  const timestamp = new Date().toISOString().substring(11, 23);
  const logEntry = { 
    timestamp, 
    message: typeof message === 'object' ? JSON.stringify(message) : message,
    type 
  };
  
  // Aggiungi al buffer circolare
  DEBUG_LOGS.push(logEntry);
  if (DEBUG_LOGS.length > MAX_LOGS) {
    DEBUG_LOGS.shift();
  }
  
  // Log anche nella console nativa
  if (type === 'error') {
    console.error(`${timestamp} [${type}] ${logEntry.message}`);
  } else {
    console.log(`${timestamp} [${type}] ${logEntry.message}`);
  }
  
  return logEntry;
};

// Override di console.error globale per catturare tutti gli errori
const originalConsoleError = console.error;
console.error = function() {
  global.debugLog(Array.from(arguments).join(' '), 'error');
  originalConsoleError.apply(console, arguments);
};

// Precarica tutte le traduzioni in modo esplicito
const preloadTranslations = async () => {
  console.log('🌐🌐🌐 [STARTUP] Precaricamento forzato delle traduzioni...');
  
  // Verifico che i file di traduzione siano stati caricati
  console.log('🌐 [STARTUP] Verifica file di traduzione:');
  console.log('🌐 [STARTUP] IT-common:', commonIT ? `OK (${Object.keys(commonIT).length} chiavi)` : 'MANCANTE');
  console.log('🌐 [STARTUP] IT-settings:', settingsIT ? `OK (${Object.keys(settingsIT).length} chiavi)` : 'MANCANTE');
  console.log('🌐 [STARTUP] EN-common:', commonEN ? `OK (${Object.keys(commonEN).length} chiavi)` : 'MANCANTE');
  console.log('🌐 [STARTUP] EN-settings:', settingsEN ? `OK (${Object.keys(settingsEN).length} chiavi)` : 'MANCANTE');
  
  // Carica la lingua dalle preferenze utente
  const currentLang = await loadLanguageFromStorage();
  console.log(`🌐 [STARTUP] Lingua caricata: ${currentLang}`);
  
  // Test traduzione
  try {
    // Verifica che i18n sia stato inizializzato correttamente
    if (!i18n || !i18n.getFixedT) {
      console.error('🌐 [STARTUP] ERRORE: i18n non è stato inizializzato correttamente');
      return true; // Continua comunque
    }
    
    const testIT = i18n.getFixedT('it');
    const testEN = i18n.getFixedT('en');
    
    // Test di traduzione chiavi specifiche che causavano problemi
    console.log('🌐 [STARTUP] Test traduzione IT:');
    console.log(`🌐 [STARTUP] 'settings' (IT): "${testIT('settings', { ns: 'common' }) || 'NON TROVATO'}"`);
    console.log(`🌐 [STARTUP] 'appearance' (IT): "${testIT('appearance', { ns: 'settings' }) || 'NON TROVATO'}"`);
    console.log(`🌐 [STARTUP] 'darkMode' (IT): "${testIT('darkMode', { ns: 'settings' }) || 'NON TROVATO'}"`);
    
    console.log('🌐 [STARTUP] Test traduzione EN:');
    console.log(`🌐 [STARTUP] 'settings' (EN): "${testEN('settings', { ns: 'common' }) || 'NON TROVATO'}"`);
    console.log(`🌐 [STARTUP] 'appearance' (EN): "${testEN('appearance', { ns: 'settings' }) || 'NON TROVATO'}"`);
    console.log(`🌐 [STARTUP] 'darkMode' (EN): "${testEN('darkMode', { ns: 'settings' }) || 'NON TROVATO'}"`);
    
    // Registra un oggetto globale per i namespace i18n caricati (per debug)
    if (typeof global !== 'undefined') {
      global.i18nResources = {
        it: { 
          common: commonIT, 
          settings: settingsIT,
          session: sessionIT,
          profile: profileIT,
          auth: authIT,
          dashboard: dashboardIT,
          purchases: purchasesIT
        },
        en: {
          common: commonEN,
          settings: settingsEN,
          session: sessionEN,
          profile: profileEN,
          auth: authEN,
          dashboard: dashboardEN,
          purchases: purchasesEN
        }
      };
      console.log('🌐 [STARTUP] Risorse di traduzione registrate nell\'oggetto globale per debug');
    }
    
  } catch (error) {
    console.error('🌐 [STARTUP] Errore nel test delle traduzioni:', error);
  }
  
  // Restituisci sempre true per permettere all'app di procedere anche in caso di errori
  console.log('🌐 [STARTUP] Inizializzazione traduzioni completata');
  return true;
};

// Colore di sfondo identico alla schermata di login
const BACKGROUND_COLOR = '#0c2348';

// Dimensioni dello schermo
const { width, height } = Dimensions.get('window');

export default function InitialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigationState = useRootNavigationState();
  const [hasNavigated, setHasNavigated] = useState(false);
  const [translationsLoaded, setTranslationsLoaded] = useState(false);
  const [showLoadingText, setShowLoadingText] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [error, setError] = useState(null);
  
  // Riferimento per tenere traccia se abbiamo già effettuato una navigazione
  const hasNavigatedRef = useRef(false);
  
  // Animazioni
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1.5)).current;
  const logoPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const loadingTextOpacity = useRef(new Animated.Value(0)).current;
  
  // Riferimento per l'animazione dell'icona di caricamento
  const loadingIconSpin = useRef(new Animated.Value(0).interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  }));
  
  // Mostra il testo di caricamento dopo un breve ritardo se le traduzioni non sono ancora pronte
  useEffect(() => {
    if (!translationsLoaded) {
      const timer = setTimeout(() => {
        setShowLoadingText(true);
        Animated.timing(loadingTextOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();
      }, 2000); // Mostra il testo dopo 2 secondi
      
      return () => clearTimeout(timer);
    }
  }, [translationsLoaded]);

  // Animazione rotazione per l'icona di caricamento
  useEffect(() => {
    if (showLoadingText && !translationsLoaded) {
      const spinValue = new Animated.Value(0);
      
      // Configura l'animazione di rotazione continua
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.linear
        })
      ).start();
      
      // Interpolazione per convertire il valore in gradi di rotazione
      const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
      });
      
      // Aggiorna lo stile dell'icona
      loadingIconSpin.current = spin;
    }
  }, [showLoadingText, translationsLoaded]);

  // Precarica traduzioni all'avvio
  useEffect(() => {
    const loadTranslations = async () => {
      const success = await preloadTranslations();
      setTranslationsLoaded(success);
    };
    
    loadTranslations();
  }, []);
  
  // Calcola la posizione finale del logo (come nella schermata di login)
  const getLogoFinalPosition = () => {
    // Il logo inizia al centro dello schermo
    const centerY = 0;
    
    // Calcola dove deve finire (nella parte superiore come nella login)
    const logoHeight = 150; // Dimensioni del logo nella login
    const logoTopMargin = insets.top + 10; // Margine superiore nella login
    
    // Calcoliamo lo spostamento necessario dal centro alla posizione finale
    const loginLogoCenter = logoTopMargin + logoHeight / 2; // Centro del logo nella login
    const screenCenter = height / 2;
    
    // Spostamento necessario (negativo = verso l'alto)
    return -(screenCenter - loginLogoCenter);
  };
  
  // Effetto per gestire l'animazione e nascondere la splash screen nativa
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Attendi che le traduzioni siano caricate prima di procedere
        if (!translationsLoaded) {
          console.log('🔄 [STARTUP] Attesa caricamento traduzioni...');
          // Aggiungiamo un timeout di sicurezza per procedere comunque dopo 3 secondi
          setTimeout(() => {
            if (!translationsLoaded) {
              console.warn('⚠️ [STARTUP] Timeout di attesa traduzioni raggiunto! Procedo comunque');
              setTranslationsLoaded(true);
            }
          }, 3000);
          return;
        }
        
        // Nascondi la splash screen nativa dopo un breve ritardo
        setTimeout(async () => {
          try {
            await ExpoSplashScreen.hideAsync();
            console.log('Splash screen nativa nascosta con successo');
            
            // Salta l'animazione se l'utente è già autenticato
            if (isAuthenticated && !isAuthLoading) {
              console.log('Utente già autenticato, salto l\'animazione della splash screen');
              return;
            }
            
            // Calcola la posizione finale del logo
            const finalPositionY = getLogoFinalPosition();
            
            // Sequenza di animazione
            Animated.sequence([
              // 1. Fade in del logo (grande e centrato)
              Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease)
              }),
              
              // 2. Pausa per ammirare il logo
              Animated.delay(800),
              
              // 3. Spostamento verso la posizione finale
              Animated.parallel([
                // Sposta il logo verso l'alto
                Animated.timing(logoPosition, {
                  toValue: { x: 0, y: finalPositionY },
                  duration: 1000,
                  useNativeDriver: true,
                  easing: Easing.inOut(Easing.cubic)
                }),
                // Riduci la dimensione
                Animated.timing(logoScale, {
                  toValue: 1.0, // Dimensione finale come nella login
                  duration: 1000,
                  useNativeDriver: true,
                  easing: Easing.inOut(Easing.cubic)
                })
              ])
            ]).start();
            
            // Riparazione database in background con gestione degli errori
            repairDatabaseSchema().then(success => {
              console.log(success 
                ? 'Schema del database verificato e riparato con successo' 
                : 'Riparazione database fallita - l\'app funzionerà in modalità offline');
            }).catch(error => {
              console.error('Eccezione nella riparazione del database:', error);
            });
          } catch (err) {
            console.error('Errore nel nascondere la splash screen', err);
            // Continua comunque con l'app anche se la splash screen non può essere nascosta
          }
        }, 300);
      } catch (e) {
        console.error('Errore durante l\'inizializzazione:', e);
        // In caso di errore, prova comunque a nascondere la splash screen e proseguire
        ExpoSplashScreen.hideAsync().catch(() => {});
        setTranslationsLoaded(true); // Forza a procedere anche in caso di errore
      }
    };
    
    initializeApp();
  }, [insets.top, height, isAuthenticated, isAuthLoading, translationsLoaded]);
  
  // Controllo dello stato di autenticazione e navigazione
  useEffect(() => {
    // Attendi che lo stato di navigazione, autenticazione e traduzioni siano pronti
    if (!navigationState?.key || isAuthLoading) return;
    
    // Aggiungiamo un timeout di sicurezza per procedere anche se le traduzioni non si caricano
    const timeoutId = setTimeout(() => {
      if (!translationsLoaded) {
        console.warn('⚠️ [STARTUP] Il caricamento delle traduzioni sta prendendo troppo tempo, procedo comunque');
        setTranslationsLoaded(true);
      }
    }, 5000); // 5 secondi di timeout
    
    // Evita esecuzioni multiple
    if (hasNavigatedRef.current) {
      clearTimeout(timeoutId);
      return;
    }
    
    // Se le traduzioni non sono ancora pronte, attendi (ma con il timeout già impostato)
    if (!translationsLoaded) {
      console.log('🔄 [STARTUP] Attendo il caricamento delle traduzioni prima di navigare...');
      return;
    }
    
    // Puliamo il timeout poiché le traduzioni sono pronte
    clearTimeout(timeoutId);
    
    const checkUserStatus = async () => {
      try {
        // IMPORTANT: If redirects are being prevented, don't do ANY navigation logic
        if (global.__PREVENT_ALL_REDIRECTS__ === true) {
          console.log("INDEX: All redirects are being prevented, skipping navigation checks completely");
          return;
        }
        
        console.log(`Stato autenticazione: ${isAuthenticated ? 'autenticato' : 'non autenticato'}`);
        console.log('Traduzioni caricate:', translationsLoaded);
        
        // Evita navigazioni multiple
        if (hasNavigatedRef.current) return;
        
        // Check if this is a post-registration redirect
        const isPostRegistration = global.__LOGIN_REDIRECT_IN_PROGRESS__ === true;
        
        // Controlla prima se ci sono flag di navigazione speciali
        // If we're in the post-registration flow, skip ALL other logic
        const showWizardAfterRegistration = global.__WIZARD_AFTER_REGISTRATION__ === true;
        
        // FIX CRITICAL: Preveniamo loop infiniti aggiungendo un controllo di sicurezza
        // Se siamo in uno stato di navigazione speciale da più di 10 secondi,
        // resettiamo tutto per evitare loop infiniti
        if (showWizardAfterRegistration) {
          const now = Date.now();
          const registrationStartTime = global.__WIZARD_START_TIME__ || 0;
          const timeElapsed = now - registrationStartTime;
          
          // Se sono passati più di 10 secondi, resettiamo lo stato
          if (timeElapsed > 10000) { // 10 secondi
            console.log('⚠️ SICUREZZA: Reset dello stato di navigazione bloccato dopo 10 secondi');
            global.__WIZARD_AFTER_REGISTRATION__ = false;
            global.__BLOCK_ALL_SCREENS__ = false;
            global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
            
            // Imposta il flag di completamento del wizard
            await authService.setProfileWizardCompleted(true);
          } else if (!registrationStartTime) {
            // Imposta l'ora di inizio solo la prima volta
            global.__WIZARD_START_TIME__ = now;
          }
        }
        
        // Se l'utente è già autenticato, naviga immediatamente senza attendere l'animazione
        if (isAuthenticated) {
          // Check for the special post-registration wizard flag
          const showWizardAfterRegistration = global.__WIZARD_AFTER_REGISTRATION__ === true;
          
          // If we're in the post-registration wizard flow, skip ALL other logic
          if (showWizardAfterRegistration) {
            console.log('IMPORTANT: Detected post-registration wizard flow, going directly to wizard');
            hasNavigatedRef.current = true;
            setHasNavigated(true);
            // Use replace to prevent back navigation
            router.replace('/onboarding/profile-wizard');
            return;
          }
          
          hasNavigatedRef.current = true;
          setHasNavigated(true);
          
          // If we're in the post-registration flow, go directly to the wizard
          if (isPostRegistration) {
            console.log(`Navigazione immediata verso wizard (post-registrazione)`);
            router.replace('/onboarding/profile-wizard');
            return;
          }
          
          // Verifica se ha completato il wizard del profilo
          authService.hasCompletedProfileWizard().then(hasCompletedWizard => {
            // Controlla se l'utente ha almeno un profilo
            profileService.getProfiles().then(profiles => {
              const hasProfiles = profiles && profiles.length > 0;
              
              // Determina dove navigare
              const destination = (!hasProfiles || !hasCompletedWizard) 
                ? '/onboarding/profile-wizard' 
                : '/dashboard';
                
              console.log(`Navigazione immediata verso: ${destination}`);
              router.replace(destination);
            }).catch(error => {
              console.error('Errore nel recuperare i profili:', error);
              // In caso di errore, vai alla dashboard (che probabilmente mostrerà un messaggio di errore)
              router.replace('/dashboard');
            });
          }).catch(error => {
            console.error('Errore nel verificare lo stato del wizard:', error);
            // In caso di errore, vai alla dashboard
            router.replace('/dashboard');
          });
          return;
        }
        
        // Per utenti non autenticati, attendi che l'animazione sia completata
        setTimeout(() => {
          if (hasNavigatedRef.current) return;
          hasNavigatedRef.current = true;
          setHasNavigated(true);
          
          console.log('Utente non autenticato -> mostra login');
          // Usa un parametro per indicare che veniamo dalla splash screen
          router.replace({
            pathname: '/auth/login',
            params: { fromSplash: 'true' }
          });
        }, 2600); // Attendi che l'animazione sia completata (800ms fade + 800ms pausa + 1000ms movimento)
      } catch (error) {
        console.error('Errore durante il controllo dello stato dell\'utente:', error);
        
        if (hasNavigatedRef.current) return;
        hasNavigatedRef.current = true;
        setHasNavigated(true);
        
        // In caso di errore, vai comunque alla login
        router.replace('/auth/login');
      }
    };
    
    checkUserStatus();
    
    // Cleanup del timeout quando l'effetto viene smontato
    return () => clearTimeout(timeoutId);
  }, [navigationState?.key, isAuthLoading, isAuthenticated, router, translationsLoaded]);
  
  // Aggiorna i log di debug ogni secondo
  useEffect(() => {
    const intervalId = setInterval(() => {
      setDebugLogs([...DEBUG_LOGS]);
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Handler per errori globali non catturati
  useEffect(() => {
    const errorHandler = (error) => {
      global.debugLog(`ERRORE NON CATTURATO: ${error}`, 'error');
      setError(error.toString());
      setShowDebugPanel(true);
    };
    
    // Aggiungi listener per errori globali (compatibile con React Native)
    const errorSubscription = (global as any).ErrorUtils ? 
      (error, isFatal) => {
        errorHandler(error);
        // Non interrompiamo il flusso normale
      } : null;
    
    if ((global as any).ErrorUtils) {
      try {
        const originalGlobalHandler = (global as any).ErrorUtils.getGlobalHandler();
        (global as any).ErrorUtils.setGlobalHandler((error, isFatal) => {
          errorHandler(error);
          originalGlobalHandler(error, isFatal);
        });
      } catch (err) {
        console.log('Non è stato possibile impostare l\'error handler globale:', err);
      }
    }
    
    return () => {
      // Cleanup se necessario
      if ((global as any).ErrorUtils && errorSubscription) {
        try {
          // Eventuale cleanup
        } catch (err) {
          // Ignora errori durante il cleanup
        }
      }
    };
  }, []);
  
  // Abilita il pannello di debug con 3 tocchi in sequenza rapida
  const lastTapTime = useRef(0);
  const tapCount = useRef(0);
  
  const handleDebugTap = () => {
    const now = Date.now();
    const delta = now - lastTapTime.current;
    
    if (delta < 500) {
      tapCount.current += 1;
      if (tapCount.current >= 3) {
        setShowDebugPanel(!showDebugPanel);
        tapCount.current = 0;
      }
    } else {
      tapCount.current = 1;
    }
    
    lastTapTime.current = now;
  };
  
  // Effetto per garantire che l'app vada sempre avanti anche in caso di problemi
  useEffect(() => {
    // Fallback estremo: dopo 10 secondi forziamo la navigazione se l'app è ancora bloccata
    const fallbackTimer = setTimeout(() => {
      // Verifica se siamo ancora nella schermata di caricamento
      if (!hasNavigated && navigationState?.key) {
        global.debugLog('⚠️ FALLBACK DI EMERGENZA: forzatura navigazione dopo timeout', 'warning');
        
        try {
          // Forza la navigazione alla login o alla dashboard
          hasNavigatedRef.current = true;
          setHasNavigated(true);
          
          if (isAuthenticated) {
            router.replace('/dashboard');
          } else {
            router.replace('/auth/login');
          }
        } catch (err) {
          global.debugLog(`Errore durante il fallback di emergenza: ${err}`, 'error');
        }
      }
    }, 10000); // 10 secondi di timeout massimo
    
    return () => clearTimeout(fallbackTimer);
  }, [hasNavigated, navigationState?.key, isAuthenticated, router]);
  
  return (
    <View 
      style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}
      onTouchStart={handleDebugTap}
    >
      {/* Mostra l'animazione del logo solo se l'utente NON è autenticato */}
      {!isAuthenticated && (
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { translateX: logoPosition.x },
                { translateY: logoPosition.y },
                { scale: logoScale }
              ],
              opacity: logoOpacity
            }
          ]}
        >
          <Image
            source={require('../assets/images/bacchus-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      )}
      
      {/* Indicatore di caricamento */}
      {showLoadingText && !translationsLoaded && (
        <Animated.View 
          style={[
            styles.loadingContainer,
            { opacity: loadingTextOpacity }
          ]}
        >
          <Animated.Text style={styles.loadingText}>
            Caricamento...
          </Animated.Text>
          {/* Icona rotante */}
          <Animated.View style={{ transform: [{ rotate: loadingIconSpin.current }] }}>
            <Ionicons name="refresh" size={24} color="#ffffff" />
          </Animated.View>
        </Animated.View>
      )}
      
      {/* Pannello di debug */}
      {showDebugPanel && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>Debug Info</Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>ERRORE CRITICO:</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <Text style={styles.debugSectionTitle}>Stati:</Text>
          <Text style={styles.debugText}>
            Autenticato: {isAuthenticated ? 'Sì' : 'No'}{'\n'}
            Caricamento Auth: {isAuthLoading ? 'Sì' : 'No'}{'\n'}
            Traduzioni caricate: {translationsLoaded ? 'Sì' : 'No'}{'\n'}
            Navigazione pronta: {navigationState?.key ? 'Sì' : 'No'}{'\n'}
            Navigazione effettuata: {hasNavigated ? 'Sì' : 'No'}{'\n'}
          </Text>
          
          <Text style={styles.debugSectionTitle}>Log (recenti):</Text>
          <ScrollView style={styles.logContainer}>
            {debugLogs.map((log, index) => (
              <Text 
                key={index} 
                style={[
                  styles.logText, 
                  log.type === 'error' && styles.logErrorText
                ]}
              >
                {log.timestamp} [{log.type}] {log.message}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center', // Centra verticalmente il contenuto
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginRight: 10,
  },
  loadingIcon: {
    transform: [{ rotate: '0deg' }],
  },
  debugPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 10,
    zIndex: 9999,
  },
  debugTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  debugSectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  logContainer: {
    flex: 1,
    marginTop: 5,
  },
  logText: {
    color: '#CCCCCC',
    fontSize: 10,
    marginBottom: 2,
  },
  logErrorText: {
    color: '#FF5555',
  },
  errorContainer: {
    backgroundColor: 'rgba(255,0,0,0.2)',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  errorTitle: {
    color: '#FF5555',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 12,
  }
}); 