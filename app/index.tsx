import { useEffect, useState, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
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

// Precarica tutte le traduzioni in modo esplicito
const preloadTranslations = async () => {
  console.log('🌐🌐🌐 [STARTUP] Precaricamento forzato delle traduzioni...');
  
  // Verifico che i file di traduzione siano stati caricati
  console.log('🌐 [STARTUP] Verifica file di traduzione:');
  console.log('🌐 [STARTUP] IT-common:', Boolean(commonIT && Object.keys(commonIT).length));
  console.log('🌐 [STARTUP] IT-settings:', Boolean(settingsIT && Object.keys(settingsIT).length));
  console.log('🌐 [STARTUP] EN-common:', Boolean(commonEN && Object.keys(commonEN).length));
  console.log('🌐 [STARTUP] EN-settings:', Boolean(settingsEN && Object.keys(settingsEN).length));
  
  // Carica la lingua dalle preferenze utente
  const currentLang = await loadLanguageFromStorage();
  console.log(`🌐 [STARTUP] Lingua caricata: ${currentLang}`);
  
  // Test traduzione
  try {
    const testIT = i18n.getFixedT('it');
    const testEN = i18n.getFixedT('en');
    
    // Test di traduzione chiavi specifiche che causavano problemi
    console.log('🌐 [STARTUP] Test traduzione IT:');
    console.log(`🌐 [STARTUP] 'settings' (IT): "${testIT('settings', { ns: 'common' })}"`);
    console.log(`🌐 [STARTUP] 'appearance' (IT): "${testIT('appearance', { ns: 'settings' })}"`);
    console.log(`🌐 [STARTUP] 'darkMode' (IT): "${testIT('darkMode', { ns: 'settings' })}"`);
    
    console.log('🌐 [STARTUP] Test traduzione EN:');
    console.log(`🌐 [STARTUP] 'settings' (EN): "${testEN('settings', { ns: 'common' })}"`);
    console.log(`🌐 [STARTUP] 'appearance' (EN): "${testEN('appearance', { ns: 'settings' })}"`);
    console.log(`🌐 [STARTUP] 'darkMode' (EN): "${testEN('darkMode', { ns: 'settings' })}"`);
    
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
    }
    
    return true;
  } catch (error) {
    console.error('🌐 [STARTUP] Errore nel test delle traduzioni:', error);
    return false;
  }
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
  
  // Riferimento per tenere traccia se abbiamo già effettuato una navigazione
  const hasNavigatedRef = useRef(false);
  
  // Animazioni
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1.5)).current;
  const logoPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  
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
        if (!translationsLoaded) return;
        
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
            
            // Riparazione database in background
            repairDatabaseSchema().then(success => {
              console.log(success 
                ? 'Schema del database verificato e riparato con successo' 
                : 'Riparazione database fallita - l\'app funzionerà in modalità offline');
            }).catch(error => {
              console.error('Eccezione nella riparazione del database:', error);
            });
          } catch (err) {
            console.log('Errore nel nascondere la splash screen', err);
          }
        }, 300);
      } catch (e) {
        console.error('Errore durante l\'inizializzazione:', e);
      }
    };
    
    initializeApp();
  }, [insets.top, height, isAuthenticated, isAuthLoading, translationsLoaded]);
  
  // Controllo dello stato di autenticazione e navigazione
  useEffect(() => {
    // Attendi che lo stato di navigazione, autenticazione e traduzioni siano pronti
    if (!navigationState?.key || isAuthLoading || !translationsLoaded) return;
    
    // Evita esecuzioni multiple
    if (hasNavigatedRef.current) return;
    
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
            });
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
  }, [navigationState?.key, isAuthLoading, isAuthenticated, router, translationsLoaded]);
  
  return (
    <View style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
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
  }
}); 