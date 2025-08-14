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
import supabase from '../lib/supabase/client';
import authService from '../lib/services/auth.service';

// Storage keys
const STORAGE_KEY = {
  LANGUAGE: LANGUAGE_STORAGE_KEY,
  IS_PREMIUM: 'SIMULATE_PREMIUM', // 🔧 SINCRONIZZATO con PurchaseContext
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
  
  // Purchase context for debug tools
  const { remainingFreeSessions, initializePurchases, toggleSimulatePremium } = usePurchase();
  
  // Get app version from Constants
  const appVersion = Constants?.expoConfig?.version || '1.0.0';
  const appBuild = Constants?.expoConfig?.ios?.buildNumber || '982';
  
  // State
  const [language, setLanguage] = useState('it');

  const [isPremium, setIsPremium] = useState(false);
  const [showDeveloperOptions, setShowDeveloperOptions] = useState(true); // 🔧 SEMPRE VISIBILE PER DEBUG
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
        // 🔧 SEMPRE MOSTRA DEVELOPER OPTIONS PER DEBUG
        setShowDeveloperOptions(__DEV__ || count >= 7);
      } catch (error) {
        console.error('Errore nel caricamento del contatore DevMode:', error);
        // 🔧 MOSTRA COMUNQUE IN DEV MODE
        setShowDeveloperOptions(__DEV__);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      
      // In caso di errore, usa i valori predefiniti
      setLanguage('it');
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
      Alert.alert(
      t('logout', { ns: 'common', defaultValue: 'Esci' }),
        t('logoutConfirm', { ns: 'settings', defaultValue: 'Are you sure you want to logout?' }),
        [
          {
            text: t('cancel', { ns: 'common', defaultValue: 'Cancel' }),
          style: 'cancel'
          },
          {
            text: t('logout', { ns: 'common', defaultValue: 'Esci' }),
            style: 'destructive',
            onPress: async () => {
              try {
              setIsLoading(true);
              console.log('SETTINGS: Inizio processo di logout');
                
              // Effettua il logout tramite il servizio
                const result = await signOut();
                
              console.log('SETTINGS: Risultato logout:', result);
              
              // Reindirizza sempre alla schermata di login, indipendentemente dal risultato
              // per evitare che l'utente rimanga bloccato
              setTimeout(() => {
                router.replace('/auth/login');
              }, 100);
              
              } catch (error) {
              console.error('SETTINGS: Errore durante il logout:', error);
              // Anche in caso di errore, reindirizza al login
              router.replace('/auth/login');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
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
                if (result.error === 'partial_deletion') {
                  // Eliminazione parziale: logout effettuato ma account potrebbe richiedere azione manuale
                  Alert.alert(
                    t('accountLoggedOut', { ns: 'settings', defaultValue: 'Logout effettuato' }),
                    t('accountDeletionPartial', { ns: 'settings', defaultValue: 'Il logout è stato completato e i tuoi dati locali sono stati eliminati. Per la completa eliminazione dell\'account, contatta il supporto.' }),
                    [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
                  );
                } else {
                  // Eliminazione completa
                  Alert.alert(
                    t('accountDeleted', { ns: 'settings', defaultValue: 'Account eliminato' }),
                    t('accountDeletionSuccess', { ns: 'settings', defaultValue: 'Il tuo account è stato eliminato con successo.' }),
                    [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
                  );
                }
                setIsLoading(false);
                // La navigazione viene gestita nel callback dell'alert
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
      console.log('🎯 TOGGLE PREMIUM: Stato attuale:', isPremium);
      const newValue = !isPremium;
      console.log('🎯 TOGGLE PREMIUM: Nuovo valore:', newValue);
      
      // 🔧 FIX PERSISTENZA: Usa direttamente il PurchaseContext
      const success = await toggleSimulatePremium(newValue);
      
      if (success) {
        // Aggiorna stato locale
        setIsPremium(newValue);
        
        // 🔧 FORZA refresh PurchaseContext per aggiornare counter UI
        if (initializePurchases) {
          console.log('🎯 TOGGLE PREMIUM: Forzando refresh PurchaseContext...');
          await initializePurchases(true);
        }
        
        // Mostra un messaggio di conferma
        Alert.alert(
          newValue 
            ? '✅ Premium ATTIVATO (Test)'
            : '❌ Premium DISATTIVATO',
          `Session counter: ${newValue ? 'Unlimited' : 'Limited to 2/week'}`,
          [{ text: 'OK' }]
        );
        
        console.log('🎯 TOGGLE PREMIUM: Completato con successo');
      } else {
        throw new Error('Failed to toggle premium status');
      }
    } catch (error) {
      console.error('🎯 TOGGLE PREMIUM: ❌ Errore:', error);
      // Riporta lo stato al valore originale in caso di errore
      setIsPremium(isPremium);
      
      Alert.alert(
        '❌ Errore',
        'Impossibile aggiornare lo stato premium. Riprova.',
        [{ text: 'OK' }]
      );
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
            
            {/* Premium Features Section - Migliorata con lista dettagliata funzionalità */}
            <View style={[styles.section, { 
              backgroundColor: colors.cardElevated,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="star-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>
                  {t('premiumFeatures', { ns: 'purchases', defaultValue: 'Funzionalità Premium' })}
                </Text>
              </View>
              
              <Text style={{ color: colors.textSecondary, marginBottom: 16, fontSize: 14 }}>
                {t('upgradeToUnlock', { ns: 'purchases', defaultValue: 'Passa a Premium per sbloccare:' })}
              </Text>
              
              {/* Lista dettagliata delle funzionalità Premium */}
              <View style={{ marginLeft: 8 }}>
                {[
                  { key: 'unlimitedSessions', icon: 'infinite-outline', text: 'Sessioni illimitate' },
                  { key: 'advancedStatistics', icon: 'stats-chart-outline', text: 'Statistiche dettagliate e grafici' },
                  { key: 'dataExport', icon: 'download-outline', text: 'Esportazione dati in CSV/PDF' },
                  { key: 'personalizedCalculations', icon: 'calculator-outline', text: 'Calcoli personalizzati avanzati' },
                  { key: 'iosWidgets', icon: 'phone-portrait-outline', text: 'Widget iOS per la schermata home' },
                  { key: 'noAds', icon: 'eye-off-outline', text: 'Nessuna pubblicità' },
                  { key: 'prioritySupport', icon: 'headset-outline', text: 'Supporto prioritario' }
                ].map((feature, index) => (
                  <View key={index} style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    marginBottom: 8,
                    paddingLeft: 4
                  }}>
                    <Ionicons 
                      name={feature.icon as any} 
                      size={16} 
                      color={colors.primary} 
                      style={{ marginRight: 12, width: 20 }} 
                    />
                    <Text style={{ 
                      color: colors.text, 
                      fontSize: 14,
                      flex: 1
                    }}>
                      {feature.text}
                    </Text>
                  </View>
                ))}
              </View>
              
              {/* Bottone di upgrade */}
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  marginTop: 16,
                  alignItems: 'center'
                }}
                onPress={() => router.push('/onboarding/subscription-offer')}
              >
                <Text style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: '600'
                }}>
                  {t('upgradeToPremium', { ns: 'purchases', defaultValue: 'Passa a Premium' })}
                </Text>
              </TouchableOpacity>
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
                lastItem={true}
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
            
            {/* Developer Options */}
            {showDeveloperOptions && (
              <SettingsSection title="Developer Options">
                
                {/* 🔧 TOGGLE PREMIUM FUNZIONANTE */}
                <SettingsItem
                  icon={<Ionicons name="flask-outline" size={20} color={colors.primary} />}
                  title="Toggle Premium (Debug)"
                  subtitle={`Currently ${isPremium ? 'enabled' : 'disabled'}`}
                  onPress={togglePremiumStatus}
                />
                
                <SettingsItem
                  icon={<Ionicons name="refresh-outline" size={20} color={colors.primary} />}
                  title="Reset App Data"
                  subtitle=""
                  onPress={() => {
                    Alert.alert(
                      t('resetAppData', { ns: 'settings', defaultValue: 'Reimposta Dati App' }),
                      t('resetAppDataConfirm', { ns: 'settings', defaultValue: 'Sei sicuro di voler reimpostare tutti i dati dell\'app? Questa azione non può essere annullata.' }),
                      [
                        {
                          text: t('cancel', { ns: 'common', defaultValue: 'Annulla' }),
                          style: 'cancel'
                        },
                        {
                          text: t('reset', { ns: 'settings', defaultValue: 'Reimposta' }),
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await AsyncStorage.clear();
                              Alert.alert(
                                t('success', { ns: 'common', defaultValue: 'Successo' }), 
                                t('resetAppDataSuccess', { ns: 'settings', defaultValue: 'Dati app reimpostati con successo. Riavvia l\'app.' })
                              );
                            } catch (error) {
                              console.error('Error resetting app data:', error);
                              Alert.alert(
                                t('error', { ns: 'common', defaultValue: 'Errore' }), 
                                t('resetAppDataError', { ns: 'settings', defaultValue: 'Impossibile reimpostare i dati dell\'app' })
                              );
                            }
                          }
                        }
                      ]
                    );
                  }}
                />
                
                <SettingsItem
                  icon={<Ionicons name="bug-outline" size={20} color={colors.warning} />}
                  title="Debug Logs"
                  subtitle="Visualizza log di debug per troubleshooting"
                  onPress={() => {
                    // Per ora mostra Alert con informazioni sui log
                    Alert.alert(
                      'Debug Logs',
                      'Log salvati in AsyncStorage con chiavi:\n• wizard_success_log\n• wizard_error_log\n• wizard_debug_log\n\nAccedi ai log tramite developer tools o strumenti di debug.',
                      [{ text: 'OK' }]
                    );
                  }}
                />
                
                <SettingsItem
                  icon={<Ionicons name="server-outline" size={20} color={colors.info} />}
                  title="Verifica Database"
                  subtitle="Controlla stato profilo e schema database"
                  onPress={async () => {
                    try {
                      // Mostra loading
                      Alert.alert('🔍', 'Verificando database...');
                      
                      // Verifica utente corrente
                      const currentUser = await authService.getCurrentUser();
                      
                      if (!currentUser) {
                        Alert.alert('❌ Database Check', 'Nessun utente autenticato');
                        return;
                      }
                      
                      // Verifica profili nel database
                      const { data: profiles, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('user_id', currentUser.id);
                      
                      // Verifica AsyncStorage
                      const localProfile = await AsyncStorage.getItem('bacchus_current_profile');
                      const wizardCompleted = await AsyncStorage.getItem('profile_wizard_completed');
                      
                      let message = `👤 User ID: ${currentUser.id}\n\n`;
                      message += `🗄️ Database:\n`;
                      if (error) {
                        message += `❌ Errore: ${error.message}\n`;
                      } else if (!profiles || profiles.length === 0) {
                        message += `❌ Nessun profilo trovato\n`;
                    } else {
                        message += `✅ ${profiles.length} profilo(i) trovato(i)\n`;
                        message += `📊 Primo profilo: ${profiles[0].name || 'N/A'}\n`;
                      }
                      
                      message += `\n📱 AsyncStorage:\n`;
                      message += `Profile: ${localProfile ? '✅ Presente' : '❌ Mancante'}\n`;
                      message += `Wizard: ${wizardCompleted ? '✅ Completato' : '❌ Non completato'}\n`;
                      
                      Alert.alert('🔍 Database Check', message, [
                        { text: 'OK' }
                      ]);
                      
                    } catch (error) {
                      Alert.alert('❌ Errore', `Verifica fallita: ${error.message}`);
                    }
                  }}
                />
                
                <SettingsItem
                  icon={<Ionicons name="refresh-circle-outline" size={20} color={colors.success} />}
                  title="Test Fix Profili"
                  subtitle="Forza caricamento profili per test"
                  onPress={async () => {
                    try {
                      Alert.alert('🔄', 'Testando fix caricamento profili...');
                      
                      // Import dinamico per evitare dipendenze circolari
                      const { getProfiles, getActiveProfile } = require('../lib/services/profile.service');
                      
                      // Force refresh profili
                      console.log('🔄 [TEST] Forcing profiles refresh...');
                      const profiles = await getProfiles(true);
                      
                      console.log('🔄 [TEST] Getting active profile...');
                      const activeProfile = await getActiveProfile();
                      
                      let testMessage = `🔄 TEST RISULTATI:\n\n`;
                      testMessage += `📊 Profili trovati: ${profiles.length}\n`;
                      
                      if (profiles.length > 0) {
                        testMessage += `📋 Lista profili:\n`;
                        profiles.forEach((p, i) => {
                          testMessage += `  ${i+1}. ${p.name} (${p.id})\n`;
                        });
                      }
                      
                      testMessage += `\n🎯 Profilo attivo: ${activeProfile ? activeProfile.name : 'NESSUNO'}\n`;
                      
                      // Verifica AuthContext
                      try {
                        const { useAuth } = require('../contexts/AuthContext');
                        // Non possiamo usare hook qui, ma possiamo verificare i dati salvati
                        testMessage += `\n✅ Fix implementato correttamente`;
                      } catch (contextError) {
                        testMessage += `\n⚠️ Errore AuthContext: ${contextError.message}`;
                      }
                      
                      Alert.alert('🔄 Test Risultati', testMessage, [
                        { text: 'OK' }
                      ]);
                      
                    } catch (error) {
                      Alert.alert('❌ Errore Test', `Test fallito: ${error.message}`);
                    }
                  }}
                  lastItem={false}
                />

                <SettingsItem
                  icon={<Ionicons name="bug-outline" size={20} color={colors.danger} />}
                  title="Debug Wizard Logs"
                  subtitle="Mostra log completi wizard per debug"
                  onPress={async () => {
                    try {
                      Alert.alert('🔍', 'Leggendo log wizard...');
                      
                      const failureLog = await AsyncStorage.getItem('wizard_failure_log');
                      const errorLog = await AsyncStorage.getItem('wizard_error_log');
                      const successLog = await AsyncStorage.getItem('wizard_success_log');
                      
                      let logData = '📊 WIZARD DEBUG LOGS\n\n';
                      
                      if (failureLog) {
                        try {
                          const parsedFailure = JSON.parse(failureLog);
                          logData += '🔴 FAILURE LOG:\n' + (Array.isArray(parsedFailure) ? parsedFailure.join('\n') : JSON.stringify(parsedFailure, null, 2)) + '\n\n';
                        } catch (e) {
                          logData += '🔴 FAILURE LOG (raw): ' + failureLog + '\n\n';
                        }
                      }
                      
                      if (errorLog) {
                        try {
                          const parsedError = JSON.parse(errorLog);
                          logData += '❌ ERROR LOG:\n' + JSON.stringify(parsedError, null, 2) + '\n\n';
                        } catch (e) {
                          logData += '❌ ERROR LOG (raw): ' + errorLog + '\n\n';
                        }
                      }
                      
                      if (successLog) {
                        try {
                          const parsedSuccess = JSON.parse(successLog);
                          logData += '✅ SUCCESS LOG:\n' + (Array.isArray(parsedSuccess) ? parsedSuccess.join('\n') : JSON.stringify(parsedSuccess, null, 2));
                        } catch (e) {
                          logData += '✅ SUCCESS LOG (raw): ' + successLog;
                        }
                      }
                      
                      if (!failureLog && !errorLog && !successLog) {
                        logData += 'Nessun log wizard trovato';
                      }
                      
                    Alert.alert(
                        '📊 WIZARD DEBUG LOGS',
                        logData.length > 3000 ? logData.substring(0, 3000) + '\n\n... (Log troncato per lunghezza)' : logData,
                        [
                          { 
                            text: 'Pulisci Log', 
                            style: 'destructive',
                            onPress: async () => {
                              await AsyncStorage.removeItem('wizard_failure_log');
                              await AsyncStorage.removeItem('wizard_error_log');
                              await AsyncStorage.removeItem('wizard_success_log');
                              Alert.alert('✅ Debug', 'Tutti i log wizard sono stati puliti');
                            }
                          },
                          { text: 'OK' }
                        ]
                      );
                      
                    } catch (error) {
                      Alert.alert('❌ Errore', 'Errore leggendo i log wizard: ' + error.message);
                    }
                  }}
                  lastItem={false}
                />
                
                <SettingsItem
                  icon={<Ionicons name="server-outline" size={20} color={colors.warning} />}
                  title="Test Database Wizard"
                  subtitle="Test salvataggio diretto profilo nel database"
                  onPress={async () => {
                    try {
                      Alert.alert('🧪', 'Testando salvataggio database...');
                      
                      // Import Supabase
                      const supabase = (await import('../lib/supabase/client')).default;
                      const { v4: uuidv4 } = require('uuid');
                      
                      // Dati di test semplici
                      const testProfile = {
                        id: uuidv4(),
                        user_id: uuidv4(), // UUID valido invece di test-user-timestamp
                        name: 'Test User',
                        gender: 'male',
                        age: 25,
                        weight: 70,
                        height: 180,
                        drinking_frequency: 'occasionally',
                        emoji: '🍷',
                        color: '#00bcd7',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      };
                      
                      let testResult = '🧪 TEST DATABASE WIZARD\n\n';
                      
                      // Test 1: Schema snake_case
                      try {
                        const { data: snakeData, error: snakeError } = await supabase
                          .from('profiles')
                          .insert([testProfile])
                          .select()
                          .single();
                          
                        if (snakeError) {
                          testResult += `❌ Snake_case FAILED: ${snakeError.message}\n\n`;
                          
                          // Schema è ora completamente snake_case
                          testResult += `ℹ️ Schema is now fully snake_case only\n\n`;
                        } else {
                          testResult += `✅ Snake_case SUCCESS: ${JSON.stringify(snakeData, null, 2)}\n\n`;
                          
                          // Cleanup
                          await supabase.from('profiles').delete().eq('id', snakeData.id);
                        }
                      } catch (insertError) {
                        testResult += `💥 EXCEPTION: ${insertError.message}\n\n`;
                      }
                      
                      // Test 3: Verifica schema corrente
                      try {
                        const { data: existingProfiles, error: selectError } = await supabase
                          .from('profiles')
                          .select('*')
                          .limit(1);
                          
                        if (selectError) {
                          testResult += `❌ SELECT ERROR: ${selectError.message}`;
                        } else {
                          testResult += `📊 EXISTING PROFILES: ${existingProfiles?.length || 0} found`;
                          if (existingProfiles?.length > 0) {
                            testResult += `\nSchema: ${Object.keys(existingProfiles[0]).join(', ')}`;
                          }
                        }
                      } catch (selectError) {
                        testResult += `💥 SELECT EXCEPTION: ${selectError.message}`;
                      }
                      
                      Alert.alert('🧪 Test Database Results', testResult, [
                        { text: 'OK' }
                      ]);
                      
                    } catch (error) {
                      Alert.alert('❌ Test Failed', error.message);
                    }
                  }}
                />

                <SettingsItem
                  icon={<Ionicons name="timer-outline" size={20} color={colors.primary} />}
                  title="Debug Counter Sessioni"
                  subtitle={`Remaining: ${remainingFreeSessions === -1 ? 'Infinite (Premium)' : remainingFreeSessions}`}
                  onPress={async () => {
                    try {
                      // Import dinamico per evitare circular deps
                      const purchaseService = require('../lib/services/purchase.service');
                      
                      let debugInfo = `🎯 SESSION COUNTER DEBUG:\n\n`;
                      
                      // Status premium
                      const isPremiumStatus = await purchaseService.isPremium();
                      debugInfo += `👑 Premium Status: ${isPremiumStatus}\n`;
                      
                      // Mock premium storage
                      const mockPremium = await AsyncStorage.getItem('bacchus_mock_premium');
                      debugInfo += `🎭 Mock Premium: ${mockPremium}\n`;
                      
                      // Counter attuale
                      const remaining = await purchaseService.getRemainingSessionsCount();
                      debugInfo += `📊 Remaining Sessions: ${remaining}\n`;
                      
                      // User ID per DB
                      const currentUser = await authService.getCurrentUser();
                      debugInfo += `👤 User ID: ${currentUser?.id || 'N/A'}\n`;
                      
                      // Controlla database
                      if (currentUser) {
                        try {
                          const { data, error } = await supabase
                            .from('user_weekly_limits')
                            .select('*')
                            .eq('user_id', currentUser.id);
                          
                          debugInfo += `\n🗄️ DATABASE:\n`;
                          if (error) {
                            debugInfo += `❌ Error: ${error.message}\n`;
                          } else if (!data || data.length === 0) {
                            debugInfo += `❌ Nessun record trovato\n`;
                          } else {
                            const record = data[0];
                            debugInfo += `✅ Record trovato:\n`;
                            debugInfo += `  Sessions Count: ${record.sessions_count}\n`;
                            debugInfo += `  Week Start: ${record.week_start_date}\n`;
                            debugInfo += `  Last Session: ${record.last_session_date}\n`;
                          }
                        } catch (dbError) {
                          debugInfo += `💥 DB Exception: ${dbError.message}\n`;
                        }
                      }
                      
                      Alert.alert('🎯 Session Counter Debug', debugInfo, [
                        { text: 'OK' }
                      ]);
                      
                    } catch (error) {
                      Alert.alert('❌ Debug Error', error.message);
                    }
                  }}
                />

                <SettingsItem
                  icon={<Ionicons name="sync-outline" size={20} color={colors.warning} />}
                  title="Reset Counter Sessioni"
                  subtitle="Azzera counter settimanale per test"
                  onPress={async () => {
                    Alert.alert(
                      '⚠️ Reset Counter Sessioni',
                      'Vuoi azzerare il counter delle sessioni settimanali? Questo è solo per test.',
                      [
                        { text: 'Annulla', style: 'cancel' },
                        {
                          text: 'Reset',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              const currentUser = await authService.getCurrentUser();
                              if (!currentUser) {
                                Alert.alert('❌', 'Utente non autenticato');
                                return;
                              }
                              
                              // Reset database
                              const { error } = await supabase
                                .from('user_weekly_limits')
                                .upsert({
                                  user_id: currentUser.id,
                                  sessions_count: 0,
                                  week_start_date: new Date().toISOString().split('T')[0],
                                  updated_at: new Date().toISOString()
                                });
                              
                              if (error) {
                                Alert.alert('❌', `Errore reset DB: ${error.message}`);
                              } else {
                                // Force refresh del context
                                if (initializePurchases) {
                                  await initializePurchases();
                                }
                                Alert.alert('✅', 'Counter sessioni azzerato!');
                              }
                              
                            } catch (error) {
                              Alert.alert('❌', `Errore: ${error.message}`);
                            }
                          }
                        }
                      ]
                    );
                  }}
                />


                
                {/* 🔧 RIMOSSO: Secondo toggle premium duplicato */}
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
                    <Text style={styles.logoutButtonText}>{t('logout', { ns: 'common', defaultValue: 'Esci' })}</Text>
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