import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Platform,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase/client';
import { storeAuthState } from '../lib/supabase/middleware';
import { hasProfiles } from '../lib/services/profile.service';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { t } = useTranslation();
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Animated values
  const logoOpacity = new Animated.Value(0);
  const formOpacity = new Animated.Value(0);
  const formTranslateY = new Animated.Value(50);

  // Animation on mount
  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true
        })
      ])
    ]).start();
  }, []);

  // Validazione form
  const validateForm = () => {
    if (!email || !password) {
      setError(t('emailRequired', { ns: 'auth' }));
      return false;
    }
    
    if (!isLogin && password !== confirmPassword) {
      setError(t('passwordsDoNotMatch', { ns: 'auth' }));
      return false;
    }
    
    return true;
  };

  // Funzione per il login
  const handleLogin = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError('');
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) throw signInError;
      
      if (data?.session) {
        await storeAuthState(data.session);
        
        // Verifica se ci sono già profili disponibili nel sistema
        if (hasProfiles()) {
          // L'utente ha già almeno un profilo, vai alla dashboard
          router.replace('/dashboard');
        } else {
          // Se non ha profili, mandalo al wizard per crearne uno
          router.replace('/onboarding/profile-wizard');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(t('loginFailed', { ns: 'auth' }));
    } finally {
      setLoading(false);
    }
  };

  // Funzione per la registrazione
  const handleSignUp = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError('');
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (signUpError) throw signUpError;
      
      if (data?.session) {
        await storeAuthState(data.session);
        
        // Nuovo utente, deve creare un profilo
        router.replace('/onboarding/profile-wizard');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setError(t('signupFailed', { ns: 'auth' }));
    } finally {
      setLoading(false);
    }
  };

  // Funzione per continuare come ospite
  const handleGuestAccess = () => {
    // Redirect al wizard per creare un profilo temporaneo per gli ospiti
    router.replace('/onboarding/profile-wizard');
  };

  // Toggle tra login e registrazione
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(0, 247, 255, 0.08)', 'rgba(20, 35, 59, 0)']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
      >
        {/* Logo & Header */}
        <Animated.View style={[styles.logoContainer, { opacity: logoOpacity }]}>
          <View style={styles.logoCircle}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="water" size={48} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>Alcol<Text style={{ color: colors.primary }}>Test</Text></Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('slogan', { ns: 'auth' })}
          </Text>
        </Animated.View>
        
        {/* Form */}
        <Animated.View 
          style={[
            styles.formContainer, 
            { 
              opacity: formOpacity,
              transform: [{ translateY: formTranslateY }] 
            }
          ]}
        >
          <View style={styles.formHeader}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {isLogin ? t('welcome', { ns: 'auth' }) : t('createAccount', { ns: 'auth' })}
            </Text>
          </View>
          
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: 'rgba(255, 77, 77, 0.1)', borderColor: 'rgba(255, 77, 77, 0.3)' }]}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} style={styles.errorIcon} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}
          
          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border }]}
                placeholder={t('emailPlaceholder', { ns: 'auth' })}
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border }]}
                placeholder={t('passwordPlaceholder', { ns: 'auth' })}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
            
            {!isLogin && (
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border }]}
                  placeholder={t('confirmPasswordPlaceholder', { ns: 'auth' })}
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            )}
          </View>
          
          {isLogin && (
            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Text style={[styles.forgotPassword, { color: colors.primary }]}>
                {t('forgotPassword', { ns: 'auth' })}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={isLogin ? handleLogin : handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>
                  {isLogin ? t('login', { ns: 'auth' }) : t('signUp', { ns: 'auth' })}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              </>
            )}
          </TouchableOpacity>
          
          <View style={styles.orContainer}>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.orText, { color: colors.textSecondary }]}>
              {t('or', { ns: 'common' })}
            </Text>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          </View>
          
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
            onPress={handleGuestAccess}
          >
            <Ionicons name="person-outline" size={20} color={colors.text} style={styles.secondaryButtonIcon} />
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              {t('continueAsGuest', { ns: 'auth' })}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        
        <TouchableOpacity style={styles.switchContainer} onPress={toggleMode}>
          <Text style={[styles.switchText, { color: colors.textSecondary }]}>
            {isLogin ? t('dontHaveAccount', { ns: 'auth' }) : t('alreadyHaveAccount', { ns: 'auth' })}
          </Text>
          <Text style={[styles.switchAction, { color: colors.primary }]}>
            {isLogin ? t('signUp', { ns: 'auth' }) : t('login', { ns: 'auth' })}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 24,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  formContainer: {
    backgroundColor: 'rgba(30, 46, 69, 0.6)',
    borderRadius: 24,
    marginHorizontal: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(45, 61, 89, 0.8)',
  },
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 46, 69, 0.8)',
    borderRadius: 12,
    marginBottom: 16,
    height: 56,
    overflow: 'hidden',
  },
  inputIcon: {
    padding: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 12,
    paddingRight: 16,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPassword: {
    fontSize: 14,
  },
  primaryButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 14,
    marginHorizontal: 12,
  },
  secondaryButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  secondaryButtonIcon: {
    marginRight: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  switchText: {
    fontSize: 14,
  },
  switchAction: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
}); 