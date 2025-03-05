import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, List, Divider, RadioButton, Switch } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES } from '../constants/theme';
import { changeLanguage, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from '../i18n';
import { useTheme, ThemeType } from '../contexts/ThemeContext';
import OfflineIndicator from '../components/OfflineIndicator';
import { useOffline } from '../contexts/OfflineContext';
import { useRouter } from 'expo-router';
import AppHeader from '../components/AppHeader';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation(['common', 'settings']);
  const [language, setLanguage] = useState(i18n.language || DEFAULT_LANGUAGE);
  const { theme, setTheme } = useTheme();
  const { isOffline, toggleOfflineMode, lastSyncTime, forceSynchronization } = useOffline();
  const router = useRouter();
  
  // Carica la lingua salvata
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (storedLanguage) {
          setLanguage(storedLanguage);
        }
      } catch (error) {
        console.error('Errore nel caricare la lingua:', error);
      }
    };
    
    loadLanguage();
  }, []);
  
  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await changeLanguage(newLanguage);
      setLanguage(newLanguage);
      
      // Mostra messaggio di conferma
      Alert.alert(
        t('success'),
        t('languageChanged', { ns: 'settings' }),
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Errore nel cambiare lingua:', error);
      
      Alert.alert(
        t('error'),
        t('languageChangeError', { ns: 'settings' }),
        [{ text: 'OK' }]
      );
    }
  };

  const handleThemeChange = async (newTheme: ThemeType) => {
    try {
      await setTheme(newTheme);
      
      // Mostra messaggio di conferma
      Alert.alert(
        t('success'),
        t('themeChanged', { ns: 'settings' }),
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Errore nel cambiare tema:', error);
      
      Alert.alert(
        t('error'),
        t('themeChangeError', { ns: 'settings' }),
        [{ text: 'OK' }]
      );
    }
  };
  
  return (
    <View style={styles.container}>
      <AppHeader 
        title="settings"
        isMainScreen={true}
      />
      
      {/* Offline Indicator */}
      <OfflineIndicator showSyncButton={false} />
      
      <ScrollView>
        {/* Offline Settings */}
        <List.Section>
          <List.Subheader>{t('offlineFeatures', { ns: 'common' })}</List.Subheader>
          
          <List.Item
            title={t('offlineMode', { ns: 'common' })}
            description={isOffline ? t('offlineModeEnabled', { ns: 'common' }) : t('offlineModeDisabled', { ns: 'common' })}
            left={props => <List.Icon {...props} icon="cloud-offline-outline" color={isOffline ? COLORS.warning : COLORS.primary} />}
            right={() => (
              <Switch
                value={isOffline}
                onValueChange={toggleOfflineMode}
                color={COLORS.primary}
              />
            )}
          />
          
          <List.Item
            title={t('offlineSettings', { ns: 'settings', defaultValue: 'Impostazioni offline' })}
            description={t('offlineSettingsDescription', { ns: 'settings', defaultValue: 'Gestisci la sincronizzazione e le impostazioni offline' })}
            left={props => <List.Icon {...props} icon="cog-outline" color={COLORS.primary} />}
            onPress={() => router.push('/settings/offline' as any)}
          />
          
          <List.Item
            title={t('lastSync', { ns: 'common' })}
            description={lastSyncTime ? new Date(lastSyncTime).toLocaleString() : t('never', { ns: 'common' })}
            left={props => <List.Icon {...props} icon="sync" color={COLORS.primary} />}
            onPress={forceSynchronization}
            disabled={isOffline}
          />
          
          <Divider />
        </List.Section>
        
        <List.Section>
          <List.Subheader>{t('preferences')}</List.Subheader>
          
          {/* Selezione Lingua */}
          <List.Item
            title={t('language')}
            description={t('selectLanguage')}
            left={props => <List.Icon {...props} icon="translate" color={COLORS.primary} />}
          />
          
          <View style={styles.optionContainer}>
            <RadioButton.Group 
              onValueChange={handleLanguageChange} 
              value={language}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <TouchableOpacity 
                  key={lang.code}
                  style={styles.radioOption}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <RadioButton.Android 
                    value={lang.code} 
                    color={COLORS.primary}
                    uncheckedColor={COLORS.textSecondary}
                  />
                  <Text style={styles.optionText}>{lang.name}</Text>
                </TouchableOpacity>
              ))}
            </RadioButton.Group>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Selezione Tema */}
          <List.Item
            title={t('themeSettings', { ns: 'settings' })}
            description={t('chooseTheme', { ns: 'settings' })}
            left={props => <List.Icon {...props} icon="theme-light-dark" color={COLORS.primary} />}
          />
          
          <View style={styles.optionContainer}>
            <RadioButton.Group 
              onValueChange={handleThemeChange} 
              value={theme}
            >
              {/* Opzione Dark Mode */}
              <TouchableOpacity 
                style={styles.radioOption}
                onPress={() => handleThemeChange('dark')}
              >
                <RadioButton.Android 
                  value="dark" 
                  color={COLORS.primary}
                  uncheckedColor={COLORS.textSecondary}
                />
                <Text style={styles.optionText}>{t('darkMode', { ns: 'settings' })}</Text>
              </TouchableOpacity>
              
              {/* Opzione Light Mode */}
              <TouchableOpacity 
                style={styles.radioOption}
                onPress={() => handleThemeChange('light')}
              >
                <RadioButton.Android 
                  value="light" 
                  color={COLORS.primary}
                  uncheckedColor={COLORS.textSecondary}
                />
                <Text style={styles.optionText}>{t('lightMode', { ns: 'settings' })}</Text>
              </TouchableOpacity>
              
              {/* Opzione System Default */}
              <TouchableOpacity 
                style={styles.radioOption}
                onPress={() => handleThemeChange('system')}
              >
                <RadioButton.Android 
                  value="system" 
                  color={COLORS.primary}
                  uncheckedColor={COLORS.textSecondary}
                />
                <Text style={styles.optionText}>{t('systemDefault', { ns: 'settings' })}</Text>
              </TouchableOpacity>
            </RadioButton.Group>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Informazioni e Note Legali */}
          <List.Item
            title={t('about', { ns: 'settings' })}
            description={t('appVersion', { ns: 'settings' })}
            left={props => <List.Icon {...props} icon="information" color={COLORS.info} />}
          />
          
          <List.Item
            title={t('legalInfo', { ns: 'settings' })}
            description={t('viewDisclaimer', { ns: 'settings' })}
            left={props => <List.Icon {...props} icon="scale-balance" color={COLORS.info} />}
            onPress={() => Alert.alert(t('legalInfo', { ns: 'settings' }), t('legalDisclaimer'))}
          />
        </List.Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  optionContainer: {
    marginHorizontal: SIZES.padding,
    marginVertical: SIZES.paddingSmall,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionText: {
    color: COLORS.text,
    fontSize: SIZES.medium,
    marginLeft: 8,
  },
  divider: {
    backgroundColor: COLORS.divider,
    marginVertical: SIZES.marginSmall,
  }
}); 