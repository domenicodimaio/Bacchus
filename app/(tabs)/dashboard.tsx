import React, { useEffect, useRef, useState } from 'react';
import { Redirect } from 'expo-router';
import * as profileService from '../lib/services/profile.service';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import authService from '../lib/services/auth.service';

export default function DashboardTab() {
  // Use a ref to track if we've already redirected
  const hasRedirectedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;

  // CRITICAL: Block dashboard from appearing during account creation
  // This completely prevents the dashboard from rendering at all
  if (global.__BLOCK_ALL_SCREENS__ === true || global.__WIZARD_AFTER_REGISTRATION__ === true) {
    console.log("🔴 Blocking dashboard from appearing during account creation flow");
    return null;
  }

  useEffect(() => {
    // Check if we're in the post-registration flow - don't show dashboard at all
    const isPostRegistration = global.__LOGIN_REDIRECT_IN_PROGRESS__ === true;
    if (isPostRegistration) {
      return;
    }
    
    const checkUserState = async () => {
      try {
        // Check wizard completion status
        const hasCompletedWizard = await authService.hasCompletedProfileWizard();
        if (!hasCompletedWizard) {
          return; // Don't proceed to dashboard if wizard not completed
        }
        
        // Verifica che l'utente abbia un profilo
        const profiles = await profileService.getProfiles();
        if (!profiles || profiles.length === 0) {
          return; // Don't proceed to dashboard if no profiles
        }
        
        // Now safe to show dashboard
        setIsReady(true);
      } catch (error) {
        console.error('Error checking user state:', error);
      }
    };
    
    checkUserState();
  }, []);

  // Show loading indicator until checks are complete
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // This tab simply redirects to the main dashboard screen
  // ma senza passare per index.tsx che potrebbe causare un nuovo login
  return <Redirect href={"/dashboard/index" as any} />;
} 