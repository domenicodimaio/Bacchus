import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import supabase from '../lib/supabase/client';
import authService, { USER_DATA_KEY } from '../lib/services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Questo componente gestisce il callback dopo la conferma dell'email
 * È la destinazione del reindirizzamento quando un utente conferma la sua email
 */
export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentTheme } = useTheme();
  const [status, setStatus] = useState('Elaborazione autenticazione...');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      console.log('🔄 AUTH_CALLBACK: === INIZIO GESTIONE CALLBACK ===');
      console.log('🔄 AUTH_CALLBACK: Parametri ricevuti:', params);
      console.log('🔄 AUTH_CALLBACK: Chiavi parametri:', Object.keys(params));

      // Se ci sono parametri OAuth diretti, prova a gestirli
      if (params.access_token || params.refresh_token) {
        console.log('✅ AUTH_CALLBACK: Parametri OAuth diretti trovati');
        setStatus('Elaborazione token di autenticazione...');
        
        // Prova a impostare la sessione direttamente
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: String(params.access_token),
          refresh_token: String(params.refresh_token)
        });
        
        if (sessionError) {
          console.error('❌ AUTH_CALLBACK: Errore impostazione sessione:', sessionError);
        } else {
          console.log('✅ AUTH_CALLBACK: Sessione impostata con successo');
        }
      }

      // Attendi un momento per permettere a Supabase di processare la sessione
      setStatus('Verifica autenticazione...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verifica se l'utente è ora autenticato
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ AUTH_CALLBACK: Errore nel recupero utente:', error);
        setStatus('Errore durante l\'autenticazione');
        setTimeout(() => {
          router.replace('/auth/login');
        }, 2000);
        return;
      }

      if (user) {
        console.log('✅ AUTH_CALLBACK: Utente autenticato con successo via OAuth:', user.id);
        console.log('✅ AUTH_CALLBACK: Email utente:', user.email);
        setStatus('Autenticazione completata!');

        // Salva i dati dell'utente localmente
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify({
          id: user.id,
          email: user.email,
          createdAt: user.created_at
        }));

        // Autenticazione completata - lasciamo che NavigationHandler decida dove andare
        console.log('✅ AUTH_CALLBACK: OAuth completato, delego navigazione al NavigationHandler');
        setStatus('Autenticazione completata! Caricamento...');
        
        // Naviga alla dashboard - NavigationHandler rileverà lo stato e farà il redirect appropriato
            setTimeout(() => {
          router.replace('/(tabs)/dashboard');
          }, 1000);
      } else {
        console.log('❌ AUTH_CALLBACK: Nessun utente trovato dopo callback OAuth');
        setStatus('Autenticazione non riuscita');
        setTimeout(() => {
          router.replace('/auth/login');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ AUTH_CALLBACK: Errore durante la gestione del callback:', error);
      
      setStatus('Errore durante l\'autenticazione');
      setTimeout(() => {
        router.replace('/auth/login');
      }, 2000);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.COLORS.background }]}>
      <ActivityIndicator size="large" color={currentTheme.COLORS.primary} />
      <Text style={[styles.statusText, { color: currentTheme.COLORS.text }]}>
        {status}
      </Text>
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
  statusText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
}); 