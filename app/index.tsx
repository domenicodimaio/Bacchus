import { useEffect, useState, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions, Text } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuth } from './contexts/AuthContext';
import * as authService from './lib/services/auth.service';
import * as profileService from './lib/services/profile.service';
import * as ExpoSplashScreen from 'expo-splash-screen';

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

// Colore di sfondo
const BACKGROUND_COLOR = '#0c2348';

export default function InitialScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigationState = useRootNavigationState();
  const [hasNavigated, setHasNavigated] = useState(false);
  
  // Riferimento per tenere traccia se abbiamo già effettuato una navigazione
  const hasNavigatedRef = useRef(false);
  
  // Effetto per gestire l'inizializzazione e la navigazione
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Nascondi la splash screen dopo un breve ritardo
        setTimeout(async () => {
          try {
            await ExpoSplashScreen.hideAsync();
            console.log('Splash screen nativa nascosta con successo');
          } catch (err) {
            console.log('Errore nel nascondere la splash screen', err);
          }
        }, 500);
      } catch (e) {
        console.error('Errore durante l\'inizializzazione:', e);
      }
    };
    
    initializeApp();
  }, []);
  
  // Controllo dello stato di autenticazione e navigazione
  useEffect(() => {
    // Attendi che lo stato di navigazione e autenticazione siano pronti
    if (!navigationState?.key || isAuthLoading) return;
    
    // Evita esecuzioni multiple
    if (hasNavigatedRef.current) return;
    
    const navigateUser = async () => {
      try {
        // Evita navigazioni multiple
        if (hasNavigatedRef.current) return;
        
        // Se l'utente è già autenticato, naviga immediatamente
        if (isAuthenticated) {
          hasNavigatedRef.current = true;
          setHasNavigated(true);
          
          // Verifica se ha completato il wizard del profilo
          const hasCompletedWizard = await authService.hasCompletedProfileWizard();
          const profiles = await profileService.getProfiles();
          const hasProfiles = profiles && profiles.length > 0;
          
          // Determina dove navigare
          const destination = (!hasProfiles || !hasCompletedWizard) 
            ? '/onboarding/profile-wizard' 
            : '/dashboard';
            
          console.log(`Navigazione verso: ${destination}`);
          router.replace(destination);
          return;
        }
        
        // Per utenti non autenticati
        hasNavigatedRef.current = true;
        setHasNavigated(true);
        
        console.log('Utente non autenticato -> mostra login');
        router.replace('/auth/login');
      } catch (error) {
        console.error('Errore durante il controllo dello stato dell\'utente:', error);
        
        // In caso di errore, vai comunque alla login
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          setHasNavigated(true);
          router.replace('/auth/login');
        }
      }
    };
    
    // Aggiunge un ritardo minimo di 1 secondo per assicurare che la app sia pronta
    setTimeout(() => {
      navigateUser();
    }, 1000);
  }, [navigationState?.key, isAuthLoading, isAuthenticated, router]);
  
  return (
    <View style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
      <Image
        source={require('../assets/images/bacchus-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.loadingText}>Caricamento...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
  loadingText: {
    marginTop: 20,
    color: '#FFFFFF',
    fontSize: 16,
  }
}); 