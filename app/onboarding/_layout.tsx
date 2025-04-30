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
        // Disabilita qualsiasi interazione di navigazione
        gestureEnabled: false,
        // Usa modal con trasparenza per le schermate speciali
        presentation: 'transparentModal',
        // In teoria questo dovrebbe prevenire la chiusura automatica
        autoHideHomeIndicator: false,
        // Extra importante: setta fullScreenGestureEnabled a false su iOS
        fullScreenGestureEnabled: false,
        // Non consentire di trascinare la schermata verso il basso
        contentStyle: {
          backgroundColor: 'transparent',
        },
      }}
    >
      <Stack.Screen
        name="subscription-offer"
        options={{
          title: "Premium",
          // Disabilita tutti i gesti possibili
          gestureEnabled: false,
          headerShown: false,
          animation: 'none',
          animationDuration: 0,
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  );
} 