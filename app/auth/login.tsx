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
  ScrollView
} from 'react-native';
import { router, Link, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_AUTH_TOKEN_KEY } from '../lib/supabase/client';
import * as authService from '../lib/services/auth.service';
import appleAuth from '@invertase/react-native-apple-authentication';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { COLORS } from '../constants/theme';

// Dimensioni dello schermo
const { width, height } = Dimensions.get('window');

// Colore di sfondo identico alla schermata di splash
const BACKGROUND_COLOR = '#0c2348';

// This is needed to handle the redirect in Expo Auth Session
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const { login, isAuthenticated, loginWithProvider } = useAuth();
  const params = useLocalSearchParams();
  
  // Controlla se stiamo arrivando dalla splash screen
  const isFromSplash = params.fromSplash === 'true';

  // Stato
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [debugTaps, setDebugTaps] = useState(0);
  const [animationsStarted, setAnimationsStarted] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  
  // Valori per le animazioni di entrata
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;
  const socialOpacity = useRef(new Animated.Value(0)).current;
  const socialTranslateY = useRef(new Animated.Value(20)).current;
  const guestOpacity = useRef(new Animated.Value(0)).current;
  const guestTranslateY = useRef(new Animated.Value(20)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  
  // Riferimenti per i campi di input
  const passwordInputRef = useRef(null);

  // Avvia le animazioni quando il componente è montato
  useEffect(() => {
    // Evita di avviare le animazioni più di una volta
    if (animationsStarted) return;
    setAnimationsStarted(true);
    
    // Ritardo prima di iniziare le animazioni
    const initialDelay = isFromSplash ? 200 : 0;
    
    const animationSequence = Animated.stagger(180, [
      // Prima il sottotitolo
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        delay: initialDelay,
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
      
      // Poi i pulsanti social
      Animated.parallel([
        Animated.timing(socialOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease)
        }),
        Animated.timing(socialTranslateY, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        })
      ]),
      
      // Pulsante ospite
      Animated.parallel([
        Animated.timing(guestOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease)
        }),
        Animated.timing(guestTranslateY, {
          toValue: 0,
          duration: 450,
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
  }, [isFromSplash]);

  // Verifica lo stato di autenticazione all'avvio
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const sessionStr = await AsyncStorage.getItem(SUPABASE_AUTH_TOKEN_KEY);
        
        if (isAuthenticated) {
          console.log('User is already authenticated, redirecting directly to dashboard');
          router.replace('/dashboard');
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      }
    };
    
    checkAuthState();
  }, [isAuthenticated]);

  // Verifica la disponibilità dell'autenticazione Apple
  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(
      isAvailable => setAppleAuthAvailable(isAvailable)
    );
  }, []);

  // Funzione di debug per resettare tutti i dati dell'app
  const handleDebugReset = async () => {
    setDebugTaps(debugTaps + 1);
    
    // Se l'utente ha toccato il logo 7 volte, mostra l'opzione di reset
    if (debugTaps === 6) {
      Alert.alert(
        'Modalità Debug',
        'Vuoi cancellare tutti i dati persistenti dell\'app? L\'app si chiuderà dopo questa operazione.',
        [
          {
            text: 'Annulla',
            style: 'cancel',
            onPress: () => setDebugTaps(0)
          },
          {
            text: 'Reset Completo',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsLoading(true);
                setDebugInfo('Cancellazione di tutti i dati persistenti...');
                
                // Cancella tutti i dati da AsyncStorage
                await AsyncStorage.clear();
                
                // Mostra conferma
                Alert.alert(
                  'Reset Completato',
                  'Tutti i dati persistenti sono stati cancellati. Riavvia l\'app per completare l\'operazione.',
                  [
                    { 
                      text: 'OK', 
                      onPress: () => {
                        // Qui non possiamo forzare la chiusura dell'app, ma possiamo reindirizzare
                        // direttamente alla login invece che alla home
                        router.replace('/auth/login');
                      }
                    }
                  ]
                );
              } catch (error) {
                Alert.alert('Errore', 'Si è verificato un errore durante il reset: ' + error.message);
              } finally {
                setIsLoading(false);
                setDebugTaps(0);
              }
            }
          }
        ]
      );
    }
  };

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
    return true;
  };

  // Funzione di login
  const handleLogin = async () => {
    try {
      Keyboard.dismiss();
      
      // Validazione degli input
      const isEmailValid = validateEmail(email);
      const isPasswordValid = validatePassword(password);
      
      if (!isEmailValid || !isPasswordValid) {
        return;
      }
      
      setIsLoading(true);
      
      const { success, error } = await login(email, password);
      
      if (success) {
        // Clear wizard flag to prevent unwanted redirects
        if (typeof global !== 'undefined') {
          global.__WIZARD_AFTER_REGISTRATION__ = false;
        }
        
        router.replace('/dashboard');
      } else {
        Alert.alert(
          t('loginFailed', { ns: 'auth', defaultValue: 'Login Failed' }),
          error || t('genericError', { ns: 'auth', defaultValue: 'An error occurred' })
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        t('loginFailed', { ns: 'auth', defaultValue: 'Login Failed' }),
        t('genericError', { ns: 'auth', defaultValue: 'An error occurred' })
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  // Gestisci login Google
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      
      const { success, error } = await loginWithProvider('google');
      
      if (success) {
        router.replace('/dashboard');
      } else {
        Alert.alert(
          t('loginFailed', { ns: 'auth', defaultValue: 'Login Failed' }),
          error || t('genericError', { ns: 'auth', defaultValue: 'An error occurred' })
        );
      }
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert(
        t('loginFailed', { ns: 'auth', defaultValue: 'Login Failed' }),
        t('genericError', { ns: 'auth', defaultValue: 'An error occurred' })
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  // Gestisci login Apple
  const handleAppleLogin = async () => {
    try {
      setIsLoading(true);
      
      const { success, error } = await loginWithProvider('apple');
      
      if (success) {
        // If this is a new account with Apple, set the flag to show the profile wizard
        // This fixes the issue where Apple login doesn't properly redirect to the profile wizard
        if (typeof global !== 'undefined') {
          global.__WIZARD_AFTER_REGISTRATION__ = true;
          global.__WIZARD_START_TIME__ = Date.now();
          router.replace('/onboarding/profile-wizard');
        } else {
          router.replace('/dashboard');
        }
      } else {
        Alert.alert(
          t('loginFailed', { ns: 'auth', defaultValue: 'Login Failed' }),
          error || t('genericError', { ns: 'auth', defaultValue: 'An error occurred' })
        );
      }
    } catch (error) {
      console.error('Apple login error:', error);
      Alert.alert(
        t('loginFailed', { ns: 'auth', defaultValue: 'Login Failed' }),
        t('genericError', { ns: 'auth', defaultValue: 'An error occurred' })
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  // Gestione accesso ospite
  const handleGuestAccess = () => {
    router.replace({
      pathname: '/onboarding/profile-wizard',
      params: { guest: 'true' }
    });
  };
  
  // Navigazione al recupero password
  const goToForgotPassword = () => {
    // Commento temporaneo per risolvere l'errore di build
    // Sostituisco con un alert finché non verrà creata la pagina di recupero password
    Alert.alert(
      t('passwordResetTitle', { defaultValue: 'Recupero Password' }),
      t('passwordResetSubtitle', { defaultValue: 'Funzione non ancora disponibile' })
    );
    // Quando verrà creata la pagina di recupero password, decommentare questa riga:
    // router.push('/auth/forgot-password');
  };
  
  // Navigazione alla registrazione
  const goToSignup = () => {
    router.push('/auth/signup');
  };
  
  // Nascondi la tastiera quando si tocca lo sfondo
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
          <View style={styles.innerContainer}>
            {/* Logo */}
            <TouchableOpacity 
              onPress={handleDebugReset}
              style={styles.logoContainer}
            >
              <Image
                source={require('../../assets/images/bacchus-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Animated.Text style={[styles.appSubtitle, { color: '#8a9bb5', opacity: subtitleOpacity }]}>
                {t('appTagline', { defaultValue: 'Monitora. Informati. Resta al sicuro.' })}
              </Animated.Text>
              {debugInfo ? <Text style={{ color: 'white' }}>{debugInfo}</Text> : null}
            </TouchableOpacity>
            
            {/* Login Card */}
            <Animated.View 
              style={[
                styles.loginCard,
                { 
                  backgroundColor: '#162a4e',
                  opacity: cardOpacity,
                  transform: [{ translateY: cardTranslateY }],
                  borderWidth: 1,
                  borderColor: '#254175',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 5
                }
              ]}
            >
              <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>
                {t('welcomeBack', { defaultValue: 'Bentornato' })}
              </Text>
              <Text style={[styles.cardSubtitle, { color: '#8a9bb5' }]}>
                {t('loginToContinue', { defaultValue: 'Accedi per continuare a monitorare le tue statistiche' })}
              </Text>
              <View style={styles.formContainer}>
                {/* Email input */}
                <View style={[styles.inputContainer, { 
                  backgroundColor: '#1e355a',  // Sfondo più chiaro
                  borderWidth: 1,
                  borderColor: '#2e4a7a',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 2
                }]}>
                  <Ionicons name="mail-outline" size={22} color="#00bcd7" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: '#ffffff' }]}
                    placeholder={t('emailPlaceholder', { defaultValue: 'La tua email' })}
                    placeholderTextColor="#8a9bb5"
                    keyboardType="email-address"
                    returnKeyType="next"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    cursorColor="#00bcd7"
                  />
                </View>
                
                {/* Password input */}
                <View style={[styles.inputContainer, { 
                  backgroundColor: '#1e355a',  // Sfondo più chiaro
                  borderWidth: 1,
                  borderColor: '#2e4a7a',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 2
                }]}>
                  <Ionicons name="lock-closed-outline" size={22} color="#00bcd7" style={styles.inputIcon} />
                  <TextInput
                    ref={passwordInputRef}
                    style={[styles.input, { color: '#ffffff' }]}
                    placeholder={t('passwordPlaceholder', { defaultValue: 'La tua password' })}
                    placeholderTextColor="#8a9bb5"
                    secureTextEntry={!showPassword}
                    returnKeyType="go"
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={handleLogin}
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
                
                {/* Password dimenticata */}
                <TouchableOpacity 
                  style={styles.forgotPasswordButton}
                  onPress={goToForgotPassword}
                >
                  <Text style={[styles.forgotPasswordText, { color: '#00bcd7' }]}>
                    {t('forgotPassword', { defaultValue: 'Password dimenticata?' })}
                  </Text>
                </TouchableOpacity>
                
                {/* Login button */}
                <TouchableOpacity 
                  style={[styles.loginButton, { backgroundColor: '#00bcd7' }]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>
                      {t('login', { defaultValue: 'ACCEDI' })}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
            
            {/* Separatore */}
            <Animated.View 
              style={[
                styles.dividerContainer,
                { opacity: socialOpacity }
              ]}
            >
              <View style={[styles.dividerLine, { backgroundColor: '#2c3e60' }]} />
              <Text style={[styles.dividerText, { color: '#8a9bb5' }]}>
                {t('orSeparator', { defaultValue: 'oppure' })}
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: '#2c3e60' }]} />
            </Animated.View>
            
            {/* Pulsanti social login */}
            <Animated.View 
              style={[
                styles.socialButtonsContainer,
                { 
                  opacity: socialOpacity, 
                  transform: [{ translateY: socialTranslateY }] 
                }
              ]}
            >
              {/* Google login button */}
              <TouchableOpacity 
                style={[styles.socialButton, { 
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#2c3e60',
                  marginRight: 8
                }]}
                onPress={handleGoogleLogin}
                disabled={isLoading}
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.socialIcon} />
                <Text style={[styles.socialButtonText, { color: '#757575' }]}>
                  Google
                </Text>
              </TouchableOpacity>
              
              {/* Apple login button */}
              {appleAuthAvailable && (
                <TouchableOpacity 
                  style={[styles.socialButton, { 
                    backgroundColor: '#000000',
                    marginLeft: 8
                  }]}
                  onPress={handleAppleLogin}
                  disabled={isLoading}
                >
                  <Ionicons name="logo-apple" size={22} color="#FFFFFF" style={styles.socialIcon} />
                  <Text style={[styles.socialButtonText, { color: '#ffffff' }]}>
                    Apple
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>
            
            {/* Pulsante ospite */}
            <Animated.View
              style={[
                { 
                  width: '100%',
                  opacity: guestOpacity,
                  transform: [{ translateY: guestTranslateY }]
                }
              ]}
            >
              <TouchableOpacity 
                style={[styles.guestButton, { borderColor: '#2c3e60' }]}
                onPress={handleGuestAccess}
              >
                <Ionicons name="person-outline" size={20} color="#ffffff" />
                <Text style={[styles.guestButtonText, { color: '#ffffff' }]}>
                  {t('continueAsGuest', { defaultValue: 'Continua come Ospite' })}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            
            {/* Footer con link di registrazione */}
            <Animated.View 
              style={[
                styles.footerContainer,
                { opacity: footerOpacity }
              ]}
            >
              <Text style={[styles.noAccountText, { color: '#8a9bb5' }]}>
                {t('dontHaveAccount', { defaultValue: 'Non hai un account?' })}
              </Text>
              <Link href="/auth/signup" asChild>
                <TouchableOpacity>
                  <Text style={[styles.signupText, { color: '#00bcd7' }]}>
                    {t('register', { defaultValue: 'Registrati' })}
                  </Text>
                </TouchableOpacity>
              </Link>
            </Animated.View>
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
  innerContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
    letterSpacing: 4,
  },
  appSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  loginCard: {
    width: '100%',
    borderRadius: 15,
    padding: 20,
    marginVertical: 15,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 48,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  passwordVisibilityButton: {
    padding: 5,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  loginButton: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 10,
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
    height: 48,
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
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    width: '100%',
    marginBottom: 5,
  },
  guestButtonText: {
    fontSize: 16,
    marginLeft: 10,
  },
  footerContainer: {
    flexDirection: 'row',
    marginTop: 15,
    marginBottom: 10,
  },
  noAccountText: {
    fontSize: 14,
    marginRight: 5,
  },
  signupText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 