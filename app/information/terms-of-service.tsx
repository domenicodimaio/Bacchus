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
            Termini di Servizio di Bacchus
          </Text>
          
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
            Ultimo aggiornamento: 25 Ottobre 2025
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              1. Accettazione dei Termini
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Utilizzando l'applicazione Bacchus ("l'App"), accetti di essere vincolato da questi Termini di Servizio. Se non accetti questi termini, non utilizzare l'App.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              2. Descrizione del Servizio
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Bacchus è un'applicazione mobile progettata per aiutare gli utenti a monitorare il consumo di alcol e fornire stime indicative del tasso alcolemico nel sangue (BAC). L'App utilizza algoritmi basati su formule scientifiche riconosciute, ma i risultati sono puramente indicativi.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              3. Limitazioni e Disclaimer Importanti
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: colors.error }}>⚠️ ATTENZIONE - LEGGERE ATTENTAMENTE:</Text>{'\n\n'}
              
              <Text style={{ fontWeight: '600' }}>3.1 Solo Scopo Informativo:</Text> Bacchus fornisce solo stime indicative del BAC. NON è un dispositivo medico e NON deve essere utilizzato per prendere decisioni sulla guida.{'\n\n'}
              
              <Text style={{ fontWeight: '600' }}>3.2 Variabilità Individuale:</Text> Il metabolismo dell'alcol varia significativamente tra individui in base a peso, altezza, sesso, età, salute, farmaci, cibo consumato e molti altri fattori.{'\n\n'}
              
              <Text style={{ fontWeight: '600' }}>3.3 Nessuna Garanzia di Accuratezza:</Text> Non garantiamo l'accuratezza dei calcoli. I risultati possono differire significativamente dai valori reali.{'\n\n'}
              
              <Text style={{ fontWeight: '600' }}>3.4 Responsabilità dell'Utente:</Text> La decisione di guidare o meno è SEMPRE e SOLO tua responsabilità. Non fare mai affidamento esclusivamente su Bacchus per questa decisione.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              4. Uso Appropriato
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              <Text style={{ fontWeight: '600' }}>4.1 Età Minima:</Text> Devi essere maggiorenne per utilizzare l'App.{'\n\n'}
              
              <Text style={{ fontWeight: '600' }}>4.2 Uso Legale:</Text> Devi utilizzare l'App in conformità con tutte le leggi applicabili.{'\n\n'}
              
              <Text style={{ fontWeight: '600' }}>4.3 Dati Accurati:</Text> Devi fornire informazioni accurate sui tuoi consumi e dati personali per ottenere stime più precise.{'\n\n'}
              
              <Text style={{ fontWeight: '600' }}>4.4 Uso Personale:</Text> L'App è destinata esclusivamente all'uso personale e non commerciale.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              5. Account e Sicurezza
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Se crei un account, sei responsabile di mantenere la sicurezza delle tue credenziali. Notificaci immediatamente qualsiasi uso non autorizzato del tuo account. Non siamo responsabili per perdite derivanti dall'uso non autorizzato del tuo account.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              6. Limitazione di Responsabilità
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              <Text style={{ fontWeight: '600' }}>6.1 Esclusione di Garanzie:</Text> L'App è fornita "così com'è" senza garanzie di alcun tipo.{'\n\n'}
              
              <Text style={{ fontWeight: '600' }}>6.2 Limitazione Danni:</Text> Non saremo responsabili per danni diretti, indiretti, incidentali o consequenziali derivanti dall'uso dell'App.{'\n\n'}
              
              <Text style={{ fontWeight: '600' }}>6.3 Decisioni di Guida:</Text> Non siamo in alcun modo responsabili per decisioni prese sulla base delle informazioni fornite dall'App, incluse decisioni relative alla guida di veicoli.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              7. Proprietà Intellettuale
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Tutti i contenuti dell'App, inclusi testi, grafica, loghi, icone, immagini e software, sono di nostra proprietà o concessi in licenza e sono protetti da copyright e altre leggi sulla proprietà intellettuale.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              8. Modifiche al Servizio
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Ci riserviamo il diritto di modificare, sospendere o interrompere l'App in qualsiasi momento senza preavviso. Non saremo responsabili verso te o terzi per eventuali modifiche, sospensioni o interruzioni.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              9. Terminazione
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Possiamo terminare o sospendere il tuo accesso all'App immediatamente, senza preavviso, per qualsiasi motivo, inclusa la violazione di questi Termini. Puoi terminare il tuo account in qualsiasi momento eliminando l'App dal tuo dispositivo.
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
