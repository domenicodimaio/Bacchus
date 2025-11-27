import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert,
  BackHandler,
  Linking,
  Dimensions,
} from 'react-native';

// 🔥 RILEVAMENTO IPAD: Rileva iPad per layout adattivo
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIPad = Platform.OS === 'ios' && Math.min(screenWidth, screenHeight) >= 700;

// 🔥 DEBUG: Log per verificare rilevamento iPad
console.log('🔍 SUBSCRIPTION: Device detection:', {
  platform: Platform.OS,
  width: screenWidth,
  height: screenHeight,
  minDimension: Math.min(screenWidth, screenHeight),
  isIPad: isIPad,
  isPad: Platform.isPad
});
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SIZES } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../components/Toast';
import usePremiumFeatures from '../hooks/usePremiumFeatures';
import { clearAllNavigationBlocks } from '../contexts/AuthContext';
import { usePurchase } from '../contexts/PurchaseContext';

// Versione estremamente semplificata
export default function SubscriptionOfferScreen() {
  console.log("[SubscriptionOfferScreen] RENDERING - " + new Date().toISOString());
  
  // Parametri basici
  const params = useLocalSearchParams();
  const fromWizard = params.fromWizard === 'true';
  const source = params.source?.toString() || 'unknown';
  const permanent = params.permanent === 'true';
  const navigation = useNavigation();
  const router = useRouter();
  
  console.log(`[SubscriptionOfferScreen] Parametri: source=${source}, fromWizard=${fromWizard}, permanent=${permanent}`);
  
  // Hooks base
  const { t, i18n } = useTranslation(['purchases', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { isPremium, checkAccess } = usePremiumFeatures();
  const { purchaseSubscription } = usePurchase();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [skipOffered, setSkipOffered] = useState(false);
  
  
  // Stato base
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  
  // Add a ref to track if this component is mounted
  const isMountedRef = useRef(true);
  
  // CRITICAL FIX: Clear all blocking flags as a safety measure
  // This prevents infinite loops in case they weren't cleared in the wizard
  useEffect(() => {
    if (typeof global !== 'undefined') {
      console.log('🔴 SUBSCRIPTION: Clearing all blocking flags to ensure normal app function');
      clearAllNavigationBlocks();
    }
  }, []);
  
  // Add this effect to prevent automatic closing
  useEffect(() => {
    console.log("[SubscriptionOfferScreen] Component mounted");
    
    // Segnala globalmente che questa schermata è attiva
    if (typeof global !== 'undefined') {
      global.__SHOWING_SUBSCRIPTION_SCREEN__ = true;
    }
    
    // Prevent back button from closing the screen automatically
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log("[SubscriptionOfferScreen] Back button pressed");
      if (!isClosing) {
        handleClose();
      }
      return true; // Prevent default behavior
    });
    
    // Impostazione di controllo per verificare se la schermata è ancora attiva
    const intervalId = setInterval(() => {
      if (isMountedRef.current && typeof global !== 'undefined' && global.__SHOWING_SUBSCRIPTION_SCREEN__) {
        console.log("[SubscriptionOfferScreen] Still active at " + new Date().toISOString());
      }
    }, 2000);
    
    return () => {
      console.log("[SubscriptionOfferScreen] Component unmounting at " + new Date().toISOString());
      
      // Rimuovi l'indicatore globale
      if (typeof global !== 'undefined') {
        global.__SHOWING_SUBSCRIPTION_SCREEN__ = false;
      }
      
      // Cleanup
      isMountedRef.current = false;
      backHandler.remove();
      clearInterval(intervalId);
    };
  }, [isClosing]);
  
  // Aggiungi un secondo effetto per bloccare qualsiasi tentativo di navigazione fuori dalla schermata
  useEffect(() => {
    if (!navigation) return;
    
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Permetti solo la navigazione se siamo noi a iniziarla
      if (!isClosing && permanent) {
        console.log("[SubscriptionOfferScreen] Prevented automatic navigation away");
        // Utilizziamo un'altra tecnica per prevenire la navigazione
        if (Platform.OS === 'web') {
          // Su web possiamo usare l'history API
          window.history.pushState(null, '', window.location.pathname);
        } else {
          // Su dispositivi mobili, possiamo forzare un'altra navigazione alla stessa schermata
          setTimeout(() => {
            router.replace('/onboarding/subscription-offer');
          }, 50);
        }
        return;
      }
    });
    
    return unsubscribe;
  }, [navigation, isClosing, permanent]);
  
  // Prezzi fissi
  const monthlyPrice = '2.99';
  const yearlyPrice = '24.99';
  const yearlyFullPrice = '35.88';
  const yearlyDiscount = 25;
  
  // 🔧 HANDLER REALE CON REVENUECAT/EXPO IN-APP PURCHASES
  const handleSubscribe = async (planType: 'monthly' | 'annual' = 'monthly') => {
    console.log('[SubscriptionOfferScreen] 🛒 ACQUISTO REALE:', planType);
    
    // ⚠️ Verifica che un piano sia selezionato
    if (!selectedPlan) {
      Alert.alert(
        t('selectPlan', { ns: 'purchases', defaultValue: 'Seleziona un piano' }),
        t('selectPlanMessage', { ns: 'purchases', defaultValue: 'Per favore, seleziona un piano di abbonamento prima di procedere.' }),
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      setLoading(true);
      
      // 🔧 USA IL VERO SISTEMA DI ACQUISTI DAL HOOK
      const result = await purchaseSubscription(planType);
      
      console.log('[SubscriptionOfferScreen] 🛒 Risultato acquisto:', result);
      
      if (result) {
        console.log('[SubscriptionOfferScreen] ✅ Acquisto completato con successo!');
        setIsClosing(true);
        
        Alert.alert(
          t('purchaseSuccess', { defaultValue: 'Acquisto completato' }),
          t('enjoyPremium', { defaultValue: 'Ora puoi godere di tutte le funzionalità premium!' }),
          [{ text: 'OK', onPress: () => {
            if (typeof global !== 'undefined') {
              global.__SHOWING_SUBSCRIPTION_SCREEN__ = false;
              global.__PREVENT_AUTO_NAVIGATION__ = false;
            }
            router.replace('/(tabs)/dashboard');
          }}]
        );
      } else {
        console.log('[SubscriptionOfferScreen] ❌ Acquisto fallito');
        Alert.alert(
          t('error', { defaultValue: 'Errore' }),
          t('purchaseFailed', { defaultValue: 'Acquisto fallito. Riprova più tardi.' }),
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[SubscriptionOfferScreen] ❌ Errore acquisto:', error);
      Alert.alert(
        t('error', { defaultValue: 'Errore' }),
        t('purchaseError', { defaultValue: 'Si è verificato un errore durante l\'acquisto.' }),
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    console.log('[SubscriptionOfferScreen] Chiusura schermo controllata');
    
    // Imposta lo stato di chiusura per permettere la navigazione
    setIsClosing(true);
    
    // Resetta le variabili globali
    if (typeof global !== 'undefined') {
      global.__SHOWING_SUBSCRIPTION_SCREEN__ = false;
      global.__PREVENT_AUTO_NAVIGATION__ = false;
    }
    
    // Make sure all navigation blocks are cleared
    clearAllNavigationBlocks();
    
    // Ritardo breve per assicurarsi che lo stato sia aggiornato
    setTimeout(() => {
      if (fromWizard) {
        console.log('[SubscriptionOfferScreen] Ritorno alla dashboard dal wizard');
        router.replace('/(tabs)/dashboard');
      } else {
        console.log('[SubscriptionOfferScreen] Ritorno indietro');
        router.back();
      }
    }, 50);
  };
  
  // Lista delle caratteristiche
  const features = [
    { key: 'unlimitedSessions', icon: 'infinite' as const },
    { key: 'advancedStatistics', icon: 'bar-chart' as const },
    { key: 'dataExport', icon: 'download-outline' as const },
    { key: 'personalizedCalculations', icon: 'calculator-outline' as const },
    { key: 'iosWidgets', icon: 'grid-outline' as const },
    { key: 'noAds', icon: 'eye-off-outline' as const }
  ];
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      
      {/* Bottone di chiusura */}
      <TouchableOpacity 
        onPress={handleClose}
        style={styles.closeButton}
      >
        <Ionicons name="close" size={24} color={colors.text} />
      </TouchableOpacity>
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Image 
            source={require('../../assets/images/bacchus-logo.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
          <Text style={[styles.title, { color: colors.text }]}>
            {t('upgradeToExperience', { ns: 'purchases', defaultValue: "Sblocca l'esperienza completa" })}
          </Text>
        </View>
        
        {/* Piani di abbonamento */}
        <View style={styles.planContainer}>
          {/* Piano mensile */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && [styles.selectedCard, { borderColor: colors.primary }],
              { backgroundColor: colors.cardBackground }
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text style={[styles.planTitle, { color: colors.text }]}>
              {t('monthlySubscription', { ns: 'purchases', defaultValue: "Abbonamento mensile" })}
            </Text>
            <Text style={[styles.planPrice, { color: colors.primary }]}>
              €{monthlyPrice}/{t('month', { ns: 'common', defaultValue: "mese" })}
            </Text>
            <Text style={[styles.planDetails, { color: colors.textSecondary }]}>
              {isIPad ? 
                // iPad: Testo più breve per evitare overflow
                t('subscriptionLengthShort', { ns: 'purchases', defaultValue: 'Durata: 1 mese' }) :
                // iPhone: Testo completo
                t('subscriptionLength', { ns: 'purchases', defaultValue: 'Durata: 1 mese • Rinnovo automatico' })
              }
            </Text>
            
            {selectedPlan === 'monthly' && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} style={styles.checkmark} />
            )}
          </TouchableOpacity>
          
          {/* Piano annuale */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && [styles.selectedCard, { borderColor: colors.primary }],
              { backgroundColor: colors.cardBackground }
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <Text style={[styles.planTitle, { color: colors.text }]}>
              {t('yearlySubscription', { ns: 'purchases', defaultValue: "Abbonamento annuale" })}
            </Text>
            <View style={styles.priceContainer}>
              <Text style={[styles.fullPrice, { color: colors.textSecondary }]}>
                €{yearlyFullPrice}
              </Text>
              <Text style={[styles.planPrice, { color: colors.primary }]}>
                €{yearlyPrice}/{t('year', { ns: 'common', defaultValue: "anno" })}
              </Text>
              <View style={[styles.discountBadge, { backgroundColor: colors.success }]}>
                <Text style={styles.discountText}>
                  -{yearlyDiscount}%
                </Text>
              </View>
            </View>
            <Text style={[styles.planDetails, { color: colors.textSecondary }]}>
              {isIPad ? 
                // iPad: Testo più breve per evitare overflow
                t('yearlySubscriptionLengthShort', { ns: 'purchases', defaultValue: 'Durata: 1 anno • €' + (parseFloat(yearlyPrice)/12).toFixed(2) + '/mese' }) :
                // iPhone: Testo completo
                t('yearlySubscriptionLength', { ns: 'purchases', defaultValue: 'Durata: 1 anno • €' + (parseFloat(yearlyPrice)/12).toFixed(2) + '/mese • Rinnovo automatico' })
              }
            </Text>
            
            {selectedPlan === 'yearly' && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} style={styles.checkmark} />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Lista Features */}
        <View style={styles.featuresContainer}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>
            {t('subscriptionBenefits', { ns: 'purchases', defaultValue: "Vantaggi dell'abbonamento" })}
          </Text>
          
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name={feature.icon} size={20} color={colors.primary} style={styles.featureIcon} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                {t(feature.key, { ns: 'purchases' })}
              </Text>
            </View>
          ))}
        </View>
      </View>
      
      {/* Link legali richiesti da Apple */}
      <View style={styles.legalLinksContainer}>
        <Text style={[styles.legalDisclaimer, { color: colors.textSecondary }]}>
          {t('subscriptionAutoRenews', { ns: 'purchases', defaultValue: 'L\'abbonamento si rinnova automaticamente. Puoi annullare in qualsiasi momento.' })}
        </Text>
        
        <View style={styles.legalLinks}>
          <TouchableOpacity 
            style={styles.legalLink}
            onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
          >
            <Text style={[styles.legalLinkText, { color: colors.primary }]}>
              {i18n.language === 'it' ? 'Termini di Servizio (EULA)' : 'Terms of Use (EULA)'}
            </Text>
          </TouchableOpacity>
          
          <Text style={[styles.legalSeparator, { color: colors.textSecondary }]}> • </Text>
          
          <TouchableOpacity 
            style={styles.legalLink}
            onPress={() => router.push('/information/privacy-policy')}
          >
            <Text style={[styles.legalLinkText, { color: colors.primary }]}>
              {t('privacyPolicy', { ns: 'common', defaultValue: 'Privacy Policy' })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Bottoni in basso */}
      <View style={[styles.bottomButtons, { backgroundColor: colors.background }]}>
        {/* Bottone per abbonamento */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={() => handleSubscribe(selectedPlan === 'yearly' ? 'annual' : 'monthly')}
        >
          <Text style={styles.primaryButtonText}>
            {t('subscribeNow', { ns: 'purchases', defaultValue: "Abbonati ora" })}
          </Text>
        </TouchableOpacity>
        
        {/* Skip button */}
        <TouchableOpacity
          style={[styles.secondaryButton]}
          onPress={handleClose}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
            {t('notNow', { ns: 'common', defaultValue: "Non ora" })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Stili per il componente
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: isIPad ? 40 : 20, // iPad: più padding per centrare meglio
    marginBottom: isIPad ? 20 : 20, // iPad: stesso spacing
  },
  logo: {
    width: isIPad ? 80 : 70, // iPad: leggermente più grande per visibilità
    height: isIPad ? 80 : 70,
    marginBottom: isIPad ? 15 : 10, // iPad: più spazio
  },
  title: {
    fontSize: isIPad ? 26 : 24, // iPad: leggermente più grande
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isIPad ? 10 : 6, // iPad: più spazio
  },
  subtitle: {
    fontSize: isIPad ? 18 : 16, // iPad: leggermente più grande
    textAlign: 'center',
  },
  planContainer: {
    paddingHorizontal: isIPad ? 60 : 24, // iPad: più padding per centrare e dare spazio
    marginBottom: isIPad ? 30 : 24, // iPad: più spazio
    maxWidth: isIPad ? 600 : '100%', // iPad: larghezza massima per evitare stretch
    alignSelf: 'center', // iPad: centra il container
  },
  planCard: {
    padding: isIPad ? 24 : 20, // iPad: più padding per leggibilità
    borderRadius: 12,
    marginBottom: isIPad ? 20 : 16, // iPad: più spazio tra le card
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: isIPad ? 140 : 120, // iPad: più altezza per contenuto
  },
  selectedCard: {
    borderWidth: 2,
  },
  planTitle: {
    fontSize: isIPad ? 18 : 16, // iPad: più grande per leggibilità
    fontWeight: 'bold',
    marginBottom: isIPad ? 12 : 8, // iPad: più spazio
  },
  priceContainer: {
    flexDirection: isIPad ? 'column' : 'row', // iPad: layout verticale per evitare overlap
    alignItems: isIPad ? 'flex-start' : 'center',
    marginBottom: isIPad ? 8 : 4, // iPad: più spazio
    flexWrap: 'nowrap', // Evita wrap che causa overlap
  },
  fullPrice: {
    fontSize: isIPad ? 16 : 14, // iPad: più grande
    fontWeight: '400',
    textDecorationLine: 'line-through',
    marginRight: isIPad ? 0 : 6, // iPad: no margin right
    marginBottom: isIPad ? 4 : 0, // iPad: margin bottom
  },
  planPrice: {
    fontSize: isIPad ? 20 : 15, // iPad: molto più grande
    fontWeight: '600',
    marginBottom: isIPad ? 8 : 4, // iPad: più spazio
  },
  planDetails: {
    fontSize: isIPad ? 14 : 10, // iPad: molto più grande per leggibilità
    marginTop: isIPad ? 8 : 6, // iPad: più spazio
    textAlign: 'left', // iPad: allineamento a sinistra per leggibilità
    lineHeight: isIPad ? 18 : 14, // iPad: più line height
    flexWrap: 'wrap', // 🔥 FIX: Permetti wrap del testo
    flexShrink: 1, // 🔥 FIX: Permetti shrink per evitare overflow
  },
  discountBadge: {
    marginLeft: isIPad ? 0 : 10, // iPad: no margin left
    marginTop: isIPad ? 4 : 0, // iPad: margin top per layout verticale
    paddingHorizontal: isIPad ? 12 : 8, // iPad: più padding
    paddingVertical: isIPad ? 6 : 3, // iPad: più padding
    borderRadius: 12,
    alignSelf: isIPad ? 'flex-start' : 'auto', // iPad: allineamento a sinistra
  },
  discountText: {
    color: 'white',
    fontSize: isIPad ? 14 : 11, // iPad: più grande
    fontWeight: 'bold',
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  featuresContainer: {
    paddingHorizontal: isIPad ? 60 : 20, // iPad: più padding per centrare
    maxWidth: isIPad ? 600 : '100%', // iPad: larghezza massima
    alignSelf: 'center', // iPad: centra il container
  },
  featuresTitle: {
    fontSize: isIPad ? 22 : 18, // iPad: più grande
    fontWeight: 'bold',
    marginBottom: isIPad ? 20 : 12, // iPad: più spazio
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isIPad ? 16 : 10, // iPad: più spazio tra gli item
  },
  featureIcon: {
    marginRight: isIPad ? 16 : 10, // iPad: più spazio
  },
  featureText: {
    fontSize: isIPad ? 18 : 16, // iPad: più grande
    flex: 1, // Evita overflow del testo
  },
  legalLinksContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  legalDisclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalLink: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  legalLinkText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 12,
    marginHorizontal: 4,
  },
  bottomButtons: {
    padding: isIPad ? 40 : 16, // iPad: molto più padding
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    minHeight: isIPad ? 160 : 120, // iPad: più altezza per evitare overlap
    maxWidth: isIPad ? 600 : '100%', // iPad: larghezza massima
    alignSelf: 'center', // iPad: centra i bottoni
    width: '100%', // Mantieni larghezza piena
  },
  primaryButton: {
    height: isIPad ? 64 : 56, // iPad: più alto per touch target
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isIPad ? 20 : 16, // iPad: più spazio tra i pulsanti
  },
  primaryButtonText: {
    color: 'white',
    fontSize: isIPad ? 18 : 16, // iPad: più grande
    fontWeight: 'bold',
  },
  secondaryButton: {
    height: isIPad ? 56 : 50, // iPad: più alto
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44, // Touch target minimo Apple
  },
  secondaryButtonText: {
    fontSize: isIPad ? 18 : 16, // iPad: più grande
    fontWeight: '600',
  },
});