import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { SIZES } from '../constants/theme';
import AppHeader from '../components/AppHeader';
import OfflineIndicator from '../components/OfflineIndicator';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

export default function InformationScreen() {
  const { t } = useTranslation(['profile', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  
  // 🔧 FIX CRASH: Flag per controllare se il componente è montato
  const isMounted = useRef(true);
  
  // Variabili per la gestione dello swipe back
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // 🔧 FIX CRASH: Cleanup quando il componente viene smontato
  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Reset sicuro delle animazioni
      try {
        translateX.value = 0;
        translateY.value = 0;
      } catch (error) {
        console.log('Information cleanup: Animation reset failed (safe to ignore)');
      }
    };
  }, []);
  
  // Configura il gesto di swipe con controllo sicurezza
  const swipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      // 🔧 FIX CRASH: Solo se il componente è ancora montato
      if (isMounted.current && event.translationX > 0) {
        try {
          translateX.value = event.translationX;
        } catch (error) {
          console.log('Information: Animation update failed (component unmounted)');
        }
      }
    })
    .onEnd((event) => {
      // 🔧 FIX CRASH: Solo se il componente è ancora montato
      if (!isMounted.current) {
        return;
      }
      
      try {
        if (event.translationX > 100) {
          // 🔧 FIX SCHERMATA BIANCA: Reset animazioni prima di navigare
          console.log('🎯 INFORMATION SWIPE: Navigando alla dashboard...');
          translateX.value = 0;
          translateY.value = 0;
          // Usa runOnJS per navigare dal thread principale
          const navigateToDashboard = () => {
            router.replace('/(tabs)/dashboard');
          };
          runOnJS(navigateToDashboard)();
        } else {
          // Altrimenti resetta la posizione
          translateX.value = withTiming(0);
        }
      } catch (error) {
        console.log('Information: Animation end failed (component unmounted)');
      }
    });
  
  // Stile animato per il container con controllo sicurezza
  const animatedStyle = useAnimatedStyle(() => {
    // 🔧 FIX CRASH: Ritorna valore sicuro se componente smontato
    try {
      return {
        transform: [{ translateX: translateX.value }]
      };
    } catch (error) {
      return {
        transform: [{ translateX: 0 }]
      };
    }
  });
  
  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[styles.container, { backgroundColor: colors.background }, animatedStyle]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        
        <AppHeader 
          title={t('information', { ns: 'profile' })}
          isMainScreen={false}
        />
        
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('aboutApp', { ns: 'profile' })}
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Bacchus è un'applicazione progettata per aiutarti a monitorare il tuo consumo di alcol e valutare il tasso alcolemico nel sangue (BAC).
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Versione: 1.0.0
            </Text>
          </View>
          
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('help', { ns: 'profile' })}
            </Text>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => {/* Azione per l'aiuto */}}
            >
              <Ionicons name="help-circle-outline" size={24} color={colors.primary} style={styles.linkIcon} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                Centro Assistenza
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => {/* Azione per l'FAQ */}}
            >
              <Ionicons name="list-outline" size={24} color={colors.primary} style={styles.linkIcon} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                FAQ
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('privacyPolicy', { ns: 'profile' })}
            </Text>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => {/* Azione per la privacy policy */}}
            >
              <Ionicons name="shield-outline" size={24} color={colors.primary} style={styles.linkIcon} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                {t('privacyPolicy', { ns: 'profile' })}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Disclaimer
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              L'app Bacchus fornisce stime approssimative del tasso alcolemico basate su informazioni fornite dall'utente. Queste stime non sono accurate al 100% e non dovrebbero essere utilizzate come sostituto di attrezzature professionali di misurazione dell'alcol.
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Non guidare mai dopo aver bevuto, indipendentemente dai risultati mostrati dall'app.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </GestureDetector>
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
    padding: SIZES.padding,
    paddingBottom: 40,
  },
  section: {
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.marginLarge,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
    marginBottom: SIZES.marginSmall,
  },
  sectionText: {
    fontSize: SIZES.body,
    lineHeight: 22,
    marginBottom: SIZES.marginSmall,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkIcon: {
    marginRight: 12,
  },
  linkText: {
    fontSize: SIZES.body,
    fontWeight: '500',
  },
}); 