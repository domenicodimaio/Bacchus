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
  Keyboard
} from 'react-native';
import { router, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import * as authService from '../lib/services/auth.service';
import appleAuth from '@invertase/react-native-apple-authentication';

// Funzione per validare il formato dell'email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Funzione per validare la complessità della password
const isValidPassword = (password: string): boolean => {
  // Verifica che la password abbia almeno 6 caratteri, una maiuscola, una minuscola e un numero
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return hasMinLength && hasUppercase && hasLowercase && hasNumber;
};

export default function SignupScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const { currentTheme } = useTheme();
  const { signup, loginWithProvider } = useAuth();
  const colors = currentTheme.COLORS;

  // Stato
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Riferimenti per i campi di input
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  // CRITICAL FIX: Reset all redirect flags when this screen mounts
  useEffect(() => {
    if (typeof global !== 'undefined') {
      // Clear all navigation blocking flags
      global.__BLOCK_ALL_SCREENS__ = false;
      global.__WIZARD_AFTER_REGISTRATION__ = false;
      global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
      global.__PREVENT_ALL_REDIRECTS__ = false;
      console.log('Signup: Cleared all navigation blocking flags on mount');
    }
  }, []);

  // Funzione per gestire la registrazione
  const handleSignup = async () => {
    try {
      setIsLoading(true);

      // Controlla i campi obbligatori
      if (!email || !password || !confirmPassword) {
        Alert.alert('Errore', 'Tutti i campi sono obbligatori.');
        setIsLoading(false);
        return;
      }

      // Controlla se le email sono valide
      if (!isValidEmail(email)) {
        Alert.alert('Errore', 'Inserisci un indirizzo email valido.');
        setIsLoading(false);
        return;
      }

      // Controlla se le password corrispondono
      if (password !== confirmPassword) {
        Alert.alert('Errore', 'Le password non corrispondono.');
        setIsLoading(false);
        return;
      }

      // Controlla se le password rispettano i requisiti di sicurezza
      if (!isValidPassword(password)) {
        Alert.alert('Errore', 'La password deve contenere almeno 6 caratteri, una lettera maiuscola, una minuscola e un numero.');
        setIsLoading(false);
        return;
      }

      // Registra l'utente
      const { success, error } = await signup(email, password);

      if (success) {
        // CRITICAL FIX: Imposta i flag globali per assicurarsi che il wizard venga mostrato
        if (typeof global !== 'undefined') {
          global.__BLOCK_ALL_SCREENS__ = false; // Non blocchiamo tutte le schermate
          global.__WIZARD_AFTER_REGISTRATION__ = true;
          global.__LOGIN_REDIRECT_IN_PROGRESS__ = true;
          global.__WIZARD_START_TIME__ = Date.now();
          
          console.log("🔴 Set __LOGIN_REDIRECT_IN_PROGRESS__ and __WIZARD_AFTER_REGISTRATION__ to true");
          
          // Rimuoviamo la flag dopo alcuni secondi per sicurezza
          setTimeout(() => {
            if (typeof global !== 'undefined') {
              global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
              console.log("🔴 Reset __LOGIN_REDIRECT_IN_PROGRESS__ to false after timeout");
            }
          }, 10000); // Extended timeout for safety
        }
        
        setIsLoading(false);
        console.log("🔴 Registration successful, preparing to redirect to wizard in 2.5 seconds");
        
        // Breve attesa per permettere lo stato dell'app di aggiornarsi
        setTimeout(() => {
          // Reindirizzamento al wizard
          console.log("🔴 Now redirecting to profile wizard after registration");
          router.replace('/onboarding/profile-wizard');
        }, 2500); // Increased delay from 1500ms to 2500ms
      } else {
        Alert.alert('Errore', error || 'Si è verificato un errore durante la registrazione.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante la registrazione.');
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per registrazione con Google
  const handleGoogleSignup = async () => {
    try {
      setIsLoading(true);
      // Placeholder per la vera implementazione
      Alert.alert(
        'Funzionalità non disponibile',
        'La registrazione con Google sarà disponibile nelle prossime versioni.'
      );
    } catch (error) {
      console.error('Google signup error:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante la registrazione con Google');
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per registrazione con Apple
  const handleAppleSignup = async () => {
    try {
      setIsLoading(true);
      
      // Verifica se Apple Sign In è disponibile sul dispositivo
      if (!appleAuth.isSupported || Platform.OS !== 'ios') {
      Alert.alert(
          'Non supportato',
          'La registrazione con Apple non è supportata su questo dispositivo.'
        );
        setIsLoading(false);
        return;
      }
      
      // Richiedi le credenziali a Apple
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });
      
      // Assicurati che il token di identità sia disponibile
      if (!appleAuthRequestResponse.identityToken) {
        throw new Error('Apple Sign-In non è riuscito - nessun identity token restituito');
      }
      
      // CRITICAL FIX: Reset all navigation flags before setting new ones
      if (typeof global !== 'undefined') {
        global.__WIZARD_AFTER_REGISTRATION__ = false;
        global.__BLOCK_ALL_SCREENS__ = false;
        global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
      }
      
      // Usa il loginWithProvider dall'AuthContext per inviare le credenziali a Supabase
      const result = await loginWithProvider('apple');
      
      if (result.success) {
        console.log("🔴 Account creato con Apple, reindirizzamento a wizard");
        
        // CRITICAL FIX: Imposta i flag globali per assicurarsi che il wizard venga mostrato
        if (typeof global !== 'undefined') {
          global.__BLOCK_ALL_SCREENS__ = false; // Non blocchiamo tutte le schermate
          global.__WIZARD_AFTER_REGISTRATION__ = true;
          global.__LOGIN_REDIRECT_IN_PROGRESS__ = true;
          global.__WIZARD_START_TIME__ = Date.now();
          
          console.log("🔴 Account creato con Apple, reindirizzamento a wizard");
          
          // Per sicurezza, imposta un timer che reimposta i flag se qualcosa va storto
          setTimeout(() => {
            if (typeof global !== 'undefined') {
              global.__BLOCK_ALL_SCREENS__ = false;
            }
          }, 10000);
        }
        
        // Breve attesa per permettere lo stato dell'app di aggiornarsi
        setTimeout(() => {
          // Reindirizzamento al wizard
          router.replace('/onboarding/profile-wizard');
        }, 1500);
      } else {
        console.error('Apple signup error:', result.error);
        Alert.alert('Errore', `Si è verificato un errore durante la registrazione con Apple: ${result.error}`);
      }
    } catch (error) {
      console.error('Apple signup error:', error);
      
      // Clean all flags to prevent issues
      if (typeof global !== 'undefined') {
        global.__WIZARD_AFTER_REGISTRATION__ = false;
        global.__BLOCK_ALL_SCREENS__ = false;
        global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
      }
      
      // Gestisci i diversi tipi di errore
      if (error.code === appleAuth.Error.CANCELED) {
        console.log('User canceled Apple Sign in');
      } else {
      Alert.alert('Errore', 'Si è verificato un errore durante la registrazione con Apple');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per nascondere la tastiera
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={[styles.container, { backgroundColor: '#0f1c35' }]}>
        <StatusBar style="light" />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.innerContainer}>
            {/* Logo e titolo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/bacchus-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={[styles.appSubtitle, { color: '#8a9bb5' }]}>
                {t('appTagline', { defaultValue: 'Monitora. Informati. Resta al sicuro.' })}
              </Text>
            </View>
            
            {/* Form di registrazione */}
            <View style={[styles.formContainer, { 
              backgroundColor: '#162a4e',
              borderWidth: 1,
              borderColor: '#254175',
              borderRadius: 15,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 5
            }]}>
              <Text style={[styles.cardTitle, { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }]}>
                {t('createAccount', { ns: 'auth', defaultValue: 'Crea un account' })}
              </Text>
              <Text style={[styles.cardSubtitle, { color: '#8a9bb5', textAlign: 'center', marginBottom: 20 }]}>
                {t('signupSubtitle', { ns: 'auth', defaultValue: 'Registrati per iniziare a monitorare' })}
              </Text>
              
              {/* Email input */}
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={22} color="#00bcd7" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: '#1e355a',
                    color: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#2e4a7a',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2
                  }]}
                  placeholder={t('email', { ns: 'auth' })}
                  placeholderTextColor="#8a9bb5"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  cursorColor="#00bcd7"
                />
              </View>
              
              {/* Password input */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={22} color="#00bcd7" style={styles.inputIcon} />
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.input, { 
                    backgroundColor: '#1e355a',
                    color: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#2e4a7a',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2
                  }]}
                  placeholder={t('password', { ns: 'auth' })}
                  placeholderTextColor="#8a9bb5"
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                  cursorColor="#00bcd7"
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
                  style={[styles.input, { 
                    backgroundColor: '#1e355a',
                    color: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#2e4a7a',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2
                  }]}
                  placeholder={t('confirmPassword', { ns: 'auth' })}
                  placeholderTextColor="#8a9bb5"
                  secureTextEntry={!showConfirmPassword}
                  returnKeyType="go"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onSubmitEditing={handleSignup}
                  cursorColor="#00bcd7"
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
                style={[styles.signupButton, { backgroundColor: colors.primary }]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.signupButtonText}>
                    {t('signUp', { ns: 'auth' })}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Alternativa di accesso */}
            <View style={styles.alternativesContainer}>
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
                  {t('or', { ns: 'common' })}
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>
              
              {/* Pulsanti social signup */}
              <View style={styles.socialButtonsContainer}>
                {/* Google signup button */}
                <TouchableOpacity 
                  style={[styles.socialButton, { 
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginRight: 8
                  }]}
                  onPress={handleGoogleSignup}
                  disabled={isLoading}
                >
                  <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.socialIcon} />
                  <Text style={[styles.socialButtonText, { color: '#757575' }]}>
                    Google
                  </Text>
                </TouchableOpacity>
                
                {/* Apple signup button */}
                <TouchableOpacity 
                  style={[styles.socialButton, { 
                    backgroundColor: '#000000',
                    marginLeft: 8
                  }]}
                  onPress={handleAppleSignup}
                  disabled={isLoading}
                >
                  <Ionicons name="logo-apple" size={22} color="#FFFFFF" style={styles.socialIcon} />
                  <Text style={[styles.socialButtonText, { color: '#FFFFFF' }]}>
                    Apple
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Footer con link di login */}
            <View style={styles.footerContainer}>
              <Text style={[styles.alreadyAccountText, { color: colors.textSecondary }]}>
                {t('alreadyHaveAccount', { ns: 'auth' })}
              </Text>
              <Link href="/auth/login" asChild>
                <TouchableOpacity>
                  <Text style={[styles.loginText, { color: colors.primary }]}>
                    {t('login', { ns: 'auth' })}
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
  appSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 350,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: 14,
    zIndex: 1,
  },
  input: {
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 46,
    fontSize: 16,
    width: '100%',
  },
  passwordVisibilityButton: {
    position: 'absolute',
    right: 12,
    top: 14,
    zIndex: 1,
  },
  signupButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  alternativesContainer: {
    width: '100%',
    maxWidth: 350,
    marginTop: 30,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 10,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: {
    marginRight: 8,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footerContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 10,
  },
  alreadyAccountText: {
    fontSize: 14,
    marginRight: 5,
  },
  loginText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 