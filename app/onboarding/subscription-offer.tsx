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
} from 'react-native';
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
  const { t } = useTranslation(['purchases', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { isPremium, checkAccess } = usePremiumFeatures();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [skipOffered, setSkipOffered] = useState(false);
  
  // Stato base
  const [selectedPlan, setSelectedPlan] = useState('yearly');
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
  
  // Handler semplificati
  const handleSubscribe = () => {
    console.log('[SubscriptionOfferScreen] Attivazione abbonamento');
    setIsClosing(true);
    AsyncStorage.setItem('PREMIUM_STATUS', 'true').then(() => {
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
    });
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
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
      </ScrollView>
      
      {/* Bottoni in basso */}
      <View style={[styles.bottomButtons, { backgroundColor: colors.background }]}>
        {/* Bottone per abbonamento */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleSubscribe}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  planContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  planCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderWidth: 2,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullPrice: {
    fontSize: 14,
    fontWeight: '400',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  discountBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  discountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  featuresContainer: {
    paddingHorizontal: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 16,
  },
  bottomButtons: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});