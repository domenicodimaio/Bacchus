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
} from 'react-native';
import { router, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

// Dimensioni dello schermo
const { width, height } = Dimensions.get('window');

// Colore di sfondo identico alla schermata di splash
const BACKGROUND_COLOR = '#0c2348';

export default function SignUpScreen() {
  const { signup } = useAuth();
  const { t } = useTranslation(['auth', 'common']);
  
  // Stato
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [animationsStarted, setAnimationsStarted] = useState(false);
  
  // Valori per le animazioni di entrata
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  
  // Riferimenti per i campi di input
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  // Avvia le animazioni quando il componente è montato
  useEffect(() => {
    if (animationsStarted) return;
    setAnimationsStarted(true);
    
    const animationSequence = Animated.stagger(180, [
      // Prima il sottotitolo
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      }),
      
      // Poi la card con gli input
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease)
        }),
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        })
      ]),
      
      // Infine il footer
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      })
    ]);
    
    animationSequence.start();
  }, []);

  // Funzione per la validazione dell'email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return false;
    } else if (!emailRegex.test(email)) {
      return false;
    }
    return true;
  };
  
  // Funzione per la validazione della password
  const validatePassword = (password: string) => {
    if (!password) {
      return false;
    } else if (password.length < 6) {
      return false;
    }
    // Controlla che contenga almeno una maiuscola, una minuscola e un numero
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return hasUpperCase && hasLowerCase && hasNumbers;
  };

  // Funzione di registrazione
  const handleSignup = async () => {
    try {
      Keyboard.dismiss();
      
      // Validazione degli input
      const isEmailValid = validateEmail(email);
      const isPasswordValid = validatePassword(password);
      
      if (!isEmailValid) {
        Alert.alert('Errore', 'Inserisci un indirizzo email valido');
        return;
      }
      
      if (!isPasswordValid) {
        Alert.alert('Errore', 'La password deve contenere almeno 6 caratteri con lettere maiuscole, minuscole e numeri');
        return;
      }
      
      if (password !== confirmPassword) {
        Alert.alert('Errore', 'Le password non coincidono');
        return;
      }
      
      setIsLoading(true);
      
      // 🔧 FIX: Usa correttamente la risposta dell'AuthContext
      const response = await signup(email, password);
      console.log('[SIGNUP] Risposta AuthContext:', response);
      
      if (response.success) {
        console.log('[SIGNUP] ✅ Registrazione completata');
        
        if (response.needsEmailConfirmation) {
          console.log('[SIGNUP] → Richiesta conferma email');
          Alert.alert(
            'Registrazione completata!',
            'Controlla la tua email per confermare l\'account, poi torna qui per accedere.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/auth/login')
              }
            ]
          );
        } else {
          console.log('[SIGNUP] → Navigazione diretta a:', response.redirectTo || 'wizard');

          // Set wizard flag per sicurezza
          if (typeof global !== 'undefined') {
            global.__WIZARD_AFTER_REGISTRATION__ = true;
            console.log('[SIGNUP] Flag wizard impostato');
          }

          // 🔧 FIX CRITICO: NAVIGA EFFETTIVAMENTE invece di aspettare AuthContext
          console.log('[SIGNUP] ✅ Registrazione completata - navigazione al wizard');
          router.replace('/onboarding/profile-wizard');
        }
      } else {
        console.error('[SIGNUP] ❌ Registrazione fallita:', response.error);
        
        // 🔧 FIX: Gestione errori migliorata con messaggi specifici
        const errorMessage = response.error || 'Si è verificato un errore durante la registrazione';
        console.error(`[SIGNUP] 🔴 Errore UI: ${errorMessage}`);
        
        // Messaggi specifici per errori di produzione TestFlight
        let displayTitle = 'Errore di registrazione';
        let displayMessage = errorMessage;
        
        if (errorMessage.includes('connessione') || errorMessage.includes('connection')) {
          displayTitle = 'Problema di connessione';
          displayMessage = 'Verifica la tua connessione internet e riprova. Se sei connesso, il server potrebbe essere temporaneamente non disponibile.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('tempo')) {
          displayTitle = 'Timeout di connessione';
          displayMessage = 'La registrazione sta impiegando troppo tempo. Riprova tra qualche minuto.';
        } else if (errorMessage.includes('network') || errorMessage.includes('rete')) {
          displayTitle = 'Errore di rete';
          displayMessage = 'Problema di rete. Controlla la tua connessione e riprova.';
        } else if (errorMessage.includes('email') && errorMessage.includes('registrata')) {
          displayTitle = 'Email già in uso';
          displayMessage = 'Questa email è già registrata. Prova ad accedere invece di registrarti.';
        } else if (errorMessage.includes('password') || errorMessage.includes('Password')) {
          displayTitle = 'Password non valida';
          displayMessage = 'La password non rispetta i requisiti. Deve contenere almeno 8 caratteri con lettere maiuscole, minuscole e numeri.';
        }
        
        console.log(`[SIGNUP] 📱 Mostro alert: ${displayTitle} - ${displayMessage}`);
        Alert.alert(displayTitle, displayMessage);
      }
    } catch (error: any) {
      console.error('[SIGNUP] Errore catch generale:', error);
      
      // 🔧 FIX: Fallback per errori imprevisti in produzione TestFlight
      const errorMessage = error?.message || 'Errore di connessione imprevisto';
      console.error(`[SIGNUP] 💥 Errore catch: ${errorMessage}`);
      
      // Messaggi user-friendly per errori tecnici
      let userMessage = 'Si è verificato un errore tecnico durante la registrazione.';
      
      if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        userMessage = 'Problema di connessione. Controlla la tua connessione internet e riprova.';
      } else if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        userMessage = 'Impossibile contattare il server. Riprova tra qualche minuto.';
      }
      
      Alert.alert(
        'Errore tecnico',
        `${userMessage}\n\nSe il problema persiste, controlla la tua connessione internet o riprova più tardi.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
        <StatusBar style="light" />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.innerContainer}>
              {/* Logo */}
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/images/bacchus-logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Animated.Text style={[styles.appSubtitle, { opacity: subtitleOpacity }]}>
                  {t('createAccount', { defaultValue: 'Crea il tuo account' })}
                </Animated.Text>
              </View>
              
              {/* Signup Card */}
              <Animated.View 
                style={[
                  styles.signupCard,
                  { 
                    opacity: cardOpacity,
                    transform: [{ translateY: cardTranslateY }]
                  }
                ]}
              >
                <Text style={styles.cardTitle}>
                  {t('signupTitle', { defaultValue: 'Registrati' })}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {t('signupSubtitle', { defaultValue: 'Inserisci i tuoi dati per creare un account' })}
                </Text>
                
                {/* Form */}
                <View style={styles.formContainer}>
                  {/* Email input */}
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={22} color="#00bcd7" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={t('emailPlaceholder', { defaultValue: 'La tua email' })}
                      placeholderTextColor="#8a9bb5"
                      keyboardType="email-address"
                      returnKeyType="next"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                    />
                  </View>
                  
                  {/* Password input */}
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={22} color="#00bcd7" style={styles.inputIcon} />
                    <TextInput
                      ref={passwordInputRef}
                      style={styles.input}
                      placeholder={t('passwordPlaceholder', { defaultValue: 'Crea una password' })}
                      placeholderTextColor="#8a9bb5"
                      secureTextEntry={!showPassword}
                      returnKeyType="next"
                      value={password}
                      onChangeText={setPassword}
                      onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                    />
                    <TouchableOpacity 
                      style={styles.passwordVisibilityButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={22} 
                        color="#8a9bb5" 
                      />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Confirm Password input */}
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={22} color="#00bcd7" style={styles.inputIcon} />
                    <TextInput
                      ref={confirmPasswordInputRef}
                      style={styles.input}
                      placeholder={t('confirmPasswordPlaceholder', { defaultValue: 'Conferma password' })}
                      placeholderTextColor="#8a9bb5"
                      secureTextEntry={!showConfirmPassword}
                      returnKeyType="done"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onSubmitEditing={handleSignup}
                    />
                    <TouchableOpacity 
                      style={styles.passwordVisibilityButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Ionicons 
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                        size={22} 
                        color="#8a9bb5" 
                      />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Signup button */}
                  <TouchableOpacity 
                    style={styles.signupButton}
                    onPress={handleSignup}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.signupButtonText}>
                        {t('createAccount', { defaultValue: 'CREA ACCOUNT' })}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
              
              {/* Footer */}
              <Animated.View 
                style={[
                  styles.footerContainer,
                  { opacity: footerOpacity }
                ]}
              >
                <Text style={styles.hasAccountText}>
                  {t('alreadyHaveAccount', { defaultValue: 'Hai già un account?' })}
                </Text>
                <Link href="/auth/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.loginText}>
                      {t('login', { defaultValue: 'Accedi' })}
                    </Text>
                  </TouchableOpacity>
                </Link>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    justifyContent: 'flex-start',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#8a9bb5',
    textAlign: 'center',
    marginBottom: 20,
  },
  signupCard: {
    width: '100%',
    backgroundColor: '#162a4e',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#254175',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#8a9bb5',
    marginBottom: 20,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e355a',
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#2e4a7a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#ffffff',
  },
  passwordVisibilityButton: {
    padding: 5,
  },
  signupButton: {
    height: 48,
    backgroundColor: '#00bcd7',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  footerContainer: {
    flexDirection: 'row',
    marginVertical: 20,
  },
  hasAccountText: {
    fontSize: 14,
    color: '#8a9bb5',
    marginRight: 5,
  },
  loginText: {
    fontSize: 14,
    color: '#00bcd7',
    fontWeight: '600',
  },
}); 