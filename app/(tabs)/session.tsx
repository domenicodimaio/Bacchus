import React, { useEffect, useState } from 'react';
import { useRouter, Slot } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import ErrorBoundary from '../components/ErrorBoundary';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import * as sessionService from '../lib/services/session.service';

/**
 * Questo componente è un layout che gestisce la navigazione alla sessione.
 * Se esiste una sessione attiva, renderizza il contenuto della sessione.
 * Altrimenti reindirizza alla dashboard.
 */
export default function SessionLayout() {
  const router = useRouter();
  const { t } = useTranslation(['session', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Verifica la sessione e gestisci la navigazione
  useEffect(() => {
    let isMounted = true;
    const maxRetries = 2;

    // Funzione per verificare la sessione con tentativi multipli
    const checkSession = async () => {
      try {
        if (!isMounted) return;
        
        setLoading(true);
        console.log('SessionLayout: Verifica sessione attiva...');
        
        // Inizializza il servizio delle sessioni se necessario
        await sessionService.initSessionService();
        
        // Verifica se esiste una sessione attiva
        const activeSession = sessionService.getActiveSession();
        
        if (!activeSession) {
          console.log('SessionLayout: Nessuna sessione attiva trovata, reindirizzamento alla dashboard');
          if (isMounted) {
            setSessionChecked(true);
            setLoading(false);
            
            // Usa setTimeout per prevenire problemi di navigazione durante il rendering
            setTimeout(() => {
              if (isMounted) {
                router.replace('/dashboard');
              }
            }, 100);
          }
        } else {
          console.log('SessionLayout: Sessione attiva trovata');
          if (isMounted) {
            setSessionChecked(true);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('SessionLayout: Errore nella verifica della sessione:', err);
        
        if (isMounted) {
          if (retryCount < maxRetries) {
            // Riprova fino al numero massimo di tentativi
            setRetryCount(prev => prev + 1);
            setTimeout(checkSession, 500); // Aspetta 500ms prima di riprovare
          } else {
            // Se tutti i tentativi falliscono, mostra l'errore e reindirizza
            setError(err instanceof Error ? err : new Error('Errore sconosciuto'));
            setLoading(false);
            
            // Mostra un avviso e reindirizza alla dashboard
            Alert.alert(
              t('error', { ns: 'common', defaultValue: 'Errore' }),
              t('errorLoadingSession', { ns: 'session', defaultValue: 'Errore nel caricamento della sessione' }),
              [
                { 
                  text: t('ok', { ns: 'common', defaultValue: 'OK' }), 
                  onPress: () => router.replace('/dashboard') 
                }
              ]
            );
          }
        }
      }
    };
    
    // Avvia il controllo della sessione
    checkSession();
    
    // Cleanup per evitare aggiornamenti di stato dopo lo smontaggio
    return () => {
      isMounted = false;
    };
  }, [router, t, retryCount]);
  
  // Mostra un indicatore di caricamento
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {t('loading', { ns: 'common', defaultValue: 'Caricamento...' })}
        </Text>
      </View>
    );
  }
  
  // Se c'è un errore, mostra un messaggio
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t('errorLoadingSession', { ns: 'session', defaultValue: 'Errore nel caricamento della sessione' })}
        </Text>
      </View>
    );
  }
  
  // Se la sessione è stata verificata e siamo ancora in questa schermata, renderizza il contenuto
  if (sessionChecked) {
    // Renderizza il contenuto della tab con un ErrorBoundary
    return (
      <ErrorBoundary 
        onError={(error) => {
          console.error('ErrorBoundary caught error in SessionLayout:', error);
          // Se c'è un errore critico, naviga alla dashboard dopo un breve ritardo
          setTimeout(() => {
            router.replace('/dashboard');
          }, 1000);
        }}
      >
        <Slot />
      </ErrorBoundary>
    );
  }
  
  // Fallback - non dovremmo mai arrivare qui, ma per sicurezza
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  }
}); 