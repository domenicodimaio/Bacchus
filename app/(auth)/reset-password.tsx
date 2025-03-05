import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function ResetPasswordScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const { currentTheme } = useTheme();
  const { resetPassword } = useAuth();
  const colors = currentTheme.COLORS;
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Handle reset password
  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError(t('emailRequired', { ns: 'auth' }));
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const result = await resetPassword(email);
      
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || t('resetPasswordFailed', { ns: 'auth' }));
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      setError(error.message || t('resetPasswordFailed', { ns: 'auth' }));
    } finally {
      setLoading(false);
    }
  };

  // Torna alla pagina di login
  const handleGoBack = () => {
    router.replace('/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.title, { color: colors.text }]}>
            {t('resetPassword', { ns: 'auth' })}
          </Text>
        </View>
        
        {success ? (
          <View style={styles.successContainer}>
            <Ionicons name="mail-outline" size={64} color={colors.success} />
            <Text style={[styles.successText, { color: colors.text }]}>
              {t('resetPasswordEmailSent', { ns: 'auth' })}
            </Text>
            <Text style={[styles.successSubtext, { color: colors.textSecondary }]}>
              {t('resetPasswordCheckInbox', { ns: 'auth' })}
            </Text>
            
            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: colors.primary }]}
              onPress={handleGoBack}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                {t('backToLogin', { ns: 'auth' })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('resetPasswordInstructions', { ns: 'auth', defaultValue: 'Inserisci la tua email e ti invieremo istruzioni per reimpostare la tua password.' })}
            </Text>
            
            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: 'rgba(255, 0, 0, 0.1)', borderColor: 'rgba(255, 0, 0, 0.3)' }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}
            
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('email', { ns: 'auth' })}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.primary, borderColor: colors.border }]}
              placeholder={t('emailPlaceholder', { ns: 'auth' })}
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  {t('sendResetLink', { ns: 'auth', defaultValue: 'Invia link di reset' })}
                </Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.linkContainer} onPress={handleGoBack}>
              <Text style={[styles.link, { color: colors.primary }]}>
                {t('backToLogin', { ns: 'auth', defaultValue: 'Torna al login' })}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  form: {
    flex: 1,
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
  },
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 40,
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
    lineHeight: 22,
  },
  successButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
}); 