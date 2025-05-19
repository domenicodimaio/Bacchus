import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Linking, Switch, ActivityIndicator, StatusBar } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import i18next, { changeLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useContext } from 'react';
import NavigationContext from '../contexts/NavigationContext';
import { useTheme } from '../contexts/ThemeContext';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { router, useNavigation } from 'expo-router';
import { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePurchase } from '../contexts/PurchaseContext';

// Storage keys
const STORAGE_KEY = {
  LANGUAGE: LANGUAGE_STORAGE_KEY,
  OFFLINE_MODE: 'bacchus_offline_mode',
  IS_PREMIUM: 'bacchus_is_premium',
  DEV_MODE_COUNT: 'bacchus_dev_mode_count'
};

// Define types for the auth context results
interface AuthResult {
  success: boolean;
  error?: string;
}

// Define SettingsItem props interface
interface SettingsItemProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onPress: (() => void) | null;
  rightComponent?: ReactNode;
  lastItem?: boolean;
}

// Componente per gli elementi del menu
const SettingsItem = ({ icon, title, subtitle, onPress, rightComponent, lastItem = false }: SettingsItemProps) => {
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  
  return (
    <>
    <TouchableOpacity
      style={[
          styles.menuItem, 
          { 
            borderBottomColor: lastItem ? 'transparent' : colors.border,
            borderBottomWidth: lastItem ? 0 : 0.5,
          }
        ]} 
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.menuItemLeft}>
          {icon && (
            <View style={[styles.menuItemIcon, { backgroundColor: colors.cardBackground }]}>
              {icon}
            </View>
          )}
          <View style={styles.menuItemTextContainer}>
            <Text style={[styles.menuItemTitle, { color: colors.text }]}>{title}</Text>
            {subtitle && <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
          </View>
        </View>
        <View style={styles.menuItemRight}>
          {rightComponent || (
            onPress && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
    </>
  );
};

// Define SettingsSection props interface
interface SettingsSectionProps {
  title?: string;
  children: ReactNode;
}

// Componente per le sezioni di impostazioni
const SettingsSection = ({ title, children }: SettingsSectionProps) => {
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  
  return (
    <View style={styles.section}>
      {title && (
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          {title}
        </Text>
      )}
      <View style={[
        styles.sectionContent, 
        { 
          backgroundColor: colors.cardBackground, 
          borderColor: colors.border,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
            },
            android: {
              elevation: 2,
            },
          }),
        }
      ]}>
        {children}
      </View>
    </View>
  );
};

export default function SettingsScreen() {
  // Inizializza la navigazione per gestire meglio lo swipe back
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  // Animation values
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);
  
  // Theme and translation
  const { currentTheme, isDarkMode, toggleDarkMode } = useTheme();
  const colors = currentTheme.COLORS;
  const { t, i18n } = useTranslation(['common', 'settings']);
  
  // Auth and navigation contexts
  const auth = useAuth();
  const navigationContext = useContext(NavigationContext);
  const setBlockNavigation = navigationContext?.setBlockNavigation;
  
  // Extract auth properties with defaults
  const isLoggedIn = auth?.isAuthenticated || false;
  const user = auth?.user || null;
  const signOut = auth?.logout || (async () => ({ success: false }));
  
  // Get app version from Constants
  const appVersion = Constants?.expoConfig?.version || '1.0.0';
  const appBuild = Constants?.expoConfig?.ios?.buildNumber || '448';
  
  // State
  const [language, setLanguage] = useState('it');
  const [offlineMode, setOfflineMode] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showDeveloperOptions, setShowDeveloperOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Animated styles
  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      transform: [{ translateY: contentTranslateY.value }]
    };
  });
  
  // Assicurati che il gesto di swipe back sia abilitato quando il componente viene montato
  useEffect(() => {
    // Supporta lo swipe back su iOS
    if (Platform.OS === 'ios' && navigation) {
      navigation.setOptions({
        gestureEnabled: true,
        gestureDirection: 'horizontal'
      });
    }
    
    loadSettings();
    
    // Start animations
    contentOpacity.value = withTiming(1, { duration: 500 });
    contentTranslateY.value = withTiming(0, { duration: 500 });
  }, [navigation]);
  
  // Function to load settings from storage
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Load language
      const storedLanguage = await AsyncStorage.getItem(STORAGE_KEY.LANGUAGE).catch(() => null);
      if (storedLanguage) {
        setLanguage(storedLanguage);
      }
      
      // Load offline mode
      const storedOfflineMode = await AsyncStorage.getItem(STORAGE_KEY.OFFLINE_MODE).catch(() => null);
      if (storedOfflineMode) {
        setOfflineMode(storedOfflineMode === 'true');
      }
      
      // Load premium status in modo sicuro con try/catch
      try {
      const storedIsPremium = await AsyncStorage.getItem(STORAGE_KEY.IS_PREMIUM);
        if (storedIsPremium !== null) {
        setIsPremium(storedIsPremium === 'true');
        }
      } catch (error) {
        console.error('Errore nel caricamento dello stato premium:', error);
        // Default a false in caso di errore
        setIsPremium(false);
      }
      
      // Check for developer mode con try/catch
      try {
        const devModeCount = await AsyncStorage.getItem(STORAGE_KEY.DEV_MODE_COUNT);
        const count = devModeCount ? parseInt(devModeCount, 10) : 0;
        setShowDeveloperOptions(count >= 7);
      } catch (error) {
        console.error('Errore nel caricamento del contatore DevMode:', error);
        setShowDeveloperOptions(false);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      
      // In caso di errore, usa i valori predefiniti
      setLanguage('it');
      setOfflineMode(false);
      setIsPremium(false);
      setShowDeveloperOptions(false);
      setIsLoading(false);
    }
  };
  
  // Function to handle language change
  const handleLanguageChange = async (newLanguage: string) => {
    if (!newLanguage || newLanguage === language) return;
    
    try {
      setIsLoading(true);
      
      // Aggiorniamo prima lo stato locale per feedback immediato all'utente
      setLanguage(newLanguage);
      
      // Cambio lingua con le funzioni migliorate del sistema i18n
      const success = await changeLanguage(newLanguage).catch(() => false);
      
      if (success) {
        setTimeout(() => {
          try {
            // Use proper translation key with fallback
            Alert.alert(
              t('languageChanged', { ns: 'settings', defaultValue: 'Language changed successfully' }),
              '',
              [{ text: 'OK' }]
            );
          } catch (alertError) {
            console.error('Error showing language change alert:', alertError);
          }
        }, 300);
      } else {
        try {
          Alert.alert(
            t('error', { ns: 'common', defaultValue: 'Error' }),
            t('languageChangeError', { ns: 'settings', defaultValue: 'Error changing language' })
          );
        } catch (alertError) {
          console.error('Error showing language error alert:', alertError);
        }
      }
    } catch (error) {
      console.error('Error changing language:', error);
      // Ripristiniamo lo stato locale alla lingua precedente in caso di errore
      setLanguage(language);
      
      try {
      Alert.alert(
          t('error', { ns: 'common', defaultValue: 'Error' }),
          t('languageChangeError', { ns: 'settings', defaultValue: 'Error changing language' })
      );
      } catch (alertError) {
        console.error('Error showing language error alert:', alertError);
      }
    } finally {
      setIsLoading(false);
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
        t('offlineModeToggleError', { ns: 'settings', defaultValue: 'Error toggling offline mode' })
      );
    }
  };
  
  // Function to handle dark mode toggle
  const handleDarkModeToggle = async () => {
    try {
      toggleDarkMode();
    } catch (error) {
      console.error('Error toggling dark mode:', error);
      Alert.alert(
        t('error', { ns: 'common', defaultValue: 'Error' }),
        t('darkModeToggleError', { ns: 'settings', defaultValue: 'Error toggling dark mode' })
      );
    }
  };
  
  // Function to handle logout
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      
      // Conferma prima di effettuare il logout
      Alert.alert(
        t('logout', { ns: 'common', defaultValue: 'Logout' }),
        t('logoutConfirm', { ns: 'settings', defaultValue: 'Are you sure you want to logout?' }),
        [
          {
            text: t('cancel', { ns: 'common', defaultValue: 'Cancel' }),
            style: 'cancel'
          },
          {
            text: t('logout', { ns: 'common', defaultValue: 'Logout' }),
            style: 'destructive',
            onPress: async () => {
              try {
                // Effettua il logout
                const result = await signOut();
                
                if (result.success) {
                  console.log('Logout successful');
                  
                  // Naviga alla schermata di login
                  setTimeout(() => {
                    router.push('/auth/login');
                  }, 500);
                } else {
                  const errorMessage = 'error' in result ? result.error : 'Unknown error';
                  console.error('Logout failed:', errorMessage);
                  Alert.alert(
                    t('error', { ns: 'common', defaultValue: 'Error' }),
                    t('logoutError', { ns: 'settings', defaultValue: 'Error logging out' })
                  );
                }
              } catch (error) {
                console.error('Logout error:', error);
                Alert.alert(
                  t('error', { ns: 'common', defaultValue: 'Error' }),
                  t('logoutError', { ns: 'settings', defaultValue: 'Error logging out' })
                );
              } finally {
                setIsLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoading(false);
    }
  };
  
  // Function to handle account deletion
  const handleDeleteAccount = () => {
    // Since deleteAccount might not exist in AuthContextType, we handle it safely
    if (!auth || !('deleteAccount' in auth) || typeof auth['deleteAccount'] !== 'function') {
      Alert.alert(
        t('error', { ns: 'common', defaultValue: 'Error' }),
        t('accountDeletionError', { ns: 'settings', defaultValue: 'Cannot delete account at this time' })
      );
      return;
    }
    
    Alert.alert(
      t('deleteAccount', { ns: 'common', defaultValue: 'Delete Account' }),
      t('deleteAccountConfirmation', { ns: 'settings', defaultValue: 'Are you sure you want to delete your account? This action cannot be undone.' }),
      [
        {
          text: t('cancel', { ns: 'common', defaultValue: 'Cancel' }),
          style: 'cancel'
        },
        {
          text: t('delete', { ns: 'common', defaultValue: 'Delete' }),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Use indexing to safely access the method
              const deleteAccountFn = auth['deleteAccount'] as () => Promise<AuthResult>;
              const result = await deleteAccountFn();
              
              if (result.success) {
                console.log('Account deleted successfully');
                // La navigazione viene gestita dentro la funzione deleteAccount
              } else {
                const errorMessage = 'error' in result ? result.error : 'Unknown error';
                console.error('Account deletion failed:', errorMessage);
            Alert.alert(
                  t('error', { ns: 'common', defaultValue: 'Error' }),
                  t('accountDeletionError', { ns: 'settings', defaultValue: 'Error deleting account' })
                );
                setIsLoading(false);
              }
            } catch (error) {
              console.error('Account deletion error:', error);
              Alert.alert(
                t('error', { ns: 'common', defaultValue: 'Error' }),
                t('accountDeletionError', { ns: 'settings', defaultValue: 'Error deleting account' })
              );
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const togglePremiumStatus = async () => {
    try {
      const newValue = !isPremium;
      setIsPremium(newValue);
      await AsyncStorage.setItem(STORAGE_KEY.IS_PREMIUM, newValue.toString());
      
      // Mostra un messaggio di conferma
      Alert.alert(
        newValue 
          ? t('premiumEnabled', { ns: 'settings', defaultValue: 'Premium enabled for testing' })
          : t('premiumDisabled', { ns: 'settings', defaultValue: 'Premium disabled' }),
        '',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error toggling premium status:', error);
      // Riporta lo stato al valore originale in caso di errore
      setIsPremium(isPremium);
    }
  };

  const handleOpenPrivacyPolicy = () => {
    // Apri il link alla privacy policy
    Linking.openURL('https://www.bacchusapp.com/privacy-policy');
  };

  const handleOpenTerms = () => {
    // Apri il link ai termini di servizio
    Linking.openURL('https://www.bacchusapp.com/terms');
  };

  const handleContactSupport = () => {
    // Apri l'email per il supporto
    Linking.openURL('mailto:support@bacchusapp.com?subject=Support%20Request');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.headerBackground || colors.background}
      />
      
      <AppHeader
        title={t('settings', { ns: 'common' })}
        isMainScreen={false}
      />
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
              </View>
      ) : (
        <Animated.ScrollView 
        style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 24 }
          ]}
        showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          <Animated.View style={contentAnimatedStyle}>
            
            {/* Premium Features Section - Temporaneamente disabilitato per prevenire crash */}
            <View style={[styles.section, { 
              backgroundColor: colors.cardElevated,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="star-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>
                  {t('premiumFeatures', { ns: 'purchases', defaultValue: 'Funzionalità Premium' })}
                </Text>
              </View>
              <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 14 }}>
                {t('upgradeToUnlock', { ns: 'purchases', defaultValue: 'Passa a Premium per sbloccare le funzionalità avanzate.' })}
              </Text>
            </View>
            
            {/* Account Section */}
            {isLoggedIn && (
              <SettingsSection title={t('account', { ns: 'settings', defaultValue: 'Account' })}>
                <SettingsItem
                  icon={<Ionicons name="person-outline" size={20} color={colors.primary} />}
                  title={t('accountDetails', { ns: 'settings', defaultValue: 'Account Details' })}
                  subtitle={user?.email || ''}
                  onPress={null}
                  lastItem={true}
                />
              </SettingsSection>
            )}
            
            {/* Preferences Section */}
            <SettingsSection title={t('preferences', { ns: 'common', defaultValue: 'Preferences' })}>
              {/* Language Selector */}
              <SettingsItem
                icon={<Ionicons name="language-outline" size={20} color={colors.primary} />}
                title={t('language', { ns: 'common', defaultValue: 'Language' })}
                subtitle={language === 'it' ? 'Italiano' : 'English'}
                onPress={() => {
                  Alert.alert(
                    t('selectLanguage', { ns: 'common', defaultValue: 'Select Language' }),
                    '',
                    [
                      {
                        text: 'English',
                        onPress: () => handleLanguageChange('en')
                      },
                      {
                        text: 'Italiano',
                        onPress: () => handleLanguageChange('it')
                      },
                      {
                        text: t('cancel', { ns: 'common', defaultValue: 'Cancel' }),
                        style: 'cancel'
                      }
                    ]
                  );
                }}
              />
              
              {/* Dark Mode Toggle */}
              <SettingsItem
                icon={<Ionicons name={isDarkMode ? "moon-outline" : "sunny-outline"} size={20} color={colors.primary} />}
                title={t('darkMode', { ns: 'settings', defaultValue: 'Dark Mode' })}
                subtitle=""
                onPress={null}
                rightComponent={
                  <Switch
              value={isDarkMode}
              onValueChange={handleDarkModeToggle}
                    trackColor={{ false: '#767577', true: colors.primary }}
                    thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                  />
                }
              />
              
              {/* Offline Mode Toggle */}
              <SettingsItem
                icon={<Ionicons name="cloud-offline-outline" size={20} color={colors.primary} />}
                title={t('offlineMode', { ns: 'common', defaultValue: 'Offline Mode' })}
                subtitle=""
                onPress={null}
                lastItem={true}
                rightComponent={
                  <Switch
              value={offlineMode}
              onValueChange={handleOfflineModeToggle}
                    trackColor={{ false: '#767577', true: colors.primary }}
                    thumbColor={offlineMode ? '#f5dd4b' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                  />
                }
              />
            </SettingsSection>
            
            {/* Legal Section */}
            <SettingsSection title={t('legal', { ns: 'settings', defaultValue: 'Legal' })}>
              <SettingsItem
                icon={<Ionicons name="document-text-outline" size={20} color={colors.primary} />}
                title={t('privacyPolicy', { ns: 'common', defaultValue: 'Privacy Policy' })}
                subtitle=""
                onPress={handleOpenPrivacyPolicy}
              />
              
              <SettingsItem
                icon={<Ionicons name="newspaper-outline" size={20} color={colors.primary} />}
                title={t('termsOfService', { ns: 'common', defaultValue: 'Terms of Service' })}
                subtitle=""
                onPress={handleOpenTerms}
                lastItem={true}
              />
            </SettingsSection>
            
            {/* Support Section */}
            <SettingsSection title={t('supportAndFeedback', { ns: 'settings', defaultValue: 'Support & Feedback' })}>
              <SettingsItem
                icon={<Ionicons name="mail-outline" size={20} color={colors.primary} />}
                title={t('contactSupport', { ns: 'settings', defaultValue: 'Contact Support' })}
                subtitle=""
                onPress={handleContactSupport}
                lastItem={true}
              />
            </SettingsSection>
            
            {/* About Section */}
            <SettingsSection title={t('about', { ns: 'common', defaultValue: 'About' })}>
              <SettingsItem
                icon={<Ionicons name="information-circle-outline" size={20} color={colors.primary} />}
                title={t('version', { ns: 'common', defaultValue: 'Version' })}
                subtitle={`${appVersion} (${appBuild})`}
                onPress={() => {
                  // Incrementa il contatore per modalità sviluppatore
                  AsyncStorage.getItem(STORAGE_KEY.DEV_MODE_COUNT).then(count => {
                    const newCount = parseInt(count || '0', 10) + 1;
                    AsyncStorage.setItem(STORAGE_KEY.DEV_MODE_COUNT, newCount.toString()).then(() => {
                      if (newCount === 7) {
                        setShowDeveloperOptions(true);
                        Alert.alert('Developer Mode', 'Developer options enabled!');
                      }
                    });
                  });
                }}
                lastItem={true}
              />
            </SettingsSection>
            
            {/* Developer Options (visible solo se attivato) */}
            {showDeveloperOptions && (
              <SettingsSection title="Developer Options">
                <SettingsItem
                  icon={<Ionicons name="code-outline" size={20} color={colors.primary} />}
                  title="Toggle Premium Status"
                  subtitle=""
                  onPress={togglePremiumStatus}
                  rightComponent={
                    <Switch
                      value={isPremium}
                      onValueChange={togglePremiumStatus}
                      trackColor={{ false: '#767577', true: colors.primary }}
                      thumbColor={isPremium ? '#f5dd4b' : '#f4f3f4'}
                      ios_backgroundColor="#3e3e3e"
                    />
                  }
                />
                
                <SettingsItem
                  icon={<Ionicons name="refresh-outline" size={20} color={colors.primary} />}
                  title="Reset App Data"
                  subtitle=""
                  onPress={() => {
                    Alert.alert(
                      'Reset App Data',
                      'Are you sure you want to reset all app data? This action cannot be undone.',
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel'
                        },
                        {
                          text: 'Reset',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await AsyncStorage.clear();
                              Alert.alert('Success', 'App data reset successfully. Please restart the app.');
                            } catch (error) {
                              console.error('Error resetting app data:', error);
                              Alert.alert('Error', 'Failed to reset app data');
                            }
                          }
                        }
                      ]
                    );
                  }}
                  lastItem={true}
                />
              </SettingsSection>
            )}
            
            {/* Action Buttons */}
            {isLoggedIn && (
              <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                  style={[styles.logoutButton, { backgroundColor: colors.danger }]}
                onPress={handleLogout}
                >
                  <LinearGradient
                    colors={[colors.danger, '#E63946']}
                    start={[0, 0]}
                    end={[1, 0]}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.logoutButtonText}>{t('logout', { ns: 'common', defaultValue: 'Logout' })}</Text>
                  </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                  style={[styles.deleteAccountButton, { borderColor: colors.danger }]}
                onPress={handleDeleteAccount}
              >
                  <Text style={[styles.deleteAccountButtonText, { color: colors.danger }]}>{t('deleteAccount', { ns: 'common', defaultValue: 'Delete Account' })}</Text>
              </TouchableOpacity>
          </View>
        )}
        
            {/* Legal Info */}
            <View style={styles.legalInfoContainer}>
              <Text style={[styles.legalText, { color: colors.textSecondary }]}>
                {t('appName', { ns: 'common', defaultValue: 'Bacchus' })} © {new Date().getFullYear()}
            </Text>
            
              <Text style={[styles.legalText, { color: colors.textSecondary, marginBottom: 30 }]}>
                {t('legalDisclaimer', { ns: 'common', defaultValue: 'This app is for educational purposes only. Do not use to determine if you are able to drive.' })}
                </Text>
              </View>
          </Animated.View>
        </Animated.ScrollView>
      )}
          </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    paddingLeft: 8,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  menuItemRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  logoutButton: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountButton: {
    marginBottom: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAccountButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  legalInfoContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  legalText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 4,
  },
}); 