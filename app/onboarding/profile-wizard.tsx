import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Platform,
  StatusBar,
  Dimensions,
  ScrollView,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import * as profileService from '../lib/services/profile.service';

const { width, height } = Dimensions.get('window');

// Le fasi del wizard
const WIZARD_STEPS = [
  'welcome',
  'name',
  'gender',
  'weight',
  'drinkingHabits',
  'complete'
];

export default function ProfileWizard() {
  const { t, i18n } = useTranslation(['profile', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  
  // Stato per tenere traccia della fase attuale del wizard
  const [currentStep, setCurrentStep] = useState(0);
  
  // Stato per i dati del profilo
  const [profile, setProfile] = useState({
    name: '',
    gender: '',
    weightKg: '',
    drinkingFrequency: ''
  });

  // Traduzioni statiche per i campi mancanti
  const staticTranslations = {
    it: {
      yourName: "Il tuo nome",
      nameExplanation: "Come vuoi essere chiamato nell'app?",
      yourGender: "Il tuo genere",
      genderExplanation: "Questo è importante per calcolare correttamente il tuo tasso alcolemico"
    },
    en: {
      yourName: "Your name",
      nameExplanation: "How would you like to be called in the app?",
      yourGender: "Your gender",
      genderExplanation: "This is important to correctly calculate your blood alcohol level"
    }
  };

  // Helper per ottenere la traduzione (dal servizio o statica se mancante)
  const getTranslation = (key, defaultValue = "") => {
    // Prima prova con il servizio di traduzione normale
    const translation = t(key);
    
    // Se la traduzione è uguale alla chiave (cioè è mancante)
    if (translation === key) {
      // Usa la traduzione statica
      const currentLang = i18n.language || 'en';
      const staticTrans = staticTranslations[currentLang];
      return staticTrans && staticTrans[key] ? staticTrans[key] : defaultValue;
    }
    
    return translation;
  };
  
  // Funzioni per navigare tra gli step
  const nextStep = () => {
    Keyboard.dismiss(); // Chiudi la tastiera quando si procede
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    Keyboard.dismiss(); // Chiudi la tastiera quando si torna indietro
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Funzione per aggiornare i dati del profilo
  const updateProfile = (field, value) => {
    setProfile({
      ...profile,
      [field]: value
    });
  };
  
  // Funzione per completare il wizard
  const completeWizard = () => {
    try {
      // Salviamo i dati del profilo nel servizio
      const newProfile = {
        name: profile.name,
        gender: profile.gender as 'male' | 'female',
        weightKg: parseInt(profile.weightKg, 10),
        age: 30, // Default value
        height: 175, // Default value
        drinkingFrequency: profile.drinkingFrequency as 'rarely' | 'occasionally' | 'regularly' | 'frequently'
      };
      
      // Salva il profilo usando il servizio
      profileService.createProfile(newProfile);
      console.log('Profile saved:', newProfile);
      
      // Imposta un breve ritardo per assicurarsi che il profilo sia salvato prima della navigazione
      setTimeout(() => {
        // Naviga alla dashboard
        console.log('Navigating to dashboard...');
        router.replace('/dashboard');
      }, 300);
    } catch (error) {
      console.error('Error saving profile:', error);
      // In caso di errore, mostra un messaggio
      alert(t('errorSavingProfile'));
    }
  };
  
  // Funzione per uscire dal wizard
  const handleExitWizard = () => {
    // Se l'utente ha altri profili, vai alla dashboard
    const profiles = profileService.getProfiles();
    if (profiles && profiles.length > 0) {
      router.replace('/dashboard');
    } else {
      // Altrimenti torna alla schermata di login
      router.replace('/login');
    }
  };
  
  // Renderizza il pulsante Next/Complete
  const renderNextButton = () => {
    switch (WIZARD_STEPS[currentStep]) {
      case 'welcome':
        return (
          <TouchableOpacity 
            style={[styles.nextButton, { 
              backgroundColor: colors.primary,
              shadowColor: colors.primaryNeon,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 8 
            }]} 
            onPress={nextStep}
          >
            <Text style={[styles.nextButtonText, { fontSize: SIZES.subtitle, color: 'white' }]}>
              {t('getStarted')}
            </Text>
            <Ionicons name="arrow-forward" size={24} color="white" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        );
      case 'complete':
        return (
          <TouchableOpacity 
            style={[styles.nextButton, { 
              backgroundColor: colors.primary,
              shadowColor: colors.primaryNeon,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 8 
            }]} 
            onPress={completeWizard}
          >
            <Text style={[styles.nextButtonText, { fontSize: SIZES.subtitle, color: 'white' }]}>
              {t('getStarted')}
            </Text>
            <Ionicons name="arrow-forward" size={24} color="white" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        );
      default:
        // Check if current step has data
        const canProceed = () => {
          switch (WIZARD_STEPS[currentStep]) {
            case 'name':
              return !!profile.name;
            case 'gender':
              return !!profile.gender;
            case 'weight':
              return !!profile.weightKg;
            case 'drinkingHabits':
              return !!profile.drinkingFrequency;
            default:
              return true;
          }
        };
        
        return (
          <TouchableOpacity 
            style={[
              styles.nextButton, 
              { 
                backgroundColor: canProceed() ? colors.primary : colors.cardElevated,
                opacity: canProceed() ? 1 : 0.6,
                shadowColor: canProceed() ? colors.primaryNeon : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: canProceed() ? 0.5 : 0,
                shadowRadius: 8,
                elevation: canProceed() ? 8 : 2
              }
            ]} 
            onPress={nextStep}
            disabled={!canProceed()}
          >
            <Text style={[
              styles.nextButtonText, 
              { 
                color: canProceed() ? 'white' : colors.textTertiary,
                fontSize: SIZES.subtitle
              }
            ]}>
              {t('next')}
            </Text>
            <Ionicons 
              name="arrow-forward" 
              size={24} 
              color={canProceed() ? 'white' : colors.textTertiary}
              style={{ marginLeft: 8 }} 
            />
          </TouchableOpacity>
        );
    }
  };
  
  // Renderizza il contenuto dello step corrente
  const renderStepContent = () => {
    switch (WIZARD_STEPS[currentStep]) {
      case 'welcome':
        return (
          <View style={styles.stepContent}>
            <FontAwesome5 
              name="glass-cheers" 
              size={90} 
              color={colors.primary} 
              style={[styles.welcomeIcon, { 
                shadowColor: colors.primaryNeon,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 15,
                elevation: 10
              }]} 
            />
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              {t('welcomeToApp')}
            </Text>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
              {t('setupProfilePrompt')}
            </Text>
          </View>
        );
      case 'name':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {getTranslation('yourName', "Your Name")}
            </Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {getTranslation('nameExplanation', "How would you like to be called in the app?")}
            </Text>
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: colors.cardElevated, 
                  color: colors.text,
                  borderColor: profile.name ? colors.primary : colors.border,
                  borderWidth: profile.name ? 3 : 1,
                }
              ]}
              placeholder={t('enterName')}
              placeholderTextColor={colors.textTertiary}
              value={profile.name}
              onChangeText={(text) => updateProfile('name', text)}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                if (profile.name) nextStep();
              }}
            />
            
            {profile.name && (
              <View style={[styles.previewContainer, { 
                backgroundColor: `${colors.primary}20`,
                borderWidth: 1,
                borderColor: colors.primary
              }]}>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                  {t('name')}:
                </Text>
                <Text style={[styles.previewValue, { color: colors.primary, fontSize: SIZES.subtitle }]}>
                  {profile.name}
                </Text>
              </View>
            )}
          </View>
        );
      case 'gender':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {getTranslation('yourGender', "Your Gender")}
            </Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {getTranslation('genderExplanation', "This is important to calculate your BAC correctly")}
            </Text>
            <View style={styles.genderOptions}>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  profile.gender === 'male' && { 
                    borderColor: colors.primary, 
                    borderWidth: 3,
                    backgroundColor: `${colors.primary}20` 
                  },
                  { 
                    backgroundColor: colors.cardElevated,
                    shadowColor: profile.gender === 'male' ? colors.primaryNeon : colors.shadow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: profile.gender === 'male' ? 0.5 : 0.2,
                    shadowRadius: profile.gender === 'male' ? 8 : 3,
                    elevation: profile.gender === 'male' ? 6 : 3,
                  }
                ]}
                onPress={() => updateProfile('gender', 'male')}
              >
                <FontAwesome5 
                  name="mars" 
                  size={40} 
                  color={profile.gender === 'male' ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.genderText, 
                  { 
                    color: profile.gender === 'male' ? colors.primary : colors.text,
                    fontSize: SIZES.subtitle,
                    marginTop: 12
                  }
                ]}>
                  {t('male')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  profile.gender === 'female' && { 
                    borderColor: colors.primary, 
                    borderWidth: 3,
                    backgroundColor: `${colors.primary}20` 
                  },
                  { 
                    backgroundColor: colors.cardElevated,
                    shadowColor: profile.gender === 'female' ? colors.primaryNeon : colors.shadow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: profile.gender === 'female' ? 0.5 : 0.2,
                    shadowRadius: profile.gender === 'female' ? 8 : 3,
                    elevation: profile.gender === 'female' ? 6 : 3,
                  }
                ]}
                onPress={() => updateProfile('gender', 'female')}
              >
                <FontAwesome5 
                  name="venus" 
                  size={40} 
                  color={profile.gender === 'female' ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.genderText, 
                  { 
                    color: profile.gender === 'female' ? colors.primary : colors.text,
                    fontSize: SIZES.subtitle,
                    marginTop: 12
                  }
                ]}>
                  {t('female')}
                </Text>
              </TouchableOpacity>
            </View>
            
            {profile.gender && (
              <View style={[styles.previewContainer, { 
                backgroundColor: `${colors.primary}20`,
                borderWidth: 1,
                borderColor: colors.primary
              }]}>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                  {t('gender')}:
                </Text>
                <Text style={[styles.previewValue, { color: colors.primary, fontSize: SIZES.subtitle }]}>
                  {t(profile.gender)}
                </Text>
              </View>
            )}
          </View>
        );
      case 'weight':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {t('yourWeight')}
            </Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {t('weightExplanation')}
            </Text>
            <View style={styles.weightInputContainer}>
              <TextInput
                style={[
                  styles.weightInput, 
                  { 
                    backgroundColor: colors.cardElevated, 
                    color: colors.text,
                    borderColor: profile.weightKg ? colors.primary : colors.border,
                    borderWidth: profile.weightKg ? 3 : 1,
                    fontSize: SIZES.extraLarge
                  }
                ]}
                placeholder="70"
                placeholderTextColor={colors.textTertiary}
                value={profile.weightKg}
                onChangeText={(text) => updateProfile('weightKg', text)}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                autoFocus
              />
              <Text style={[styles.weightUnit, { color: colors.text, fontSize: SIZES.large }]}>kg</Text>

              {/* Aggiungiamo un pulsante per chiudere la tastiera */}
              <TouchableOpacity 
                style={styles.dismissKeyboardButton}
                onPress={() => Keyboard.dismiss()}
              >
                <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            {profile.weightKg && (
              <View style={[styles.previewContainer, { 
                backgroundColor: `${colors.primary}20`,
                borderWidth: 1,
                borderColor: colors.primary
              }]}>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                  {t('weight')}:
                </Text>
                <Text style={[styles.previewValue, { color: colors.primary, fontSize: SIZES.subtitle }]}>
                  {profile.weightKg} kg
                </Text>
              </View>
            )}

            {/* Istruzioni per chiudere la tastiera */}
            <Text style={[styles.keyboardHelp, { color: colors.textSecondary }]}>
              {i18n.language === 'it' ? 
                "Tocca il pulsante verde o 'Fine' sulla tastiera per continuare" : 
                "Tap the green button or 'Done' on keyboard to continue"}
            </Text>
          </View>
        );
      case 'drinkingHabits':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {t('drinkingHabits')}
            </Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {t('habitsExplanation')}
            </Text>
            <View style={styles.habitsOptions}>
              {['rarely', 'occasionally', 'regularly', 'frequently'].map((frequency) => (
                <TouchableOpacity
                  key={frequency}
                  style={[
                    styles.habitOption,
                    profile.drinkingFrequency === frequency && { 
                      borderColor: colors.primary, 
                      borderWidth: 3,
                      backgroundColor: `${colors.primary}20` 
                    },
                    { 
                      backgroundColor: colors.cardElevated,
                      shadowColor: profile.drinkingFrequency === frequency ? colors.primaryNeon : colors.shadow,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: profile.drinkingFrequency === frequency ? 0.5 : 0.2,
                      shadowRadius: profile.drinkingFrequency === frequency ? 6 : 2,
                      elevation: profile.drinkingFrequency === frequency ? 5 : 2,
                    }
                  ]}
                  onPress={() => updateProfile('drinkingFrequency', frequency)}
                >
                  <Text style={[
                    styles.habitText, 
                    { 
                      color: profile.drinkingFrequency === frequency ? colors.primary : colors.text,
                      fontSize: SIZES.subtitle
                    }
                  ]}>
                    {t(frequency)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {profile.drinkingFrequency && (
              <View style={[styles.previewContainer, { 
                backgroundColor: `${colors.primary}20`,
                borderWidth: 1,
                borderColor: colors.primary
              }]}>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                  {t('drinkingFrequency')}:
                </Text>
                <Text style={[styles.previewValue, { color: colors.primary, fontSize: SIZES.subtitle }]}>
                  {t(profile.drinkingFrequency)}
                </Text>
              </View>
            )}
          </View>
        );
      case 'complete':
        return (
          <View style={styles.stepContent}>
            <Ionicons 
              name="checkmark-circle" 
              size={100} 
              color={colors.primary} 
              style={[styles.completeIcon, {
                shadowColor: colors.primaryNeon,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 15,
                elevation: 10
              }]} 
            />
            <Text style={[styles.completeTitle, { color: colors.text, fontSize: SIZES.large }]}>
              {t('allSet')}
            </Text>
            <Text style={[styles.completeText, { color: colors.textSecondary }]}>
              {t('profileCreated')}
            </Text>
            <View style={styles.profileSummary}>
              <View style={[styles.summaryCard, { 
                backgroundColor: colors.cardElevated, 
                borderLeftWidth: 4,
                borderLeftColor: colors.primary,
              }]}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {t('name')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text, fontSize: SIZES.subtitle }]}>
                  {profile.name}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { 
                  backgroundColor: colors.cardElevated, 
                  flex: 1, 
                  marginRight: 8, 
                  borderLeftWidth: 4,
                  borderLeftColor: colors.primary,
                }]}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    {t('gender')}
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.text, fontSize: SIZES.subtitle }]}>
                    {t(profile.gender)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { 
                  backgroundColor: colors.cardElevated, 
                  flex: 1, 
                  marginLeft: 8, 
                  borderLeftWidth: 4,
                  borderLeftColor: colors.primary,
                }]}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    {t('weight')}
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.text, fontSize: SIZES.subtitle }]}>
                    {profile.weightKg} kg
                  </Text>
                </View>
              </View>
              <View style={[styles.summaryCard, { 
                backgroundColor: colors.cardElevated, 
                borderLeftWidth: 4,
                borderLeftColor: colors.primary,
              }]}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {t('drinkingFrequency')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text, fontSize: SIZES.subtitle }]}>
                  {t(profile.drinkingFrequency)}
                </Text>
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };
  
  // Calcola la percentuale di progresso
  const progressPercentage = (currentStep / (WIZARD_STEPS.length - 1)) * 100;
  
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        
        {/* Pulsante di uscita (X) */}
        <TouchableOpacity 
          style={[styles.exitButton, { 
            backgroundColor: `${colors.primary}20`,
            borderWidth: 1,
            borderColor: colors.primary
          }]}
          onPress={handleExitWizard}
        >
          <Ionicons name="close" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${progressPercentage}%`, 
                backgroundColor: colors.primary 
              }
            ]} 
          />
        </View>
        
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <Text style={[styles.stepNumber, { color: colors.textSecondary }]}>
            {currentStep + 1}/{WIZARD_STEPS.length}
          </Text>
        </View>
        
        {/* Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>
        
        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          {currentStep > 0 && (
            <TouchableOpacity 
              style={[styles.backButton, { backgroundColor: colors.card }]} 
              onPress={prevStep}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
              <Text style={[styles.backButtonText, { color: colors.text }]}>
                {t('back')}
              </Text>
            </TouchableOpacity>
          )}
          {renderNextButton()}
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  stepIndicator: {
    alignItems: 'flex-end',
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding,
  },
  stepNumber: {
    fontSize: SIZES.body,
  },
  contentContainer: {
    flexGrow: 1,
    padding: SIZES.padding,
    justifyContent: 'center',
  },
  stepContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  welcomeIcon: {
    marginBottom: SIZES.marginLarge,
  },
  welcomeTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZES.margin,
  },
  welcomeText: {
    fontSize: SIZES.body,
    textAlign: 'center',
    marginHorizontal: SIZES.padding,
  },
  stepTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZES.margin,
  },
  stepDescription: {
    fontSize: SIZES.body,
    textAlign: 'center',
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.marginLarge,
  },
  input: {
    width: '100%',
    height: 56,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.padding,
    fontSize: SIZES.body,
    marginTop: SIZES.marginSmall,
  },
  previewContainer: {
    marginTop: SIZES.marginLarge,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: SIZES.paddingSmall,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.radius,
  },
  previewLabel: {
    fontSize: SIZES.body,
    marginRight: 8,
  },
  previewValue: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
  },
  genderOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: SIZES.marginLarge,
  },
  genderOption: {
    width: '45%',
    height: 130,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
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
  genderText: {
    marginTop: SIZES.marginSmall,
    fontSize: SIZES.body,
    fontWeight: '500',
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.marginLarge,
    position: 'relative',
  },
  weightInput: {
    width: 120,
    height: 60,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.padding,
    fontSize: SIZES.title,
    textAlign: 'center',
  },
  weightUnit: {
    fontSize: SIZES.title,
    marginLeft: SIZES.margin,
  },
  dismissKeyboardButton: {
    marginLeft: 15,
    padding: 5,
  },
  keyboardHelp: {
    marginTop: 15,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  habitsOptions: {
    width: '100%',
    marginTop: SIZES.marginLarge,
  },
  habitOption: {
    width: '100%',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.marginSmall,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  habitText: {
    fontSize: SIZES.body,
    fontWeight: '500',
  },
  completeIcon: {
    marginBottom: SIZES.marginLarge,
  },
  completeTitle: {
    fontSize: SIZES.title,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZES.margin,
  },
  completeText: {
    fontSize: SIZES.body,
    textAlign: 'center',
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.marginLarge,
  },
  profileSummary: {
    width: '100%',
    marginTop: SIZES.marginLarge,
  },
  summaryCard: {
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.marginSmall,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryLabel: {
    fontSize: SIZES.small,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SIZES.padding,
    paddingBottom: Platform.OS === 'ios' ? 34 : SIZES.padding,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.paddingSmall,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.radiusLarge,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: SIZES.body,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.paddingSmall,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.radiusLarge,
    marginLeft: 'auto', // Assicura che il pulsante sia sempre a destra
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  nextButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  exitButton: {
    position: 'absolute',
    top: 70,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryNeon,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
}); 