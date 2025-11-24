/**
 * Utility per layout responsivo REALE
 * 
 * Invece di fingere che iPad sia iPhone, crea layout che funzionano su entrambi
 */

import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Rileva se siamo su iPad basandoci sulle dimensioni
export const isIPad = () => {
  return Platform.OS === 'ios' && (width >= 768 || height >= 768);
};

// Ottieni dimensioni responsive
export const getResponsiveDimensions = () => {
  const isTablet = isIPad();
  
  return {
    width,
    height,
    isTablet,
    // Container width: su iPad max 600px centrato, su iPhone full width
    containerWidth: isTablet ? Math.min(600, width * 0.8) : width,
    // Padding: più grande su iPad
    padding: isTablet ? 32 : 16,
    // Font sizes: leggermente più grandi su iPad
    fontSize: {
      small: isTablet ? 16 : 14,
      medium: isTablet ? 18 : 16,
      large: isTablet ? 28 : 26,
      xlarge: isTablet ? 36 : 32
    },
    // Touch targets: sempre almeno 44px
    touchTarget: Math.max(44, isTablet ? 56 : 48)
  };
};

// Stili responsive per container principale
export const getResponsiveContainerStyle = () => {
  const dims = getResponsiveDimensions();
  
  return {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'flex-start' as const, // SEMPRE flex-start per evitare tagli
    padding: dims.padding,
    width: '100%' as const,
    maxWidth: dims.containerWidth as number,
    alignSelf: 'center' as const
  };
};

// Stili responsive per card/form
export const getResponsiveCardStyle = () => {
  const dims = getResponsiveDimensions();
  
  return {
    width: '100%' as const,
    maxWidth: dims.isTablet ? 500 : undefined,
    borderRadius: 15,
    padding: dims.isTablet ? 32 : 20,
    marginVertical: dims.isTablet ? 24 : 15
  };
};

// Stili responsive per bottoni
export const getResponsiveButtonStyle = () => {
  const dims = getResponsiveDimensions();
  
  return {
    height: dims.touchTarget,
    minHeight: 44, // Apple minimum
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: dims.isTablet ? 24 : 16
  };
};

// Stili responsive per testo
export const getResponsiveTextStyle = (size: 'small' | 'medium' | 'large' | 'xlarge' = 'medium') => {
  const dims = getResponsiveDimensions();
  
  return {
    fontSize: dims.fontSize[size],
    lineHeight: dims.fontSize[size] * 1.4
  };
};

export default {
  isIPad,
  getResponsiveDimensions,
  getResponsiveContainerStyle,
  getResponsiveCardStyle,
  getResponsiveButtonStyle,
  getResponsiveTextStyle
};
