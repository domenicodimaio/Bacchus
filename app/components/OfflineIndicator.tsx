import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../contexts/OfflineContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

interface OfflineIndicatorProps {
  showSyncButton?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ showSyncButton = true }) => {
  const { isOffline, isSyncing, lastSyncTime, forceSynchronization } = useOffline();
  const { t } = useTranslation(['common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;

  if (!isOffline && !isSyncing) return null;

  const formatLastSync = () => {
    if (!lastSyncTime) return t('never');
    
    const date = new Date(lastSyncTime);
    return date.toLocaleString();
  };

  return (
    <View style={[styles.container, { backgroundColor: isOffline ? colors.warning : colors.success }]}>
      <View style={styles.content}>
        <Ionicons 
          name={isOffline ? 'cloud-offline' : 'cloud-done'} 
          size={20} 
          color="#fff" 
          style={styles.icon} 
        />
        <Text style={styles.text}>
          {isOffline ? t('offlineMode') : (isSyncing ? t('syncing') : t('onlineMode'))}
        </Text>
      </View>
      
      {showSyncButton && !isOffline && !isSyncing && (
        <TouchableOpacity 
          style={styles.syncButton} 
          onPress={forceSynchronization}
          disabled={isSyncing || isOffline}
        >
          <Ionicons name="sync" size={16} color="#fff" />
          <Text style={styles.syncText}>{t('syncNow')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  syncText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
});

export default OfflineIndicator; 