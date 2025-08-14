import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Keyboard,
  Linking,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../lib/services/auth.service';
import supabase from '../lib/supabase/client';

export default function EmailConfirmationScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const { user } = useAuth();
  
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [userEmail, setUserEmail] = useState('');
  const [canResend, setCanResend] = useState(false);
  
  // Refs per gestire il focus automatico
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Ottieni l'email dell'utente
    const getUserEmail = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
        }
      } catch (error) {
        console.error('Errore nel recupero email utente:', error);
      }
    };

    getUserEmail();
    
    // TEMPORANEO: Salta automaticamente la conferma email
    // dato che non abbiamo un provider email configurato
    console.log('🟡 TEMPORANEO: Saltando conferma email - provider non configurato');
    
    Alert.alert(
      'Conferma Email',
      'Per ora saltiamo la conferma email. Potrai verificarla in seguito dalle impostazioni.',
      [
        {
          text: 'Continua',
          onPress: () => {
            // Pulisci i flag e vai alla dashboard
            AsyncStorage.removeItem('needs_email_confirmation_after_wizard');
            router.replace('/dashboard');
          }
        }
      ]
    );
  }, []);

  const startResendTimer = () => {
    setCanResend(false);
    setResendTimer(60);
    
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOTPCode = async () => {
    try {
      setResendLoading(true);
      
      // Genera un codice OTP a 6 cifre
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Salva il codice OTP nell'AsyncStorage con timestamp di scadenza (5 minuti)
      const expirationTime = Date.now() + (5 * 60 * 1000);
      await AsyncStorage.setItem('email_otp_code', otpCode);
      await AsyncStorage.setItem('email_otp_expiration', expirationTime.toString());
      
      // In una implementazione reale, qui invieresti l'email con il codice OTP
      // Per ora, mostra il codice nella console per test
      console.log('🔐 CODICE OTP PER TEST:', otpCode);
      
      // Simula l'invio email (in produzione useresti un servizio email)
      Alert.alert(
        t('otpSent', { defaultValue: 'Codice inviato' }),
        t('otpSentMessage', { 
          defaultValue: `Abbiamo inviato un codice di verifica a ${userEmail}. Il codice scadrà tra 5 minuti.\n\n[DEBUG: ${otpCode}]` 
        })
      );
      
    } catch (error) {
      console.error('Errore nell\'invio del codice OTP:', error);
      Alert.alert(
        t('error', { ns: 'common', defaultValue: 'Errore' }),
        t('otpSendError', { defaultValue: 'Errore nell\'invio del codice. Riprova.' })
      );
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otpCode];
    
    // Se l'utente sta cancellando
    if (text === '') {
      newOtp[index] = '';
      setOtpCode(newOtp);
      
      // Vai al campo precedente se possibile
      if (index > 0 && inputRefs.current[index - 1]) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }
    
    // Prendi solo l'ultimo carattere digitato
    const lastChar = text.slice(-1);
    
    // Verifica che sia un numero
    if (!/^\d$/.test(lastChar)) {
      return;
    }
    
    newOtp[index] = lastChar;
    setOtpCode(newOtp);
    
    // Vai al campo successivo se possibile
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Se tutti i campi sono compilati, verifica automaticamente
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      setTimeout(() => {
        verifyOTP(newOtp.join(''));
      }, 100);
    }
  };

  const verifyOTP = async (code?: string) => {
    try {
      setLoading(true);
      
      const codeToVerify = code || otpCode.join('');
      
      if (codeToVerify.length !== 6) {
        Alert.alert(
          t('error', { ns: 'common', defaultValue: 'Errore' }),
          t('invalidOtpLength', { defaultValue: 'Il codice deve essere di 6 cifre' })
        );
        return;
      }
      
      // Recupera il codice salvato e il tempo di scadenza
      const savedCode = await AsyncStorage.getItem('email_otp_code');
      const expirationTime = await AsyncStorage.getItem('email_otp_expiration');
      
      if (!savedCode || !expirationTime) {
        Alert.alert(
          t('error', { ns: 'common', defaultValue: 'Errore' }),
          t('otpExpired', { defaultValue: 'Codice scaduto. Richiedi un nuovo codice.' })
        );
        return;
      }
      
      // Verifica se il codice è scaduto
      if (Date.now() > parseInt(expirationTime)) {
        Alert.alert(
          t('error', { ns: 'common', defaultValue: 'Errore' }),
          t('otpExpired', { defaultValue: 'Codice scaduto. Richiedi un nuovo codice.' })
        );
        await AsyncStorage.removeItem('email_otp_code');
        await AsyncStorage.removeItem('email_otp_expiration');
        return;
      }
      
      // Verifica se il codice è corretto
      if (codeToVerify !== savedCode) {
        Alert.alert(
          t('error', { ns: 'common', defaultValue: 'Errore' }),
          t('invalidOtp', { defaultValue: 'Codice non valido. Riprova.' })
        );
        
        // Resetta il codice
        setOtpCode(['', '', '', '', '', '']);
        if (inputRefs.current[0]) {
          inputRefs.current[0]?.focus();
        }
        return;
      }
      
      // Codice corretto - marca l'email come confermata
      await AsyncStorage.removeItem('email_otp_code');
      await AsyncStorage.removeItem('email_otp_expiration');
      await AsyncStorage.removeItem('needs_email_confirmation_after_wizard');
      
      // Aggiorna lo stato dell'utente in Supabase (simulato)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // In una implementazione reale, qui aggiorneresti il campo email_confirmed_at
          console.log('✅ Email verificata con successo per utente:', user.id);
        }
      } catch (updateError) {
        console.warn('Errore nell\'aggiornamento stato email:', updateError);
      }
      
      Alert.alert(
        t('success', { ns: 'common', defaultValue: 'Successo' }),
        t('emailVerified', { defaultValue: 'Email verificata con successo!' }),
        [
          {
            text: t('continue', { ns: 'common', defaultValue: 'Continua' }),
            onPress: () => {
              // Vai alla dashboard
              router.replace('/(tabs)/dashboard');
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Errore nella verifica OTP:', error);
      Alert.alert(
        t('error', { ns: 'common', defaultValue: 'Errore' }),
        t('otpVerifyError', { defaultValue: 'Errore nella verifica. Riprova.' })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = () => {
    if (!canResend) return;
    
    // Resetta il codice
    setOtpCode(['', '', '', '', '', '']);
    
    // Invia nuovo codice
    sendOTPCode();
    
    // Riavvia il timer
    startResendTimer();
  };

  const handleSkip = () => {
    Alert.alert(
      t('skipVerification', { defaultValue: 'Salta verifica' }),
      t('skipVerificationMessage', { defaultValue: 'Puoi verificare la tua email in seguito dalle impostazioni.' }),
      [
        {
          text: t('cancel', { ns: 'common', defaultValue: 'Annulla' }),
          style: 'cancel'
        },
        {
          text: t('skip', { defaultValue: 'Salta' }),
          onPress: () => {
            router.replace('/(tabs)/dashboard');
          }
        }
      ]
    );
  };

  const handleOpenEmailApp = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('message://');
    } else {
      Linking.openURL('mailto:');
    }
  };

  const handleGoBack = () => {
    // Pulisci i flag globali
    if (typeof global !== 'undefined') {
      global.__WIZARD_AFTER_REGISTRATION__ = false;
      global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
      global.__PREVENT_ALL_REDIRECTS__ = false;
    }
    
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + '20', colors.background]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="mail" size={48} color={colors.primary} />
            </View>
            
            <Text style={[styles.title, { color: colors.text }]}>
              {t('verifyEmail', { defaultValue: 'Verifica la tua email' })}
            </Text>
            
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('otpVerificationMessage', { 
                defaultValue: `Inserisci il codice a 6 cifre inviato a:\n${userEmail}` 
              })}
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otpCode.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: digit ? colors.primary : colors.border,
                    color: colors.text
                  }
                ]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                keyboardType="number-pad"
                maxLength={2}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              {
                backgroundColor: otpCode.every(d => d !== '') ? colors.primary : colors.border,
                opacity: loading ? 0.7 : 1
              }
            ]}
            onPress={() => verifyOTP()}
            disabled={loading || !otpCode.every(d => d !== '')}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.verifyButtonText}>
                {t('verify', { defaultValue: 'Verifica' })}
              </Text>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={[styles.resendText, { color: colors.textSecondary }]}>
              {t('didntReceiveCode', { defaultValue: 'Non hai ricevuto il codice?' })}
            </Text>
            
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={!canResend || resendLoading}
              style={styles.resendButton}
            >
              {resendLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[
                  styles.resendButtonText,
                  { color: canResend ? colors.primary : colors.textTertiary }
                ]}>
                  {canResend 
                    ? t('resendCode', { defaultValue: 'Invia di nuovo' })
                    : t('resendIn', { defaultValue: `Invia di nuovo tra ${resendTimer}s` })
                  }
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Skip Button */}
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
              {t('skipForNow', { defaultValue: 'Salta per ora' })}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 10,
  },
  otpInput: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  verifyButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 14,
    marginBottom: 10,
  },
  resendButton: {
    padding: 10,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    padding: 15,
    marginTop: 20,
  },
  skipButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 