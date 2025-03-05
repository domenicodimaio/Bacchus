import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from './contexts/ThemeContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { ToastProvider } from './components/Toast';
import { LogBox, View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { COLORS } from './constants/theme';

// Ignora alcuni warning specifici
LogBox.ignoreLogs([
  'Warning: ...',
  'Non-serializable values were found in the navigation state',
]);

// Mantieni la splash screen visibile fino a quando non siamo pronti
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Nasconde la splash screen all'avvio
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <SafeAreaProvider>
          <ToastProvider>
            <OfflineProvider>
              <View style={styles.container}>
                <StatusBar style="auto" />
                <Stack 
                  screenOptions={{
                    headerShown: false,
                    animation: 'none',
                    contentStyle: { backgroundColor: COLORS.background },
                    // Disable swipe gesture globally
                    gestureEnabled: false,
                    // Opzione per mostrare la X di chiusura per gli screen modali
                    presentation: 'card',
                  }}
                >
                  <Stack.Screen 
                    name="index" 
                    options={{ 
                      animation: 'fade',
                    }} 
                  />
                  <Stack.Screen 
                    name="dashboard/index"
                    options={{
                      animation: 'none',
                      // Disable swipe back for main screen
                      gestureEnabled: false,
                    }}
                  />
                  <Stack.Screen 
                    name="session/index"
                    options={{
                      animation: 'none',
                      // Disable swipe back for main screen
                      gestureEnabled: false,
                    }}
                  />
                  <Stack.Screen 
                    name="history/index"
                    options={{
                      animation: 'none',
                      // Disable swipe back for main screen
                      gestureEnabled: false,
                    }}
                  />
                  <Stack.Screen 
                    name="profiles/index"
                    options={{
                      animation: 'none',
                      // Disable swipe back for main screen
                      gestureEnabled: false,
                    }}
                  />
                  <Stack.Screen 
                    name="settings/index"
                    options={{
                      animation: 'none',
                      // Disable swipe back for main screen
                      gestureEnabled: false,
                    }}
                  />
                  <Stack.Screen 
                    name="session/add-drink"
                    options={{
                      animation: 'slide_from_right',
                      // Enable gesture for sub-screens
                      gestureEnabled: true,
                    }}
                  />
                  <Stack.Screen 
                    name="session/add-food"
                    options={{
                      animation: 'slide_from_right',
                      // Enable gesture for sub-screens
                      gestureEnabled: true,
                    }}
                  />
                  <Stack.Screen 
                    name="session/settings"
                    options={{
                      animation: 'slide_from_right',
                      // Enable gesture for sub-screens
                      gestureEnabled: true,
                    }}
                  />
                  <Stack.Screen 
                    name="profiles/edit"
                    options={{
                      animation: 'slide_from_right',
                      // Enable gesture for sub-screens
                      gestureEnabled: true,
                    }}
                  />
                  <Stack.Screen 
                    name="onboarding/profile-wizard"
                    options={{
                      animation: 'fade',
                      // Enable gesture for sub-screens
                      gestureEnabled: true,
                    }}
                  />
                </Stack>
              </View>
            </OfflineProvider>
          </ToastProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 