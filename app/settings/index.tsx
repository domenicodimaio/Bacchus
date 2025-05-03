import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Switch as RNSwitch } from 'react-native';
import { Text, List, Divider, RadioButton, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { saveLanguageToStorage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useContext } from 'react';
import NavigationContext from '../contexts/NavigationContext';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
import Constants from 'expo-constants';

// Colors
const PRIMARY_COLOR = '#5DB075';

// Storage keys
const STORAGE_KEY = {
  LANGUAGE: 'bacchus_language',
  OFFLINE_MODE: 'bacchus_offline_mode',
  IS_PREMIUM: 'bacchus_is_premium',
  DEV_MODE_COUNT: 'bacchus_dev_mode_count'
};

export default function SettingsScreen() {
  // Theme and translation
  const theme = useTheme();
  const { t } = useTranslation(['common', 'settings']);
  
  // Auth and navigation contexts
  const auth = useAuth();
  const navigationContext = useContext(NavigationContext);
  const setBlockNavigation = navigationContext?.setBlockNavigation;
  const { isDarkMode, toggleDarkMode } = useAppTheme();
  
  // Extract auth properties with defaults
  const isLoggedIn = auth?.isAuthenticated || false;
  const user = auth?.user || null;
  const signOut = auth?.logout || (async () => ({ success: false }));
  
  // Get app version from Constants
  const appVersion = Constants?.expoConfig?.version || '1.0.0';
  const appBuild = Constants?.expoConfig?.ios?.buildNumber || '1';
  
  // State
  const [language, setLanguage] = useState('it');
  const [offlineMode, setOfflineMode] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showDeveloperOptions, setShowDeveloperOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Function to safely get translation
  const safeTranslate = useCallback((key: string, namespace = 'settings', defaultValue = '') => {
    try {
      return t(key, { ns: namespace, defaultValue: defaultValue || key });
    } catch (err) {
      console.error(`Translation error for: ${namespace}:${key}`, err);
      return defaultValue || key;
    }
  }, [t]);
  
  // Load saved settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);
  
  // Function to load settings from storage
  const loadSettings = async () => {
    try {
      // Load language
      const storedLanguage = await AsyncStorage.getItem(STORAGE_KEY.LANGUAGE);
      if (storedLanguage) {
        setLanguage(storedLanguage);
      }
      
      // Load offline mode
      const storedOfflineMode = await AsyncStorage.getItem(STORAGE_KEY.OFFLINE_MODE);
      if (storedOfflineMode) {
        setOfflineMode(storedOfflineMode === 'true');
      }
      
      // Load premium status
      const storedIsPremium = await AsyncStorage.getItem(STORAGE_KEY.IS_PREMIUM);
      if (storedIsPremium) {
        setIsPremium(storedIsPremium === 'true');
      }
      
      // Check for developer mode
      const devModeCount = await AsyncStorage.getItem(STORAGE_KEY.DEV_MODE_COUNT) || '0';
      setShowDeveloperOptions(parseInt(devModeCount, 10) >= 7);
    } catch (error) {
      console.error('Error loading settings:', error);
      setError('Failed to load settings');
      
      // In caso di errore, usa i valori predefiniti
      setLanguage('it');
      setOfflineMode(false);
      setIsPremium(false);
      setShowDeveloperOptions(false);
    }
  };
  
  // Function to handle language change
  const handleLanguageChange = async (newLanguage: string) => {
    if (!newLanguage) return;
    
    try {
      setLanguage(newLanguage);
      await AsyncStorage.setItem(STORAGE_KEY.LANGUAGE, newLanguage);
      await saveLanguageToStorage(newLanguage);
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(
        safeTranslate('error', 'common', 'Error'),
        safeTranslate('errorGeneric', 'common', 'An error occurred. Please try again.')
      );
    }
  };

  // Function to handle offline mode toggle
  const handleOfflineModeToggle = async () => {
    try {
      const newValue = !offlineMode;
      setOfflineMode(newValue);
      await AsyncStorage.setItem(STORAGE_KEY.OFFLINE_MODE, newValue.toString());
    } catch (error) {
      console.error('Error toggling offline mode:', error);
      // Riporta lo stato al valore originale in caso di errore
      setOfflineMode(offlineMode);
      Alert.alert(
        safeTranslate('error', 'common', 'Error'),
        safeTranslate('errorGeneric', 'common', 'An error occurred. Please try again.')
      );
    }
  };
  
  // Function to handle dark mode toggle
  const handleDarkModeToggle = async () => {
    try {
      await toggleDarkMode();
    } catch (error) {
      console.error('Error toggling dark mode:', error);
      Alert.alert(
        safeTranslate('error', 'common', 'Error'),
        safeTranslate('errorGeneric', 'common', 'An error occurred. Please try again.')
      );
    }
  };
  
  // Function to handle logout
  const handleLogout = async () => {
    if (!auth || !signOut) {
      console.error('Auth context or signOut function not available');
      return;
    }
    
    try {
      if (setBlockNavigation) {
        setBlockNavigation(true);
      }
      
      const result = await signOut();
      
      if (setBlockNavigation) {
        setBlockNavigation(false);
      }
      
      if (!result.success) {
        Alert.alert(
          safeTranslate('error', 'common', 'Error'),
          safeTranslate('errorGeneric', 'common', 'An error occurred.')
        );
      }
    } catch (error) {
      if (setBlockNavigation) {
        setBlockNavigation(false);
      }
      console.error('Logout error:', error);
      Alert.alert(
        safeTranslate('error', 'common', 'Error'),
        safeTranslate('errorGeneric', 'common', 'An error occurred. Please try again.')
      );
    }
  };
  
  // Toggle premium status (for developer testing)
  const togglePremiumStatus = async () => {
    try {
      const newStatus = !isPremium;
      setIsPremium(newStatus);
      await AsyncStorage.setItem(STORAGE_KEY.IS_PREMIUM, newStatus.toString());
      Alert.alert(
        safeTranslate('developerMode', 'settings', 'Developer Mode'),
        newStatus 
          ? safeTranslate('premiumEnabled', 'settings', 'Premium features enabled for testing')
          : safeTranslate('premiumDisabled', 'settings', 'Premium features disabled')
      );
    } catch (error) {
      console.error('Error toggling premium status:', error);
    }
  };

  // If there was an error loading settings, show an error screen
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Si è verificato un errore</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={loadSettings}
          >
            <Text style={styles.errorButtonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render settings screen
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <View style={styles.content}>
          <List.Section>
            <List.Subheader>{safeTranslate('appearance', 'settings', 'Appearance')}</List.Subheader>
            <List.Item
              title={safeTranslate('language', 'settings', 'Language')}
              description={safeTranslate('selectLanguage', 'settings', 'Select language')}
              left={props => <List.Icon {...props} icon="translate" color={theme.colors.primary} />}
              right={() => (
                <RadioButton.Group 
                  onValueChange={handleLanguageChange} 
                  value={language}
                >
                  <View style={styles.radioGroup}>
                    <View style={styles.radioItem}>
                      <RadioButton 
                        value="it" 
                        status={language === 'it' ? 'checked' : 'unchecked'} 
                      />
                      <Text>🇮🇹</Text>
                    </View>
                    <View style={styles.radioItem}>
                      <RadioButton 
                        value="en" 
                        status={language === 'en' ? 'checked' : 'unchecked'} 
                      />
                      <Text>🇬🇧</Text>
                    </View>
                  </View>
                </RadioButton.Group>
              )}
            />
            <List.Item
              title={safeTranslate('darkMode', 'settings', 'Dark Mode')}
              description={safeTranslate('darkModeDesc', 'settings', 'Toggle dark or light appearance')}
              left={props => <List.Icon {...props} icon="theme-light-dark" color={theme.colors.primary} />}
              right={() => (
                <RNSwitch
                  value={isDarkMode}
                  onValueChange={handleDarkModeToggle}
                  trackColor={{ false: '#767577', true: theme.colors.primary }}
                  thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                />
              )}
            />
          </List.Section>
          
          <List.Section>
            <List.Subheader>{safeTranslate('preferences', 'settings', 'Preferences')}</List.Subheader>
            <List.Item
              title={safeTranslate('offlineMode', 'settings', 'Offline Mode')}
              description={safeTranslate('offlineModeDesc', 'settings', 'Save data locally only')}
              left={props => <List.Icon {...props} icon="wifi-off" color={theme.colors.primary} />}
              right={() => (
                <RNSwitch
                  value={offlineMode}
                  onValueChange={handleOfflineModeToggle}
                  trackColor={{ false: '#767577', true: theme.colors.primary }}
                  thumbColor={offlineMode ? '#f5dd4b' : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                />
              )}
            />
          </List.Section>
          
          {/* Premium features section */}
          <List.Section>
            <List.Subheader>{safeTranslate('premiumFeatures', 'settings', 'Premium Features')}</List.Subheader>
            <List.Item
              title={safeTranslate('premiumActive', 'settings', 'Premium Active')}
              description={isPremium 
                ? safeTranslate('premiumActiveDesc', 'settings', 'Your premium subscription is active')
                : safeTranslate('premiumInactiveDesc', 'settings', 'Upgrade to premium for extra features')}
              left={props => <List.Icon {...props} icon="star" color={theme.colors.primary} />}
            />
            <Divider />
            <List.Item
              title={safeTranslate('unlimitedSessions', 'settings', 'Unlimited Sessions')}
              description={safeTranslate('unlimitedSessionsDesc', 'settings', 'Track as many drinking sessions as you want')}
              left={props => <List.Icon {...props} icon="infinity" color={isPremium ? theme.colors.primary : theme.colors.outline} />}
            />
            <List.Item
              title={safeTranslate('advancedStatistics', 'settings', 'Advanced Statistics')}
              description={safeTranslate('advancedStatisticsDesc', 'settings', 'Get detailed insights about your drinking habits')}
              left={props => <List.Icon {...props} icon="chart-line" color={isPremium ? theme.colors.primary : theme.colors.outline} />}
            />
            <List.Item
              title={safeTranslate('dataExport', 'settings', 'Data Export')}
              description={safeTranslate('dataExportDesc', 'settings', 'Export your data in CSV format')}
              left={props => <List.Icon {...props} icon="file-export" color={isPremium ? theme.colors.primary : theme.colors.outline} />}
            />
            <List.Item
              title={safeTranslate('noAds', 'settings', 'No Advertisements')}
              description={safeTranslate('noAdsDesc', 'settings', 'Enjoy an ad-free experience')}
              left={props => <List.Icon {...props} icon="block-helper" color={isPremium ? theme.colors.primary : theme.colors.outline} />}
            />
          </List.Section>
          
          {/* Account section - only show if logged in */}
          {isLoggedIn && (
            <List.Section>
              <List.Subheader>{safeTranslate('account', 'settings', 'Account')}</List.Subheader>
              {user && (
                <List.Item
                  title={user.email || safeTranslate('user', 'settings', 'User')}
                  description={safeTranslate('loggedIn', 'settings', 'Logged in')}
                  left={props => <List.Icon {...props} icon="account" color={theme.colors.primary} />}
                />
              )}
              <TouchableOpacity onPress={handleLogout}>
                <List.Item
                  title={safeTranslate('logout', 'settings', 'Logout')}
                  description={safeTranslate('logoutDesc', 'settings', 'Sign out of your account')}
                  left={props => <List.Icon {...props} icon="logout" color={theme.colors.primary} />}
                />
              </TouchableOpacity>
            </List.Section>
          )}
          
          {/* Developer section - only show if unlocked */}
          {showDeveloperOptions && (
            <List.Section>
              <List.Subheader>{safeTranslate('developerOptions', 'settings', 'Developer Options')}</List.Subheader>
              <TouchableOpacity onPress={togglePremiumStatus}>
                <List.Item
                  title={safeTranslate('togglePremium', 'settings', 'Toggle Premium Status')}
                  description={isPremium 
                    ? safeTranslate('disablePremium', 'settings', 'Disable premium features for testing')
                    : safeTranslate('enablePremium', 'settings', 'Enable premium features for testing')}
                  left={props => <List.Icon {...props} icon="developer-board" color={theme.colors.primary} />}
                />
              </TouchableOpacity>
            </List.Section>
          )}
          
          {/* About section */}
          <List.Section>
            <List.Subheader>{safeTranslate('about', 'settings', 'About')}</List.Subheader>
            <List.Item
              title={safeTranslate('version', 'settings', 'Version')}
              description={`${appVersion} (${appBuild})`}
              left={props => <List.Icon {...props} icon="information" color={theme.colors.primary} />}
            />
          </List.Section>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  radioGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorMessage: {
    marginBottom: 20,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: PRIMARY_COLOR,
    padding: 10,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 