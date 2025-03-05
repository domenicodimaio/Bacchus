import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { FoodRecord } from '../lib/bac/visualization';
import AppHeader from '../components/AppHeader';
import { useToast } from '../components/Toast';
import TimeSelector from '../components/TimeSelector';
import Header from '../components/Header';

// Presets di cibo
const foodPresets = [
  {
    id: 'lightSnack',
    name: 'foodTypes.lightSnack',
    icon: 'cookie',
    absorptionFactor: 0.9,
    iconColor: '#FF9800',
  },
  {
    id: 'smallMeal',
    name: 'foodTypes.smallMeal',
    icon: 'hamburger',
    absorptionFactor: 0.8,
    iconColor: '#8BC34A',
  },
  {
    id: 'fullMeal',
    name: 'foodTypes.fullMeal',
    icon: 'utensils',
    absorptionFactor: 0.6,
    iconColor: '#4CAF50',
  },
  {
    id: 'heavyMeal',
    name: 'foodTypes.heavyMeal',
    icon: 'pizza-slice',
    absorptionFactor: 0.4,
    iconColor: '#3F51B5',
  }
];

// Quando si è mangiato rispetto al bere
const timingOptions = [
  { id: 'before', name: 'foodTiming.before', description: 'foodTiming.beforeDescription', factor: 1.0 },
  { id: 'during', name: 'foodTiming.during', description: 'foodTiming.duringDescription', factor: 0.8 },
  { id: 'after', name: 'foodTiming.after', description: 'foodTiming.afterDescription', factor: 0.6 },
];

function AddFoodScreen() {
  const { t } = useTranslation(['session', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const navigation = useNavigation();
  
  // Stati per il form
  const [selectedFood, setSelectedFood] = useState(foodPresets[2]); // Default: pasto completo
  const [selectedTiming, setSelectedTiming] = useState(timingOptions[1]); // Default: durante il bere
  const [finalAbsorptionFactor, setFinalAbsorptionFactor] = useState(selectedFood.absorptionFactor * selectedTiming.factor);
  
  // Animazioni
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);
  const buttonScale = useSharedValue(0.95);
  
  // Nasconde l'header standard per usare il nostro componente AppHeader
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
  
  // Avvio animazioni
  useEffect(() => {
    contentOpacity.value = withSequence(
      withDelay(300, withTiming(1, { duration: 800 }))
    );
    
    contentTranslateY.value = withSequence(
      withDelay(300, withTiming(0, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }))
    );
    
    buttonScale.value = withSequence(
      withDelay(800, withTiming(1, { duration: 300 })),
      withTiming(1, { duration: 200 })
    );
  }, []);
  
  // Ricalcola il fattore di assorbimento quando cambiano le selezioni
  useEffect(() => {
    const factor = selectedFood.absorptionFactor * selectedTiming.factor;
    setFinalAbsorptionFactor(factor);
  }, [selectedFood, selectedTiming]);
  
  // Handler per la selezione del cibo
  const handleSelectFood = (food) => {
    setSelectedFood(food);
  };
  
  // Handler per la selezione del timing
  const handleSelectTiming = (timing) => {
    setSelectedTiming(timing);
  };
  
  // Funzione per salvare il cibo migliorata
  const handleSaveFood = () => {
    console.log("🍔 Saving food...");
    
    try {
      // Validazione dell'input
      if (!selectedFood) {
        Alert.alert("Errore", "Seleziona un alimento");
        return;
      }
      
      const timestamp = new Date().getTime(); // Timestamp unico per identificare questo cibo
      
      // Preparazione dei dati
      const foodData = {
        id: `food_${timestamp}`,
        name: selectedFood.name,
        absorptionFactor: selectedFood.absorptionFactor,
        timeConsumed: new Date().toISOString(),
        icon: selectedFood.icon || 'utensils'
      };
      
      console.log("🍔 Food data:", foodData);
      
      // Converti in JSON per passare i parametri
      const foodParam = JSON.stringify(foodData);
      console.log("🍔 Food param (encoded):", foodParam);
      
      // Aggiungi il timestamp nei parametri per evitare problemi di cache
      router.replace({
        pathname: '/session',
        params: { 
          newFood: foodParam,
          timestamp: timestamp.toString()
        }
      });
      
      console.log("🍔 Navigating back to session with food data");
    } catch (error) {
      console.error("❌ Error saving food:", error);
      Alert.alert(
        "Errore", 
        `Si è verificato un errore nel salvataggio dell'alimento: ${error.message}`
      );
    }
  };
  
  // Stili animati
  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      transform: [{ translateY: contentTranslateY.value }],
    };
  });
  
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });
  
  // Formatta il fattore di assorbimento come percentuale
  const formatAbsorptionFactor = (factor) => {
    return `${Math.round((1 - factor) * 100)}%`;
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      
      <Header 
        title={t('addFood')}
        showBack={true}
      />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.section, contentAnimatedStyle]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('selectFoodType')}
          </Text>
          
          <View style={styles.foodPresets}>
            {foodPresets.map((food) => (
              <TouchableOpacity
                key={food.id}
                style={[
                  styles.foodPreset,
                  selectedFood.id === food.id && {
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}20`,
                  },
                  { backgroundColor: colors.cardBackground }
                ]}
                onPress={() => handleSelectFood(food)}
              >
                <FontAwesome5 
                  name={food.icon} 
                  size={28} 
                  color={selectedFood.id === food.id ? colors.primary : food.iconColor} 
                />
                <Text style={[styles.foodPresetName, { color: colors.text }]}>
                  {t(food.name)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('selectFoodTiming')}
          </Text>
          
          <View style={styles.timingOptions}>
            {timingOptions.map((timing) => (
              <TouchableOpacity
                key={timing.id}
                style={[
                  styles.timingOption,
                  selectedTiming.id === timing.id && {
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}20`,
                  },
                  { backgroundColor: colors.cardBackground }
                ]}
                onPress={() => handleSelectTiming(timing)}
              >
                <Text style={[styles.timingOptionName, { color: colors.text }]}>
                  {t(timing.name)}
                </Text>
                <Text style={[styles.timingOptionDescription, { color: colors.textSecondary }]}>
                  {t(timing.description)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.resultContainer}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
              {t('alcoholReductionEffect')}
            </Text>
            <Text style={[styles.resultValue, { color: colors.primary }]}>
              {formatAbsorptionFactor(finalAbsorptionFactor)}
            </Text>
            <Text style={[styles.resultExplanation, { color: colors.textSecondary }]}>
              {t('foodAbsorptionExplanation')}
            </Text>
          </View>
        </Animated.View>
        
        <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleSaveFood}
          >
            <Text style={styles.addButtonText}>
              {t('addFood')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

export default AddFoodScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SIZES.padding,
  },
  section: {
    marginBottom: SIZES.marginLarge,
  },
  sectionTitle: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
    marginTop: SIZES.margin,
    marginBottom: SIZES.marginSmall,
  },
  foodPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SIZES.margin,
  },
  foodPreset: {
    width: '48%',
    padding: SIZES.padding,
    marginBottom: SIZES.marginSmall,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  foodPresetName: {
    marginTop: 8,
    fontSize: SIZES.body,
  },
  timingOptions: {
    marginBottom: SIZES.margin,
  },
  timingOption: {
    padding: SIZES.padding,
    marginBottom: SIZES.marginSmall,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: 'transparent',
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
  timingOptionName: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timingOptionDescription: {
    fontSize: SIZES.small,
  },
  resultContainer: {
    marginTop: SIZES.marginLarge,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  resultLabel: {
    fontSize: SIZES.body,
    marginBottom: 8,
  },
  resultValue: {
    fontSize: SIZES.title,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultExplanation: {
    fontSize: SIZES.small,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginBottom: SIZES.marginLarge,
  },
  addButton: {
    padding: SIZES.padding,
    borderRadius: SIZES.radiusLarge,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  addButtonText: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
    color: 'white',
  },
}); 