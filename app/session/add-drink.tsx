import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  Platform, 
  Switch,
  Pressable,
  StatusBar,
  Image,
  FlatList,
  Keyboard,
  KeyboardAvoidingView
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome5, MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { 
  COLORS, 
  SIZES, 
  FORM_STYLES, 
  SHADOWS,
  ANIMATION 
} from '../constants/theme';
import { calculateAlcoholGrams } from '../lib/bac/calculator';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  interpolate,
  Extrapolate,
  withSequence,
  withDelay,
  Easing,
  FadeIn
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { DrinkRecord } from '../lib/bac/visualization';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TimeSelector from '../components/TimeSelector';
import { useToast } from '../components/Toast';
import sessionService from '../lib/services/session.service';
import AppHeader from '../components/AppHeader';

// Mock beverage data - would come from database
const beverageTypes = [
  { id: '1', name: 'drinkTypes.beer', defaultPercentage: 5, category: 'Beer', icon: 'beer' },
  { id: '2', name: 'drinkTypes.wine', defaultPercentage: 12, category: 'Wine', icon: 'wine-glass' },
  { id: '3', name: 'drinkTypes.spirits', defaultPercentage: 40, category: 'Spirits', icon: 'glass-whiskey' },
  { id: '4', name: 'drinkTypes.cocktail', defaultPercentage: 15, category: 'Cocktail', icon: 'cocktail' },
  { id: '5', name: 'drinkTypes.other', defaultPercentage: 5, category: 'Other', icon: 'glass-martini-alt' },
];

// Standard drink sizes in ml
const standardSizes = {
  Beer: [330, 500, 1000], // small, medium, large
  Wine: [150, 250, 750], // glass, large glass, bottle
  Spirits: [30, 60, 100], // shot, double, large
  Cocktail: [200, 300, 400], // small, medium, large
  Other: [250, 330, 500], // default sizes
};

// Presets di bevande comuni
const drinkPresets = [
  {
    id: 'beer',
    name: 'drinkTypes.beer',
    icon: 'beer',
    alcoholGrams: 13,
    volume: 330,
    percentage: 5.0,
    iconColor: '#FFC107',
  },
  {
    id: 'wine',
    name: 'drinkTypes.wine',
    icon: 'wine-glass-alt',
    alcoholGrams: 14,
    volume: 150,
    percentage: 12.0,
    iconColor: '#E91E63',
  },
  {
    id: 'spirits',
    name: 'drinkTypes.spirits',
    icon: 'glass-whiskey',
    alcoholGrams: 10,
    volume: 30,
    percentage: 40.0,
    iconColor: '#9C27B0',
  },
  {
    id: 'cocktail',
    name: 'drinkTypes.cocktail',
    icon: 'cocktail',
    alcoholGrams: 20,
    volume: 200,
    percentage: 12.5,
    iconColor: '#00BCD4',
  }
];

// Taglie delle bevande
const drinkSizes = [
  { id: 'small', name: 'drinkSizes.small', multiplier: 0.8 },
  { id: 'medium', name: 'drinkSizes.medium', multiplier: 1.0 },
  { id: 'large', name: 'drinkSizes.large', multiplier: 1.5 },
];

// Definizione di parametri specifici per ogni combinazione di bevanda e taglia
const drinkSizeParams = {
  beer: {
    small: { volume: 250, percentage: 4.5 },
    medium: { volume: 330, percentage: 5.0 },
    large: { volume: 500, percentage: 5.5 }
  },
  wine: {
    small: { volume: 125, percentage: 11.5 },
    medium: { volume: 150, percentage: 12.0 },
    large: { volume: 250, percentage: 12.5 }
  },
  spirits: {
    small: { volume: 30, percentage: 38.0 },
    medium: { volume: 40, percentage: 40.0 },
    large: { volume: 60, percentage: 42.0 }
  },
  cocktail: {
    small: { volume: 150, percentage: 10.0 },
    medium: { volume: 200, percentage: 12.5 },
    large: { volume: 300, percentage: 15.0 }
  }
};

// Define validation schema using Yup
const AdvancedModeSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  volumeMl: Yup.number()
    .positive('Volume must be positive')
    .required('Volume is required'),
  alcoholPercentage: Yup.number()
    .min(0, 'Must be between 0 and 100')
    .max(100, 'Must be between 0 and 100')
    .required('Alcohol percentage is required'),
});

const SimpleModeSchema = Yup.object().shape({
  beverageType: Yup.string().required('Choose a beverage type'),
  size: Yup.string().required('Choose a size'),
});

export default function AddDrinkScreen() {
  const { t } = useTranslation(['session', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  
  // Stati per il form
  const [selectedDrink, setSelectedDrink] = useState(drinkPresets[0]);
  const [selectedSize, setSelectedSize] = useState(drinkSizes[1]);
  const [volume, setVolume] = useState(drinkPresets[0].volume.toString());
  const [alcoholPercentage, setAlcoholPercentage] = useState(drinkPresets[0].percentage.toString());
  const [alcoholGrams, setAlcoholGrams] = useState(drinkPresets[0].alcoholGrams.toString());
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [consumptionTime, setConsumptionTime] = useState(new Date());
  
  // Animazioni
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);
  const buttonScale = useSharedValue(0.95);
  
  // Always use advanced features
  const isAdvancedMode = true;
  
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
  
  // Ricalcola i grammi di alcol quando cambiano le selezioni
  useEffect(() => {
    if (!isAdvancedMode) {
      // In modalità semplice, usa i preset e i parametri specifici per taglia
      let effectiveVolume, effectivePercentage;
      
      // Se abbiamo parametri specifici per questa combinazione di bevanda e taglia
      if (drinkSizeParams[selectedDrink.id] && drinkSizeParams[selectedDrink.id][selectedSize.id]) {
        const params = drinkSizeParams[selectedDrink.id][selectedSize.id];
        effectiveVolume = params.volume;
        effectivePercentage = params.percentage;
      } else {
        // Altrimenti usa il calcolo con il moltiplicatore
        effectiveVolume = selectedDrink.volume * selectedSize.multiplier;
        effectivePercentage = selectedDrink.percentage;
      }
      
      // Calcola i grammi di alcol usando la formula: volume (ml) * percentuale / 100 * 0.789 (densità etanolo)
      const effectiveGrams = (effectiveVolume * effectivePercentage / 100) * 0.789;
      
      setVolume(effectiveVolume.toFixed(0));
      setAlcoholPercentage(effectivePercentage.toString());
      setAlcoholGrams(effectiveGrams.toFixed(1));
    } else {
      // In modalità avanzata, calcola in base a volume e percentuale
      const vol = parseFloat(volume) || 0;
      const perc = parseFloat(alcoholPercentage) || 0;
      const grams = (vol * perc * 0.789) / 100; // Densità dell'alcol = 0.789 g/ml
      
      setAlcoholGrams(grams.toFixed(1));
    }
  }, [selectedDrink, selectedSize, volume, alcoholPercentage, isAdvancedMode]);
  
  // Handler per la selezione della bevanda
  const handleSelectDrink = (drink) => {
    setSelectedDrink(drink);
    
    // Aggiorna i campi con i valori predefiniti della bevanda selezionata
    if (drink && drink.volume) {
      setVolume(drink.volume.toString());
    }
    
    if (drink && drink.percentage) {
      setAlcoholPercentage(drink.percentage.toString());
    }
    
    if (drink && drink.alcoholGrams) {
      setAlcoholGrams(drink.alcoholGrams.toString());
    }
    
    // Log di debug
    console.log(`🍺 Bevanda selezionata: ${drink.name}`);
    console.log(`🥃 Volume: ${drink.volume}ml, Percentuale: ${drink.percentage}%, Grammi: ${drink.alcoholGrams}g`);
  };
  
  // Handler per la selezione della taglia
  const handleSelectSize = (size) => {
    setSelectedSize(size);
    
    // Aggiorna il volume in base alla dimensione selezionata
    if (size && size.multiplier && selectedDrink) {
      const newVolume = Math.round(selectedDrink.volume * size.multiplier);
      setVolume(newVolume.toString());
      
      // Ricalcola i grammi di alcol in base al nuovo volume e alla percentuale
      const percentage = parseFloat(alcoholPercentage);
      if (!isNaN(percentage)) {
        // Formula: volume (ml) * percentuale / 100 * 0.789 (densità alcol)
        const newGrams = Math.round((newVolume * percentage / 100 * 0.789) * 10) / 10;
        setAlcoholGrams(newGrams.toString());
      }
      
      // Log di debug
      console.log(`🥛 Dimensione selezionata: ${size.name} (${size.multiplier}x)`);
      console.log(`🥃 Nuovo volume: ${newVolume}ml, Nuovi grammi: ${alcoholGrams}g`);
    }
  };

  // Handler per il salvataggio della bevanda
  const handleSaveDrink = () => {
    console.log("🍺 Saving drink...");
    
    try {
      let drinkData;
      const timestamp = new Date().getTime(); // Timestamp unico per identificare questo drink
      const consumptionTimeObj = consumptionTime || new Date(); // Se non specificato, usa ora corrente
      
      // Mode semplice: selezione di un drink predefinito
      if (!selectedDrink || !selectedSize) {
        Alert.alert("Errore", "Seleziona una bevanda e una dimensione");
        return;
      }
      
      // Ottieni i parametri corretti dalla selezione
      let effectiveVolume, effectivePercentage;
      
      // Se abbiamo parametri specifici per questa combinazione di bevanda e taglia
      if (drinkSizeParams[selectedDrink.id] && drinkSizeParams[selectedDrink.id][selectedSize.id]) {
        const params = drinkSizeParams[selectedDrink.id][selectedSize.id];
        effectiveVolume = params.volume;
        effectivePercentage = params.percentage;
      } else {
        // Altrimenti usa il calcolo con il moltiplicatore
        effectiveVolume = selectedDrink.volume * selectedSize.multiplier;
        effectivePercentage = selectedDrink.percentage;
      }
      
      // Calcola i grammi di alcol usando la formula: volume (ml) * percentuale / 100 * 0.789 (densità etanolo)
      const alcoholGrams = (effectiveVolume * effectivePercentage / 100) * 0.789;
      
      console.log(`📊 Calcolo alcol - Volume: ${effectiveVolume}ml, Percentuale: ${effectivePercentage}%, Grammi: ${alcoholGrams.toFixed(2)}g`);
      
      // Creazione dell'oggetto per il drink selezionato
      drinkData = {
        id: `drink_${timestamp}`,
        type: selectedDrink.id,
        name: t(selectedDrink.name),
        size: selectedSize.id,
        volume: effectiveVolume,
        percentage: effectivePercentage,
        alcoholGrams: alcoholGrams,
        timeConsumed: consumptionTimeObj,
        icon: selectedDrink.icon,
      };
      
      // Adatta l'oggetto al formato richiesto dal servizio
      const sessionDrinkData = {
        id: drinkData.id,
        name: drinkData.name,
        alcoholGrams: parseFloat(drinkData.alcoholGrams.toFixed(2)), // Arrotonda e converti in numero
        timeConsumed: drinkData.timeConsumed,
        volume: `${drinkData.volume} ml`,
        time: drinkData.timeConsumed.toISOString() // Salva la data in formato ISO completo invece di solo l'ora
      };
      
      console.log("🍹 Dati bevanda pronti per il salvataggio:", JSON.stringify(sessionDrinkData, null, 2));
      
      // Aggiungi il drink alla sessione attiva
      const updatedSession = sessionService.addDrink(sessionDrinkData);
      
      if (!updatedSession) {
        toast.showToast({
          message: t('noActiveSession'),
          type: 'error'
        });
        return;
      }
      
      // Mostra messaggio di conferma
      toast.showToast({
        message: t('drinkAdded'),
        type: 'success'
      });
      
      console.log(`✅ Bevanda aggiunta. Nuovo BAC: ${updatedSession.currentBAC.toFixed(3)} g/L`);
      
      // Passa i dati del drink alla schermata principale come parametro
      const drinkParam = JSON.stringify(sessionDrinkData);
      console.log(`📬 Parametro drink codificato: ${drinkParam.substring(0, 50)}...`);
      
      // Torna alla schermata principale con i parametri del drink
      router.push({
        pathname: '/session',
        params: {
          newDrink: drinkParam,
          timestamp: timestamp.toString()
        }
      });
    } catch (error) {
      console.error("❌ Errore nel salvataggio della bevanda:", error);
      toast.showToast({
        message: t('errorAddingDrink'),
        type: 'error'
      });
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />
      
      <AppHeader
        title="addDrink"
        translationNamespace="session"
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('consumptionTime')}
            </Text>
            <TimeSelector
              value={consumptionTime}
              onChange={setConsumptionTime}
              label={t('whenDidYouDrink')}
            />
          </View>
          
          <View style={styles.drinkPresets}>
            {drinkPresets.map((drink) => (
              <TouchableOpacity
                key={drink.id}
                style={[
                  styles.drinkPreset,
                  selectedDrink.id === drink.id && {
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}20`,
                  },
                  { backgroundColor: colors.cardBackground }
                ]}
                onPress={() => handleSelectDrink(drink)}
              >
                <FontAwesome5 
                  name={drink.icon} 
                  size={28} 
                  color={selectedDrink.id === drink.id ? colors.primary : drink.iconColor} 
                />
                <Text style={[styles.drinkPresetName, { color: colors.text }]}>
                  {t(drink.name)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('selectDrinkSize')}
          </Text>
          
          <View style={styles.drinkSizes}>
            {drinkSizes.map((size) => (
              <TouchableOpacity
                key={size.id}
                style={[
                  styles.sizeButton,
                  selectedSize.id === size.id && {
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}20`,
                  },
                  { backgroundColor: colors.cardBackground }
                ]}
                onPress={() => handleSelectSize(size)}
              >
                <Text style={[styles.sizeButtonText, { color: colors.text }]}>
                  {t(size.name)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('formLabels.volume')}
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={volume}
                onChangeText={setVolume}
                keyboardType="numeric"
                placeholder="330"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}>ml</Text>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('formLabels.alcoholPercentage')}
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={alcoholPercentage}
                onChangeText={setAlcoholPercentage}
                keyboardType="numeric"
                placeholder="5.0"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}>%</Text>
            </View>
          </View>
          
          <View style={styles.resultContainer}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
              {t('formLabels.alcoholGrams')}
            </Text>
            <Text style={[styles.resultValue, { color: colors.primary }]}>
              {alcoholGrams}g
            </Text>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
      
      <View style={[styles.actionBar, { paddingBottom: insets.bottom || 20 }]}>
        <TouchableOpacity 
          style={[
            styles.addButton, 
            { backgroundColor: colors.primary }
          ]}
          onPress={handleSaveDrink}
        >
          <Text style={[styles.addButtonText, { color: '#FFFFFF' }]}>
            {t('addDrink')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    padding: SIZES.padding,
  },
  sectionContainer: {
    marginBottom: SIZES.margin,
  },
  sectionTitle: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
    marginBottom: SIZES.marginSmall,
  },
  drinkPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SIZES.margin,
  },
  drinkPreset: {
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
  drinkPresetName: {
    marginTop: 8,
    fontSize: SIZES.body,
  },
  drinkSizes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.margin,
  },
  sizeButton: {
    flex: 1,
    margin: 4,
    padding: SIZES.paddingSmall,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
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
  sizeButtonText: {
    fontSize: SIZES.body,
  },
  formGroup: {
    marginBottom: SIZES.marginSmall,
  },
  label: {
    fontSize: SIZES.body,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.paddingSmall,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: SIZES.body,
    height: 50,
  },
  inputSuffix: {
    fontSize: SIZES.body,
    paddingLeft: SIZES.paddingSmall,
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
  },
  actionBar: {
    padding: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addButton: {
    padding: SIZES.padding,
    borderRadius: SIZES.radiusLarge,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
}); 