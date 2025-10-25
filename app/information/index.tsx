import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, StyleSheet, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AppHeader from '../components/AppHeader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';

export default function Information() {
  const { t } = useTranslation();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const isMounted = useRef(true);

  // Get app version from Constants
  const appVersion = Constants?.expoConfig?.version || '1.2.2';
  const appBuild = Constants?.expoConfig?.ios?.buildNumber || '2517';

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 🔧 FIX CRASH: Gestione sicura degli errori
  const handleError = (error: any) => {
    console.error('Information screen error:', error);
    // Non fare nulla per evitare crash
  };

  // 🔧 FIX SWIPE BACK: Funzioni per le azioni
  const handleContactSupport = () => {
    const email = 'support@bacchusapp.com';
    const subject = 'Richiesta Supporto - Bacchus App';
    const body = `Ciao team Bacchus,\n\nHo bisogno di assistenza con l'app.\n\nVersione app: ${appVersion} (${appBuild})\nDispositivo: ${Platform.OS}\n\nDescrizione del problema:\n[Descrivi qui il tuo problema]\n\nGrazie!`;
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(mailtoUrl);
  };

  const handleOpenFAQ = () => {
    router.push('/information/faq');
  };

  const handleOpenPrivacyPolicy = () => {
    router.push('/information/privacy-policy');
  };

  const handleOpenTermsOfService = () => {
    router.push('/information/terms-of-service');
  };

  const handleOpenHelpCenter = () => {
    router.push('/information/help-center');
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={currentTheme.statusBarStyle} backgroundColor={colors.background} />
        
        <AppHeader 
          title={t('information', { ns: 'profile', defaultValue: 'Informazioni' })}
          onBackPress={() => router.back()}
        />
        
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Info su Bacchus
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Bacchus è un'applicazione progettata per aiutarti a monitorare il tuo consumo di alcol e valutare il tasso alcolemico nel sangue (BAC).
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary, fontWeight: '600', marginTop: 12 }]}>
              ⚠️ IMPORTANTE: Questa app è solo un supporto per avere un'idea del tasso alcolemico e NON è uno strumento su cui affidarsi totalmente prima di mettersi alla guida. Il calcolo è indicativo e può variare in base a molti fattori individuali.
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary, marginTop: 12 }]}>
              Versione: {appVersion} ({appBuild})
            </Text>
          </View>
          
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('help', { ns: 'profile' })}
            </Text>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={handleOpenHelpCenter}
            >
              <Ionicons name="help-circle-outline" size={24} color={colors.primary} style={styles.linkIcon} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                Centro Assistenza
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={handleOpenFAQ}
            >
              <Ionicons name="list-outline" size={24} color={colors.primary} style={styles.linkIcon} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                FAQ
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Privacy Policy
            </Text>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={handleOpenPrivacyPolicy}
            >
              <Ionicons name="shield-outline" size={24} color={colors.primary} style={styles.linkIcon} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                Leggi Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Termini di Servizio
            </Text>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={handleOpenTermsOfService}
            >
              <Ionicons name="document-text-outline" size={24} color={colors.primary} style={styles.linkIcon} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                Leggi Termini di Servizio
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Contattaci
            </Text>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={handleContactSupport}
            >
              <Ionicons name="mail-outline" size={24} color={colors.primary} style={styles.linkIcon} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                Contattaci
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </GestureHandlerRootView>
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