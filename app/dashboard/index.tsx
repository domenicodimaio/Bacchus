import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, StatusBar, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SIZES, BAC_LIMITS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useActiveProfiles } from '../contexts/ProfileContext';
import BACDisplay from '../components/BACDisplay';
import OfflineIndicator from '../components/OfflineIndicator';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { 
  calculateSoberTime, 
  formatTime
} from '../lib/bac/visualization';
import sessionService from '../lib/services/session.service';
import { Session, UserProfile as ProfileType } from '../types/session';
import * as profileService from '../lib/services/profile.service';
import AppHeader from '../components/AppHeader';
import { useToast } from '../components/Toast';
import ProfileIcon from '../components/ProfileIcon';
import { resetAllLocalData } from '../lib/services/auth.service';
import { navigateToSession } from '../session/index';
import usePremiumFeatures from '../hooks/usePremiumFeatures';
import { LinearGradient } from 'expo-linear-gradient';
import { usePurchase } from '../contexts/PurchaseContext';

// Mock active profile
const activeProfile = {
  id: '1',
  name: 'Default Profile',
  weight: 70,
  gender: 'Male',
};

// Mock BAC data
const mockBacData = {
  currentBac: 0.3,
  status: 'safe' as 'safe' | 'caution' | 'danger',
  timeToSober: '3h 45m',
  timeToLegal: '4h 30m',
};

function DashboardScreen() {
  const { t } = useTranslation(['dashboard', 'common', 'session']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const { currentProfileId } = useActiveProfiles();
  const { canCreateSession, checkAccess, features } = usePremiumFeatures();
  const { showSubscriptionScreen, remainingFreeSessions } = usePurchase();
  
  // State
  const [activeProfile, setActiveProfile] = useState<ProfileType | null>(null);
  const [profiles, setProfiles] = useState<ProfileType[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [bacData, setBacData] = useState({
    currentBac: 0,
    status: 'safe' as 'safe' | 'caution' | 'danger' | 'warning' | 'critical',
    timeToSober: '0h 00m',
    timeToLegal: '0h 00m',
  });
  const [updateTimer, setUpdateTimer] = useState<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Animated values
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.9);
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.8);
  
  // Add a new useAnimatedStyle for the premium banner
  const premiumBannerOpacity = useSharedValue(0);
  const premiumBannerTranslateY = useSharedValue(20);
  
  const premiumBannerStyle = useAnimatedStyle(() => {
    return {
      opacity: premiumBannerOpacity.value,
      transform: [{ translateY: premiumBannerTranslateY.value }]
    };
  });
  
  // Load data on mount and when focused
  useEffect(() => {
    // Effetto per caricare e aggiornare i profili
    async function loadProfiles() {
      try {
        // Se siamo nella schermata di sottoscrizione, non carichiamo nulla
        if (typeof global !== 'undefined' && global.__SHOWING_SUBSCRIPTION_SCREEN__) {
          console.log("[Dashboard] Non carico i profili perché la schermata di sottoscrizione è attiva");
          return;
        }
        
        // Carica tutti i profili
        const allProfiles = await profileService.getProfiles();
        setProfiles(allProfiles || []);
        
        // 🔧 FIX CRITICO: Non reindirizzare immediatamente se non ci sono profili
        // Aspetta che l'AuthContext finisca di caricare prima di decidere
        if (!allProfiles || allProfiles.length === 0) {
          console.log("[Dashboard] ⚠️ Nessun profilo trovato - potrebbe essere in caricamento");
          setProfiles([]);
          setActiveProfile(null);
          // NON reindirizzare immediatamente - lascia che NavigationHandler gestisca
          return;
        }
        
        // Gestisci il profilo attivo
        if (currentProfileId) {
          // Cerca il profilo attivo tra quelli caricati
          const activeProfile = allProfiles.find(p => p.id === currentProfileId);
          if (activeProfile) {
            setActiveProfile(activeProfile);
          } else if (allProfiles.length > 0) {
            // Se il profilo attivo non è stato trovato, usa il primo disponibile
            setActiveProfile(allProfiles[0]);
          }
        } else if (allProfiles.length > 0) {
          // Se non c'è un profilo attivo ma ci sono profili, imposta il primo
          setActiveProfile(allProfiles[0]);
        }
      } catch (error) {
        console.error('Errore nel caricamento profili:', error);
      }
    }
    
    loadProfiles();
  }, [currentProfileId]);
  
  // Add useFocusEffect to update the session state whenever the dashboard screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('Dashboard screen focused - refreshing session data');
      
      // Carica i dati della sessione attiva senza complicazioni
      loadActiveSession();
      
      // Setup un timer per controlli continui
      const timer = setInterval(() => {
        // Controllo e aggiorna la sessione periodicamente
        const currentSession = sessionService.getActiveSession();
        if (currentSession) {
          // Aggiorna la UI solo se il BAC è cambiato
          if (session?.currentBAC !== currentSession.currentBAC) {
            loadActiveSession();
          }
        } else if (isSessionActive) {
          // La sessione è stata terminata nel frattempo
          loadActiveSession();
        }
      }, 5000); // Controlla ogni 5 secondi
      
      // Cleanup function when screen loses focus
      return () => {
        clearInterval(timer);
      };
    }, [isSessionActive, session])
  );
  
  // Force an update of the BAC value every minute to ensure accurate display
  useEffect(() => {
    if (!session) return;
    
    // Evita di creare un timer se la sessione non ha BAC significativo
    if (session.currentBAC < 0.01) return;
    
    // Aggiorna il BAC solo ogni minuto invece che ogni 2 secondi
    const forceUpdateTimer = setInterval(() => {
      // Ottieni la sessione attiva aggiornata
      const currentActiveSession = sessionService.getActiveSession();
      if (currentActiveSession) {
        setSession(currentActiveSession);
        
        // Update BAC data
        setBacData({
          currentBac: currentActiveSession.currentBAC,
          status: currentActiveSession.status,
          timeToSober: currentActiveSession.soberTime,
          timeToLegal: currentActiveSession.legalTime,
        });
      }
    }, 60000); // Ogni minuto
    
    return () => clearInterval(forceUpdateTimer);
  }, [session]);
  
  // Load active session data
  const loadActiveSession = () => {
    console.log('Dashboard: verifica sessione attiva...');
    
    // Prima aggiorna il BAC per assicurarsi che i dati siano corretti
    sessionService.updateSessionBAC();
    
    // Poi verifica se c'è una sessione attiva
    const currentSession = sessionService.getActiveSession();
    
    if (currentSession) {
      console.log('Dashboard: sessione attiva trovata:', currentSession.id);
      
      // Aggiorna lo stato con la sessione e i dati BAC
      setSession(currentSession);
      setIsSessionActive(true);
      setBacData({
        currentBac: currentSession.currentBAC,
        status: currentSession.status,
        timeToSober: currentSession.soberTime,
        timeToLegal: currentSession.legalTime,
      });
    } else {
      console.log('Dashboard: nessuna sessione attiva trovata');
      
      // Resetta tutti gli stati relativi alla sessione
      setSession(null);
      setIsSessionActive(false);
      setBacData({
        currentBac: 0,
        status: 'safe',
        timeToSober: '0h 00m',
        timeToLegal: '0h 00m',
      });
    }
    
    // Animazioni semplici che vengono sempre applicate
    cardOpacity.value = withTiming(1, { duration: 500 });
    cardScale.value = withTiming(1, { duration: 500 });
    buttonOpacity.value = withTiming(1, { duration: 500 });
    buttonScale.value = withTiming(1, { duration: 500 });
  };
  
  // Animated styles
  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: cardOpacity.value,
      transform: [{ scale: cardScale.value }],
    };
  });
  
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonOpacity.value,
      transform: [{ scale: buttonScale.value }],
    };
  });

  // Format session duration
  const formatSessionDuration = () => {
    if (!session) return '0:00';
    
    // Calcola il tempo trascorso dall'inizio della sessione
    const startTime = new Date(session.startTime);
    const now = new Date();
    const durationMs = now.getTime() - startTime.getTime();
    
    // Converti in ore e minuti
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Formatta in ore e minuti (es. 2h 34m)
    const duration = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    
    // Formatta l'orario di inizio (es. 14:30)
    const startHours = startTime.getHours().toString().padStart(2, '0');
    const startMinutes = startTime.getMinutes().toString().padStart(2, '0');
    const startTimeStr = `${startHours}:${startMinutes}`;
    
    return (
      <View>
        <Text style={[styles.sessionValue, { color: colors.text }]}>
          {duration}
        </Text>
        <Text style={[styles.sessionStartTime, { color: colors.textSecondary, fontSize: 12 }]}>
          {t('startedAt', { ns: 'session', defaultValue: 'Iniziata alle' })}: {startTimeStr}
        </Text>
      </View>
    );
  };

  // Handle starting a new session
  const handleStartNewSession = () => {
    // Verifica se l'utente può creare una nuova sessione
    if (!canCreateSession()) {
      // Se non può, mostra il prompt di upgrade
      checkAccess('canCreateUnlimitedSessions', true, 'dashboard_new_session');
      return;
    }
    
    // Altrimenti continua con la navigazione alla schermata di creazione sessione
    router.replace('/session/new');
  };

  // Handle continuing an active session
  const handleContinueSession = () => {
    if (session) {
      // Naviga al tab sessione
      router.push('/(tabs)/session');
    }
  };

  // Render the weekly calendar
  const renderWeekCalendar = () => {
    const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    
    // Ottieni la data corrente
    const currentDate = new Date();
    const currentDay = currentDate.getDay(); // 0 = domenica, 1 = lunedì, ecc.
    
    // Calcola il lunedì della settimana corrente (se oggi è domenica, sarà lunedì scorso)
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - ((currentDay === 0 ? 7 : currentDay) - 1));
    
    // Genera le date della settimana
    const weekDates = days.map((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      
      const isToday = date.toDateString() === currentDate.toDateString();
      
      return {
        day,
        date: date.getDate(),
        isToday
      };
    });
    
    return (
      <View style={styles.weekCalendar}>
        {weekDates.map((item, index) => (
          <View 
            key={index} 
            style={[
              styles.calendarDay, 
              item.isToday && { 
                backgroundColor: colors.primary + '20',
                borderRadius: SIZES.radius,
              }
            ]}
          >
            <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
              {item.day}
            </Text>
            <Text style={[
              styles.dayNumber, 
              { color: colors.text },
              item.isToday && { 
                fontWeight: 'bold',
                color: colors.primary 
              }
            ]}>
              {item.date}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Animate the premium banner entrance
  useEffect(() => {
    if (!features.canCreateUnlimitedSessions) {
      premiumBannerOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
      premiumBannerTranslateY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) });
    }
  }, [features.canCreateUnlimitedSessions]);
  
  // Navigate to subscription screen
  const handleGoToPremium = () => {
    try {
      console.log('[handleGoToPremium] Navigando direttamente alla schermata premium dalla dashboard');
      
      // Usiamo una navigazione diretta invece di passare per il context
      router.navigate({
        pathname: '/onboarding/subscription-offer',
        params: { 
          source: 'dashboard',
          ts: Date.now().toString() // timestamp per prevenire cache di navigazione
        }
      });
    } catch (error) {
      console.error('[handleGoToPremium] Errore durante l\'apertura della schermata premium:', error);
      Alert.alert(
        t('errorTitle', { ns: 'purchases', defaultValue: 'Errore' }),
        t('errorGeneric', { ns: 'purchases', defaultValue: 'Si è verificato un errore. Riprova più tardi.' })
      );
    }
  };

  // Aggiungo una funzione per mostrare i vantaggi premium
  const showPremiumBenefits = () => {
    Alert.alert(
      t('premiumActive', { ns: 'purchases', defaultValue: 'Premium Attivo' }),
      t('enjoyPremiumFeatures', { ns: 'purchases', defaultValue: 'Stai godendo dei seguenti vantaggi premium:' }) + 
      '\n\n' + 
      t('premiumFeaturesList', { 
        ns: 'purchases', 
        defaultValue: '• Sessioni illimitate\n• Statistiche dettagliate\n• Esportazione dati\n• Nessuna pubblicità' 
      }),
      [
        { 
          text: 'OK' 
        },
        {
          text: t('viewDetails', { ns: 'purchases', defaultValue: 'Vedi dettagli' }),
          onPress: () => router.push('/settings')
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <AppHeader 
        title="Dashboard" 
        isMainScreen={true} 
        translationNamespace="dashboard"
      />
      
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Premium Promotion Banner (solo per utenti non premium) */}
      {!features.canCreateUnlimitedSessions && (
        <Animated.View style={[styles.premiumBannerContainer, premiumBannerStyle]}>
          <LinearGradient
            colors={[colors.primary, '#0088a3']}
            start={[0, 0]}
            end={[1, 0]}
            style={styles.premiumBanner}
          >
            <View style={styles.premiumBannerContent}>
              <View style={styles.premiumBannerTextContainer}>
                <Text style={styles.premiumBannerTitle}>
                  {t('upgradeToPremium', { ns: 'purchases', defaultValue: 'Passa a Premium' })}
                </Text>
                <Text style={styles.premiumBannerSubtitle}>
                  {t('unlimitedSessions', { ns: 'purchases', defaultValue: 'Sessioni illimitate' })}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.premiumBannerButton}
                onPress={handleGoToPremium}
              >
                <Text style={styles.premiumBannerButtonText}>
                  {t('upgrade', { ns: 'purchases', defaultValue: 'Passa a Premium' })}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      )}
      
      {/* Main content remains the same */}
      {isSessionActive ? (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.mainCard, cardAnimatedStyle, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('activeSession', { ns: 'session' })}
              </Text>
              
              {/* Mostra sempre il contatore delle sessioni */}
              <Text style={[styles.remainingSessionsText, { 
                color: features.canCreateUnlimitedSessions ? colors.success : colors.textSecondary 
              }]}>
                {features.canCreateUnlimitedSessions 
                  ? t('unlimitedSessions', { ns: 'session', defaultValue: 'Sessioni illimitate' })
                  : remainingFreeSessions > 0 
                    ? t('remainingSessions', { count: remainingFreeSessions, ns: 'purchases', defaultValue: `Sessioni rimanenti: ${remainingFreeSessions}` })
                    : t('noMoreSessions', { ns: 'session', defaultValue: 'Nessuna sessione rimanente' })}
              </Text>
            </View>
            
            <BACDisplay 
              bac={bacData.currentBac} 
              timeToSober={bacData.timeToSober}
              timeToLegal={bacData.timeToLegal}
              timeToZero={bacData.timeToSober}
            />
            
            <View style={styles.sessionInfo}>
              <View style={styles.sessionItem}>
                <Text style={[styles.sessionLabel, { color: colors.textSecondary }]}>
                  {t('sessionActiveTime', { ns: 'session' })}:
                </Text>
                  {formatSessionDuration()}
              </View>
            </View>
            
            <Animated.View style={[styles.continueButtonContainer, buttonAnimatedStyle]}>
              <TouchableOpacity 
                style={[styles.mainButton, { backgroundColor: colors.primary }]}
                onPress={handleContinueSession}
              >
                <View style={styles.buttonContent}>
                  <MaterialCommunityIcons 
                    name="arrow-right-circle" 
                    size={24} 
                    color="white" 
                    style={styles.buttonIcon} 
                  />
                  <Text style={styles.buttonText}>
                    {t('continueSession', { ns: 'session' })}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.secondaryButton, { 
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.primary,
                  marginTop: 12
                }]}
                onPress={handleStartNewSession}
              >
                <View style={styles.buttonContent}>
                  <Ionicons 
                    name="add-circle" 
                    size={24} 
                    color={colors.primary} 
                    style={styles.buttonIcon} 
                  />
                  <Text style={[styles.buttonText, { color: colors.primary }]}>
                    {t('newSession', { ns: 'session' })}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
          
          <View style={styles.quickLinks}>
            <TouchableOpacity 
              style={[styles.quickLinkButton, { backgroundColor: colors.card }]} 
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Ionicons name="person" size={22} color={colors.primary} />
              <Text style={[styles.quickLinkText, { color: colors.text }]}>
                {t('profiles')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickLinkButton, { backgroundColor: colors.card }]} 
              onPress={() => router.push('/history')}
            >
              <Ionicons name="time" size={22} color={colors.primary} />
              <Text style={[styles.quickLinkText, { color: colors.text }]}>
                {t('history')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickLinkButton, { backgroundColor: colors.card }]} 
              onPress={() => router.push('/information')}
            >
              <Ionicons name="information-circle" size={22} color={colors.primary} />
              <Text style={[styles.quickLinkText, { color: colors.text }]}>
                {t('info')}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.tipsContainer}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>
              {t('tips')}
            </Text>
            <View style={[styles.tipCard, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="water" size={20} color={colors.primary} style={styles.tipIcon} />
              <Text style={[styles.tipText, { color: colors.text }]}>
                {t('tipDrinkWater')}
              </Text>
            </View>
            <View style={[styles.tipCard, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="restaurant" size={20} color={colors.primary} style={styles.tipIcon} />
              <Text style={[styles.tipText, { color: colors.text }]}>
                {t('tipEatFood')}
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.noSessionContainer}>
          <Animated.View style={[styles.noSessionContent, cardAnimatedStyle]}>
            <FontAwesome5 
              name="glass-cheers" 
              size={60} 
              color={colors.primary} 
              style={styles.noSessionIcon} 
            />
            <Text style={[styles.noSessionTitle, { color: colors.text }]}>
              {t('noActiveSession', { ns: 'session' })}
            </Text>
            <Text style={[styles.noSessionSubtitle, { color: colors.textSecondary }]}>
              {t('trackYourDrinks', { ns: 'session' })}
            </Text>
            
            {/* Mostra sempre il contatore delle sessioni (sia per utenti premium che free) */}
            <View style={styles.sessionCounterContainer}>
              <Text style={[styles.sessionCounterText, { 
                color: features.canCreateUnlimitedSessions ? colors.success : colors.text 
              }]}>
                {features.canCreateUnlimitedSessions 
                  ? t('unlimitedSessions', { ns: 'session', defaultValue: 'Sessioni illimitate' })
                  : remainingFreeSessions > 0 
                    ? t('remainingSessions', { count: remainingFreeSessions, ns: 'purchases', defaultValue: `Sessioni rimanenti: ${remainingFreeSessions}` })
                    : t('noMoreSessions', { ns: 'session', defaultValue: 'Nessuna sessione rimanente' })}
              </Text>
              {!features.canCreateUnlimitedSessions && (
                <Text style={[styles.sessionCounterDescription, { color: colors.textSecondary }]}>
                  {t('sessionRefreshInfo', { ns: 'purchases', defaultValue: 'Il limite si resetta ogni settimana' })}
                </Text>
              )}
            </View>
            
            <Animated.View style={[styles.startButtonContainer, buttonAnimatedStyle]}>
              <TouchableOpacity 
                style={[styles.mainButton, { backgroundColor: colors.primary }]}
                onPress={handleStartNewSession}
              >
                <View style={styles.buttonContent}>
                  <FontAwesome5 
                    name="glass-martini-alt" 
                    size={24} 
                    color="white" 
                    style={styles.buttonIcon} 
                  />
                  <Text style={styles.buttonText}>
                    {t('startSession', { ns: 'session' })}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
          
          <View style={styles.quickLinks}>
            <TouchableOpacity 
              style={[styles.quickLinkButton, { backgroundColor: colors.card }]} 
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Ionicons name="person" size={22} color={colors.primary} />
              <Text style={[styles.quickLinkText, { color: colors.text }]}>
                {t('profiles')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickLinkButton, { backgroundColor: colors.card }]} 
              onPress={() => router.push('/history')}
            >
              <Ionicons name="time" size={22} color={colors.primary} />
              <Text style={[styles.quickLinkText, { color: colors.text }]}>
                {t('history')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickLinkButton, { backgroundColor: colors.card }]} 
              onPress={() => router.push('/information')}
            >
              <Ionicons name="information-circle" size={22} color={colors.primary} />
              <Text style={[styles.quickLinkText, { color: colors.text }]}>
                {t('info')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Disclaimer spostato più in basso e meno evidente */}
      <View style={styles.disclaimerContainer}>
        <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
          {t('disclaimer', { ns: 'common' })}
        </Text>
      </View>
      
    </View>
  );
}

export default DashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SIZES.padding,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
    paddingBottom: SIZES.paddingSmall,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.body,
    marginRight: SIZES.padding,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.padding,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SIZES.paddingSmall,
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.margin,
  },
  calendarDay: {
    alignItems: 'center',
    padding: 8,
    width: 40,
  },
  dayLabel: {
    fontSize: SIZES.small,
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: SIZES.subtitle,
  },
  mainCard: {
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.marginLarge,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardTitle: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
    marginBottom: SIZES.marginSmall,
    textAlign: 'center',
  },
  sessionInfo: {
    marginTop: SIZES.margin,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionLabel: {
    fontSize: SIZES.body,
  },
  sessionValue: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
  },
  continueButtonContainer: {
    marginTop: SIZES.marginLarge,
    alignItems: 'center',
  },
  noSessionContainer: {
    flex: 1,
    padding: SIZES.padding,
    justifyContent: 'center',
  },
  noSessionContent: {
    alignItems: 'center',
    marginBottom: SIZES.marginLarge * 2,
  },
  noSessionIcon: {
    marginBottom: SIZES.marginLarge,
  },
  noSessionTitle: {
    fontSize: SIZES.title,
    fontWeight: 'bold',
    marginBottom: SIZES.marginSmall,
    textAlign: 'center',
  },
  noSessionSubtitle: {
    fontSize: SIZES.body,
    textAlign: 'center',
    marginBottom: SIZES.marginLarge,
  },
  startButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: SIZES.marginLarge,
  },
  mainButton: {
    minWidth: '80%',
    borderRadius: SIZES.radiusLarge,
    paddingVertical: SIZES.paddingSmall,
    paddingHorizontal: SIZES.padding,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
  },
  quickLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.marginLarge,
  },
  quickLinkButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.paddingSmall,
    margin: SIZES.marginSmall / 2,
    borderRadius: SIZES.radius,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  quickLinkText: {
    fontSize: SIZES.small,
    marginTop: 4,
  },
  tipsContainer: {
    marginBottom: SIZES.marginLarge,
  },
  tipsTitle: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
    marginBottom: SIZES.marginSmall,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.marginSmall,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  tipIcon: {
    marginRight: SIZES.paddingSmall,
  },
  tipText: {
    fontSize: SIZES.body,
  },
  footer: {
    padding: SIZES.padding,
    paddingBottom: Platform.OS === 'ios' ? 34 : SIZES.padding,
    alignItems: 'center',
  },
  disclaimer: {
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.6,
  },
  disclaimerContainer: {
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 34 : 15,
    paddingHorizontal: SIZES.padding * 2,
    alignItems: 'center',
  },
  secondaryButton: {
    minWidth: '80%',
    borderRadius: SIZES.radiusLarge,
    paddingVertical: SIZES.paddingSmall,
    paddingHorizontal: SIZES.padding,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.marginSmall,
  },
  sectionTitle: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
  },
  remainingSessionsText: {
    fontSize: SIZES.small,
    marginTop: 4,
  },
  premiumBannerContainer: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.paddingSmall / 2,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  premiumBanner: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.paddingSmall,
  },
  premiumBannerTextContainer: {
    flex: 1,
  },
  premiumBannerTitle: {
    color: '#ffffff',
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  premiumBannerSubtitle: {
    color: '#ffffff',
    fontSize: SIZES.small,
    opacity: 0.9,
  },
  premiumBannerButton: {
    backgroundColor: '#ffffff',
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.paddingSmall / 2,
    paddingHorizontal: SIZES.padding,
  },
  premiumBannerButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.small,
    fontWeight: '600',
  },
  sessionCounterContainer: {
    marginVertical: SIZES.margin,
    alignItems: 'center',
  },
  sessionCounterText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionCounterDescription: {
    fontSize: SIZES.small,
    textAlign: 'center',
  },
  premiumIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  premiumIndicatorText: {
    color: '#ffffff',
    fontSize: SIZES.small - 2,
    fontWeight: '600',
  },
  sessionStartTime: {
    fontSize: SIZES.small,
    marginTop: 4,
  },
}); 