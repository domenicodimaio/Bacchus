import React, { useState, useRef } from 'react';
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

export default function SignupScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const { currentTheme } = useTheme();
  const { register, loginWithProvider } = useAuth();
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

      // Controlla se le password sono abbastanza sicure
      if (password.length < 6) {
        Alert.alert('Errore', 'La password deve essere di almeno 6 caratteri.');
        setIsLoading(false);
        return;
      }

      // Registra l'utente
      const { success, error } = await register(email, password, name || email.split('@')[0]);

      if (success) {
        // CRITICAL FIX: Block any navigation system from showing other screens
        // These values MUST be set BEFORE any navigation to prevent race conditions
        if (typeof global !== 'undefined') {
          // Block the dashboard and any other screens from showing
          global.__BLOCK_ALL_SCREENS__ = true;
          global.__WIZARD_AFTER_REGISTRATION__ = true;
          global.__LOGIN_REDIRECT_IN_PROGRESS__ = true;
          
          console.log("🔴 Account created, blocking all other screens and going directly to wizard");
          
          // Unblock after enough time for the wizard to appear
          setTimeout(() => {
            // Keep the wizard flag but allow other screen changes after wizard is visible
            global.__BLOCK_ALL_SCREENS__ = false;
          }, 5000);
        }
        
        // IMMEDIATE navigation - don't use a timeout which creates a race condition
        // The router.replace call must happen IMMEDIATELY after setting the flags
        router.replace('/onboarding/profile-wizard');
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
        global.__PREVENT_ALL_REDIRECTS__ = false;
      }
      
      // Usa il loginWithProvider dall'AuthContext per inviare le credenziali a Supabase
      const result = await loginWithProvider('apple');
      
      if (result.success) {
        console.log("🔴 Account creato con Apple, reindirizzamento a wizard");
        
        // CRITICAL FIX: Block any navigation system from showing other screens
        // These values MUST be set BEFORE any navigation to prevent race conditions
        if (typeof global !== 'undefined') {
          // Block the dashboard and any other screens from showing
          global.__BLOCK_ALL_SCREENS__ = true;
          global.__WIZARD_AFTER_REGISTRATION__ = true;
          global.__LOGIN_REDIRECT_IN_PROGRESS__ = true;
          global.__WIZARD_START_TIME__ = Date.now();
          
          // Unblock after enough time for the wizard to appear
          setTimeout(() => {
            // Keep the wizard flag but allow other screen changes after wizard is visible
            global.__BLOCK_ALL_SCREENS__ = false;
          }, 5000);
        }
        
        // IMMEDIATE navigation - don't use a timeout which creates a race condition
        router.replace('/onboarding/profile-wizard');
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

  // Funzione per accedere come ospite
  const handleGuestAccess = async () => {
    console.log('SIGNUP: Accesso come ospite richiesto');
    
    try {
      // Prima puliamo le sessioni esistenti
      await authService.switchToGuestMode();
      
      console.log('SIGNUP: Reindirizzamento a /onboarding/profile-wizard con parametro guest=true');
      
      router.push({
        pathname: '/onboarding/profile-wizard',
        params: { guest: 'true' }
      });
    } catch (error) {
      console.error('Errore durante il passaggio alla modalità ospite:', error);
      Alert.alert(
        'Errore',
        'Si è verificato un errore durante il passaggio alla modalità ospite'
      );
    }
  };

  // Nascondi la tastiera quando si tocca lo sfondo
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
              <Text style={[styles.appTitle, { color: '#FFFFFF' }]}>
                BACCHUS
              </Text>
            </View>
            
            {/* Form di registrazione */}
            <View style={styles.formContainer}>
              {/* Email input */}
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={22} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardElevated, color: colors.text }]}
                  placeholder={t('email', { ns: 'auth' })}
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </View>
              
              {/* Password input */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={22} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.input, { backgroundColor: colors.cardElevated, color: colors.text }]}
                  placeholder={t('password', { ns: 'auth' })}
                  placeholderTextColor={colors.textTertiary}
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
                    color={colors.textTertiary} 
                  />
                </TouchableOpacity>
              </View>
              
              {/* Confirm Password input */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={22} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  ref={confirmPasswordInputRef}
                  style={[styles.input, { backgroundColor: colors.cardElevated, color: colors.text }]}
                  placeholder={t('confirmPassword', { ns: 'auth' })}
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showConfirmPassword}
                  returnKeyType="go"
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
                    color={colors.textTertiary} 
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
              
              {/* Pulsante ospite */}
              <TouchableOpacity 
                style={[styles.guestButton, { borderColor: colors.border }]}
                onPress={handleGuestAccess}
              >
                <Ionicons name="person-outline" size={20} color={colors.text} />
                <Text style={[styles.guestButtonText, { color: colors.text }]}>
                  {t('continueAsGuest', { ns: 'auth' })}
                </Text>
              </TouchableOpacity>
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
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
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
  guestButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 5,
  },
  guestButtonText: {
    fontSize: 16,
    marginLeft: 10,
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