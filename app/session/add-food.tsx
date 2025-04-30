/**
 * Schermata per l'aggiunta di cibo alle sessioni
 * 
 * Redesign completo per essere identica alla pagina di aggiunta bevande:
 * - Stesso stile di header e pulsanti 
 * - Stesse animazioni e transizioni
 * - Stesso layout generale
 * - Selezione orario in stile identico a quello delle bevande
 * - Visualizzazione chiara dell'effetto del cibo sul tasso alcolemico
 */

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
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
  Pressable
} from 'react-native';
import { router, useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SIZES, SHADOWS, ANIMATION } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  withDelay,
  withSpring,
  Easing,
  FadeIn,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { FoodRecord, FoodPreset } from '../types/session';
import AppHeader from '../components/AppHeader';
import { useToast } from '../components/Toast';
import TimeSelector from '../components/TimeSelector';
import * as sessionService from '../lib/services/session.service';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Presets di cibo
const foodPresets: FoodPreset[] = [
  {
    id: 'snack',
    name: 'Snack',
    icon: 'cookie',
    absorptionFactor: 0.3,
    iconColor: '#FFA000', // Colore arancione
  },
  {
    id: 'light_meal',
    name: 'Pasto leggero',
    icon: 'utensils',
    absorptionFactor: 0.5,
    iconColor: '#4CAF50', // Colore verde
  },
  {
    id: 'full_meal',
    name: 'Pasto completo',
    icon: 'hamburger',
    absorptionFactor: 0.7,
    iconColor: '#2196F3', // Colore blu
  },
  {
    id: 'heavy_meal',
    name: 'Pasto abbondante',
    icon: 'pizza-slice',
    absorptionFactor: 0.8,
    iconColor: '#9C27B0', // Colore viola
  }
];

// Quando si è mangiato rispetto al bere
const timingOptions = [
  { id: 'before', name: 'Prima di bere', description: 'Effetto ridotto sulla diminuzione del tasso alcolico', factor: 1.0 },
  { id: 'during', name: 'Durante il bere', description: 'Effetto moderato sulla diminuzione del tasso alcolico', factor: 0.8 },
  { id: 'after', name: 'Dopo aver bevuto', description: 'Effetto significativo sulla diminuzione del tasso alcolico', factor: 0.6 },
];

export default function AddFoodScreen() {
  const { t } = useTranslation(['session', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const navigation = useNavigation();
  const toast = useToast();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  // Stati per il form
  const [selectedFood, setSelectedFood] = useState<FoodPreset | null>(null);
  const [selectedTiming, setSelectedTiming] = useState(timingOptions[1]); // Default: durante il bere
  const [finalAbsorptionFactor, setFinalAbsorptionFactor] = useState(0);
  const [consumptionTime, setConsumptionTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Stato per gli step del wizard
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 2; // 0: tipo di alimento, 1: quando hai mangiato
  
  // Nasconde l'header standard per usare il nostro componente AppHeader
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
  
  // Ricalcola il fattore di assorbimento quando cambiano le selezioni
  useEffect(() => {
    if (selectedFood && selectedTiming) {
      const factor = selectedFood.absorptionFactor * selectedTiming.factor;
      setFinalAbsorptionFactor(factor);
    }
  }, [selectedFood, selectedTiming]);
  
  // Funzioni per la navigazione tra gli step
  const goToNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Handler per la selezione del cibo
  const handleSelectFood = (food: FoodPreset) => {
    setSelectedFood(food);
    goToNextStep(); // Passa automaticamente allo step successivo
  };
  
  // Handler per la selezione del timing
  const handleSelectTiming = (timing: typeof timingOptions[number]) => {
    setSelectedTiming(timing);
  };
  
  // Handler per la selezione dell'orario
  const handleTimeChange = (newTime: Date) => {
    setConsumptionTime(newTime);
  };
  
  // Renderizza solo lo step corrente
  const renderCurrentStep = () => {
    switch(currentStep) {
      case 0:
        // Step 0: Selezione del tipo di alimento
        return (
          <View style={styles.stepContent}>
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('Orario di consumo')}
              </Text>
              
              <TimeSelector
                value={consumptionTime}
                onChange={handleTimeChange}
                label={t('Orario di consumo')}
                nowLabel={t('now', { defaultValue: 'Adesso' })}
              />
            </View>
            
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('Tipo di alimento')}
              </Text>
              <View style={styles.foodGrid}>
                {foodPresets.map((food) => (
                  <TouchableOpacity
                    key={food.id}
                    style={[
                      styles.foodItem,
                      selectedFood?.id === food.id && [
                        styles.selectedFoodItem,
                        { borderColor: food.iconColor }
                      ],
                      { backgroundColor: colors.cardBackground }
                    ]}
                    onPress={() => handleSelectFood(food)}
                  >
                    <FontAwesome5
                      name={food.icon}
                      size={32}
                      color={food.iconColor}
                      style={styles.foodIcon}
                    />
                    <Text
                      style={[
                        styles.foodName,
                        { color: colors.text },
                        selectedFood?.id === food.id && { fontWeight: 'bold' }
                      ]}
                    >
                      {t(food.name)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );
      
      case 1:
      default:
        // Step 1: Selezione del timing
        return (
          <View style={styles.stepContent}>
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('Quando hai mangiato')}
              </Text>
              <View style={styles.timingContainer}>
                {timingOptions.map((timing) => (
                  <TouchableOpacity
                    key={timing.id}
                    style={[
                      styles.timingItem,
                      selectedTiming.id === timing.id && [
                        styles.selectedTimingItem,
                        { borderColor: colors.primary }
                      ],
                      { backgroundColor: colors.cardBackground }
                    ]}
                    onPress={() => handleSelectTiming(timing)}
                  >
                    <Text
                      style={[
                        styles.timingName,
                        { color: colors.text },
                        selectedTiming.id === timing.id && { fontWeight: 'bold' }
                      ]}
                    >
                      {timing.name}
                    </Text>
                    <Text style={[styles.timingDescription, { color: colors.textSecondary }]}>
                      {timing.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.absorptionInfoContainer}>
                <Text style={[styles.absorptionTitle, { color: colors.text }]}>
                  {t('effectOnBAC', { defaultValue: 'Effetto sul tasso alcolemico' })}
                </Text>
                <Text style={[styles.absorptionValue, { color: colors.primary }]}>
                  {Math.round(finalAbsorptionFactor * 100)}%
                </Text>
                <Text style={[styles.absorptionDescription, { color: colors.textSecondary }]}>
                  {t('absorptionDescription', { defaultValue: 'Riduzione del tasso di assorbimento dell\'alcol' })}
                </Text>
              </View>
            </View>
          </View>
        );
    }
  };
  
  const handleSaveFood = async () => {
    if (!selectedFood) {
      toast?.showToast({
        message: t('selectFoodMessage', { ns: 'common', defaultValue: 'Seleziona un alimento dalla lista' }),
        type: 'error'
      });
      return;
    }

    setLoading(true);
    
    try {
      const foodData: FoodRecord = {
        ...selectedFood,
        id: `food_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        time: consumptionTime.toISOString(),
        timeConsumed: consumptionTime,
        absorptionFactor: finalAbsorptionFactor
      };

      // Animazioni di conferma
      setShowConfetti(true);
      
      // Attendi un po' per far vedere l'animazione
      setTimeout(() => {
        // Converti l'oggetto in una stringa JSON per passarlo come parametro
        const foodParam = JSON.stringify(foodData);
        const timestamp = Date.now().toString(); // Timestamp univoco per il parametro
        
        // Passa alla pagina della sessione con il parametro del cibo
        router.push({
          pathname: '/session',
          params: { newFood: foodParam, timestamp }
        });
      }, 800);
    } catch (error) {
      console.error('Errore nel salvataggio del cibo:', error);
      toast?.showToast({
        message: t('errorSavingFood', { ns: 'common', defaultValue: 'Si è verificato un errore durante il salvataggio dell\'alimento' }),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <AppHeader
        title={t('addFood')}
        translationNamespace="session"
      />
      
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[
            styles.progressLine, 
            {
              width: `${(currentStep / (totalSteps - 1)) * 100}%`,
              backgroundColor: colors.primary 
            }
          ]} />
          {[...Array(totalSteps)].map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => index <= currentStep && setCurrentStep(index)}
              style={styles.progressDotContainer}
            >
              <View
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: index <= currentStep ? colors.primary : colors.border,
                    borderColor: colors.primary,
                    borderWidth: index <= currentStep ? 0 : 1,
                  }
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.progressText, {color: colors.textSecondary}]}>
          {currentStep === 0 && t('selectFoodType', { defaultValue: 'Seleziona il tipo di alimento' })}
          {currentStep === 1 && t('selectTiming', { defaultValue: 'Quando hai mangiato' })}
        </Text>
            </View>

      <View style={{ flex: 1 }}>
        <View style={styles.contentWrapper}>
          {renderCurrentStep()}
              </View>
            </View>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom || 16 }]}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              {t('saving', { ns: 'common', defaultValue: 'Salvataggio in corso...' })}
            </Text>
          </View>
        )}
        
        {currentStep > 0 ? (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                styles.backButton, 
                { 
                  borderColor: colors.border, 
                  backgroundColor: 'transparent' 
                }
              ]} 
              onPress={goToPreviousStep}
            >
              <Text style={[styles.backButtonText, {color: colors.primary}]}>
                {t('back', { defaultValue: 'Indietro' })}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                    style={[
                styles.dashboardButton, 
                {
                  backgroundColor: colors.primary
                }
                    ]}
              onPress={handleSaveFood}
              disabled={!selectedFood}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{marginRight: 8}} />
              <Text style={[styles.dashboardButtonText, { color: '#FFFFFF' }]}>
                {t('confirmFood', { defaultValue: 'Conferma Alimento' })}
                    </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Solo pulsante "Avanti" - posizionato a destra
          <View style={styles.singleButtonContainer}>
          <TouchableOpacity
            style={[
                styles.nextButton, 
                {
                  backgroundColor: colors.primary,
                  opacity: selectedFood ? 1 : 0.5
                }
            ]}
              onPress={goToNextStep}
              disabled={!selectedFood}
          >
              <Text style={styles.nextButtonText}>
                {t('next', { defaultValue: 'Avanti' })}
              </Text>
              <Ionicons 
                name="arrow-forward" 
                size={18} 
                color="white" 
                style={styles.nextButtonIcon} 
              />
          </TouchableOpacity>
        </View>
        )}
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: 16,
    paddingBottom: 120,
  },
  mainContent: {
    paddingHorizontal: 16,
  },
  cardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  foodItem: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
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
  selectedFoodItem: {
    borderWidth: 2,
  },
  foodIcon: {
    marginBottom: 8,
  },
  foodName: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  timingContainer: {
    marginBottom: 8,
  },
  timingItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
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
  selectedTimingItem: {
    borderWidth: 2,
  },
  timingName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timingDescription: {
    fontSize: 14,
  },
  progressContainer: {
    padding: SIZES.paddingSmall,
    marginBottom: 0,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SIZES.marginSmall,
    marginHorizontal: 20,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 2,
    zIndex: 1,
  },
  progressLine: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 0,
  },
  progressText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  progressDotContainer: {
    padding: 5, // Area di tocco più ampia
    zIndex: 2,
  },
  contentWrapper: {
    flex: 1, 
    padding: SIZES.padding,
  },
  stepContent: {
    flex: 1,
    padding: 0,
  },
  sectionContainer: {
    marginBottom: SIZES.marginSmall,
  },
  actionBar: {
    padding: SIZES.paddingSmall,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.paddingSmall,
  },
  singleButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.paddingSmall,
  },
  backButton: {
    width: 150,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  nextButton: {
    width: 150,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  nextButtonIcon: {
    marginLeft: 2,
    marginTop: 1,
  },
  dashboardButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    alignSelf: 'center',
    minWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  dashboardButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 15,
  },
  absorptionInfoContainer: {
    marginTop: SIZES.marginSmall,
    padding: SIZES.paddingSmall,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  absorptionTitle: {
    fontSize: SIZES.body,
    marginBottom: 4,
  },
  absorptionValue: {
    fontSize: SIZES.title,
    fontWeight: 'bold',
  },
  absorptionDescription: {
    fontSize: SIZES.small,
    marginTop: 4,
    color: COLORS.textSecondary,
  },
}); 