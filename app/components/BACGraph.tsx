import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { DARK_THEME } from '../constants/theme';
import { getTimeString } from '../utils/timeUtils';

const theme = DARK_THEME;
const screenWidth = Dimensions.get('window').width;

// Definizioni tipi
interface DrinkRecord {
  time: Date;
  alcoholGrams: number;
  timeConsumed?: Date;
}

interface FoodRecord {
  timestamp: Date;
  name: string;
  id: string;
}

interface BACPoint {
  time: Date;
  bac: number;
}

interface BACGraphProps {
  bacData: BACPoint[];
  drinks: DrinkRecord[];
  foods?: FoodRecord[];
  limit: number;
}

const BACGraph: React.FC<BACGraphProps> = ({
  bacData,
  drinks,
  foods = [],
  limit,
}) => {
  // Preparazione dati per il grafico
  const labels = bacData.map(point => getTimeString(point.time));
  const data = bacData.map(point => point.bac);
  
  // Preparazione dati per i punti di bevande e cibo
  const drinkTimes = drinks.map(d => d.time);
  const foodTimes = foods.map(f => f.timestamp);
  
  // Configurazione grafico
  const chartConfig = {
    backgroundGradientFrom: theme.COLORS.background,
    backgroundGradientTo: theme.COLORS.background,
    decimalPlaces: 2,
    color: (opacity = 1) => theme.COLORS.primary,
    labelColor: (opacity = 1) => theme.COLORS.text,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: theme.COLORS.background
    },
    propsForLabels: {
      fontSize: 10,
    },
  };
  
  // Configurazione dati
  const chartData = {
    labels,
    datasets: [
      {
        data,
        color: (opacity = 1) => theme.COLORS.primary,
        strokeWidth: 2,
      },
      {
        data: Array(data.length).fill(limit),
        color: (opacity = 1) => theme.COLORS.danger,
        strokeWidth: 1,
        withDots: false,
      },
    ],
    legend: ['BAC', 'Limite legale'],
  };
  
  // Renderizza punti di bevute su grafico
  const renderDrinkPoints = () => {
    return bacData.map((point, index) => {
      const isDrink = drinkTimes.some(
        drinkTime => Math.abs(new Date(drinkTime).getTime() - new Date(point.time).getTime()) < 60000
      );
      
      if (isDrink) {
        return (
          <View 
            key={`drink-${index}`}
            style={[
              styles.drinkPoint,
              {
                left: (index / (bacData.length - 1)) * (screenWidth - 64) + 32,
                bottom: (point.bac / Math.max(...data, limit * 1.2)) * 180,
              }
            ]}
          />
        );
      }
      
      return null;
    });
  };
  
  // Renderizza punti di cibo su grafico
  const renderFoodPoints = () => {
    return bacData.map((point, index) => {
      const isFood = foodTimes.some(
        foodTime => Math.abs(new Date(foodTime).getTime() - new Date(point.time).getTime()) < 60000
      );
      
      if (isFood) {
        return (
          <View 
            key={`food-${index}`}
            style={[
              styles.foodPoint,
              {
                left: (index / (bacData.length - 1)) * (screenWidth - 64) + 32,
                bottom: (point.bac / Math.max(...data, limit * 1.2)) * 180,
              }
            ]}
          />
        );
      }
      
      return null;
    });
  };
  
  // Renderizza legenda
  const renderLegend = () => {
    return (
      <View style={styles.legendContainer}>
        <View style={styles.legendRow}>
          <View style={[styles.legendItem, { backgroundColor: theme.COLORS.primary }]} />
          <Text style={styles.legendText}>Livello BAC</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendItem, { backgroundColor: theme.COLORS.danger }]} />
          <Text style={styles.legendText}>Limite legale</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendItem, { backgroundColor: theme.COLORS.secondary }]} />
          <Text style={styles.legendText}>Bevanda</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendItem, { backgroundColor: theme.COLORS.success }]} />
          <Text style={styles.legendText}>Cibo</Text>
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.graphContainer}>
        <LineChart
          data={chartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
        <View style={styles.pointsContainer}>
          {renderDrinkPoints()}
          {renderFoodPoints()}
        </View>
      </View>
      
      {renderLegend()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
  },
  graphContainer: {
    position: 'relative',
  },
  chart: {
    borderRadius: 16,
  },
  pointsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  drinkPoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.COLORS.secondary,
    position: 'absolute',
  },
  foodPoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.COLORS.success,
    position: 'absolute',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendItem: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: theme.COLORS.text,
  },
});

export default BACGraph; 