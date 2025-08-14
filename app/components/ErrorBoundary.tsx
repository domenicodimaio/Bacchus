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
    
    // Define static translations for error handling
    const errorTranslations = {
      it: {
        common: require('../locales/it/common.json')
      },
      en: {
        common: require('../locales/en/common.json')
      }
    };
    
    // Assicurati che almeno il namespace 'common' sia caricato in entrambe le lingue
    for (const lang of SUPPORTED_LANGUAGES) {
      try {
        // Se non è caricato, carica almeno 'common'
        if (!i18n.hasResourceBundle(lang, 'common')) {
          console.log(`ErrorBoundary: caricamento forzato namespace common in ${lang}`);
          
          // Carica direttamente il bundle per i messaggi di errore
          i18n.addResourceBundle(lang, 'common', errorTranslations[lang].common, true, true);
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
  resetErrorBoundary
}: { 
  error: Error; 
  resetErrorBoundary: () => void;
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
      retryCount: 0
    };
    
    // Assicura che le traduzioni siano caricate immediatamente
    ensureErrorMessages();
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
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

  resetErrorBoundary = (): void => {
    console.log('🔄 ErrorBoundary: Semplice reset...');
      
    // 1. Pulisci solo flag globali critici (sincrono)
      if (typeof global !== 'undefined') {
        global.__WIZARD_AFTER_REGISTRATION__ = false;
        global.__LOGIN_REDIRECT_IN_PROGRESS__ = false;
        global.__PREVENT_ALL_REDIRECTS__ = false;
        global.__BLOCK_ALL_SCREENS__ = false;
      }
      
    // 2. Resetta solo lo stato interno dell'ErrorBoundary
      this.setState({
        hasError: false,
        error: null,
        retryCount: 0
      });
      
      console.log('🔄 ErrorBoundary: Reset completato');
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