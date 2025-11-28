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
  Linking,
  useWindowDimensions
} from 'react-native';

// 🔥 NOTA: Detection iPad spostata DENTRO il componente per essere dinamica
import { router, Link, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase, { SUPABASE_AUTH_TOKEN_KEY, supabaseUrl, supabaseAnonKey } from '../lib/supabase/client';
import * as authService from '../lib/services/auth.service';
import appleAuth from '@invertase/react-native-apple-authentication';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { COLORS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import config from '../lib/config';
import { createClient } from '@supabase/supabase-js';

// Le dimensioni dello schermo sono già dichiarate sopra (riga 22)

// Colore di sfondo identico alla schermata di splash
const BACKGROUND_COLOR = '#0c2348';

// This is needed to handle the redirect in Expo Auth Session
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const { login, isAuthenticated, loginWithProvider } = useAuth();
  const params = useLocalSearchParams();
  
  // 🔥 DETECTION IPAD DINAMICA: Usa SCREEN dimensions per rilevare iPad anche in modalità upscaled
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const screenDimensions = Dimensions.get('screen');
  const isIPad = Platform.OS === 'ios' && Math.min(screenDimensions.width, screenDimensions.height) >= 700;
  
  // 🔥 DEBUG: Log per verificare rilevamento iPad
  console.log('🔍 LOGIN: Device detection:', {
    platform: Platform.OS,
    windowWidth: windowWidth,
    windowHeight: windowHeight,
    screenWidth: screenDimensions.width,
    screenHeight: screenDimensions.height,
    screenMinDimension: Math.min(screenDimensions.width, screenDimensions.height),
    isIPad: isIPad
  });
  
  // Controlla se stiamo arrivando dalla splash screen
  const isFromSplash = params.fromSplash === 'true';

  // 🔧 FIX CRITICO: Controllo AsyncStorage disponibilità
  useEffect(() => {
    const checkAsyncStorage = async () => {
      try {
        if (typeof AsyncStorage === 'undefined') {
          console.error('[LOGIN] ❌ AsyncStorage non disponibile, usando fallback globale');
          if (typeof global !== 'undefined' && (global as any).AsyncStorage) {
            console.log('[LOGIN] ✅ Fallback AsyncStorage trovato nei global');
          } else {
            console.error('[LOGIN] 💥 Nessun AsyncStorage disponibile!');
          }
        } else {
          console.log('[LOGIN] ✅ AsyncStorage disponibile');
          // Test rapido di AsyncStorage
          await AsyncStorage.getItem('test');
          console.log('[LOGIN] ✅ AsyncStorage funzionale');
        }
      } catch (error) {
        console.error('[LOGIN] ❌ Errore test AsyncStorage:', error);
      }
    };
    
    checkAsyncStorage();
  }, []);

  // Stato
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [animationsStarted, setAnimationsStarted] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  
  // Valori per le animazioni di entrata
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;
  const socialOpacity = useRef(new Animated.Value(0)).current;
  const socialTranslateY = useRef(new Animated.Value(20)).current;
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
      
      // Infine il footer (più veloce per assicurare visibilità)
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 300,
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
          router.replace('/(tabs)/dashboard');
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

  // CRITICAL FIX: Reset all redirect flags when this screen mounts
  useEffect(() => {
    if (typeof global !== 'undefined') {
      // Clear all navigation blocking flags
      global.__BLOCK_ALL_SCREENS__ = false;
      global.__WIZARD_AFTER_REGISTRATION__ = false;
      global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
      global.__PREVENT_ALL_REDIRECTS__ = false;
      console.log('Login: Cleared all navigation blocking flags on mount');
    }
  }, []);

  // Funzione di debug per resettare tutti i dati dell'app

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
        
        // 🔥 FIX PREMIUM: Aspetta che premium sia sincronizzato PRIMA del redirect
        console.log('⏳ Attendo sincronizzazione premium prima del redirect...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Aspetta 1.5 sec
        
        // 🔥 FIX PREMIUM: Verifica che il premium status sia caricato
        try {
          const purchaseService = require('../lib/services/purchase.service');
          const isPremium = await purchaseService.isPremium();
          console.log('✅ Premium status verificato prima redirect:', isPremium);
        } catch (premiumCheckError) {
          console.warn('⚠️ Errore verifica premium status:', premiumCheckError);
        }
        
        router.replace('/(tabs)/dashboard');
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
        // 🔥 FIX PREMIUM: Aspetta che premium sia sincronizzato
        console.log('⏳ Attendo sincronizzazione premium prima del redirect...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 🔥 FIX PREMIUM: Verifica che il premium status sia caricato
        try {
          const purchaseService = require('../lib/services/purchase.service');
          const isPremium = await purchaseService.isPremium();
          console.log('✅ Premium status verificato prima redirect:', isPremium);
        } catch (premiumCheckError) {
          console.warn('⚠️ Errore verifica premium status:', premiumCheckError);
        }
        
        router.replace('/(tabs)/dashboard');
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
  
  // Funzione per login con Apple
  const handleAppleLogin = async () => {
    try {
      setIsLoading(true);
      setDebugInfo('Inizializzazione Apple Sign In...');
      console.log('🚨 DEBUG_APPLE: INIZIO handleAppleLogin - QUESTO DEVE APPARIRE NEI LOG!');
      console.log('APPLE_FLOW: Login con Apple - Avvio processo OAuth');
      
      // Log remoto per debugging
      const { logInfo, logError } = await import('../lib/services/logging.service');
      await logInfo('Apple Login Attempt Started', {
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      });
      
      const { success, error, data, redirectToProfileCreation, isNewUser } = await loginWithProvider('apple');
      
      if (success) {
        console.log('APPLE_FLOW: Login con Apple - Successo immediato');
        setDebugInfo('Login completato! Reindirizzamento...');
        await logInfo('Apple Login Success', { immediate: true, isNewUser });
        
        // 🎯 Se deve completare il wizard (nuovo utente, senza profili, o riattivato)
        if (redirectToProfileCreation) {
          console.log('APPLE_FLOW: Utente Apple deve completare wizard - Delegato ad AuthContext');
          // 🔧 FIX RACE CONDITION: Non navigare qui, lascia che AuthContext gestisca
          // La navigazione sarà gestita da AuthContext.onAuthStateChange
        } else {
          console.log('APPLE_FLOW: Utente Apple esistente con profilo - Dashboard');
          
          // 🔥 FIX PREMIUM: Aspetta che premium sia sincronizzato
          console.log('⏳ Attendo sincronizzazione premium prima del redirect...');
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // 🔥 FIX PREMIUM: Verifica che il premium status sia caricato
          try {
            const purchaseService = require('../lib/services/purchase.service');
            const isPremium = await purchaseService.isPremium();
            console.log('✅ Premium status verificato prima redirect:', isPremium);
          } catch (premiumCheckError) {
            console.warn('⚠️ Errore verifica premium status:', premiumCheckError);
          }
          
          router.replace('/(tabs)/dashboard');
        }
      } else if (error === 'oauth_in_progress') {
        // OAuth avviato correttamente, il sistema gestirà il callback automaticamente
        console.log('APPLE_FLOW: Login con Apple - OAuth avviato, attendo callback automatico...');
        setDebugInfo('Apertura Apple Sign In...');
        await logInfo('Apple Login OAuth Started');
        
        // Non disabilitare il loading - lascio che il sistema gestisca il callback
        // Il sistema di callback lo gestirà automaticamente tramite deep linking
        
      } else {
        console.error('APPLE_FLOW: Login con Apple - Errore:', error);
        setIsLoading(false);
        setDebugInfo('');
        
        await logError('Apple Login Failed', new Error(error || 'Unknown error'), {
          errorType: 'login_flow',
          errorMessage: error,
          platform: Platform.OS
        });
        
        // Gestisci errori specifici per Apple
        let userMessage = 'Errore durante l\'accesso con Apple';
        if (error?.includes('annullata') || error?.includes('canceled')) {
          userMessage = 'Accesso con Apple annullato';
        } else if (error?.includes('non disponibile')) {
          userMessage = 'Apple Sign In non disponibile su questo dispositivo';
        }
        
        Alert.alert(
          t('loginFailed'),
          userMessage,
          [{ text: t('ok'), style: 'default' }]
        );
      }
    } catch (error) {
      console.error('APPLE_FLOW: Login con Apple - Errore generale:', error);
      setIsLoading(false);
      setDebugInfo('');
      
      // Log remoto dell'errore
      const { logError } = await import('../lib/services/logging.service');
      await logError('Apple Login Exception', error, {
        errorType: 'exception',
        platform: Platform.OS,
        critical: true
      });
      
      Alert.alert(
        t('loginFailed'),
        'Errore durante l\'accesso con Apple',
        [{ text: t('ok'), style: 'default' }]
      );
    }
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

  // Ottieni dimensioni responsive

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
        <StatusBar style="light" />
        
        <View style={[styles.innerContainer]}>
            {/* Logo */}
            <View 
              style={[
                styles.logoContainer,
                isIPad && { marginBottom: 5, marginTop: 5 } // Override iPad
              ]}
            >
              <Image
                source={require('../../assets/images/bacchus-logo.png')}
                style={[
                  styles.logo,
                  isIPad && { width: 80, height: 80, marginBottom: 5 } // Override iPad
                ]}
                resizeMode="contain"
              />
              <Animated.Text style={[
                styles.appSubtitle, 
                { color: '#8a9bb5', opacity: subtitleOpacity }
              ]}>
                {t('appTagline', { defaultValue: 'Monitora. Informati. Resta al sicuro.' })}
              </Animated.Text>
              {debugInfo ? <Text style={{ color: 'white' }}>{debugInfo}</Text> : null}
            </View>
            
            {/* Login Card */}
            <Animated.View 
              style={[
                styles.card,
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
                },
                isIPad && { padding: 16, marginVertical: 8 } // Override iPad
              ]}
            >
              <Text style={[
                styles.cardTitle, 
                { color: '#FFFFFF' },
                isIPad && { fontSize: 20, marginBottom: 4 } // Override iPad
              ]}>
                {t('welcomeBack', { defaultValue: 'Bentornato' })}
              </Text>
              <Text style={[styles.cardSubtitle, { color: '#8a9bb5' }]}>
                {t('loginToContinue', { defaultValue: 'Accedi per continuare a monitorare le tue statistiche' })}
              </Text>
              <View style={styles.formContainer}>
                {/* Email input */}
                <View style={[
                  styles.inputContainer, 
                  { 
                    backgroundColor: '#1e355a',
                    borderWidth: 1,
                    borderColor: '#2e4a7a',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2
                  },
                  isIPad && { marginBottom: 12, paddingHorizontal: 12, height: 40 } // Override iPad
                ]}>
                  <Ionicons name="mail-outline" size={22} color="#00bcd7" style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input, 
                      { color: '#ffffff' },
                      isIPad && { height: 40, fontSize: 14 } // Override iPad
                    ]}
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
                <View style={[
                  styles.inputContainer, 
                  { 
                    backgroundColor: '#1e355a',
                    borderWidth: 1,
                    borderColor: '#2e4a7a',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2
                  },
                  isIPad && { marginBottom: 12, paddingHorizontal: 12, height: 40 } // Override iPad
                ]}>
                  <Ionicons name="lock-closed-outline" size={22} color="#00bcd7" style={styles.inputIcon} />
                  <TextInput
                    ref={passwordInputRef}
                    style={[
                      styles.input, 
                      { color: '#ffffff' },
                      isIPad && { height: 40, fontSize: 14 } // Override iPad
                    ]}
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
                  style={[
                    styles.forgotPasswordButton,
                    isIPad && { marginBottom: 12 } // Override iPad
                  ]}
                  onPress={goToForgotPassword}
                >
                  <Text style={[styles.forgotPasswordText, { color: '#00bcd7' }]}>
                    {t('forgotPassword', { defaultValue: 'Password dimenticata?' })}
                  </Text>
                </TouchableOpacity>
                
                {/* Login button */}
                <TouchableOpacity 
                  style={[
                    styles.loginButton, 
                    { backgroundColor: '#00bcd7' },
                    isIPad && { height: 44 } // Override iPad
                  ]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={[
                      styles.loginButtonText,
                      isIPad && { fontSize: 14 } // Override iPad
                    ]}>
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
                },
                isIPad && { marginBottom: 5 } // Override iPad
              ]}
            >
              {/* Google login button */}
              <TouchableOpacity 
                style={[
                  styles.socialButton, 
                  { 
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#2c3e60',
                    marginRight: 8,
                    flex: 1
                  },
                  isIPad && { height: 44 } // Override iPad
                ]}
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
                  style={[
                    styles.socialButton, 
                    { 
                      backgroundColor: '#000000',
                      marginLeft: 8,
                      flex: 1
                    },
                    isIPad && { height: 44 } // Override iPad
                  ]}
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
            
            {/* Footer con link di registrazione - Layout verticale */}
            <Animated.View 
              style={[
                styles.footerContainer,
                { opacity: footerOpacity },
                isIPad && { marginTop: 8, marginBottom: 8, paddingVertical: 5 } // Override iPad
              ]}
            >
              <Text style={[styles.noAccountText, { color: '#8a9bb5' }]}>
                {t('dontHaveAccount', { defaultValue: 'Non hai un account?' })}
              </Text>
              <Link href="/auth/signup" asChild>
                <TouchableOpacity style={[styles.registerButton, { minHeight: 44, paddingVertical: 12, paddingHorizontal: 16 }]}>
                  <Text style={[styles.signupText, { color: '#00bcd7' }]}>
                    {t('register', { defaultValue: 'Registrati' })}
                  </Text>
                </TouchableOpacity>
              </Link>
            </Animated.View>
          </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
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
  card: {
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
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  socialIcon: {
    marginRight: 8,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footerContainer: {
    flexDirection: 'column',
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAccountText: {
    fontSize: 14,
    marginBottom: 8, // Spazio tra testo e bottone
    textAlign: 'center',
  },
  registerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44, // Touch target minimo Apple per iPad
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 16, // Aumentato per migliore leggibilità su iPad
    fontWeight: '600',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  button: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#673ab7',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
}); 