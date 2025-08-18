import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Image,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  Easing,
  Dimensions,
  ScrollView,
  BackHandler,
  Clipboard,
  Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import EmojiSelector from 'react-native-emoji-selector';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../lib/supabase/client';
import { USER_DATA_KEY } from '../lib/services/auth.service';
import { logError, logInfo } from '../lib/services/logging.service';
import { useAuth } from '../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

// Dimensioni dello schermo
const { width, height } = Dimensions.get('window');

// Colore di sfondo identico alla schermata di splash
const BACKGROUND_COLOR = '#0c2348';

// Definizione degli step del wizard
const STEPS = [
  {
    id: 'welcome',
    title: 'Benvenuto in Bacchus',
    subtitle: 'Configura il tuo profilo per iniziare a monitorare il tuo consumo di alcol',
    icon: 'wine-outline'
  },
  {
    id: 'name',
    title: 'Come ti chiami?',
    subtitle: 'Inserisci il tuo nome o un nickname che vuoi usare nell\'app',
    icon: 'person-outline'
  },
  {
    id: 'gender',
    title: 'Qual è il tuo genere?',
    subtitle: 'Questa informazione è necessaria per il corretto calcolo del tuo tasso alcolemico',
    icon: 'people-outline'
  },
  {
    id: 'age',
    title: 'Quanti anni hai?',
    subtitle: 'L\'età è un fattore importante nel calcolo del tasso alcolemico',
    icon: 'calendar-outline'
  },
  {
    id: 'weight',
    title: 'Qual è il tuo peso?',
    subtitle: 'Il peso influisce sul calcolo del tasso alcolemico',
    icon: 'fitness-outline'
  },
  {
    id: 'height',
    title: 'Qual è la tua altezza?',
    subtitle: 'L\'altezza è un fattore che può influenzare il calcolo',
    icon: 'resize-outline'
  },
  {
    id: 'drinking',
    title: 'Come bevi?',
    subtitle: 'Questa informazione è necessaria per il corretto calcolo del tasso alcolemico',
    icon: 'wine-outline'
  },
  {
    id: 'appearance',
    title: 'Personalizza il tuo profilo',
    subtitle: 'Scegli un colore e un\'emoji per rendere unico il tuo profilo',
    icon: 'color-palette-outline'
  }
];

// Emoji predefinite per il profilo (ma l'utente può scegliere qualsiasi emoji)
const PROFILE_EMOJIS = [
  '🍷', '🥂', '🍻', '🍺', '🥃', '🍸', 
  '🍹', '🍾', '🥤', '🍺', '🍻', '🥂',
  '😊', '😎', '🤓', '🥳', '🤗', '😍',
  '🍇', '🍒', '🍊', '🍋', '🍎', '🍐'
];

// Colori predefiniti per il profilo
const PROFILE_COLORS = [
  '#FF5252', '#FF4081', '#E040FB', '#7C4DFF', 
  '#536DFE', '#448AFF', '#40C4FF', '#18FFFF', 
  '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41',
  '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'
];

export default function ProfileWizardScreen() {
  // Stato del wizard
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [animationsStarted, setAnimationsStarted] = useState(false);
  
  // AuthContext per refresh dopo wizard
  const { refreshProfiles } = useAuth();
  
  // Verifica se stiamo arrivando dalla registrazione
  useEffect(() => {
    console.log('🧙‍♂️ WIZARD: Inizializzazione wizard...');
    console.log('🧙‍♂️ WIZARD: Inizializzazione senza flag globali');
    console.log('[WIZARD] ✅ Nessun flag globale necessario');
    
    // Cleanup del flag quando il componente viene smontato
    return () => {
      console.log('[WIZARD] Cleanup componente - rimuovo flag solo se completato');
      // NON rimuovere i flag qui - li rimuoviamo solo dopo completamento in handleComplete
    };
  }, []);

  // 🚫 BLOCCO TOTALE SWIPE E NAVIGAZIONE - RICHIESTA UTENTE CRITICA
  useFocusEffect(
    React.useCallback(() => {
      console.log('[WIZARD] 🚫 ATTIVAZIONE BLOCCO TOTALE NAVIGAZIONE');
      
      // 🚫 BLOCCO 1: Android Back Button
      const backAction = () => {
        console.log('[WIZARD] 🚫 Back button bloccato');
        Alert.alert(
          '🚫 Navigazione bloccata',
          'Devi completare il wizard per continuare.\n\nNon puoi tornare indietro durante la configurazione.',
          [{ text: 'Ho capito', style: 'default' }]
        );
        return true; // BLOCCA SEMPRE
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

      // 🚫 BLOCCO 2: Non più necessario con NavigationHandler semplificato
      console.log('[WIZARD] 🚫 Navigazione protetta dal path onboarding');

      // 🚫 BLOCCO 3: Intercetta router se possibile
      try {
        const originalReplace = router.replace;
        const originalBack = router.back;
        const originalPush = router.push;
        
        router.back = () => {
          console.log('[WIZARD] 🚫 router.back() BLOCCATO');
          Alert.alert('🚫 Navigazione bloccata', 'Completa il wizard per continuare');
        };
        
        router.replace = (href) => {
          // Converti href in stringa per il controllo
          const hrefStr = typeof href === 'string' ? href : href?.pathname || '';
          
          // Permetti solo navigazione verso dashboard, login o auth
          if (hrefStr.includes('dashboard') || hrefStr.includes('login') || hrefStr.includes('auth')) {
            console.log('[WIZARD] ✅ Navigazione permessa:', hrefStr);
            originalReplace(href);
          } else {
            console.log('[WIZARD] 🚫 router.replace() BLOCCATO:', hrefStr);
            Alert.alert('🚫 Navigazione bloccata', 'Completa il wizard per continuare');
          }
        };
        
        router.push = (href) => {
          // Converti href in stringa per il controllo
          const hrefStr = typeof href === 'string' ? href : href?.pathname || '';
          
          // Blocca tutto tranne alcune eccezioni
          if (hrefStr.includes('dashboard') || hrefStr.includes('login') || hrefStr.includes('auth')) {
            console.log('[WIZARD] ✅ Push permesso:', hrefStr);
            originalPush(href);
          } else {
            console.log('[WIZARD] 🚫 router.push() BLOCCATO:', hrefStr);
            Alert.alert('🚫 Navigazione bloccata', 'Completa il wizard per continuare');
          }
        };
        
        // Cleanup
        return () => {
          console.log('[WIZARD] 🧹 Rimozione protezioni navigazione');
          backHandler.remove();
          
      if (typeof global !== 'undefined') {
            global.__WIZARD_ACTIVE__ = false;
            global.__BLOCK_ALL_NAVIGATION__ = false;
            // Non pulire __WIZARD_AFTER_REGISTRATION__ qui, lo fa handleComplete
          }
          
          router.back = originalBack;
          router.replace = originalReplace;
          router.push = originalPush;
        };
        
      } catch (routerError) {
        console.log('[WIZARD] ⚠️ Errore intercettazione router:', routerError);
        
        // Cleanup base se intercettazione fallisce
        return () => {
          backHandler.remove();
          if (typeof global !== 'undefined') {
            global.__WIZARD_ACTIVE__ = false;
            global.__BLOCK_ALL_NAVIGATION__ = false;
          }
        };
      }
    }, [])
  );
  
  // Dati del profilo
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [drinkingFrequency, setDrinkingFrequency] = useState('');
  const [emoji, setEmoji] = useState('🍷');
  const [color, setColor] = useState('#FF5252'); // Stesso default di Modifica Profilo
  
  // Stati per i pannelli modali
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  
  // Animazioni
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Riferimenti per i campi di input
  const nameInputRef = useRef(null);
  const ageInputRef = useRef(null);
  const weightInputRef = useRef(null);
  const heightInputRef = useRef(null);

  // Avvia le animazioni quando il componente è montato
  useEffect(() => {
    if (animationsStarted) return;
    setAnimationsStarted(true);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      })
    ]).start();
  }, []);
  
  // Aggiorna la barra di progresso quando cambia lo step
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStep + 1) / STEPS.length,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.out(Easing.ease)
    }).start();
  }, [currentStep]);

  // ⌨️ AUTO-FOCUS: Apri automaticamente la tastiera per campi di testo
  useEffect(() => {
    const step = STEPS[currentStep];
    
    // Delay per permettere al rendering di completarsi
    const focusTimeout = setTimeout(() => {
      switch (step.id) {
        case 'name':
          nameInputRef.current?.focus();
          break;
        case 'age':
          ageInputRef.current?.focus();
          break;
        case 'weight':
          weightInputRef.current?.focus();
          break;
        case 'height':
          heightInputRef.current?.focus();
          break;
        // Gli altri step non hanno campi di testo da focus
        default:
          break;
      }
    }, 400); // Aspetta l'animazione del cambio step

    return () => clearTimeout(focusTimeout);
  }, [currentStep]);

  // 🚀 AUTO-AVANZAMENTO GENERE - FIX DOPPIO CLICK
  useEffect(() => {
    if (currentStep === 2 && gender && (gender === 'male' || gender === 'female')) {
      console.log('[WIZARD] 🚀 Auto-avanzamento genere:', gender);
      const autoAdvanceDelay = setTimeout(() => {
        handleNext();
      }, 400);
      
      return () => clearTimeout(autoAdvanceDelay);
    }
  }, [gender, currentStep]);

  // 🚀 AUTO-AVANZAMENTO FREQUENZA ALCOL
  useEffect(() => {
    if (currentStep === 6 && drinkingFrequency) {
      console.log('[WIZARD] 🚀 Auto-avanzamento frequenza:', drinkingFrequency);
      const autoAdvanceDelay = setTimeout(() => {
        handleNext();
      }, 400);
      
      return () => clearTimeout(autoAdvanceDelay);
    }
  }, [drinkingFrequency, currentStep]);

  // Animazione per il cambio step
  const animateStepChange = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 30,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      callback();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
    });
  };

  const handleNext = () => {
    // Validazione per ogni step - INDICI CORRETTI (step 0 è intro, no validazione)
    if (currentStep === 1 && !name.trim()) {
      Alert.alert('Errore', 'Inserisci il tuo nome');
      return;
    }
    if (currentStep === 2 && !gender) {
      Alert.alert('Errore', 'Seleziona il tuo genere');
      return;
    }
    if (currentStep === 3) {
      const ageNum = parseInt(age);
      if (!age || isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
        Alert.alert('Errore', 'Inserisci un\'età valida (18-100 anni)');
        return;
      }
    }
    if (currentStep === 4) {
      const weightNum = parseFloat(weight);
      if (!weight || isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
        Alert.alert('Errore', 'Inserisci un peso valido (30-300 kg)');
        return;
      }
    }
    if (currentStep === 5) {
      const heightNum = parseInt(height);
      if (!height || isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
        Alert.alert('Errore', 'Inserisci un\'altezza valida (100-250 cm)');
        return;
      }
    }

    if (currentStep < STEPS.length - 1) {
      animateStepChange(() => {
      setCurrentStep(currentStep + 1);
      });
    } else {
      handleComplete();
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      animateStepChange(() => {
      setCurrentStep(currentStep - 1);
      });
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);

    try {
      console.log('🚀 === WIZARD SEMPLIFICATO - INIZIO ===');

      // 🔐 VERIFICA AUTENTICAZIONE SEMPLICE
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      if (!userData) {
        throw new Error('Utente non autenticato');
      }

      const user = JSON.parse(userData);
      if (!user?.id) {
        throw new Error('ID utente mancante');
      }

      // ✅ VALIDAZIONE VELOCE
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error('Inserisci un nome valido');
      if (!gender) throw new Error('Seleziona il tuo genere');
      if (!drinkingFrequency) throw new Error('Seleziona la frequenza con cui bevi');

      const weightValue = parseFloat(weight);
      const ageValue = parseInt(age);
      const heightValue = parseInt(height);
      
      if (isNaN(weightValue) || weightValue < 30 || weightValue > 300) {
        throw new Error('Peso non valido');
      }
      if (isNaN(ageValue) || ageValue < 18 || ageValue > 120) {
        throw new Error('Età non valida');
      }
      if (isNaN(heightValue) || heightValue < 100 || heightValue > 250) {
        throw new Error('Altezza non valida');
      }

      // 📊 DATI PROFILO
      console.log('🎯 WIZARD DEBUG: Valori attuali stati emoji/color:', { emoji, color });
      
      const profileData = {
        id: uuidv4(),
        user_id: user.id,
        name: trimmedName,
        gender: gender,
        age: ageValue,
        weight: weightValue,
        height: heightValue,
        drinking_frequency: drinkingFrequency,
        color: color,          // 🎯 SALVANDO: color
        emoji: emoji,          // 🎯 SALVANDO: emoji
        is_default: true,                    // 🔧 Campo presente nel DB
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('🎯 WIZARD SAVE: Dati FINALI per salvataggio:', {
        emoji: emoji,
        color: color,
        name: trimmedName,
        fullData: profileData
      });

      // 💾 SALVATAGGIO DATABASE con profileService (COME MODIFICA PROFILO)
      let dbSaved = false;
      let savedProfile = null;
      try {
        console.log('🚀 Tentativo salvataggio con profileService...');
        
        // Converto i dati nel formato del profileService
        const profileServiceData = {
          name: trimmedName,
          gender: gender,
          weightKg: weightValue,  // profileService usa weightKg, non weight
          age: ageValue,
          height: heightValue,
          drinkingFrequency: drinkingFrequency,
          emoji: emoji,
          color: color,
          isDefault: true
        };
        
        console.log('🎯 WIZARD profileService data:', profileServiceData);
        
        // Usa createProfile come fa "Modifica Profilo"
        const { createProfile } = require('../lib/services/profile.service');
        savedProfile = await createProfile(profileServiceData, false);

        if (savedProfile) {
          console.log('✅ Database salvato correttamente con profileService');
          dbSaved = true;
        } else {
          console.error('❌ createProfile returned null');
          Alert.alert('Avviso', 'Errore durante il salvataggio del profilo.\n\nContinuo con salvataggio locale...');
        }
      } catch (dbError) {
        console.error('❌ Eccezione profileService:', dbError.message);
        Alert.alert('Avviso', `Eccezione salvataggio: ${dbError.message}\n\nContinuo con salvataggio locale...`);
      }

      // 📱 SALVATAGGIO LOCALE (CRITICO)
      let localSaved = false;
      try {
        console.log('🚀 Salvataggio locale...');
        
        // Se il database è stato salvato con profileService, usa quel profilo
        if (dbSaved && savedProfile) {
          await AsyncStorage.setItem('bacchus_current_profile', JSON.stringify(savedProfile));
        } else {
          // Fallback: usa il formato camelCase per AsyncStorage
          const localProfileData = {
            id: profileData.id,
            userId: user.id,
            name: trimmedName,
            gender: gender,
            age: ageValue,
            weightKg: weightValue,  // AsyncStorage usa camelCase
            height: heightValue,
            drinkingFrequency: drinkingFrequency,
            emoji: emoji,
            color: color,
          isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await AsyncStorage.setItem('bacchus_current_profile', JSON.stringify(localProfileData));
        }
        
        await AsyncStorage.setItem('bacchus_wizard_completed', 'true');
        await AsyncStorage.setItem('bacchus_profiles', JSON.stringify([profileData]));
        console.log('✅ Dati locali salvati correttamente');
        localSaved = true;
      } catch (localError) {
        console.error('❌ ERRORE CRITICO salvataggio locale:', localError.message);
        Alert.alert('ERRORE CRITICO', `Impossibile salvare localmente: ${localError.message}`);
        throw new Error(`Salvataggio locale fallito: ${localError.message}`);
      }

      // ✅ VERIFICA FINALE
      if (!localSaved) {
        throw new Error('Salvataggio locale fallito');
      }

      console.log(`🎉 Salvataggio completato! DB: ${dbSaved ? 'OK' : 'FAILED'}, Locale: ${localSaved ? 'OK' : 'FAILED'}`);

      // 🔄 FORCE REFRESH AUTHCONTEXT - CRITICO!
      try {
        console.log('🚀 Force refresh AuthContext dopo salvataggio...');
        
                 // 1. Trigger reload AuthContext direttamente
         if (refreshProfiles) {
           await refreshProfiles();
           console.log('✅ AuthContext profiles refreshed');
         }
        
        // 2. Delay per essere sicuri che tutto sia processato
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ Delay completato - AuthContext dovrebbe essere aggiornato');
        
      } catch (refreshError) {
        console.error('❌ Errore refresh AuthContext:', refreshError.message);
        // Fallback: almeno aggiorna storage locale
        try {
          const profileService = require('../lib/services/profile.service');
          const refreshedProfiles = await profileService.getProfiles(true);
          if (refreshedProfiles.length > 0) {
            await AsyncStorage.setItem('bacchus_profiles', JSON.stringify(refreshedProfiles));
            console.log('✅ Fallback: Storage locale aggiornato');
          }
        } catch (fallbackError) {
          console.error('❌ Anche fallback fallito:', fallbackError.message);
        }
      }

      // 🧹 CLEANUP - Nessun flag globale più necessario
      console.log('🧹 Cleanup wizard flags...');

      // 🎉 COMPLETATO - VAI ALLA DASHBOARD
      console.log('🎉 Wizard completato, navigando alla dashboard...');
      router.replace('/(tabs)/dashboard');

    } catch (error) {
      console.error('❌ Errore wizard:', error.message);
      
      Alert.alert(
        '❌ Errore Wizard',
        error.message || 'Errore sconosciuto. Riprova.',
        [
          { text: 'Riprova', onPress: () => setIsLoading(false) },
          { text: 'Vai al Login', onPress: () => router.replace('/auth/login') }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const renderStepContent = () => {
    const step = STEPS[currentStep];
    
    switch (step.id) {
      case 'welcome':
    return (
          <View style={styles.welcomeContainer}>
            <Image
              source={require('../../assets/images/bacchus-logo.png')}
              style={styles.welcomeLogo}
              resizeMode="contain"
            />
            <Text style={styles.welcomeText}>
              Iniziamo a configurare il tuo profilo per offrirti un'esperienza personalizzata
            </Text>
          </View>
        );

      case 'name':
        return (
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={24} color="#00bcd7" style={styles.inputIcon} />
            <TextInput
              ref={nameInputRef}
              style={styles.input}
              placeholder="Il tuo nome"
              placeholderTextColor="#8a9bb5"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={handleNext}
              cursorColor="#00bcd7"
            />
          </View>
        );

      case 'gender':
        return (
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                gender === 'male' && styles.optionButtonSelected
              ]}
              onPress={() => {
                setGender('male');
              }}
            >
              <Ionicons 
                name="man-outline" 
                size={32} 
                color={gender === 'male' ? '#ffffff' : '#00bcd7'} 
              />
                <Text style={[
                  styles.optionText, 
                gender === 'male' && styles.optionTextSelected
                ]}>
                Maschio
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                gender === 'female' && styles.optionButtonSelected
              ]}
              onPress={() => {
                setGender('female');
              }}
            >
              <Ionicons 
                name="woman-outline" 
                size={32} 
                color={gender === 'female' ? '#ffffff' : '#00bcd7'} 
              />
                <Text style={[
                  styles.optionText, 
                gender === 'female' && styles.optionTextSelected
                ]}>
                Femmina
                </Text>
              </TouchableOpacity>
          </View>
        );

      case 'age':
        return (
          <View style={styles.inputContainer}>
            <Ionicons name="calendar-outline" size={24} color="#00bcd7" style={styles.inputIcon} />
              <TextInput
              ref={ageInputRef}
              style={styles.input}
              placeholder="La tua età"
              placeholderTextColor="#8a9bb5"
              value={age}
              onChangeText={setAge}
                keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={handleNext}
              cursorColor="#00bcd7"
            />
          </View>
        );

      case 'weight':
        return (
          <View style={styles.inputContainer}>
            <Ionicons name="fitness-outline" size={24} color="#00bcd7" style={styles.inputIcon} />
              <TextInput
              ref={weightInputRef}
              style={styles.input}
              placeholder="Il tuo peso (kg)"
              placeholderTextColor="#8a9bb5"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={handleNext}
              cursorColor="#00bcd7"
            />
          </View>
        );

      case 'height':
        return (
          <View style={styles.inputContainer}>
            <Ionicons name="resize-outline" size={24} color="#00bcd7" style={styles.inputIcon} />
              <TextInput
              ref={heightInputRef}
              style={styles.input}
              placeholder="La tua altezza (cm)"
              placeholderTextColor="#8a9bb5"
              value={height}
              onChangeText={setHeight}
                keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={handleNext}
              cursorColor="#00bcd7"
            />
          </View>
        );

      case 'drinking':
        return (
          <View style={styles.frequencyContainer}>
            {[
              { 
                key: 'rarely', 
                label: 'Raramente', 
                description: 'Meno di 1 volta al mese',
                icon: 'wine-outline' 
              },
              { 
                key: 'occasionally', 
                label: 'Occasionalmente', 
                description: '1-3 volte al mese',
                icon: 'wine' 
              },
              { 
                key: 'regularly', 
                label: 'Regolarmente', 
                description: '1-2 volte a settimana',
                icon: 'wine' 
              },
              { 
                key: 'frequently', 
                label: 'Frequentemente', 
                description: '3+ volte a settimana',
                icon: 'wine' 
              }
              ].map((option) => (
                <TouchableOpacity
                key={option.key}
                  style={[
                  styles.frequencyButton,
                  drinkingFrequency === option.key && styles.frequencyButtonSelected
                ]}
                onPress={() => {
                  setDrinkingFrequency(option.key);
                }}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={24} 
                  color={drinkingFrequency === option.key ? '#ffffff' : '#00bcd7'} 
                />
                <View style={styles.frequencyTextContainer}>
                <Text style={[
                  styles.frequencyText,
                  drinkingFrequency === option.key && styles.frequencyTextSelected
                ]}>
                  {option.label}
                    </Text>
                  <Text style={[
                    styles.frequencyDescription,
                    drinkingFrequency === option.key && styles.frequencyDescriptionSelected
                  ]}>
                    {option.description}
                  </Text>
                </View>
                </TouchableOpacity>
              ))}
          </View>
        );

      case 'appearance':
        console.log('🎨 WIZARD: Rendering appearance step - emoji:', emoji, 'color:', color);
        return (
          <View style={styles.profileAppearanceContainer}>
            {/* 🎯 SEZIONE AVATAR - STILE EDIT PROFILE */}
            <View style={styles.profileAvatarSection}>
              <View style={[
                styles.profileAvatarContainer, 
                { backgroundColor: color || '#00bcd7' }
              ]}>
                {emoji ? (
                  <Text style={styles.profileAvatarEmoji}>{emoji}</Text>
                ) : (
                  <Text style={styles.profileAvatarInitial}>
                    {name ? name.charAt(0).toUpperCase() : '?'}
                  </Text>
                )}
              </View>
              
              <Text style={styles.profileAvatarName}>{name}</Text>
              
              {/* 🔥 BOTTONI AZIONI - STILE EDIT PROFILE */}
              <View style={styles.profileAvatarActions}>
                <TouchableOpacity 
                  style={styles.profileAvatarButton}
                  onPress={() => setShowEmojiModal(true)}
                >
                  <Ionicons name="happy-outline" size={24} color="#ffffff" />
                  <Text style={styles.profileAvatarButtonText}>Emoji</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.profileAvatarButton}
                  onPress={() => setShowColorModal(true)}
                >
                  <Ionicons name="color-palette-outline" size={24} color="#ffffff" />
                  <Text style={styles.profileAvatarButtonText}>Colore</Text>
                </TouchableOpacity>
              </View>
                </View>
                
            {/* 🎉 MODAL EMOJI - IDENTICO A MODIFICA PROFILO */}
            <Modal
              visible={showEmojiModal}
              transparent={false}
              animationType="slide"
              onRequestClose={() => setShowEmojiModal(false)}
            >
              <SafeAreaView style={[styles.modalContainer, { backgroundColor: BACKGROUND_COLOR }]}>
                {/* Header stile AppHeader */}
                <View style={[styles.modalHeader, { 
                  backgroundColor: BACKGROUND_COLOR,
                  borderBottomWidth: 1,
                  borderBottomColor: '#1e355a'
                }]}>
                  <TouchableOpacity 
                    style={styles.modalBackButton}
                    onPress={() => setShowEmojiModal(false)}
                  >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: '#ffffff' }]}>
                    Seleziona Emoji
                  </Text>
                  <View style={{ width: 40 }} />
                </View>
                
                {/* Emoji Selector */}
                <View style={styles.emojiPickerContainer}>
                  <EmojiSelector
                    onEmojiSelected={(selectedEmoji) => {
                      console.log('🎯 WIZARD: Emoji selezionato:', selectedEmoji);
                      setEmoji(selectedEmoji);
                      setShowEmojiModal(false);
                      // 🔧 FIX CRITICO: Forza re-render per aggiornare preview
                      console.log('🎯 WIZARD: Stato emoji aggiornato, forzando re-render...');
                    }}
                    showSearchBar={true}
                    showTabs={true}
                    showHistory={true}
                    showSectionTitles={true}
                    columns={8}
                  />
                </View>
              </SafeAreaView>
            </Modal>

            {/* 🌈 MODAL COLORE - IDENTICO A MODIFICA PROFILO */}
            <Modal
              visible={showColorModal}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowColorModal(false)}
            >
                      <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowColorModal(false)}
              >
                <View style={[styles.colorPickerModal, { backgroundColor: '#1e355a' }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: '#ffffff' }]}>
                      Seleziona Colore
                    </Text>
                    <TouchableOpacity onPress={() => setShowColorModal(false)}>
                      <Ionicons name="close" size={24} color="#ffffff" />
                      </TouchableOpacity>
              </View>

                <View style={styles.colorGrid}>
                    {[
                      '#FF5252', '#FF4081', '#E040FB', '#7C4DFF', 
                      '#536DFE', '#448AFF', '#40C4FF', '#18FFFF', 
                      '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41',
                      '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'
                    ].map((colorOption, index) => (
                    <TouchableOpacity
                        key={index}
                      style={[
                          styles.colorItem, 
                          { 
                            backgroundColor: colorOption,
                            borderWidth: color === colorOption ? 4 : 2,
                            borderColor: color === colorOption ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                          }
                      ]}
                      onPress={() => {
                          console.log('🎯 WIZARD: Colore selezionato:', colorOption);
                        setColor(colorOption);
                          setShowColorModal(false);
                          // 🔧 FIX CRITICO: Forza re-render per aggiornare preview
                          console.log('🎯 WIZARD: Stato color aggiornato, forzando re-render...');
                      }}
                    >
                      {color === colorOption && (
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

      default:
        return null;
    }
  };

  const step = STEPS[currentStep];
  
  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <LinearGradient
          colors={[BACKGROUND_COLOR, '#1e355a', BACKGROUND_COLOR]}
          style={styles.mainContainer}
        >
          <StatusBar style="light" backgroundColor={BACKGROUND_COLOR} />
          <SafeAreaView style={styles.mainContainer}>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                        outputRange: ['0%', `${((currentStep + 1) / STEPS.length) * 100}%`],
                      }),
                    },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentStep + 1} di {STEPS.length}
            </Text>
          </View>

          {/* Content Area - Scrollable */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.contentContainer}
          >
            <ScrollView 
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Step Content */}
              <Animated.View 
                style={[
                  styles.stepContainer,
                  { 
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  }
                ]}
              >
                <View style={styles.stepHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={step.icon as any} size={48} color="#00bcd7" />
                  </View>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                </View>

                <View style={styles.stepContent}>
                  {renderStepContent()}
                </View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Navigation Buttons - Fixed at bottom */}
          <View style={styles.navigationContainer}>
            {currentStep > 0 && (
              <TouchableOpacity 
                style={styles.backButton}
                onPress={handleBack}
              >
                <Ionicons name="chevron-back" size={24} color="#8a9bb5" />
                <Text style={styles.backButtonText}>Indietro</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[
                styles.nextButton, 
                currentStep === 0 && { flex: 1 }
              ]}
              onPress={handleNext}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#00bcd7', '#0097a7']}
                style={styles.nextButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.nextButtonText}>
                      {currentStep === STEPS.length - 1 ? 'Completa' : 
                       currentStep === 0 ? 'Inizia' : 'Avanti'}
                    </Text>
                    {currentStep < STEPS.length - 1 && (
                      <Ionicons name="chevron-forward" size={24} color="#ffffff" />
                    )}
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
        </View>
      </SafeAreaView>
        </LinearGradient>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 40,
  },
  progressBackground: {
    height: 4,
    backgroundColor: '#1e355a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00bcd7',
    borderRadius: 2,
  },
  progressText: {
    color: '#8a9bb5',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  stepContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e355a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#00bcd7',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#8a9bb5',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  stepContent: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeContainer: {
    alignItems: 'center',
  },
  welcomeLogo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 18,
    color: '#8a9bb5',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e355a',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 2,
    borderColor: '#2e4a7a',
    width: '100%',
    maxWidth: Math.min(380, width * 0.9),
  },
  inputIcon: {
    marginRight: 16,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '500',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  optionButton: {
    backgroundColor: '#1e355a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2e4a7a',
    minWidth: 120,
  },
  optionButtonSelected: {
    backgroundColor: '#00bcd7',
    borderColor: '#00bcd7',
  },
  optionText: {
    color: '#8a9bb5',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  frequencyContainer: {
    width: '100%',
    maxWidth: Math.min(380, width * 0.9),
    gap: 12,
  },
  frequencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e355a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#2e4a7a',
  },
  frequencyButtonSelected: {
    backgroundColor: '#00bcd7',
    borderColor: '#00bcd7',
  },
  frequencyTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  frequencyText: {
    color: '#8a9bb5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  frequencyTextSelected: {
    color: '#ffffff',
  },
  frequencyDescription: {
    color: '#6b7b8a',
    fontSize: 13,
    fontWeight: '400',
  },
  frequencyDescriptionSelected: {
    color: '#b3d9e0',
  },
  navigationContainer: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: BACKGROUND_COLOR,
    borderTopWidth: 1,
    borderTopColor: '#1e355a',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: '#8a9bb5',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  nextButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 8,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  appearanceContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  appearanceScrollView: {
    flex: 1,
  },
  appearanceScrollContent: {
    paddingBottom: 40,
  },
  appearanceSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8a9bb5',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  selectedEmojiContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  selectedEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  selectedEmojiLabel: {
    fontSize: 14,
    color: '#8a9bb5',
    textAlign: 'center',
  },
  emojiInputContainer: {
    marginBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    color: '#8a9bb5',
    textAlign: 'center',
  },
  emojiInput: {
    fontSize: 32,
    color: '#ffffff',
    backgroundColor: '#1e355a',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    textAlign: 'center',
    minWidth: 100,
    minHeight: 60,
    borderWidth: 2,
    borderColor: '#2e4a7a',
  },
  inputHint: {
    fontSize: 12,
    color: '#8a9bb5',
    textAlign: 'center',
  },
  quickSelectContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  quickSelectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    maxWidth: '100%',
    marginBottom: 20,
  },
  emojiOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiOptionSelected: {
    borderColor: '#00bcd7',
    backgroundColor: 'rgba(0, 188, 215, 0.2)',
  },
  emojiOptionText: {
    fontSize: 24,
  },
  selectedColorContainer: {
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedColorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  previewSection: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#2e4a7a',
  },
  profilePreview: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2e4a7a',
  },
  previewAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewEmoji: {
    fontSize: 36,
  },
  previewName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 14,
    color: '#8a9bb5',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  customizationScroll: {
    flex: 1,
  },
  customizationContent: {
    paddingBottom: 40,
  },
  customizationSection: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  emojiInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e355a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#2e4a7a',
    marginBottom: 20,
  },
  emojiDisplayArea: {
    alignItems: 'center',
  },
  currentEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emojiHint: {
    fontSize: 12,
    color: '#8a9bb5',
    textAlign: 'center',
  },
  hiddenEmojiInput: {
    position: 'absolute',
    top: -1000, // Fuori dallo schermo
    left: -1000, // Fuori dallo schermo
    width: 1,
    height: 1,
    opacity: 0,
  },
  popularEmojisContainer: {
    marginBottom: 20,
  },
  popularEmojisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  emojiQuickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  quickEmojiButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickEmojiSelected: {
    borderColor: '#00bcd7',
    backgroundColor: 'rgba(0, 188, 215, 0.2)',
  },
  quickEmojiText: {
    fontSize: 24,
  },
  colorGridContainer: {
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  colorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.1 }],
  },
  colorCheckmark: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00bcd7',
    borderRadius: 8,
    padding: 4,
  },
  colorInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  colorCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 100, // Aggiunge spazio per lo scrolling
  },
  
  // 🎨 NUOVI STILI SEMPLICI PER STEP 8 
  simpleAppearanceContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  simpleProfilePreview: {
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  simplePreviewAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  simplePreviewEmoji: {
    fontSize: 40,
  },
  simplePreviewName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  simplePreviewDescription: {
    fontSize: 14,
    color: '#8a9bb5',
    textAlign: 'center',
  },
  simpleControlsContainer: {
    flex: 1,
  },
  simpleControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e355a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2e4a7a',
  },
  simpleControlIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  simpleControlEmoji: {
    fontSize: 24,
  },
  simpleControlColorIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  simpleControlTextContainer: {
    flex: 1,
  },
  simpleControlTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  simpleControlSubtitle: {
    fontSize: 13,
    color: '#8a9bb5',
  },
  simpleColorPalette: {
    backgroundColor: '#1e355a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2e4a7a',
  },
  simpleColorPaletteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  simpleColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  simpleColorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  simpleColorOptionSelected: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.1 }],
  },

  // 🎨 STILI PERFETTI PER STEP 8 - DESIGN MODERNO E PULITO
  perfectAppearanceContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  perfectPreviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  perfectPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  perfectPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perfectAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  perfectAvatarEmoji: {
    fontSize: 32,
  },
  perfectPreviewInfo: {
    flex: 1,
  },
  perfectPreviewName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  perfectPreviewDetails: {
    fontSize: 14,
    color: '#8a9bb5',
    lineHeight: 20,
  },
  perfectCustomizationContainer: {
    flex: 1,
    gap: 20,
  },
  perfectCustomizationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  perfectCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  perfectCardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 188, 215, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  perfectCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  perfectEmojiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  perfectEmojiDisplay: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  perfectCurrentEmoji: {
    fontSize: 28,
  },
  perfectEmojiTextContainer: {
    flex: 1,
  },
  perfectEmojiButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  perfectEmojiButtonSubtitle: {
    fontSize: 13,
    color: '#8a9bb5',
  },
  perfectColorSection: {
    alignItems: 'center',
  },
  perfectColorSectionTitle: {
    fontSize: 14,
    color: '#8a9bb5',
    textAlign: 'center',
    marginBottom: 16,
  },
  perfectColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  perfectColorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  perfectColorOptionSelected: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  perfectColorSelectedIcon: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 2,
  },
  perfectSelectedColorInfo: {
    alignItems: 'center',
    paddingTop: 8,
  },
  perfectSelectedColorText: {
    fontSize: 13,
    color: '#8a9bb5',
    textAlign: 'center',
  },

  // 🎯 STILI PULITI E SEMPLICI PER STEP 8 - COME RICHIESTO
  cleanAppearanceContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cleanPreviewSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  cleanPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  cleanAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cleanAvatarEmoji: {
    fontSize: 36,
  },
  cleanPreviewName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cleanSection: {
    marginBottom: 30,
  },
  cleanSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  cleanEmojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  cleanEmojiButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cleanEmojiButtonSelected: {
    borderColor: '#00bcd7',
    backgroundColor: 'rgba(0, 188, 215, 0.2)',
  },
  cleanEmojiText: {
    fontSize: 28,
  },
  cleanColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  cleanColorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cleanColorButtonSelected: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.1 }],
  },

  // 📱 STILI PER MODALI - STEP 8 CON PANNELLI
  modalAppearanceContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalPreviewSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  modalPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  modalAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAvatarEmoji: {
    fontSize: 36,
  },
  modalPreviewName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalButtonsContainer: {
    gap: 16,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e355a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#2e4a7a',
  },
  modalButtonIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalButtonEmoji: {
    fontSize: 24,
  },
  modalButtonColorIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    flex: 1,
  },
  modalButtonSubtitle: {
    fontSize: 13,
    color: '#8a9bb5',
    flex: 1,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalPanel: {
    backgroundColor: '#1e355a',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: '#2e4a7a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalEmojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  modalEmojiButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modalEmojiButtonSelected: {
    borderColor: '#00bcd7',
    backgroundColor: 'rgba(0, 188, 215, 0.2)',
  },
  modalEmojiText: {
    fontSize: 28,
  },
  modalColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  modalColorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  modalColorButtonSelected: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.1 }],
  },

  // 🎯 STILI ORIZZONTALI PULITI PER STEP 8 - COME RICHIESTO DALL'UTENTE
  horizontalAppearanceContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalPreviewSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingVertical: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 300,
  },
  horizontalPreviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  horizontalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  horizontalAvatarEmoji: {
    fontSize: 40,
  },
  horizontalPreviewName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  horizontalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
    gap: 20,
  },
  horizontalButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  horizontalButtonIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  horizontalButtonIcon: {
    fontSize: 28,
  },
  horizontalButtonColorContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  horizontalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },

  // 🎯 STILI STEP 8 - COERENTI CON EDIT PROFILE
  profileAppearanceContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  profileAvatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileAvatarEmoji: {
    fontSize: 50,
  },
  profileAvatarInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileAvatarName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 30,
    textAlign: 'center',
  },
  
  // 🔥 BOTTONI AZIONI - STILE EDIT PROFILE
  profileAvatarActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  profileAvatarButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    minWidth: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileAvatarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 8,
  },

  // 🎉 MODAL OVERLAY
  profileModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
  },
  
  // 🎉 MODAL EMOJI - STILE EDIT PROFILE
  profileEmojiModal: {
    backgroundColor: '#1e355a',
    borderRadius: 25,
    padding: 0,
    width: '95%',
    maxHeight: '90%',
    borderWidth: 2,
    borderColor: '#00bcd7',
  },
  profileModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileModalBackButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  profileEmojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  profileEmojiButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  profileEmojiButtonSelected: {
    borderColor: '#00bcd7',
    backgroundColor: 'rgba(0, 188, 215, 0.3)',
    transform: [{ scale: 1.1 }],
  },
  profileEmojiText: {
    fontSize: 28,
  },

  // 🌈 MODAL COLORE - STILE EDIT PROFILE
  profileColorModal: {
    backgroundColor: '#1e355a',
    borderRadius: 25,
    padding: 25,
    width: '85%',
    borderWidth: 2,
    borderColor: '#00bcd7',
  },
  profileColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
  },
  profileColorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  profileColorButtonSelected: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },

  // 🔧 STILI NECESSARI PER MODALI
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1000,
  },
  emojiPickerContainer: {
    flex: 1,
  },
  colorPickerModal: {
    padding: 16,
    borderRadius: 25,
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
  
  // Fine StyleSheet
}); 