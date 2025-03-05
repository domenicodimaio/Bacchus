import React from 'react';
import { View, Text, StyleSheet, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AppHeaderProps {
  title: string;
  rightComponent?: React.ReactNode;
  translationNamespace?: string;
  isMainScreen?: boolean;
}

export default function AppHeader({
  title,
  rightComponent,
  translationNamespace = 'common',
  isMainScreen = true
}: AppHeaderProps) {
  const { t } = useTranslation(translationNamespace);
  const { currentTheme, isDarkMode } = useTheme();
  const colors = currentTheme.COLORS;
  const insets = useSafeAreaInsets();

  // Calculate proper header height with safe area
  const headerHeight = 60 + (Platform.OS === 'ios' ? insets.top : 0);
  const paddingTop = Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight || 0;

  return (
    <View style={[
      styles.headerContainer, 
      { 
        backgroundColor: colors.headerBackground || colors.background,
        height: headerHeight,
        paddingTop: paddingTop
      }
    ]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.headerBackground || colors.background}
      />
      
      <View style={styles.contentContainer}>
        <View style={styles.titleContainer}>
          <Text 
            style={[
              styles.title, 
              { color: colors.headerText || colors.text }
            ]}
            numberOfLines={1}
          >
            {t(title)}
          </Text>
        </View>
        
        {rightComponent && (
          <View style={styles.rightContainer}>
            {rightComponent}
          </View>
        )}
      </View>
      
      {/* Optional bottom border */}
      <View style={[
        styles.bottomBorder,
        { backgroundColor: colors.border }
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  contentContainer: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: SIZES.large,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  bottomBorder: {
    height: 1,
    width: '100%',
    opacity: 0.1,
  }
}); 