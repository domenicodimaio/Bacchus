import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, ActivityIndicator, TouchableOpacity, useColorScheme, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LineChart } from 'react-native-chart-kit';
import { BAC_LIMITS } from '../constants/bac';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS, SIZES, DARK_THEME } from '../constants/theme';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { BACRecord, DrinkRecord, FoodRecord } from '../types/session';
import { hexToRGBA } from '../lib/utils/colors';
import { getTimeString } from '../utils/timeUtils';
import Svg, { Circle } from 'react-native-svg';

const screenWidth = Dimensions.get('window').width;
const theme = DARK_THEME; // Usiamo direttamente DARK_THEME invece di importare theme da styles/theme

type BACPoint = {
  time: string;
  bac: number;
};

// Definizione del tipo per i dati elaborati nel grafico
type ProcessedChartData = {
  labels: string[];
  values: number[];
  dataPoints: {
    x: number;
    y: number;
    label: string;
    originalTime: Date;
    originalBac: number;
  }[];
  drinkDataPoints: (number | null)[];
  foodDataPoints: (number | null)[];
};

type BACChartProps = {
  bacData: BACRecord[];
  drinks: DrinkRecord[];
  foods?: FoodRecord[];
  limit: number;
  showDetails?: boolean;
  onShowDetails?: () => void;
  height?: number;
};

export default function BACChart({ bacData, drinks, foods, limit, showDetails = false, onShowDetails, height = 220 }: BACChartProps) {
  const { t } = useTranslation('session');
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const isDarkMode = useColorScheme() === 'dark';
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [activePoint, setActivePoint] = useState<number | null>(null);
  
  // Definisco i colori per le linee che non sono definiti nel tema
  const chartColors = {
    chartText: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
    chartGrid: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    cautionLine: isDarkMode ? '#FFD54F' : '#FFA000',
    warningLine: isDarkMode ? '#FFAB40' : '#F57C00'
  };
  
  // Funzione per formattare le etichette di tempo
  const formatTimeLabel = (date: Date) => {
    try {
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        console.warn('Data non valida nel formatTimeLabel:', date);
        return '--:--';
      }

      // Assicurati di usare un oggetto Date valido e formatta in modo consistente
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false // Assicurati che l'ora sia in formato 24h per consistenza
      });
    } catch (e) {
      console.error('Errore nella formattazione data:', e);
      return '--:--';
    }
  };
  
  // Sanitizes value to handle undefined, NaN, string, etc.
  const sanitizeValue = (value: number | string | undefined): number => {
    if (value === undefined || value === null) return 0;
    
    let numValue: number;
    if (typeof value === 'string') {
      try {
        numValue = parseFloat(value);
      } catch (e) {
        console.error('Errore nel parsing di stringa a numero:', e);
        return 0;
      }
    } else {
      numValue = value;
    }
    
    // Handle NaN and invalid values
    if (isNaN(numValue) || !isFinite(numValue)) {
      return 0;
    }
    
    // Ensure value is not negative and not absurdly high (realistic BAC limit)
    return Math.max(0, Math.min(numValue, 0.8));
  };
  
  const processedData = useMemo<ProcessedChartData>(() => {
    setIsLoading(true);
    setError(null);
    
    // Generate default data if none provided
    const defaultData: ProcessedChartData = {
      labels: Array(6).fill('').map((_, i) => `${i}h`),
      values: Array(6).fill(0),
      dataPoints: Array(6).fill(0).map((_, i) => ({
        x: i,
        y: 0,
        label: `${i}h`,
        originalTime: new Date(),
        originalBac: 0
      })),
      drinkDataPoints: Array(6).fill(null),
      foodDataPoints: Array(6).fill(null)
    };
    
    try {
      console.log('BACChart: Elaborazione dati per il grafico');
      
      if (bacData && bacData.length > 0) {
        console.log(`BACChart: Usando bacData con ${bacData.length} punti`);
        
        // Validare ogni punto per assicurarsi che sia strutturato correttamente
        const validData = bacData.filter(point => 
          point && point.time && point.bac !== undefined
        );
        
        if (validData.length === 0) {
          console.warn('BACChart: Tutti i data sono invalidi, uso dati predefiniti');
          setIsLoading(false);
          return defaultData;
        }
        
        // Filtra per avere al massimo 6-8 punti per una visualizzazione più pulita
        let filteredData = validData;
        if (validData.length > 8) {
          const step = Math.floor(validData.length / 6);
          filteredData = validData.filter((_, index) => index % step === 0 || index === validData.length - 1);
          // Assicurati di avere sempre almeno il primo e l'ultimo punto
          if (!filteredData.includes(validData[0])) {
            filteredData.unshift(validData[0]);
          }
          if (!filteredData.includes(validData[validData.length - 1])) {
            filteredData.push(validData[validData.length - 1]);
          }
        }
        
        // Assicurarsi che la serie inizi da 0
        if (filteredData.length > 0) {
          const firstPoint = filteredData[0];
          let firstBac = sanitizeValue(firstPoint.bac);
          
          if (firstBac > 0.05) {
            // Aggiungi un punto iniziale con BAC a 0
            const firstPointTime = new Date();
            try {
              firstPointTime.setTime(new Date(firstPoint.time).getTime() - 30 * 60 * 1000);
            } catch (e) {
              // Se c'è un errore nel parsing, usa semplicemente il tempo corrente meno 30 minuti
              firstPointTime.setMinutes(firstPointTime.getMinutes() - 30);
            }
            
            filteredData.unshift({
              time: firstPointTime.toISOString(),
              bac: 0
            });
          }
        }
        
        const formattedData = filteredData.map((point, index) => {
          const date = new Date(point.time);
          return {
            x: index,
            y: sanitizeValue(point.bac),
            label: formatTimeLabel(date),
            originalTime: date,
            originalBac: point.bac
          };
        });
        
        // Trova i punti nel tempo in cui sono stati consumati drink
        const drinkDataPoints = formattedData.map(bacPoint => {
          // Verifica se c'è un drink consumato nello stesso momento
          const hasDrink = drinks.some(drink => {
            // Usa timeConsumed che è un oggetto Date sulla DrinkRecord
            const drinkTime = drink.timeConsumed ? new Date(drink.timeConsumed).getTime() : 0;
            const bacTime = bacPoint.originalTime.getTime();
            // Considera un buffer di pochi secondi per il match
            return Math.abs(drinkTime - bacTime) < 60000; // 1 minuto di differenza
          });
          
          return hasDrink ? bacPoint.y : null;
        });
        
        // Trova i punti nel tempo in cui è stato consumato cibo
        const foodDataPoints = formattedData.map(bacPoint => {
          if (!foods) return null;
          
          // Verifica se c'è cibo consumato nello stesso momento
          const hasFood = foods.some(food => {
            // Usa timeConsumed che è un oggetto Date sulla FoodRecord
            const foodTime = food.timeConsumed ? new Date(food.timeConsumed).getTime() : 0;
            const bacTime = bacPoint.originalTime.getTime();
            // Considera un buffer di pochi secondi per il match
            return Math.abs(foodTime - bacTime) < 60000; // 1 minuto di differenza
          });
          
          return hasFood ? bacPoint.y : null;
        });
        
        const result = {
          labels: formattedData.map(d => d.label),
          values: formattedData.map(d => d.y),
          dataPoints: formattedData,
          drinkDataPoints,
          foodDataPoints
        };
        
        console.log('Dati grafico BAC finali:', 
          result.labels.map((label, i) => `${label}: ${result.values[i].toFixed(3)}`).join(', ')
        );
        
        setIsLoading(false);
        return result;
      }
      
      console.log('BACChart: Nessun dato valido, usando dati predefiniti');
      
      // Se non ci sono dati ma abbiamo un BAC corrente, creiamo un grafico semplice
      if (bacData.length > 0) {
        console.log('BACChart: Creando grafico semplice con BAC corrente');
        
        // Crea un grafico semplice che mostra il BAC attuale e la discesa a zero
        const now = new Date();
        const metabolismRate = 0.017; // g/L per ora (aggiornato)
        const hours = Math.ceil(bacData[0].bac / metabolismRate); // Ore per tornare a zero
        
        const dataPoints = [];
        
        // Inizio da 0
        const startTime = new Date(now);
        startTime.setMinutes(startTime.getMinutes() - 30);
        dataPoints.push({
          x: 0,
          y: 0,
          label: formatTimeLabel(startTime)
        });
        
        // Punto attuale
        dataPoints.push({
          x: 1,
          y: sanitizeValue(bacData[0].bac),
          label: formatTimeLabel(now)
        });
        
        // Usa un numero fisso di punti per una visualizzazione più pulita
        const numPoints = Math.min(4, hours);
        const timeStep = hours / numPoints;
        
        for (let i = 1; i <= numPoints; i++) {
          const time = new Date(now);
          time.setHours(time.getHours() + i * timeStep);
          
          const remainingBAC = Math.max(0, bacData[0].bac - (metabolismRate * i * timeStep));
          
          dataPoints.push({
            x: i + 1,
            y: sanitizeValue(remainingBAC),
            label: formatTimeLabel(time)
          });
        }
        
        const result = {
          labels: dataPoints.map(d => d.label),
          values: dataPoints.map(d => d.y),
          dataPoints: dataPoints,
          drinkDataPoints: Array(dataPoints.length).fill(null),
          foodDataPoints: Array(dataPoints.length).fill(null)
        };
        
        setIsLoading(false);
        return result;
      }
      
      setIsLoading(false);
      return defaultData;
    } catch (error) {
      console.error('BACChart: Errore nell\'elaborazione dei dati', error);
      setError('Errore nell\'elaborazione dei dati del grafico');
      setIsLoading(false);
      return defaultData;
    }
  }, [bacData, drinks, foods]);
  
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {t('loadingChart', 'Caricamento grafico...')}
        </Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }
  
  // Definisci colore linea in base al tema
  const getLineColor = (opacity = 1) => {
    return isDarkMode ? `rgba(0, 217, 217, ${opacity})` : `rgba(0, 129, 180, ${opacity})`;
  };

  // Crea linee di riferimento per i limiti legali
  const refLines = [
    {
      value: BAC_LIMITS.legalLimit, // 0.5 g/L - limite legale
      color: chartColors.cautionLine,
      label: 'Limite legale',
      dash: [5, 5]
    },
    {
      value: BAC_LIMITS.penalLowThreshold, // 0.8 g/L - prima soglia penale
      color: chartColors.warningLine,
      label: 'Penalità lieve',
      dash: [5, 5]
    }
  ];
  
  // Calcola il valore massimo per il grafico (per la scala dell'asse Y)
  const maxBACValue = Math.max(
    BAC_LIMITS.penalHighThreshold * 1.1, // Leggermente sopra la soglia penale alta (1.5 g/L)
    ...processedData.values, 
    processedData.values[processedData.values.length - 1] || 0
  );
  
  // Traccia linee orizzontali per i limiti legali
  const Decorator = () => {
    return (
      <>
        {refLines.map((line, index) => (
          <View 
            key={index}
            style={[
              styles.referenceLine,
              {
                borderColor: line.color,
                borderWidth: 1,
                borderStyle: 'dashed',
                top: (1 - line.value / maxBACValue) * 180 + 20, // Posiziona la linea in base al valore
              },
            ]}
          />
        ))}
      </>
    );
  };
  
  // Mostra legenda con spiegazione linee
  const renderLegend = () => {
    return (
      <View style={styles.legendContainer}>
        <View style={styles.legendRow}>
          <View style={[styles.legendItem, { backgroundColor: theme.COLORS.primary }]} />
          <Text style={styles.legendText}>Livello di alcol (BAC)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendItem, { backgroundColor: theme.COLORS.error }]} />
          <Text style={styles.legendText}>Limite legale</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendItem, { backgroundColor: theme.COLORS.primary }]} />
          <Text style={styles.legendText}>Bevanda</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendItem, { backgroundColor: theme.COLORS.success }]} />
          <Text style={styles.legendText}>Cibo</Text>
        </View>
      </View>
    );
  };
  
  // Mostra pulsante per attivare legenda se nascosta
  const renderLegendToggle = () => {
    // Non renderizzare questa legenda
    return null;
  };

  // Mostra informazioni dettagliate per il punto selezionato
  const handleDataPointClick = (data: any) => {
    if (data.index !== undefined) {
      setActivePoint(activePoint === data.index ? null : data.index);
    }
  };

  // Renderizza decoratori per indicare i punti di drink
  const renderDecorator = () => {
    if (!processedData.drinkDataPoints || !processedData.foodDataPoints) return null;
    
    return processedData.dataPoints.map((point, index) => {
      const x = (index / (processedData.dataPoints.length - 1)) * screenWidth;
      const y = height - (point.y / Math.max(...processedData.values)) * (height - 40) - 20;
      
      // Verifica se questo punto è un drink
      const isDrink = index < processedData.drinkDataPoints.length && 
        processedData.drinkDataPoints[index] !== null;
      
      // Verifica se questo punto è cibo
      const isFood = index < processedData.foodDataPoints.length && 
        processedData.foodDataPoints[index] !== null;
      
      if (!isDrink && !isFood) return null;
      
      return (
        <View
          key={`decorator-${index}`}
          style={[
            styles.decorator,
            {
              left: x, 
              top: y,
              backgroundColor: isDrink ? colors.primary : '#4CAF50'
            }
          ]}
        />
      );
    });
  };
  
  // Mostra il valore del punto selezionato
  const renderSelectedPointInfo = () => {
    if (activePoint === null) return null;
    
    const point = processedData.dataPoints[activePoint];
    if (!point) return null;
    
    const pointDate = new Date(point.originalTime);
    
    return (
      <View style={[styles.pointInfo, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.pointInfoTime, { color: colors.text }]}>
          {format(pointDate, 'HH:mm', { locale: it })}
        </Text>
        <Text style={[styles.pointInfoValue, { color: colors.primary }]}>
          BAC: {point.y.toFixed(2)}
        </Text>
      </View>
    );
  };

  // Renderizza la linea del limite legale
  const renderLimitLine = () => {
    if (!limit) return null;
    
    const maxValue = Math.max(...processedData.values, limit * 1.2);
    const limitY = height - (limit / maxValue) * (height - 40) - 20;
    
    return (
      <View 
        style={[
          styles.limitLine, 
          { 
            top: limitY, 
            borderColor: colors.caution 
          }
        ]}
      >
        <View style={[styles.limitMarker, { backgroundColor: colors.caution }]}>
          <Text style={styles.limitText}>{limit.toFixed(2)}</Text>
        </View>
      </View>
    );
  };
  
  // Se non ci sono dati, mostra un messaggio
  if (processedData.dataPoints.length < 2) {
    return (
      <View style={[styles.noDataContainer, { backgroundColor: colors.cardBackground }]}>
        <MaterialCommunityIcons name="chart-line" size={48} color={hexToRGBA(colors.textSecondary, 0.5)} />
        <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
          {t('Dati insufficienti per il grafico')}
        </Text>
        <Text style={[styles.noDataSubtext, { color: colors.textSecondary }]}>
          {t('Attendi qualche minuto per vedere l\'andamento')}
        </Text>
      </View>
    );
  }
  
  const renderTooltip = (point: any) => {
    if (!point) return null;
    
    const pointDate = point.originalTime;
    
    // Verifica se questo punto corrisponde a una bevanda
    const isDrink = drinks && drinks.some ?
      drinks.some(
        (drink) => Math.abs(drink.timeConsumed ? 
          new Date(drink.timeConsumed).getTime() - pointDate.getTime() : 0) < 60000
      ) : false;
    
    // Verifica se questo punto corrisponde a un cibo
    const isFood = foods && foods.some ?
      foods.some(
        (food) => Math.abs(food.timeConsumed ?
          new Date(food.timeConsumed).getTime() - pointDate.getTime() : 0) < 60000
      ) : false;

    return (
      <View style={styles.tooltip}>
        <Text style={styles.tooltipTime}>{getTimeString(pointDate)}</Text>
        <Text style={styles.tooltipBAC}>{point.originalBac.toFixed(3)} g/l</Text>
        {isDrink && <Text style={styles.tooltipDrink}>Hai bevuto</Text>}
        {isFood && <Text style={styles.tooltipFood}>Hai mangiato</Text>}
      </View>
    );
  };
  
  return (
    <View style={[styles.container, { backgroundColor: 'transparent', padding: 0 }]}>
      <Text style={[styles.title, { 
        color: isDarkMode ? '#FFFFFF' : '#000000', 
        fontSize: 20,
        fontWeight: 'bold',
        textShadowColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
        textShadowOffset: {width: 1, height: 1},
        textShadowRadius: 3
      }]}>
        {t('Andamento tasso alcolico')}
      </Text>
      
      {/* Non renderizziamo le legende in alto */}
      
      <View style={[styles.chartContainer, { backgroundColor: 'transparent', position: 'relative', zIndex: 1 }]}>
        {/* Definiamo un SVG che coprirà tutto il grafico per posizionare i punti personalizzati */}
        <Svg 
          width={screenWidth - 32} 
          height={height}
          style={{position: 'absolute', zIndex: 10}}
        >
          {/* Punti per le linee del limite legale */}
          {refLines.map((refLine, refIndex) => 
            processedData.labels.map((_, index) => {
              // Calcola la posizione X in base all'indice
              const x = ((index) / (processedData.labels.length - 1)) * (screenWidth - 32);
              
              // Calcola la posizione Y in base al valore della linea di riferimento rispetto alla scala del grafico
              const maxValue = Math.max(...processedData.values, refLine.value * 1.2);
              const y = height - ((refLine.value / maxValue) * (height - 40)) + 20;
              
              return (
                <Circle
                  key={`ref-dot-${refIndex}-${index}`}
                  cx={x}
                  cy={y}
                  r={5}
                  fill={refLine.color}
                  stroke={isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)'}
                  strokeWidth={2}
                />
              );
            })
          )}
        </Svg>
        
        <LineChart
          data={{
            labels: processedData.labels,
            datasets: [
              {
                data: processedData.values,
                color: (opacity = 1) => getLineColor(opacity),
                strokeWidth: 3,
                withDots: true,
              },
              ...refLines.map(refLine => ({
                data: Array(processedData.values.length).fill(refLine.value),
                color: (opacity = 1) => refLine.color,
                strokeWidth: 2,
                strokeDashArray: [4, 4],
                withDots: false, // Disattiviamo i punti nativi per le linee di riferimento
              })),
              ...(processedData.drinkDataPoints ? [{
                data: processedData.drinkDataPoints,
                color: (opacity = 1) => hexToRGBA(colors.primary, opacity),
                strokeWidth: 0
              }] : []),
              ...(processedData.foodDataPoints ? [{
                data: processedData.foodDataPoints,
                color: (opacity = 1) => hexToRGBA('#4CAF50', opacity),
                strokeWidth: 0
              }] : [])
            ],
            // Impostiamo la legend a null per non mostrare la legenda automatica in alto
            legend: []
          }}
          width={screenWidth - 32}
          height={height}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: 'transparent',
            backgroundGradientTo: 'transparent',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => colors.textSecondary,
            propsForDots: {
              r: "5",
              strokeWidth: "2",
              stroke: colors.background
            },
            propsForLabels: {
              fontSize: 10,
              fontWeight: '500'
            },
            style: {
              borderRadius: 16,
              backgroundColor: 'transparent',
            },
            formatYLabel: (yValue) => {
              const value = parseFloat(yValue);
              return isNaN(value) ? "0.0" : value.toFixed(1);
            },
            formatXLabel: (xLabel) => xLabel || "",
            fillShadowGradient: 'transparent',
            fillShadowGradientOpacity: 0
          }}
          transparent={true}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16,
            paddingRight: 0,
            backgroundColor: 'transparent'
          }}
          withInnerLines={false}
          withOuterLines={false}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withShadow={false}
          withScrollableDot={false}
          withDots={true}
          hidePointsAtIndex={[]}
          decorator={() => <Decorator />}
          renderDotContent={({x, y, index, indexData}) => {
            // Rendiamo solo le etichette per i punti BAC principali e non per i punti di limite legale
            if (index >= 0 && index < processedData.values.length && 
                (!indexData || typeof indexData !== 'number' || 
                !refLines.some(line => Math.abs(indexData - line.value) < 0.001))) {
              return (
                <View 
                  key={`bac-${index}`} 
                  style={{
                    position: 'absolute',
                    top: y - 20,
                    left: x - 15,
                  }}
                >
                  <Text style={[
                    styles.dotLabel,
                    { 
                      backgroundColor: isDarkMode ? 'rgba(30, 46, 69, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                      color: isDarkMode ? '#FFFFFF' : '#000000',
                    }
                  ]}>
                    {processedData.values[index].toFixed(2)}
                  </Text>
                </View>
              );
            }
            return null;
          }}
          onDataPointClick={handleDataPointClick}
        />
      </View>
      
      {renderDecorator()}
      {renderLimitLine()}
      {renderSelectedPointInfo()}
      
      {/* Legenda sotto il grafico */}
      <View style={styles.legendContainer}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: getLineColor() }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>
            {t('bacLevel', 'Tasso alcolico')}
          </Text>
        </View>
        
        {refLines.map((line, index) => (
          <View key={index} style={styles.legendRow}>
            <View style={[styles.legendDashedLine, { borderColor: line.color }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>
              {t(line.label.toLowerCase().replace(' ', ''), line.label)} ({line.value.toFixed(1)} g/L)
            </Text>
          </View>
        ))}
      </View>
      
      <View style={styles.infoContainer}>
        <View style={[styles.infoCard, { backgroundColor: isDarkMode ? 'rgba(30, 46, 69, 0.7)' : 'rgba(245, 245, 247, 0.7)' }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            {t('currentBAC', 'Tasso attuale')}
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {sanitizeValue(processedData.values[processedData.values.length - 1]).toFixed(2)} g/L
          </Text>
        </View>
      </View>
      
      {showDetails ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.detailsContainer}
        >
          {processedData.dataPoints.map((point, index) => (
            <TouchableOpacity
              key={`detail-${index}`}
              style={[
                styles.detailItem, 
                { 
                  backgroundColor: colors.cardBackground,
                  borderColor: activePoint === index ? colors.primary : colors.border,
                }
              ]}
              onPress={() => setActivePoint(activePoint === index ? null : index)}
            >
              <Text style={[styles.detailTime, { color: colors.textSecondary }]}>
                {processedData.labels[index]}
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {processedData.values[index].toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        onShowDetails && (
          <TouchableOpacity
            style={[styles.showDetailsButton, { backgroundColor: colors.cardBackground }]}
            onPress={onShowDetails}
          >
            <MaterialIcons name="expand-more" size={24} color={colors.textSecondary} />
            <Text style={[styles.showDetailsText, { color: colors.textSecondary }]}>
              {t('showDetails')}
            </Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 8,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  chartBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 8,
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  infoCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  referenceLine: {
    position: 'absolute',
    left: 40,
    right: 0,
    height: 1,
    zIndex: 10,
  },
  referenceLabel: {
    position: 'absolute',
    left: 0,
    fontSize: 10,
    width: 35,
    textAlign: 'right',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 10,
  },
  legendItem: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: theme.COLORS.text,
  },
  dotLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 5,
  },
  legendDashedLine: {
    width: 20,
    height: 0,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginRight: 8,
  },
  decorator: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    marginTop: -5,
  },
  pointInfo: {
    position: 'absolute',
    top: 10,
    left: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  pointInfoTime: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  pointInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  limitLine: {
    position: 'absolute',
    left: 40,
    right: 0,
    height: 1,
    zIndex: 10,
  },
  limitMarker: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
  },
  noDataSubtext: {
    fontSize: 12,
    marginTop: 8,
  },
  detailsContainer: {
    padding: 16,
  },
  detailItem: {
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
  },
  detailTime: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  showDetailsButton: {
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  showDetailsText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
  },
  tooltipTime: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tooltipBAC: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tooltipDrink: {
    color: theme.COLORS.primary,
    fontWeight: 'bold',
  },
  tooltipFood: {
    color: theme.COLORS.success,
    fontWeight: 'bold',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
}); 