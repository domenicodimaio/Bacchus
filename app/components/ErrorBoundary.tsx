import React, { Component, ErrorInfo, ReactNode, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGE_STORAGE_KEY, ALL_NAMESPACES, SUPPORTED_LANGUAGES } from '../i18n';
import i18n from '../i18n';
import { clearStoredAuthSessions } from '../lib/supabase/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { resetAuthState } from '../lib/services/auth.service';
import config from '../lib/config';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: any[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRecovering: boolean;
  retryCount: number;
}

// Forza il caricamento delle traduzioni necessarie per i messaggi di errore
const ensureErrorMessages = () => {
  try {
    // Controlla se i18n è inizializzato
    if (!i18n.isInitialized) {
      console.warn('ErrorBoundary: i18n non inizializzato');
      return;
    }
    
    // Assicurati che almeno il namespace 'common' sia caricato in entrambe le lingue
    for (const lang of SUPPORTED_LANGUAGES) {
      try {
        // Se non è caricato, carica almeno 'common'
        if (!i18n.hasResourceBundle(lang, 'common')) {
          console.log(`ErrorBoundary: caricamento forzato namespace common in ${lang}`);
          
          // Carica direttamente il bundle per i messaggi di errore
          const data = require(`../locales/${lang}/common.json`);
          i18n.addResourceBundle(lang, 'common', data, true, true);
        }
      } catch (error) {
        console.error(`ErrorBoundary: errore caricamento traduzioni ${lang}:`, error);
      }
    }
  } catch (error) {
    console.error('ErrorBoundary: errore verifica traduzioni:', error);
  }
};

// Componente per la schermata di errore
const ErrorScreen = ({ 
  error, 
  resetErrorBoundary, 
  isRecovering
}: { 
  error: Error; 
  resetErrorBoundary: () => void;
  isRecovering: boolean;
}) => {
  const insets = useSafeAreaInsets();
  
  // Esegui il caricamento delle traduzioni per i messaggi di errore
  useEffect(() => {
    ensureErrorMessages();
  }, []);
  
  const currentLanguage = i18n.language || 'it';
  
  // Messaggi di errore in entrambe le lingue per maggiore resilienza
  const messages = {
    it: {
      title: 'Si è verificato un errore',
      description: 'Ci scusiamo per l\'inconveniente. L\'applicazione ha riscontrato un problema imprevisto.',
      retry: 'Riprova',
      restart: 'Riavvia',
      home: 'Torna alla Home',
      reset: 'Reimposta',
      loading: 'Ripristino in corso...'
    },
    en: {
      title: 'An error occurred',
      description: 'We apologize for the inconvenience. The application has encountered an unexpected problem.',
      retry: 'Retry',
      restart: 'Restart',
      home: 'Back to Home',
      reset: 'Reset',
      loading: 'Recovering...'
    }
  };
  
  // Usa la lingua corrente o fallback a italiano
  const msg = messages[currentLanguage] || messages.it;
  
  return (
    <SafeAreaView style={[
      styles.errorContainer, 
      { paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 20 }
    ]}>
      <View style={styles.errorContent}>
        <Ionicons name="alert-circle" size={64} color="#E53935" />
        <Text style={styles.errorTitle}>{msg.title}</Text>
        <Text style={styles.errorDescription}>{msg.description}</Text>
        
        {config.isDevMode && error && (
          <View style={styles.errorDetailsContainer}>
            <Text style={styles.errorDetailsTitle}>Error Details (Dev Only):</Text>
            <Text style={styles.errorDetails}>{error.toString()}</Text>
          </View>
        )}
        
        <View style={styles.buttonContainer}>
          {isRecovering ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4F8EF7" />
              <Text style={styles.loadingText}>{msg.loading}</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={resetErrorBoundary}
              >
                <Text style={styles.buttonText}>{msg.retry}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]} 
                onPress={() => {
                  try {
                    router.replace('/');
                  } catch (e) {
                    console.error('Navigation error:', e);
                  }
                }}
              >
                <Text style={styles.secondaryButtonText}>{msg.home}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRecovering: false,
      retryCount: 0
    };
    
    // Assicura che le traduzioni siano caricate immediatamente
    ensureErrorMessages();
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isRecovering: false,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Assicura che le traduzioni siano disponibili quando si verifica un errore
    ensureErrorMessages();
    
    // Call the optional onError prop
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }
  
  componentDidUpdate(prevProps: Props): void {
    // Reset the error state if any of the resetKeys have changed
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys &&
      this.props.resetKeys.some((value, index) => value !== prevProps.resetKeys[index])
    ) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = async (): Promise<void> => {
    this.setState({
      isRecovering: true
    });
    
    try {
      // Increment retry count
      const newRetryCount = this.state.retryCount + 1;
      
      // Log the error for diagnostics
      if (this.state.error) {
        console.log('Error details:', this.state.error.message);
        console.log('Error stack:', this.state.error.stack);
        
        // Check for session-specific errors
        const errorMsg = this.state.error.message?.toLowerCase() || '';
        const errorStack = this.state.error.stack?.toLowerCase() || '';
        
        // Gestione specifica per errori di sessione o rendering React con controlli migliorati
        if (errorMsg.includes('session') || 
            errorMsg.includes('undefined is not an object') ||
            errorStack.includes('session') ||
            errorMsg.includes('cannot read property') ||
            errorMsg.includes('null is not an object') ||
            errorMsg.includes('cannot read properties of undefined') ||
            errorMsg.includes('cannot read properties of null')) {
          console.log('Detected possible session issue, trying session-specific recovery...');
          
          // Try to reset session services and cache
          try {
            // Prima importa i servizi necessari
            const sessionService = require('../lib/services/session.service');
            
            // Prova a reinizializzare completamente il servizio delle sessioni
            await sessionService.initSessionService();
            console.log('Re-initialized session service');
            
            // Controlla l'integrità delle sessioni
            const integrityCheck = await sessionService.ensureSessionIntegrity();
            console.log('Session integrity check result:', integrityCheck);
            
            // Se siamo in un errore critico e abbiamo fatto più tentativi,
            // prova a resettare completamente la sessione attiva
            if (newRetryCount >= 2) {
              console.log('Multiple recovery attempts, trying to reset active session...');
              
              // Termina la sessione attiva se esiste
              const sessionEnded = await sessionService.endSession();
              console.log('Active session termination result:', sessionEnded);
              
              // Attendi un momento per permettere che venga elaborata la rimozione della sessione
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (e) {
            console.error('Error during session service recovery:', e);
          }
          
          // Se l'errore è veramente critico, tenta di navigare alla dashboard
          if (newRetryCount >= 3) {
            try {
              const { router } = require('expo-router');
              console.log('Critical error, navigating to dashboard...');
              setTimeout(() => {
                try {
                  router.replace('/dashboard');
                } catch (navError) {
                  console.error('Navigation error:', navError);
                }
              }, 500);
            } catch (routerError) {
              console.error('Router import error:', routerError);
            }
          }
        }
      }
      
      // If we've tried multiple times and still getting errors, do a more thorough cleanup
      if (newRetryCount >= 3) {
        console.log('Multiple recovery attempts failed, performing deep cleanup...');
        
        // Reset auth state
        await resetAuthState();
        
        // Reset any stored JWT tokens
        await clearStoredAuthSessions();
        
        // Preserve language preference
        const language = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        
        // Clear all other data from storage
        await AsyncStorage.clear();
        
        // Restore language preference
        if (language) {
          await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        }
        
        // Try to redirect to the root
        try {
          router.replace('/');
        } catch (e) {
          console.error('Navigation error during deep recovery:', e);
        }
      }
      
      // Reset the error state
      this.setState({
        hasError: false,
        error: null,
        isRecovering: false,
        retryCount: newRetryCount
      });
    } catch (e) {
      console.error('Error during recovery:', e);
      
      // If recovery fails, stay in error state but stop the recovery spinner
      this.setState({
        isRecovering: false
      });
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use fallback if provided, otherwise use default error screen
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <ErrorScreen 
          error={this.state.error as Error} 
          resetErrorBoundary={this.resetErrorBoundary}
          isRecovering={this.state.isRecovering} 
        />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContent: {
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorDetailsContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 20,
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorDetails: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 10,
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: '#4F8EF7',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4F8EF7',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#4F8EF7',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  }
});

export default ErrorBoundary; 