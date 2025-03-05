import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import sessionService, { Session } from '../lib/services/session.service';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing
} from 'react-native-reanimated';
import CustomTabBar from '../components/CustomTabBar';
import AppHeader from '../components/AppHeader';
import OfflineIndicator from '../components/OfflineIndicator';

// Simple enum for export formats
enum ExportFormat {
  CSV = 'csv',
  JSON = 'json'
}

export default function HistoryScreen() {
  const { t } = useTranslation(['session', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Animated values
  const listOpacity = useSharedValue(0);
  
  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);
  
  // Animation setup
  useEffect(() => {
    listOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
  }, [listOpacity]);
  
  // Load session history from service
  const loadSessions = () => {
    setLoading(true);
    const sessionHistory = sessionService.getSessionHistory();
    setSessions(sessionHistory);
    setLoading(false);
  };
  
  // Handle session deletion
  const handleDeleteSession = (sessionId: string) => {
    Alert.alert(
      t('deleteSessionTitle'),
      t('deleteSessionMessage'),
      [
        {
          text: t('cancel', { ns: 'common' }),
          style: 'cancel'
        },
        {
          text: t('delete', { ns: 'common' }),
          style: 'destructive',
          onPress: () => {
            const success = sessionService.deleteSession(sessionId);
            if (success) {
              loadSessions();
            }
          }
        }
      ]
    );
  };
  
  // Handle data export - NEW
  const handleExportData = () => {
    if (sessions.length === 0) {
      Alert.alert(
        t('exportError', { ns: 'common' }),
        t('noDataToExport', { ns: 'common' })
      );
      return;
    }

    Alert.alert(
      t('exportSessions', { ns: 'session' }),
      t('chooseFormat', { ns: 'common' }),
      [
        {
          text: 'CSV',
          onPress: async () => {
            const success = await exportSessions(sessions, ExportFormat.CSV);
            if (success) {
              Alert.alert(
                t('exportSuccess', { ns: 'common' }),
                t('exportedSuccessfully', { ns: 'common' })
              );
            }
          }
        },
        {
          text: 'JSON',
          onPress: async () => {
            const success = await exportSessions(sessions, ExportFormat.JSON);
            if (success) {
              Alert.alert(
                t('exportSuccess', { ns: 'common' }),
                t('exportedSuccessfully', { ns: 'common' })
              );
            }
          }
        },
        {
          text: t('cancel', { ns: 'common' }),
          style: 'cancel'
        }
      ]
    );
  };

  // Simple export function
  const exportSessions = async (data: Session[], format: ExportFormat): Promise<boolean> => {
    try {
      let content = '';
      const fileName = `alcoltest_sessions_${new Date().toISOString().split('T')[0]}.${format}`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      if (format === ExportFormat.JSON) {
        content = JSON.stringify(data, null, 2);
      } else {
        // Simple CSV conversion
        const headers = 'id,startTime,sessionStartTime,status,currentBAC\n';
        const rows = data.map(session => 
          `${session.id},${session.startTime},${session.sessionStartTime},${session.status},${session.currentBAC}`
        ).join('\n');
        content = headers + rows;
      }
      
      await FileSystem.writeAsStringAsync(filePath, content);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        t('exportError', { ns: 'common' }),
        t('errorExporting', { ns: 'common' })
      );
      return false;
    }
  };
  
  // Format date to show both date and time
  const formatSessionDate = (date: Date) => {
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Calculate session duration
  const calculateDuration = (session: Session) => {
    return session.sessionDuration;
  };
  
  // List animation style
  const listAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: listOpacity.value,
    };
  });
  
  // Render a session card
  const renderSessionItem = ({ item }: { item: Session }) => {
    return (
      <Animated.View style={[styles.sessionCard, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.sessionHeader}>
          <Text style={[styles.sessionDate, { color: colors.text }]}>
            {formatSessionDate(item.startTime)}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteSession(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.sessionInfo}>
          <View style={styles.profileInfo}>
            <FontAwesome5 name="user-alt" size={16} color={colors.textSecondary} />
            <Text style={[styles.profileName, { color: colors.textSecondary }]}>
              {item.profile.name}
            </Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('maxBAC')}
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {(item.currentBAC * 10).toFixed(1)} g/L
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('duration')}
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {calculateDuration(item)}
              </Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('drinks')}
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {item.drinks.length}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('foods')}
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {item.foods.length}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <AppHeader 
        title={t('sessionHistory')}
        isMainScreen={true}
        rightComponent={
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={handleExportData}
          >
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        }
      />
      
      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('noSessionsYet')}
          </Text>
        </View>
      ) : (
        <Animated.View style={[styles.listContainer, listAnimatedStyle]}>
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={renderSessionItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}
      
      <CustomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 10,
  },
  exportButton: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: SIZES.subtitle,
    textAlign: 'center',
    marginTop: 16,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  sessionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionDate: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 8,
  },
  sessionInfo: {
    marginTop: 8,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  profileName: {
    fontSize: SIZES.body,
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: SIZES.small,
    marginBottom: 4,
  },
  statValue: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
}); 