import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { DARK_THEME } from '../constants/theme';
import Svg, { Circle } from 'react-native-svg';

const screenWidth = Dimensions.get('window').width;

interface BACChartSimpleProps {
  bacSeries: Array<{ 
    time: string; 
    bac: number; 
    isEvent?: boolean;
    eventType?: 'drink' | 'food';
  }>;
  drinks?: Array<{ time: string; alcoholGrams: number }>;
  foods?: Array<{ time: string; absorptionFactor: number }>;
  legalLimit?: number;
}

export default function BACChartSimple({ 
  bacSeries, 
  drinks = [], 
  foods = [], 
  legalLimit = 0.5 
}: BACChartSimpleProps) {
  // Verifica che ci siano dati
  if (!bacSeries || bacSeries.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>Dati insufficienti per il grafico</Text>
      </View>
    );
  }
  
  // Se abbiamo solo un punto dati, creiamo un secondo punto per renderizzare il grafico
  let workingBacSeries = [...bacSeries];
  if (workingBacSeries.length === 1) {
    const firstPoint = workingBacSeries[0];
    const firstTime = new Date(firstPoint.time);
    
    // Crea un punto 30 minuti prima
    const prevTime = new Date(firstTime.getTime() - 30 * 60 * 1000);
    workingBacSeries = [
      { time: prevTime.toISOString(), bac: 0 },
      firstPoint
    ];
  }

  // Ordina i punti per tempo
  workingBacSeries = workingBacSeries.sort((a, b) => 
    new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  // Formatta le etichette del tempo in modo più leggibile
  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error('Error formatting time:', e);
      return '';
    }
  };

  // Seleziona punti strategici per le etichette dell'asse X
  const selectTimeLabels = (data: Array<{ time: string; bac: number; isEvent?: boolean; eventType?: 'drink' | 'food' }>) => {
    if (data.length <= 6) return data.map(point => point.time);
    
    // Seleziona sempre il primo punto, l'ultimo punto, e alcuni punti intermedi ben distribuiti
    const selectedIndices = [0];
    
    // Aggiungi 2-4 punti intermedi a seconda della lunghezza dei dati
    const numIntermediatePoints = Math.min(4, Math.max(2, Math.floor(data.length / 3)));
    const step = Math.floor(data.length / (numIntermediatePoints + 1));
    
    for (let i = 1; i <= numIntermediatePoints; i++) {
      selectedIndices.push(i * step);
    }
    
    // Aggiungi l'ultimo punto se non è già incluso
    if (selectedIndices[selectedIndices.length - 1] !== data.length - 1) {
      selectedIndices.push(data.length - 1);
    }
    
    return selectedIndices.map(index => data[index].time);
  };

  // Trova i punti evento (bevande e cibo)
  const eventPoints = workingBacSeries.filter(point => point.isEvent);
  
  // Seleziona i punti che verranno mostrati come etichette dell'asse X
  const selectedTimeLabels = selectTimeLabels(workingBacSeries);
  
  // Prepara le etichette e i dati per il grafico
  const labels = workingBacSeries.map(point => {
    const timeStr = point.time;
    // Se questo punto è tra i punti selezionati per le etichette, mostra il tempo formattato
    if (selectedTimeLabels.includes(timeStr)) {
      return formatTime(timeStr);
    }
    // Altrimenti, mostra un'etichetta vuota
    return '';
  });
  
  const data = workingBacSeries.map(point => point.bac);

  // Calcola il valore massimo per la scala Y del grafico
  const maxBacValue = Math.max(...data, legalLimit);
  const roundedMaxValue = Math.ceil(maxBacValue * 10) / 10 + 0.1; // Arrotonda a 0.1 superiore e aggiungi un piccolo margine

  // Prepara i dati del grafico
  const chartData = {
    labels,
    datasets: [
      {
        data,
        color: (opacity = 1) => `rgba(0, 217, 217, ${opacity})`,
        strokeWidth: 3
      },
      {
        data: Array(labels.length).fill(legalLimit),
        color: () => '#FF3B00',
        strokeWidth: 2,
        strokeDashArray: [6, 3],
        withDots: false
      }
    ],
  };

  // Configurazione del grafico
  const chartConfig = {
    backgroundColor: DARK_THEME.COLORS.background,
    backgroundGradientFrom: DARK_THEME.COLORS.background,
    backgroundGradientTo: DARK_THEME.COLORS.background,
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: 4,
      strokeWidth: 2,
      stroke: DARK_THEME.COLORS.background,
      fill: '#00D9D9',
    },
    propsForBackgroundLines: {
      stroke: 'rgba(255, 255, 255, 0.2)',
      strokeWidth: 1,
      strokeDasharray: ''
    },
    propsForLabels: {
      fontSize: 10,
      fontWeight: '700'
    }
  };
  
  // Ottieni punti di eventi per legenda
  const hasDrinks = drinks.length > 0;
  const hasFoods = foods.length > 0;

  // Funzione per calcolare la posizione X di un punto nel grafico
  const calculateXPosition = (index) => {
    const chartWidth = screenWidth - 64; // larghezza del grafico meno il padding
    const position = (index / (workingBacSeries.length - 1)) * chartWidth + 32;
    return position;
  };

  // Funzione per calcolare la posizione Y di un punto nel grafico
  const calculateYPosition = (bac) => {
    const chartHeight = 170; // altezza effettiva del grafico
    const yPosition = 200 - (bac / roundedMaxValue) * chartHeight - 10;
    return yPosition;
  };

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        {/* Rimuovo l'SVG overlay dei pallini del limite legale */}
        <LineChart
          data={chartData}
          width={screenWidth - 32}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          yAxisSuffix=" g/L"
          fromZero={true}
          segments={3}
          yAxisInterval={0.5}
        />
      </View>
      
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#00D9D9' }]} />
          <Text style={styles.legendText}>Tasso alcolemico</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FF3B00' }]} />
          <Text style={styles.legendText}>Limite legale</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: DARK_THEME.COLORS.background,
    borderWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 8,
    position: 'relative',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  decorator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: DARK_THEME.COLORS.background,
    marginLeft: -6,
    marginTop: -6,
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
    marginHorizontal: 8,
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
    fontWeight: '500',
    color: '#FFFFFF'
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: DARK_THEME.COLORS.background,
    borderRadius: 16,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8
  }
}); 