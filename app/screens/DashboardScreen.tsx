import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import * as sessionService from '../lib/services/session.service';
import ProfileCard from '../components/ProfileCard';
import BACDisplay from '../components/BACDisplay';
import SessionButtons from '../components/SessionButtons';
import NoActiveSessionMessage from '../components/NoActiveSessionMessage';
import { Session } from '../types/session';
import { DrinkRecord } from '../lib/bac/visualization';
import { formatTimeSinceStart } from '../utils/dateFormatter';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Chiave per forzare il re-render

  // Aggiungiamo un metodo per ricaricare i dati della sessione attiva
  const loadActiveSession = useCallback(() => {
    console.log('Caricamento sessione attiva...');
    
    // Ottieni la sessione attiva direttamente dal servizio
    const session = sessionService.getActiveSession();
    
    if (session) {
      console.log(`Sessione attiva trovata: ${session.id}`);
      // Aggiorna il BAC per assicurarci che sia attuale
      sessionService.updateSessionBAC();
      // Ottieni la sessione aggiornata
      const updatedSession = sessionService.getActiveSession();
      setActiveSession(updatedSession);
      setHasActiveSession(true);
    } else {
      console.log('Nessuna sessione attiva trovata');
      setActiveSession(null);
      setHasActiveSession(false);
    }
  }, []);
  
  // Forza un aggiornamento completo della dashboard
  const forceRefresh = useCallback(() => {
    console.log('Forzando refresh completo della dashboard');
    setRefreshKey(prev => prev + 1);
    loadActiveSession();
  }, [loadActiveSession]);

  // Utilizziamo useFocusEffect per ricaricare la sessione ogni volta che la schermata ottiene il focus
  useFocusEffect(
    useCallback(() => {
      console.log('Dashboard screen focused, reloading active session...');
      
      // Aggiorna immediatamente quando la schermata ottiene il focus
      loadActiveSession();
      
      // Imposta un interval per aggiornare il BAC mentre la schermata è visibile
      const bacUpdateInterval = setInterval(() => {
        // Verifica che la sessione sia ancora attiva prima di aggiornare
        if (sessionService.getActiveSession()) {
          console.log('Aggiornamento periodico BAC');
          sessionService.updateSessionBAC();
          loadActiveSession();
        } else {
          console.log('Nessuna sessione attiva da aggiornare');
          loadActiveSession(); // Aggiorna comunque per assicurarci che lo stato sia corretto
        }
      }, 30000); // Aggiorna ogni 30 secondi
      
      // Configurazione listener per cambiamenti di stato dell'app
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
          console.log('App tornata in primo piano, aggiornamento sessione');
          loadActiveSession();
        }
      });
      
      // Cleanup quando il componente perde il focus
      return () => {
        clearInterval(bacUpdateInterval);
        subscription.remove();
      };
    }, [loadActiveSession])
  );

  useEffect(() => {
    // Inizializzazione iniziale al caricamento del componente
    const initializeDashboard = async () => {
      try {
        console.log('=== INIZIALIZZAZIONE DASHBOARD ===');
        // Inizializza il servizio delle sessioni
        await sessionService.initSessionService();
        
        // Verifica e ripara eventuali problemi di integrità delle sessioni
        console.log('Verifica integrità sessioni...');
        await sessionService.ensureSessionIntegrity();
        
        // Carica la sessione attiva
        loadActiveSession();
        
        console.log('Dashboard inizializzata correttamente');
      } catch (error) {
        console.error('Errore durante l\'inizializzazione della dashboard:', error);
      }
    };
    
    initializeDashboard();
  }, [loadActiveSession]);

  const handleStartSession = () => {
    navigation.navigate('SessionNew' as never);
  };

  const handleAddDrink = () => {
    navigation.navigate('SessionAddDrink' as never);
  };

  const handleAddFood = () => {
    navigation.navigate('SessionAddFood' as never);
  };

  const handleEndSession = async () => {
    try {
      console.log('=== TERMINAZIONE SESSIONE ===');
      
      if (activeSession) {
        // Termina la sessione
        const result = await sessionService.endSession();
        console.log(`Terminazione sessione: ${result ? 'successo' : 'fallita'}`);
        
        // Aggiorna immediatamente lo stato interno
        setActiveSession(null);
        setHasActiveSession(false);
        
        // Verifica che la sessione sia stata realmente eliminata
        setTimeout(() => {
          // Ricontrolla che non ci siano sessioni attive
          const checkSession = sessionService.getActiveSession();
          
          if (checkSession) {
            console.log('Sessione ancora presente, forzando rimozione');
            // Forza una seconda eliminazione se necessario
            sessionService.endSession().then(() => {
              forceRefresh();
            });
          } else {
            console.log('Sessione correttamente terminata');
            forceRefresh();
          }
        }, 500);
      }
    } catch (error) {
      console.error('Errore durante la chiusura della sessione:', error);
      // Forza comunque un aggiornamento in caso di errore
      forceRefresh();
    }
  };

  // Usa la chiave di refresh per forzare il re-render quando necessario
  return (
    <View style={styles.container} key={`dashboard-${refreshKey}`}>
      {hasActiveSession ? (
        <>
          <ProfileCard 
            profile={activeSession?.profile}
            sessionStart={activeSession?.startTime}
            sessionDuration={activeSession?.sessionDuration}
          />
          
          <BACDisplay 
            bac={activeSession?.currentBAC || 0}
            timeToSober={activeSession?.soberTime || '0:00'}
            timeToLegal={activeSession?.legalTime || '0:00'}
            showTimeToSober={true}
          />
          
          <SessionButtons 
            onAddDrink={handleAddDrink}
            onAddFood={handleAddFood}
            onEndSession={handleEndSession}
          />
        </>
      ) : (
        <NoActiveSessionMessage onStartSession={handleStartSession} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
}); 