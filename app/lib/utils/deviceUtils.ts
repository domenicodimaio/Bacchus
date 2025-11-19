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
 */
export const isIPad = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  
  const { width, height } = Dimensions.get('window');
  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  
  // iPad ha tipicamente aspect ratio più vicino a 4:3 (1.33) rispetto agli iPhone (2:1 o più)
  // e dimensioni dello schermo più grandi
  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);
  
  // iPad Mini ha almeno 768px nella dimensione più piccola
  // iPhone Pro Max ha circa 428px nella dimensione più piccola
  return minDimension >= 700 && aspectRatio < 1.8;
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
    maxWidth: deviceInfo.isIPad ? 600 : screenWidth, // Limita larghezza su iPad
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
 * Verifica se l'app dovrebbe mostrare un warning per iPad
 */
export const shouldShowIPadWarning = (): boolean => {
  return isIPad();
};

/**
 * Ottiene il messaggio di warning per iPad
 */
export const getIPadWarningMessage = (language: 'it' | 'en' = 'en') => {
  const messages = {
    it: {
      title: "App Ottimizzata per iPhone",
      message: "Questa app è stata progettata specificamente per iPhone. Su iPad potresti riscontrare problemi di layout. Per la migliore esperienza, ti consigliamo di utilizzare un iPhone.",
      button: "Ho Capito"
    },
    en: {
      title: "iPhone-Optimized App",
      message: "This app is specifically designed for iPhone. You may experience layout issues on iPad. For the best experience, we recommend using an iPhone.",
      button: "I Understand"
    }
  };
  
  return messages[language];
};

// Export React import per useResponsiveDimensions
import React from 'react';
