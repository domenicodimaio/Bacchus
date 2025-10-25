import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import AppHeader from '../components/AppHeader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function TermsOfServiceScreen() {
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
          title={t('termsOfService', { ns: 'common', defaultValue: 'Termini di Servizio' })}
          isMainScreen={false}
          onBackPress={() => router.back()}
        />
        
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.headerText, { color: colors.text }]}>
            {t('termsOfServiceHeader', { ns: 'common', defaultValue: 'Termini di Servizio di Bacchus' })}
          </Text>
          
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
            {t('termsOfServiceLastUpdated', { ns: 'common', defaultValue: 'Ultimo aggiornamento: 25 Ottobre 2025' })}
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('termsOfServiceIntro', { ns: 'common', defaultValue: 'Scaricando, installando o utilizzando l\'applicazione Bacchus ("Servizio"), accetti di essere vincolato da questi Termini di Servizio ("Termini"). Se non accetti questi Termini, non utilizzare il Servizio.' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('termsOfServiceAcceptance', { ns: 'common', defaultValue: 'Utilizzando Bacchus, confermi di avere almeno 18 anni e la capacità legale di stipulare questo accordo. Se stai utilizzando il Servizio per conto di un\'organizzazione, dichiari di avere l\'autorità di vincolare tale organizzazione a questi Termini.' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('termsOfServiceDescription', { ns: 'common', defaultValue: 'Bacchus è un\'applicazione mobile che fornisce stime educative del contenuto di alcol nel sangue (BAC) basate sull\'input dell\'utente. Il Servizio è solo a scopo informativo ed educativo e non dovrebbe mai essere utilizzato per determinare l\'idoneità alla guida o all\'uso di macchinari.' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('termsOfServiceDisclaimer', { ns: 'common', defaultValue: 'ATTENZIONE: Bacchus fornisce solo stime. Il BAC effettivo può variare significativamente in base a numerosi fattori tra cui metabolismo, condizioni di salute, farmaci e consumo di cibo. Non affidarti mai solo a questa app per determinare se sei in grado di guidare. Utilizza sempre attrezzature professionali per l\'etilometro e rispetta le leggi locali.' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('termsOfServiceUserResponsibilities', { ns: 'common', defaultValue: 'Accetti di: Fornire informazioni accurate per i calcoli, Utilizzare il Servizio in modo responsabile e legale, Non affidarti solo all\'app per le decisioni di guida, Rispettare tutte le leggi e i regolamenti applicabili, Non tentare di decodificare o hackerare il Servizio' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('termsOfServiceProhibitedUses', { ns: 'common', defaultValue: 'Non puoi utilizzare il Servizio per: Prendere decisioni sulla guida o sull\'uso di macchinari, Fornire consigli medici o legali ad altri, Aggirare qualsiasi misura di sicurezza, Caricare contenuti dannosi o malevoli, Violare qualsiasi legge o regolamento applicabile' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('termsOfServiceLimitation', { ns: 'common', defaultValue: 'Bacchus e i suoi sviluppatori non saranno responsabili per eventuali danni diretti, indiretti, incidentali o consequenziali derivanti dall\'uso del Servizio. Utilizzi il Servizio a tuo rischio e responsabilità.' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('termsOfServiceTermination', { ns: 'common', defaultValue: 'Ci riserviamo il diritto di terminare o sospendere il tuo accesso al Servizio in qualsiasi momento, con o senza causa. Puoi anche terminare il tuo uso del Servizio in qualsiasi momento eliminando l\'applicazione.' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('termsOfServiceChanges', { ns: 'common', defaultValue: 'Potremmo aggiornare questi Termini di tanto in tanto. L\'uso continuato del Servizio dopo le modifiche costituisce accettazione dei nuovi Termini. Notificheremo agli utenti le modifiche significative tramite l\'app o email.' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('termsOfServiceContact', { ns: 'common', defaultValue: 'Per domande su questi Termini, contattaci a: support@bacchusapp.com' })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              10. Legge Applicabile
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Questi Termini sono regolati dalle leggi italiane. Eventuali controversie saranno risolte presso i tribunali competenti in Italia.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              11. Modifiche ai Termini
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Ci riserviamo il diritto di modificare questi Termini in qualsiasi momento. Le modifiche saranno pubblicate nell'App e entreranno in vigore immediatamente. L'uso continuato dell'App costituisce accettazione dei Termini modificati.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              12. Contatti
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Per domande sui Termini di Servizio, contattaci a:{'\n\n'}
              <Text style={{ fontWeight: '600' }}>Email:</Text> legal@bacchusapp.com{'\n'}
              <Text style={{ fontWeight: '600' }}>Supporto:</Text> support@bacchusapp.com
            </Text>
          </View>

          <View style={[styles.warningBox, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
            <Text style={[styles.warningText, { color: colors.error }]}>
              <Text style={{ fontWeight: '700' }}>🚨 AVVERTENZA FINALE:</Text>{'\n\n'}
              Bacchus è SOLO uno strumento di supporto. NON guidare mai se hai consumato alcol, indipendentemente da quello che mostra l'app. La tua sicurezza e quella degli altri è la priorità assoluta.
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
  warningBox: {
    marginTop: 32,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
  },
  warningText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
  },
});
