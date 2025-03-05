import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser, signOut } from '../lib/supabase/client';

type UserProfileProps = {
  minimal?: boolean;
  onLogout?: () => void;
};

export default function UserProfile({ minimal = false, onLogout }: UserProfileProps) {
  const { t } = useTranslation(['auth', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await signOut();
      
      if (error) {
        throw error;
      }
      
      if (onLogout) {
        onLogout();
      } else {
        router.replace('/login' as any);
      }
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert(
        t('error', { ns: 'common' }),
        error.message || t('logoutFailed', { ns: 'auth' })
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, minimal && styles.minimalContainer]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <TouchableOpacity 
        style={[styles.container, minimal && styles.minimalContainer]} 
        onPress={() => router.push('/login' as any)}
      >
        <FontAwesome5 name="user-circle" size={minimal ? 24 : 32} color={colors.textSecondary} />
        <Text style={[styles.loginText, { color: colors.primary }]}>
          {t('login', { ns: 'auth' })}
        </Text>
      </TouchableOpacity>
    );
  }

  // Utente autenticato
  if (minimal) {
    return (
      <TouchableOpacity 
        style={[styles.container, styles.minimalContainer]} 
        onPress={() => router.push('/profile' as any)}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {user.email ? user.email.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.userInfoContainer}>
        <View style={[styles.avatarLarge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
          <Text style={[styles.avatarTextLarge, { color: colors.primary }]}>
            {user.email ? user.email.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        
        <View style={styles.userDetails}>
          <Text style={[styles.emailText, { color: colors.text }]} numberOfLines={1}>
            {user.email}
          </Text>
          <Text style={[styles.userIdText, { color: colors.textSecondary }]} numberOfLines={1}>
            ID: {user.id.substring(0, 8)}...
          </Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: colors.error + '20' }]} 
        onPress={handleLogout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.error} />
        ) : (
          <>
            <FontAwesome5 name="sign-out-alt" size={16} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>
              {t('logout', { ns: 'auth' })}
            </Text>
          </>
        )}
      </TouchableOpacity>
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
}); 