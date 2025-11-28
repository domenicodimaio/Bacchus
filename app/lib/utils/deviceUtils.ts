/**
 * Device Utils
 * 
 * Utilità per rilevare il tipo di dispositivo e gestire le differenze tra iPhone e iPad
 */

import { Dimensions, Platform } from 'react-native';
import Constants from 'expo-constants';

export interface DeviceInfo {
  isIPhone: boolean;
  isIPad: boolean;
  isAndroid: boolean;
  screenWidth: number;
  screenHeight: number;
  isLargeScreen: boolean;
  deviceType: 'phone' | 'tablet' | 'unknown';
  orientation: 'portrait' | 'landscape';
}

/**
 * Rileva se il dispositivo è un iPad
 * Usa sia SCREEN che WINDOW per rilevare correttamente anche quando l'app iPhone è upscalata
 */
export const isIPad = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  
  // Usa SCREEN dimensions (dimensioni fisiche dello schermo) - più affidabile per iPad
  const screen = Dimensions.get('screen');
  const screenMin = Math.min(screen.width, screen.height);
  const screenMax = Math.max(screen.width, screen.height);
  const screenAspectRatio = screenMax / screenMin;
  
  // Usa anche WINDOW dimensions come fallback
  const window = Dimensions.get('window');
  const windowMin = Math.min(window.width, window.height);
  const windowMax = Math.max(window.width, window.height);
  const windowAspectRatio = windowMax / windowMin;
  
  // 🔥 DETECTION ROBUSTA:
  // 1. iPad ha almeno 650px nella dimensione più piccola dello SCREEN (soglia più bassa per catturare tutti gli iPad)
  // 2. Aspect ratio dello SCREEN è tipicamente < 1.8 (4:3 invece di 2:1)
  // 3. Se screen non funziona, prova con window
  // 4. iPhone Pro Max ha circa 428px, quindi 650px cattura tutti gli iPad
  const isScreenIPad = screenMin >= 650 && screenAspectRatio < 1.8;
  const isWindowIPad = windowMin >= 650 && windowAspectRatio < 1.8;
  
  // Log dettagliato per debug
  const result = isScreenIPad || isWindowIPad;
  console.log('🔍 DEVICE UTILS: iPad detection:', {
    platform: Platform.OS,
    screenWidth: screen.width,
    screenHeight: screen.height,
    screenMin,
    screenAspectRatio: screenAspectRatio.toFixed(2),
    windowWidth: window.width,
    windowHeight: window.height,
    windowMin,
    windowAspectRatio: windowAspectRatio.toFixed(2),
    isScreenIPad,
    isWindowIPad,
    isIPad: result
  });
  
  return result;
};

/**
 * Rileva se il dispositivo è un iPhone
 */
export const isIPhone = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  return !isIPad();
};

/**
 * Ottiene informazioni complete sul dispositivo
 */
export const getDeviceInfo = (): DeviceInfo => {
  const { width, height } = Dimensions.get('window');
  const isLandscape = width > height;
  
  return {
    isIPhone: isIPhone(),
    isIPad: isIPad(),
    isAndroid: Platform.OS === 'android',
    screenWidth: width,
    screenHeight: height,
    isLargeScreen: Math.min(width, height) >= 700,
    deviceType: isIPad() ? 'tablet' : (Platform.OS === 'ios' ? 'phone' : 'unknown'),
    orientation: isLandscape ? 'landscape' : 'portrait'
  };
};

/**
 * Ottiene dimensioni responsive basate sul tipo di dispositivo
 */
export const getResponsiveDimensions = () => {
  const deviceInfo = getDeviceInfo();
  const { screenWidth, screenHeight } = deviceInfo;
  
  // Padding e margini responsivi
  const basePadding = deviceInfo.isIPad ? 24 : 16;
  const baseMargin = deviceInfo.isIPad ? 20 : 12;
  
  // Font sizes responsivi
  const fontSizes = {
    small: deviceInfo.isIPad ? 16 : 14,
    medium: deviceInfo.isIPad ? 18 : 16,
    large: deviceInfo.isIPad ? 22 : 18,
    xlarge: deviceInfo.isIPad ? 28 : 24,
    xxlarge: deviceInfo.isIPad ? 34 : 28
  };
  
  // Dimensioni componenti
  const componentSizes = {
    buttonHeight: deviceInfo.isIPad ? 56 : 48,
    inputHeight: deviceInfo.isIPad ? 52 : 44,
    iconSize: deviceInfo.isIPad ? 28 : 24,
    avatarSize: deviceInfo.isIPad ? 80 : 60
  };
  
  return {
    deviceInfo,
    padding: basePadding,
    margin: baseMargin,
    fontSizes,
    componentSizes,
    maxWidth: deviceInfo.isIPad 
      ? (deviceInfo.orientation === 'landscape' ? 800 : 600) 
      : screenWidth, // Larghezza adattiva per iPad landscape/portrait
  };
};

/**
 * Hook per ottenere dimensioni responsive che si aggiornano con l'orientamento
 */
export const useResponsiveDimensions = () => {
  const [dimensions, setDimensions] = React.useState(getResponsiveDimensions);
  
  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setDimensions(getResponsiveDimensions());
    });
    
    return () => subscription?.remove();
  }, []);
  
  return dimensions;
};

/**
 * Verifica se l'app dovrebbe mostrare un welcome message per iPad
 */
export const shouldShowIPadWelcome = (): boolean => {
  return isIPad();
};

/**
 * Ottiene il messaggio di benvenuto per iPad
 */
export const getIPadWelcomeMessage = (language: 'it' | 'en' = 'en') => {
  const messages = {
    it: {
      title: "Benvenuto su iPad!",
      message: "Bacchus è ora ottimizzato anche per iPad! Goditi un'esperienza migliorata con layout adattivi, font più grandi e controlli ottimizzati per il tuo dispositivo.",
      button: "Inizia"
    },
    en: {
      title: "Welcome to iPad!",
      message: "Bacchus is now optimized for iPad! Enjoy an enhanced experience with adaptive layouts, larger fonts, and controls optimized for your device.",
      button: "Get Started"
    }
  };
  
  return messages[language];
};

// Export React import per useResponsiveDimensions
import React from 'react';
