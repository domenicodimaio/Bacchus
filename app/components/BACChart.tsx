import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, ActivityIndicator, TouchableOpacity, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LineChart } from 'react-native-chart-kit';
import { BAC_LIMITS } from '../constants/bac';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS, SIZES } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

type BACPoint = {
  time: string;
  bac: number;
};

type BACChartProps = {
  timePoints?: { time: Date; bac: number }[];
  data?: BACPoint[];
  currentBAC?: number;
  soberTime?: string;
  hours?: number;
};

export default function BACChart({ timePoints, data, currentBAC = 0, soberTime = '', hours = 6 }: BACChartProps) {
  const { t } = useTranslation('session');
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const isDarkMode = useColorScheme() === 'dark';
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  
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
      if (!date || isNaN(date.getTime())) {
        return '--:--';
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  
  const processedData = useMemo(() => {
    setIsLoading(true);
    setError(null);
    
    // Generate default data if none provided
    const defaultData = {
      labels: Array(6).fill('').map((_, i) => `${i}h`),
      values: Array(6).fill(0),
      dataPoints: Array(6).fill(0).map((_, i) => ({
        x: i,
        y: 0,
        label: `${i}h`
      }))
    };
    
    try {
      console.log('BACChart: Elaborazione dati per il grafico');
      
      if (timePoints && timePoints.length > 0) {
        console.log(`BACChart: Usando timePoints con ${timePoints.length} punti`);
        
        // Validare ogni punto per assicurarsi che sia strutturato correttamente
        const validTimePoints = timePoints.filter(point => 
          point && point.time && !isNaN(new Date(point.time).getTime()) && 
          point.bac !== undefined
        );
        
        if (validTimePoints.length === 0) {
          console.warn('BACChart: Tutti i timePoints sono invalidi, uso dati predefiniti');
          setIsLoading(false);
          return defaultData;
        }
        
        // Filtra per avere al massimo 6-8 punti per una visualizzazione più pulita
        let filteredPoints = validTimePoints;
        if (validTimePoints.length > 8) {
          const step = Math.floor(validTimePoints.length / 6);
          filteredPoints = validTimePoints.filter((_, index) => index % step === 0 || index === validTimePoints.length - 1);
          // Assicurati di avere sempre almeno il primo e l'ultimo punto
          if (!filteredPoints.includes(validTimePoints[0])) {
            filteredPoints.unshift(validTimePoints[0]);
          }
          if (!filteredPoints.includes(validTimePoints[validTimePoints.length - 1])) {
            filteredPoints.push(validTimePoints[validTimePoints.length - 1]);
          }
        }
        
        // Assicurarsi che la serie inizi da 0
        if (filteredPoints.length > 0 && sanitizeValue(filteredPoints[0].bac) > 0.05) {
          // Aggiungi un punto iniziale con BAC a 0
          const firstPointTime = new Date(filteredPoints[0].time);
          // Mettiamo il punto iniziale un'ora prima
          firstPointTime.setHours(firstPointTime.getHours() - 1);
          filteredPoints.unshift({
            time: firstPointTime,
            bac: 0
          });
        }
        
        const formattedData = filteredPoints.map((point, index) => {
          const date = point.time instanceof Date ? point.time : new Date(point.time);
          return {
            x: index,
            y: sanitizeValue(point.bac),
            label: formatTimeLabel(date)
          };
        });
        
        const result = {
          labels: formattedData.map(d => d.label),
          values: formattedData.map(d => d.y),
          dataPoints: formattedData
        };
        
        setIsLoading(false);
        return result;
      }
      
      if (data && data.length > 0) {
        console.log(`BACChart: Usando data con ${data.length} punti`);
        
        // Validare ogni punto per assicurarsi che sia strutturato correttamente
        const validData = data.filter(point => 
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
            label: formatTimeLabel(date)
          };
        });
        
        const result = {
          labels: formattedData.map(d => d.label),
          values: formattedData.map(d => d.y),
          dataPoints: formattedData
        };
        
        setIsLoading(false);
        return result;
      }
      
      console.log('BACChart: Nessun dato valido, usando dati predefiniti');
      
      // Se non ci sono dati ma abbiamo un BAC corrente, creiamo un grafico semplice
      if (currentBAC > 0) {
        console.log('BACChart: Creando grafico semplice con BAC corrente:', currentBAC);
        
        // Crea un grafico semplice che mostra il BAC attuale e la discesa a zero
        const now = new Date();
        const metabolismRate = 0.017; // g/L per ora (aggiornato)
        const hours = Math.ceil(currentBAC / metabolismRate); // Ore per tornare a zero
        
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
          y: sanitizeValue(currentBAC),
          label: formatTimeLabel(now)
        });
        
        // Usa un numero fisso di punti per una visualizzazione più pulita
        const numPoints = Math.min(4, hours);
        const timeStep = hours / numPoints;
        
        for (let i = 1; i <= numPoints; i++) {
          const time = new Date(now);
          time.setHours(time.getHours() + i * timeStep);
          
          const remainingBAC = Math.max(0, currentBAC - (metabolismRate * i * timeStep));
          
          dataPoints.push({
            x: i + 1,
            y: sanitizeValue(remainingBAC),
            label: formatTimeLabel(time)
          });
        }
        
        const result = {
          labels: dataPoints.map(d => d.label),
          values: dataPoints.map(d => d.y),
          dataPoints: dataPoints
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
  }, [timePoints, data, currentBAC]);
  
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
    currentBAC || 0
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
    // Non renderizzare questa legenda, manteniamo solo quella sotto
    return null;
  };
  
  // Mostra pulsante per attivare legenda se nascosta
  const renderLegendToggle = () => {
    // Non renderizzare questa legenda
    return null;
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
        {t('bacOverTime', 'Andamento del tasso alcolico')}
      </Text>
      
      {/* Non renderizziamo le legende in alto */}
      
      <View style={[styles.chartContainer, { backgroundColor: 'transparent', position: 'relative', zIndex: 1 }]}>
        <LineChart
          data={{
            labels: processedData.labels,
            datasets: [
              {
                data: processedData.values.length > 0 ? processedData.values : [0, 0],
                color: (opacity = 1) => getLineColor(opacity),
                strokeWidth: 3
              }
            ],
            // Impostiamo la legend a null per non mostrare la legenda automatica in alto
            legend: []
          }}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: 'transparent',
            backgroundGradientTo: 'transparent',
            fillShadowGradientFrom: 'transparent',
            fillShadowGradientTo: 'transparent',
            backgroundGradientFromOpacity: 0,
            backgroundGradientToOpacity: 0,
            useShadowColorFromDataset: false,
            decimalPlaces: 2,
            color: (opacity = 1) => isDarkMode ? `rgba(0, 247, 255, ${opacity})` : `rgba(0, 129, 180, ${opacity})`,
            labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
            propsForDots: {
              r: "5",
              strokeWidth: "2",
              stroke: colors.primary
            },
            propsForBackgroundLines: {
              stroke: chartColors.chartGrid,
              strokeDasharray: ''
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
          renderDotContent={({x, y, index}) => {
            if (index >= 0 && index < processedData.values.length) {
              return (
                <View 
                  key={index} 
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
        />
      </View>
      
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
            {sanitizeValue(currentBAC).toFixed(2)} g/L
          </Text>
        </View>
        
        {soberTime && (
          <View style={[styles.infoCard, { backgroundColor: isDarkMode ? 'rgba(30, 46, 69, 0.7)' : 'rgba(245, 245, 247, 0.7)' }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {t('estimatedSoberTime', 'Tempo alla sobrietà')}
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {soberTime}
            </Text>
          </View>
        )}
      </View>
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
    marginTop: 5,
    marginBottom: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignSelf: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendDashedLine: {
    width: 20,
    height: 0,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
  },
  dotLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  }
}); 