import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { usePurchase } from '../contexts/PurchaseContext';
import { SIZES } from '../constants/theme';
import AppHeader from '../components/AppHeader';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';
import * as purchaseService from '../lib/services/purchase.service';

// Determina se siamo in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

export default function SubscriptionsScreen() {
  const { t } = useTranslation(['purchases', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  
  const {
    isLoading,
    isPremium,
    isAdFree,
    products,
    subscriptions,
    remainingFreeSessions,
    purchaseSubscription,
    purchaseRemoveAds,
    restorePurchases,
    showUpgradePrompt,
    showSubscriptionScreen
  } = usePurchase();
  
  const [processingPayment, setProcessingPayment] = useState(false);
  const [processingRestore, setProcessingRestore] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('yearly'); // 'monthly' o 'yearly'
  
  // Calcola lo sconto annuale (25%)
  const yearlyDiscount = 25;
  
  // Estrai i prezzi (sostituisci con quelli reali dalle API quando disponibili)
  const monthlyPrice = '2.99';
  const yearlyPrice = '24.99';
  const removeAdsPrice = '4.99';
  
  // Gestisci l'acquisto dell'abbonamento
  const handlePurchaseSubscription = async () => {
    try {
      setProcessingPayment(true);
      
      const isYearly = selectedPlan === 'yearly';
      const result = await purchaseSubscription(isYearly);
      
      setProcessingPayment(false);
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: t('successTitle'),
          text2: t('successPurchase'),
        });
      } else if (result.error && !result.error.userCancelled) {
        Toast.show({
          type: 'error',
          text1: t('errorTitle'),
          text2: t('errorPurchase'),
        });
      }
    } catch (error) {
      setProcessingPayment(false);
      Toast.show({
        type: 'error',
        text1: t('errorTitle'),
        text2: t('errorGeneric'),
      });
    }
  };
  
  // Gestisci l'acquisto della rimozione pubblicità
  const handlePurchaseRemoveAds = async () => {
    try {
      setProcessingPayment(true);
      
      const result = await purchaseRemoveAds();
      
      setProcessingPayment(false);
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: t('successTitle'),
          text2: t('successPurchase'),
        });
      } else if (result.error && !result.error.userCancelled) {
        Toast.show({
          type: 'error',
          text1: t('errorTitle'),
          text2: t('errorPurchase'),
        });
      }
    } catch (error) {
      setProcessingPayment(false);
      Toast.show({
        type: 'error',
        text1: t('errorTitle'),
        text2: t('errorGeneric'),
      });
    }
  };
  
  // Gestisci il ripristino degli acquisti
  const handleRestorePurchases = async () => {
    setProcessingRestore(true);
    
    try {
      const result = await restorePurchases();
      
      if (result.success) {
        if (result.isPremium) {
          Alert.alert(
            t('restoreSuccessTitle', { ns: 'purchases', defaultValue: 'Ripristino completato' }),
            t('restoreSuccessMessage', { ns: 'purchases', defaultValue: 'I tuoi acquisti sono stati ripristinati con successo.' })
          );
        } else {
          Alert.alert(
            t('restoreNoSubscriptionsTitle', { ns: 'purchases', defaultValue: 'Nessun abbonamento' }),
            t('restoreNoSubscriptionsMessage', { ns: 'purchases', defaultValue: 'Non sono stati trovati abbonamenti attivi sul tuo account.' })
          );
        }
      } else {
        Alert.alert(
          t('restoreErrorTitle', { ns: 'purchases', defaultValue: 'Errore di ripristino' }),
          t('restoreErrorMessage', { ns: 'purchases', defaultValue: 'Si è verificato un errore durante il ripristino degli acquisti. Riprova più tardi.' })
        );
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      
      Alert.alert(
        t('errorTitle', { ns: 'purchases', defaultValue: 'Errore' }),
        t('errorGeneric', { ns: 'purchases', defaultValue: 'Si è verificato un errore. Riprova più tardi.' })
      );
    } finally {
      setProcessingRestore(false);
    }
  };
  
  // Apri le impostazioni di gestione abbonamenti
  const handleManageSubscription = async () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      // Per Android
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };
  
  // Apri le pagine di policy o termini
  const openURL = (url: string) => {
    Linking.openURL(url);
  };
  
  // Nel componente SubscriptionsScreen, aggiungi una nuova funzione per impostare lo stato premium mock
  const toggleMockPremium = async () => {
    if (isExpoGo) {
      const newStatus = !isPremium;
      await purchaseService.setMockPremiumStatus(newStatus);
      
      // Attendiamo un breve periodo per assicurarci che lo stato venga aggiornato
      setTimeout(() => {
        // Ricarica la pagina
        router.replace('/settings');
        setTimeout(() => {
          router.replace('/settings/subscriptions');
        }, 100);
      }, 500);
    }
  };
  
  // Handle direct navigation to subscription-offer
  const handleGoToPremium = () => {
    try {
      console.log('Showing subscription screen from settings/subscriptions');
      showSubscriptionScreen();
    } catch (error) {
      console.error('Error showing subscription screen:', error);
      Alert.alert(
        t('errorTitle', { ns: 'purchases', defaultValue: 'Errore' }),
        t('errorGeneric', { ns: 'purchases', defaultValue: 'Si è verificato un errore. Riprova più tardi.' })
      );
    }
  };
  
  // Caricamento
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader 
          title={t('subscriptionsTitle')}
          isMainScreen={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t('loading')}
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <AppHeader 
        title={t('subscriptionsTitle')}
        isMainScreen={false}
      />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Intestazione */}
        <View style={styles.headerContainer}>
          <Ionicons name="star" size={40} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('premium')}
          </Text>
          <Text style={[styles.headerDescription, { color: colors.textSecondary }]}>
            {t('premiumDescription')}
          </Text>
        </View>
        
        {/* Se già premium, mostra lo stato */}
        {isPremium && (
          <View style={[styles.subscriptionStatus, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={[styles.statusText, { color: colors.text }]}>
              {t('subscribedSince', { date: '01/01/2023' })}
            </Text>
            <TouchableOpacity 
              style={[
                styles.manageButton,
                { backgroundColor: colors.surface || colors.cardBackground }
              ]}
              onPress={handleManageSubscription}
            >
              <Text style={[styles.manageText, { color: colors.text }]}>
                {t('manageSubscription')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Opzioni di abbonamento (se non premium) */}
        {!isPremium && (
          <>
            {/* Selezione piano */}
            <View style={styles.planSelection}>
              <TouchableOpacity
                style={[
                  styles.planOption,
                  { 
                    backgroundColor: selectedPlan === 'monthly' 
                      ? colors.primary 
                      : colors.cardBackground,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setSelectedPlan('monthly')}
              >
                <Text style={[
                  styles.planText,
                  { color: selectedPlan === 'monthly' ? '#FFFFFF' : colors.text }
                ]}>
                  {t('monthlySubscription')}
                </Text>
                <Text style={[
                  styles.planPrice,
                  { color: selectedPlan === 'monthly' ? '#FFFFFF' : colors.text }
                ]}>
                  {t('priceMonthly', { price: monthlyPrice })}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.planOption,
                  { 
                    backgroundColor: selectedPlan === 'yearly' 
                      ? colors.primary 
                      : colors.cardBackground,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setSelectedPlan('yearly')}
              >
                <View style={styles.yearlyLabelContainer}>
                  <Text style={[
                    styles.planText,
                    { color: selectedPlan === 'yearly' ? '#FFFFFF' : colors.text }
                  ]}>
                    {t('yearlySubscription')}
                  </Text>
                  <View style={[
                    styles.discountBadge,
                    { backgroundColor: selectedPlan === 'yearly' ? '#FFFFFF' : colors.primary }
                  ]}>
                    <Text style={[
                      styles.discountText,
                      { color: selectedPlan === 'yearly' ? colors.primary : '#FFFFFF' }
                    ]}>
                      {t('yearlyDiscount', { percent: yearlyDiscount })}
                    </Text>
                  </View>
                </View>
                <Text style={[
                  styles.planPrice,
                  { color: selectedPlan === 'yearly' ? '#FFFFFF' : colors.text }
                ]}>
                  {t('priceYearly', { price: yearlyPrice })}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Pulsanti di azione */}
            <TouchableOpacity
              style={[
                styles.subscribeButton,
                { backgroundColor: colors.primary },
                processingPayment && { opacity: 0.7 }
              ]}
              onPress={handlePurchaseSubscription}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.subscribeText}>
                  {t('subscribe')}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
        
        {/* Elenco vantaggi */}
        <View style={styles.benefitsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('subscriptionBenefits')}
          </Text>
          
          <View style={styles.benefitsList}>
            <BenefitItem
              icon="infinite"
              text={t('unlimitedSessions')}
              colors={colors}
              isActive={isPremium}
            />
            <BenefitItem
              icon="stats-chart"
              text={t('advancedStatistics')}
              colors={colors}
              isActive={isPremium}
            />
            <BenefitItem
              icon="download"
              text={t('dataExport')}
              colors={colors}
              isActive={isPremium}
            />
            <BenefitItem
              icon="calculator"
              text={t('personalizedCalculations')}
              colors={colors}
              isActive={isPremium}
            />
            <BenefitItem
              icon="apps"
              text={t('iosWidgets')}
              colors={colors}
              isActive={isPremium}
            />
            <BenefitItem
              icon="eye-off"
              text={t('noAds')}
              colors={colors}
              isActive={isPremium || isAdFree}
            />
          </View>
        </View>
        
        {/* Rimuovi pubblicità (se non premium e non ad-free) */}
        {!isPremium && !isAdFree && (
          <View style={[styles.removeAdsCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.removeAdsContent}>
              <Ionicons name="eye-off" size={24} color={colors.primary} />
              <View style={styles.removeAdsText}>
                <Text style={[styles.removeAdsTitle, { color: colors.text }]}>
                  {t('removeAds')}
                </Text>
                <Text style={[styles.removeAdsDescription, { color: colors.textSecondary }]}>
                  {t('removeAdsDescription')}
                </Text>
              </View>
              <Text style={[styles.removeAdsPrice, { color: colors.text }]}>
                {t('priceOneTime', { price: removeAdsPrice })}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.removeAdsButton,
                { backgroundColor: colors.primary },
                processingPayment && { opacity: 0.7 }
              ]}
              onPress={handlePurchaseRemoveAds}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.removeAdsButtonText}>
                  {t('purchase')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {/* Piano gratuito */}
        <View style={[styles.freeSection, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.freeSectionTitle, { color: colors.text }]}>
            {t('freeAccount')}
          </Text>
          
          <View style={styles.freeFeaturesList}>
            <FreeFeatureItem
              icon="time"
              text={t('limitedSessions', { count: 2 })}
              colors={colors}
            />
            <FreeFeatureItem
              icon="stats-chart"
              text={t('basicStatistics')}
              colors={colors}
            />
          </View>
          
          <View style={[styles.remainingSessionsBox, { backgroundColor: colors.surface || colors.cardBackground }]}>
            <Text style={[styles.remainingSessionsText, { color: colors.text }]}>
              {isPremium 
                ? t('unlimitedLabel') 
                : t('remainingSessions', { count: remainingFreeSessions })}
            </Text>
          </View>
        </View>
        
        {/* Ripristina acquisti */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.restoreButton, { borderColor: colors.border }]}
            onPress={handleRestorePurchases}
            disabled={processingRestore}
          >
            <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
              {t('restorePurchases', { ns: 'purchases', defaultValue: 'Ripristina acquisti' })}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Note legali */}
        <View style={styles.legalSection}>
          <Text style={[styles.legalText, { color: colors.textSecondary }]}>
            {t('cancelAnytime')}
          </Text>
          
          <View style={styles.legalLinks}>
            <TouchableOpacity 
              style={styles.legalLink}
              onPress={() => openURL('https://bacchus.app/privacy')}
            >
              <Text style={[styles.legalLinkText, { color: colors.primary }]}>
                {t('privacyPolicy')}
              </Text>
            </TouchableOpacity>
            
            <View style={[styles.legalDivider, { backgroundColor: colors.border }]} />
            
            <TouchableOpacity 
              style={styles.legalLink}
              onPress={() => openURL('https://bacchus.app/terms')}
            >
              <Text style={[styles.legalLinkText, { color: colors.primary }]}>
                {t('termsOfService')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Pulsante per attivare/disattivare Premium in Expo Go */}
        {isExpoGo && (
          <View style={[styles.mockSectionContainer, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.mockSectionTitle, { color: colors.text }]}>
              Modalità Sviluppatore
            </Text>
            <Text style={[styles.mockSectionDescription, { color: colors.textSecondary }]}>
              Queste opzioni sono disponibili solo in modalità sviluppo per testare le funzionalità premium senza pagamento reale.
            </Text>
            <TouchableOpacity
              style={[
                styles.mockButton, 
                { 
                  backgroundColor: isPremium ? '#FF3B30' : '#34C759',
                  borderColor: isPremium ? '#FF3B30' : '#34C759',
                }
              ]}
              onPress={toggleMockPremium}
            >
              <Ionicons 
                name={isPremium ? "close-circle" : "checkmark-circle"} 
                size={20} 
                color="white" 
              />
              <Text style={styles.mockButtonText}>
                {isPremium ? 'Disattiva Premium (Modalità Test)' : 'Attiva Premium (Modalità Test)'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Componente per elemento vantaggio
const BenefitItem = ({ icon, text, colors, isActive = true }) => (
  <View style={styles.benefitItem}>
    <View style={[
      styles.benefitIconContainer,
      { 
        backgroundColor: isActive ? colors.primary + '20' : colors.textSecondary + '20',
      }
    ]}>
      <Ionicons 
        name={icon} 
        size={20} 
        color={isActive ? colors.primary : colors.textSecondary} 
      />
    </View>
    <Text style={[
      styles.benefitText,
      { color: isActive ? colors.text : colors.textSecondary }
    ]}>
      {text}
    </Text>
  </View>
);

// Componente per elemento funzionalità gratuita
const FreeFeatureItem = ({ icon, text, colors }) => (
  <View style={styles.freeFeatureItem}>
    <Ionicons name={icon} size={18} color={colors.textSecondary} />
    <Text style={[styles.freeFeatureText, { color: colors.text }]}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SIZES.padding,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 16,
    textAlign: 'center',
  },
  subscriptionStatus: {
    borderRadius: SIZES.radius,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusText: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  manageButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: SIZES.radiusSmall,
  },
  manageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  planSelection: {
    flexDirection: 'row',
    marginBottom: 20,
    height: 100,
  },
  planOption: {
    flex: 1,
    borderRadius: SIZES.radius,
    padding: 16,
    justifyContent: 'space-between',
    marginHorizontal: 5,
    borderWidth: 1,
  },
  planText: {
    fontSize: 15,
    fontWeight: '500',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  yearlyLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  subscribeButton: {
    height: 54,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  subscribeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  benefitsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  benefitsList: {
    marginBottom: 10,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  benefitIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitText: {
    fontSize: 16,
  },
  removeAdsCard: {
    borderRadius: SIZES.radius,
    padding: 16,
    marginBottom: 24,
  },
  removeAdsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  removeAdsText: {
    flex: 1,
    marginLeft: 12,
  },
  removeAdsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  removeAdsDescription: {
    fontSize: 14,
  },
  removeAdsPrice: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  removeAdsButton: {
    height: 44,
    borderRadius: SIZES.radiusSmall,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAdsButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  freeSection: {
    borderRadius: SIZES.radius,
    padding: 16,
    marginBottom: 24,
  },
  freeSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  freeFeaturesList: {
    marginBottom: 16,
  },
  freeFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  freeFeatureText: {
    fontSize: 15,
    marginLeft: 10,
  },
  remainingSessionsBox: {
    borderRadius: SIZES.radiusSmall,
    padding: 10,
    alignItems: 'center',
  },
  remainingSessionsText: {
    fontSize: 15,
    fontWeight: '500',
  },
  restoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  legalSection: {
    alignItems: 'center',
  },
  legalText: {
    fontSize: 13,
    marginBottom: 10,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legalLink: {
    paddingHorizontal: 8,
  },
  legalLinkText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  legalDivider: {
    width: 1,
    height: 12,
  },
  mockSectionContainer: {
    marginTop: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderStyle: 'dashed',
  },
  mockSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  mockSectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  mockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    padding: 12,
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
  },
  mockButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
}); 