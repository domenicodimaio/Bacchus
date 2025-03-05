import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { signUpWithEmail } from '../lib/supabase/client';

export default function RegisterScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;

  // Stati per il form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Animazioni
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(40);
  const buttonScale = useSharedValue(0.95);

  useEffect(() => {
    // Animazione logo
    logoOpacity.value = withSequence(
      withDelay(300, withTiming(1, { duration: 800 }))
    );
    
    logoScale.value = withSequence(
      withDelay(300, withTiming(1, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }))
    );
    
    // Animazione form
    formOpacity.value = withSequence(
      withDelay(600, withTiming(1, { duration: 800 }))
    );
    
    formTranslateY.value = withSequence(
      withDelay(600, withTiming(0, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }))
    );
    
    // Animazione pulsante
    buttonScale.value = withSequence(
      withDelay(1000, withTiming(1, { duration: 300 }))
    );
  }, []);

  // Stili animati
  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: logoOpacity.value,
      transform: [
        { scale: logoScale.value }
      ],
    };
  });

  const formAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: formOpacity.value,
      transform: [
        { translateY: formTranslateY.value }
      ],
    };
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: buttonScale.value }
      ],
    };
  });

  // Validazione
  const validateForm = () => {
    if (!email.trim()) {
      setError(t('emailRequired', { ns: 'auth' }));
      return false;
    }
    
    if (!password.trim()) {
      setError(t('passwordRequired', { ns: 'auth' }));
      return false;
    }
    
    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch', { ns: 'auth' }));
      return false;
    }
    
    setError('');
    return true;
  };

  // Gestione registrazione
  const handleSignUp = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const { data, error } = await signUpWithEmail(email, password);
      
      if (error) {
        throw error;
      }
      
      // Registrazione riuscita
      Alert.alert(
        t('signUpSuccess', { ns: 'auth' }),
        t('checkEmailVerification', { ns: 'auth' }),
        [
          { 
            text: t('ok', { ns: 'common' }),
            onPress: () => router.replace('/login' as any)
          }
        ]
      );
    } catch (error) {
      console.error('Sign up error:', error);
      setError(error.message || t('signUpFailed', { ns: 'auth' }));
    } finally {
      setLoading(false);
    }
  };

  // Naviga alla schermata di login
  const goToLogin = () => {
    router.replace('/login' as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          {/* Logo */}
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <View style={styles.logoCircle}>
              <FontAwesome5 name="user-plus" size={Platform.OS === 'ios' ? 50 : 40} color={colors.primary} />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>{t('createAccount', { ns: 'auth' })}</Text>
          </Animated.View>
          
          {/* Form */}
          <Animated.View style={[styles.formContainer, formAnimatedStyle]}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('email', { ns: 'auth' })}
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}>
                <FontAwesome5 name="envelope" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.primary }]}
                  placeholder={t('emailPlaceholder', { ns: 'auth' })}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('password', { ns: 'auth' })}
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}>
                <FontAwesome5 name="lock" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.primary }]}
                  placeholder={t('passwordPlaceholder', { ns: 'auth' })}
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('confirmPassword', { ns: 'auth' })}
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}>
                <FontAwesome5 name="lock" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.primary }]}
                  placeholder={t('confirmPasswordPlaceholder', { ns: 'auth' })}
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>
            
            <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>
                    {t('signUp', { ns: 'auth' })}
                  </Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.linkButton, { marginTop: 20 }]}
                onPress={goToLogin}
              >
                <Text style={[styles.linkButtonText, { color: colors.textSecondary }]}>
                  {t('alreadyHaveAccount', { ns: 'auth' })}
                </Text>
                <Text style={[styles.linkButtonTextHighlight, { color: colors.primary }]}>
                  {t('login', { ns: 'auth' })}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 20 : 10,
    marginBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  logoCircle: {
    width: Platform.OS === 'ios' ? 110 : 90,
    height: Platform.OS === 'ios' ? 110 : 90,
    borderRadius: Platform.OS === 'ios' ? 55 : 45,
    backgroundColor: 'rgba(0, 247, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 247, 255, 0.3)',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.3)',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 10,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  linkButtonText: {
    fontSize: 14,
    marginRight: 4,
  },
  linkButtonTextHighlight: {
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 