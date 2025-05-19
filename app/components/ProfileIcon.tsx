import React, { useState } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  View, 
  Modal, 
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ExtendedUserProfile, extendProfile } from '../types/profile';

interface ProfileIconProps {
  size?: number;
  showModal?: boolean;
  showName?: boolean;
}

const ProfileIcon: React.FC<ProfileIconProps> = ({ size = 34, showModal = false, showName = false }) => {
  const { currentTheme } = useTheme();
  const { t, i18n } = useTranslation(['profile', 'common', 'auth']);
  const colors = currentTheme.COLORS;
  const { profile } = useUserProfile();
  const { user, logout } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(showModal);
  const [showMenu, setShowMenu] = useState(false);

  // Converti il profilo in ExtendedUserProfile
  const extendedProfile = profile ? extendProfile(profile) : null;
  
  // Apri la modal
  const handleOpenModal = () => {
    setIsModalVisible(true);
  };
  
  // Chiudi la modal
  const handleCloseModal = () => {
    setIsModalVisible(false);
  };
  
  // Vai alla pagina dei profili
  const handleGoToProfiles = () => {
    handleCloseModal();
    router.push('/profiles');
  };
  
  // Vai alla modifica profilo
  const handleEditProfile = () => {
    handleCloseModal();
    if (profile) {
      router.push({
        pathname: '/profiles/edit',
        params: { profileId: profile.id }
      });
    }
  };
  
  // Vai alle impostazioni
  const handleGoToSettings = () => {
    handleCloseModal();
    router.push('/settings');
  };
  
  // Gestisce il logout
  const handleLogout = () => {
    // Chiudi il menu prima di mostrare l'alert
    setShowMenu(false);
    
    // Conferma prima di effettuare il logout
    setTimeout(() => {
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
                // Il reindirizzamento sarà gestito dal contesto di autenticazione
              } catch (error) {
                console.error('Logout error:', error);
                Alert.alert(
                  t('error', { ns: 'common', defaultValue: 'Error' }),
                  t('logoutFailed', { ns: 'auth', defaultValue: 'Logout failed' })
                );
              }
            }
          }
        ]
      );
    }, 300);
  };

  // Renderizza l'icona del profilo corrente
  let iconContent = null;
  
  if (extendedProfile) {
    if (extendedProfile.emoji) {
      // Se c'è un'emoji
      iconContent = (
        <Text style={{ fontSize: size * 0.5 }}>
          {extendedProfile.emoji}
        </Text>
      );
    } else {
      // Usa le iniziali - controllo se il nome esiste
      iconContent = (
        <Text 
          style={[
            styles.initialsText, 
            { fontSize: size * 0.4 }
          ]}
        >
          {extendedProfile.name && extendedProfile.name.length > 0 
            ? extendedProfile.name.charAt(0).toUpperCase() 
            : '?'}
        </Text>
      );
    }
  } else {
    // Icona di default
    iconContent = (
      <Ionicons name="person" size={size * 0.6} color={colors.text} />
    );
  }
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.iconButton,
          { 
            backgroundColor: extendedProfile?.color || colors.primary,
            width: size,
            height: size,
          }
        ]}
        onPress={handleOpenModal}
      >
        {iconContent}
      </TouchableOpacity>
      
      {showName && extendedProfile && (
        <Text style={[styles.profileNameText, { color: colors.text }]}>
          {extendedProfile.name}
        </Text>
      )}
      
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <View 
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBackground }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {i18n.language === 'it' ? 'Opzioni Account' : 'Account Options'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Profilo utente */}
            {extendedProfile && (
              <View style={styles.userProfileContainer}>
                <View 
                  style={[
                    styles.profileAvatar,
                    { backgroundColor: extendedProfile.color || colors.primary }
                  ]}
                >
                  {extendedProfile.emoji ? (
                    <Text style={styles.avatarEmoji}>{extendedProfile.emoji}</Text>
                  ) : (
                    <Text style={styles.avatarInitial}>
                      {extendedProfile.name && extendedProfile.name.length > 0
                        ? extendedProfile.name.charAt(0).toUpperCase()
                        : '?'}
                    </Text>
                  )}
                </View>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {extendedProfile.name || t('unnamed', { ns: 'profile', defaultValue: 'Unnamed' })}
                </Text>
                
                {/* Account email or Guest indication */}
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                  {extendedProfile.isGuest 
                    ? t('guestAccount', { ns: 'auth', defaultValue: 'Guest Account' })
                    : user?.email || t('authenticatedUser', { ns: 'auth', defaultValue: 'Authenticated User' })}
                </Text>
              </View>
            )}
            
            {/* Opzioni account */}
            <View style={styles.optionsContainer}>
              {/* Profilo */}
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
                onPress={handleGoToProfiles}
              >
                <Ionicons name="person" size={24} color={colors.primary} />
                <Text style={[styles.optionText, { color: colors.text, marginLeft: 12 }]}>
                  {i18n.language === 'it' ? 'Profilo' : 'Profile'}
                </Text>
              </TouchableOpacity>
              
              {/* Modifica profilo */}
              {profile && (
                <TouchableOpacity
                  style={[styles.optionItem, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
                  onPress={handleEditProfile}
                >
                  <Ionicons name="create-outline" size={24} color={colors.primary} />
                  <Text style={[styles.optionText, { color: colors.text, marginLeft: 12 }]}>
                    {t('editProfile', { ns: 'profile' })}
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Impostazioni */}
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
                onPress={handleGoToSettings}
              >
                <Ionicons name="settings-outline" size={24} color={colors.primary} />
                <Text style={[styles.optionText, { color: colors.text, marginLeft: 12 }]}>
                  {t('settings', { ns: 'common', defaultValue: 'Settings' })}
                </Text>
              </TouchableOpacity>
              
              {/* Logout */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={24} color={colors.error} />
                <Text style={[styles.optionText, { color: colors.error, marginLeft: 12 }]}>
                  {t('logout', { ns: 'auth', defaultValue: 'Logout' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initialsText: {
    color: 'white',
    fontWeight: 'bold',
  },
  profileNameText: {
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userProfileContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarEmoji: {
    fontSize: 30,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
  },
});

export default ProfileIcon; 