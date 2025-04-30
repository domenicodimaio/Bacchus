import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Platform,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { router, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import sessionService from '../lib/services/session.service';
import * as profileService from '../lib/services/profile.service';
import { useActiveProfiles } from '../contexts/ProfileContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay
} from 'react-native-reanimated';
import { createSession } from '../lib/services/session.service';
import { getCurrentUserProfile, getActiveProfile, getProfileById } from '../lib/services/profile.service';
import usePremiumFeatures from '../hooks/usePremiumFeatures';

// Definiamo l'interfaccia UserProfile qui per evitare errori di importazione
interface UserProfile {
  id: string;
  userId?: string;
  name: string;
  age: number;
  height: number;
  weightKg: number;
  gender: 'male' | 'female';
  drinkingFrequency: 'rarely' | 'occasionally' | 'regularly' | 'frequently';
  color?: string;
  emoji?: string;
  isDefault?: boolean;
  hasCompletedWizard: boolean;
}

export default function NewSessionScreen() {
  const router = useRouter();
  const { t } = useTranslation(['session', 'common', 'profile']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const { currentProfileId } = useActiveProfiles();
  const { canCreateSession, checkAccess } = usePremiumFeatures();
  
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [startTime, setStartTime] = useState(new Date());
  
  // Animated values
  const containerOpacity = useSharedValue(0);
  
  // Load profiles on mount
  useEffect(() => {
    startSessionForCurrentProfile();
    
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
  
  // Avvia automaticamente una sessione per il profilo corrente
  const startSessionForCurrentProfile = () => {
    setLoading(true);
    
    try {
      // Se non c'è un profilo corrente, vai al wizard di creazione profilo
      if (!currentProfileId) {
        router.replace('/onboarding/profile-wizard');
        return;
      }
      
      // Get profile ID first, then get profile
      profileService.getProfileById(currentProfileId)
        .then(profile => {
          // Se il profilo esiste, avvia una sessione
          if (profile) {
            setSelectedProfile(profile);
            setWeight(profile.weightKg?.toString() || '');
            setGender(profile.gender as 'male' | 'female' || 'male');
            return startNewSession(profile);
          } else {
            // Se il profilo non esiste, vai al wizard di creazione profilo
            router.replace('/onboarding/profile-wizard');
          }
        })
        .catch(error => {
          console.error('Errore nel recupero del profilo:', error);
          Alert.alert(
            t('error', { ns: 'common', defaultValue: 'Errore' }),
            t('errorStartingSession', { ns: 'common', defaultValue: 'Non è stato possibile avviare una sessione' })
          );
          setLoading(false);
        });
    } catch (error) {
      console.error('Errore nell\'avvio della sessione per il profilo corrente:', error);
      Alert.alert(
        t('error', { ns: 'common', defaultValue: 'Errore' }),
        t('errorStartingSession', { ns: 'common', defaultValue: 'Non è stato possibile avviare una sessione' })
      );
      setLoading(false);
    }
  };
  
  // Start a new session with the selected profile
  const startNewSession = async (profile: UserProfile) => {
    try {
      setLoading(true);
      
      // Assicurati che gender sia valorizzato correttamente
      const validProfile = {
        ...profile,
        gender: profile.gender || 'male' // Default to 'male' if empty
      };
      
      // Create a new session
      const newSession = await sessionService.createSession(validProfile);
      
      if (!newSession) {
        console.error('Errore: createSession ha restituito null');
        Alert.alert(
          t('error', { ns: 'common', defaultValue: 'Errore' }),
          t('errorCreatingSession', { ns: 'common', defaultValue: 'Non è stato possibile creare una nuova sessione' })
        );
        return;
      }
      
      // Navigate to the session screen
      router.replace('/session');
    } catch (error) {
      console.error('Errore nella creazione della sessione:', error);
      Alert.alert(
        t('error', { ns: 'common', defaultValue: 'Errore' }),
        t('errorCreatingSession', { ns: 'common', defaultValue: 'Si è verificato un errore durante la creazione della sessione' })
      );
    } finally {
      setLoading(false);
    }
  };
  
  const validateInputs = () => {
    if (!selectedProfile) {
      Alert.alert(t('Error'), t('Please select a profile'));
      return false;
    }
    
    if (!weight || isNaN(Number(weight)) || Number(weight) <= 0) {
      Alert.alert(t('Error'), t('Please enter a valid weight'));
      return false;
    }
    
    if (!gender) {
      Alert.alert(t('Error'), t('Please select your gender'));
      return false;
    }
    
    return true;
  };
  
  const handleStartSession = () => {
    // Verifica se l'utente può creare una nuova sessione
    if (!canCreateSession()) {
      // Se non può, mostra il prompt di upgrade
      checkAccess('canCreateUnlimitedSessions', true, 'new_session');
      return;
    }
    
    // Correggo l'errore di confronto tra string e number
    const weightNum = parseFloat(weight);
    if (!weight || isNaN(weightNum) || weightNum <= 0) {
      Alert.alert(
        t('invalidWeight', { ns: 'common', defaultValue: 'Peso non valido' }),
        t('invalidWeightMessage', { ns: 'common', defaultValue: 'Inserisci un peso valido' })
      );
      return;
    }
    
    if (!gender) {
      Alert.alert(
        t('selectGender', { ns: 'common', defaultValue: 'Seleziona il genere' }),
        t('selectGenderMessage', { ns: 'common', defaultValue: 'Seleziona il tuo genere' })
      );
      return;
    }
    
    // Check if we have an active profile ID
    if (!currentProfileId) {
      Alert.alert(
        t('error', { ns: 'common', defaultValue: 'Errore' }),
        t('noActiveProfile', { ns: 'common', defaultValue: 'Nessun profilo attivo' })
      );
      return;
    }

    setLoading(true);
    
    // Get profile by ID using promise chain
    profileService.getProfileById(currentProfileId)
      .then(profile => {
        if (!profile) {
          Alert.alert(
            t('error', { ns: 'common', defaultValue: 'Errore' }),
            t('noProfileFound', { ns: 'common', defaultValue: 'Nessun profilo trovato' })
          );
          return null;
        }

        // Update profile - correggo l'errore di type conversion
        const updatedProfile = { 
          ...profile,
          weightKg: parseFloat(weight), // Converto da string a number
          gender: gender || 'male' // Garantisco che gender sia sempre valorizzato
        };
        
        // Save updated profile and continue
        return profileService.saveProfileLocally(updatedProfile)
          .then(() => {
            // Convert to session profile format
            const sessionProfile = {
              id: updatedProfile.id,
              name: updatedProfile.name,
              gender: updatedProfile.gender,
              weightKg: updatedProfile.weightKg,
              age: updatedProfile.age,
              height: updatedProfile.height,
              drinkingFrequency: updatedProfile.drinkingFrequency,
              color: updatedProfile.color,
              emoji: updatedProfile.emoji,
              isDefault: updatedProfile.isDefault,
              userId: updatedProfile.userId
            };

            // Create session with session profile
            return createSession(sessionProfile);
          });
      })
      .then(session => {
        if (!session) {
          Alert.alert(
            t('error', { ns: 'common', defaultValue: 'Errore' }),
            t('errorCreatingSession', { ns: 'common', defaultValue: 'Si è verificato un errore durante la creazione della sessione' })
          );
          return;
        }

        // Aggiorna il BAC per assicurarsi che sia calcolato correttamente
        sessionService.updateSessionBAC();
        
        console.log('Sessione creata con successo:', session);
        router.push('/session');
      })
      .catch(error => {
        console.error('Error in session creation:', error);
        Alert.alert(
          t('error', { ns: 'common', defaultValue: 'Errore' }),
          t('errorCreatingSession', { ns: 'common', defaultValue: 'Si è verificato un errore durante la creazione della sessione' })
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  const handleSelectProfile = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setWeight(profile.weightKg?.toString() || '');
    setGender(profile.gender || 'male');  // Garantisco che gender sia sempre valorizzato
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('newSession', { ns: 'session' })}
        </Text>
        <View style={styles.backButton} />
      </View>
      
      <Animated.View style={[styles.content, animatedContainer]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {t('startingSession', { ns: 'session' })}
            </Text>
          </View>
        ) : null}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
}); 