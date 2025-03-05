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

export default function ChangePasswordScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const { currentTheme } = useTheme();
  const { updatePassword } = useAuth();
  const colors = currentTheme.COLORS;
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handle password change
  const handleChangePassword = async () => {
    // Reset error state
    setError('');
    
    // Validate inputs
    if (!currentPassword.trim()) {
      setError(t('currentPasswordRequired', { ns: 'auth', defaultValue: 'Password attuale richiesta' }));
      return;
    }
    
    if (!newPassword.trim()) {
      setError(t('newPasswordRequired', { ns: 'auth', defaultValue: 'Nuova password richiesta' }));
      return;
    }
    
    if (newPassword.length < 8) {
      setError(t('passwordTooShort', { ns: 'auth', defaultValue: 'La password deve essere di almeno 8 caratteri' }));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError(t('passwordsDoNotMatch', { ns: 'auth', defaultValue: 'Le password non corrispondono' }));
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await updatePassword(currentPassword, newPassword);
      
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || t('passwordUpdateFailed', { ns: 'auth', defaultValue: 'Aggiornamento password fallito' }));
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      setError(error.message || t('passwordUpdateFailed', { ns: 'auth', defaultValue: 'Aggiornamento password fallito' }));
    } finally {
      setLoading(false);
    }
  };

  // Go back to profile or settings
  const handleGoBack = () => {
    router.back();
  };

  // Go to home after success
  const handleGoToHome = () => {
    router.replace('/');
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
            {t('changePassword', { ns: 'auth', defaultValue: 'Cambia Password' })}
          </Text>
        </View>
        
        {success ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color={colors.success} />
            <Text style={[styles.successText, { color: colors.text }]}>
              {t('passwordChanged', { ns: 'auth', defaultValue: 'Password cambiata con successo!' })}
            </Text>
            <Text style={[styles.successSubtext, { color: colors.textSecondary }]}>
              {t('passwordChangedDescription', { ns: 'auth', defaultValue: 'La tua password è stata aggiornata. Per motivi di sicurezza, ricordati di utilizzare una password unica e complessa.' })}
            </Text>
            
            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: colors.primary }]}
              onPress={handleGoToHome}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                {t('goToHome', { ns: 'common', defaultValue: 'Vai alla Home' })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('changePasswordInstructions', { ns: 'auth', defaultValue: 'Inserisci la tua password attuale e poi la nuova password che desideri utilizzare.' })}
            </Text>
            
            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: 'rgba(255, 0, 0, 0.1)', borderColor: 'rgba(255, 0, 0, 0.3)' }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}
            
            {/* Current Password Field */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('currentPassword', { ns: 'auth', defaultValue: 'Password attuale' })}
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input, 
                  styles.passwordInput,
                  { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border }
                ]}
                placeholder={t('currentPasswordPlaceholder', { ns: 'auth', defaultValue: 'Inserisci password attuale' })}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showCurrentPassword}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Ionicons 
                  name={showCurrentPassword ? 'eye-off' : 'eye'} 
                  size={24} 
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            
            {/* New Password Field */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('newPassword', { ns: 'auth', defaultValue: 'Nuova password' })}
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input, 
                  styles.passwordInput,
                  { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border }
                ]}
                placeholder={t('newPasswordPlaceholder', { ns: 'auth', defaultValue: 'Inserisci nuova password' })}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons 
                  name={showNewPassword ? 'eye-off' : 'eye'} 
                  size={24} 
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            
            {/* Confirm Password Field */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('confirmNewPassword', { ns: 'auth', defaultValue: 'Conferma nuova password' })}
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input, 
                  styles.passwordInput,
                  { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border }
                ]}
                placeholder={t('confirmPasswordPlaceholder', { ns: 'auth', defaultValue: 'Conferma nuova password' })}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? 'eye-off' : 'eye'} 
                  size={24} 
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  {t('updatePassword', { ns: 'auth', defaultValue: 'Aggiorna Password' })}
                </Text>
              )}
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
  passwordContainer: {
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
    marginBottom: 0,
  },
  eyeIcon: {
    position: 'absolute',
    right: 0,
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
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