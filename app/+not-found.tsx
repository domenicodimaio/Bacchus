import React, { useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from './contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotFoundScreen() {
  const { currentTheme } = useTheme();
  const { t } = useTranslation(['common']);
  const router = useRouter();
  const params = useLocalSearchParams();
  
  useEffect(() => {
    console.log('🔍 NOT_FOUND: Parametri ricevuti:', params);
    console.log('🔍 NOT_FOUND: Tutte le chiavi:', Object.keys(params));
    
    // Se ci sono parametri di autenticazione OAuth, reindirizza al callback
    if (params.access_token || params.code || params.type || params.token_type || params.refresh_token) {
      console.log('✅ NOT_FOUND: Parametri OAuth trovati, redirect al callback');
      
      // Costruisci i parametri per il callback
      const callbackParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key]) {
          callbackParams.set(key, String(params[key]));
        }
      });
      
      console.log('🔄 NOT_FOUND: Parametri callback:', callbackParams.toString());
      
      // Reindirizza al callback con tutti i parametri
      router.replace(`/auth/auth-callback?${callbackParams.toString()}`);
      return;
    }
    
    // Se l'URL sembra essere un callback di autenticazione ma senza parametri standard
    // (a volte Apple invia parametri con nomi diversi)
    const hasAnyAuthParam = Object.keys(params).some(key => 
      key.includes('token') || 
      key.includes('code') || 
      key.includes('auth') || 
      key.includes('state') ||
      key === 'type'
    );
    
    if (hasAnyAuthParam) {
      console.log('⚠️ NOT_FOUND: Possibili parametri auth non standard trovati:', Object.keys(params));
      
      // Costruisci i parametri per il callback
      const callbackParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key]) {
          callbackParams.set(key, String(params[key]));
        }
      });
      
      router.replace(`/auth/auth-callback?${callbackParams.toString()}`);
      return;
    }
    
    // Se non ci sono parametri di auth, mostra la pagina not found normale
    console.log('❌ NOT_FOUND: Nessun parametro OAuth trovato, mostrando pagina 404');
  }, [params, router]);
  
  const handleGoHome = () => {
    // 🔧 FIX CRITICO: Navigazione intelligente basata sullo stato utente
    console.log('[NOT_FOUND] Tentativo navigazione home intelligente...');
    
    try {
      // 🔧 FIX: Usa il percorso tabs invece del percorso standalone che causa conflitti
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      console.error('[NOT_FOUND] Errore navigazione dashboard, provo login:', error);
      try {
        // Fallback: vai al login
        router.replace('/auth/login');
      } catch (fallbackError) {
        console.error('[NOT_FOUND] Errore anche con login, provo index:', fallbackError);
        try {
          // Ultimo tentativo: index page
          router.replace('/');
        } catch (finalError) {
          console.error('[NOT_FOUND] Tutti i fallback falliti:', finalError);
          // Non fare nulla, evita crash
        }
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.COLORS.background }]}>
      <View style={styles.content}>
        <Ionicons name="alert-circle-outline" size={80} color={currentTheme.COLORS.error} />
        
        <Text style={[styles.title, { color: currentTheme.COLORS.text }]}>
          {t('pageNotFound', { defaultValue: 'Pagina non trovata' })}
        </Text>
        
        <Text style={[styles.subtitle, { color: currentTheme.COLORS.textSecondary }]}>
          {t('pageNotFoundDescription', { defaultValue: 'La pagina che stai cercando non esiste o è stata spostata.' })}
        </Text>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: currentTheme.COLORS.primary }]}
          onPress={handleGoHome}
        >
          <Text style={styles.buttonText}>
            {t('goHome', { defaultValue: 'Torna alla home' })}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 