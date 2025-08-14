import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import authService from '../lib/services/auth.service';

// 🔧 FIX CRITICO: Import dashboard direttamente invece di redirect
import DashboardScreen from '../dashboard/index';

export default function DashboardTab() {
  const [isReady, setIsReady] = useState(false);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;

  // 🔧 Rimosso blocco globale - NavigationHandler gestisce tutto

  useEffect(() => {
    const checkUserState = async () => {
      try {
        // Check wizard completion status
        const hasCompletedWizard = await authService.hasCompletedProfileWizard();
        if (!hasCompletedWizard) {
          return; // Don't proceed to dashboard if wizard not completed
        }
        
        // Now safe to show dashboard
        setIsReady(true);
      } catch (error) {
        console.error('Error checking user state:', error);
        setIsReady(true); // Show anyway to avoid blocking
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

  // 🔧 FIX: Render dashboard direttamente - NO PIU' REDIRECT!
  return <DashboardScreen />;
} 