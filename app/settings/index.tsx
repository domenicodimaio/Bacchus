import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { Text, List, Divider, useTheme, Switch as PaperSwitch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import i18next from '../i18n';
import { saveLanguageToStorage, LANGUAGE_STORAGE_KEY } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useContext } from 'react';
import NavigationContext from '../contexts/NavigationContext';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

// Storage keys
const STORAGE_KEY = {
  LANGUAGE: LANGUAGE_STORAGE_KEY,
  OFFLINE_MODE: 'bacchus_offline_mode',
  IS_PREMIUM: 'bacchus_is_premium',
  DEV_MODE_COUNT: 'bacchus_dev_mode_count'
};

export default function SettingsScreen() {
  // Theme and translation
  const theme = useTheme();
  const { colors } = theme;
  const { t, i18n } = useTranslation(['common', 'settings']);
  
  // Auth and navigation contexts
  const auth = useAuth();
  const navigationContext = useContext(NavigationContext);
  const setBlockNavigation = navigationContext?.setBlockNavigation;
  const { isDarkMode, toggleDarkMode } = useAppTheme();
  const isDark = theme.dark;
  
  // Extract auth properties with defaults
  const isLoggedIn = auth?.isAuthenticated || false;
  const user = auth?.user || null;
  const signOut = auth?.logout || (async () => ({ success: false }));
  
  // Get app version from Constants
  const appVersion = Constants?.expoConfig?.version || '1.0.0';
  const appBuild = Constants?.expoConfig?.ios?.buildNumber || '170';
  
  // State
  const [language, setLanguage] = useState('it');
  const [offlineMode, setOfflineMode] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showDeveloperOptions, setShowDeveloperOptions] = useState(false);
  
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
      
      // In caso di errore, usa i valori predefiniti
      setLanguage('it');
      setOfflineMode(false);
      setIsPremium(false);
      setShowDeveloperOptions(false);
    }
  };
  
  // Function to handle language change
  const handleLanguageChange = async (newLanguage: string) => {
    if (!newLanguage || newLanguage === language) return;
    
    try {
      // Aggiorniamo prima lo stato locale per feedback immediato all'utente
      setLanguage(newLanguage);
      
      // Salviamo in AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY.LANGUAGE, newLanguage);
      
      // Utilizziamo la funzione condivisa per salvare la lingua
      if (saveLanguageToStorage) {
        await saveLanguageToStorage(newLanguage);
      }
      
      // Cambiamo la lingua utilizzando i18n in un blocco try/catch separato
      try {
        await i18n.changeLanguage(newLanguage);
      } catch (langError) {
        console.error('Error in i18n.changeLanguage:', langError);
        // Anche se c'è un errore nel cambio lingua, non interrompiamo il flusso
      }
      
      // Mostra una conferma con un timeout per dare tempo al sistema di applicare il cambio lingua
      setTimeout(() => {
        // Utilizziamo chiavi di default per evitare problemi se le traduzioni non sono ancora pronte
        Alert.alert(
          newLanguage === 'it' ? 'Lingua cambiata con successo' : 'Language changed successfully',
          '',
          [{ text: 'OK' }]
        );
      }, 300);
    } catch (error) {
      console.error('Error changing language:', error);
      // Ripristiniamo lo stato locale alla lingua precedente in caso di errore
      setLanguage(language);
      Alert.alert(
        t('error', { ns: 'common', defaultValue: 'Error' }),
        t('languageChangeError', { ns: 'settings', defaultValue: 'Error changing language' })
      );
    }
  };

  // Function to handle offline mode toggle
  const handleOfflineModeToggle = async () => {
    try {
      const newValue = !offlineMode;
      setOfflineMode(newValue);
      await AsyncStorage.setItem(STORAGE_KEY.OFFLINE_MODE, newValue.toString());
      
      // Mostra un messaggio di conferma
      Alert.alert(
        newValue 
          ? t('offlineModeEnabled', { ns: 'common', defaultValue: 'Offline mode enabled' })
          : t('offlineModeDisabled', { ns: 'common', defaultValue: 'Offline mode disabled' }),
        '',
        [{ text: 'OK' }]
      );
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
        t('themeChangeError', { ns: 'settings', defaultValue: 'Error changing theme' })
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
      Alert.alert(
        t('logout', { ns: 'common', defaultValue: 'Logout' }),
        t('logoutConfirm', { ns: 'settings', defaultValue: 'Are you sure you want to logout?' }),
        [
          {
            text: t('cancel', { ns: 'common', defaultValue: 'Cancel' }),
            style: 'cancel',
          },
          {
            text: t('logout', { ns: 'common', defaultValue: 'Logout' }),
            style: 'destructive',
            onPress: async () => {
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
            }
          },
        ]
      );
    } catch (error) {
      console.error('Logout dialog error:', error);
    }
  };
  
  // Function to handle account deletion
  const handleDeleteAccount = () => {
    Alert.alert(
      t('deleteAccount', { ns: 'common', defaultValue: 'Delete Account' }),
      t('deleteAccountConfirm', { ns: 'settings', defaultValue: 'Are you sure you want to delete your account? This action cannot be undone.' }),
      [
        {
          text: t('cancel', { ns: 'common', defaultValue: 'Cancel' }),
          style: 'cancel',
        },
        {
          text: t('deleteAccount', { ns: 'common', defaultValue: 'Delete Account' }),
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            Alert.alert(
              t('info', { ns: 'common', defaultValue: 'Information' }),
              t('comingSoon', { ns: 'common', defaultValue: 'Coming Soon' })
            );
          }
        },
      ]
    );
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

  // Render enhanced settings screen with better UX/UI
  return (
    <SafeAreaView 
      style={[
        styles.container, 
        { backgroundColor: isDark ? '#05111d' : '#f5f7fa' }
      ]} 
      edges={['top']}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#103366' }]}>
          {t('settings', { ns: 'common', defaultValue: 'Settings' })}
        </Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        <View style={[
          styles.sectionContainer, 
          { 
            backgroundColor: isDark ? '#0c2348' : '#FFFFFF',
            borderColor: isDark ? '#1a3969' : '#e6eaf0',
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#82ccff' : '#1a73e8' }]}>
            {t('appearance', { ns: 'settings', defaultValue: 'Appearance' })}
          </Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="language-outline" size={24} color={isDark ? '#82ccff' : '#1a73e8'} style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : '#333333' }]}>
                  {t('language', { ns: 'settings', defaultValue: 'Language' })}
                </Text>
                <Text style={[styles.settingDescription, { color: isDark ? '#a7c0e0' : '#757575' }]}>
                  {t('selectLanguage', { ns: 'settings', defaultValue: 'Select language' })}
                </Text>
              </View>
            </View>
            <View style={styles.languageSelector}>
              <TouchableOpacity 
                style={[
                  styles.languageButton, 
                  language === 'it' && 
                  (isDark ? styles.selectedLanguageButtonDark : styles.selectedLanguageButton)
                ]}
                onPress={() => handleLanguageChange('it')}
                accessibilityLabel="Italiano"
                accessibilityRole="button"
              >
                <Text style={[
                  styles.languageButtonText, 
                  { color: language === 'it' ? (isDark ? '#FFFFFF' : '#333333') : (isDark ? '#a7c0e0' : '#757575') }
                ]}>
                  🇮🇹
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.languageButton, 
                  language === 'en' && 
                  (isDark ? styles.selectedLanguageButtonDark : styles.selectedLanguageButton)
                ]}
                onPress={() => handleLanguageChange('en')}
                accessibilityLabel="English"
                accessibilityRole="button"
              >
                <Text style={[
                  styles.languageButtonText, 
                  { color: language === 'en' ? (isDark ? '#FFFFFF' : '#333333') : (isDark ? '#a7c0e0' : '#757575') }
                ]}>
                  🇬🇧
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={24} color={isDark ? '#82ccff' : '#1a73e8'} style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : '#333333' }]}>
                  {t('darkMode', { ns: 'settings', defaultValue: 'Dark Mode' })}
                </Text>
                <Text style={[styles.settingDescription, { color: isDark ? '#a7c0e0' : '#757575' }]}>
                  {t('darkModeDesc', { ns: 'settings', defaultValue: 'Toggle dark or light appearance' })}
                </Text>
              </View>
            </View>
            <PaperSwitch
              value={isDarkMode}
              onValueChange={handleDarkModeToggle}
              color={isDark ? '#82ccff' : '#1a73e8'}
              accessibilityLabel={t('darkMode', { ns: 'settings', defaultValue: 'Dark Mode' })}
              accessibilityState={{ checked: isDarkMode }}
            />
          </View>
          
          <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="wifi-outline" size={24} color={isDark ? '#82ccff' : '#1a73e8'} style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : '#333333' }]}>
                  {t('offlineMode', { ns: 'settings', defaultValue: 'Offline Mode' })}
                </Text>
                <Text style={[styles.settingDescription, { color: isDark ? '#a7c0e0' : '#757575' }]}>
                  {t('offlineModeDesc', { ns: 'settings', defaultValue: 'Save data locally only' })}
                </Text>
              </View>
            </View>
            <PaperSwitch
              value={offlineMode}
              onValueChange={handleOfflineModeToggle}
              color={isDark ? '#82ccff' : '#1a73e8'}
              accessibilityLabel={t('offlineMode', { ns: 'settings', defaultValue: 'Offline Mode' })}
              accessibilityState={{ checked: offlineMode }}
            />
          </View>
        </View>
        
        {/* Premium Features */}
        <View style={[
          styles.sectionContainer, 
          { 
            backgroundColor: isDark ? '#0c2348' : '#FFFFFF',
            borderColor: isDark ? '#1a3969' : '#e6eaf0',
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#82ccff' : '#1a73e8' }]}>
            {t('premiumFeatures', { ns: 'settings', defaultValue: 'Premium Features' })}
          </Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons 
                name="star" 
                size={24} 
                color={isPremium ? (isDark ? '#FFD700' : '#FFC107') : (isDark ? '#a7c0e0' : '#BDBDBD')} 
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : '#333333' }]}>
                  {t('premiumActive', { ns: 'settings', defaultValue: 'Premium Active' })}
                </Text>
                <Text style={[styles.settingDescription, { color: isDark ? '#a7c0e0' : '#757575' }]}>
                  {isPremium 
                    ? t('premiumActiveDesc', { ns: 'settings', defaultValue: 'Your premium subscription is active' })
                    : t('premiumInactiveDesc', { ns: 'settings', defaultValue: 'Upgrade to premium for extra features' })}
                </Text>
              </View>
            </View>
            {!isPremium && (
              <TouchableOpacity 
                style={[styles.upgradeButton, { backgroundColor: isDark ? '#82ccff' : '#1a73e8' }]}
                onPress={() => {
                  /* TODO: Implementare upgrade */
                  Alert.alert(t('premium', { ns: 'settings', defaultValue: 'Premium' }), 
                             t('premiumComingSoon', { ns: 'settings', defaultValue: 'Premium upgrade coming soon' }));
                }}
                accessibilityLabel={t('upgradeToPremium', { ns: 'purchases', defaultValue: 'Upgrade to Premium' })}
                accessibilityRole="button"
              >
                <Text style={styles.upgradeButtonText}>
                  {t('upgradeToPremium', { ns: 'common', defaultValue: 'Upgrade to Premium' })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
          
          {/* Premium feature list */}
          <View style={styles.premiumFeatureList}>
            <View style={styles.premiumFeature}>
              <Ionicons 
                name="infinite" 
                size={20} 
                color={isPremium ? (isDark ? '#82ccff' : '#1a73e8') : (isDark ? '#a7c0e0' : '#BDBDBD')}
                style={styles.premiumFeatureIcon} 
              />
              <Text style={[
                styles.premiumFeatureText, 
                { color: isPremium ? (isDark ? '#FFFFFF' : '#333333') : (isDark ? '#a7c0e0' : '#757575') }
              ]}>
                {t('unlimitedSessions', { ns: 'settings', defaultValue: 'Unlimited Sessions' })}
              </Text>
            </View>
            
            <View style={styles.premiumFeature}>
              <Ionicons 
                name="stats-chart" 
                size={20} 
                color={isPremium ? (isDark ? '#82ccff' : '#1a73e8') : (isDark ? '#a7c0e0' : '#BDBDBD')}
                style={styles.premiumFeatureIcon}
              />
              <Text style={[
                styles.premiumFeatureText, 
                { color: isPremium ? (isDark ? '#FFFFFF' : '#333333') : (isDark ? '#a7c0e0' : '#757575') }
              ]}>
                {t('advancedStatistics', { ns: 'settings', defaultValue: 'Advanced Statistics' })}
              </Text>
            </View>
            
            <View style={styles.premiumFeature}>
              <Ionicons 
                name="document-text" 
                size={20} 
                color={isPremium ? (isDark ? '#82ccff' : '#1a73e8') : (isDark ? '#a7c0e0' : '#BDBDBD')}
                style={styles.premiumFeatureIcon}
              />
              <Text style={[
                styles.premiumFeatureText, 
                { color: isPremium ? (isDark ? '#FFFFFF' : '#333333') : (isDark ? '#a7c0e0' : '#757575') }
              ]}>
                {t('dataExport', { ns: 'settings', defaultValue: 'Data Export' })}
              </Text>
            </View>
            
            <View style={styles.premiumFeature}>
              <Ionicons 
                name="close-circle" 
                size={20} 
                color={isPremium ? (isDark ? '#82ccff' : '#1a73e8') : (isDark ? '#a7c0e0' : '#BDBDBD')}
                style={styles.premiumFeatureIcon}
              />
              <Text style={[
                styles.premiumFeatureText, 
                { color: isPremium ? (isDark ? '#FFFFFF' : '#333333') : (isDark ? '#a7c0e0' : '#757575') }
              ]}>
                {t('noAds', { ns: 'settings', defaultValue: 'No Advertisements' })}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Account Section */}
        {isLoggedIn && (
          <View style={[
            styles.sectionContainer, 
            { 
              backgroundColor: isDark ? '#0c2348' : '#FFFFFF',
              borderColor: isDark ? '#1a3969' : '#e6eaf0',
            }
          ]}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#82ccff' : '#1a73e8' }]}>
              {t('account', { ns: 'settings', defaultValue: 'Account' })}
            </Text>
            
            {user && (
              <View style={styles.accountInfo}>
                <Ionicons name="person" size={40} color={isDark ? '#82ccff' : '#1a73e8'} />
                <View style={styles.accountTextContainer}>
                  <Text style={[styles.accountEmail, { color: isDark ? '#FFFFFF' : '#333333' }]}>
                    {user.email}
                  </Text>
                  <Text style={[styles.accountStatus, { color: isDark ? '#a7c0e0' : '#757575' }]}>
                    {t('loggedIn', { ns: 'settings', defaultValue: 'Logged in' })}
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.accountButtonsContainer}>
              <TouchableOpacity 
                style={[styles.accountButton, { borderColor: isDark ? '#1a3969' : '#e6eaf0' }]}
                onPress={handleLogout}
                accessibilityLabel={t('logout', { ns: 'common', defaultValue: 'Logout' })}
                accessibilityRole="button"
              >
                <Ionicons name="log-out-outline" size={20} color={isDark ? '#82ccff' : '#1a73e8'} />
                <Text style={[styles.accountButtonText, { color: isDark ? '#FFFFFF' : '#333333' }]}>
                  {t('logout', { ns: 'common', defaultValue: 'Logout' })}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.accountButton, styles.dangerButton, { borderColor: isDark ? '#541515' : '#ffebee' }]}
                onPress={handleDeleteAccount}
                accessibilityLabel={t('deleteAccount', { ns: 'common', defaultValue: 'Delete Account' })}
                accessibilityRole="button"
              >
                <Ionicons name="trash-outline" size={20} color={isDark ? '#ff5252' : '#f44336'} />
                <Text style={[styles.accountButtonText, { color: isDark ? '#ff5252' : '#f44336' }]}>
                  {t('deleteAccount', { ns: 'common', defaultValue: 'Delete Account' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Developer Options */}
        {showDeveloperOptions && (
          <View style={[
            styles.sectionContainer, 
            { 
              backgroundColor: isDark ? '#0c2348' : '#FFFFFF',
              borderColor: isDark ? '#1a3969' : '#e6eaf0',
            }
          ]}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#82ccff' : '#1a73e8' }]}>
              {t('developerOptions', { ns: 'settings', defaultValue: 'Developer Options' })}
            </Text>
            
            <TouchableOpacity 
              style={styles.devOption}
              onPress={togglePremiumStatus}
              accessibilityLabel={t('togglePremium', { ns: 'settings', defaultValue: 'Toggle Premium Status' })}
              accessibilityRole="button"
            >
              <Ionicons name="construct" size={24} color={isDark ? '#82ccff' : '#1a73e8'} style={styles.devOptionIcon} />
              <View style={styles.devOptionTextContainer}>
                <Text style={[styles.devOptionTitle, { color: isDark ? '#FFFFFF' : '#333333' }]}>
                  {t('togglePremium', { ns: 'settings', defaultValue: 'Toggle Premium Status' })}
                </Text>
                <Text style={[styles.devOptionDescription, { color: isDark ? '#a7c0e0' : '#757575' }]}>
                  {isPremium 
                    ? t('disablePremium', { ns: 'settings', defaultValue: 'Disable premium features for testing' })
                    : t('enablePremium', { ns: 'settings', defaultValue: 'Enable premium features for testing' })}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
        
        {/* About Section */}
        <View style={[
          styles.sectionContainer, 
          { 
            backgroundColor: isDark ? '#0c2348' : '#FFFFFF',
            borderColor: isDark ? '#1a3969' : '#e6eaf0',
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#82ccff' : '#1a73e8' }]}>
            {t('about', { ns: 'settings', defaultValue: 'About' })}
          </Text>
          
          <View style={styles.versionInfo}>
            <Text style={[styles.versionLabel, { color: isDark ? '#a7c0e0' : '#757575' }]}>
              {t('version', { ns: 'settings', defaultValue: 'Version' })}
            </Text>
            <Text style={[styles.versionNumber, { color: isDark ? '#FFFFFF' : '#333333' }]}>
              {appVersion} ({appBuild})
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.legalLink}
            onPress={() => {
              /* TODO: Navigate to privacy policy */
              Alert.alert(t('info', { ns: 'common', defaultValue: 'Information' }), 
                         t('comingSoon', { ns: 'common', defaultValue: 'Coming Soon' }));
            }}
            accessibilityRole="link"
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={isDark ? '#82ccff' : '#1a73e8'} />
            <Text style={[styles.legalLinkText, { color: isDark ? '#82ccff' : '#1a73e8' }]}>
              {t('privacyPolicy', { ns: 'settings', defaultValue: 'Privacy Policy' })}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.legalLink}
            onPress={() => {
              /* TODO: Navigate to terms of service */
              Alert.alert(t('info', { ns: 'common', defaultValue: 'Information' }), 
                         t('comingSoon', { ns: 'common', defaultValue: 'Coming Soon' }));
            }}
            accessibilityRole="link"
          >
            <Ionicons name="document-text-outline" size={20} color={isDark ? '#82ccff' : '#1a73e8'} />
            <Text style={[styles.legalLinkText, { color: isDark ? '#82ccff' : '#1a73e8' }]}>
              {t('termsOfService', { ns: 'settings', defaultValue: 'Terms of Service' })}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.credits}>
            <Text style={[styles.creditsText, { color: isDark ? '#a7c0e0' : '#757575' }]}>
              © 2023-2025 Bacchus
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Enhanced styles for better UX/UI
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 4,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  languageSelector: {
    flexDirection: 'row',
  },
  languageButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  selectedLanguageButton: {
    backgroundColor: 'rgba(26, 115, 232, 0.15)',
  },
  selectedLanguageButtonDark: {
    backgroundColor: 'rgba(130, 204, 255, 0.25)',
  },
  languageButtonText: {
    fontSize: 20,
  },
  premiumFeatureList: {
    marginTop: 8,
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  premiumFeatureIcon: {
    marginRight: 4,
  },
  premiumFeatureText: {
    marginLeft: 12,
    fontSize: 15,
    lineHeight: 20,
  },
  upgradeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  accountTextContainer: {
    marginLeft: 12,
  },
  accountEmail: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountStatus: {
    fontSize: 14,
    marginTop: 2,
  },
  accountButtonsContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  dangerButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
  },
  accountButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  devOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  devOptionIcon: {
    marginRight: 4,
  },
  devOptionTextContainer: {
    marginLeft: 12,
  },
  devOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  devOptionDescription: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 20,
  },
  versionInfo: {
    marginBottom: 20,
  },
  versionLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  versionNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  legalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  legalLinkText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 10,
  },
  credits: {
    marginTop: 16,
    alignItems: 'center',
  },
  creditsText: {
    fontSize: 14,
  },
}); 