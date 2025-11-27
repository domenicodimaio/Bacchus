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

// 🔥 RILEVAMENTO IPAD: Usa detection basato su dimensioni (più compatibile)
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIPad = Platform.OS === 'ios' && Math.min(screenWidth, screenHeight) >= 700;

// 🔥 DEBUG: Log per verificare rilevamento iPad
console.log('🔍 SUBSCRIPTION: Device detection:', {
  platform: Platform.OS,
  width: screenWidth,
  height: screenHeight,
  minDimension: Math.min(screenWidth, screenHeight),
  isIPad: isIPad,
  isIOS: Platform.OS === 'ios'
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
                // iPad: Testo più corto per evitare overlap
                t('subscriptionShort', { ns: 'purchases', defaultValue: '1 mese' }) :
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
                // iPad: Testo MOLTO più corto per evitare overlap
                t('yearlySubscriptionShort', { ns: 'purchases', defaultValue: '€' + (parseFloat(yearlyPrice)/12).toFixed(2) + '/mese' }) :
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
    paddingHorizontal: isIPad ? 16 : 20, // iPad: ridotto per scaling
    marginBottom: isIPad ? 12 : 20, // iPad: ridotto per scaling
  },
  logo: {
    width: isIPad ? 50 : 70, // iPad: MOLTO più piccolo per fit
    height: isIPad ? 50 : 70,
    marginBottom: isIPad ? 8 : 10, // iPad: ridotto per scaling
  },
  title: {
    fontSize: isIPad ? 20 : 24, // iPad: ridotto per fit
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isIPad ? 6 : 6, // iPad: ridotto per scaling
  },
  subtitle: {
    fontSize: isIPad ? 14 : 16, // iPad: ridotto per fit
    textAlign: 'center',
  },
  planContainer: {
    paddingHorizontal: isIPad ? 20 : 24, // iPad: ridotto per scaling
    marginBottom: isIPad ? 16 : 24, // iPad: ridotto per scaling
  },
  planCard: {
    padding: isIPad ? 12 : 20, // iPad: MOLTO ridotto per evitare overlap
    borderRadius: 12,
    marginBottom: isIPad ? 8 : 16, // iPad: ridotto per scaling
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: isIPad ? 80 : 120, // iPad: MOLTO ridotto per fit
    maxHeight: isIPad ? 90 : 'auto', // iPad: limita altezza per evitare overlap
  },
  selectedCard: {
    borderWidth: 2,
  },
  planTitle: {
    fontSize: isIPad ? 12 : 16, // iPad: MOLTO ridotto per evitare overlap
    fontWeight: 'bold',
    marginBottom: isIPad ? 4 : 8, // iPad: ridotto per scaling
  },
  priceContainer: {
    flexDirection: 'row', // Stesso layout per tutti
    alignItems: 'center',
    marginBottom: isIPad ? 4 : 4, // Stesso spacing
    flexWrap: 'nowrap',
  },
  fullPrice: {
    fontSize: isIPad ? 12 : 14, // iPad: ridotto per fit
    fontWeight: '400',
    textDecorationLine: 'line-through',
    marginRight: 6, // Stesso margin per tutti
  },
  planPrice: {
    fontSize: isIPad ? 11 : 15, // iPad: MOLTO ridotto per evitare overlap
    fontWeight: '600',
    marginBottom: isIPad ? 2 : 4, // iPad: ridotto per scaling
  },
  planDetails: {
    fontSize: isIPad ? 8 : 10, // iPad: MOLTO più piccolo per evitare overlap
    marginTop: isIPad ? 2 : 6, // iPad: ridotto per scaling
    textAlign: 'center', // Stesso allineamento per tutti
    lineHeight: isIPad ? 10 : 14, // iPad: ridotto per fit
    maxHeight: isIPad ? 20 : 'auto', // iPad: limita altezza per evitare overlap
    overflow: 'hidden', // iPad: taglia testo se troppo lungo
  },
  discountBadge: {
    marginLeft: 10, // Stesso margin per tutti
    paddingHorizontal: isIPad ? 6 : 8, // iPad: ridotto per scaling
    paddingVertical: isIPad ? 2 : 3, // iPad: ridotto per scaling
    borderRadius: 12,
  },
  discountText: {
    color: 'white',
    fontSize: isIPad ? 9 : 11, // iPad: ridotto per fit
    fontWeight: 'bold',
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  featuresContainer: {
    paddingHorizontal: isIPad ? 16 : 20, // iPad: ridotto per scaling
  },
  featuresTitle: {
    fontSize: isIPad ? 16 : 18, // iPad: ridotto per fit
    fontWeight: 'bold',
    marginBottom: isIPad ? 10 : 12, // iPad: ridotto per scaling
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isIPad ? 8 : 10, // iPad: ridotto per scaling
  },
  featureIcon: {
    marginRight: isIPad ? 8 : 10, // iPad: ridotto per scaling
  },
  featureText: {
    fontSize: isIPad ? 14 : 16, // iPad: ridotto per fit
    flex: 1,
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
    padding: isIPad ? 12 : 16, // iPad: ridotto per scaling
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    minHeight: isIPad ? 100 : 120, // iPad: ridotto per fit
  },
  primaryButton: {
    height: isIPad ? 44 : 56, // iPad: ridotto ma conforme Apple (44px min)
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isIPad ? 12 : 16, // iPad: ridotto per scaling
  },
  primaryButtonText: {
    color: 'white',
    fontSize: isIPad ? 14 : 16, // iPad: ridotto per fit
    fontWeight: 'bold',
  },
  secondaryButton: {
    height: isIPad ? 44 : 50, // iPad: ridotto ma conforme Apple
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44, // Touch target minimo Apple
  },
  secondaryButtonText: {
    fontSize: isIPad ? 14 : 16, // iPad: ridotto per fit
    fontWeight: '600',
  },
});