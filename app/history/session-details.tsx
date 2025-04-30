import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StatusBar
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import sessionService from '../lib/services/session.service';
import { Session, Drink, FoodRecord } from '../types/session';
import AppHeader from '../components/AppHeader';
import BACChartSimple from '../components/BACChartSimple';
import { SIZES } from '../constants/theme';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

// Funzioni di formattazione delle date
const formatSessionDate = (dateValue: Date | string): string => {
  try {
    // Se il valore è nullo o indefinito, ritorna un valore di default
    if (!dateValue) return 'Data non disponibile';
    
    // Converti in data se è una stringa
    let date: Date;
    if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      return 'Formato data non valido';
    }
    
    // Verifica che la data sia valida
    if (isNaN(date.getTime())) {
      return 'Data non valida';
    }
    
    // Formattazione semplice e affidabile
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleDateString(undefined, options);
  } catch (error) {
    return 'Errore data';
  }
};

const formatTime = (dateValue: Date | string): string => {
  try {
    if (!dateValue) return '--:--';
    
    let date: Date;
    if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else {
      date = dateValue;
    }
    
    if (isNaN(date.getTime())) {
      return '--:--';
    }
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return '--:--';
  }
};

const formatDuration = (startDate: Date | string, endDate?: Date | string): string => {
  try {
    if (!startDate) return '0h 00m';
    
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = endDate 
      ? (typeof endDate === 'string' ? new Date(endDate) : endDate)
      : new Date();
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return '0h 00m';
    }
    
    const durationMs = end.getTime() - start.getTime();
    if (durationMs <= 0) return '0h 00m';
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  } catch (error) {
    return '0h 00m';
  }
};

// Definizione delle tipologie per il grafico
type BacDataPoint = {
  time: string;
  bac: number;
  isEvent?: boolean;
  eventType?: 'drink' | 'food';
};

type DrinkDataPoint = {
  time: string;
  alcoholGrams: number;
};

type FoodDataPoint = {
  time: string;
  absorptionFactor: number;
};

export default function SessionDetailsScreen() {
  const { t } = useTranslation(['session', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const params = useLocalSearchParams();
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const swipeableRef = React.useRef<Swipeable>(null);

  // Carica la sessione storica in base all'ID
  useEffect(() => {
    const loadSession = async () => {
      setLoading(true);
      try {
        // Ottieni l'ID della sessione dai parametri
        const sessionId = params.id as string;
        if (!sessionId) {
          console.error('Nessun ID sessione fornito');
          router.back();
          return;
        }

        // Carica la sessione dalla cronologia
        const sessionHistory = sessionService.getSessionHistory();
        const historicSession = sessionHistory.find(s => s.id === sessionId);
        
        if (!historicSession) {
          console.error('Sessione non trovata nella cronologia:', sessionId);
          router.back();
          return;
        }

        console.log('Sessione storica caricata:', historicSession.id);
        
        // Se la sessione non ha bacSeries, genera punti simulati
        if (!historicSession.bacSeries || historicSession.bacSeries.length === 0) {
          // Genera punti per la serie BAC
          historicSession.bacSeries = generateBacSeries(historicSession);
        }
        
        setSession(historicSession);
      } catch (error) {
        console.error('Errore nel caricamento della sessione storica:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [params.id]);

  // Genera una serie BAC simulata basata sui drink della sessione
  const generateBacSeries = (session: Session): { time: string; bac: number; isDrinkPoint?: boolean }[] => {
    if (!session || !session.drinks || session.drinks.length === 0) {
      return [];
    }
    
    const series = [];
    const startTime = new Date(session.startTime);
    let maxBac = session.maxBac || session.currentBAC || 0;
    
    // Punto iniziale (BAC 0 all'inizio della sessione)
    series.push({
      time: startTime.toISOString(),
      bac: 0
    });
    
    // Ordina i drink per tempo
    const sortedDrinks = [...session.drinks].sort((a, b) => {
      const timeA = new Date(a.time).getTime();
      const timeB = new Date(b.time).getTime();
      return timeA - timeB;
    });
    
    // Genera punti per ogni drink
    let currentBac = 0;
    sortedDrinks.forEach((drink, index) => {
      const drinkTime = new Date(drink.time);
      
      // Calcola l'incremento di BAC per questo drink
      let alcoholGrams = 0;
      if (drink.alcoholGrams) {
        alcoholGrams = typeof drink.alcoholGrams === 'string' 
          ? parseFloat(drink.alcoholGrams) 
          : drink.alcoholGrams as number;
      }
      
      // Incremento BAC (formula approssimata)
      const bacIncrease = Math.min(0.1, alcoholGrams * 0.02);
      currentBac += bacIncrease;
      
      // Aggiungi punto del drink
      series.push({
        time: drinkTime.toISOString(),
        bac: currentBac,
        isDrinkPoint: true
      });
      
      // Simula metabolismo (riduzione del BAC nel tempo)
      if (index < sortedDrinks.length - 1) {
        const nextDrinkTime = new Date(sortedDrinks[index + 1].time);
        const timeDiffHours = (nextDrinkTime.getTime() - drinkTime.getTime()) / (1000 * 60 * 60);
        
        // Riduzione di circa 0.015 g/L per ora
        const bacReduction = Math.min(currentBac, timeDiffHours * 0.015);
        currentBac = Math.max(0, currentBac - bacReduction);
        
        // Aggiungi punto prima del prossimo drink
        const beforeNextDrinkTime = new Date(nextDrinkTime.getTime() - 1000);
        series.push({
          time: beforeNextDrinkTime.toISOString(),
          bac: currentBac
        });
      }
    });
    
    // Punto finale (se c'è un maxBac)
    if (maxBac > 0 && maxBac > currentBac) {
      // Correggi il punto massimo
      const maxIndex = Math.floor(series.length / 2);
      series[maxIndex].bac = maxBac;
    }
    
    // Assicurati che l'ultimo punto sia l'endTime o il tempo attuale
    const endTime = session.endTime 
      ? new Date(session.endTime) 
      : session.updated_at 
        ? new Date(session.updated_at) 
        : new Date();
    
    // Calcola quanto tempo è passato dalla fine della sessione
    const lastDrinkTime = new Date(sortedDrinks[sortedDrinks.length - 1].time);
    const timeToEndHours = (endTime.getTime() - lastDrinkTime.getTime()) / (1000 * 60 * 60);
    
    // Riduzione finale del BAC
    const finalBacReduction = Math.min(currentBac, timeToEndHours * 0.015);
    const finalBac = Math.max(0, currentBac - finalBacReduction);
    
    series.push({
      time: endTime.toISOString(),
      bac: finalBac
    });
    
    return series;
  };

  // Calcola statistiche sulla sessione
  const calculateStats = () => {
    if (!session) return null;

    // Durata totale
    let durationText = 'N/A';
    try {
      durationText = formatDuration(session.startTime, session.endTime || session.updated_at);
    } catch (error) {
      console.warn('Errore nel calcolo della durata:', error);
    }

    // Totale bevande
    const totalDrinks = session.drinks.length;
    
    // BAC massimo
    const maxBac = session.maxBac || 
                  Math.max(...session.bacSeries?.map(p => p.bac) || [0], session.currentBAC || 0);

    return {
      duration: durationText,
      totalDrinks,
      maxBac: maxBac.toFixed(2)
    };
  };

  // Gestione dello swipe per tornare indietro
  const renderRightActions = () => {
    return null; // Non mostriamo azioni a destra, ma usiamo solo il gesto
  };

  const handleSwipeRight = () => {
    router.back();
  };

  // Renderizza il grafico BAC
  const renderBACChart = () => {
    if (!session || !session.bacSeries || session.bacSeries.length === 0) {
      // Se non ci sono dati della serie, creiamo un grafico piatto
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
          legalLimit={0.5}
        />
      );
    }

    // Prepara i dati per il grafico
    const chartData: BacDataPoint[] = session.bacSeries.map(point => ({
      time: typeof point.time === 'string' ? point.time : point.time.toISOString(),
      bac: point.bac,
      isEvent: point.isDrinkPoint,
      eventType: point.isDrinkPoint ? 'drink' : undefined
    }));

    // Prepara i dati delle bevande
    const drinkData: DrinkDataPoint[] = session.drinks.map(drink => ({
      time: typeof drink.time === 'string' ? drink.time : new Date(drink.time).toISOString(),
      alcoholGrams: typeof drink.alcoholGrams === 'string' 
        ? parseFloat(drink.alcoholGrams) 
        : (drink.alcoholGrams as number || 0)
    }));

    // Prepara i dati dei cibi
    const foodData: FoodDataPoint[] = session.foods.map(food => ({
      time: typeof food.time === 'string' ? food.time : new Date(food.time).toISOString(),
      absorptionFactor: typeof food.absorptionFactor === 'number'
        ? food.absorptionFactor
        : 0.95 // Valore predefinito
    }));

    // Usa la serie BAC dalla sessione se disponibile
    return (
      <BACChartSimple 
        bacSeries={chartData}
        drinks={drinkData}
        foods={foodData}
        legalLimit={0.5}
      />
    );
  };

  // Renderizza un elemento bevanda
  const renderDrinkItem = ({ item }: { item: Drink }) => {
    try {
      // Formatta l'orario della bevanda
      let timeText = 'N/A';
      try {
        timeText = formatTime(item.time);
      } catch (e) {
        console.warn('Errore nel parsing dell\'orario della bevanda:', e);
      }

      // Calcola i grammi di alcol
      let alcoholGrams = 0;
      if (item.alcoholGrams) {
        alcoholGrams = typeof item.alcoholGrams === 'string' 
          ? parseFloat(item.alcoholGrams) 
          : (item.alcoholGrams as number);
      }

      // Gestisci vari formati di chiavi di traduzione
      let displayName = item.name;
      if (displayName) {
        if (displayName.startsWith('drinktypes.')) {
          // Formato diretto drinktypes.nomedrink
          const drinkKey = displayName.replace('drinktypes.', '');
          displayName = t(drinkKey, { ns: 'drinktypes', defaultValue: drinkKey });
        } else if (displayName.includes('.')) {
          // Formato namespace.chiave generico
          const [namespace, key] = displayName.split('.');
          displayName = t(key, { ns: namespace, defaultValue: key });
        }
      }

      return (
        <View style={[styles.itemCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.itemIcon}>
            <MaterialCommunityIcons name="glass-cocktail" size={24} color={colors.primary} />
          </View>
          <View style={styles.itemDetails}>
            <Text style={[styles.itemName, { color: colors.text }]}>{displayName}</Text>
            <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
              {item.volume}ml • {alcoholGrams.toFixed(1)}g {t('alcohol', { defaultValue: 'alcol' })}
            </Text>
          </View>
          <Text style={[styles.itemTime, { color: colors.textSecondary }]}>{timeText}</Text>
        </View>
      );
    } catch (error) {
      console.error('Errore nel rendering dell\'elemento bevanda:', error);
      return null;
    }
  };

  // Renderizza un elemento cibo
  const renderFoodItem = ({ item }: { item: FoodRecord }) => {
    try {
      // Formatta l'orario del cibo
      let timeText = 'N/A';
      try {
        timeText = formatTime(item.time);
      } catch (e) {
        console.warn('Errore nel parsing dell\'orario del cibo:', e);
      }

      // Gestisci vari formati di chiavi di traduzione
      let displayName = item.name;
      if (displayName && displayName.includes('.')) {
        const [namespace, key] = displayName.split('.');
        displayName = t(key, { ns: namespace, defaultValue: key });
      }

      return (
        <View style={[styles.itemCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.itemIcon}>
            <Ionicons 
              name={item.icon as any || "restaurant"} 
              size={24} 
              color={item.iconColor || colors.primary} 
            />
          </View>
          <View style={styles.itemDetails}>
            <Text style={[styles.itemName, { color: colors.text }]}>{displayName}</Text>
            <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
              {t('absorptionReduction', { defaultValue: 'Riduzione assorbimento' })}: {((1 - (item.absorptionFactor || 0.95)) * 100).toFixed(0)}%
            </Text>
          </View>
          <Text style={[styles.itemTime, { color: colors.textSecondary }]}>{timeText}</Text>
        </View>
      );
    } catch (error) {
      console.error('Errore nel rendering dell\'elemento cibo:', error);
      return null;
    }
  };

  // Combina bevande e cibi in un unico array ordinato per ora
  const getCombinedItems = () => {
    if (!session) return [];

    const allItems = [
      ...session.drinks.map(drink => ({ ...drink, type: 'drink' as const })),
      ...session.foods.map(food => ({ ...food, type: 'food' as const }))
    ];

    // Ordina per ora di consumo
    return allItems.sort((a, b) => {
      const timeA = new Date(a.time).getTime();
      const timeB = new Date(b.time).getTime();
      return timeA - timeB;
    });
  };

  // Renderizza un elemento combinato (bevanda o cibo)
  const renderCombinedItem = ({ item }: { item: (Drink | FoodRecord) & { type: 'drink' | 'food' } }) => {
    if (item.type === 'drink') {
      return renderDrinkItem({ item: item as Drink });
    } else {
      return renderFoodItem({ item: item as FoodRecord });
    }
  };

  // Se ancora in caricamento o sessione non trovata
  if (loading || !session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader title={t('details', { defaultValue: 'Dettagli' })} />
        <View style={styles.loadingContainer}>
          <Ionicons name="time" size={40} color={colors.textSecondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {loading ? t('loading', { ns: 'common', defaultValue: 'Caricamento' }) : t('sessionNotFound', { defaultValue: 'Sessione non trovata' })}
          </Text>
        </View>
      </View>
    );
  }

  // Calcola le statistiche
  const stats = calculateStats();

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <AppHeader 
        title={t('details', { defaultValue: 'Dettagli' })}
        isMainScreen={false} 
        onBackPress={() => router.back()}
      />

      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        onSwipeableRightOpen={handleSwipeRight}
        friction={1} // Ridotto per rendere il gesto più facile
        rightThreshold={20} // Ridotto per attivare più facilmente
        overshootRight={false} // Previene un movimento troppo ampio
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header della sessione */}
          <View style={[styles.sessionHeader, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.sessionInfo}>
              <Text style={[styles.sessionDate, { color: colors.textSecondary }]}>
                {formatSessionDate(session.startTime)}
              </Text>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {session.profile?.name || t('unknownProfile', { defaultValue: 'Profilo sconosciuto' })}
              </Text>
            </View>
          </View>

          {/* Statistiche */}
          <View style={[styles.statsCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('statistics', { defaultValue: 'Statistiche' })}
            </Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats?.duration || 'N/A'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {t('duration', { defaultValue: 'Durata' })}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats?.totalDrinks || '0'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {t('drinks', { defaultValue: 'Bevande' })}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats?.maxBac || '0.00'} g/L
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {t('maxBAC', { defaultValue: 'BAC Massimo' })}
                </Text>
              </View>
            </View>
          </View>

          {/* Grafico BAC */}
          <View style={[styles.chartCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('bacChart', { defaultValue: 'Grafico BAC' })}
            </Text>
            <View style={styles.chartContainer}>
              {renderBACChart()}
            </View>
          </View>

          {/* Lista di bevande e cibi */}
          <View style={[styles.itemsCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('consumptionList', { defaultValue: 'Consumazioni' })}
            </Text>
            
            {getCombinedItems().length > 0 ? (
              getCombinedItems().map((item, index) => (
                <View key={`${item.id}_${index}`}>
                  {renderCombinedItem({ item: item as any })}
                </View>
              ))
            ) : (
              <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>
                {t('noItemsInSession', { defaultValue: 'Nessuna consumazione in questa sessione' })}
              </Text>
            )}
          </View>
        </ScrollView>
      </Swipeable>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: SIZES.body,
    marginTop: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  sessionHeader: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sessionInfo: {
    flexDirection: 'column',
  },
  sessionDate: {
    fontSize: SIZES.small,
    marginBottom: 4,
  },
  profileName: {
    fontSize: SIZES.title,
    fontWeight: 'bold',
  },
  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.title,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: SIZES.small,
  },
  chartCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartContainer: {
    marginHorizontal: -8,
  },
  itemsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: SIZES.body,
    fontWeight: '500',
  },
  itemMeta: {
    fontSize: SIZES.small,
    marginTop: 2,
  },
  itemTime: {
    fontSize: SIZES.small,
    marginLeft: 8,
  },
  emptyListText: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: SIZES.body,
  },
}); 