import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Switch as RNSwitch } from 'react-native';
import { Text, List, Divider, RadioButton, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import i18n, { saveLanguageToStorage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useContext } from 'react';
import NavigationContext from '../contexts/NavigationContext';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
import Constants from 'expo-constants';

// Colors
const PRIMARY_COLOR = '#5DB075';
const ACCENT_COLOR = '#EBA059';

// Storage keys
const STORAGE_KEY = {
  LANGUAGE: 'bacchus_language',
  OFFLINE_MODE: 'bacchus_offline_mode',
  IS_PREMIUM: 'bacchus_is_premium',
  DEV_MODE_COUNT: 'bacchus_dev_mode_count'
};

export default function SettingsScreen() {
  try {
    const theme = useTheme();
    const { t } = useTranslation(['common', 'settings', 'purchases']);
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
    
    // State for language and offline mode
    const [language, setLanguage] = useState('it');
    const [offlineMode, setOfflineMode] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [showDeveloperOptions, setShowDeveloperOptions] = useState(false);
    
    // Load saved settings on component mount
    useEffect(() => {
      try {
        loadSettings();
      } catch (error) {
        console.error('Error in settings useEffect:', error);
        Alert.alert(
          t('error', { ns: 'common', defaultValue: 'Error' }),
          'Failed to load settings. ' + (error?.message || 'Unknown error')
        );
      }
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
        i18n.changeLanguage(newLanguage);
        // Save the language to storage to persist between app restarts
        await saveLanguageToStorage(newLanguage);
      } catch (error) {
        console.error('Error changing language:', error);
        Alert.alert(
          t('error', { ns: 'common', defaultValue: 'Error' }),
          t('errorGeneric', { ns: 'common', defaultValue: 'An error occurred. Please try again.' })
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
          t('error', { ns: 'common', defaultValue: 'Error' }),
          t('errorGeneric', { ns: 'common', defaultValue: 'An error occurred. Please try again.' })
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
          t('error', { ns: 'common', defaultValue: 'Error' }),
          t('errorGeneric', { ns: 'common', defaultValue: 'An error occurred. Please try again.' })
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
            t('error', { ns: 'common', defaultValue: 'Error' }),
            t('errorGeneric', { ns: 'common', defaultValue: 'An error occurred.' })
          );
        }
      } catch (error) {
        if (setBlockNavigation) {
          setBlockNavigation(false);
        }
        console.error('Logout error:', error);
        Alert.alert(
          t('error', { ns: 'common', defaultValue: 'Error' }),
          t('errorGeneric', { ns: 'common', defaultValue: 'An error occurred. Please try again.' })
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
          t('developerMode', { ns: 'settings', defaultValue: 'Developer Mode' }),
          newStatus 
            ? t('premiumEnabled', { ns: 'settings', defaultValue: 'Premium features enabled for testing' })
            : t('premiumDisabled', { ns: 'settings', defaultValue: 'Premium features disabled' })
        );
      } catch (error) {
        console.error('Error toggling premium status:', error);
      }
    };
    
    // Function to render premium section
    const renderPremiumSection = () => {
      try {
        return (
          <List.Section>
            <List.Subheader>{t('premiumFeatures', { ns: 'settings', defaultValue: 'Premium Features' })}</List.Subheader>
            <List.Item
              title={t('premiumActive', { ns: 'settings', defaultValue: 'Premium Active' })}
              description={isPremium 
                ? t('premiumActiveDesc', { ns: 'settings', defaultValue: 'Your premium subscription is active' })
                : t('premiumInactiveDesc', { ns: 'settings', defaultValue: 'Upgrade to premium for extra features' })}
              left={props => <List.Icon {...props} icon="star" color={theme.colors.primary} />}
            />
            <Divider />
            <List.Item
              title={t('unlimitedSessions', { ns: 'settings', defaultValue: 'Unlimited Sessions' })}
              description={t('unlimitedSessionsDesc', { ns: 'settings', defaultValue: 'Track as many drinking sessions as you want' })}
              left={props => <List.Icon {...props} icon="infinity" color={isPremium ? theme.colors.primary : theme.colors.outline} />}
            />
            <List.Item
              title={t('advancedStatistics', { ns: 'settings', defaultValue: 'Advanced Statistics' })}
              description={t('advancedStatisticsDesc', { ns: 'settings', defaultValue: 'Get detailed insights about your drinking habits' })}
              left={props => <List.Icon {...props} icon="chart-line" color={isPremium ? theme.colors.primary : theme.colors.outline} />}
            />
            <List.Item
              title={t('dataExport', { ns: 'settings', defaultValue: 'Data Export' })}
              description={t('dataExportDesc', { ns: 'settings', defaultValue: 'Export your data in CSV format' })}
              left={props => <List.Icon {...props} icon="file-export" color={isPremium ? theme.colors.primary : theme.colors.outline} />}
            />
            <List.Item
              title={t('noAds', { ns: 'settings', defaultValue: 'No Advertisements' })}
              description={t('noAdsDesc', { ns: 'settings', defaultValue: 'Enjoy an ad-free experience' })}
              left={props => <List.Icon {...props} icon="block-helper" color={isPremium ? theme.colors.primary : theme.colors.outline} />}
            />
          </List.Section>
        );
      } catch (error) {
        console.error('Error rendering premium section:', error);
        return (
          <View style={styles.errorContainer}>
            <Text>Error loading premium options</Text>
          </View>
        );
      }
    };
    
    // Function to render developer section
    const renderDeveloperSection = () => {
      try {
        if (!showDeveloperOptions) return null;
        
        return (
          <List.Section>
            <List.Subheader>{t('developerOptions', { ns: 'settings', defaultValue: 'Developer Options' })}</List.Subheader>
            <TouchableOpacity onPress={togglePremiumStatus}>
              <List.Item
                title={t('togglePremium', { ns: 'settings', defaultValue: 'Toggle Premium Status' })}
                description={isPremium 
                  ? t('disablePremium', { ns: 'settings', defaultValue: 'Disable premium features for testing' })
                  : t('enablePremium', { ns: 'settings', defaultValue: 'Enable premium features for testing' })}
                left={props => <List.Icon {...props} icon="developer-board" color={theme.colors.primary} />}
              />
            </TouchableOpacity>
          </List.Section>
        );
      } catch (error) {
        console.error('Error rendering developer section:', error);
        return null;
      }
    };
    
    // Render settings screen
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView>
          <View style={styles.content}>
          <List.Section>
              <List.Subheader>{t('appearance', { ns: 'settings', defaultValue: 'Appearance' })}</List.Subheader>
            <List.Item
                title={t('language', { ns: 'settings', defaultValue: 'Language' })}
                description={t('selectLanguage', { ns: 'settings', defaultValue: 'Select language' })}
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
                title={t('darkMode', { ns: 'settings', defaultValue: 'Dark Mode' })}
                description={t('darkModeDesc', { ns: 'settings', defaultValue: 'Toggle dark or light appearance' })}
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
              <List.Subheader>{t('preferences', { ns: 'settings', defaultValue: 'Preferences' })}</List.Subheader>
              <List.Item
                title={t('offlineMode', { ns: 'settings', defaultValue: 'Offline Mode' })}
                description={t('offlineModeDesc', { ns: 'settings', defaultValue: 'Save data locally only' })}
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
            
            {renderPremiumSection()}
            
            {isLoggedIn && (
              <List.Section>
                <List.Subheader>{t('account', { ns: 'settings', defaultValue: 'Account' })}</List.Subheader>
                {user && (
                  <List.Item
                    title={user.email || t('user', { ns: 'settings', defaultValue: 'User' })}
                    description={t('loggedIn', { ns: 'settings', defaultValue: 'Logged in' })}
                    left={props => <List.Icon {...props} icon="account" color={theme.colors.primary} />}
                  />
                )}
                <TouchableOpacity onPress={handleLogout}>
                  <List.Item
                    title={t('logout', { ns: 'settings', defaultValue: 'Logout' })}
                    description={t('logoutDesc', { ns: 'settings', defaultValue: 'Sign out of your account' })}
                    left={props => <List.Icon {...props} icon="logout" color={theme.colors.primary} />}
                  />
                </TouchableOpacity>
              </List.Section>
            )}
            
            {renderDeveloperSection()}
            
            <List.Section>
              <List.Subheader>{t('about', { ns: 'settings', defaultValue: 'About' })}</List.Subheader>
            <List.Item
                title={t('version', { ns: 'settings', defaultValue: 'Version' })}
                description={`${appVersion} (${appBuild})`}
                left={props => <List.Icon {...props} icon="information" color={theme.colors.primary} />}
            />
          </List.Section>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  } catch (error) {
    console.error('Fatal error in Settings screen:', error);
    // Rendering fallback UI in case of crash
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Si è verificato un errore</Text>
          <Text style={styles.errorMessage}>
            {error?.message || 'Impossibile caricare le impostazioni'}
          </Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => {
              // Force reload component
              Alert.alert(
                'Ricarica',
                'Riprovare a caricare la schermata delle impostazioni?',
                [
                  {
                    text: 'Annulla',
                    style: 'cancel'
                  },
                  {
                    text: 'Riprova',
                    onPress: () => {
                      const { router } = require('expo-router');
                      router.replace('/dashboard');
                      setTimeout(() => {
                        router.push('/settings');
                      }, 500);
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.errorButtonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
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
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorMessage: {
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: PRIMARY_COLOR,
    padding: 10,
    borderRadius: 5,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 