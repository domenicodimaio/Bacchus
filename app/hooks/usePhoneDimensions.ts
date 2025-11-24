/**
 * Hook per forzare dimensioni iPhone anche su iPad
 * 
 * Questo hook assicura che l'app mantenga sempre le proporzioni iPhone
 * anche quando viene eseguita su iPad in modalità upscalata
 */

import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';
import { getPhoneDimensions, isReallyIPad } from '../lib/utils/deviceForcePhone';

interface PhoneDimensions {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
  isIPadUpscaled: boolean;
}

export const usePhoneDimensions = (): PhoneDimensions => {
  const [dimensions, setDimensions] = useState<PhoneDimensions>(() => {
    const phoneDims = getPhoneDimensions();
    return {
      ...phoneDims,
      isIPadUpscaled: isReallyIPad()
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const phoneDims = getPhoneDimensions();
      setDimensions({
        ...phoneDims,
        isIPadUpscaled: isReallyIPad()
      });
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};

// Hook per ottenere stili che rispettano le proporzioni iPhone
export const usePhoneStyles = () => {
  const dimensions = usePhoneDimensions();
  
  return {
    // Container principale che mantiene proporzioni iPhone
    phoneContainer: {
      width: dimensions.width,
      maxWidth: dimensions.width,
      alignSelf: 'center' as const,
      flex: 1
    },
    
    // Stili per testo che mantiene dimensioni iPhone
    phoneText: {
      fontSize: 16 * dimensions.fontScale,
      lineHeight: 24 * dimensions.fontScale
    },
    
    // Stili per bottoni che mantengono dimensioni iPhone
    phoneButton: {
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    
    // Padding che scala con le proporzioni iPhone
    phonePadding: {
      padding: 16,
      paddingHorizontal: 16,
      paddingVertical: 16
    }
  };
};

export default usePhoneDimensions;
