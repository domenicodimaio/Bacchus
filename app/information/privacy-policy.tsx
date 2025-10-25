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
              1. Introduzione
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Bacchus ("noi", "la nostra app") rispetta la tua privacy e si impegna a proteggere i tuoi dati personali. Questa Privacy Policy spiega come raccogliamo, utilizziamo e proteggiamo le tue informazioni quando utilizzi la nostra applicazione mobile.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              2. Dati che Raccogliamo
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              <Text style={{ fontWeight: '600' }}>Dati del Profilo:</Text> Nome, età, peso, altezza, sesso - necessari per il calcolo del tasso alcolemico.{'\n\n'}
              <Text style={{ fontWeight: '600' }}>Dati delle Sessioni:</Text> Informazioni sui consumi di alcol, orari, quantità - per tracciare le tue sessioni.{'\n\n'}
              <Text style={{ fontWeight: '600' }}>Dati Tecnici:</Text> Tipo di dispositivo, versione dell'app, log di errori - per migliorare l'app.{'\n\n'}
              <Text style={{ fontWeight: '600' }}>Dati di Autenticazione:</Text> Email (se crei un account) - per sincronizzare i dati tra dispositivi.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              3. Come Utilizziamo i Tuoi Dati
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              • Calcolare il tuo tasso alcolemico stimato{'\n'}
              • Salvare e sincronizzare la cronologia delle tue sessioni{'\n'}
              • Fornire statistiche personalizzate sui tuoi consumi{'\n'}
              • Migliorare l'accuratezza dei calcoli{'\n'}
              • Risolvere problemi tecnici e migliorare l'app{'\n'}
              • Comunicare aggiornamenti importanti sull'app
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              4. Condivisione dei Dati
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              <Text style={{ fontWeight: '600' }}>Non vendiamo mai i tuoi dati personali.</Text>{'\n\n'}
              Possiamo condividere dati solo in questi casi:{'\n'}
              • Con fornitori di servizi cloud (Supabase) per il backup sicuro{'\n'}
              • Se richiesto dalla legge o dalle autorità competenti{'\n'}
              • Per proteggere i diritti e la sicurezza degli utenti{'\n'}
              • Dati anonimi e aggregati per ricerca e miglioramenti
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              5. Sicurezza dei Dati
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Implementiamo misure di sicurezza appropriate per proteggere i tuoi dati:{'\n'}
              • Crittografia dei dati in transito e a riposo{'\n'}
              • Accesso limitato ai dati solo al personale autorizzato{'\n'}
              • Monitoraggio regolare per rilevare accessi non autorizzati{'\n'}
              • Backup sicuri e ridondanti dei tuoi dati
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
