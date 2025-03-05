import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { Text, List, Divider, Switch, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Stack, router } from 'expo-router';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useOffline } from '../contexts/OfflineContext';
import OfflineIndicator from '../components/OfflineIndicator';

export default function OfflineSettingsScreen() {
  const { t } = useTranslation(['common', 'settings']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const { 
    isOffline, 
    isSyncing, 
    lastSyncTime, 
    pendingOperations, 
    forceSynchronization, 
    toggleOfflineMode 
  } = useOffline();

  const formatLastSync = () => {
    if (!lastSyncTime) return t('never', { ns: 'common' });
    return new Date(lastSyncTime).toLocaleString();
  };

  const handleSync = async () => {
    if (isOffline) {
      Alert.alert(
        t('error', { ns: 'common' }),
        t('cannotSyncOffline', { ns: 'common' }),
        [{ text: t('ok', { ns: 'common' }) }]
      );
      return;
    }

    await forceSynchronization();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: t('offlineFeatures', { ns: 'common' }) }} />
      
      <OfflineIndicator showSyncButton={false} />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.statusCard}>
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {isOffline ? t('offlineModeEnabled', { ns: 'common' }) : t('offlineModeDisabled', { ns: 'common' })}
          </Text>
          
          <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
            {isOffline 
              ? t('offlineModeDescription', { ns: 'settings', defaultValue: 'I dati verranno salvati localmente e sincronizzati quando tornerai online.' }) 
              : t('onlineModeDescription', { ns: 'settings', defaultValue: 'I dati vengono sincronizzati automaticamente con il server.' })}
          </Text>
          
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>
              {t('offlineMode', { ns: 'common' })}
            </Text>
            <Switch
              value={isOffline}
              onValueChange={toggleOfflineMode}
              color={colors.primary}
            />
          </View>
        </View>
        
        <List.Section>
          <List.Subheader>{t('syncSettings', { ns: 'settings', defaultValue: 'Impostazioni di sincronizzazione' })}</List.Subheader>
          
          <List.Item
            title={t('lastSync', { ns: 'common' })}
            description={formatLastSync()}
            left={props => <List.Icon {...props} icon="history" color={colors.primary} />}
          />
          
          <List.Item
            title={t('pendingChanges', { ns: 'common' })}
            description={pendingOperations > 0 
              ? t('pendingChangesCount', { ns: 'settings', count: pendingOperations, defaultValue: '{{count}} modifiche in attesa di sincronizzazione' }) 
              : t('noChanges', { ns: 'settings', defaultValue: 'Nessuna modifica in attesa' })}
            left={props => <List.Icon {...props} icon="cloud-upload" color={pendingOperations > 0 ? colors.warning : colors.success} />}
          />
        </List.Section>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSync}
            disabled={isOffline || isSyncing}
            loading={isSyncing}
            style={[styles.syncButton, { backgroundColor: colors.primary }]}
            labelStyle={{ color: '#fff' }}
          >
            {t('syncNow', { ns: 'common' })}
          </Button>
        </View>
        
        <View style={styles.infoCard}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            {t('offlineFeaturesInfo', { ns: 'settings', defaultValue: 'Informazioni sulla modalità offline' })}
          </Text>
          
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t('offlineFeaturesDescription', { ns: 'settings', defaultValue: 'La modalità offline ti permette di utilizzare l\'app anche senza connessione internet. I dati verranno salvati localmente e sincronizzati automaticamente quando tornerai online.' })}
          </Text>
        </View>
      </ScrollView>
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
  statusCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 46, 69, 0.8)',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
  },
  buttonContainer: {
    padding: 16,
    alignItems: 'center',
  },
  syncButton: {
    width: '80%',
    borderRadius: 8,
  },
  infoCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 46, 69, 0.5)',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
}); 