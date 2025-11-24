/**
 * Device Force Phone Utility
 * 
 * Forza l'app a comportarsi sempre come iPhone, anche su iPad
 * Questo è necessario per rispettare i requisiti Apple di avere
 * un'app iPhone che funzioni identica quando upscalata su iPad
 */

import { Platform, Dimensions } from 'react-native';

// Override delle funzioni Platform per forzare comportamento iPhone
const originalPlatform = { ...Platform };

// Forza sempre iPhone come device type
export const forcePhoneMode = () => {
  // Override Platform.isPad per restituire sempre false
  Object.defineProperty(Platform, 'isPad', {
    get: () => false,
    configurable: false,
    enumerable: true
  });

  // Override Platform.OS per assicurarsi che sia sempre 'ios' in modalità phone
  if (Platform.OS === 'ios') {
    // Forza il device type a iPhone
    Object.defineProperty(Platform, 'constants', {
      get: () => ({
        ...originalPlatform.constants,
        interfaceIdiom: 'phone', // Forza sempre phone
        systemName: 'iOS'
      }),
      configurable: false,
      enumerable: true
    });
  }
};

// Funzione per ottenere dimensioni sempre in modalità iPhone
export const getPhoneDimensions = () => {
  const { width, height } = Dimensions.get('window');
  
  // Se siamo su iPad (rilevato dalle dimensioni), 
  // restituisci dimensioni iPhone proporzionate
  if (width > 500 || height > 900) {
    // Simula iPhone 14 Pro dimensions quando su iPad
    return {
      width: 393,
      height: 852,
      scale: Dimensions.get('window').scale,
      fontScale: Dimensions.get('window').fontScale
    };
  }
  
  // Altrimenti restituisci dimensioni reali (siamo già su iPhone)
  return {
    width,
    height,
    scale: Dimensions.get('window').scale,
    fontScale: Dimensions.get('window').fontScale
  };
};

// Funzione per verificare se siamo REALMENTE su iPad (per debug)
export const isReallyIPad = () => {
  const { width, height } = Dimensions.get('window');
  return width > 500 || height > 900;
};

// Funzione per forzare font scaling iPhone
export const getPhoneFontScale = () => {
  // Su iPad, forza font scale iPhone per mantenere proporzioni
  if (isReallyIPad()) {
    return 1.0; // Font scale standard iPhone
  }
  return Dimensions.get('window').fontScale;
};

// Inizializza la modalità phone al caricamento del modulo
forcePhoneMode();

console.log('📱 DEVICE FORCE PHONE: Modalità iPhone forzata attivata');
console.log('📱 Platform.isPad:', Platform.isPad);
console.log('📱 Dimensioni finestra:', Dimensions.get('window'));
console.log('📱 Realmente iPad:', isReallyIPad());
