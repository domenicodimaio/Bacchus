/**
 * Device Detection Utility
 * 
 * Centralizza la logica di rilevamento dispositivo per garantire
 * consistenza in tutta l'app
 */

import * as Device from 'expo-device';
import { Platform, Dimensions } from 'react-native';

/**
 * Rileva se il dispositivo è un iPad
 * 
 * Usa expo-device come metodo primario (più affidabile)
 * Fallback su dimensioni schermo solo se necessario
 */
export const isIPad = (): boolean => {
  // Metodo 1: Usa expo-device (più affidabile)
  if (Device.deviceType === Device.DeviceType.TABLET) {
    console.log('🔍 DEVICE DETECTION: iPad rilevato tramite Device.deviceType');
    return true;
  }

  // Metodo 2: Fallback su dimensioni schermo
  // iPad ha minimo 768px di larghezza in portrait
  if (Platform.OS === 'ios') {
    const { width, height } = Dimensions.get('window');
    const minDimension = Math.min(width, height);
    const isTabletSize = minDimension >= 768; // iPad ha minimo 768px
    
    if (isTabletSize) {
      console.log('🔍 DEVICE DETECTION: iPad rilevato tramite dimensioni schermo');
    }
    
    return isTabletSize;
  }

  return false;
};

/**
 * Hook per ottenere info sul dispositivo
 */
export const getDeviceInfo = () => {
  const { width, height } = Dimensions.get('window');
  const isPad = isIPad();
  
  return {
    isIPad: isPad,
    isPhone: !isPad && Platform.OS === 'ios',
    platform: Platform.OS,
    deviceType: Device.deviceType,
    width,
    height,
    minDimension: Math.min(width, height),
    maxDimension: Math.max(width, height)
  };
};

// Log info dispositivo all'avvio
const deviceInfo = getDeviceInfo();
console.log('📱 DEVICE INFO:', JSON.stringify(deviceInfo, null, 2));

