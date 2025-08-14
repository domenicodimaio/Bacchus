import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  console.log("OnboardingLayout: RENDERING");
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        animationDuration: 0,
        // 🚫 SWIPE BACK COMPLETAMENTE DISABILITATO - RICHIESTA UTENTE
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
        gestureDirection: 'horizontal',
        presentation: 'modal',
      }}
    >
      <Stack.Screen
        name="profile-wizard"
        options={{
          title: "Configurazione Profilo",
          // ZERO POSSIBILITÀ DI GESTURE
          gestureEnabled: false,
          headerShown: false,
          animation: 'none',
          animationDuration: 0,
          fullScreenGestureEnabled: false,
          gestureDirection: 'horizontal',
          presentation: 'modal',
          // Previeni swipe back completamente
          headerBackVisible: false,
          headerLeft: () => null, // Rimuovi qualsiasi pulsante back
        }}
      />
      <Stack.Screen
        name="subscription-offer"
        options={{
          title: "Premium",
          gestureEnabled: false,
          headerShown: false,
          animation: 'none',
          animationDuration: 0,
          fullScreenGestureEnabled: false,
          presentation: 'modal',
        }}
      />
    </Stack>
  );
} 