import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  StatusBar,
  Platform 
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS, SIZES } from '../constants/theme';
import * as profileService from '../lib/services/profile.service';
import CustomTabBar from '../components/CustomTabBar';
import AppHeader from '../components/AppHeader';

export default function ProfilesScreen() {
  const { t } = useTranslation(['profile', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Load profiles from the profile service
    loadProfiles();
  }, []);
  
  const loadProfiles = () => {
    const availableProfiles = profileService.getProfiles();
    setProfiles(availableProfiles);
    setIsLoading(false);
  };

  const handleCreateProfile = () => {
    router.push('/onboarding/profile-wizard');
  };

  const handleSelectProfile = (profile) => {
    // Set as active profile and navigate to dashboard
    Alert.alert(
      t('profileSelected'),
      t('profileSelectedMessage', { name: profile.name }),
      [
        {
          text: t('ok', { ns: 'common' }),
          onPress: () => router.push('/dashboard')
        }
      ]
    );
  };
  
  const handleEditProfile = (profile) => {
    // Implementazione della modifica - per ora reindirizza al wizard
    // Idealmente dovresti passare i dati del profilo selezionato al wizard
    router.push({
      pathname: '/onboarding/profile-wizard',
      params: { profileId: profile.id }
    });
  };
  
  const handleDeleteProfile = (profile) => {
    // Chiedi conferma prima di eliminare
    Alert.alert(
      t('deleteProfile'),
      t('deleteProfileConfirmation', { name: profile.name }),
      [
        {
          text: t('cancel', { ns: 'common' }),
          style: 'cancel'
        },
        {
          text: t('delete', { ns: 'common' }),
          style: 'destructive',
          onPress: () => {
            // Elimina il profilo
            profileService.deleteProfile(profile.id);
            // Aggiorna la lista
            loadProfiles();
          }
        }
      ]
    );
  };

  const renderProfileItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.profileCard, { backgroundColor: colors.cardBackground }]}
      onPress={() => handleSelectProfile(item)}
    >
      <View style={styles.profileInfo}>
        <View style={[
          styles.profileAvatar, 
          { 
            backgroundColor: item.color || colors.primary,
          }
        ]}>
          <Text style={styles.profileInitial}>
            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        
        <View style={styles.profileDetails}>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.profileStats, { color: colors.textSecondary }]}>
            {item.gender === 'male' ? t('male') : t('female')}, {item.weightKg} kg
          </Text>
        </View>
      </View>
      
      <View style={styles.profileActions}>
        {/* Pulsante di modifica */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleEditProfile(item)}
        >
          <MaterialIcons name="edit" size={22} color={colors.primary} />
        </TouchableOpacity>
        
        {/* Pulsante di eliminazione */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteProfile(item)}
        >
          <MaterialIcons name="delete" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      
      <AppHeader 
        title={t('profiles')}
        isMainScreen={true}
        rightComponent={
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleCreateProfile}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('loadingProfiles')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          renderItem={renderProfileItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.profilesList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('noProfiles')}
              </Text>
              <TouchableOpacity
                style={[styles.createProfileButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateProfile}
              >
                <Text style={styles.createProfileButtonText}>
                  {t('createProfile')}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <CustomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  createButton: {
    padding: 8,
  },
  profilesList: {
    padding: 16,
    paddingBottom: 100,
  },
  profileCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileDetails: {
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileStats: {
    fontSize: 14,
    opacity: 0.7,
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  createProfileButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
  },
}); 