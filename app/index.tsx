import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { setupAuthStateListener, getStoredAuthState } from './lib/supabase/middleware';
import { useTheme } from './contexts/ThemeContext';
import { getCurrentUser } from './lib/supabase/client';
import * as profileService from './lib/services/profile.service';

/**
 * Root page - redirects to the appropriate screen based on authentication state
 */
export default function RootPage() {
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const [loading, setLoading] = useState(true);
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuthAndProfile() {
      try {
        // Verifico se l'utente è autenticato
        const user = await getCurrentUser();
        
        if (user) {
          // Utente autenticato, verifico se ha un profilo
          const profiles = profileService.getProfiles();
          
          if (profiles && profiles.length > 0) {
            // Ha almeno un profilo, redirect alla dashboard
            setRedirect('/dashboard');
          } else {
            // Autenticato ma senza profilo, redirect al wizard
            setRedirect('/onboarding/profile-wizard');
          }
        } else {
          // Non autenticato, redirect al login
          setRedirect('/login');
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        // In caso di errore, redirect al login
        setRedirect('/login');
      } finally {
        setLoading(false);
      }
    }
    
    // Setup Supabase auth state listener
    const { data: authListener } = setupAuthStateListener();
    
    // Verifica lo stato di autenticazione
    checkAuthAndProfile();
    
    // Cleanup listener on unmount
    return () => {
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Mostra un caricamento finché stiamo verificando lo stato
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Reindirizza all'URL appropriato
  return redirect ? <Redirect href={redirect as any} /> : null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 