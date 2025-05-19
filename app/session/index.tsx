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
import * as sessionService from '../lib/services/session.service';
import { DrinkRecord, FoodRecord } from '../lib/bac/visualization';
import { Session } from '../types/session';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BACChartSimple from '../components/BACChartSimple';
import CustomTabBar from '../components/CustomTabBar';
import { Svg, Circle, Path, Defs, LinearGradient, Stop, Line, Text as SvgText, G, Filter } from 'react-native-svg';
import { formatTimeFromMinutes, formatElapsedTime } from '../utils/timeUtils';
import { calculateBAC, calculateTimeToSober } from '../utils/bacCalculator';
import { useToast } from '../components/Toast';
import { Link } from 'expo-router';
import Toast from '../components/Toast';
import AppHeader from '../components/AppHeader';
import { Card as PaperCard } from 'react-native-paper';
import { usePurchase } from '../contexts/PurchaseContext';
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

/**
 * Funzione per navigare alla sessione attiva
 * Questa funzione è usata da più parti dell'app per assicurare una navigazione coerente
 */
export const navigateToSession = async () => {
  try {
    console.log('navigateToSession: verificando sessione attiva');
    
    // Aggiorna il BAC della sessione corrente prima della navigazione
    await sessionService.updateSessionBAC();
    
    // Verifica se c'è una sessione attiva
    const activeSession = sessionService.getActiveSession();
    
    if (activeSession) {
      console.log('navigateToSession: sessione attiva trovata, navigando alla schermata sessione');
      
      // Usa un piccolo delay per permettere alla UI di aggiornarsi
      setTimeout(() => {
        try {
          // Usa navigate per evitare sostituzioni nel navigation stack
          router.navigate('/session');
        } catch (navError) {
          console.error('Errore durante la navigazione alla sessione:', navError);
          // Fallback alla dashboard in caso di errore
          router.navigate('/dashboard');
        }
      }, 100);
      
      return true;
    } else {
      console.log('navigateToSession: nessuna sessione attiva, navigando alla dashboard');
      
      // Ritorna alla dashboard se non c'è una sessione attiva
      setTimeout(() => {
        try {
          router.replace('/dashboard');
        } catch (navError) {
          console.error('Errore durante la navigazione alla dashboard:', navError);
          // Tenta un approccio alternativo in caso di errore
          router.navigate('/');
        }
      }, 100);
      
      return false;
    }
  } catch (error) {
    console.error('Error in navigateToSession:', error);
    
    // In caso di errore, torna alla dashboard
    setTimeout(() => {
      try {
        router.replace('/dashboard');
      } catch (navError) {
        console.error('Errore durante il fallback alla dashboard:', navError);
        // Ultima spiaggia
        router.navigate('/');
      }
    }, 100);
    
    return false;
  }
};

/**
 * Funzione per navigare alla dashboard.
 * Usa questa quando termina una sessione o non ci sono sessioni attive.
 */
export function navigateToDashboard() {
  router.replace('/dashboard');
}

export function goToActiveSession() {
  // Questa funzione può essere rimossa, ora usiamo navigateToSession
  navigateToSession();
  return true;
}

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
  const { incrementSessionCounter } = usePurchase();

  // Base session state
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [soberPercentage, setSoberPercentage] = useState(0);
  const [updateTimer, setUpdateTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Stato che tiene traccia se l'app è in focus
  const [isFocused, setIsFocused] = useState(true);

  // Animated values
  const buttonsOpacity = useSharedValue(1);
  const bacCircleScale = useSharedValue(1);
  
  // Set per tracciare i parametri elaborati
  const processedParamsRef = useRef<Set<string>>(new Set());
  
  // Stato per il toggle del grafico
  const [showChart, setShowChart] = useState(false);
  
  const scrollViewRef = React.useRef(null);
  
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
      
      // Avvia le animazioni
      startLoadingAnimations();
      
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
      setLoading(true);
      
      // Verifica che il servizio delle sessioni sia inizializzato
      await sessionService.initSessionService();
      
      // Ottieni la sessione attiva
      const activeSession = await sessionService.updateSessionBAC();
      
      if (activeSession) {
        // Validazione critica: verifica che i dati essenziali siano presenti
        if (!activeSession.profile || !activeSession.profile.weightKg) {
          console.error('Errore: Sessione invalida - dati profilo mancanti');
          
          // Mostra un errore adeguato
          showToast({
            type: 'error',
            message: t('errorLoadingSession', { 
              ns: 'session',
              defaultValue: 'Errore nel caricamento della sessione'
            }),
          });
          
          // Prova a correggere la sessione prima di arrenderti
          const fixedSession = await sessionService.ensureSessionIntegrity();
          if (fixedSession) {
            console.log('Sessione riparata, riprovo');
            setTimeout(() => handleRefreshData(), 500);
            return;
          }
          
          // Se la riparazione fallisce, vai alla dashboard
          setSession(null);
          router.replace('/dashboard');
          return;
        }
        
        // Struttura difensiva: assicura che tutti i campi cruciali esistano
        const safeSession = {
          ...activeSession,
          drinks: Array.isArray(activeSession.drinks) ? activeSession.drinks : [],
          foods: Array.isArray(activeSession.foods) ? activeSession.foods : [],
          currentBAC: typeof activeSession.currentBAC === 'number' ? activeSession.currentBAC : 0,
          status: activeSession.status || 'safe',
          soberTime: activeSession.soberTime || '0h 0m',
          timeToSober: activeSession.timeToSober || 0
        };
        
        // Aggiorna lo stato con la sessione attiva validata
        setSession(safeSession);
      } else {
        // Invece di reindirizzare alla dashboard, imposta session a null
        setSession(null);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      
      // Mostra un errore adeguato
      showToast({
        type: 'error',
        message: t('errorLoadingSession', { 
          ns: 'session',
          defaultValue: 'Errore nel caricamento della sessione'
        }),
      });
      
      // Imposta session a null per mostrare il NoActiveSessionView
      setSession(null);
    } finally {
      // Imposta loading a false in ogni caso
      setLoading(false);
    }
  };

  // Funzione per avviare le animazioni
  const startLoadingAnimations = () => {
    // Sequenza di animazioni dall'alto verso il basso
    buttonsOpacity.value = withTiming(1, { duration: 500 });
    
    bacCircleScale.value = withSequence(
      withDelay(200, withTiming(1.05, { duration: 500, easing: Easing.out(Easing.back()) })),
      withTiming(1, { duration: 300 })
    );
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
      // Prima mostriamo il grafico - nessuna generazione di dati di esempio qui
      // poiché la vera generazione avverrà in renderBACChart
      setShowChart(true);
      
      // Poi scorriamo automaticamente alla posizione del grafico dopo che è stato renderizzato
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 350, animated: true });
        }
      }, 100);
    } else {
      // Quando nascondiamo il grafico, prima scorriamo verso l'alto
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
      
      // Dopo l'animazione, nascondiamo il grafico
      setTimeout(() => {
        setShowChart(false);
      }, 300);
    }
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
  const handleEndSession = async () => {
    Alert.alert(
      t('endSessionTitle', { ns: 'session', defaultValue: 'Termina sessione' }),
      t('endSessionConfirmation', { ns: 'session', defaultValue: 'Sei sicuro di voler terminare questa sessione?' }),
      [
        {
          text: t('cancel', { ns: 'common', defaultValue: 'Annulla' }),
          style: 'cancel',
        },
        {
          text: t('endSession', { ns: 'session', defaultValue: 'Termina' }),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const success = await sessionService.endSession();
              
              if (success) {
                console.log('Sessione terminata e salvata nella cronologia: success');
                
                // Mostra toast di conferma
                showToast({
                  type: 'success',
                  message: t('sessionSaved', { ns: 'session', defaultValue: 'Sessione salvata' }),
                });
                
                // Incrementa il contatore delle sessioni settimanali
                await incrementSessionCounter();
                
                // Torna alla dashboard
                router.push('/dashboard');
              } else {
                // Mostra toast di errore
                showToast({
                  type: 'error',
                  message: t('errorSavingSession', { ns: 'session', defaultValue: 'Errore durante il salvataggio della sessione' }),
                });
              }
            } catch (error) {
              console.error('Errore durante la terminazione della sessione:', error);
              
              showToast({
                type: 'error',
                message: t('errorSavingSession', { ns: 'session', defaultValue: 'Errore durante il salvataggio della sessione' }),
              });
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Handle item deletion with BAC recalculation
  const handleDeleteItem = async (id: string, type: 'drink' | 'food') => {
    try {
      if (type === 'drink') {
        // Elimina una bevanda, ma non c'è una funzione removeDrink
        // Implemento manualmente la rimozione come modifica dello stato
        if (session) {
          // Aggiorna lo stato locale per riflettere la rimozione immediata
          setSession(prevSession => {
            if (!prevSession) return null;
            
            // Trova l'indice della bevanda da eliminare
            const drinkIndex = prevSession.drinks.findIndex(drink => drink.id === id);
            if (drinkIndex === -1) return prevSession;
            
            // Crea una copia delle bevande e rimuovi quella selezionata
            const updatedDrinks = [...prevSession.drinks];
            const drinkToDelete = updatedDrinks[drinkIndex];
            updatedDrinks.splice(drinkIndex, 1);
            
            // Calcola l'effetto stimato che questa bevanda aveva sul BAC e rimuovilo
            const alcoholGrams = typeof drinkToDelete.alcoholGrams === 'string' ? 
              parseFloat(drinkToDelete.alcoholGrams) : 
              (drinkToDelete.alcoholGrams || 0);
            
            const alcoholEffect = alcoholGrams * 0.002;
            const newBAC = Math.max(prevSession.currentBAC - alcoholEffect, 0);
            
            // Determina il nuovo stato
            const newStatus = 
              newBAC < 0.03 
                ? 'safe' as 'safe'
                : newBAC < 0.08 
                  ? 'caution' as 'caution'
                  : 'danger' as 'danger';
            
            // Crea una sessione aggiornata
            const updatedSession = {
              ...prevSession,
              drinks: updatedDrinks,
              currentBAC: newBAC,
              status: newStatus
            };
            
            // Aggiorna la sessione con sessionService manualmente
            sessionService.updateSessionBAC();
            sessionService.saveSessionLocally(updatedSession);
            
            return updatedSession;
          });
          
          return true;
        }
      } else if (type === 'food') {
        // Elimina un cibo
        const success = await sessionService.removeFood(id);
        
        if (success && session) {
          // Aggiorna lo stato locale per riflettere la rimozione immediata
          setSession(prevSession => {
            if (!prevSession) return null;
            
            // Trova l'indice del cibo da eliminare
            const foodIndex = prevSession.foods.findIndex(food => food.id === id);
            if (foodIndex === -1) return prevSession;
            
            // Crea una copia dei cibi e rimuovi quello selezionato
            const updatedFoods = [...prevSession.foods];
            updatedFoods.splice(foodIndex, 1);
            
            return {
              ...prevSession,
              foods: updatedFoods
            };
          });
        }
      }
    } catch (error) {
      console.error(`Errore durante l'eliminazione di ${type}:`, error);
      
      showToast({
        type: 'error',
        message: t('errorRemovingItem', { ns: 'session', defaultValue: 'Errore durante la rimozione dell\'elemento' }),
      });
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
                          {drink.volume} ml - {drink.alcoholGrams}g {t('alcohol')}
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

  // Aggiungiamo un componente per mostrare quando non c'è una sessione attiva
  const NoActiveSessionView = () => (
    <View style={styles.noSessionContainer}>
      <View style={styles.noSessionContent}>
        <Ionicons 
          name="beer-outline" 
          size={80} 
          color={colors.textSecondary} 
        />
        <Text style={[styles.noSessionTitle, { color: colors.text }]}>
          {t('noActiveSession', { ns: 'session', defaultValue: 'Nessuna Sessione Attiva' })}
        </Text>
        <Text style={[styles.noSessionDescription, { color: colors.textSecondary }]}>
          {t('startSessionDescription', { ns: 'session', defaultValue: 'Inizia una nuova sessione dalla dashboard per monitorare il tuo tasso alcolemico.' })}
        </Text>
        
        <TouchableOpacity 
          style={[styles.dashboardButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            try {
              // Usa replace invece di navigate per evitare di aggiungere la schermata allo stack
              router.replace('/dashboard');
            } catch (error) {
              console.error('Errore nel navigare alla dashboard:', error);
              // Fallback in caso di errore di navigazione
              setTimeout(() => {
                router.navigate('/');
              }, 100);
            }
          }}
        >
          <Text style={styles.dashboardButtonText}>
            {t('goToDashboard', { ns: 'session', defaultValue: 'Vai alla Dashboard' })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Nel componente SessionScreen, aggiungiamo la visualizzazione del cibo nel grafico
  const renderBACChart = () => {
    if (!session) return null;
    
    // Calcola il limite legale in base al paese
    const legalLimit = 0.5; // g/L (valore default per l'Italia)
    
    // Prepariamo i dati per il grafico
    const bacSeries = [];
    
    // Otteniamo tutti gli eventi di consumo (bevande e cibi) e li ordiniamo per tempo
    const consumptionEvents = [];
    
    // Aggiungi tutti i drink come eventi
    session.drinks.forEach(drink => {
      // Assicurati che il formato della data sia corretto
      let eventTime;
      try {
        eventTime = new Date(drink.timeConsumed || drink.time);
        // Verifica se la data è valida
        if (isNaN(eventTime.getTime())) {
          eventTime = new Date(); // usa la data corrente come fallback
        }
      } catch (e) {
        console.error('Errore nel parsing della data del drink:', e);
        eventTime = new Date();
      }
      
      // Calcola i grammi di alcol
      let alcoholGrams = 0;
      if (drink.alcoholGrams) {
        alcoholGrams = typeof drink.alcoholGrams === 'string' 
          ? parseFloat(drink.alcoholGrams) 
          : (drink.alcoholGrams as number);
      } else if (drink.volume && drink.alcoholPercentage) {
        const volume = typeof drink.volume === 'string' ? parseFloat(drink.volume) : (drink.volume as number);
        const alcoholPercentage = typeof drink.alcoholPercentage === 'string' 
          ? parseFloat(drink.alcoholPercentage) 
          : (drink.alcoholPercentage as number);
        
        alcoholGrams = (volume * alcoholPercentage * 0.789) / 100;
      } else {
        alcoholGrams = 10; // Default fallback
      }
      
      consumptionEvents.push({
        type: 'drink',
        time: eventTime,
        item: drink,
        alcoholGrams: alcoholGrams
      });
    });
    
    // Aggiungi i cibi come eventi
    session.foods.forEach(food => {
      // Assicurati che il formato della data sia corretto
      let eventTime;
      try {
        eventTime = new Date(food.timeConsumed || food.time);
        // Verifica se la data è valida
        if (isNaN(eventTime.getTime())) {
          eventTime = new Date(); // usa la data corrente come fallback
        }
      } catch (e) {
        console.error('Errore nel parsing della data del cibo:', e);
        eventTime = new Date();
      }
      
      consumptionEvents.push({
        type: 'food',
        time: eventTime,
        item: food,
        absorptionFactor: typeof food.absorptionFactor === 'string' 
          ? parseFloat(food.absorptionFactor) 
          : food.absorptionFactor
      });
    });
    
    // Ordina gli eventi per tempo
    consumptionEvents.sort((a, b) => a.time.getTime() - b.time.getTime());
    
    // Se non ci sono eventi, mostra un grafico piatto
    if (consumptionEvents.length === 0) {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      return (
        <BACChartSimple 
          bacSeries={[
            { time: oneHourAgo.toISOString(), bac: 0 },
            { time: now.toISOString(), bac: 0 }
          ]}
          drinks={[]}
          foods={[]}
          legalLimit={legalLimit}
        />
      );
    }
    
    // Configurazione per calcoli BAC
    const profile = session.profile;
    const r = profile.gender === 'male' ? 0.68 : 0.55; // Fattore di distribuzione basato sul genere
    const weight = profile.weightKg || 70; // Peso in kg, default 70 se mancante
    const metabolismRate = 0.015; // Tasso di metabolismo in g/L per ora (valore medio standard)
    
    // Punto di partenza: 15 minuti prima del primo evento, con BAC = 0
    const firstEventTime = consumptionEvents[0].time;
    const startTime = new Date(firstEventTime.getTime() - 15 * 60 * 1000);
    
    // Aggiungi il primo punto con BAC = 0
    bacSeries.push({
      time: startTime.toISOString(),
      bac: 0
    });
    
    // Calcola il BAC per ogni evento e crea i punti del grafico
    let currentBac = 0;
    let previousEventTime = startTime;
    
    consumptionEvents.forEach(event => {
      // Calcola il metabolismo dall'evento precedente
      const hoursSincePrevEvent = (event.time.getTime() - previousEventTime.getTime()) / (1000 * 60 * 60);
      const metabolizedAmount = metabolismRate * hoursSincePrevEvent;
      
      // Aggiorna il BAC considerando il metabolismo
      currentBac = Math.max(0, currentBac - metabolizedAmount);
      
      // Applica l'effetto dell'evento attuale
      if (event.type === 'drink') {
        // L'alcol aumenta il BAC usando la formula di Widmark
        const bacIncrease = event.alcoholGrams / (r * weight);
        currentBac += bacIncrease;
      } else if (event.type === 'food') {
        // Il cibo riduce l'assorbimento/effetto dell'alcol
        const absorptionFactor = event.absorptionFactor || 0.95; // default 5% di riduzione
        // Riduciamo il BAC di una piccola percentuale - modello più conservativo
        const reductionFactor = (1 - ((1 - absorptionFactor) * 0.2)); 
        currentBac = currentBac * reductionFactor;
      }
      
      // Aggiungi punto al grafico
      bacSeries.push({
        time: event.time.toISOString(),
        bac: parseFloat(currentBac.toFixed(3)), // Limita a 3 decimali per maggiore precisione
        isEvent: true,
        eventType: event.type
      });
      
      // Aggiorna l'orario dell'evento precedente
      previousEventTime = event.time;
    });
    
    // Aggiungi un punto per il momento attuale
    const now = new Date();
    
    // Se c'è almeno un evento passato
    if (consumptionEvents.length > 0) {
      // Calcola il metabolismo dal momento dell'ultimo evento ad ora
      const hoursSinceLastEvent = Math.max(0, (now.getTime() - previousEventTime.getTime()) / (1000 * 60 * 60));
      const metabolizedAmount = metabolismRate * hoursSinceLastEvent;
      
      // Aggiorna il BAC con il metabolismo
      const calculatedBac = Math.max(0, currentBac - metabolizedAmount);
      
      // Se il valore della sessione è disponibile e recente, usalo per maggiore precisione
      if (session.currentBAC !== undefined) {
        currentBac = session.currentBAC;
      } else {
        currentBac = parseFloat(calculatedBac.toFixed(3));
      }
      
      // Aggiungi il punto per il momento attuale
      bacSeries.push({
        time: now.toISOString(),
        bac: currentBac
      });
    }
    
    // Se il BAC attuale è > 0, aggiungi un punto di sobrietà futuro
    if (currentBac > 0) {
      const hoursToZero = currentBac / metabolismRate;
      const soberTime = new Date(now.getTime() + (hoursToZero * 60 * 60 * 1000));
      
      bacSeries.push({
        time: soberTime.toISOString(),
        bac: 0
      });
    }
    
    // Prepara i dati delle bevande nel formato richiesto
    const drinkData = session.drinks.map(drink => {
      try {
        return {
          time: typeof drink.timeConsumed === 'string' ? drink.timeConsumed : 
                typeof drink.time === 'string' ? drink.time : 
                new Date(drink.timeConsumed || drink.time).toISOString(),
          alcoholGrams: typeof drink.alcoholGrams === 'string' ? 
                        parseFloat(drink.alcoholGrams) : 
                        (drink.alcoholGrams as number)
        };
      } catch (e) {
        console.error('Errore nella formattazione dei dati delle bevande:', e);
        return {
          time: new Date().toISOString(),
          alcoholGrams: 0
        };
      }
    });
    
    // Prepara i dati del cibo nel formato richiesto
    const foodData = session.foods.map(food => {
      try {
        return {
          time: typeof food.timeConsumed === 'string' ? food.timeConsumed : 
                typeof food.time === 'string' ? food.time : 
                new Date(food.timeConsumed || food.time).toISOString(),
          absorptionFactor: typeof food.absorptionFactor === 'string' ? 
                           parseFloat(food.absorptionFactor) : 
                           food.absorptionFactor
        };
      } catch (e) {
        console.error('Errore nella formattazione dei dati del cibo:', e);
        return {
          time: new Date().toISOString(),
          absorptionFactor: 0.95
        };
      }
    });
    
    // Usa il componente BACChartSimple con i dati calcolati
    return (
      <BACChartSimple 
        bacSeries={bacSeries}
        drinks={drinkData}
        foods={foodData}
        legalLimit={legalLimit}
      />
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
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
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
      paddingVertical: 10,
      paddingHorizontal: 20,
      marginVertical: 12,
      borderRadius: 25,
      alignSelf: 'center',
      ...Platform.select({
        ios: {
          shadowColor: 'rgba(255, 64, 64, 0.5)',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 5,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    endSessionButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    actionButtonsContainer: {
    flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 20,
      width: '100%',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center', 
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 25,
      width: 175,
      height: 52,
      marginHorizontal: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
      marginLeft: 8,
      textAlign: 'center',
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
    noSessionContainer: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 50,
    },
    noSessionContent: {
      alignItems: 'center',
      marginTop: 50,
    },
    noSessionTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      marginTop: 20,
      marginBottom: 10,
      textAlign: 'center',
    },
    noSessionDescription: {
      fontSize: 16,
      textAlign: 'center',
      marginHorizontal: 20,
    },
    startSessionButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    startSessionButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    dashboardButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    dashboardButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  // Renderizza lo stato di caricamento
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader title={t('sessionTitle', { ns: 'session' })} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // Se non c'è una sessione attiva, mostriamo il componente NoActiveSessionView
  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        
        <AppHeader 
          title={t('sessionTitle', { ns: 'session', defaultValue: 'Sessione' })} 
          onBackPress={() => {
            try {
              router.replace('/dashboard');
            } catch (error) {
              console.error('Errore durante la navigazione alla dashboard:', error);
              router.navigate('/');
            }
          }}
        />
        
        <View style={styles.mainContent}>
          <NoActiveSessionView />
        </View>
        
        <CustomTabBar />
      </View>
    );
  }

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

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ref={scrollViewRef}
      >
        {/* Contenuto principale */}
        <View style={styles.mainContent}>
          {/* Indicatore circolare del progresso */}
          <View style={styles.circleContainer}>
            <BACDisplay 
              bac={session?.currentBAC !== undefined ? session.currentBAC : 0}
              timeToZero={session?.soberTime || null}
              timeToLegal={session?.legalTime || null}
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
        <View style={[styles.actionButtonsContainer]}>
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
        </View>
        
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
            <Text style={[styles.chartTitle, { color: isDarkMode ? '#E2E8F0' : '#334155' }]}>
              {t('Andamento tasso alcolico')}
            </Text>
            
            {((session?.bacSeries && session.bacSeries.length >= 2) || (session?.drinks && session.drinks.length > 0)) ? (
              renderBACChart()
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
                    <Text style={styles.consumptionItemVolume}>{drink.volume} ml</Text>
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
      
      <CustomTabBar />
    </View>
  );
}

// Esporta il componente come default (richiesto da Expo Router)
export default SessionScreen; 