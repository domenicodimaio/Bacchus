import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import AppHeader from '../components/AppHeader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;

  // 🔥 FIX: Configura swipe back come nelle Impostazioni
  useEffect(() => {
    // Supporta lo swipe back su iOS
    if (Platform.OS === 'ios' && navigation) {
      navigation.setOptions({
        gestureEnabled: true,
        gestureDirection: 'horizontal'
      });
    }
  }, [navigation]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader 
          title={t('privacyPolicy', { ns: 'common', defaultValue: 'Privacy Policy' })}
          isMainScreen={false}
          onBackPress={() => router.back()}
        />
        
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.headerText, { color: colors.text }]}>
            {t('privacyPolicyHeader', { ns: 'common', defaultValue: 'Privacy Policy di Bacchus' })}
          </Text>
          
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
            {t('privacyPolicyLastUpdated', { ns: 'common', defaultValue: 'Ultimo aggiornamento: 25 Ottobre 2025' })}
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              1. {t('introduction', { ns: 'common', defaultValue: 'Introduzione' })}
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyIntro', { ns: 'common', defaultValue: 'Questa Privacy Policy descrive come Bacchus ("noi", "nostro" o "ci") raccoglie, utilizza e protegge le tue informazioni personali quando utilizzi la nostra applicazione mobile ("Servizio").' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              2. {t('dataCollection', { ns: 'common', defaultValue: 'Raccolta Dati' })}
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyDataCollection', { ns: 'common', defaultValue: 'Raccogliamo i seguenti tipi di informazioni: Informazioni del Profilo (Nome, peso, altezza, età, sesso e abitudini di consumo per i calcoli BAC), Dati di Utilizzo (Dati delle sessioni, bevande consumate e statistiche di utilizzo dell\'app), Informazioni del Dispositivo (Tipo di dispositivo, sistema operativo e versione dell\'app), Dati di Autenticazione (Indirizzo email e token di autenticazione crittografati)' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              3. {t('dataUse', { ns: 'common', defaultValue: 'Come Utilizziamo i Tuoi Dati' })}
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyDataUse', { ns: 'common', defaultValue: 'Le tue informazioni sono utilizzate per fornire calcoli BAC accurati, salvare la cronologia delle tue sessioni, migliorare le funzionalità dell\'app, fornire supporto clienti e garantire la sicurezza dell\'app.' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              4. {t('dataSharing', { ns: 'common', defaultValue: 'Condivisione Dati' })}
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyDataSharing', { ns: 'common', defaultValue: 'Non vendiamo, scambiamo o affittiamo le tue informazioni personali a terze parti. Potremmo condividere i dati solo in questi casi: Con il tuo consenso esplicito, Per rispettare obblighi legali, Per proteggere i nostri diritti e sicurezza.' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              5. {t('dataSecurity', { ns: 'common', defaultValue: 'Sicurezza dei Dati' })}
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyDataSecurity', { ns: 'common', defaultValue: 'Implementiamo misure di sicurezza appropriate per proteggere le tue informazioni: Trasmissione dati crittografata, Archiviazione cloud sicura, Audit di sicurezza regolari, Accesso limitato ai dati personali.' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              6. {t('yourRights', { ns: 'common', defaultValue: 'I Tuoi Diritti' })}
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyYourRights', { ns: 'common', defaultValue: 'Hai il diritto di accedere ai tuoi dati personali, correggere informazioni inesatte, eliminare il tuo account e i dati, esportare i tuoi dati e ritirare il consenso in qualsiasi momento.' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              7. {t('dataRetention', { ns: 'common', defaultValue: 'Conservazione dei Dati' })}
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyDataRetention', { ns: 'common', defaultValue: 'Conserviamo i tuoi dati solo per il tempo necessario a fornire i nostri servizi. I dati delle sessioni vengono conservati finché mantieni il tuo account attivo. Puoi eliminare i tuoi dati in qualsiasi momento dalle impostazioni dell\'app.' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              8. {t('minors', { ns: 'common', defaultValue: 'Minori' })}
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyMinors', { ns: 'common', defaultValue: 'Bacchus è destinata a utenti maggiorenni. Non raccogliamo consapevolmente dati di minori di 18 anni. Se vieni a conoscenza che un minore ha fornito dati personali, contattaci immediatamente.' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              9. {t('policyChanges', { ns: 'common', defaultValue: 'Modifiche alla Privacy Policy' })}
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyChanges', { ns: 'common', defaultValue: 'Potremmo aggiornare questa Privacy Policy periodicamente. Ti notificheremo eventuali modifiche significative tramite l\'app o via email. L\'uso continuato dell\'app dopo le modifiche costituisce accettazione della nuova policy.' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              10. {t('contacts', { ns: 'common', defaultValue: 'Contatti' })}
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyContact', { ns: 'common', defaultValue: 'Per domande su questa Privacy Policy, contattaci a support@bacchusapp.com.' })}
            </Text>
          </View>

          <View style={[styles.disclaimer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
              <Text style={{ fontWeight: '600' }}>⚠️ {t('important', { ns: 'common', defaultValue: 'Importante' })}:</Text> {t('importantDisclaimerText', { ns: 'common', defaultValue: 'Bacchus è uno strumento di supporto e non deve essere utilizzato come unico riferimento per decisioni sulla guida. Il calcolo del tasso alcolemico è indicativo e può variare significativamente tra individui.' })}
            </Text>
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
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  disclaimer: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  disclaimerText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
