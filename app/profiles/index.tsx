import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  StatusBar,
  Platform,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { router, usePathname, Stack } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { SIZES } from '../constants/theme';
import AppHeader from '../components/AppHeader';
import { useUserProfile } from '../contexts/ProfileContext';
import { extendProfile } from '../types/profile';
import * as sessionService from '../lib/services/session.service';
import * as profileService from '../lib/services/profile.service';
import { formatDate } from '../utils/timeUtils';
import { useAuth } from '../contexts/AuthContext';
import CustomTabBar from '../components/CustomTabBar';
import * as authService from '../lib/services/auth.service';
import Toast from 'react-native-toast-message';
import { navigateToSession } from '../session/index';
import PremiumFeatureBlock from '../components/PremiumFeatureBlock';
import { usePremiumFeatures } from '../hooks/usePremiumFeatures';

export default function ProfilesScreen() {
  const { t, i18n } = useTranslation(['profile', 'common', 'session', 'auth']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const { profile } = useUserProfile();
  const { logout, user } = useAuth();
  const { isPremium, canUseDetailed } = usePremiumFeatures();
  const pathname = usePathname();
  
  const [isLoading, setIsLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalSessions: 0,
    totalDrinks: 0,
    totalAlcoholGrams: 0,
    averageBACMax: 0,
    lastSession: null,
    mostFrequentDrink: '',
    drinkingDays: [],
  });
  
  useEffect(() => {
    // Carica statistiche solo quando c'è un profilo attivo
    if (profile) {
      loadStatistics();
    } else {
      setIsLoading(false);
    }
  }, [profile]);
  
  const loadStatistics = async () => {
    setIsLoading(true);
    
    try {
      if (!profile) {
        setIsLoading(false);
        return;
      }
      
      // Ottieni la cronologia delle sessioni per questo profilo
      const sessionHistory = sessionService.getSessionHistory().filter(
        session => session && session.profile && session.profile.id === profile.id
      );
      
      // Calcola le statistiche
      const totalSessions = sessionHistory.length;
      let totalDrinks = 0;
      let totalAlcoholGrams = 0;
      let bacSum = 0;
      const drinks = {};
      const days = {};
      
      sessionHistory.forEach(session => {
        // Conta le bevande
        if (session.drinks && Array.isArray(session.drinks)) {
          totalDrinks += session.drinks.length;
          
          // Somma i grammi di alcol
          session.drinks.forEach(drink => {
            // Assicuriamoci che alcoholGrams sia un numero
            const alcoholGrams = typeof drink.alcoholGrams === 'number' ? drink.alcoholGrams : parseFloat(drink.alcoholGrams);
            if (!isNaN(alcoholGrams)) {
              totalAlcoholGrams += alcoholGrams;
            }
            
            // Conta la frequenza delle bevande
            const drinkName = drink.name;
            drinks[drinkName] = (drinks[drinkName] || 0) + 1;
          });
        }
        
        // Somma il BAC massimo raggiunto
        // Assicuriamoci che currentBAC sia un numero
        const currentBAC = typeof session.currentBAC === 'number' ? session.currentBAC : parseFloat(session.currentBAC);
        if (!isNaN(currentBAC)) {
          bacSum += currentBAC;
        }
        
        // Conta i giorni di consumo
        const sessionDate = new Date(session.startTime);
        const dateStr = formatDate(sessionDate);
        days[dateStr] = true;
      });
      
      // Trova la bevanda più frequente
      let mostFrequentDrink = '';
      let maxCount = 0;
      
      Object.keys(drinks).forEach(drink => {
        if (drinks[drink] > maxCount) {
          maxCount = drinks[drink];
          mostFrequentDrink = drink;
        }
      });
      
      // Calcola la media del BAC massimo
      const averageBACMax = totalSessions > 0 ? bacSum / totalSessions : 0;
      
      // Ottieni l'ultima sessione
      const lastSession = sessionHistory.length > 0 
        ? sessionHistory[sessionHistory.length - 1] 
        : null;
      
      // Imposta le statistiche
      setStatistics({
        totalSessions,
        totalDrinks,
        totalAlcoholGrams,
        averageBACMax,
        lastSession,
        mostFrequentDrink,
        drinkingDays: Object.keys(days),
      });
    } catch (error) {
      console.error('Errore nel caricamento delle statistiche:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProfile = () => {
    router.push('/onboarding/profile-wizard');
  };

  const handleEditProfile = () => {
    if (!profile) return;
    
    router.push({
      pathname: '/profiles/edit',
      params: { profileId: profile.id }
    });
  };

  const handleSettings = () => {
    router.push('/settings');
  };
  
  const handleLogout = () => {
    Alert.alert(
      t('logout', { ns: 'auth' }),
      t('confirmLogout', { ns: 'auth' }),
      [
        {
          text: t('cancel', { ns: 'common' }),
          style: 'cancel',
        },
        {
          text: t('logout', { ns: 'auth' }),
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            const result = await authService.signOut();
            setIsLoading(false);
            
            if (result.success) {
              router.replace('/auth/login');
            } else {
              Alert.alert(
                t('error', { ns: 'common' }),
                t('logoutFailed', { ns: 'auth' })
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      i18n.language === 'it' ? 'Elimina Account' : 'Delete Account',
      i18n.language === 'it' 
        ? 'ATTENZIONE: Questa azione è irreversibile. Tutti i tuoi dati verranno eliminati definitivamente. Vuoi davvero procedere?' 
        : 'WARNING: This action is irreversible. All your data will be permanently deleted. Do you really want to proceed?',
      [
        {
          text: i18n.language === 'it' ? 'Annulla' : 'Cancel',
          style: 'cancel',
        },
        {
          text: i18n.language === 'it' ? 'Elimina Account' : 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              // Attiva l'indicatore di caricamento ma non mostrare Toast durante l'operazione
              setIsLoading(true);
              
              // Reindirizza immediatamente alla pagina di login prima di eseguire l'eliminazione
              // questo evita il freeze dell'interfaccia durante l'operazione
              router.replace('/auth/login');
              
              // Dopo il reindirizzamento, esegui l'eliminazione dell'account in background
              setTimeout(async () => {
                try {
                  // Eseguiamo l'eliminazione account in background, l'utente è già stato reindirizzato
                  await authService.deleteAccount();
                  
                  // Facciamo vedere un toast direttamente nella schermata di login
                  Toast.show({
                    type: 'success',
                    text1: i18n.language === 'it' ? 'Account eliminato' : 'Account deleted',
                    text2: i18n.language === 'it' 
                      ? 'Il tuo account è stato eliminato con successo' 
                      : 'Your account was successfully deleted',
                    visibilityTime: 3000,
                    position: 'bottom',
                  });
                } catch (error) {
                  console.error('Errore eliminazione account in background:', error);
                  // Non mostriamo errori qui all'utente, è già stato reindirizzato
                } finally {
                  setIsLoading(false);
                }
              }, 500);
            } catch (error) {
              console.error('Errore durante il reindirizzamento:', error);
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // Parte Statistics for Premium Users
  const renderDetailedStatistics = () => {
    if (!profile) return null;
    
    return (
      <>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {i18n.language === 'it' ? 'Le tue Statistiche Dettagliate' : 'Your Detailed Statistics'}
        </Text>
        
        <View style={styles.statsGrid}>
          {/* Sessions */}
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="calendar" size={32} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {statistics.totalSessions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {i18n.language === 'it' ? 'Sessioni' : 'Sessions'}
            </Text>
          </View>
          
          {/* Drinks */}
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="wine" size={32} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {statistics.totalDrinks}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {i18n.language === 'it' ? 'Bevande' : 'Drinks'}
            </Text>
          </View>
          
          {/* Total Alcohol */}
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="flask" size={32} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {statistics.totalAlcoholGrams.toFixed(0)}g
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {i18n.language === 'it' ? 'Alcol Totale' : 'Total Alcohol'}
            </Text>
          </View>
          
          {/* Avg BAC */}
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="analytics" size={32} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {statistics.averageBACMax.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {i18n.language === 'it' ? 'Media BAC' : 'Avg. BAC'}
            </Text>
          </View>
        </View>
        
        {statistics.totalSessions > 0 && (
          <>
            {/* Last Session */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {i18n.language === 'it' ? 'Ultima Sessione' : 'Last Session'}
            </Text>
            
            <View style={[styles.lastSessionCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.lastSessionHeader}>
                <Ionicons name="time" size={24} color={colors.primary} />
                <Text style={[styles.lastSessionDate, { color: colors.text }]}>
                  {statistics.lastSession ? formatDate(new Date(statistics.lastSession.startTime)) : ''}
                </Text>
              </View>
              
              <View style={styles.lastSessionInfo}>
                <Text style={[styles.lastSessionLabel, { color: colors.textSecondary }]}>
                  {i18n.language === 'it' ? 'BAC Massimo' : 'Max BAC'}
                </Text>
                <Text style={[styles.lastSessionValue, { color: colors.text }]}>
                  {statistics.lastSession ? statistics.lastSession.currentBAC.toFixed(2) : '0.00'}
                </Text>
              </View>
              
              <View style={styles.lastSessionInfo}>
                <Text style={[styles.lastSessionLabel, { color: colors.textSecondary }]}>
                  {i18n.language === 'it' ? 'Bevande' : 'Drinks'}
                </Text>
                <Text style={[styles.lastSessionValue, { color: colors.text }]}>
                  {statistics.lastSession ? statistics.lastSession.drinks.length : 0}
                </Text>
              </View>
            </View>
          </>
        )}
      </>
    );
  };
  
  // Parte Statistics for Free Users (versione ridotta)
  const renderBasicStatistics = () => {
    if (!profile) return null;
    
    return (
      <>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {i18n.language === 'it' ? 'Le tue Statistiche' : 'Your Statistics'}
        </Text>
        
        <View style={styles.statsGrid}>
          {/* Sessions */}
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="calendar" size={32} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {statistics.totalSessions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {i18n.language === 'it' ? 'Sessioni' : 'Sessions'}
            </Text>
          </View>
          
          {/* Drinks */}
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="wine" size={32} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {statistics.totalDrinks}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {i18n.language === 'it' ? 'Bevande' : 'Drinks'}
            </Text>
          </View>
        </View>
        
        {/* Premium Feature Block per statistiche dettagliate */}
        <PremiumFeatureBlock
          featureName={t('advancedStatistics', { ns: 'purchases' })}
          icon="analytics"
          message={t('featureNeedsPremium', { 
            ns: 'purchases', 
            feature: t('advancedStatistics', { ns: 'purchases' }) 
          })}
        />
      </>
    );
  };

  // Rendering condizionale durante il caricamento
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <StatusBar barStyle="light-content" backgroundColor={colors.background} />
          
          <AppHeader 
            title={i18n.language === 'it' ? 'Profilo' : 'Profile'}
            isMainScreen={true}
            translationNamespace="profile"
          />
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <CustomTabBar />
        </View>
      </>
    );
  }
  
  // Se non c'è un profilo, mostra il pulsante di creazione
  if (!profile) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <StatusBar barStyle="light-content" backgroundColor={colors.background} />
          
          <AppHeader 
            title={i18n.language === 'it' ? 'Profilo' : 'Profile'}
            isMainScreen={true}
            translationNamespace="profile"
          />
          
          <View style={styles.emptyStateContainer}>
            <Ionicons 
              name="person-add-outline" 
              size={100} 
              color={colors.textTertiary} 
              style={styles.emptyStateIcon}
            />
            
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
              {i18n.language === 'it' ? 'Nessun profilo configurato' : 'No profile set up yet'}
            </Text>
            
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              {i18n.language === 'it' 
                ? 'Crea un profilo per ottenere calcoli accurati del tasso alcolemico e monitorare le tue sessioni.' 
                : 'Create a profile to get accurate BAC calculations and track your drinking sessions.'}
            </Text>
            
            <TouchableOpacity
              style={[styles.createProfileButton, { backgroundColor: colors.primary }]}
              onPress={handleCreateProfile}
            >
              <Text style={[styles.createProfileButtonText, { color: colors.headerText }]}>
                {i18n.language === 'it' ? 'Crea Profilo' : 'Create Profile'}
              </Text>
            </TouchableOpacity>
          </View>
          <CustomTabBar />
        </View>
      </>
    );
  }
  
  // Converte il profilo in formato esteso per avere accesso alle proprietà aggiuntive
  const extendedProfile = extendProfile(profile);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        
        <AppHeader 
          title={i18n.language === 'it' ? 'Profilo' : 'Profile'}
          isMainScreen={true}
          translationNamespace="profile"
        />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Profilo utente */}
          <View style={[styles.profileCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.profileHeader}>
              <View 
                style={[
                  styles.profileAvatar,
                  { backgroundColor: extendedProfile.color || colors.primary }
                ]}
              >
                {extendedProfile.emoji ? (
                  <Text style={styles.profileEmoji}>{extendedProfile.emoji}</Text>
                ) : (
                  <Text style={styles.profileInitial}>
                    {extendedProfile.name && extendedProfile.name.length > 0
                      ? extendedProfile.name.charAt(0).toUpperCase()
                      : '?'}
                  </Text>
                )}
              </View>
              
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]}>
                  {extendedProfile.name}
                </Text>
                
                <Text style={[styles.profileDetails, { color: colors.textSecondary }]}>
                  {extendedProfile.gender === 'male' ? t('male') : t('female')}, {extendedProfile.weightKg} kg
                  {extendedProfile.age && `, ${extendedProfile.age} ${t('years')}`}
                  {extendedProfile.height && `, ${extendedProfile.height} cm`}
                </Text>
                
                {/* Account email or Guest indication */}
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                  {profile.isGuest 
                    ? t('guestAccount', { ns: 'auth', defaultValue: 'Guest Account' })
                    : user?.email || t('authenticatedUser', { ns: 'auth', defaultValue: 'Authenticated User' })}
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.surface }]}
                onPress={handleEditProfile}
              >
                <MaterialIcons name="edit" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            {/* Aggiungi opzioni account qui */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            
            <View style={styles.optionsContainer}>
              {/* Impostazioni */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleSettings}
              >
                <Ionicons name="settings-outline" size={24} color={colors.primary} />
                <Text style={[styles.optionText, { color: colors.text }]}>
                  {i18n.language === 'it' ? 'Impostazioni' : 'Settings'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
              
              {/* Logout */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={24} color={colors.error} />
                <Text style={[styles.optionText, { color: colors.error }]}>
                  {i18n.language === 'it' ? 'Disconnetti' : 'Logout'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
              
              {/* Delete Account - Only for authenticated users */}
              {!profile.isGuest && (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={handleDeleteAccount}
                >
                  <Ionicons name="trash-outline" size={24} color="#ff3b30" />
                  <Text style={[styles.optionText, { color: "#ff3b30" }]}>
                    {i18n.language === 'it' ? 'Elimina Account' : 'Delete Account'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Statistiche del profilo */}
          {isPremium ? renderDetailedStatistics() : renderBasicStatistics()}
        </ScrollView>
        <CustomTabBar />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SIZES.padding,
    paddingBottom: 100, // Extra space at bottom for tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  emptyStateIcon: {
    marginBottom: SIZES.marginLarge,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: SIZES.marginSmall,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: SIZES.body,
    textAlign: 'center',
    marginBottom: SIZES.marginLarge,
  },
  createProfileButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: SIZES.radius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createProfileButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileCard: {
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.marginLarge,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.marginSmall,
  },
  profileInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  profileEmoji: {
    fontSize: 28,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileDetails: {
    fontSize: 14,
    marginTop: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  editButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: SIZES.marginSmall,
  },
  optionsContainer: {
    marginTop: SIZES.marginSmall,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionText: {
    flex: 1,
    fontSize: SIZES.body,
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
    marginBottom: SIZES.marginSmall,
    marginTop: SIZES.marginLarge,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SIZES.margin,
  },
  statCard: {
    width: '48%',
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.marginSmall,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: SIZES.small,
  },
  lastSessionCard: {
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.marginLarge,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  lastSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.marginSmall,
  },
  lastSessionDate: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    marginLeft: SIZES.marginSmall,
  },
  lastSessionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    paddingTop: 12,
  },
  lastSessionLabel: {
    fontSize: SIZES.body,
  },
  lastSessionValue: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
  noDataCard: {
    borderRadius: SIZES.radius,
    padding: SIZES.paddingLarge,
    marginTop: SIZES.margin,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  noDataText: {
    fontSize: SIZES.body,
    textAlign: 'center',
    marginTop: SIZES.marginSmall,
    marginBottom: SIZES.marginLarge,
  },
  startSessionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: SIZES.radiusSmall,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startSessionButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
}); 