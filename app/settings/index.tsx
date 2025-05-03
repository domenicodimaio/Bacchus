import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Platform, 
  Switch,
  ActivityIndicator,
  Linking,
  Pressable
} from 'react-native';
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

// Colori per migliore accessibilità
const COLORS = {
  dark: {
    background: '#0f1c35',
    card: '#162a4e',
    cardBorder: '#254175',
    text: '#FFFFFF',
    textSecondary: '#C5D5ED',
    accent: '#6CC9FF',
    switchTrack: '#6CC9FF',
    divider: 'rgba(150, 150, 150, 0.2)',
    gold: '#FFD700',
    buttonBorder: '#254175',
    buttonPrimary: '#6CC9FF',
  },
  light: {
    background: '#f5f5f5',
    card: '#FFFFFF',
    cardBorder: '#e0e0e0',
    text: '#333333',
    textSecondary: '#757575',
    accent: '#00838f',
    switchTrack: '#00838f',
    divider: 'rgba(150, 150, 150, 0.2)',
    gold: '#FFC107',
    buttonBorder: '#e0e0e0',
    buttonPrimary: '#00838f',
  }
};

export default function SettingsScreen() {
  // State
  const [language, setLanguage] = useState('it');
  const [offlineMode, setOfflineMode] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showDeveloperOptions, setShowDeveloperOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Theme and translation
  const { isDarkMode, toggleDarkMode } = useAppTheme();
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
  const appBuild = Constants?.expoConfig?.ios?.buildNumber || '1';
  
  // Colori basati sul tema
  const colors = isDarkMode ? COLORS.dark : COLORS.light;
  
  // Load saved settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);
  
  // Function to load settings from storage
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      console.log('🔧 [Settings] Caricando le impostazioni...');
      
      // Load language
      const storedLanguage = await AsyncStorage.getItem(STORAGE_KEY.LANGUAGE);
      if (storedLanguage) {
        setLanguage(storedLanguage);
        console.log(`🔧 [Settings] Lingua caricata: ${storedLanguage}`);
      } else {
        console.log('🔧 [Settings] Nessuna lingua salvata, uso il default');
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
      
      // Test translations for debug
      try {
        console.log('🔧 [Settings] Test traduzione chiavi:');
        console.log(`🔧 [Settings] 'settings': ${t('settings', {ns: 'common'})}`);
        console.log(`🔧 [Settings] 'appearance': ${t('appearance', {ns: 'settings'})}`);
        console.log(`🔧 [Settings] 'premiumFeatures': ${t('premiumFeatures', {ns: 'settings'})}`);
      } catch (translateError) {
        console.error('🔧 [Settings] Errore durante il test delle traduzioni:', translateError);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('🔧 [Settings] Errore caricamento impostazioni:', error);
      
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
      // Aggiorniamo prima lo stato locale per feedback immediato all'utente
      setLanguage(newLanguage);
      console.log(`🔧 [Settings] Cambio lingua a: ${newLanguage}`);
      
      // Salviamo in AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY.LANGUAGE, newLanguage);
      
      // Utilizziamo la funzione condivisa per salvare la lingua
      if (saveLanguageToStorage) {
        await saveLanguageToStorage(newLanguage);
      }
      
      // Cambiamo la lingua utilizzando i18n in un blocco try/catch separato
      try {
        await i18n.changeLanguage(newLanguage);
        console.log(`🔧 [Settings] i18n.changeLanguage(${newLanguage}) completato`);
      } catch (langError) {
        console.error('🔧 [Settings] Errore in i18n.changeLanguage:', langError);
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
      console.error('🔧 [Settings] Errore cambio lingua:', error);
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
      console.log(`🔧 [Settings] Toggle modalità offline: ${newValue}`);
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
      console.error('🔧 [Settings] Errore toggle modalità offline:', error);
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
      console.log('🔧 [Settings] Toggle dark mode');
      await toggleDarkMode();
    } catch (error) {
      console.error('🔧 [Settings] Errore toggle dark mode:', error);
      Alert.alert(
        t('error', { ns: 'common', defaultValue: 'Error' }),
        t('themeChangeError', { ns: 'settings', defaultValue: 'Error changing theme' })
      );
    }
  };
  
  // Function to handle logout
  const handleLogout = async () => {
    if (!auth || !signOut) {
      console.error('🔧 [Settings] Auth context o signOut non disponibili');
      return;
    }
    
    try {
      if (setBlockNavigation) {
        setBlockNavigation(true);
      }
      
      console.log('🔧 [Settings] Logout...');
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
      console.error('🔧 [Settings] Errore logout:', error);
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
      console.log(`🔧 [Settings] Toggle premium status: ${newStatus}`);
      setIsPremium(newStatus);
      await AsyncStorage.setItem(STORAGE_KEY.IS_PREMIUM, newStatus.toString());
      Alert.alert(
        t('developerMode', { ns: 'settings', defaultValue: 'Developer Mode' }),
        newStatus 
          ? t('premiumEnabled', { ns: 'settings', defaultValue: 'Premium features enabled for testing' })
          : t('premiumDisabled', { ns: 'settings', defaultValue: 'Premium features disabled' })
      );
    } catch (error) {
      console.error('🔧 [Settings] Errore toggle premium status:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.text, marginTop: 16 }]}>
            {t('loading', { ns: 'common', defaultValue: 'Loading...' })}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Componente per riga delle impostazioni
  const SettingRow = ({ 
    icon, 
    title, 
    description, 
    rightComponent 
  }: { 
    icon: string, 
    title: string, 
    description: string, 
    rightComponent: React.ReactNode 
  }) => (
    <View>
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Ionicons name={icon as any} size={24} color={colors.accent} />
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              {title}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              {description}
            </Text>
          </View>
        </View>
        {rightComponent}
      </View>
      <View style={[styles.divider, { backgroundColor: colors.divider }]} />
    </View>
  );

  // Render settings screen
  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      edges={['top']}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('settings', { ns: 'common', defaultValue: 'Settings' })}
        </Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        <View style={[
          styles.sectionContainer, 
          { 
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>
            {t('appearance', { ns: 'settings', defaultValue: 'Appearance' })}
          </Text>
          
          <SettingRow
            icon="language-outline"
            title={t('language', { ns: 'settings', defaultValue: 'Language' })}
            description={t('selectLanguage', { ns: 'settings', defaultValue: 'Select language' })}
            rightComponent={
              <View style={styles.languageSelector}>
                <TouchableOpacity 
                  style={[
                    styles.languageButton, 
                    language === 'it' && styles.selectedLanguageButton,
                    language === 'it' && { backgroundColor: colors.accent + '33' }
                  ]}
                  onPress={() => handleLanguageChange('it')}
                  accessibilityLabel="Italiano"
                  accessibilityRole="button"
                  accessible={true}
                >
                  <Text style={[
                    styles.languageButtonText, 
                    { color: language === 'it' ? colors.text : colors.textSecondary }
                  ]}>
                    🇮🇹
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.languageButton, 
                    language === 'en' && styles.selectedLanguageButton,
                    language === 'en' && { backgroundColor: colors.accent + '33' }
                  ]}
                  onPress={() => handleLanguageChange('en')}
                  accessibilityLabel="English"
                  accessibilityRole="button"
                  accessible={true}
                >
                  <Text style={[
                    styles.languageButtonText, 
                    { color: language === 'en' ? colors.text : colors.textSecondary }
                  ]}>
                    🇬🇧
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
          
          <SettingRow
            icon="moon-outline"
            title={t('darkMode', { ns: 'settings', defaultValue: 'Dark Mode' })}
            description={t('darkModeDesc', { ns: 'settings', defaultValue: 'Toggle dark or light appearance' })}
            rightComponent={
              <Switch
                trackColor={{ false: '#767577', true: colors.switchTrack }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#767577"
                onValueChange={handleDarkModeToggle}
                value={isDarkMode}
                style={styles.switch}
                accessibilityLabel={t('darkMode', { ns: 'settings', defaultValue: 'Dark Mode' })}
                accessibilityRole="switch"
                accessible={true}
              />
            }
          />
          
          <SettingRow
            icon="wifi-outline"
            title={t('offlineMode', { ns: 'settings', defaultValue: 'Offline Mode' })}
            description={t('offlineModeDesc', { ns: 'settings', defaultValue: 'Save data locally only' })}
            rightComponent={
              <Switch
                trackColor={{ false: '#767577', true: colors.switchTrack }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#767577"
                onValueChange={handleOfflineModeToggle}
                value={offlineMode}
                style={styles.switch}
                accessibilityLabel={t('offlineMode', { ns: 'settings', defaultValue: 'Offline Mode' })}
                accessibilityRole="switch"
                accessible={true}
              />
            }
          />
        </View>
        
        {/* Premium Features */}
        <View style={[
          styles.sectionContainer, 
          { 
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>
            {t('premiumFeatures', { ns: 'settings', defaultValue: 'Premium Features' })}
          </Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons 
                name="star" 
                size={24} 
                color={isPremium ? colors.gold : colors.textSecondary} 
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  {t('premiumActive', { ns: 'settings', defaultValue: 'Premium Active' })}
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {isPremium 
                    ? t('premiumActiveDesc', { ns: 'settings', defaultValue: 'Your premium subscription is active' })
                    : t('premiumInactiveDesc', { ns: 'settings', defaultValue: 'Upgrade to premium for extra features' })}
                </Text>
              </View>
            </View>
            {!isPremium && (
              <TouchableOpacity 
                style={[styles.upgradeButton, { backgroundColor: colors.buttonPrimary }]}
                onPress={() => {
                  Alert.alert(
                    t('premiumRequired', { ns: 'common', defaultValue: 'Premium Required' }),
                    t('featureNeedsPremium', { ns: 'common', defaultValue: 'This feature requires a premium account' })
                  );
                }}
                accessibilityLabel={t('upgradeToPremium', { ns: 'purchases', defaultValue: 'Upgrade' })}
                accessibilityRole="button"
                accessible={true}
              >
                <Text style={styles.upgradeButtonText}>
                  {t('upgradeToPremium', { ns: 'purchases', defaultValue: 'Upgrade' })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          
          {/* Premium feature list */}
          <View style={styles.premiumFeatureList}>
            <PremiumFeature 
              icon="infinite" 
              text={t('unlimitedSessions', { ns: 'settings', defaultValue: 'Unlimited Sessions' })}
              active={isPremium}
              colors={colors}
            />
            
            <PremiumFeature 
              icon="stats-chart" 
              text={t('advancedStatistics', { ns: 'settings', defaultValue: 'Advanced Statistics' })}
              active={isPremium}
              colors={colors}
            />
            
            <PremiumFeature 
              icon="document-text" 
              text={t('dataExport', { ns: 'settings', defaultValue: 'Data Export' })}
              active={isPremium}
              colors={colors}
            />
            
            <PremiumFeature 
              icon="close-circle" 
              text={t('noAds', { ns: 'settings', defaultValue: 'No Advertisements' })}
              active={isPremium}
              colors={colors}
            />
          </View>
        </View>
        
        {/* Account Section */}
        {isLoggedIn && (
          <View style={[
            styles.sectionContainer, 
            { 
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            }
          ]}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>
              {t('account', { ns: 'settings', defaultValue: 'Account' })}
            </Text>
            
            {user && (
              <View style={styles.accountInfo}>
                <Ionicons name="person" size={40} color={colors.accent} />
                <View style={styles.accountTextContainer}>
                  <Text style={[styles.accountEmail, { color: colors.text }]}>
                    {user.email}
                  </Text>
                  <Text style={[styles.accountStatus, { color: colors.textSecondary }]}>
                    {t('loggedIn', { ns: 'settings', defaultValue: 'Logged in' })}
                  </Text>
                </View>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.logoutButton, { borderColor: colors.buttonBorder }]}
              onPress={handleLogout}
              accessibilityLabel={t('logout', { ns: 'settings', defaultValue: 'Logout' })}
              accessibilityRole="button"
              accessible={true}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.accent} />
              <Text style={[styles.logoutButtonText, { color: colors.text }]}>
                {t('logout', { ns: 'settings', defaultValue: 'Logout' })}
              </Text>
            </TouchableOpacity>
            
            {/* Delete Account Button */}
            <TouchableOpacity 
              style={[styles.deleteAccountButton, { borderColor: colors.buttonBorder }]}
              onPress={() => {
                Alert.alert(
                  t('deleteAccount', { ns: 'common', defaultValue: 'Delete Account' }),
                  t('deleteAccountConfirm', { ns: 'settings', defaultValue: 'Are you sure you want to delete your account? This action is irreversible.' }),
                  [
                    {
                      text: t('cancel', { ns: 'common', defaultValue: 'Cancel' }),
                      style: 'cancel'
                    },
                    {
                      text: t('delete', { ns: 'common', defaultValue: 'Delete' }),
                      style: 'destructive',
                      onPress: () => {
                        // Temporarily just show an alert
                        Alert.alert(
                          t('comingSoon', { ns: 'common', defaultValue: 'Coming Soon' }),
                          t('featureInDevelopment', { ns: 'settings', defaultValue: 'This feature is still in development' })
                        );
                      }
                    }
                  ]
                );
              }}
              accessibilityLabel={t('deleteAccount', { ns: 'common', defaultValue: 'Delete Account' })}
              accessibilityRole="button"
              accessible={true}
            >
              <Ionicons name="trash-outline" size={20} color="red" />
              <Text style={styles.deleteAccountButtonText}>
                {t('deleteAccount', { ns: 'common', defaultValue: 'Delete Account' })}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Developer Options */}
        {showDeveloperOptions && (
          <View style={[
            styles.sectionContainer, 
            { 
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            }
          ]}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>
              {t('developerOptions', { ns: 'settings', defaultValue: 'Developer Options' })}
            </Text>
            
            <TouchableOpacity 
              style={styles.devOption}
              onPress={togglePremiumStatus}
              accessibilityLabel={t('togglePremium', { ns: 'settings', defaultValue: 'Toggle Premium Status' })}
              accessibilityRole="button"
              accessible={true}
            >
              <Ionicons name="construct" size={24} color={colors.accent} />
              <View style={styles.devOptionTextContainer}>
                <Text style={[styles.devOptionTitle, { color: colors.text }]}>
                  {t('togglePremium', { ns: 'settings', defaultValue: 'Toggle Premium Status' })}
                </Text>
                <Text style={[styles.devOptionDescription, { color: colors.textSecondary }]}>
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
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>
            {t('about', { ns: 'settings', defaultValue: 'About' })}
          </Text>
          
          <View style={styles.versionInfo}>
            <Text style={[styles.versionLabel, { color: colors.textSecondary }]}>
              {t('version', { ns: 'settings', defaultValue: 'Version' })}
            </Text>
            <Text style={[styles.versionNumber, { color: colors.text }]}>
              {appVersion} ({appBuild})
            </Text>
          </View>
          
          <Pressable 
            style={styles.privacyButton}
            onPress={() => {
              Linking.openURL('https://bacchusapp.com/privacy').catch(err => {
                console.error('Errore nell\'apertura della privacy policy:', err);
              });
            }}
            accessibilityRole="link"
            accessible={true}
          >
            <Text style={[styles.privacyText, {color: colors.accent}]}>
              {t('privacyPolicy', { ns: 'settings', defaultValue: 'Privacy Policy' })}
            </Text>
          </Pressable>
          
          <View style={styles.credits}>
            <Text style={[styles.creditsText, { color: colors.textSecondary }]}>
              © 2023 Bacchus
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Premium feature component
const PremiumFeature = ({ 
  icon, 
  text, 
  active, 
  colors 
}: { 
  icon: string, 
  text: string, 
  active: boolean, 
  colors: any 
}) => (
  <View style={styles.premiumFeature}>
    <Ionicons 
      name={icon as any} 
      size={20} 
      color={active ? colors.accent : colors.textSecondary} 
    />
    <Text style={[
      styles.premiumFeatureText, 
      { color: active ? colors.text : colors.textSecondary } as any
    ]}>
      {text}
    </Text>
  </View>
);

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
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
  scrollViewContent: {
    paddingBottom: 24,
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
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
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  languageSelector: {
    flexDirection: 'row',
  },
  languageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  selectedLanguageButton: {
    borderRadius: 20,
  },
  languageButtonText: {
    fontSize: 18,
  },
  switch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }]
  },
  premiumFeatureList: {
    marginTop: 8,
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  premiumFeatureText: {
    marginLeft: 12,
    fontSize: 15,
  },
  upgradeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 12,
  },
  logoutButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
  },
  deleteAccountButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: 'red',
  },
  devOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
  },
  versionInfo: {
    marginBottom: 12,
  },
  versionLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  versionNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  privacyButton: {
    paddingVertical: 8,
    marginVertical: 8,
  },
  privacyText: {
    fontSize: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  credits: {
    marginTop: 8,
  },
  creditsText: {
    fontSize: 14,
    textAlign: 'center',
  },
}); 