import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useUserProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Proprietà del componente UserProfile
 */
interface UserProfileProps {
  minimal?: boolean;
  // Rimuovo onLogout per assicurarmi che ci sia solo un flusso di logout
}

export default function UserProfile({ minimal = false }: UserProfileProps) {
  const { profile } = useUserProfile();
  const { logout } = useAuth();
  const { t } = useTranslation();
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;

  // Se non c'è un profilo, mostra un loader
  if (!profile) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // Determina se usare il colore impostato dell'utente o uno default
  const profileColor = profile?.color || colors.primary;

  /**
   * Gestisce il logout dall'account
   */
  const handleLogout = async () => {
    try {
      Alert.alert(
        t('logout', { ns: 'auth', defaultValue: 'Logout' }),
        t('confirmLogout', { ns: 'auth', defaultValue: 'Are you sure you want to log out?' }),
        [
          { text: t('cancel', { ns: 'common', defaultValue: 'Cancel' }), style: 'cancel' },
          {
            text: t('logout', { ns: 'auth', defaultValue: 'Logout' }),
            style: 'destructive',
            onPress: async () => {
              try {
                await logout();
                // Il reindirizzamento ora è gestito dal servizio auth
              } catch (error) {
                console.error('Logout error:', error);
                Alert.alert(
                  t('error', { ns: 'common', defaultValue: 'Error' }),
                  error.message || t('logoutFailed', { ns: 'auth' })
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error during logout confirmation:', error);
      Alert.alert(
        t('error', { ns: 'common', defaultValue: 'Error' }),
        t('unexpectedError', { ns: 'common', defaultValue: 'An unexpected error occurred' })
      );
    }
  };

  // Versione minimale per l'uso nei componenti più piccoli
  if (minimal) {
    return (
      <View style={styles.minimalContainer}>
        <View style={[styles.minimalAvatar, { backgroundColor: profileColor }]}>
          {profile.emoji ? (
            <Text style={styles.minimalEmoji}>{profile.emoji}</Text>
          ) : (
            <Text style={styles.minimalInitial}>
              {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
            </Text>
          )}
        </View>
        <Text style={[styles.minimalName, { color: colors.text }]}>
          {profile.name || t('unnamed', { ns: 'profile', defaultValue: 'Unnamed' })}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Avatar con colore personalizzato */}
      <View style={[styles.avatarContainer, { backgroundColor: profileColor }]}>
        {profile.emoji ? (
          <Text style={styles.avatarEmoji}>{profile.emoji}</Text>
        ) : (
          <Text style={styles.avatarInitial}>
            {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
          </Text>
        )}
      </View>

      {/* Dettagli utente */}
      <View style={styles.detailsContainer}>
        <Text style={[styles.profileName, { color: colors.text }]}>
          {profile.name || t('unnamed', { ns: 'profile', defaultValue: 'Unnamed' })}
        </Text>

        {/* Dettagli addizionali */}
        <View style={styles.profileDetails}>
          <View style={styles.detailRow}>
            <FontAwesome5 name="weight" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {profile.weightKg} kg
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <FontAwesome5 name="venus-mars" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {profile.gender === 'male' 
                ? t('male', { ns: 'profile', defaultValue: 'Male' }) 
                : t('female', { ns: 'profile', defaultValue: 'Female' })}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <FontAwesome5 name="birthday-cake" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {profile.age} {t('years', { ns: 'common', defaultValue: 'years' })}
            </Text>
          </View>
        </View>
        
        {/* Pulsante modifica profilo */}
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.primary + '20' }]}
          onPress={() => router.push('/profile')}
        >
          <FontAwesome5 name="user-edit" size={14} color={colors.primary} />
          <Text style={[styles.editButtonText, { color: colors.primary }]}>
            {t('editProfile', { ns: 'profile', defaultValue: 'Edit Profile' })}
          </Text>
        </TouchableOpacity>
        
        {/* Pulsante di logout */}
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: colors.error + '20' }]}
          onPress={handleLogout}
        >
          <Ionicons 
            name="log-out-outline" 
            size={16} 
            color={colors.error} 
          />
          <Text style={[styles.logoutText, { color: colors.error }]}>
            {t('logout', { ns: 'auth', defaultValue: 'Logout' })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalContainer: {
    padding: 8,
    flexDirection: 'row',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 247, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 247, 255, 0.3)',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00F7FF',
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 16,
  },
  avatarTextLarge: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  emailText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userIdText: {
    fontSize: 12,
  },
  loginText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%',
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 247, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 247, 255, 0.3)',
  },
  minimalEmoji: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  minimalInitial: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  minimalName: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  avatarEmoji: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  detailText: {
    fontSize: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  editButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
}); 