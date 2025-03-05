import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Card } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS } from '../constants/colors';
import { BAC_LIMITS, LEGAL_DRIVING_LIMIT } from '../constants/bac';

interface BACGraphProps {
  bacSeries: Array<{ time: string; bac: number }>;
  isDarkTheme?: boolean;
}

const BACGraph: React.FC<BACGraphProps> = ({ bacSeries, isDarkTheme: forceDarkTheme }) => {
  const { isDarkMode } = useTheme();
  const systemColorScheme = { dark: 'dark', light: 'light' }[isDarkMode ? 'dark' : 'light'];
  
  // Usa il tema fornito dalla prop o dal context
  const isDarkTheme = forceDarkTheme !== undefined 
    ? forceDarkTheme 
    : isDarkMode !== undefined 
      ? isDarkMode 
      : systemColorScheme === 'dark';
  
  // Verifica che ci siano dati sufficienti per il grafico
  if (!bacSeries || bacSeries.length < 2) {
    return (
      <Card style={[styles.container, { backgroundColor: '#14233B' }]}>
        <View style={styles.noDataContainer}>
          <Text style={[styles.noDataText, { color: '#FFFFFF', fontWeight: '600' }]}>
            Dati insufficienti per visualizzare il grafico.
          </Text>
          <Text style={[styles.noDataSubtext, { color: 'rgba(255, 255, 255, 0.8)' }]}>
            Aggiungi bevande per vedere l'andamento del tasso alcolemico.
          </Text>
        </View>
      </Card>
    );
  }

  // Filtriamo i dati per ridurre l'affollamento (1 punto ogni 2 se ci sono più di 8 punti)
  const filterData = (data: Array<{ time: string; bac: number }>) => {
    if (data.length <= 5) return data;
    
    // Mantiene sempre il primo e l'ultimo punto
    const filtered = [data[0]];
    const step = Math.max(1, Math.floor(data.length / 5));
    
    for (let i = step; i < data.length - step; i += step) {
      filtered.push(data[i]);
    }
    
    filtered.push(data[data.length - 1]);
    return filtered;
  };
  
  const filteredBacSeries = filterData(bacSeries);

  // Formatta le etichette del tempo in modo più semplice
  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error('Error formatting time:', e);
      return '';
    }
  };

  // Mostriamo solo alcune etichette per evitare l'affollamento
  const createLabelIndices = (totalPoints: number) => {
    if (totalPoints <= 3) return Array.from({ length: totalPoints }, (_, i) => i);
    // Per più punti, mostra solo il primo, uno centrale e l'ultimo
    return [0, Math.floor(totalPoints / 2), totalPoints - 1];
  };
  
  const labelIndices = createLabelIndices(filteredBacSeries.length);
  
  // Estrai i dati per il grafico
  const labels = filteredBacSeries.map((point, index) => 
    labelIndices.includes(index) ? formatTime(point.time) : ""
  );
  const data = filteredBacSeries.map(point => point.bac);

  // Colori e stile
  const backgroundColor = isDarkTheme ? '#14233B' : '#14233B'; // Stesso sfondo per entrambi i temi
  const textColor = '#FFFFFF'; // Testo sempre bianco
  const gridColor = 'rgba(255, 255, 255, 0.2)'; // Griglia leggermente più visibile
  
  // Colore linea BAC - più vivace e visibile
  const bacLineColor = '#60A5FA'; // Blu moderno
  // Colore linea limite - arancione/ambra
  const limitLineColor = 'rgba(245, 158, 11, 0.9)';
  
  return (
    <Card style={[styles.container, { 
      backgroundColor,
      borderWidth: 0,
      elevation: 0,
      shadowOpacity: 0
    }]}>
      <View style={styles.graphContainer}>
        <LineChart
          data={{
            labels,
            datasets: [
              {
                data,
                color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
                strokeWidth: 3
              },
              {
                // Linea limite legale - più sottile e discreta
                data: Array(labels.length).fill(LEGAL_DRIVING_LIMIT),
                color: () => limitLineColor,
                strokeWidth: 2,
                strokeDashArray: [4, 4]
              }
            ],
          }}
          width={Dimensions.get('window').width - 32}
          height={200} // Ridotto per un aspetto più compatto
          chartConfig={{
            backgroundColor,
            backgroundGradientFrom: backgroundColor,
            backgroundGradientTo: backgroundColor,
            decimalPlaces: 2,
            color: (opacity = 1) => '#FFFFFF', // Colore bianco per tutti gli elementi
            labelColor: () => 'rgba(255, 255, 255, 0.95)', // Etichette sempre bianche con alta opacità
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "5",
              strokeWidth: "0",
              stroke: '#60A5FA',
              fill: '#60A5FA'
            },
            propsForBackgroundLines: {
              stroke: gridColor,
              strokeWidth: 1,
              strokeDasharray: ''
            },
            propsForLabels: {
              fontSize: 12,
              fontWeight: '700', // Testo più in grassetto
              fill: '#FFFFFF' // Testo sempre bianco
            },
            propsForVerticalLabels: {
              fill: '#FFFFFF',
              fontSize: 12,
              fontWeight: '700'
            },
            propsForHorizontalLabels: {
              fill: '#FFFFFF',
              fontSize: 12,
              fontWeight: '700'
            }
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16
          }}
          withInnerLines={isDarkTheme} // Solo in dark mode, per un aspetto più pulito
          withOuterLines={false}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          yAxisSuffix=" g/L"
          yAxisInterval={0.4} // Intervalli più spaziati
          fromZero={true}
          segments={3} // Meno segmenti per un aspetto più pulito
        />
      </View>
      
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: bacLineColor }]} />
          <Text style={[styles.legendText, { color: '#FFFFFF', fontWeight: '600' }]}>Tasso alcolemico</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: limitLineColor.replace(/[^,]+\)/, '1)') }]} />
          <Text style={[styles.legendText, { color: '#FFFFFF', fontWeight: '600' }]}>Limite legale</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 0,
  },
  graphContainer: {
    alignItems: 'center',
    marginVertical: 4
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
    flexWrap: 'wrap'
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 4
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6
  },
  legendText: {
    fontSize: 13,
    fontWeight: '500'
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30
  },
  noDataText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
  },
  noDataSubtext: {
    fontSize: 14,
    textAlign: 'center'
  }
});

export default BACGraph; 