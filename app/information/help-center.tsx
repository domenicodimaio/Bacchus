import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AppHeader from '../components/AppHeader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function HelpCenterScreen() {
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

  const handleContactSupport = () => {
    const email = 'support@bacchusapp.com';
    const subject = 'Richiesta Supporto - Bacchus App';
    const body = `Ciao team Bacchus,\n\nHo bisogno di assistenza con l'app.\n\nDescrizione del problema:\n[Descrivi qui il tuo problema]\n\nGrazie!`;
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(mailtoUrl);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader 
          title={t('helpCenter', { ns: 'common', defaultValue: 'Centro Assistenza' })}
          isMainScreen={false}
          onBackPress={() => router.back()}
        />
        
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.headerText, { color: colors.text }]}>
            {t('helpCenterHeader', { ns: 'common', defaultValue: 'Centro Assistenza Bacchus' })}
          </Text>
          
          <Text style={[styles.subHeaderText, { color: colors.textSecondary }]}>
            {t('helpCenterWelcome', { ns: 'common', defaultValue: 'Benvenuto nel Centro Assistenza di Bacchus. Qui troverai guide e informazioni per aiutarti a utilizzare l\'app in modo efficace e sicuro.' })}
          </Text>

          {/* Disclaimer Importante */}
          <View style={[styles.warningSection, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
            <Ionicons name="warning" size={24} color={colors.error} />
            <View style={styles.warningContent}>
              <Text style={[styles.warningTitle, { color: colors.error }]}>
                {t('importantDisclaimer', { ns: 'common', defaultValue: '⚠️ DISCLAIMER IMPORTANTE' })}
              </Text>
              <Text style={[styles.warningText, { color: colors.error }]}>
                {t('helpCenterImportantReminders', { ns: 'common', defaultValue: 'Promemoria Importanti: Non guidare mai basandoti solo sui calcoli dell\'app. Le stime BAC sono solo indicative. I fattori individuali influenzano il metabolismo dell\'alcol. Rispetta sempre le leggi e i regolamenti locali. Usa un etilometro professionale per letture accurate.' })}
              </Text>
            </View>
          </View>

          {/* Guida Rapida */}
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('helpCenterGettingStarted', { ns: 'common', defaultValue: '🚀 Guida Rapida' })}
            </Text>
            
            <View style={styles.guideStep}>
              <Text style={[styles.stepNumber, { backgroundColor: colors.primary }]}>1</Text>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  {t('createProfile', { ns: 'common', defaultValue: 'Crea il tuo Profilo' })}
                </Text>
                <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                  {t('createProfileDesc', { ns: 'common', defaultValue: 'Inserisci peso, altezza, età e sesso per calcoli più accurati' })}
                </Text>
              </View>
            </View>

            <View style={styles.guideStep}>
              <Text style={[styles.stepNumber, { backgroundColor: colors.primary }]}>2</Text>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  {t('startSession', { ns: 'common', defaultValue: 'Avvia una Sessione' })}
                </Text>
                <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                  {t('startSessionDesc', { ns: 'common', defaultValue: 'Tocca "Inizia Sessione" dalla dashboard per iniziare a tracciare' })}
                </Text>
              </View>
            </View>

            <View style={styles.guideStep}>
              <Text style={[styles.stepNumber, { backgroundColor: colors.primary }]}>3</Text>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  {t('addDrinks', { ns: 'common', defaultValue: 'Aggiungi Consumi' })}
                </Text>
                <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                  {t('addDrinksDesc', { ns: 'common', defaultValue: 'Registra bevande alcoliche e cibo per calcoli più precisi' })}
                </Text>
              </View>
            </View>

            <View style={styles.guideStep}>
              <Text style={[styles.stepNumber, { backgroundColor: colors.primary }]}>4</Text>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  {t('monitorBAC', { ns: 'common', defaultValue: 'Monitora il BAC' })}
                </Text>
                <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                  {t('monitorBACDesc', { ns: 'common', defaultValue: 'Osserva l\'andamento del tuo tasso alcolemico stimato' })}
                </Text>
              </View>
            </View>
          </View>

          {/* Funzionalità Principali */}
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('keyFeatures', { ns: 'common', defaultValue: '🔧 Funzionalità Principali' })}
            </Text>
            
            <View style={styles.featureItem}>
              <Ionicons name="calculator" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '600' }}>{t('bacCalculation', { ns: 'common', defaultValue: 'BAC Calculation' })}:</Text> {t('bacCalculationDesc', { ns: 'common', defaultValue: 'BAC estimation based on Widmark formula' })}
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="time" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '600' }}>{t('metabolismTime', { ns: 'common', defaultValue: 'Metabolism Time' })}:</Text> {t('metabolismTimeDesc', { ns: 'common', defaultValue: 'Estimated time to return to 0.0 g/l and legal limit' })}
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="bar-chart" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '600' }}>{t('sessionHistory', { ns: 'common', defaultValue: 'Session History' })}:</Text> {t('sessionHistoryDesc', { ns: 'common', defaultValue: 'Save and review your past sessions' })}
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="restaurant" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '600' }}>{t('foodTracking', { ns: 'common', defaultValue: 'Food Tracking' })}:</Text> {t('foodTrackingDesc', { ns: 'common', defaultValue: 'Record food for more accurate calculations' })}
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="cloud" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '600' }}>{t('dataSync', { ns: 'common', defaultValue: 'Data Sync' })}:</Text> {t('dataSyncDesc', { ns: 'common', defaultValue: 'Your data is synchronized across devices' })}
              </Text>
            </View>
          </View>

          {/* Consigli per l'Uso */}
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              💡 {t('usageTips', { ns: 'common', defaultValue: 'Consigli per l\'Uso' })}
            </Text>
            
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              {t('usageTipsContent', { ns: 'common', defaultValue: '• Sii Preciso: Inserisci dati accurati per stime migliori\n\n• Registra Tutto: Includi anche piccole quantità di alcol\n\n• Non Dimenticare il Cibo: Il cibo influenza l\'assorbimento dell\'alcol\n\n• Aggiorna Regolarmente: Mantieni aggiornato il tuo profilo\n\n• Usa Come Supporto: Non fare mai affidamento esclusivo sui calcoli' })}
            </Text>
          </View>

          {/* Limitazioni */}
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              ⚠️ {t('importantLimitations', { ns: 'common', defaultValue: 'Limitazioni Importanti' })}
            </Text>
            
            <Text style={[styles.limitationText, { color: colors.textSecondary }]}>
              {t('limitationsContent', { ns: 'common', defaultValue: 'Il calcolo del BAC può variare significativamente a causa di:\n\n• Metabolismo individuale\n• Condizioni di salute\n• Farmaci assunti\n• Livello di idratazione\n• Stress e affaticamento\n• Composizione corporea\n• Velocità di consumo\n• Tipo di bevanda\n\n' })}
              
              <Text style={{ fontWeight: '600', color: colors.error }}>
                {t('limitationsWarning', { ns: 'common', defaultValue: 'Per questo motivo, usa sempre il buon senso e non guidare mai se hai bevuto, indipendentemente da quello che mostra l\'app.' })}
              </Text>
            </Text>
          </View>

          {/* Supporto */}
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🆘 {t('needHelp', { ns: 'common', defaultValue: 'Hai Bisogno di Aiuto?' })}
            </Text>
            
            <TouchableOpacity 
              style={[styles.supportButton, { backgroundColor: colors.primary }]}
              onPress={handleContactSupport}
            >
              <Ionicons name="mail" size={20} color="white" />
              <Text style={styles.supportButtonText}>
                {t('contactSupport', { ns: 'common', defaultValue: 'Contatta il Supporto' })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.supportButton, { backgroundColor: colors.secondary, marginTop: 12 }]}
              onPress={() => router.push('/information/faq')}
            >
              <Ionicons name="help-circle" size={20} color="white" />
              <Text style={styles.supportButtonText}>
                {t('readFAQ', { ns: 'common', defaultValue: 'Leggi le FAQ' })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer Disclaimer */}
          <View style={[styles.footerDisclaimer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t('helpCenterDisclaimer', { ns: 'common', defaultValue: 'Ricorda: Bacchus è uno strumento di supporto. La decisione di guidare è sempre e solo tua responsabilità. Bevi responsabilmente e non guidare mai sotto l\'influenza dell\'alcol.' })}
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
  subHeaderText: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  warningSection: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 24,
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  guideStep: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    marginLeft: 12,
  },
  tipText: {
    fontSize: 15,
    lineHeight: 22,
  },
  limitationText: {
    fontSize: 15,
    lineHeight: 22,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  supportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footerDisclaimer: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
