import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Alert,
  Dimensions,
  ActivityIndicator,
  AppState,
  FlatList,
  Modal,
  Image,
  Pressable,
  SafeAreaView,
  useColorScheme
} from 'react-native';
import { router, useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SIZES } from '../constants/theme';
import { getBACInfo, BAC_COLORS, BAC_LIMITS } from '../constants/bac';
import { useTheme } from '../contexts/ThemeContext';
import BACDisplay from '../components/BACDisplay';
import OfflineIndicator from '../components/OfflineIndicator';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  interpolateColor
} from 'react-native-reanimated';
import { LineChart } from 'react-native-chart-kit';
import sessionService, { Session } from '../lib/services/session.service';
import { DrinkRecord, FoodRecord } from '../lib/bac/visualization';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BACChart from '../components/BACChart';
import BACGraph from '../components/BACGraph';
import CustomTabBar from '../components/CustomTabBar';
import UserProfileComponent from '../components/UserProfile';
import { Svg, Circle, Path, Defs, LinearGradient, Stop, Line, Text as SvgText, G, Filter } from 'react-native-svg';
import { formatTimeFromMinutes, formatElapsedTime } from '../utils/timeUtils';
import { calculateBAC, calculateTimeToSober } from '../utils/bacCalculator';
import { useToast } from '../components/Toast';
import { Link } from 'expo-router';
import Toast from '../components/Toast';
import AppHeader from '../components/AppHeader';
import { Card as PaperCard } from 'react-native-paper';
// Importazioni rimosse perché non utilizzate
// import LottieView from 'lottie-react-native';
// import { BlurView } from 'expo-blur';
// import { default as dayjs } from 'dayjs';

// Dimensioni di configurazione
const { width } = Dimensions.get('window');
const CIRCLE_SIZE = 260;
const STROKE_WIDTH = 16;
const BACKGROUND_STROKE_WIDTH = 12;
const PADDING = 24;
const DOT_SIZE = 16;
const INNER_DOT_SIZE = 10;

// Rimuovo la definizione di CircleProgress poiché useremo direttamente BACDisplay

function SessionScreen() {
  const { t } = useTranslation(['session', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();

  // Base session state
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [soberPercentage, setSoberPercentage] = useState(0);
  const [updateTimer, setUpdateTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Stato che tiene traccia se l'app è in focus
  const [isFocused, setIsFocused] = useState(true);

  // Animated values utilizzando useSharedValue
  const buttonsOpacity = useSharedValue(1);
  const bacCircleScale = useSharedValue(1);
  
  // Set per tracciare i parametri elaborati
  const processedParamsRef = useRef<Set<string>>(new Set());
  
  // Stato per il toggle del grafico
  const [showChart, setShowChart] = useState(false);
  
  // Calcola la percentuale di sobrietà basata sul tempo trascorso e il tempo stimato
  const calculateSoberPercentage = useCallback(() => {
    if (!session) return 0;
    
    try {
      // Estrai il tempo di sobrietà dalla sessione (formato: "2h 30m")
      const soberTimeStr = session.soberTime || '0h 00m';
      const hoursMatch = soberTimeStr.match(/(\d+)h/);
      const minutesMatch = soberTimeStr.match(/(\d+)m/);
      
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
      const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
      
      // Converti in millisecondi totali
      const totalSoberTimeMs = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
      
      // Se il BAC è già a 0 o il tempo è 0, siamo già sobri
      if (totalSoberTimeMs <= 0 || session.currentBAC <= 0) return 100;
      
      // Calcola il tempo trascorso dall'inizio della sessione
      const sessionStartTime = new Date(session.startTime).getTime();
      const currentTime = new Date().getTime();
      const elapsedTimeMs = Math.max(0, currentTime - sessionStartTime);
      
      // Calcola la percentuale
      const percentage = Math.min(100, Math.round((elapsedTimeMs / totalSoberTimeMs) * 100));
      
      // Limita la percentuale tra 0 e 100 per sicurezza
      return Math.max(0, Math.min(100, percentage));
    } catch (error) {
      console.error('Error calculating sober percentage:', error);
      return 0;
    }
  }, [session]);
  
  // Gestisce il focus/blur della schermata
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setIsFocused(nextAppState === 'active');
    });

    return () => {
      subscription.remove();
    };
  }, []);
  
  // Carica la sessione quando la schermata è montata e quando ritorna in focus
  useEffect(() => {
    if (isFocused) {
      // Carica immediatamente i dati
      handleRefreshData();
      
      // Create a timer to update data frequently
      const timer = setInterval(() => {
        handleRefreshData();
      }, 5000); // Update every 5 seconds when in focus
      
      setUpdateTimer(timer);
      
      return () => {
        if (timer) clearInterval(timer);
      };
    } else {
      // Clear timer when not in focus to save battery
      if (updateTimer) {
        clearInterval(updateTimer);
        setUpdateTimer(null);
      }
    }
  }, [isFocused]);

  // Aggiorna la percentuale quando cambia la sessione
  useEffect(() => {
    if (session) {
      const percentage = calculateSoberPercentage();
      setSoberPercentage(percentage);
    }
  }, [session, calculateSoberPercentage]);

  // Modifichiamo la funzione che processa i parametri per evitare duplicazioni
  useEffect(() => {
    if (!params || !session) return;
    
    // Funzione per generare una chiave univoca per i parametri
    const getParamKey = (prefix, timestamp) => `${prefix}_${timestamp}`;
    
    // Verifica se ci sono nuovi parametri per bevande
    if (params.newDrink && typeof params.newDrink === 'string' && params.timestamp) {
      const paramKey = getParamKey('drink', params.timestamp);
      
      // Verifica se questo parametro è già stato elaborato
      if (!processedParamsRef.current.has(paramKey)) {
        // Registra il parametro come elaborato prima di fare qualsiasi altra operazione
        processedParamsRef.current.add(paramKey);
        
        try {
          // Parsing dei dati della bevanda
          const drinkData = JSON.parse(params.newDrink);
          
          // Assicuriamoci che drinkData abbia un ID univoco
          if (!drinkData.id) {
            drinkData.id = `drink_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          }
          
          // Verifica se questa bevanda è già nell'elenco per evitare duplicati
          const isDuplicate = session.drinks.some(drink => drink.id === drinkData.id);
          
          if (!isDuplicate) {
            // Aggiunge la bevanda alla sessione
            setSession(prevSession => {
              if (!prevSession) return null;
              
              // Crea una copia profonda per evitare modifiche allo stato direttamente
              const updatedSession = {...prevSession};
              const updatedDrinks = [...updatedSession.drinks, drinkData];
              
              // Calcola il nuovo BAC in base ai grammi di alcol
              const alcoholEffect = 
                typeof drinkData.alcoholGrams === 'number' 
                  ? (drinkData.alcoholGrams * 0.002) 
                  : parseFloat(drinkData.alcoholGrams) * 0.002 || 0.02;
              
              // Limitiamo il BAC a 0.5 (5.0 g/L visualizzato)
              const newBAC = Math.min(updatedSession.currentBAC + alcoholEffect, 0.5);
              
              // Determina il nuovo stato in base al BAC
              const newStatus = 
                newBAC < 0.03 
                  ? 'safe' as 'safe'
                  : newBAC < 0.08 
                    ? 'caution' as 'caution'
                    : 'danger' as 'danger';
              
              // Aggiorna la sessione con i nuovi valori
              updatedSession.drinks = updatedDrinks;
              updatedSession.currentBAC = newBAC;
              updatedSession.status = newStatus;
              
              // Aggiorna anche il servizio di sessione per mantenere i dati sincronizzati
              sessionService.addDrink(drinkData);
              
              // Calcola il tempo per tornare sobri
              const hoursToSober = Math.ceil(newBAC / 0.015);
              updatedSession.soberTime = `${hoursToSober}h ${Math.floor((hoursToSober % 1) * 60)}m`;
              
              // Aggiungi timeToSober in minuti per il componente BACDisplay
              updatedSession.timeToSober = Math.ceil(hoursToSober * 60);
              
              // Calcola la durata della sessione
              const sessionDurationHours = Math.floor(hoursToSober / 60);
              const sessionDurationMinutes = Math.floor(hoursToSober % 60);
              updatedSession.sessionDuration = `${sessionDurationHours}h ${sessionDurationMinutes}m`;
              
              return updatedSession;
            });
      }
    } catch (error) {
          console.error('Error processing drink param:', error);
        }
      }
    }
    
    // Verifica se ci sono nuovi parametri per cibo
    if (params.newFood && typeof params.newFood === 'string' && params.timestamp) {
      const paramKey = getParamKey('food', params.timestamp);
      
      // Verifica se questo parametro è già stato elaborato
      if (!processedParamsRef.current.has(paramKey)) {
        // Registra il parametro come elaborato prima di fare qualsiasi altra operazione
        processedParamsRef.current.add(paramKey);
        
        try {
          // Parsing dei dati del cibo
          const foodData = JSON.parse(params.newFood);
          
          // Assicuriamoci che foodData abbia un ID univoco
          if (!foodData.id) {
            foodData.id = `food_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          }
          
          // Assicuriamoci che il formato della data sia corretto (ISO)
          if (foodData.timeConsumed) {
            // Controlla se è già in formato ISO
            if (!foodData.timeConsumed.includes('T')) {
              // Converti in formato ISO
              foodData.timeConsumed = new Date(foodData.timeConsumed).toISOString();
            }
          } else {
            // Se manca, imposta la data corrente
            foodData.timeConsumed = new Date().toISOString();
          }
          
          // Aggiungi il campo time come stringa ISO per coerenza con il formato del drink
          if (!foodData.time || !foodData.time.includes('T')) {
            foodData.time = foodData.timeConsumed;
          }
          
          // Verifica se questo cibo è già nell'elenco per evitare duplicati
          const isDuplicate = session.foods.some(food => food.id === foodData.id);
          
          if (!isDuplicate) {
            // Aggiunge il cibo alla sessione
            setSession(prevSession => {
              if (!prevSession) return null;
              
              // Crea una copia profonda per evitare modifiche allo stato direttamente
              const updatedSession = {...prevSession};
              const updatedFoods = [...updatedSession.foods, foodData];
              
              // Il cibo riduce il BAC
              const foodEffect = 
                foodData.absorptionFactor ? 
                (parseFloat(foodData.absorptionFactor) * 0.01) : 0.01;
              
              // Minimo 0
              const newBAC = Math.max(updatedSession.currentBAC - foodEffect, 0);
              
              // Determina il nuovo stato
              const newStatus = 
                newBAC < 0.03 
                  ? 'safe' as 'safe'
                  : newBAC < 0.08 
                    ? 'caution' as 'caution'
                    : 'danger' as 'danger';
              
              // Aggiorna la sessione con i nuovi valori
              updatedSession.foods = updatedFoods;
              updatedSession.currentBAC = newBAC;
              updatedSession.status = newStatus;
              
              // Aggiorna anche il servizio di sessione per mantenere i dati sincronizzati
              const formattedFoodData = {
                ...foodData,
                // Assicurati che i campi richiesti siano presenti e nel formato corretto
                id: foodData.id,
                name: foodData.name,
                time: foodData.time || new Date().toISOString(), // Assicurati che ci sia il campo time
                absorptionFactor: typeof foodData.absorptionFactor === 'string' 
                  ? parseFloat(foodData.absorptionFactor) 
                  : foodData.absorptionFactor
              };
              
              sessionService.addFood(formattedFoodData);
              
              // Calcola il tempo per tornare sobri
              const hoursToSober = Math.ceil(newBAC / 0.015);
              updatedSession.soberTime = `${hoursToSober}h ${Math.floor((hoursToSober % 1) * 60)}m`;
              
              // Aggiungi timeToSober in minuti per il componente BACDisplay
              updatedSession.timeToSober = Math.ceil(hoursToSober * 60);
              
              // Calcola la durata della sessione
              const sessionDurationHours = Math.floor(hoursToSober / 60);
              const sessionDurationMinutes = Math.floor(hoursToSober % 60);
              updatedSession.sessionDuration = `${sessionDurationHours}h ${sessionDurationMinutes}m`;
              
              return updatedSession;
            });
          }
        } catch (error) {
          console.error('Error processing food param:', error);
        }
      }
    }
  }, [params, session]);

  // Handle data refresh
  const handleRefreshData = async () => {
    try {
      console.log('[SessionScreen] Aggiornamento dati della sessione');
      
      // Force BAC update by using the session service
      const sessionService = require('../lib/services/session.service');
      
      // Aggiorna il BAC e ottieni la sessione aggiornata
      const updatedSession = sessionService.updateSessionBAC();
      
      if (updatedSession) {
        console.log(`[SessionScreen] BAC aggiornato: ${updatedSession.currentBAC.toFixed(3)}`);
        console.log(`[SessionScreen] timeToSober: ${updatedSession.timeToSober}, tipo: ${typeof updatedSession.timeToSober}`);
        console.log(`[SessionScreen] timeToLegal: ${updatedSession.timeToLegal}, tipo: ${typeof updatedSession.timeToLegal}`);
        
        // Forza un nuovo oggetto di sessione per assicurarsi che React rilevi il cambiamento
        setSession(prevSession => {
          if (!prevSession || 
              prevSession.currentBAC !== updatedSession.currentBAC || 
              prevSession.status !== updatedSession.status) {
            console.log('[SessionScreen] Sessione cambiata, aggiornando lo stato');
            return {...updatedSession, _updateTimestamp: Date.now()};
          }
          return prevSession;
        });
        
        // Update the percentage
        const percentage = calculateSoberPercentage();
        setSoberPercentage(percentage);
      } else {
        console.log('[SessionScreen] Nessuna sessione attiva trovata');
        setSession(null);
        
        // Reindirizza alla dashboard se non c'è una sessione attiva
        router.replace('/dashboard');
      }
      
      // Imposta loading a false in ogni caso
      setLoading(false);
    } catch (error) {
      console.error('Error refreshing data:', error);
      // Imposta loading a false anche in caso di errore
      setLoading(false);
      
      showToast({
        type: 'error',
        message: t('errorLoadingSession', { ns: 'session' }),
      });
    }
  };

  // Animated styles
  const buttonsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonsOpacity.value,
    };
  });
  
  const bacCircleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: bacCircleScale.value }]
    };
  });

  // Handle toggle chart
  const handleToggleChart = () => {
    // Se stiamo per mostrare il grafico, aggiorniamo i dati
    if (!showChart) {
      handleRefreshData();
      
      // Ensure we have bacSeries data for the chart
      if (session && (!session.bacSeries || session.bacSeries.length < 2)) {
        console.log('Creating sample bacSeries data for display');
        
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        
        // Use the session's current BAC value for display
        const currentBacValue = session.currentBAC || 0;
        
        // Create minimal dataset with the current BAC value
        session.bacSeries = [
          { time: twoHoursAgo.toISOString(), bac: Math.max(0, currentBacValue - 0.15) },
          { time: oneHourAgo.toISOString(), bac: Math.max(0, currentBacValue - 0.08) },
          { time: now.toISOString(), bac: currentBacValue }
        ];
      }
    }
    setShowChart(prev => !prev);
  };

  // Navigate to add drink screen
  const handleAddDrink = () => {
    // Non abbiamo più bisogno di resettare paramsProcessed
    // setParamsProcessed(false);
    
    // Puliamo qualsiasi parametro processato esistente con lo stesso nome
    // prima di navigare per assicurarci che venga processato nuovamente
    if (params && params.newDrink) {
      if (processedParamsRef.current.has(`drink_${params.timestamp}`)) {
        processedParamsRef.current.delete(`drink_${params.timestamp}`);
      }
    }
    
    router.push('/session/add-drink');
  };

  // Navigate to add food screen
  const handleAddFood = () => {
    // Non abbiamo più bisogno di resettare paramsProcessed
    // setParamsProcessed(false);
    
    // Puliamo qualsiasi parametro processato esistente con lo stesso nome
    // prima di navigare per assicurarci che venga processato nuovamente
    if (params && params.newFood) {
      if (processedParamsRef.current.has(`food_${params.timestamp}`)) {
        processedParamsRef.current.delete(`food_${params.timestamp}`);
      }
    }
    
    router.push('/session/add-food');
  };

  // Handle end session with confirmation
  const handleEndSession = () => {
    Alert.alert(
      t('endSession', { ns: 'session' }),
      t('endSessionConfirm', { ns: 'session' }),
      [
        {
          text: t('cancel', { ns: 'common' }),
          style: 'cancel'
        },
        {
          text: t('confirm', { ns: 'common' }),
          onPress: () => {
            try {
              // Salva la sessione nella cronologia usando il servizio
              const sessionService = require('../lib/services/session.service');
              const endedSession = sessionService.endSession();
              
              if (endedSession) {
                console.log('Sessione terminata e salvata nella cronologia:', endedSession.id);
                
                // Mostra toast di conferma
                showToast({
                  message: t('sessionSavedToHistory', { ns: 'session' }),
                  type: 'success'
                });
              }
              
              // Torna alla dashboard
              router.push('/dashboard');
            } catch (error) {
              console.error('Errore nel terminare la sessione:', error);
              Alert.alert(
                t('error', { ns: 'common' }),
                t('errorEndingSession', { ns: 'session' }),
                [{ text: t('ok', { ns: 'common' }) }]
              );
            }
          }
        }
      ]
    );
  };

  // Handle item deletion with BAC recalculation
  const handleDeleteItem = (id, type) => {
    if (!session) return; // Guard clause per evitare operazioni su session null
    
    try {
    if (type === 'drink') {
      // Trova la bevanda da eliminare
        const drinkToDelete = session.drinks.find(drink => drink.id === id);
      
      if (drinkToDelete) {
          // Combiniamo tutte le operazioni di aggiornamento in una sola chiamata di setSession
          setSession(prevSession => {
            if (!prevSession) return null;
        
        // Calcola l'effetto stimato che questa bevanda aveva sul BAC e rimuovilo
        const alcoholEffect = drinkToDelete.alcoholGrams ? (drinkToDelete.alcoholGrams * 0.002) : 0.02;
            const newBAC = Math.max(prevSession.currentBAC - alcoholEffect, 0);
            
            // Determina il nuovo stato
            let newStatus = prevSession.status;
            if (newBAC < 0.03) {
              newStatus = 'safe';
            } else if (newBAC < 0.08) {
              newStatus = 'caution';
            } else {
              newStatus = 'danger';
            }
        
        // Aggiorna i punti del grafico
            const newTimePoints = [...prevSession.bacTimePoints.slice(1), newBAC];
            
            // Calcola il tempo per tornare sobri
            const hoursToSober = Math.ceil(newBAC / 0.015);
            const soberTime = `${hoursToSober}h ${Math.floor((hoursToSober % 1) * 60)}m`;
            
            // Aggiungi timeToSober in minuti per il componente BACDisplay
            const timeToSober = Math.ceil(hoursToSober * 60);
            
            // Ritorna l'oggetto session aggiornato con tutte le modifiche
            return {
              ...prevSession,
              drinks: prevSession.drinks.filter(drink => drink.id !== id),
              currentBAC: newBAC,
              status: newStatus,
              bacTimePoints: newTimePoints,
              soberTime: soberTime,
              timeToSober: timeToSober
            };
          });
        
        // Feedback all'utente
        Alert.alert(
          t('drinkRemoved', { ns: 'session' }),
            t('bacUpdated', { ns: 'session', bac: (session.currentBAC * 10).toFixed(2) })
        );
      }
    } else {
      // Trova il cibo da eliminare
        const foodToDelete = session.foods.find(food => food.id === id);
      
      if (foodToDelete) {
          // Combiniamo tutte le operazioni di aggiornamento in una sola chiamata di setSession
          setSession(prevSession => {
            if (!prevSession) return null;
        
            // Il cibo riduce il BAC, quindi eliminarlo dovrebbe aumentare il BAC
        // Effetto stimato che questo cibo aveva sul BAC
        const foodEffect = foodToDelete.absorptionFactor ? (foodToDelete.absorptionFactor * 0.01) : 0.01;
            const newBAC = Math.min(prevSession.currentBAC + foodEffect, 0.5); // Considera un limite massimo di 0.5%
            
            // Determina il nuovo stato
            let newStatus = prevSession.status;
            if (newBAC < 0.03) {
              newStatus = 'safe';
            } else if (newBAC < 0.08) {
              newStatus = 'caution';
            } else {
              newStatus = 'danger';
            }
        
        // Aggiorna i punti del grafico
            const newTimePoints = [...prevSession.bacTimePoints.slice(1), newBAC];
            
            // Calcola il tempo per tornare sobri
            const hoursToSober = Math.ceil(newBAC / 0.015);
            const soberTime = `${hoursToSober}h ${Math.floor((hoursToSober % 1) * 60)}m`;
            
            // Aggiungi timeToSober in minuti per il componente BACDisplay
            const timeToSober = Math.ceil(hoursToSober * 60);
            
            // Ritorna l'oggetto session aggiornato con tutte le modifiche
            return {
              ...prevSession,
              foods: prevSession.foods.filter(food => food.id !== id),
              currentBAC: newBAC,
              status: newStatus,
              bacTimePoints: newTimePoints,
              soberTime: soberTime,
              timeToSober: timeToSober
            };
          });
        
        // Feedback all'utente
        Alert.alert(
          t('foodRemoved', { ns: 'session' }),
            t('bacUpdated', { ns: 'session', bac: (session.currentBAC * 10).toFixed(2) })
          );
        }
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      Alert.alert(
        t('error', { ns: 'common' }),
        t('errorDeleting', { ns: 'session' }),
        [{ text: t('ok', { ns: 'common' }) }]
      );
    }
  };

  // Funzione modificata di renderConsumptionItems
  const renderConsumptionItems = () => {
  return (
      <View style={styles.consumptionContainer}>
        <Text style={[styles.sectionTitleText, { color: colors.text }]}>
          {t('consumption')}
          </Text>
          
        {session!.drinks.length === 0 && session!.foods.length === 0 ? (
          <View style={styles.consumptionEmpty}>
            <Ionicons name="beer-outline" size={30} color={colors.text} style={{opacity: 0.5}} />
            <Text style={styles.emptyText}>{t('noConsumptionYet')}</Text>
        </View>
        ) : (
      <ScrollView 
            style={styles.consumptionList}
        showsVerticalScrollIndicator={false}
      >
            {/* Drinks */}
            {session!.drinks.length > 0 && (
              <View style={styles.consumptionSection}>
                <Text style={[styles.consumptionSectionTitle, { color: colors.textSecondary }]}>
                  {t('drinks')}
          </Text>
                
                {session!.drinks.map((drink, index) => (
                  <Animated.View 
                    key={drink.id || index} 
                    style={[
                      styles.consumptionItem, 
                      { 
                        backgroundColor: 'rgba(30, 46, 69, 0.8)',
                        borderRadius: 15,
                        marginBottom: 12,
                        borderLeftWidth: 3,
                        borderLeftColor: colors.primary,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.1,
                        shadowRadius: 5,
                        elevation: 3
                      }
                    ]}
                  >
                    <View style={styles.consumptionItemInfo}>
                      <View style={{
                        backgroundColor: `${colors.primary}20`,
                        borderRadius: 10,
                        padding: 8,
                        marginRight: 12
                      }}>
                        <FontAwesome5 
                          name="glass-martini-alt" 
                          size={20} 
                          color={colors.primary}
                        />
          </View>
                      <View>
                        <Text style={[styles.consumptionItemName, { color: colors.text }]}>
                          {drink.name}
            </Text>
                        <Text style={[styles.consumptionItemDetails, { color: colors.textSecondary }]}>
                          {drink.volume} - {drink.alcoholGrams}g {t('alcohol')}
            </Text>
          </View>
          </View>
          
                    <View style={styles.consumptionItemActions}>
                      <Text style={[styles.consumptionItemTime, { color: colors.textSecondary }]}>
                        {drink.time}
            </Text>
                      <TouchableOpacity 
                        style={[
                          styles.deleteButton,
                          {
                            backgroundColor: `${colors.danger}20`,
                            borderRadius: 8,
                            padding: 8
                          }
                        ]}
                  onPress={() => handleDeleteItem(drink.id, 'drink')}
                >
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
                  </Animated.View>
                ))}
              </View>
            )}
          
            {/* Foods */}
            {session!.foods.length > 0 && (
          <View style={styles.consumptionSection}>
                <Text style={[styles.consumptionSectionTitle, { color: colors.textSecondary }]}>
                  {t('foods')}
            </Text>
            
                {session!.foods.map((food, index) => (
                  <Animated.View 
                    key={food.id || index} 
                    style={[
                      styles.consumptionItem, 
                      { 
                        backgroundColor: 'rgba(30, 46, 69, 0.8)',
                        borderRadius: 15,
                        marginBottom: 12,
                        borderLeftWidth: 3,
                  borderLeftColor: colors.secondary,
                        shadowColor: colors.secondary,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.1,
                        shadowRadius: 5,
                        elevation: 3
                      }
                    ]}
                  >
                    <View style={styles.consumptionItemInfo}>
                      <View style={{
                        backgroundColor: `${colors.secondary}20`,
                        borderRadius: 10,
                        padding: 8,
                        marginRight: 12
                      }}>
                        <Ionicons 
                          name="restaurant-outline" 
                          size={20} 
                          color={colors.secondary}
                        />
                      </View>
                      <View>
                        <Text style={[styles.consumptionItemName, { color: colors.text }]}>
                    {food.name}
                  </Text>
                        <Text style={[styles.consumptionItemDetails, { color: colors.textSecondary }]}>
                          {t('absorptionFactor')}: {food.absorptionFactor.toFixed(1)}
                  </Text>
                </View>
                    </View>
                    
                    <View style={styles.consumptionItemActions}>
                      <Text style={[styles.consumptionItemTime, { color: colors.textSecondary }]}>
                        {food.time}
                      </Text>
                <TouchableOpacity 
                        style={[
                          styles.deleteButton,
                          {
                            backgroundColor: `${colors.danger}20`,
                            borderRadius: 8,
                            padding: 8
                          }
                        ]}
                  onPress={() => handleDeleteItem(food.id, 'food')}
                >
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
                  </Animated.View>
                ))}
              </View>
            )}
      </ScrollView>
        )}
    </View>
  );
  };

  // Pulsanti di azione principali
  const renderActionButtons = () => {
    return (
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.success }
          ]}
          onPress={handleRefreshData}
        >
          <Ionicons name="refresh" size={24} color="white" />
          <Text style={styles.actionButtonText}>
            {t('refresh')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Definiamo uno StyleSheet completamente nuovo senza duplicazioni
const styles = StyleSheet.create({
  container: {
    flex: 1,
      backgroundColor: '#121212',
    },
    scrollContainer: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      fontWeight: '500',
    },
    header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
      paddingTop: Platform.OS === 'ios' ? 50 : 20,
      paddingBottom: 15,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
    },
    backButton: {
      padding: 8,
  },
  headerTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    settingsButton: {
      padding: 8,
    },
    mainContent: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    circleContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      marginTop: 5,
      marginBottom: 15,
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
    },
    chartContainer: {
      marginVertical: 8,
      paddingHorizontal: 0,
      position: 'relative'
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 20,
      marginBottom: 4
    },
    circleContent: {
      position: 'absolute',
    alignItems: 'center',
      justifyContent: 'center',
      width: CIRCLE_SIZE * 0.7,
      height: CIRCLE_SIZE * 0.7,
      padding: 10,
    },
    timeLabelText: {
      fontSize: 14,
      marginBottom: 5,
      textAlign: 'center',
    },
    timeValueText: {
      fontSize: 48,
    fontWeight: 'bold',
      lineHeight: 60,
      textAlign: 'center',
    },
    percentageText: {
      fontSize: 18,
      fontWeight: '500',
      marginBottom: 10,
      textAlign: 'center',
    },
    stateButton: {
      paddingHorizontal: 15,
      paddingVertical: 5,
      borderRadius: 15,
    marginBottom: 5,
  },
    stateButtonText: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    sessionTimeInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '80%',
      marginVertical: 20,
    },
    timeInfo: {
    alignItems: 'center',
  },
    timeInfoLabel: {
      fontSize: 14,
      color: '#CCCCCC',
      marginBottom: 5,
    },
    timeInfoValue: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    endSessionButton: {
      backgroundColor: '#FF4040',
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginVertical: 16,
      borderRadius: 30,
      alignSelf: 'center',
      ...Platform.select({
        ios: {
          shadowColor: 'rgba(255, 64, 64, 0.5)',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    endSessionButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    actionButtonsContainer: {
    flexDirection: 'row',
      justifyContent: 'space-evenly',
      marginVertical: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
      paddingHorizontal: 20,
    paddingVertical: 12,
      borderRadius: 25,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '500',
    color: '#FFFFFF',
      marginLeft: 8,
  },
  consumptionSection: {
      padding: 16,
      marginVertical: 5,
  },
    sectionTitleText: {
      fontSize: 18,
    fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: 10,
    },
    consumptionItems: {
      marginTop: 10,
  },
  consumptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
      padding: 12,
      backgroundColor: 'rgba(40, 40, 50, 0.7)',
      borderRadius: 10,
      marginBottom: 8,
  },
    consumptionItemIcon: {
      marginRight: 10,
    },
    consumptionItemDetails: {
    flex: 1,
  },
  consumptionItemName: {
      fontSize: 16,
      fontWeight: '500',
      color: '#FFFFFF',
    },
    consumptionItemVolume: {
      fontSize: 14,
      color: '#CCCCCC',
    },
    consumptionItemEffect: {
      fontSize: 14,
      color: '#CCCCCC',
    },
    consumptionItemTime: {
      fontSize: 14,
      color: '#CCCCCC',
      marginHorizontal: 5,
    },
    removeButton: {
      padding: 5,
    },
    emptyListText: {
      fontSize: 16,
      color: '#999999',
      textAlign: 'center',
      marginTop: 10,
    },
    consumptionContainer: {
      padding: 30,
      alignItems: 'center',
    justifyContent: 'center',
      backgroundColor: 'rgba(40, 40, 50, 0.3)',
      borderRadius: 15,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
      marginHorizontal: 5,
    },
    consumptionEmpty: {
      padding: 30,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(40, 40, 50, 0.3)',
      borderRadius: 15,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
      marginHorizontal: 5,
  },
  emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 10,
    textAlign: 'center',
    },
    consumptionList: {
      flex: 1,
    },
    consumptionSectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginVertical: 10,
      marginLeft: 10,
      color: colors.text,
    },
    consumptionItemInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    consumptionItemActions: {
      alignItems: 'flex-end',
    },
    deleteButton: {
      padding: 5,
    },
    legalInfoText: {
      fontSize: 12,
      textAlign: 'center',
      paddingHorizontal: 10,
    },
    toggleChartButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      marginTop: 8,
      marginBottom: 4,
      alignSelf: 'center',
    },
    toggleChartText: {
      fontSize: 14,
      fontWeight: '500',
      marginRight: 4
    },
    refreshButton: {
      padding: 8,
      borderRadius: 20,
    },
    noDataCard: {
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 16,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 2
    },
    noDataContent: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center'
    },
    noDataText: {
      fontSize: 15,
      fontWeight: 'bold',
      marginBottom: 4,
      textAlign: 'center'
    },
    noDataSubtext: {
      fontSize: 13,
      textAlign: 'center',
      paddingHorizontal: 20
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <AppHeader 
        title={t('activeSession')}
        isMainScreen={true}
        rightComponent={
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefreshData}
          >
            <Ionicons name="refresh" size={24} color={colors.text} />
          </TouchableOpacity>
        }
      />
      
      {/* Offline Indicator */}
      <OfflineIndicator />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t('loading')}
          </Text>
        </View>
      ) : !session ? (
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="glass-cheers" size={60} color={colors.textSecondary} style={{ opacity: 0.5 }} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t('noActiveSession')}
          </Text>
          <TouchableOpacity 
            style={[styles.endSessionButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/session/new')}
          >
            <Text style={styles.endSessionButtonText}>
              {t('startNewSession')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Contenuto principale */}
          <View style={styles.mainContent}>
            {/* Indicatore circolare del progresso */}
            <View style={styles.circleContainer}>
              <BACDisplay 
                bac={session?.currentBAC !== undefined ? session.currentBAC : 0}
                timeToZero={session?.timeToSober && typeof session.timeToSober === 'number' && session.timeToSober > 0
                  ? new Date(Date.now() + (session.timeToSober * 60 * 1000)) 
                  : null}
                timeToLegal={session?.timeToLegal && typeof session.timeToLegal === 'number' && session.timeToLegal > 0
                  ? new Date(Date.now() + (session.timeToLegal * 60 * 1000)) 
                  : null}
                showTimeToSober={true}
              />
            </View>
            
            {/* Informazioni su inizio e fine sessione */}
            <View style={styles.sessionTimeInfo}>
              <View style={styles.timeInfo}>
                <Text style={styles.timeInfoLabel}>{t('start')}</Text>
                <Text style={styles.timeInfoValue}>
                  {new Date(session?.startTime || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          </View>

          {/* Pulsanti per aggiungere bevande e cibo */}
          <Animated.View style={[styles.actionButtonsContainer, buttonsAnimatedStyle]}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/session/add-drink')}
            >
              <MaterialCommunityIcons name="glass-cocktail" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>{t('addDrink')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.tertiary }]}
              onPress={() => router.push('/session/add-food')}
            >
              <FontAwesome5 name="utensils" size={22} color="#fff" />
              <Text style={styles.actionButtonText}>{t('addFood')}</Text>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Pulsante per terminare la sessione spostato qui sotto */}
          <TouchableOpacity
            style={[styles.endSessionButton, { backgroundColor: colors.danger }]}
            onPress={handleEndSession}
          >
            <Text style={styles.endSessionButtonText}>{t('endSession')}</Text>
          </TouchableOpacity>
          
          {/* Pulsante per mostrare il grafico quando è nascosto */}
          {!showChart && (
            <TouchableOpacity 
              style={[
                styles.toggleChartButton, 
                { backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.8)' }
              ]} 
              onPress={handleToggleChart}
            >
              <Text style={[styles.toggleChartText, { color: isDarkMode ? '#CBD5E1' : '#475569' }]}>
                Mostra grafico
              </Text>
              <Feather name="chevron-down" size={16} color={isDarkMode ? '#CBD5E1' : '#475569'} />
            </TouchableOpacity>
          )}
          
          {/* Chart section */}
          {showChart && (
            <View style={styles.chartContainer}>
              {/* Titolo del grafico */}
              <Text style={[styles.chartTitle, { 
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: 18,
                textShadowColor: 'rgba(0, 0, 0, 0.5)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
                marginBottom: 12
              }]}>
                Andamento tasso alcolemico
              </Text>
              
              {session?.bacSeries && session.bacSeries.length >= 2 ? (
                <BACGraph
                  bacSeries={session.bacSeries.map(point => ({
                    time: typeof point.time === 'string' ? point.time : point.time.toISOString(),
                    bac: point.bac
                  }))}
                  isDarkTheme={isDarkMode}
                />
              ) : (
                <PaperCard style={[styles.noDataCard, { backgroundColor: '#14233B' }]}>
                  <View style={styles.noDataContent}>
                    <Text style={[styles.noDataText, { color: '#FFFFFF', fontWeight: '600' }]}>
                      Dati insufficienti
                    </Text>
                    <Text style={[styles.noDataSubtext, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                      Aggiungi bevande per visualizzare il grafico
                    </Text>
                  </View>
                </PaperCard>
              )}
              
              {/* Toggle button per nascondere il grafico - stile più integrato */}
              <TouchableOpacity 
                style={[
                  styles.toggleChartButton, 
                  { backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.8)' }
                ]} 
                onPress={handleToggleChart}
              >
                <Text style={[styles.toggleChartText, { color: isDarkMode ? '#CBD5E1' : '#475569' }]}>
                  Nascondi grafico
                </Text>
                <Feather name="chevron-up" size={16} color={isDarkMode ? '#CBD5E1' : '#475569'} />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Sezioni per bevande e cibo consumati */}
          <View style={styles.consumptionSection}>
            <Text style={styles.sectionTitleText}>{t('consumedDrinks')}</Text>
            
            {session?.drinks && session.drinks.length > 0 ? (
              <View style={styles.consumptionItems}>
                {session.drinks.map((drink, index) => (
                  <View key={drink.id} style={styles.consumptionItem}>
                    <MaterialCommunityIcons 
                      name="glass-cocktail" 
                      size={22} 
                      color={colors.primary} 
                      style={styles.consumptionItemIcon}
                    />
                    
                    <View style={styles.consumptionItemDetails}>
                      <Text style={styles.consumptionItemName}>{t(drink.name)}</Text>
                      <Text style={styles.consumptionItemVolume}>{drink.volume}</Text>
                    </View>
                    
                    <Text style={styles.consumptionItemTime}>
                      {new Date(drink.timeConsumed || drink.time).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                    
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleDeleteItem(drink.id, 'drink')}
                    >
                      <Feather name="x" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyListText}>{t('noDrinks')}</Text>
            )}
          </View>
          
          <View style={styles.consumptionSection}>
            <Text style={styles.sectionTitleText}>{t('consumedFood')}</Text>
            
            {session?.foods && session.foods.length > 0 ? (
              <View style={styles.consumptionItems}>
                {session.foods.map((food, index) => (
                  <View key={food.id} style={styles.consumptionItem}>
                    <FontAwesome5 
                      name="utensils" 
                      size={20} 
                      color={colors.secondary} 
                      style={styles.consumptionItemIcon}
                    />
                    
                    <View style={styles.consumptionItemDetails}>
                      <Text style={styles.consumptionItemName}>{t(food.name)}</Text>
                      <Text style={styles.consumptionItemEffect}>
                        {t('reductionEffect')}: {Math.round((1 - food.absorptionFactor) * 100)}%
                      </Text>
                    </View>
                    
                    <Text style={styles.consumptionItemTime}>
                      {new Date(food.timeConsumed || food.time).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                    
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleDeleteItem(food.id, 'food')}
                    >
                      <Feather name="x" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyListText}>{t('noFood')}</Text>
            )}
          </View>
        </ScrollView>
      )}
      
      <CustomTabBar />
    </View>
  );
}

// Esporta il componente come default (richiesto da Expo Router)
export default SessionScreen; 