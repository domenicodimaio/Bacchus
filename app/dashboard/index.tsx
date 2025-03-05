import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, StatusBar, Alert } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SIZES, BAC_LIMITS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
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
import sessionService, { UserProfile as ProfileType, Session } from '../lib/services/session.service';
import * as profileService from '../lib/services/profile.service';
import CustomTabBar from '../components/CustomTabBar';
import UserProfileComponent from '../components/UserProfile';
import AppHeader from '../components/AppHeader';

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
  
  // Animated values
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.9);
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.8);
  
  // Load data on mount
  useEffect(() => {
    loadProfiles();
    loadActiveSession();
    
    // Start a timer to update session data more frequently
    const timer = setInterval(() => {
      loadActiveSession();
    }, 3000); // Update every 3 seconds instead of 10 seconds
    
    setUpdateTimer(timer);
    
    // Clean up timer on unmount
    return () => {
      if (updateTimer) {
        clearInterval(updateTimer);
      }
    };
  }, []);
  
  // Force an update of the BAC value every second to ensure smooth animation
  useEffect(() => {
    if (!session) return;
    
    const forceUpdateTimer = setInterval(() => {
      // Create a new object to force a re-render
      setBacData(prev => ({
        ...prev,
        currentBac: session.currentBAC,
        // Add a tiny random value to ensure state change even if the value is the same
        _forceUpdate: Math.random()
      }));
    }, 1000);
    
    return () => clearInterval(forceUpdateTimer);
  }, [session]);
  
  // Load available profiles
  const loadProfiles = () => {
    const availableProfiles = profileService.getProfiles();
    setProfiles(availableProfiles);
    
    // If there's only one profile, set it as active
    if (availableProfiles.length === 1) {
      setActiveProfile(availableProfiles[0]);
    }
  };
  
  // Load active session data
  const loadActiveSession = () => {
    const currentSession = sessionService.getActiveSession();
    
    if (currentSession) {
      setSession(currentSession);
      setIsSessionActive(true);
      
      // Update BAC data
      setBacData({
        currentBac: currentSession.currentBAC,
        status: currentSession.status,
        timeToSober: currentSession.soberTime,
        timeToLegal: currentSession.legalTime,
      });
    } else {
      setSession(null);
      setIsSessionActive(false);
    }
    
    // Animate elements on load
    cardOpacity.value = withSequence(
      withDelay(300, withTiming(1, { duration: 800 }))
    );
    cardScale.value = withSequence(
      withDelay(300, withTiming(1, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }))
    );
    
    // Animate button
    buttonOpacity.value = withSequence(
      withDelay(500, withTiming(1, { duration: 800 }))
    );
    buttonScale.value = withSequence(
      withDelay(800, withTiming(1.1, { duration: 300 })),
      withTiming(1, { duration: 200 })
    );
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
    if (!session) return '00:00:00';
    return session.sessionDuration;
  };

  // Handle starting a new session
  const handleStartSession = () => {
    if (profiles.length === 0) {
      // No profiles available
      Alert.alert(
        t('noProfiles', { ns: 'profile' }),
        t('createProfileFirst', { ns: 'profile' }),
        [
          {
            text: t('cancel', { ns: 'common' }),
            style: 'cancel',
          },
          {
            text: t('createProfile', { ns: 'profile' }),
            onPress: () => router.push('/onboarding/profile-wizard'),
          }
        ]
      );
      return;
    }
    
    if (profiles.length === 1) {
      // Only one profile, use it automatically
      const newSession = sessionService.createSession(profiles[0]);
      setSession(newSession);
      setIsSessionActive(true);
      router.push('/session');
    } else {
      // Multiple profiles, let user choose
      Alert.alert(
        t('selectProfile', { ns: 'common' }),
        t('selectProfileForSession', { ns: 'session' }),
        profiles.map(profile => ({
          text: profile.name,
          onPress: () => {
            const newSession = sessionService.createSession(profile);
            setSession(newSession);
            setIsSessionActive(true);
            router.push('/session');
          }
        }))
      );
    }
  };

  // Handle continuing an active session
  const handleContinueSession = () => {
    if (session) {
      router.push('/session');
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      {/* Replace custom header with AppHeader */}
      <AppHeader 
        title="dashboard"
        isMainScreen={true}
        rightComponent={
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
            >
              <FontAwesome5 name="cog" size={22} color={colors.text} />
            </TouchableOpacity>
            
            <UserProfileComponent minimal />
          </View>
        }
      />
      
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Main content remains the same */}
      {isSessionActive ? (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.mainCard, cardAnimatedStyle, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {t('currentBAC')}
            </Text>
            
            <BACDisplay 
              bac={bacData.currentBac} 
              timeToSober={bacData.timeToSober}
              timeToLegal={bacData.timeToLegal}
              timeToZero={bacData.timeToSober}
            />
            
            <View style={styles.sessionInfo}>
              <View style={styles.sessionItem}>
                <Text style={[styles.sessionLabel, { color: colors.textSecondary }]}>
                  {t('sessionActive', { ns: 'session' })}
                </Text>
                <Text style={[styles.sessionValue, { color: colors.text }]}>
                  {formatSessionDuration()}
                </Text>
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
                onPress={handleStartSession}
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
              onPress={() => router.push('/profiles')}
            >
              <Ionicons name="person" size={22} color={colors.primary} />
              <Text style={[styles.quickLinkText, { color: colors.text }]}>
                {t('profiles')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickLinkButton, { backgroundColor: colors.card }]} 
              onPress={() => router.push('/(tabs)/history' as any)}
            >
              <Ionicons name="time" size={22} color={colors.primary} />
              <Text style={[styles.quickLinkText, { color: colors.text }]}>
                {t('history')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickLinkButton, { backgroundColor: colors.card }]} 
              onPress={() => router.push('/(tabs)/info' as any)}
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
            
            <Animated.View style={[styles.startButtonContainer, buttonAnimatedStyle]}>
              <TouchableOpacity 
                style={[styles.mainButton, { backgroundColor: colors.primary }]}
                onPress={handleStartSession}
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
              onPress={() => router.push('/profiles')}
            >
              <Ionicons name="person" size={22} color={colors.primary} />
              <Text style={[styles.quickLinkText, { color: colors.text }]}>
                {t('profiles')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickLinkButton, { backgroundColor: colors.card }]} 
              onPress={() => router.push('/(tabs)/history' as any)}
            >
              <Ionicons name="time" size={22} color={colors.primary} />
              <Text style={[styles.quickLinkText, { color: colors.text }]}>
                {t('history')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickLinkButton, { backgroundColor: colors.card }]} 
              onPress={() => router.push('/(tabs)/info' as any)}
            >
              <Ionicons name="information-circle" size={22} color={colors.primary} />
              <Text style={[styles.quickLinkText, { color: colors.text }]}>
                {t('info')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <View style={styles.footer}>
        <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
          {t('disclaimer', { ns: 'common' })}
        </Text>
      </View>
      
      <CustomTabBar />
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
    fontSize: SIZES.small,
    textAlign: 'center',
    paddingHorizontal: SIZES.padding,
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
}); 