import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Default colors and sizes if theme is not available
const DEFAULT_COLORS = {
  tabBackground: '#192942',
  tabActiveBackground: '#283A57',
  tabIcon: '#8090B0',
  tabActiveIcon: '#00F7FF',
  tabText: '#8090B0',
  tabActiveText: '#00F7FF',
  border: '#2D3D59',
  navActive: '#00F7FF',
  primary: '#007BFF',
};

const DEFAULT_SIZES = {
  tabBarHeight: 60,
};

// Separate component for tab button to properly use hooks
const TabButton = ({ 
  tab, 
  isActive, 
  onPress, 
  animValue, 
  colors 
}) => {
  // Use hook at component top level, not inside useMemo
  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      animValue.value,
      [0, 1],
      [colors.tabBackground, colors.tabActiveBackground]
    );
    
    // Rimuovo la scala animata che causa l'effetto "friggente"
    // Invece, usiamo solo il cambio di colore di sfondo
    return {
      backgroundColor
    };
  });

  return (
    <AnimatedTouchable
      key={tab.key}
      style={[
        styles.tab,
        animatedStyle
      ]}
      onPress={onPress}
      activeOpacity={0.95} // Aumenta per ridurre l'effetto di pulsazione
    >
      <Ionicons
        name={isActive ? tab.activeIcon : tab.icon}
        size={24}
        color={isActive ? colors.tabActiveIcon : colors.tabIcon}
      />
      <Text 
        style={[
          styles.tabLabel, 
          { 
            color: isActive ? colors.tabActiveText : colors.tabText,
            fontWeight: isActive ? '600' : '400' 
          }
        ]}
      >
        {tab.label}
      </Text>
      {isActive && (
        <View style={[styles.activeDot, { backgroundColor: colors.navActive }]} />
      )}
    </AnimatedTouchable>
  );
};

// Definisco il tipo del componente
export type CustomTabBarProps = {
  // Add any props if needed
};

// Definisco il componente
export const CustomTabBar: React.FC<CustomTabBarProps> = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = { ...DEFAULT_COLORS, ...(currentTheme?.COLORS || {}) };
  const sizes = { ...DEFAULT_SIZES, ...(currentTheme?.SIZES || {}) };

  // Define tabs with more detailed structure
  const tabs = useMemo(() => [
    {
      name: 'dashboard',
      label: t('common:tabs.dashboard', 'Dashboard'),
      icon: 'home-outline',
      activeIcon: 'home',
      path: '/dashboard',
      key: 'dashboard'
    },
    {
      name: 'session',
      label: t('common:tabs.session', 'Session'),
      icon: 'beer-outline',
      activeIcon: 'beer',
      path: '/session',
      key: 'session'
    },
    {
      name: 'history',
      label: t('common:tabs.history', 'History'),
      icon: 'time-outline',
      activeIcon: 'time',
      path: '/history',
      key: 'history'
    },
    {
      name: 'profiles',
      label: t('common:tabs.profile', 'Profilo'),
      icon: 'person-outline',
      activeIcon: 'person',
      path: '/profiles',
      key: 'profiles'
    },
  ], [t]);

  // Create animated values for each tab - defined at top level
  const tabAnimation0 = useSharedValue(0);
  const tabAnimation1 = useSharedValue(0);
  const tabAnimation2 = useSharedValue(0);
  const tabAnimation3 = useSharedValue(0);
  
  // Create an array from the individual values and always ensure it exists
  const tabAnimations = useMemo(() => {
    return [tabAnimation0, tabAnimation1, tabAnimation2, tabAnimation3];
  }, [tabAnimation0, tabAnimation1, tabAnimation2, tabAnimation3]);

  // Check if a tab is active
  const isActive = (path: string) => {
    if (pathname === path) return true;
    if (path === '/dashboard' && pathname === '/') return true;
    return pathname?.startsWith(path) || false;
  };

  // Navigate to a tab
  const navigateToTab = (path: string) => {
    router.push(path as any);
  };

  // Update animations based on active state with smoother transitions
  React.useEffect(() => {
    if (!tabAnimations || !tabs) return;
    
    // Ensure we don't iterate beyond available animations
    const maxLength = Math.min(tabs.length, tabAnimations.length);
    
    for (let i = 0; i < maxLength; i++) {
      const tab = tabs[i];
      const animValue = tabAnimations[i];
      
      if (animValue) {
        animValue.value = withTiming(
          isActive(tab.path) ? 1 : 0,
          { duration: 500 }  // Aumenta la durata per un'animazione più fluida
        );
      }
    }
  }, [pathname, tabs, tabAnimations]);

  // Calcola l'altezza della barra di navigazione considerando il safe area inset
  const tabBarHeight = sizes.tabBarHeight + (Platform.OS === 'ios' ? insets.bottom : 0);

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.tabBackground,
        borderTopColor: colors.border,
        height: tabBarHeight,
        paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0
      }
    ]}>
      {tabs.map((tab, index) => {
        // Ensure we have a valid animation value for this tab
        const animValue = tabAnimations && index < tabAnimations.length 
          ? tabAnimations[index] 
          : useSharedValue(0); // Fallback for safety
          
        return (
          <TabButton
            key={tab.key}
            tab={tab}
            isActive={isActive(tab.path)}
            onPress={() => navigateToTab(tab.path)}
            animValue={animValue}
            colors={colors}
          />
        );
      })}
    </View>
  );
}

// Aggiungo l'export default
export default CustomTabBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  activeDot: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 3,
    borderRadius: 1.5,
  }
}); 