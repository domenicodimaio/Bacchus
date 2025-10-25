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
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyIntro', { ns: 'common', defaultValue: 'Questa Privacy Policy descrive come Bacchus ("noi", "nostro" o "ci") raccoglie, utilizza e protegge le tue informazioni personali quando utilizzi la nostra applicazione mobile ("Servizio").' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyDataCollection', { ns: 'common', defaultValue: '**Raccolta Dati**\n\nRaccogliamo i seguenti tipi di informazioni:\n\n• **Informazioni del Profilo**: Nome, peso, altezza, età, sesso e abitudini di consumo per i calcoli BAC\n• **Dati di Utilizzo**: Dati delle sessioni, bevande consumate e statistiche di utilizzo dell\'app\n• **Informazioni del Dispositivo**: Tipo di dispositivo, sistema operativo e versione dell\'app\n• **Dati di Autenticazione**: Indirizzo email e token di autenticazione crittografati' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyDataUse', { ns: 'common', defaultValue: '**Come Utilizziamo i Tuoi Dati**\n\nLe tue informazioni sono utilizzate per:\n\n• Fornire calcoli BAC accurati\n• Salvare la cronologia delle tue sessioni\n• Migliorare le funzionalità dell\'app\n• Fornire supporto clienti\n• Garantire la sicurezza dell\'app' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyDataSharing', { ns: 'common', defaultValue: '**Condivisione Dati**\n\nNon vendiamo, scambiamo o affittiamo le tue informazioni personali a terze parti. Potremmo condividere i dati solo in questi casi:\n\n• Con il tuo consenso esplicito\n• Per rispettare obblighi legali\n• Per proteggere i nostri diritti e sicurezza' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('privacyPolicyDataSecurity', { ns: 'common', defaultValue: '**Sicurezza dei Dati**\n\nImplementiamo misure di sicurezza appropriate per proteggere le tue informazioni:\n\n• Trasmissione dati crittografata\n• Archiviazione cloud sicura\n• Audit di sicurezza regolari\n• Accesso limitato ai dati personali' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              6. I Tuoi Diritti
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Hai il diritto di:{'\n'}
              • Accedere ai tuoi dati personali{'\n'}
              • Correggere dati inesatti o incompleti{'\n'}
              • Eliminare i tuoi dati (diritto all'oblio){'\n'}
              • Esportare i tuoi dati in formato leggibile{'\n'}
              • Limitare il trattamento dei tuoi dati{'\n'}
              • Revocare il consenso in qualsiasi momento
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              7. Conservazione dei Dati
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Conserviamo i tuoi dati solo per il tempo necessario a fornire i nostri servizi. I dati delle sessioni vengono conservati finché mantieni il tuo account attivo. Puoi eliminare i tuoi dati in qualsiasi momento dalle impostazioni dell'app.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              8. Minori
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Bacchus è destinata a utenti maggiorenni. Non raccogliamo consapevolmente dati di minori di 18 anni. Se vieni a conoscenza che un minore ha fornito dati personali, contattaci immediatamente.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              9. Modifiche alla Privacy Policy
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Potremmo aggiornare questa Privacy Policy periodicamente. Ti notificheremo eventuali modifiche significative tramite l'app o via email. L'uso continuato dell'app dopo le modifiche costituisce accettazione della nuova policy.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              10. Contatti
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Per domande su questa Privacy Policy o sui tuoi dati personali, contattaci a:{'\n\n'}
              <Text style={{ fontWeight: '600' }}>Email:</Text> privacy@bacchusapp.com{'\n'}
              <Text style={{ fontWeight: '600' }}>Supporto:</Text> support@bacchusapp.com
            </Text>
          </View>

          <View style={[styles.disclaimer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
              <Text style={{ fontWeight: '600' }}>⚠️ Importante:</Text> Bacchus è uno strumento di supporto e non deve essere utilizzato come unico riferimento per decisioni sulla guida. Il calcolo del tasso alcolemico è indicativo e può variare significativamente tra individui.
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
