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
  console.log('🔍 DEVICE DETECTION START');
  console.log('  Platform.OS:', Platform.OS);
  console.log('  Device.deviceType:', Device.deviceType);
  console.log('  Device.modelName:', Device.modelName);
  
  // Solo su iOS
  if (Platform.OS !== 'ios') {
    console.log('  ❌ Non iOS, return false');
    return false;
  }

  // Metodo 1: Platform.isPad (disponibile in React Native 0.72+)
  // @ts-ignore - isPad potrebbe non essere nel type definition
  if (Platform.isPad === true) {
    console.log('  ✅ iPad rilevato tramite Platform.isPad');
    return true;
  }

  // Metodo 2: Device.deviceType
  if (Device.deviceType === Device.DeviceType.TABLET) {
    console.log('  ✅ iPad rilevato tramite Device.deviceType');
    return true;
  }

  // Metodo 3: Device.modelName contiene "iPad"
  if (Device.modelName && Device.modelName.toLowerCase().includes('ipad')) {
    console.log('  ✅ iPad rilevato tramite Device.modelName:', Device.modelName);
    return true;
  }

  // Metodo 4: Dimensioni schermo (fallback)
  // iPad ha minimo 768px di larghezza in portrait
  const { width, height } = Dimensions.get('window');
  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);
  console.log('  Dimensioni:', width, 'x', height, '| min:', minDimension, '| max:', maxDimension);
  
  // iPad mini ha 768x1024, iPad Pro può arrivare a 1024x1366
  const isTabletSize = minDimension >= 768;
  
  if (isTabletSize) {
    console.log('  ✅ iPad rilevato tramite dimensioni schermo (min >= 768)');
    return true;
  }

  console.log('  ❌ NON iPad - nessun metodo ha rilevato tablet');
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

// Log info dispositivo all'avvio
const deviceInfo = getDeviceInfo();
console.log('📱 ========================================');
console.log('📱 DEVICE INFO ALL\'AVVIO:');
console.log('📱 ========================================');
console.log(JSON.stringify(deviceInfo, null, 2));
console.log('📱 ========================================');

