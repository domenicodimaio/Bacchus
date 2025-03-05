import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Platform,
  StatusBar,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import sessionService, { UserProfile } from '../lib/services/session.service';
import * as profileService from '../lib/services/profile.service';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay
} from 'react-native-reanimated';

export default function NewSessionScreen() {
  const { t } = useTranslation(['session', 'common', 'profile']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Animated values
  const containerOpacity = useSharedValue(0);
  
  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
    
    // Start animation
    containerOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
  }, []);
  
  // Animation styles
  const animatedContainer = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
      transform: [
        { translateY: withTiming(containerOpacity.value * 0, { duration: 300 }) }
      ]
    };
  });
  
  // Load available profiles
  const loadProfiles = () => {
    setLoading(true);
    const availableProfiles = profileService.getProfiles();
    setProfiles(availableProfiles);
    setLoading(false);
    
    // Se non ci sono profili, vai direttamente al wizard di creazione
    if (availableProfiles.length === 0) {
      // Naviga al wizard di creazione del profilo
      router.replace('/onboarding/profile-wizard');
      return;
    }
    
    // Se c'è già un profilo predefinito, usalo automaticamente
    const defaultProfile = profileService.getFirstProfile();
    if (defaultProfile) {
      startNewSession(defaultProfile);
      return;
    }
    
    // Se c'è solo un profilo ma non è impostato come predefinito, usalo automaticamente
    if (availableProfiles.length === 1) {
      startNewSession(availableProfiles[0]);
    }
  };
  
  // Start a new session with the selected profile
  const startNewSession = (profile: UserProfile) => {
    try {
      // Imposta il profilo selezionato come predefinito
      profileService.setDefaultProfile(profile.id);
      
      // Create a new session
      const newSession = sessionService.createSession(profile);
      
      // Navigate to the session screen
      router.replace('/session');
    } catch (error) {
      console.error('Errore nella creazione della sessione:', error);
      Alert.alert('Errore', 'Non è stato possibile creare una nuova sessione. Riprova.');
    }
  };
  
  // Render a profile card
  const renderProfileItem = ({ item }: { item: UserProfile }) => {
    return (
      <TouchableOpacity
        style={[styles.profileCard, { backgroundColor: colors.cardBackground }]}
        onPress={() => startNewSession(item)}
      >
        <View style={styles.profileInfo}>
          <Ionicons 
            name="person-circle-outline" 
            size={40} 
            color={colors.primary} 
            style={styles.profileIcon} 
          />
          <View style={styles.profileDetails}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.profileMeta, { color: colors.textSecondary }]}>
              {item.gender === 'male' ? t('male', { ns: 'profile' }) : t('female', { ns: 'profile' })}, 
              {item.weightKg} kg
            </Text>
          </View>
        </View>
        
        <Ionicons 
          name="chevron-forward" 
          size={24} 
          color={colors.primary} 
        />
      </TouchableOpacity>
    );
  };
  
  // Handle creating a new profile
  const handleCreateProfile = () => {
    // Naviga al wizard di creazione del profilo invece che alla pagina di creazione semplice
    router.push('/onboarding/profile-wizard');
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('newSession')}
          </Text>
          
          <View style={{ width: 44 }} />
        </View>
      </View>
      
      <Animated.View style={[styles.content, animatedContainer]}>
        <Text style={[styles.instruction, { color: colors.text }]}>
          {t('selectProfileForSession')}
        </Text>
        
        <FlatList
          data={profiles}
          renderItem={renderProfileItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.profileList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name="person-add-outline" 
                size={60} 
                color={colors.textSecondary} 
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('noProfiles', { ns: 'profile' })}
              </Text>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateProfile}
              >
                <Text style={styles.createButtonText}>
                  {t('createProfile', { ns: 'profile' })}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  instruction: {
    fontSize: SIZES.body,
    marginBottom: 20,
    textAlign: 'center',
  },
  profileList: {
    paddingBottom: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
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
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileIcon: {
    marginRight: 12,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileMeta: {
    fontSize: SIZES.small,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: SIZES.body,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: SIZES.radius,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
}); 