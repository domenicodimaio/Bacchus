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
 * Usa MULTIPLI metodi per massima affidabilità:
 * 1. Platform.isPad (React Native built-in)
 * 2. Device.deviceType (expo-device)
 * 3. Device.modelName (controlla se contiene "iPad")
 * 4. Dimensioni schermo (fallback)
 */
export const isIPad = (): boolean => {
  // Solo su iOS
  if (Platform.OS !== 'ios') {
    return false;
  }

  // Metodo 1: Platform.isPad (disponibile in React Native 0.72+)
  // @ts-ignore - isPad potrebbe non essere nel type definition
  if (Platform.isPad === true) {
    return true;
  }

  // Metodo 2: Device.deviceType
  if (Device.deviceType === Device.DeviceType.TABLET) {
    return true;
  }

  // Metodo 3: Device.modelName contiene "iPad"
  if (Device.modelName && Device.modelName.toLowerCase().includes('ipad')) {
    return true;
  }

  // Metodo 4: Dimensioni schermo (fallback)
  // iPad ha minimo 768px di larghezza in portrait
  try {
    const { width, height } = Dimensions.get('window');
    const minDimension = Math.min(width, height);
    return minDimension >= 768;
  } catch (error) {
    // Se Dimensions.get() fallisce, assume non iPad
    console.warn('Device detection: Dimensions.get() failed, assuming iPhone');
    return false;
  }
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
    deviceTypeName: Device.DeviceType[Device.deviceType || 0],
    modelName: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    // @ts-ignore
    platformIsPad: Platform.isPad,
    width,
    height,
    minDimension: Math.min(width, height),
    maxDimension: Math.max(width, height)
  };
};

// Device info viene loggato solo quando richiesto (lazy loading)
// Questo previene problemi di inizializzazione su iPad

