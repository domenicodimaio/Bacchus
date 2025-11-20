/**
 * Responsive Layout Hook
 * 
 * Hook per gestire layout responsivi che si adattano a iPhone e iPad
 */

import { useState, useEffect } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { getDeviceInfo, getResponsiveDimensions } from '../lib/utils/deviceUtils';

export interface ResponsiveStyles {
  container: any;
  content: any;
  text: any;
  button: any;
  input: any;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export const useResponsiveLayout = () => {
  const [responsiveData, setResponsiveData] = useState(() => getResponsiveDimensions());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setResponsiveData(getResponsiveDimensions());
    });

    return () => subscription?.remove();
  }, []);

  const { deviceInfo, padding, margin, fontSizes, componentSizes, maxWidth } = responsiveData;

  // Genera stili responsivi
  const createResponsiveStyles = (): ResponsiveStyles => {
    const spacing = {
      xs: deviceInfo.isIPad ? 6 : 4,
      sm: deviceInfo.isIPad ? 12 : 8,
      md: deviceInfo.isIPad ? 20 : 16,
      lg: deviceInfo.isIPad ? 32 : 24,
      xl: deviceInfo.isIPad ? 48 : 32,
    };

    return {
      container: {
        flex: 1,
        paddingHorizontal: padding,
        maxWidth: maxWidth,
        alignSelf: 'center',
        width: '100%',
      },
      content: {
        paddingVertical: spacing.md,
        gap: spacing.md,
      },
      text: {
        small: {
          fontSize: fontSizes.small,
          lineHeight: fontSizes.small * 1.4,
        },
        medium: {
          fontSize: fontSizes.medium,
          lineHeight: fontSizes.medium * 1.4,
        },
        large: {
          fontSize: fontSizes.large,
          lineHeight: fontSizes.large * 1.4,
        },
        xlarge: {
          fontSize: fontSizes.xlarge,
          lineHeight: fontSizes.xlarge * 1.3,
        },
        xxlarge: {
          fontSize: fontSizes.xxlarge,
          lineHeight: fontSizes.xxlarge * 1.2,
        },
      },
      button: {
        height: componentSizes.buttonHeight,
        paddingHorizontal: spacing.lg,
        borderRadius: deviceInfo.isIPad ? 12 : 8,
        minWidth: deviceInfo.isIPad ? 120 : 100,
      },
      input: {
        height: componentSizes.inputHeight,
        paddingHorizontal: spacing.md,
        borderRadius: deviceInfo.isIPad ? 10 : 8,
        fontSize: fontSizes.medium,
      },
      spacing,
    };
  };

  const styles = createResponsiveStyles();

  // Utility functions
  const getScreenType = () => {
    if (deviceInfo.isIPad) return 'tablet';
    if (deviceInfo.isLargeScreen) return 'large-phone';
    return 'phone';
  };

  const getColumns = (baseColumns: number = 2) => {
    if (deviceInfo.isIPad) {
      return deviceInfo.orientation === 'landscape' ? baseColumns + 2 : baseColumns + 1;
    }
    return baseColumns;
  };

  const getModalWidth = () => {
    if (deviceInfo.isIPad) {
      return deviceInfo.orientation === 'landscape' ? '50%' : '70%';
    }
    return '90%';
  };

  const getContentPadding = () => {
    if (deviceInfo.isIPad) {
      return deviceInfo.orientation === 'landscape' ? 40 : 24;
    }
    return 16;
  };

  return {
    deviceInfo,
    styles,
    dimensions: responsiveData,
    screenType: getScreenType(),
    getColumns,
    getModalWidth,
    getContentPadding,
    isIPad: deviceInfo.isIPad,
    isLargeScreen: deviceInfo.isLargeScreen,
  };
};
