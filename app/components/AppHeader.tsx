import React from 'react';
import { View, Text, StyleSheet, StatusBar, Platform, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ProfileIcon from './ProfileIcon';
import { usePremiumFeatures } from '../hooks/usePremiumFeatures';

interface AppHeaderProps {
  title: string;
  rightComponent?: React.ReactNode;
  translationNamespace?: string;
  isMainScreen?: boolean;
  onBackPress?: () => void;
  showProfileIcon?: boolean;
}

export default function AppHeader({
  title,
  rightComponent,
  translationNamespace = 'common',
  isMainScreen = true,
  onBackPress,
  showProfileIcon = true
}: AppHeaderProps) {
  const { t } = useTranslation([translationNamespace, 'purchases']);
  const { currentTheme, isDarkMode } = useTheme();
  const colors = currentTheme.COLORS;
  const insets = useSafeAreaInsets();
  const { features, isPremium } = usePremiumFeatures();

  // Calculate proper header height with safe area
  const headerHeight = 60 + (Platform.OS === 'ios' ? insets.top : 0);
  const paddingTop = Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight || 0;

  // Handler for back button
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  // Mostra i dettagli del premium quando viene cliccato il badge
  const showPremiumBenefits = () => {
    Alert.alert(
      t('premiumActive', { ns: 'purchases', defaultValue: 'Premium Attivo' }),
      t('enjoyPremiumFeatures', { ns: 'purchases', defaultValue: 'Stai godendo dei seguenti vantaggi premium:' }) + 
      '\n\n' + 
      t('premiumFeaturesList', { 
        ns: 'purchases', 
        defaultValue: '• Sessioni illimitate\n• Statistiche dettagliate\n• Esportazione dati\n• Nessuna pubblicità' 
      }),
      [
        { 
          text: 'OK' 
        },
        {
          text: t('viewDetails', { ns: 'purchases', defaultValue: 'Vedi dettagli' }),
          onPress: () => router.push('/settings')
        }
      ]
    );
  };

  // Stili dinamici per premiumIndicator
  const premiumIndicatorStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  } as const;

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
        {!isMainScreen && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackPress}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons 
              name="chevron-back" 
              size={28} 
              color={colors.headerText || colors.text} 
            />
          </TouchableOpacity>
        )}
        
        <View style={[
          styles.titleContainer,
          !isMainScreen && { marginLeft: 8 }
        ]}>
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
        
        {showProfileIcon && !rightComponent && (
          <View style={styles.rightContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {features?.canCreateUnlimitedSessions && (
                <TouchableOpacity 
                  style={premiumIndicatorStyle}
                  onPress={showPremiumBenefits}
                >
                  <Ionicons name="star" size={12} color="#ffffff" style={{ marginRight: 2 }} />
                  <Text style={styles.premiumIndicatorText}>
                    {t('premium', { ns: 'purchases' })}
                  </Text>
                </TouchableOpacity>
              )}
            <ProfileIcon size={34} />
            </View>
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
  backButton: {
    padding: 4,
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
  },
  premiumIndicatorText: {
    color: '#ffffff',
    fontSize: SIZES.small - 2,
    fontWeight: '600',
  }
}); 