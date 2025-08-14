import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  SafeAreaView
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { SIZES } from '../constants/theme';
import * as profileService from '../lib/services/profile.service';
import AppHeader from '../components/AppHeader';
import { extendProfile, ExtendedUserProfile } from '../types/profile';
import EmojiSelector from 'react-native-emoji-selector';
import { useUserProfile } from '../contexts/ProfileContext';

const EMOJI_OPTIONS = [
  '😀', '😁', '😎', '🤩', '😇', '🥳', '🤠', '🤓',
  '🥸', '🤪', '😊', '😺', '🐱', '🐶', '🐻', '🦊',
  '🦁', '🐯', '🐨', '🐼', '🐵', '🐴', '🦄', '🐮'
];

const AVATAR_COLORS = [
  '#FF5252', '#FF4081', '#E040FB', '#7C4DFF', 
  '#536DFE', '#448AFF', '#40C4FF', '#18FFFF', 
  '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41',
  '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'
];

export default function EditProfileScreen() {
  const { t } = useTranslation(['profile', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const params = useLocalSearchParams();
  const profileId = params.profileId as string;
  const { profile: currentUserProfile, setProfile: updateCurrentProfile } = useUserProfile();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Stato per i dati del profilo
  const [profile, setProfile] = useState<ExtendedUserProfile>({
    id: '',
    name: '',
    gender: 'male',
    weightKg: 70,
    age: 30,
    height: 175,
    drinkingFrequency: 'occasionally',
    emoji: '',
    color: AVATAR_COLORS[0],
    isGuest: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hasCompletedWizard: true
  });
  
  // Carica i dati del profilo all'avvio
  useEffect(() => {
    const loadProfile = async () => {
      if (profileId) {
        const existingProfile = await profileService.getProfileById(profileId);
        if (existingProfile) {
          // Converte il profilo base in un profilo esteso
          const extendedPro = extendProfile(existingProfile);
          setProfile({
            ...extendedPro,
            emoji: extendedPro.emoji || '',
            color: extendedPro.color || AVATAR_COLORS[0]
          });
        }
      }
      
      setIsLoading(false);
    };
    
    loadProfile();
  }, [profileId]);
  
  // Aggiorna il profilo
  const updateProfile = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Gestisce la selezione dell'emoji
  const handleSelectEmoji = (emoji) => {
    updateProfile('emoji', emoji);
    setShowEmojiPicker(false);
  };
  
  // Gestisce la selezione del colore
  const handleSelectColor = (color) => {
    updateProfile('color', color);
    setShowColorPicker(false);
  };
  
  // Salva il profilo modificato
  const handleSaveProfile = async () => {
    // Validazione di base
    if (!profile.name || !profile.weightKg) {
      Alert.alert(
        t('validationError', { ns: 'common' }),
        t('requiredFields', { ns: 'common' })
      );
      return;
    }
    
    // Converti i valori numerici e verifica che siano validi
    const weightKg = typeof profile.weightKg === 'string' ? parseFloat(profile.weightKg) : profile.weightKg || 0;
    const age = typeof profile.age === 'string' ? parseInt(profile.age, 10) : profile.age || 0;
    const height = typeof profile.height === 'string' ? parseInt(profile.height, 10) : profile.height || 0;
    
    // Verifica che i valori convertiti siano numeri validi
    if (isNaN(weightKg) || isNaN(age) || isNaN(height)) {
      Alert.alert(
        t('validationError', { ns: 'common' }),
        t('invalidNumericValues', { ns: 'common', defaultValue: 'I valori di peso, età e altezza devono essere numeri validi.' })
      );
      return;
    }
    
    // Verifica che i valori siano nel range accettabile
    if (weightKg <= 0 || weightKg > 300) {
      Alert.alert(
        t('validationError', { ns: 'common' }),
        t('invalidWeight', { ns: 'profile', defaultValue: 'Il peso deve essere compreso tra 1 e 300 kg.' })
      );
      return;
    }
    
    if (age <= 0 || age > 120) {
      Alert.alert(
        t('validationError', { ns: 'common' }),
        t('invalidAge', { ns: 'profile', defaultValue: 'L\'età deve essere compresa tra 1 e 120 anni.' })
      );
      return;
    }
    
    if (height < 100 || height > 250) {
      Alert.alert(
        t('validationError', { ns: 'common' }),
        t('invalidHeight', { ns: 'profile', defaultValue: 'L\'altezza deve essere compresa tra 100 e 250 cm.' })
      );
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Prepara i dati del profilo per il salvataggio
      const updatedProfileData = {
        ...profile,
        weightKg: weightKg,
        age: age,
        height: height,
      };
      
      // Aggiorna il profilo passando ID e dati separatamente
      const updatedProfile = await profileService.updateProfile(profileId, updatedProfileData);
      
      // Se il profilo corrente è quello che stiamo modificando, aggiorniamo anche il profilo utente attivo
      if (currentUserProfile && currentUserProfile.id === profileId && updatedProfile) {
        await updateCurrentProfile(updatedProfile);
      }
      
      // Torna al tab Profilo (con tab bar) invece di sostituire tutta la navigazione
      router.push('/(tabs)/profile');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert(
        t('error', { ns: 'common' }),
        t('profileUpdateError', { ns: 'profile' })
      );
    } finally {
      setIsSaving(false);
    }
  };
  
  // Rendering condizionale durante il caricamento
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader 
          title={t('editProfile', { ns: 'profile' })}
          isMainScreen={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <AppHeader 
        title={t('editProfile', { ns: 'profile' })}
        isMainScreen={false}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={[
              styles.avatarContainer, 
              { backgroundColor: profile.color }
            ]}>
              {profile.emoji ? (
                <Text style={styles.avatarEmoji}>{profile.emoji}</Text>
              ) : (
                <Text style={styles.avatarInitial}>
                  {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                </Text>
              )}
            </View>
            
            <View style={styles.avatarActions}>
              <TouchableOpacity 
                style={[styles.avatarButton, { backgroundColor: colors.surface }]}
                onPress={() => setShowEmojiPicker(true)}
              >
                <MaterialIcons name="emoji-emotions" size={22} color={colors.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.avatarButton, { backgroundColor: colors.surface }]}
                onPress={() => setShowColorPicker(true)}
              >
                <MaterialIcons name="colorize" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Form Fields */}
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('personalInfo', { ns: 'profile' })}
            </Text>
            
            {/* Nome */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t('name')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border
                  }
                ]}
                value={profile.name}
                onChangeText={text => updateProfile('name', text)}
                placeholder={t('enterName')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            
            {/* Genere */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t('gender')}
              </Text>
              <View style={styles.genderButtons}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    { 
                      backgroundColor: profile.gender === 'male' 
                        ? colors.primary 
                        : colors.surface
                    }
                  ]}
                  onPress={() => updateProfile('gender', 'male')}
                >
                  <FontAwesome5 
                    name="mars" 
                    size={18} 
                    color={profile.gender === 'male' ? 'white' : colors.text} 
                  />
                  <Text style={[
                    styles.genderText,
                    { 
                      color: profile.gender === 'male' 
                        ? 'white' 
                        : colors.text 
                    }
                  ]}>
                    {t('male')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    { 
                      backgroundColor: profile.gender === 'female' 
                        ? colors.primary 
                        : colors.surface
                    }
                  ]}
                  onPress={() => updateProfile('gender', 'female')}
                >
                  <FontAwesome5 
                    name="venus" 
                    size={18} 
                    color={profile.gender === 'female' ? 'white' : colors.text} 
                  />
                  <Text style={[
                    styles.genderText,
                    { 
                      color: profile.gender === 'female' 
                        ? 'white' 
                        : colors.text 
                    }
                  ]}>
                    {t('female')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Peso */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t('weight')} (kg)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border
                  }
                ]}
                value={profile.weightKg !== undefined && profile.weightKg !== null ? profile.weightKg.toString() : ''}
                onChangeText={text => updateProfile('weightKg', text)}
                keyboardType="numeric"
                placeholder="70"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            
            {/* Età */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t('age')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border
                  }
                ]}
                value={profile.age !== undefined && profile.age !== null ? profile.age.toString() : ''}
                onChangeText={text => updateProfile('age', text)}
                keyboardType="numeric"
                placeholder="30"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            
            {/* Altezza */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t('height')} (cm)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border
                  }
                ]}
                value={profile.height !== undefined && profile.height !== null ? profile.height.toString() : ''}
                onChangeText={text => updateProfile('height', text)}
                keyboardType="numeric"
                placeholder="175"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
          
          {/* Removed save button from ScrollView */}
          
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Save button outside of ScrollView for permanent visibility */}
      <SafeAreaView style={[styles.saveButtonContainer, { 
        backgroundColor: colors.background,
        borderTopColor: colors.border 
      }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
            isSaving && { opacity: 0.7 }
          ]}
          onPress={handleSaveProfile}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>
              {t('save')}
            </Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
      
      {/* Emoji Picker Modal */}
      <Modal
        visible={showEmojiPicker}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header stile AppHeader */}
          <View style={[styles.modalHeader, { 
            backgroundColor: colors.headerBackground || colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border
          }]}>
            <TouchableOpacity 
              style={styles.modalBackButton}
              onPress={() => setShowEmojiPicker(false)}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('selectEmoji')}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          
          {/* Emoji Selector */}
          <View style={styles.emojiPickerContainer}>
            <EmojiSelector
              onEmojiSelected={handleSelectEmoji}
              showSearchBar={true}
              showTabs={true}
              showHistory={true}
              showSectionTitles={true}
              columns={8}
            />
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowColorPicker(false)}
        >
          <View style={[styles.colorPickerModal, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('selectColor')}
              </Text>
              <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.colorGrid}>
              {[
                '#FF5252', '#FF4081', '#E040FB', '#7C4DFF', 
                '#536DFE', '#448AFF', '#40C4FF', '#18FFFF', 
                '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41',
                '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'
              ].map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorItem, 
                    { 
                      backgroundColor: color,
                      borderWidth: profile.color === color ? 4 : 2,
                      borderColor: profile.color === color ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                    }
                  ]}
                  onPress={() => handleSelectColor(color)}
                >
                  {profile.color === color && (
                    <Ionicons name="checkmark" size={28} color="white" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  content: {
    padding: SIZES.padding,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SIZES.marginLarge,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.margin,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  avatarInitial: {
    fontSize: 40,
    color: 'white',
    fontWeight: 'bold',
  },
  avatarActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  formSection: {
    marginBottom: SIZES.marginLarge,
  },
  sectionTitle: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
    marginBottom: SIZES.marginSmall,
  },
  inputWrapper: {
    marginBottom: SIZES.margin,
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: SIZES.small,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: SIZES.radiusSmall,
    paddingHorizontal: SIZES.padding,
    fontSize: SIZES.body,
  },
  genderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: SIZES.radiusSmall,
    marginHorizontal: 5,
  },
  genderText: {
    marginLeft: 10,
    fontSize: SIZES.body,
  },
  saveButtonContainer: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  saveButton: {
    height: 56,
    borderRadius: SIZES.radiusSmall,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  modalBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  emojiPickerContainer: {
    flex: 1,
  },
  colorPickerModal: {
    padding: 16,
    borderRadius: SIZES.radius,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
    width: '90%',
    maxWidth: 400,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 10,
  },
  colorItem: {
    width: 65,
    height: 65,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
}); 