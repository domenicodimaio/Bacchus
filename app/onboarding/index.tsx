import { Redirect, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth, clearAllNavigationBlocks } from '../contexts/AuthContext';
import * as authService from '../lib/services/auth.service';
import { useTheme } from '../contexts/ThemeContext';

export default function OnboardingLayout() {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const [hasCompletedWizard, setHasCompletedWizard] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // CRITICAL FIX: Highest priority check - if we're in account creation mode, show ONLY the wizard
  if (global.__BLOCK_ALL_SCREENS__ === true) {
    console.log("🔴 ONBOARDING: Critical account creation flow, forcing profile wizard");
    
    // Force profile wizard with NO redirects
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="profile-wizard" options={{ gestureEnabled: false }} />
      </Stack>
    );
  }

  useEffect(() => {
    // Rivisto per garantire che gli utenti siano correttamente reindirizzati
    async function checkWizardCompletion() {
      try {
        setIsLoading(true);
        
        // Se l'utente non è autenticato o è in corso l'autenticazione, non fare nulla
        if (isAuthLoading || !isAuthenticated) {
          setIsLoading(false);
          return;
        }
        
        // Verifica se l'utente ha completato il wizard
        const completed = await authService.hasCompletedProfileWizard();
        console.log('Wizard completion check:', completed);
        
        // Aggiorniamo lo stato solo se il valore è cambiato
        // per evitare render/reindirizzamenti non necessari
        if (hasCompletedWizard !== completed) {
          setHasCompletedWizard(completed);
        }
        
        // Log per debugging
        if (completed) {
          console.log('Utente ha già completato il wizard');
        } else {
          console.log('Utente NON ha completato il wizard, dovrebbe essere reindirizzato');
        }
      } catch (error) {
        console.error('Error checking wizard completion:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkWizardCompletion();
  }, [isAuthenticated, isAuthLoading, user]);

  // VERY IMPORTANT: If we're in post-registration flow, we should NEVER redirect away from the wizard
  if (global.__WIZARD_AFTER_REGISTRATION__ === true) {
    console.log("ONBOARDING: In post-registration wizard flow, forcing wizard");
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="profile-wizard" options={{ gestureEnabled: false }} />
      </Stack>
    );
  }

  // Mostra un indicatore di caricamento durante la verifica
  if (isLoading || isAuthLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Se l'utente non è autenticato, reindirizza alla pagina di login
  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  // Se l'utente è autenticato ma non ha completato il wizard, manda al wizard
  if (isAuthenticated && hasCompletedWizard === false) {
    return <Redirect href="/onboarding/profile-wizard" />;
  }

  // Se l'utente è autenticato e ha completato il wizard, reindirizza alla dashboard
  if (isAuthenticated && hasCompletedWizard === true) {
    // Make sure to clear any navigation blocks before redirecting to dashboard
    clearAllNavigationBlocks();
    // 🔧 FIX CRITICO: Usa il percorso tabs invece del percorso standalone che causa conflitti
    return <Redirect href="/(tabs)/dashboard" />;
  }

  // Default: mostra il layout normale
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="profile-wizard" options={{ gestureEnabled: false }} />
    </Stack>
  );
} 