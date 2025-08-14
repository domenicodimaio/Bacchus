import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AppHeader from '../components/AppHeader';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

export default function Information() {
  const { t } = useTranslation();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 🔧 FIX CRASH: Gestione swipe semplificata e sicura
  const swipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Solo feedback visivo, niente animazioni complesse
      if (Math.abs(event.translationX) > 50) {
        // Mostra feedback visivo
      }
    })
    .onEnd((event) => {
      if (!isMounted.current) return;
      
      try {
        if (event.translationX > 100) {
          console.log('🎯 INFORMATION SWIPE: Navigando alla dashboard...');
          // 🔧 NAVIGAZIONE SICURA: Usa push invece di replace per evitare problemi di stack
          router.push('/(tabs)/dashboard');
        }
      } catch (error) {
        console.log('Information: Navigation failed, using fallback');
        // Fallback: navigazione diretta
        router.push('/(tabs)/dashboard');
      }
    });

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        
        <AppHeader 
          title={t('information', { ns: 'profile' })}
          isMainScreen={false}
        />
        
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('aboutApp', { ns: 'profile' })}
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Bacchus è un'applicazione progettata per aiutarti a monitorare il tuo consumo di alcol e valutare il tasso alcolemico nel sangue (BAC).
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Versione: 1.0.0
            </Text>
          </View>
          
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('help', { ns: 'profile' })}
            </Text>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => {/* Azione per l'aiuto */}}
            >
              <Ionicons name="help-circle-outline" size={24} color={colors.primary} style={styles.linkIcon} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                Centro Assistenza
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => {/* Azione per l'FAQ */}}
            >
              <Ionicons name="list-outline" size={24} color={colors.primary} style={styles.linkIcon} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                FAQ
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('privacyPolicy', { ns: 'profile' })}
            </Text>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => {/* Azione per la privacy policy */}}
            >
              <Ionicons name="shield-outline" size={24} color={colors.primary} style={styles.linkIcon} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                Leggi Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('termsOfService', { ns: 'profile' })}
            </Text>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => {/* Azione per i termini di servizio */}}
            >
              <Ionicons name="document-text-outline" size={24} color={colors.primary} style={styles.linkIcon} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                Leggi Termini di Servizio
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('contact', { ns: 'profile' })}
            </Text>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => {/* Azione per contattare */}}
            >
              <Ionicons name="mail-outline" size={24} color={colors.primary} style={styles.linkIcon} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                Contattaci
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  linkIcon: {
    marginRight: 12,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 