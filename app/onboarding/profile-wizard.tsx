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
  Keyboard,
  Modal,
  Image,
  Alert,
  KeyboardAvoidingView,
  FlatList
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import * as profileService from '../lib/services/profile.service';
import { useUserProfile } from '../contexts/ProfileContext';
import { useAuth, clearAllNavigationBlocks, safeNavigate } from '../contexts/AuthContext';
import EmojiSelector from 'react-native-emoji-selector';
import authService from '../lib/services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../components/Toast';
import * as sessionService from '../lib/services/session.service';

const { width, height } = Dimensions.get('window');

// Chiave per la cache del wizard
const WIZARD_CACHE_KEY = 'bacchus_wizard_cache';

// Colori disponibili per gli avatar
const AVATAR_COLORS = [
  '#FF5252', '#FF4081', '#E040FB', '#7C4DFF', 
  '#536DFE', '#448AFF', '#40C4FF', '#18FFFF', 
  '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41',
  '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'
];

// Le fasi del wizard
const WIZARD_STEPS = [
  'welcome',
  'name',
  'gender',
  'weight',
  'age',
  'height',
  'drinkingHabits',
  'emoji',
  'complete'
];

// Componente EmojiPickerModal
const EmojiPickerModal = ({ visible, onClose, onSelect, currentEmoji }) => {
  const { currentTheme } = useTheme();
  const { t } = useTranslation(['profile', 'common']);
  
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: currentTheme.COLORS.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: currentTheme.COLORS.headerBackground }]}>
          <Text style={[styles.modalTitle, { color: currentTheme.COLORS.text }]}>
            {t('selectEmoji', { ns: 'profile', defaultValue: 'Seleziona Emoji' })}
          </Text>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={currentTheme.COLORS.text} />
          </TouchableOpacity>
        </View>
        <EmojiSelector
          onEmojiSelected={onSelect}
          columns={8}
          showSearchBar={true}
          showTabs={true}
          showHistory={true}
        />
      </View>
    </Modal>
  );
};

// Componente ColorPickerModal
const ColorPickerModal = ({ visible, onClose, onSelect, currentColor }) => {
  const { currentTheme } = useTheme();
  const { t } = useTranslation(['profile', 'common']);
  
  // Array di colori tra cui scegliere
  const AVATAR_COLORS = [
    '#FF5252', '#FF4081', '#E040FB', '#7C4DFF', 
    '#536DFE', '#448AFF', '#40C4FF', '#18FFFF', 
    '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41',
    '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'
  ];
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={[styles.colorPickerModal, { backgroundColor: currentTheme.COLORS.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: currentTheme.COLORS.text }]}>
              {t('selectColor', { ns: 'profile', defaultValue: 'Seleziona Colore' })}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={currentTheme.COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.colorGrid}>
            {AVATAR_COLORS.map((color, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorItem, 
                  { 
                    backgroundColor: color,
                    borderWidth: currentColor === color ? 4 : 2,
                    borderColor: currentColor === color ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                  }
                ]} 
                onPress={() => onSelect(color)}
              >
                {currentColor === color && (
                  <Ionicons name="checkmark" size={28} color="white" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default function ProfileWizard() {
  const { t, i18n } = useTranslation(['profile', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const { user } = useAuth();
  const { setProfile } = useUserProfile();
  
  // If we're in the post-registration flow, make sure we clear out any competing
  // redirects by using a layout effect that runs before anything else
  useEffect(() => {
    if (global.__WIZARD_AFTER_REGISTRATION__ === true) {
      console.log('WIZARD: Post-registration flow detected, ensuring we stay on wizard');
      // This makes sure no other redirects will happen during this critical period
      global.__PREVENT_ALL_REDIRECTS__ = true;
      
      // Assicurati che il flag che indica post-registrazione sia impostato
      setIsFromRegistration(true);
      
      // Inizializza i campi se l'utente viene dall'autenticazione Apple
      if (user?.name) {
        setName(user.name);
        updateProfile('name', user.name);
      }
      
      // Imposta un timeout per ripulire i flag anche se l'utente non completa il wizard
      const timeout = setTimeout(() => {
        // Se siamo ancora nel wizard dopo 5 minuti, resetta i flag globali
        // per evitare che l'utente rimanga bloccato
        if (global.__WIZARD_AFTER_REGISTRATION__ === true) {
          console.log('WIZARD: Timeout di sicurezza - pulizia flag dopo 5 minuti');
          global.__WIZARD_AFTER_REGISTRATION__ = false;
          global.__PREVENT_ALL_REDIRECTS__ = false;
          global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
          global.__BLOCK_ALL_SCREENS__ = false;
        }
      }, 5 * 60 * 1000); // 5 minuti
      
      return () => {
        // Clean up when this component unmounts
        global.__PREVENT_ALL_REDIRECTS__ = false;
        clearTimeout(timeout);
        
        // Pulisci il flag di registrazione quando il componente viene smontato
        if (currentStep === WIZARD_STEPS.length - 1) {
          global.__WIZARD_AFTER_REGISTRATION__ = false;
          global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
        }
      };
    }
  }, []);
  
  // Stato per tenere traccia della fase attuale del wizard
  const [currentStep, setCurrentStep] = useState(0);
  
  // Stato per i dati del profilo
  const [profile, setProfileState] = useState({
    name: user?.name || '',
    gender: '',
    weightKg: '',
    age: '',
    height: '',
    drinkingFrequency: '',
    emoji: '',
    color: AVATAR_COLORS[0],
    isDefault: true
  });
  
  // Stato per la selezione emoji
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Riferimento ai parametri dell'URL
  const params = useLocalSearchParams();
  
  // Stati del wizard
  const [emoji, setEmoji] = useState('🥂');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [weightKg, setWeightKg] = useState('70');
  const [heightCm, setHeightCm] = useState('170');
  const [age, setAge] = useState('30');
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [drinkingFrequency, setDrinkingFrequency] = useState('');
  const [isGuest, setIsGuest] = useState(params.guest === 'true');
  // Track if user coming from registration - wizard is mandatory in this case
  const [isFromRegistration, setIsFromRegistration] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [heightError, setHeightError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Reset dello stato del wizard all'inizializzazione
  useEffect(() => {
    try {
      // Rimuoviamo qualsiasi stato memorizzato in cache
      AsyncStorage.removeItem(WIZARD_CACHE_KEY);
      
      // Check if user has completed wizard to determine if it's post-registration
      authService.hasCompletedProfileWizard().then(hasCompleted => {
        // If user is authenticated but hasn't completed wizard, assume coming from registration
        if (user && !hasCompleted) {
          setIsFromRegistration(true);
          console.log('Wizard is showing after registration - mandatory flow');
        } else {
          setIsFromRegistration(false);
        }
      });
      
      // Se l'utente non è ospite e non è autenticato, reindirizza alla pagina di login
      if (!isGuest && !user) {
        // console.log('WIZARD: Utente non autorizzato, reindirizzamento a /auth/login');
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Error resetting wizard state:', error);
    }
  }, [isGuest, user]);

  // Gestione eventi di apertura/chiusura tastiera
  useEffect(() => {
    // Eventi per la tastiera
    const keyboardWillShowSub = Keyboard.addListener(
      'keyboardWillShow',
      (event) => {
        // console.log('WIZARD: Keyboard will show', event);
      }
    );
    
    const keyboardDidShowSub = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        // console.log('WIZARD: Keyboard did show', event);
      }
    );
    
    const keyboardWillHideSub = Keyboard.addListener(
      'keyboardWillHide',
      (event) => {
        // console.log('WIZARD: Keyboard will hide', event);
      }
    );
    
    const keyboardDidHideSub = Keyboard.addListener(
      'keyboardDidHide',
      (event) => {
        // console.log('WIZARD: Keyboard did hide', event);
      }
    );
    
    // console.log('WIZARD: Component mounted, setting up keyboard listeners');
    
    return () => {
      // console.log('WIZARD: Component unmounting, removing keyboard listeners');
      keyboardWillShowSub.remove();
      keyboardDidShowSub.remove();
      keyboardWillHideSub.remove();
      keyboardDidHideSub.remove();
    };
  }, []);
  
  // Funzione per ottenere traduzioni con fallback
  const getTranslation = (key, defaultValue = "") => {
    // Verifica prima la traduzione nella lingua corrente
    const translation = t(key, { ns: 'profile', defaultValue });
    
    // Assicuriamoci di restituire sempre un valore, anche se la traduzione fallisce
    return translation || defaultValue;
  };
  
  // Funzione per andare allo step successivo
  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  // Funzione per tornare allo step precedente
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Funzione per aggiornare i dati del profilo
  const updateProfile = (field, value) => {
    setProfileState(prevProfile => ({
      ...prevProfile,
      [field]: value
    }));
  };
  
  // Gestisce la selezione delle emoji
  const handleEmojiSelected = (emoji) => {
    updateProfile('emoji', emoji);
    setShowEmojiPicker(false);
  };
  
  // Gestisce la selezione del colore
  const handleSelectColor = (color) => {
    updateProfile('color', color);
    setShowColorPicker(false);
  };
  
  // Funzione per completare il wizard e creare il profilo
  const handleComplete = async () => {
    try {
      setLoading(true);
      console.log('WIZARD: Iniziando completamento wizard...');
      
      // Verifica finale sui dati obbligatori
      if (!profile.name || !profile.gender || !profile.weightKg || !profile.age) {
        Alert.alert(
          t('error', { ns: 'common', defaultValue: 'Errore' }),
          t('requiredFields', { ns: 'profile', defaultValue: 'Completa tutti i campi obbligatori' })
        );
        setLoading(false);
        return;
      }
      
      // CRITICAL: Prima di tutto, imposta esplicitamente il flag di completamento wizard
      // Questo assicura che anche se il resto fallisce, il flag sarà già impostato
      try {
        console.log('WIZARD: Impostazione flag completamento wizard...');
        await authService.setProfileWizardCompleted(true);
        console.log('WIZARD: Flag completamento wizard impostato con successo');
      } catch (e) {
        console.error('WIZARD: Errore nell\'impostazione flag completamento wizard:', e);
        // Continuiamo comunque
      }
      
      // CRITICAL: Rimuovi tutti i flag globali che potrebbero causare loop
      if (typeof global !== 'undefined') {
        console.log('WIZARD: Pulizia flag globali...');
        global.__WIZARD_AFTER_REGISTRATION__ = false;
        global.__BLOCK_ALL_SCREENS__ = false;
        global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
        global.__PREVENT_ALL_REDIRECTS__ = false;
        if (global.__WIZARD_START_TIME__) {
          delete global.__WIZARD_START_TIME__;
        }
        console.log('WIZARD: Flag globali rimossi con successo');
      }
      
      // Crea il profilo
      const profileData = {
        ...profile,
        isDefault: isGuest ? true : false,
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        // Converti i tipi per rispettare l'interfaccia UserProfile
        gender: profile.gender as 'male' | 'female',
        weightKg: parseInt(profile.weightKg.toString()),
        age: parseInt(profile.age.toString()),
        height: parseInt(profile.height.toString()),
        drinkingFrequency: profile.drinkingFrequency as 'rarely' | 'occasionally' | 'regularly' | 'frequently'
      };
      
      console.log('WIZARD: Creazione profilo con dati:', JSON.stringify(profileData));
      
      // Gestione speciale per la modalità ospite
      if (isGuest) {
        console.log('WIZARD: Modalità ospite rilevata, assicurandosi che la sessione sia corretta...');
        // Forziamo il passaggio alla modalità ospite per sicurezza
        try {
          await authService.switchToGuestMode();
          console.log('WIZARD: Passaggio alla modalità ospite completato');
        } catch (guestError) {
          console.error('WIZARD: Errore nel passaggio a modalità ospite:', guestError);
          // Continuiamo comunque
        }
      }
      
      // Creazione profilo con gestione errori migliorata
      let createdProfile = null;
      try {
        createdProfile = await profileService.createProfile(profileData);
        if (!createdProfile) {
          throw new Error('profileService.createProfile ha restituito null');
        }
        console.log('WIZARD: Profilo creato con ID:', createdProfile.id);
      } catch (creationError) {
        console.error('WIZARD: Errore durante la creazione del profilo:', creationError);
        throw new Error(`Errore creazione profilo: ${creationError.message}`); // Rilancia l'errore per il catch esterno
      }
      
      // Imposta il profilo come attivo
      try {
        await profileService.setActiveProfile(createdProfile.id);
        console.log('WIZARD: Profilo impostato come attivo');
      } catch (activationError) {
        console.error('WIZARD: Errore durante l\'attivazione del profilo:', activationError);
        // Non blocchiamo, ma registriamo l'errore
      }
      
      // Imposta il profilo nel contesto
      try {
        setProfile(createdProfile);
        console.log('WIZARD: Profilo impostato nel contesto');
      } catch (contextError) {
        console.error('WIZARD: Errore durante l\'impostazione del profilo nel contesto:', contextError);
        // Non blocchiamo, ma registriamo l'errore
      }
      
      console.log('WIZARD: Reindirizzamento alla destinazione finale...');
      
      // Reindirizzamento in base allo stato dell'utente
      if (isGuest || !isFromRegistration) {
        console.log('WIZARD: Reindirizzamento alla dashboard come ospite o dopo modifica profilo');
        router.replace('/dashboard');
      } else {
        // Se viene dalla registrazione, mostra l'offerta premium
        console.log('WIZARD: Reindirizzamento all\'offerta premium dopo registrazione');
        router.replace({
          pathname: '/onboarding/subscription-offer',
          params: { fromWizard: 'true', createdProfile: 'true' }
        });
      }
    } catch (error) {
      console.error('WIZARD: Errore nel completamento wizard:', error);
      let errorMessage = t('errorSavingProfile', { ns: 'profile', defaultValue: 'Errore nel salvare il profilo' });
      
      // Fornisci un messaggio più dettagliato se possibile
      if (error && (error as any).message) {
        errorMessage += `: ${(error as any).message}`;
      }
      
      Alert.alert(
        t('error', { ns: 'common', defaultValue: 'Errore' }),
        errorMessage
      );
      setLoading(false);
      
      // Ensure flags are cleaned even if there's an error
      if (typeof global !== 'undefined') {
        global.__WIZARD_AFTER_REGISTRATION__ = false;
        global.__BLOCK_ALL_SCREENS__ = false;
        global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
        global.__PREVENT_ALL_REDIRECTS__ = false;
      }
    }
  };
  
  // Gestisce l'uscita dal wizard
  const handleExitWizard = () => {
    // If coming from registration, don't allow exit
    if (isFromRegistration) {
      Alert.alert(
        t('wizardMandatory', { ns: 'profile', defaultValue: 'Profile Setup Required' }),
        t('wizardMandatoryExplanation', { ns: 'profile', defaultValue: 'You need to complete your profile setup to continue.' })
      );
      return;
    }
    
    Alert.alert(
      t('exitWizard', { ns: 'profile', defaultValue: 'Exit Wizard?' }),
      t('exitWizardConfirmation', { ns: 'profile', defaultValue: 'Are you sure you want to exit? Your progress will be lost.' }),
      [
        {
          text: t('cancel', { ns: 'common', defaultValue: 'Cancel' }),
          style: 'cancel'
        },
        {
          text: t('exit', { ns: 'common', defaultValue: 'Exit' }),
          style: 'destructive',
          onPress: () => {
            // Clear any navigation flags
            if (typeof global !== 'undefined') {
              clearAllNavigationBlocks();
            }
            
            // Try to determine the best destination
            const isGuest = params.guest === 'true';
            
            if (isGuest) {
              // If l'utente è ospite, torna alla login
              router.replace('/auth/login');
            } else {
              // Altrimenti, prova prima a tornare indietro, e se non è possibile vai alla dashboard
              try {
                router.back();
              } catch (error) {
                console.log('Errore nel tornare indietro, reindirizzamento alla dashboard');
                router.replace('/dashboard');
              }
            }
          }
        }
      ]
    );
  };

  // Ripristino la funzione canProceed
  const canProceed = () => {
    // Nella schermata di benvenuto, possiamo sempre procedere
    if (WIZARD_STEPS[currentStep] === 'welcome') {
      return true;
    }
    
    // Nella schermata del nome, verifichiamo che il nome sia valido
    if (WIZARD_STEPS[currentStep] === 'name') {
      return profile.name && profile.name.trim().length > 0;
    }
    
    // Nella schermata del genere, verifichiamo che il genere sia selezionato
    if (WIZARD_STEPS[currentStep] === 'gender') {
      return !!profile.gender;
    }
    
    // Nella schermata del peso, verifichiamo che il peso sia valido
    if (WIZARD_STEPS[currentStep] === 'weight') {
      return !!profile.weightKg;
    }
    
    // Nella schermata dell'età, verifichiamo che l'età sia valida
    if (WIZARD_STEPS[currentStep] === 'age') {
      return !!profile.age;
    }
    
    // Nella schermata dell'altezza, verifichiamo che l'altezza sia valida
    if (WIZARD_STEPS[currentStep] === 'height') {
      return !!profile.height && !heightError;
    }
    
    // Nella schermata della frequenza di consumo, verifichiamo che sia selezionata
    if (WIZARD_STEPS[currentStep] === 'drinkingHabits') {
      return !!profile.drinkingFrequency;
    }
    
    // Nelle altre schermate, possiamo sempre procedere
    return true;
  };

  // Renderizza il pulsante di proseguimento giusto per ogni step
  const renderNextButton = () => {
    // Se siamo alla schermata completato, non mostrare nessun pulsante qui 
    // (il pulsante Dashboard è incorporato nella schermata)
    if (currentStep === WIZARD_STEPS.indexOf('complete')) {
      return null;
    }
    
    // Per tutti gli altri step, mostra il pulsante "Continua"
    return (
      <TouchableOpacity 
        style={[
          styles.nextButton, 
          { 
            backgroundColor: canProceed() ? colors.primary : '#cccccc',
            opacity: canProceed() ? 1 : 0.5
          }
        ]} 
        onPress={nextStep}
        disabled={!canProceed()}
      >
        <Text style={styles.nextButtonText}>
          {t('continue', { ns: 'common', defaultValue: 'Continua' })}
        </Text>
        <Ionicons 
          name="arrow-forward" 
          size={18} 
          color="white" 
          style={styles.nextButtonIcon} 
        />
      </TouchableOpacity>
    );
  };
  
  // Correggo il renderStepContent per renderizzare il contenuto correttamente
  const renderStepContent = () => {
    // Impedisci lo scrolling verticale nelle pagine del wizard
    const scrollEnabled = false;
    
    let content;
    
    // Logica per determinare il contenuto in base allo step corrente
    switch (WIZARD_STEPS[currentStep]) {
      case 'welcome':
        content = renderWelcomeStep();
        break;
      case 'name':
        content = (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {getTranslation('nameStepTitle', 'Come ti chiami?')}
            </Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {getTranslation('nameStepDescription', 'Inserisci il tuo nome o un nickname che vuoi usare nell\'app')}
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholderTextColor={colors.textSecondary}
              placeholder={getTranslation('namePlaceholder', 'Es. Mario')}
              value={profile.name}
              onChangeText={(text) => updateProfile('name', text)}
              maxLength={20}
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => canProceed() && nextStep()}
            />
          </View>
        );
        break;
      case 'gender':
        content = (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {getTranslation('genderStepTitle', 'Qual è il tuo genere?')}
            </Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {getTranslation('genderStepDescription', 'Questa informazione è necessaria per il corretto calcolo del tuo tasso alcolemico')}
            </Text>
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  { 
                    borderColor: profile.gender === 'male' ? colors.primary : colors.border,
                    backgroundColor: profile.gender === 'male' ? `${colors.primary}20` : 'transparent'
                  }
                ]}
                onPress={() => updateProfile('gender', 'male')}
              >
                <Ionicons name="male" size={32} color={profile.gender === 'male' ? colors.primary : colors.textSecondary} />
                <Text style={[
                  styles.optionText, 
                  { 
                    color: profile.gender === 'male' ? colors.primary : colors.textSecondary,
                    fontWeight: profile.gender === 'male' ? 'bold' : 'normal'
                  }
                ]}>
                  {getTranslation('male', 'Uomo')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  { 
                    borderColor: profile.gender === 'female' ? colors.primary : colors.border,
                    backgroundColor: profile.gender === 'female' ? `${colors.primary}20` : 'transparent'
                  }
                ]}
                onPress={() => updateProfile('gender', 'female')}
              >
                <Ionicons name="female" size={32} color={profile.gender === 'female' ? colors.primary : colors.textSecondary} />
                <Text style={[
                  styles.optionText, 
                  { 
                    color: profile.gender === 'female' ? colors.primary : colors.textSecondary,
                    fontWeight: profile.gender === 'female' ? 'bold' : 'normal'
                  }
                ]}>
                  {getTranslation('female', 'Donna')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
        break;
      case 'weight':
        content = (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {getTranslation('weightStepTitle', 'Quanto pesi?')}
            </Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {getTranslation('weightStepDescription', 'Il tuo peso è essenziale per il calcolo accurato del tasso alcolemico')}
            </Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.text }]}
                placeholderTextColor={colors.textSecondary}
                placeholder={getTranslation('weightPlaceholder', 'Es. 70')}
                value={profile.weightKg?.toString() || ''}
                onChangeText={(text) => {
                  const numValue = text.replace(/[^0-9]/g, '');
                  updateProfile('weightKg', numValue ? parseInt(numValue) : '');
                }}
                keyboardType="numeric"
                maxLength={3}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => canProceed() && nextStep()}
              />
              <Text style={[styles.unitText, { color: colors.textSecondary }]}>kg</Text>
            </View>
          </View>
        );
        break;
      case 'age':
        content = (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {getTranslation('ageStepTitle', 'Quanti anni hai?')}
            </Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {getTranslation('ageStepDescription', 'La tua età influenza la tolleranza all\'alcol')}
            </Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.text }]}
                placeholderTextColor={colors.textSecondary}
                placeholder={getTranslation('agePlaceholder', 'Es. 25')}
                value={profile.age?.toString() || ''}
                onChangeText={(text) => {
                  const numValue = text.replace(/[^0-9]/g, '');
                  updateProfile('age', numValue ? parseInt(numValue) : '');
                }}
                keyboardType="numeric"
                maxLength={3}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => canProceed() && nextStep()}
              />
              <Text style={[styles.unitText, { color: colors.textSecondary }]}>anni</Text>
            </View>
          </View>
        );
        break;
      case 'height':
        content = (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {getTranslation('heightStepTitle', 'Quanto sei alto/a?')}
            </Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {getTranslation('heightStepDescription', 'La tua altezza aiuta a calcolare meglio il tasso alcolemico')}
            </Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={[styles.input, { flex: 1, borderColor: heightError ? colors.error : colors.border, color: colors.text }]}
                placeholderTextColor={colors.textSecondary}
                placeholder={getTranslation('heightPlaceholder', 'Es. 175')}
                value={profile.height?.toString() || ''}
                onChangeText={(text) => {
                  const numValue = text.replace(/[^0-9]/g, '');
                  const height = numValue ? parseInt(numValue) : '';
                  
                  // Validazione: altezza deve essere tra 100 e 250 cm
                  setHeightError(height && (height < 100 || height > 250) ? "Altezza non valida" : "");
                  
                  updateProfile('height', height);
                }}
                keyboardType="numeric"
                maxLength={3}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => canProceed() && nextStep()}
              />
              <Text style={[styles.unitText, { color: colors.textSecondary }]}>cm</Text>
            </View>
            {heightError && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {getTranslation('heightError', 'L\'altezza deve essere compresa tra 100 e 250 cm')}
              </Text>
            )}
          </View>
        );
        break;
      case 'drinkingHabits':
        content = (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {getTranslation('drinkingHabitsStepTitle', 'Come bevi?')}
            </Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {getTranslation('drinkingHabitsStepDescription', 'Questa informazione è necessaria per il corretto calcolo del tasso alcolemico')}
            </Text>
            
            <View style={styles.optionsContainer}>
              {[
                { id: 'rarely', description: 'Raramente (qualche volta all\'anno)' },
                { id: 'occasionally', description: 'Occasionalmente (1-2 volte al mese)' },
                { id: 'regularly', description: 'Regolarmente (1 volta a settimana)' },
                { id: 'frequently', description: 'Frequentemente (più volte a settimana)' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionButton,
                    { 
                      borderColor: profile.drinkingFrequency === option.id ? colors.primary : colors.border,
                      backgroundColor: profile.drinkingFrequency === option.id ? `${colors.primary}20` : 'transparent'
                    }
                  ]}
                  onPress={() => updateProfile('drinkingFrequency', option.id)}
                >
                  <View style={styles.optionContent}>
                    <Text 
                      style={[
                        styles.optionText, 
                        { 
                          color: profile.drinkingFrequency === option.id ? colors.primary : colors.text,
                          fontWeight: profile.drinkingFrequency === option.id ? 'bold' : 'normal',
                        }
                      ]}
                    >
                      {t(option.id)}
                    </Text>
                    <Text 
                      style={[
                        styles.optionDescription, 
                        { 
                          color: profile.drinkingFrequency === option.id ? colors.primary : colors.textSecondary,
                        }
                      ]}
                    >
                      {option.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
        break;
      case 'emoji':
        content = (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {getTranslation('emojiStepTitle', 'Scegli un emoji per il tuo profilo')}
            </Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {getTranslation('emojiStepDescription', 'Questo è un dettaglio personale e non è obbligatorio')}
            </Text>
            
            {/* Anteprima dell'emoji selezionata */}
            <View style={[styles.emojiPreviewContainer, { backgroundColor: profile.color || colors.primary }]}>
              {profile.emoji ? (
                <Text style={styles.emojiPreview}>{profile.emoji}</Text>
              ) : (
                <Text style={styles.profileInitial}>{profile.name ? profile.name.charAt(0).toUpperCase() : '?'}</Text>
              )}
            </View>
            
            {/* Layout orizzontale per le opzioni */}
            <View style={styles.customizationRow}>
              {/* Opzione: Seleziona emoji */}
              <View style={styles.customizationItem}>
                <TouchableOpacity
                  style={[
                    styles.customizationButton,
                    { 
                      backgroundColor: colors.cardElevated,
                      borderColor: colors.border,
                    }
                  ]}
                  onPress={() => setShowEmojiPicker(true)}
                >
                  <Ionicons name="happy-outline" size={40} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.customizationLabel, { color: colors.text }]}>
                  {t('selectEmoji', { ns: 'profile', defaultValue: 'Seleziona Emoji' })}
                </Text>
              </View>
              
              {/* Opzione: Seleziona colore */}
              <View style={styles.customizationItem}>
                <TouchableOpacity
                  style={[
                    styles.customizationButton,
                    { 
                      backgroundColor: colors.cardElevated,
                      borderColor: colors.border,
                    }
                  ]}
                  onPress={() => setShowColorPicker(true)}
                >
                  <Ionicons name="color-palette-outline" size={40} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.customizationLabel, { color: colors.text }]}>
                  {t('selectColor', { ns: 'profile', defaultValue: 'Seleziona Colore' })}
                </Text>
              </View>
            </View>
              
            {/* Rimuovi emoji - se presente */}
            {profile.emoji && (
              <TouchableOpacity
                style={[
                  styles.removeEmojiButton,
                  { 
                    backgroundColor: colors.cardElevated,
                    borderColor: colors.border,
                    marginTop: 20
                  }
                ]}
                onPress={() => updateProfile('emoji', '')}
              >
                <Ionicons name="close-circle-outline" size={24} color={colors.error} />
                <Text 
                  style={[
                    styles.removeEmojiText, 
                    { color: colors.text, marginLeft: 8 }
                  ]}
                >
                  {t('removeEmoji', { ns: 'profile', defaultValue: 'Rimuovi Emoji' })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
        break;
      case 'complete':
        content = (
          <View style={styles.stepContent}>
            <View style={styles.welcomeIconContainer}>
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
            </View>
            <Text style={[styles.completeTitle, { color: colors.text, fontSize: SIZES.large }]}>
              {t('allSet', { ns: 'profile', defaultValue: 'Profilo completato!' })}
            </Text>
            <Text style={[styles.completeText, { color: colors.textSecondary }]}>
              {t('profileCreated', { ns: 'profile', defaultValue: 'Il tuo profilo è stato creato con successo.' })}
            </Text>
            <View style={styles.profileSummary}>
              <View style={[styles.summaryCard, { 
                backgroundColor: colors.cardElevated, 
                borderLeftWidth: 4,
                borderLeftColor: colors.primary,
              }]}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {t('name', { ns: 'profile', defaultValue: 'Nome' })}
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
                    {t('gender', { ns: 'profile', defaultValue: 'Genere' })}
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.text, fontSize: SIZES.subtitle }]}>
                    {t(profile.gender, { ns: 'profile', defaultValue: profile.gender === 'male' ? 'Uomo' : 'Donna' })}
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
                    {t('weight', { ns: 'profile', defaultValue: 'Peso' })}
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
                  {t('drinkingFrequency', { ns: 'profile', defaultValue: 'Frequenza di consumo' })}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text, fontSize: SIZES.subtitle }]}>
                  {t(profile.drinkingFrequency, { ns: 'profile', defaultValue: profile.drinkingFrequency })}
                </Text>
              </View>
            </View>
            
            {/* Opzione per impostare il profilo come predefinito */}
            <TouchableOpacity 
              style={[styles.defaultProfileOption, { 
                backgroundColor: colors.cardElevated,
                borderColor: colors.border,
                marginTop: 16,
              }]}
              onPress={() => updateProfile('isDefault', !profile.isDefault)}
            >
              <View style={styles.defaultProfileContent}>
                <Text style={[styles.defaultProfileText, { color: colors.text }]}>
                  {t('setAsDefaultProfile', { ns: 'profile', defaultValue: 'Imposta come profilo predefinito' })}
                </Text>
                <Text style={[styles.defaultProfileDescription, { color: colors.textSecondary }]}>
                  {t('defaultProfileDescription', { ns: 'profile', defaultValue: 'Questo profilo sarà selezionato automaticamente quando accedi' })}
                </Text>
              </View>
              <Ionicons 
                name={profile.isDefault ? "checkbox" : "square-outline"} 
                size={24} 
                color={profile.isDefault ? colors.primary : colors.textSecondary} 
              />
            </TouchableOpacity>
            
            {/* Pulsante "Vai alla dashboard" nella schermata finale */}
            <TouchableOpacity
              style={[
                styles.dashboardButton,
                {
                  backgroundColor: colors.primary,
                  marginTop: 30,
                  marginBottom: 20,
                }
              ]}
              onPress={handleComplete}
            >
              <Text style={[styles.dashboardButtonText, { color: '#fff' }]}>
                {t('goToDashboard', { ns: 'profile', defaultValue: 'Vai alla dashboard' })}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        );
        break;
      default:
        content = (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {t('unexpectedStep', { ns: 'profile', defaultValue: 'Unexpected step' })}
            </Text>
          </View>
        );
    }
    
    return content;
  };
  
  // Calcola la percentuale di progresso
  const progressPercentage = (currentStep / (WIZARD_STEPS.length - 1)) * 100;
  
  // Render del contenuto dello step welcome
  const renderWelcomeStep = () => {
    return (
      <View style={styles.stepContent}>
        <View style={styles.welcomeIconContainer}>
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
        </View>
        <Text style={[styles.welcomeTitle, { color: colors.text }]}>
          {t('welcomeToAlcolTest', { ns: 'profile', defaultValue: 'Benvenuto in Bacchus' })}
        </Text>
        <Text style={[styles.welcomeDescription, { color: colors.textSecondary }]}>
          {t('welcomeDescription', { 
            ns: 'profile', 
            defaultValue: 'Prima di iniziare, abbiamo bisogno di alcune informazioni per fornirti un\'esperienza personalizzata e calcolare con precisione il tuo tasso alcolemico.' 
          })}
        </Text>
      </View>
    );
  };
  
  // Aggiungi questa funzione per ottenere il titolo dello step corrente
  const getWizardStepTitle = () => {
    switch (WIZARD_STEPS[currentStep]) {
      case 'welcome':
        return t('welcome', { ns: 'profile', defaultValue: 'Benvenuto' });
      case 'name':
        return t('yourName', { ns: 'profile', defaultValue: 'Il tuo nome' });
      case 'gender':
        return t('yourGender', { ns: 'profile', defaultValue: 'Il tuo genere' });
      case 'weight':
        return t('yourWeight', { ns: 'profile', defaultValue: 'Il tuo peso' });
      case 'age':
        return t('yourAge', { ns: 'profile', defaultValue: 'La tua età' });
      case 'height':
        return t('yourHeight', { ns: 'profile', defaultValue: 'La tua altezza' });
      case 'drinkingHabits':
        return t('drinkingHabits', { ns: 'profile', defaultValue: 'Abitudini di consumo' });
      case 'emoji':
        return t('profileEmoji', { ns: 'profile', defaultValue: 'Avatar del profilo' });
      case 'complete':
        return t('complete', { ns: 'common', defaultValue: 'Completato' });
      default:
        return '';
    }
  };

  // Aggiungi questa funzione per ottenere il testo del pulsante next
  const getNextButtonText = () => {
    // Se siamo alla fase di emoji, mostra "Completa"
    if (currentStep === WIZARD_STEPS.indexOf('emoji')) {
      return t('complete', { ns: 'common', defaultValue: 'Completa' });
    }
    
    // Se siamo alla schermata completato, mostra "Vai alla dashboard"
    if (currentStep === WIZARD_STEPS.indexOf('complete')) {
      return t('goToDashboard', { ns: 'profile', defaultValue: 'Vai alla dashboard' });
    }
    
    // Per tutti gli altri step, mostra "Continua"
    return t('continue', { ns: 'common', defaultValue: 'Continua' });
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.COLORS.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={currentTheme.COLORS.background} />
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 80}
        >
          <View style={styles.contentContainer}>
            {/* Header - Mostra sempre */}
            <View style={[styles.headerContainer]}>
              <View style={{ width: 40 }} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {getWizardStepTitle()}
              </Text>
              {!isFromRegistration && (
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: colors.cardElevated }]}
                  onPress={handleExitWizard}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              {isFromRegistration && <View style={{ width: 40 }} />}
            </View>
            
            {/* Progress Indicator - pallini sotto il titolo */}
            <View style={[styles.progressContainer, { marginBottom: 10 }]}>
              {WIZARD_STEPS.map((step, index) => (
                <View
                  key={step}
                  style={[
                    styles.progressDot,
                    { backgroundColor: index <= currentStep ? currentTheme.COLORS.primary : currentTheme.COLORS.border }
                  ]}
                />
              ))}
            </View>

            {/* Step Content */}
            <View 
              style={[styles.stepContentContainer, { flex: 1 }]}
            >
              {renderStepContent()}
            </View>

            {/* Pulsanti di navigazione - non mostrare nella pagina finale */}
            {currentStep !== WIZARD_STEPS.indexOf('complete') && (
              <View 
                style={[
                  styles.navigationContainer, 
                  { 
                    borderTopColor: currentTheme.COLORS.border,
                    backgroundColor: currentTheme.COLORS.background,
                    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
                    marginTop: 'auto'
                  }
                ]}
              >
                {/* Back Button */}
                {currentStep > 0 && (
                  <TouchableOpacity 
                    style={[
                      styles.backButton, 
                      { 
                        backgroundColor: currentTheme.COLORS.background,
                        borderColor: currentTheme.COLORS.border
                      }
                    ]} 
                    onPress={prevStep}
                  >
                    <Text style={[styles.backButtonText, { color: currentTheme.COLORS.text }]}>
                      {t('back', { ns: 'common', defaultValue: 'Indietro' })}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Next Button */}
                <TouchableOpacity 
                  style={[
                    styles.nextButton, 
                    { 
                      backgroundColor: canProceed() ? currentTheme.COLORS.primary : '#cccccc',
                      opacity: canProceed() ? 1 : 0.5,
                      marginLeft: currentStep === 0 ? 'auto' : 0 // Auto margin left solo nella prima schermata
                    }
                  ]} 
                  onPress={currentStep === WIZARD_STEPS.indexOf('emoji') ? handleComplete : nextStep}
                  disabled={!canProceed()}
                >
                  <Text style={styles.nextButtonText}>
                    {getNextButtonText()}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
      
      {/* Modal per la selezione emoji */}
      <EmojiPickerModal
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={handleEmojiSelected}
        currentEmoji={profile.emoji}
      />
      
      {/* Modal per la selezione colore */}
      <ColorPickerModal
        visible={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        onSelect={handleSelectColor}
        currentColor={profile.color}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeHeaderContainer: {
    width: '100%',
    zIndex: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(200, 200, 200, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  mainContentContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  stepContentContainer: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    width: '100%',
    paddingHorizontal: SIZES.marginLarge,
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  stepIndicatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  welcomeIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  welcomeIcon: {
    marginBottom: SIZES.marginSmall,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeDescription: {
    fontSize: SIZES.body,
    textAlign: 'center',
    marginHorizontal: SIZES.padding,
  },
  stepTitle: {
    fontSize: SIZES.title,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  stepDescription: {
    fontSize: SIZES.body,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    marginTop: 8,
  },
  input: {
    width: '100%',
    height: 52,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.padding,
    fontSize: SIZES.large,
    marginTop: SIZES.marginSmall,
    borderWidth: 1,
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
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  weightInput: {
    width: 140,
    height: 65,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.padding,
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  weightUnit: {
    fontSize: SIZES.title,
    marginLeft: SIZES.margin,
    fontWeight: '500',
  },
  keyboardHelp: {
    marginTop: 15,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  optionsContainer: {
    width: '100%',
    marginTop: SIZES.marginLarge,
  },
  optionButton: {
    width: '100%',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.marginSmall,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: "#000",
    shadowOffset: {
      width: 0, 
      height: 2
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  optionContent: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: SIZES.body,
    fontWeight: '500',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: SIZES.small,
    textAlign: 'center',
  },
  imageOptionsContainer: {
    width: '100%',
    marginTop: SIZES.marginLarge,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageOptionButton: {
    width: '48%',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.marginSmall,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    height: 120,
    marginHorizontal: '1%',
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 5,
  },
  emojiPickerContainer: {
    flex: 1,
    width: '100%',
  },
  emojiPreviewContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
    marginBottom: SIZES.marginLarge,
    alignSelf: 'center',
  },
  emojiOptionsContainer: {
    width: '100%',
    marginTop: SIZES.marginLarge,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiOptionButton: {
    width: '48%',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.marginSmall,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    height: 120,
    marginHorizontal: '1%',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  profileInitial: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  emojiPreview: {
    fontSize: 50,
    textAlign: 'center',
  },
  defaultProfileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    marginHorizontal: SIZES.padding,
  },
  defaultProfileContent: {
    flex: 1,
    marginRight: 16,
  },
  defaultProfileText: {
    fontSize: SIZES.body,
    fontWeight: '500',
    marginBottom: 4,
  },
  defaultProfileDescription: {
    fontSize: SIZES.small,
  },
  errorText: {
    fontSize: SIZES.body,
    textAlign: 'center',
  },
  backButton: {
    width: 150,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  nextButton: {
    width: 150,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  nextButtonIcon: {
    marginLeft: 2,
    marginTop: 1,
  },
  inputWithUnit: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  unitText: {
    fontSize: SIZES.large,
    marginLeft: SIZES.margin,
    fontWeight: '500',
  },
  wizardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4
  },
  dashboardButton: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    alignSelf: 'center',
    width: '100%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  dashboardButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  customizationContainer: {
    marginTop: SIZES.margin,
  },
  customizationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  customizationItem: {
    alignItems: 'center',
    width: '45%',  // Ridotto per lasciare spazio tra gli elementi
  },
  customizationLabel: {
    fontSize: SIZES.body,
    marginBottom: SIZES.marginSmall,
    textAlign: 'center',
  },
  emojiButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
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
  emojiButtonText: {
    fontSize: 30,
  },
  colorButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
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
  customizationButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 10,
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
  removeEmojiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    alignSelf: 'center',
  },
  removeEmojiText: {
    fontSize: SIZES.body,
    fontWeight: '500',
  },
}); 