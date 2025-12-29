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
  KeyboardAvoidingView,
  ActivityIndicator,
  Dimensions
} from 'react-native';

// 🔥 RILEVAMENTO IPAD: Rileva iPad per ridurre dimensioni button
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIPad = Platform.OS === 'ios' && Math.min(screenWidth, screenHeight) >= 700;
import { router, useNavigation, useLocalSearchParams, useFocusEffect } from 'expo-router';
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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TimeSelector from '../components/TimeSelector';
import { useToast } from '../components/Toast';
import sessionService from '../lib/services/session.service';
import AppHeader from '../components/AppHeader';
import { Drink } from '../types/session';
import favoritesService, { FavoriteDrink, RecentDrink } from '../lib/services/favorites.service';

// Mock beverage data - would come from database
const beverageTypes = [
  { id: '1', name: 'drinkTypes.beer', defaultPercentage: 5, category: 'Beer', icon: 'beer' },
  { id: '2', name: 'drinkTypes.wine', defaultPercentage: 12, category: 'Wine', icon: 'wine-glass' },
  { id: '3', name: 'drinkTypes.spirits', defaultPercentage: 40, category: 'Spirits', icon: 'glass-whiskey' },
  { id: '4', name: 'drinkTypes.cocktail', defaultPercentage: 15, category: 'Cocktail', icon: 'cocktail' },
  { id: '5', name: 'drinkTypes.other', defaultPercentage: 5, category: 'Other', icon: 'glass-martini-alt' },
];

// Standard drink sizes in ml - migliorati per maggiore precisione
const standardSizes = {
  Beer: [200, 330, 500, 1000], // piccola, media, grande, litro
  Wine: [125, 150, 175, 750], // calice piccolo, medio, grande, bottiglia
  Spirits: [30, 45, 60, 100], // shot, shot grande, doppio, triplo
  Cocktail: [150, 250, 350, 500], // piccolo, medio, grande, jumbo
  Other: [200, 330, 500], // default sizes
};

// Presets di bevande comuni - versione completa con traduzioni
const drinkPresets = [
  // BIRRE
  {
    id: 'beer-lager',
    name: 'drinkTypes.beerLager',
    icon: 'beer',
    alcoholGrams: 13,
    volume: 330,
    percentage: 5.0,
    iconColor: '#FFC107',
    category: 'beer',
    description: 'drinkDescriptions.beerLager'
  },
  {
    id: 'beer-ale',
    name: 'drinkTypes.beerAle',
    icon: 'beer',
    alcoholGrams: 16,
    volume: 330,
    percentage: 6.0,
    iconColor: '#FF9800',
    category: 'beer',
    description: 'drinkDescriptions.beerAle'
  },
  {
    id: 'beer-stout',
    name: 'drinkTypes.beerStout',
    icon: 'beer',
    alcoholGrams: 15,
    volume: 330,
    percentage: 5.5,
    iconColor: '#5D4037',
    category: 'beer',
    description: 'drinkDescriptions.beerStout'
  },
  {
    id: 'beer-weiss',
    name: 'drinkTypes.beerWeiss',
    icon: 'beer',
    alcoholGrams: 14,
    volume: 500,
    percentage: 5.0,
    iconColor: '#FFECB3',
    category: 'beer',
    description: 'drinkDescriptions.beerWeiss'
  },
  {
    id: 'beer-strong',
    name: 'drinkTypes.beerStrong',
    icon: 'beer',
    alcoholGrams: 24,
    volume: 330,
    percentage: 8.5,
    iconColor: '#BF360C',
    category: 'beer',
    description: 'drinkDescriptions.beerStrong'
  },
  
  // VINI
  {
    id: 'wine-white',
    name: 'drinkTypes.wineWhite',
    icon: 'wine-glass',
    alcoholGrams: 14,
    volume: 150,
    percentage: 12.0,
    iconColor: '#F9E076',
    category: 'wine',
    description: 'drinkDescriptions.wineWhite'
  },
  {
    id: 'wine-red',
    name: 'drinkTypes.wineRed',
    icon: 'wine-glass',
    alcoholGrams: 15,
    volume: 150,
    percentage: 13.0,
    iconColor: '#7B0000',
    category: 'wine',
    description: 'drinkDescriptions.wineRed'
  },
  {
    id: 'wine-rose',
    name: 'drinkTypes.wineRose',
    icon: 'wine-glass',
    alcoholGrams: 13,
    volume: 150,
    percentage: 11.0,
    iconColor: '#F48FB1',
    category: 'wine',
    description: 'drinkDescriptions.wineRose'
  },
  {
    id: 'wine-sparkling',
    name: 'drinkTypes.wineSparkling',
    icon: 'glass-cheers',
    alcoholGrams: 14,
    volume: 150,
    percentage: 11.5,
    iconColor: '#F9E076',
    category: 'wine',
    description: 'drinkDescriptions.wineSparkling'
  },
  {
    id: 'wine-dessert',
    name: 'drinkTypes.wineDessert',
    icon: 'wine-glass',
    alcoholGrams: 18,
    volume: 100,
    percentage: 14.0,
    iconColor: '#8D6E63',
    category: 'wine',
    description: 'drinkDescriptions.wineDessert'
  },
  
  // COCKTAIL
  {
    id: 'cocktail-aperitivo',
    name: 'drinkTypes.cocktailAperitivo',
    icon: 'cocktail',
    alcoholGrams: 15,
    volume: 200,
    percentage: 9.5,
    iconColor: '#FF5722',
    category: 'cocktail',
    description: 'drinkDescriptions.cocktailAperitivo',
    examples: 'Spritz, Campari Soda, Americano'
  },
  {
    id: 'cocktail-classic',
    name: 'drinkTypes.cocktailClassic',
    icon: 'cocktail',
    alcoholGrams: 24,
    volume: 100,
    percentage: 30.0,
    iconColor: '#D50000',
    category: 'cocktail',
    description: 'drinkDescriptions.cocktailClassic',
    examples: 'Negroni, Manhattan, Old Fashioned'
  },
  {
    id: 'cocktail-sour',
    name: 'drinkTypes.cocktailSour',
    icon: 'cocktail',
    alcoholGrams: 18,
    volume: 150,
    percentage: 15.0,
    iconColor: '#FFEB3B',
    category: 'cocktail',
    description: 'drinkDescriptions.cocktailSour',
    examples: 'Whiskey Sour, Daiquiri, Margarita'
  },
  {
    id: 'cocktail-tropical',
    name: 'drinkTypes.cocktailTropical',
    icon: 'cocktail',
    alcoholGrams: 20,
    volume: 300,
    percentage: 8.0,
    iconColor: '#8BC34A',
    category: 'cocktail',
    description: 'drinkDescriptions.cocktailTropical',
    examples: 'Mojito, Piña Colada, Mai Tai'
  },
  {
    id: 'cocktail-long',
    name: 'drinkTypes.cocktailLong',
    icon: 'cocktail',
    alcoholGrams: 20,
    volume: 300,
    percentage: 8.0,
    iconColor: '#00BCD4',
    category: 'cocktail',
    description: 'drinkDescriptions.cocktailLong',
    examples: 'Gin Tonic, Moscow Mule, Cuba Libre'
  },
  
  // SPIRITS
  {
    id: 'spirit-whiskey',
    name: 'drinkTypes.spiritWhiskey',
    icon: 'glass-whiskey',
    alcoholGrams: 14,
    volume: 45,
    percentage: 40.0,
    iconColor: '#795548',
    category: 'spirits',
    description: 'drinkDescriptions.spiritWhiskey'
  },
  {
    id: 'spirit-vodka',
    name: 'drinkTypes.spiritVodka',
    icon: 'glass-whiskey',
    alcoholGrams: 13,
    volume: 40,
    percentage: 40.0,
    iconColor: '#ECEFF1',
    category: 'spirits',
    description: 'drinkDescriptions.spiritVodka'
  },
  {
    id: 'spirit-rum',
    name: 'drinkTypes.spiritRum',
    icon: 'glass-whiskey',
    alcoholGrams: 14,
    volume: 45,
    percentage: 40.0,
    iconColor: '#A1887F',
    category: 'spirits',
    description: 'drinkDescriptions.spiritRum'
  },
  {
    id: 'spirit-gin',
    name: 'drinkTypes.spiritGin',
    icon: 'glass-whiskey',
    alcoholGrams: 13,
    volume: 40,
    percentage: 40.0,
    iconColor: '#B2EBF2',
    category: 'spirits',
    description: 'drinkDescriptions.spiritGin'
  },
  {
    id: 'spirit-tequila',
    name: 'drinkTypes.spiritTequila',
    icon: 'glass-whiskey',
    alcoholGrams: 13,
    volume: 40,
    percentage: 40.0,
    iconColor: '#FFCC80',
    category: 'spirits',
    description: 'drinkDescriptions.spiritTequila'
  },
  {
    id: 'spirit-liqueur',
    name: 'drinkTypes.spiritLiqueur',
    icon: 'glass-whiskey',
    alcoholGrams: 9,
    volume: 40,
    percentage: 28.0,
    iconColor: '#4E342E',
    category: 'spirits',
    description: 'drinkDescriptions.spiritLiqueur'
  }
];

// Categorizzazione migliorata per visualizzazione
const drinkCategories = [
  { id: 'beer', name: 'beer', translationKey: 'Beer', defaultValue: 'Birra', icon: 'beer', color: '#FFC107' },
  { id: 'wine', name: 'wine', translationKey: 'Wine', defaultValue: 'Vino', icon: 'wine-glass', color: '#E91E63' },
  { id: 'cocktail', name: 'cocktail', translationKey: 'Cocktail', defaultValue: 'Cocktail', icon: 'cocktail', color: '#00BCD4' },
  { id: 'spirits', name: 'spirits', translationKey: 'Spirits', defaultValue: 'Superalcolici', icon: 'glass-whiskey', color: '#9C27B0' }
];

// 🍺🍷🍸🥃 DIMENSIONI SPECIFICHE PER OGNI CATEGORIA
// Basate sulle specifiche fornite dall'utente

// 🍺 BIRRA - Tutte con stessa gradazione (5%)
const beerSizes = [
  { id: 'small', volume: 200, percentage: 5.0, label: 'drinkSizeLabels.beer.small' },      // Piccola
  { id: 'medium', volume: 400, percentage: 5.0, label: 'drinkSizeLabels.beer.medium' },    // Media
  { id: 'pint', volume: 568, percentage: 5.0, label: 'drinkSizeLabels.beer.pint' },        // Pinta
  { id: 'bottleSmall', volume: 330, percentage: 5.0, label: 'drinkSizeLabels.beer.bottleSmall' }, // Bottiglia piccola
  { id: 'bottleLarge', volume: 660, percentage: 5.0, label: 'drinkSizeLabels.beer.bottleLarge' }, // Bottiglia grande
  { id: 'can', volume: 330, percentage: 5.0, label: 'drinkSizeLabels.beer.can' }           // Lattina
];

// 🍷 VINO - Tutte con stessa gradazione (12%)
const wineSizes = [
  { id: 'glassSmall', volume: 100, percentage: 12.0, label: 'drinkSizeLabels.wine.glassSmall' },     // Calice piccolo
  { id: 'glassStandard', volume: 125, percentage: 12.0, label: 'drinkSizeLabels.wine.glassStandard' }, // Calice standard
  { id: 'glassLarge', volume: 150, percentage: 12.0, label: 'drinkSizeLabels.wine.glassLarge' },     // Calice abbondante
  { id: 'halfBottle', volume: 375, percentage: 12.0, label: 'drinkSizeLabels.wine.halfBottle' },     // Mezza bottiglia
  { id: 'fullBottle', volume: 750, percentage: 12.0, label: 'drinkSizeLabels.wine.fullBottle' }      // Bottiglia intera
];

// 🍸 COCKTAIL - Tutte con stessa gradazione (12%)
const cocktailSizes = [
  { id: 'short', volume: 150, percentage: 12.0, label: 'drinkSizeLabels.cocktail.short' },           // Cocktail piccolo (short drink)
  { id: 'long', volume: 250, percentage: 12.0, label: 'drinkSizeLabels.cocktail.long' },             // Cocktail standard (long drink)
  { id: 'large', volume: 300, percentage: 12.0, label: 'drinkSizeLabels.cocktail.large' },           // Cocktail grande
  { id: 'pitcherSmall', volume: 500, percentage: 12.0, label: 'drinkSizeLabels.cocktail.pitcherSmall' }, // Caraffa piccola
  { id: 'pitcherMedium', volume: 1000, percentage: 12.0, label: 'drinkSizeLabels.cocktail.pitcherMedium' }, // Caraffa media
  { id: 'pitcherLarge', volume: 1500, percentage: 12.0, label: 'drinkSizeLabels.cocktail.pitcherLarge' }  // Caraffa grande
];

// 🥃 SUPERALCOLICI
const spiritsSizes = [
  { id: 'shotStandard', volume: 30, percentage: 40.0, label: 'drinkSizeLabels.spirits.shotStandard' },   // Shot standard
  { id: 'shotGenerous', volume: 40, percentage: 40.0, label: 'drinkSizeLabels.spirits.shotGenerous' },   // Shot abbondante
  { id: 'doubleShot', volume: 60, percentage: 40.0, label: 'drinkSizeLabels.spirits.doubleShot' },       // Doppio shot
  { id: 'glassLow', volume: 80, percentage: 40.0, label: 'drinkSizeLabels.spirits.glassLow' },           // Bicchiere basso
  { id: 'glassFull', volume: 100, percentage: 40.0, label: 'drinkSizeLabels.spirits.glassFull' }         // Bicchiere pieno
];

// Mappatura completa per tutte le categorie
const drinkSizesByCategory = {
  beer: beerSizes,
  wine: wineSizes,
  cocktail: cocktailSizes,
  spirits: spiritsSizes
};

// Definiamo il validation schema
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
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [volume, setVolume] = useState("");
  const [alcoholPercentage, setAlcoholPercentage] = useState("");
  const [alcoholGrams, setAlcoholGrams] = useState("0");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [consumptionTime, setConsumptionTime] = useState(new Date());
  
  // Stato per gli step del wizard
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 3; // 0: categoria, 1: bevanda specifica, 2: dettagli (dimensione e personalizzazioni)
  
  // Animazioni
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);
  const buttonScale = useSharedValue(0.95);
  const slideAnimation = useSharedValue(0);
  
  // Always use advanced features
  const isAdvancedMode = true;
  
  // Aggiungi due nuovi stati per tenere traccia delle modifiche manuali
  const [volumeManuallyEdited, setVolumeManuallyEdited] = useState(false);
  const [percentageManuallyEdited, setPercentageManuallyEdited] = useState(false);
  
  // Stati per loading e error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bacUpdated, setBacUpdated] = useState(false);
  
  // Stati per categoria e bevande filtrate
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filteredDrinks, setFilteredDrinks] = useState(
    []
  );
  
  // 🌟 Stati per bevande preferite e recenti
  const [favoriteDrinks, setFavoriteDrinks] = useState<FavoriteDrink[]>([]);
  const [recentDrinks, setRecentDrinks] = useState<RecentDrink[]>([]);
  const [showingFavorites, setShowingFavorites] = useState(true); // Toggle tra favoriti e recenti
  
  // Nasconde l'header standard per usare il nostro componente AppHeader e abilita swipe back
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      // 🔥 FIX: Abilita swipe back per questa schermata
      gestureEnabled: true,
      gestureDirection: 'horizontal',
    });
  }, [navigation]);
  
  // 🌟 Carica bevande preferite e recenti all'avvio
  useEffect(() => {
    loadFavoritesAndRecent();
  }, []);
  
  const loadFavoritesAndRecent = async () => {
    try {
      const [favorites, recent] = await Promise.all([
        favoritesService.getFavorites(),
        favoritesService.getRecent()
      ]);
      setFavoriteDrinks(favorites);
      setRecentDrinks(recent);
      console.log(`📋 Caricate ${favorites.length} preferite e ${recent.length} recenti`);
    } catch (error) {
      console.error('❌ Errore caricamento preferiti/recenti:', error);
    }
  };
  
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
  
  // Animazione slide per cambiamento di step
  useEffect(() => {
    slideAnimation.value = withTiming(currentStep, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });
  }, [currentStep]);
  
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
        
        // Aggiorna solo se non sono stati modificati manualmente
        if (!volumeManuallyEdited) {
          setVolume(effectiveVolume.toFixed(0));
        }
        if (!percentageManuallyEdited) {
          setAlcoholPercentage(effectivePercentage.toString());
        }
      } else {
        // Altrimenti usa il calcolo con il moltiplicatore
        effectiveVolume = selectedDrink.volume * selectedSize.multiplier;
        effectivePercentage = selectedDrink.percentage;
        
        // Aggiorna solo se non sono stati modificati manualmente
        if (!volumeManuallyEdited) {
          setVolume(effectiveVolume.toFixed(0));
        }
        if (!percentageManuallyEdited) {
          setAlcoholPercentage(effectivePercentage.toString());
        }
      }
      
      // Usa i valori correnti per il calcolo, che potrebbero essere modificati manualmente
      const currentVolume = parseFloat(volume) || 0;
      const currentPercentage = parseFloat(alcoholPercentage) || 0;
      
      // Calcola i grammi di alcol usando i valori correnti
      const effectiveGrams = (currentVolume * currentPercentage / 100) * 0.789;
      setAlcoholGrams(effectiveGrams.toFixed(1));
    } else {
      // In modalità avanzata, calcola in base a volume e percentuale
      const vol = parseFloat(volume) || 0;
      const perc = parseFloat(alcoholPercentage) || 0;
      const grams = (vol * perc * 0.789) / 100; // Densità dell'alcol = 0.789 g/ml
      
      setAlcoholGrams(grams.toFixed(1));
    }
  }, [selectedDrink, selectedSize, volume, alcoholPercentage, isAdvancedMode, volumeManuallyEdited, percentageManuallyEdited]);
  
  // Aggiorna le bevande filtrate quando cambia la categoria
  useEffect(() => {
    // Filtra i drink in base alla categoria selezionata
    const drinks = drinkPresets.filter(drink => drink.category === selectedCategory);
    setFilteredDrinks(drinks);
    
    // Non selezionare automaticamente nessun drink
  }, [selectedCategory]);

  // Handler per la selezione della categoria
  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    // NON preselezionare alcuna dimensione - l'utente deve scegliere
    setSelectedSize(null);
    // Passa automaticamente allo step successivo
    goToNextStep();
  };
  
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
  };
  
  // Handler per la selezione della taglia
  const handleSelectSize = (size) => {
    setSelectedSize(size);
    
    // Aggiorna il volume e la percentuale in base alla dimensione selezionata
    if (size && size.volume) {
      setVolume(size.volume.toString());
      setVolumeManuallyEdited(false); // Reset manuale edit quando si seleziona una dimensione
      
      // Aggiorna anche la percentuale se disponibile
      if (size.percentage) {
        setAlcoholPercentage(size.percentage.toString());
        setPercentageManuallyEdited(false);
        
        // Ricalcola i grammi di alcol
        const newGrams = Math.round((size.volume * size.percentage / 100 * 0.789) * 10) / 10;
        setAlcoholGrams(newGrams.toString());
      }
    }
  };

  // Handler per il salvataggio della bevanda
  const handleSaveDrink = async () => {
    // Validazioni
    if (!selectedDrink) {
      setError('Seleziona una bevanda');
      toast.showToast({ message: t('selectDrinkMessage', { ns: 'common', defaultValue: 'Seleziona una bevanda dalla lista' }), type: 'error' });
      return;
    }
    
    if (!selectedSize) {
      setError('Seleziona una dimensione');
      toast.showToast({ message: t('selectSizeMessage', { ns: 'common', defaultValue: 'Seleziona una dimensione dalla lista' }), type: 'error' });
      return;
    }

    const volumeNum = parseFloat(volume);
    if (isNaN(volumeNum) || volumeNum <= 0) {
      setError('Inserisci un volume valido');
      toast.showToast({ message: t('invalidVolumeMessage', { ns: 'common', defaultValue: 'Il volume deve essere un numero positivo' }), type: 'error' });
      return;
    }

    const alcoholPercentageNum = parseFloat(alcoholPercentage);
    if (isNaN(alcoholPercentageNum) || alcoholPercentageNum <= 0 || alcoholPercentageNum > 100) {
      setError('Inserisci una percentuale di alcol valida');
      toast.showToast({ message: t('invalidAlcoholPercentageMessage', { ns: 'common', defaultValue: 'La percentuale alcolica deve essere compresa tra 0 e 100' }), type: 'error' });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Genera un ID univoco per la bevanda
      const drinkId = Date.now().toString();
      
      // Crea l'oggetto bevanda nel formato corretto
      const drink = {
        id: drinkId,
        name: selectedDrink.name,
        size: selectedSize.name,
        volume: volumeNum.toString(),
        alcoholPercentage: alcoholPercentageNum.toString(),
        time: consumptionTime.toISOString(),
        timeConsumed: consumptionTime,
        timestamp: new Date().toISOString(),
        alcoholGrams: calculateAlcoholGrams(volumeNum, alcoholPercentageNum)
      };
      
      console.log(`Tentativo di aggiungere bevanda: ${JSON.stringify(drink, null, 2)}`);
      
      // Salva la bevanda nella sessione
      await sessionService.addDrink(drink);
      
      // 🌟 Salva nelle bevande recenti
      await favoritesService.addToRecent({
        name: drink.name || selectedDrink?.name || 'Bevanda',
        category: selectedCategory,
        volume: parseFloat(volume),
        percentage: parseFloat(alcoholPercentage),
        icon: selectedDrink?.icon,
        iconColor: selectedDrink?.iconColor
      });
      
      // Ricarica lista recenti
      await loadFavoritesAndRecent();
      
      console.log(`Bevanda aggiunta con successo, ID: ${drinkId}`);
      // Mostra feedback di successo
      setBacUpdated(true);
      toast.showToast({ message: t('drinkAdded', { ns: 'session', defaultValue: 'Bevanda aggiunta' }), type: 'success' });
      
      // Reset form
      setSelectedDrink(null);
      setSelectedSize(null);
      setVolume("");
      setAlcoholPercentage("");
      setConsumptionTime(new Date());
      
      // 🔧 FIX CRITICO: Passa parametro per forzare refresh della schermata sessione
      // Questo forza l'aggiornamento dell'indicatore BAC
      const timestamp = Date.now().toString();
      
      // Naviga alla schermata sessione con parametro di refresh
      router.push({
        pathname: '/(tabs)/session',
        params: { forceRefresh: timestamp }
      });
    } catch (error) {
      console.error('Eccezione durante l\'aggiunta della bevanda:', error);
      setError('Si è verificato un errore durante l\'aggiunta della bevanda');
      toast.showToast({ message: t('errorSavingDrink', { ns: 'common', defaultValue: 'Si è verificato un errore durante il salvataggio della bevanda' }), type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
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
  
  // Funzione per aggiungere la bevanda corrente e selezionare la successiva
  const handleAddDrinkAndContinue = () => {
    handleSaveDrink(); // Salva la bevanda corrente
  };
  
  // 🌟 Aggiunta rapida da preferiti/recenti
  const handleQuickAddDrink = async (drink: FavoriteDrink | RecentDrink) => {
    console.log('⚡ Quick add drink:', drink.name);
    
    try {
      setLoading(true);
      
      // Imposta direttamente i valori
      setVolume(drink.volume.toString());
      setAlcoholPercentage(drink.percentage.toString());
      
      // Calcola i grammi di alcol
      const grams = calculateAlcoholGrams(drink.volume, drink.percentage);
      setAlcoholGrams(grams.toFixed(1));
      
      // Trova la categoria e imposta
      const category = drinkCategories.find(c => c.id === drink.category);
      if (category) {
        setSelectedCategory(category.id);
      }
      
      // Cerca di trovare la bevanda nei preset
      const matchingDrink = drinkPresets.find(p => 
        p.name === drink.name || 
        (p.volume === drink.volume && p.percentage === drink.percentage)
      );
      
      if (matchingDrink) {
        setSelectedDrink(matchingDrink);
      }
      
      // Crea l'oggetto drink
      const drinkId = `drink_${Date.now()}`;
      const drinkToAdd: Drink = {
        id: drinkId,
        name: t(drink.name, { defaultValue: drink.name }),
        volumeMl: drink.volume,
        alcoholPercentage: drink.percentage,
        alcoholGrams: grams,
        time: consumptionTime.toISOString(),
        quantity: 1
      };
      
      // Salva la bevanda
      await sessionService.addDrink(drinkToAdd);
      
      // Salva nelle bevande recenti
      await favoritesService.addToRecent({
        name: drink.name,
        category: drink.category,
        volume: drink.volume,
        percentage: drink.percentage,
        icon: drink.icon,
        iconColor: drink.iconColor
      });
      
      // Ricarica lista recenti
      await loadFavoritesAndRecent();
      
      console.log(`⚡ Quick add completato: ${drinkId}`);
      
      // Mostra feedback
      toast.showToast({ 
        message: t('favorites.quickAdd', { ns: 'session', defaultValue: 'Aggiunta rapida!' }), 
        type: 'success' 
      });
      
      // Torna alla schermata sessione
      const timestamp = Date.now().toString();
      router.push({
        pathname: '/(tabs)/session',
        params: { forceRefresh: timestamp }
      });
    } catch (error) {
      console.error('❌ Errore quick add:', error);
      toast.showToast({ 
        message: t('errorSavingDrink', { ns: 'common', defaultValue: 'Errore aggiunta bevanda' }), 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 🧹 Pulisci cronologia bevande recenti
  const handleClearRecent = async () => {
    Alert.alert(
      t('favorites.clearRecentTitle', { ns: 'session', defaultValue: 'Pulisci Cronologia' }),
      t('favorites.clearRecentMessage', { ns: 'session', defaultValue: 'Vuoi eliminare tutte le bevande recenti?' }),
      [
        {
          text: t('cancel', { ns: 'common', defaultValue: 'Annulla' }),
          style: 'cancel'
        },
        {
          text: t('delete', { ns: 'common', defaultValue: 'Elimina' }),
          style: 'destructive',
          onPress: async () => {
            try {
              // 🚀 Aggiornamento UI ottimistico (immediato)
              setRecentDrinks([]);
              
              // Toast immediato
              toast.showToast({
                message: t('favorites.recentCleared', { ns: 'session', defaultValue: 'Cronologia pulita' }),
                type: 'success'
              });
              
              // Pulizia database in background (non bloccante)
              favoritesService.clearRecentDrinks().catch(error => {
                console.error('❌ Errore pulizia recenti:', error);
                // Ricarica in caso di errore
                loadFavoritesAndRecent();
              });
            } catch (error) {
              console.error('❌ Errore pulizia recenti:', error);
              toast.showToast({
                message: t('error', { ns: 'common', defaultValue: 'Errore' }),
                type: 'error'
              });
              // Ricarica dati corretti
              await loadFavoritesAndRecent();
            }
          }
        }
      ]
    );
  };
  
  // 🌟 Toggle bevanda preferita
  const [isFavoriteDrink, setIsFavoriteDrink] = useState(false);
  
  const toggleFavorite = async () => {
    if (!selectedDrink || !volume || !alcoholPercentage) return;
    
    const drinkData = {
      name: selectedDrink.name,
      category: selectedCategory,
      volume: parseFloat(volume),
      percentage: parseFloat(alcoholPercentage),
      icon: selectedDrink.icon,
      iconColor: selectedDrink.iconColor
    };
    
    if (isFavoriteDrink) {
      // Rimuovi dai preferiti
      const favorites = await favoritesService.getFavorites();
      const existing = favorites.find(f => 
        f.name === drinkData.name && 
        f.volume === drinkData.volume && 
        f.percentage === drinkData.percentage
      );
      
      if (existing) {
        await favoritesService.removeFromFavorites(existing.id);
        setIsFavoriteDrink(false);
        toast.showToast({ 
          message: t('favorites.removedFromFavorites', { ns: 'session', defaultValue: 'Rimosso dai preferiti' }), 
          type: 'info' 
        });
      }
    } else {
      // Aggiungi ai preferiti
      const success = await favoritesService.addToFavorites(drinkData);
      if (success) {
        setIsFavoriteDrink(true);
        toast.showToast({ 
          message: t('favorites.addedToFavorites', { ns: 'session', defaultValue: 'Aggiunto ai preferiti!' }), 
          type: 'success' 
        });
      }
    }
    
    // Ricarica lista
    await loadFavoritesAndRecent();
  };
  
  // Controlla se la bevanda corrente è nei preferiti
  useEffect(() => {
    const checkIfFavorite = async () => {
      if (!selectedDrink || !selectedSize || !volume || !alcoholPercentage) {
        setIsFavoriteDrink(false);
        return;
      }
      
      console.log('🔍 Controllo preferiti:', {
        name: selectedDrink.name,
        volume: parseFloat(volume),
        percentage: parseFloat(alcoholPercentage)
      });
      
      const isFav = await favoritesService.isFavorite(
        selectedDrink.name,
        parseFloat(volume),
        parseFloat(alcoholPercentage)
      );
      
      console.log('✅ Risultato controllo preferiti:', isFav);
      setIsFavoriteDrink(isFav);
    };
    
    checkIfFavorite();
  }, [selectedDrink, selectedSize, volume, alcoholPercentage]);
  
  // 🔄 Ricarica preferiti e recenti quando l'utente torna alla schermata
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Schermata add-drink in focus, ricarico preferiti e recenti');
      loadFavoritesAndRecent();
    }, [])
  );
  
  // Renderizza solo lo step corrente invece di tutti gli step con animazione
  const renderCurrentStep = () => {
    switch(currentStep) {
      case 0:
        // Step 0: Selezione categoria
        return (
          <View style={styles.stepContent}>
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('consumptionTime', { defaultValue: 'Orario di Consumo' })}
            </Text>
            <TimeSelector
              value={consumptionTime}
              onChange={setConsumptionTime}
              label={t('whenDidYouDrink', { defaultValue: 'Quando hai bevuto?' })}
                nowLabel={t('now', { defaultValue: 'Adesso' })}
            />
          </View>
            
            {/* 🌟 BEVANDE PREFERITE */}
            {favoriteDrinks.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.shortcutsHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                    {t('favorites.title', { ns: 'session', defaultValue: 'Preferiti' })} ({favoriteDrinks.length})
                  </Text>
                  <TouchableOpacity 
                    style={styles.manageButton}
                    onPress={() => Alert.alert(
                      t('favorites.manage', { ns: 'session', defaultValue: 'Gestisci Preferiti' }),
                      t('favorites.manageInfo', { ns: 'session', defaultValue: 'Puoi rimuovere i preferiti dall\'elenco qui sotto tenendo premuto su una bevanda.' }),
                      [{ text: 'OK', style: 'default' }]
                    )}
                  >
                    <MaterialCommunityIcons name="cog" size={18} color={colors.primary} />
                    <Text style={[styles.manageButtonText, { color: colors.primary }]}>
                      {t('favorites.manage', { ns: 'session', defaultValue: 'Gestisci' })}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.shortcutsScroll}
                  style={styles.shortcutsScrollView}
                >
                  {favoriteDrinks.map((drink) => {
                    // 🎨 Determina icona e colore in base alla categoria
                    const getCategoryIcon = () => {
                      switch(drink.category) {
                        case 'beer': return { icon: 'beer', color: '#FFC107' };
                        case 'wine': return { icon: 'wine-glass', color: '#E91E63' };
                        case 'spirits': return { icon: 'glass-whiskey', color: '#FF5722' };
                        case 'cocktail': return { icon: 'cocktail', color: '#00BCD4' };
                        default: return { icon: 'glass-martini-alt', color: colors.primary };
                      }
                    };
                    const categoryStyle = getCategoryIcon();
                    
                    return (
                      <TouchableOpacity
                        key={drink.id}
                        style={[styles.shortcutItem, { backgroundColor: colors.cardBackground }]}
                        onPress={() => handleQuickAddDrink(drink)}
                        onLongPress={() => {
                          Alert.alert(
                            t('favorites.removeTitle', { ns: 'session', defaultValue: 'Rimuovi Preferito' }),
                            t('favorites.removeMessage', { ns: 'session', defaultValue: 'Vuoi rimuovere questa bevanda dai preferiti?' }),
                            [
                              { text: t('cancel', { ns: 'common', defaultValue: 'Annulla' }), style: 'cancel' },
                              {
                                text: t('remove', { ns: 'common', defaultValue: 'Rimuovi' }),
                                style: 'destructive',
                                onPress: async () => {
                                  await favoritesService.removeFromFavorites(drink.id);
                                  await loadFavoritesAndRecent();
                                  toast.showToast({
                                    message: t('favorites.removed', { ns: 'session', defaultValue: 'Rimosso dai preferiti' }),
                                    type: 'success'
                                  });
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <View style={[styles.shortcutIcon, { backgroundColor: categoryStyle.color + '20' }]}>
                          <FontAwesome5 
                            name={categoryStyle.icon} 
                            size={22} 
                            color={categoryStyle.color} 
                          />
                        </View>
                        <Text style={[styles.shortcutName, { color: colors.text }]} numberOfLines={1}>
                          {t(drink.name, { defaultValue: drink.name })}
                        </Text>
                        <Text style={[styles.shortcutDetails, { color: colors.textSecondary }]}>
                          {drink.volume}ml • {drink.percentage}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            
            {/* 🌟 BEVANDE RECENTI */}
            {recentDrinks.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.shortcutsHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                    {t('favorites.recentDrinks', { ns: 'session', defaultValue: 'Recenti' })} ({recentDrinks.length})
                  </Text>
                  <TouchableOpacity 
                    style={styles.manageButton}
                    onPress={handleClearRecent}
                  >
                    <MaterialCommunityIcons name="delete-outline" size={18} color={colors.error || '#FF3B30'} />
                    <Text style={[styles.manageButtonText, { color: colors.error || '#FF3B30' }]}>
                      {t('favorites.clearRecent', { ns: 'session', defaultValue: 'Pulisci' })}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.shortcutsScroll}
                  style={styles.shortcutsScrollView}
                >
                  {recentDrinks.map((drink) => {
                    // 🎨 Determina icona e colore in base alla categoria
                    const getCategoryIcon = () => {
                      switch(drink.category) {
                        case 'beer': return { icon: 'beer', color: '#FFC107' };
                        case 'wine': return { icon: 'wine-glass', color: '#E91E63' };
                        case 'spirits': return { icon: 'glass-whiskey', color: '#FF5722' };
                        case 'cocktail': return { icon: 'cocktail', color: '#00BCD4' };
                        default: return { icon: 'glass-martini-alt', color: colors.primary };
                      }
                    };
                    const categoryStyle = getCategoryIcon();
                    
                    return (
                      <TouchableOpacity
                        key={drink.id}
                        style={[styles.shortcutItem, { backgroundColor: colors.cardBackground }]}
                        onPress={() => handleQuickAddDrink(drink)}
                      >
                        <View style={[styles.shortcutIcon, { backgroundColor: categoryStyle.color + '20' }]}>
                          <FontAwesome5 
                            name={categoryStyle.icon} 
                            size={22} 
                            color={categoryStyle.color} 
                          />
                        </View>
                        <Text style={[styles.shortcutName, { color: colors.text }]} numberOfLines={1}>
                          {t(drink.name, { defaultValue: drink.name })}
                        </Text>
                        <Text style={[styles.shortcutDetails, { color: colors.textSecondary }]}>
                          {drink.volume}ml • {drink.percentage}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('selectDrinkType', { defaultValue: 'Scegli la categoria' })}
            </Text>
              
              <View style={styles.categoryCompactGrid}>
                {drinkCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryCompactButton,
                      selectedCategory === category.id && {
                        borderColor: category.color,
                        backgroundColor: `${category.color}20`,
                      },
                      { backgroundColor: colors.cardBackground }
                    ]}
                    onPress={() => handleSelectCategory(category.id)}
                  >
                    <FontAwesome5 
                      name={category.icon} 
                      size={24} 
                      color={category.color} 
                    />
                    <Text style={[styles.categoryCompactText, { color: colors.text }]} numberOfLines={1}>
                      {t(category.translationKey, { defaultValue: category.defaultValue })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );
      
      case 1:
        // Step 1: Selezione bevanda specifica
        return (
          <View style={styles.stepContent}>
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('selectSpecificDrink')}
              </Text>
          
          <View style={styles.drinkPresets}>
                {filteredDrinks.map((drink) => (
              <TouchableOpacity
                key={drink.id}
                style={[
                  styles.drinkPreset,
                      selectedDrink?.id === drink.id && {
                        borderColor: drink.iconColor,
                        backgroundColor: `${drink.iconColor}20`,
                  },
                  { backgroundColor: colors.cardBackground }
                ]}
                    onPress={() => {
                      handleSelectDrink(drink);
                      goToNextStep();
                    }}
              >
                <FontAwesome5 
                  name={drink.icon} 
                  size={28} 
                      color={drink.iconColor} 
                />
                <Text style={[styles.drinkPresetName, { color: colors.text }]}>
                  {t(drink.name)}
                </Text>
                    {drink.description && (
                      <Text style={[styles.drinkDescription, { color: colors.textSecondary }]}>
                        {t(drink.description)}
                      </Text>
                    )}
                    {drink.examples && (
                      <Text style={[styles.drinkExamples, { color: colors.textSecondary }]}>
                        {drink.examples}
                      </Text>
                    )}
              </TouchableOpacity>
            ))}
          </View>
            </View>
          </View>
        );
      
      case 2:
      default:
        // Step 2: Dettagli (dimensione e personalizzazioni)
        return (
          <View style={styles.stepContent}>
            {/* Dimensione della bevanda */}
            <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('selectDrinkSize', { defaultValue: 'Seleziona la dimensione' })}
          </Text>
          
          <View style={styles.drinkSizesGrid}>
                {drinkSizesByCategory[selectedCategory]?.map((size) => {
                  return (
              <TouchableOpacity
                key={size.id}
                style={[
                  styles.sizeButtonLarge,
                  selectedSize?.id === size.id && {
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}20`,
                  },
                  { backgroundColor: colors.cardBackground }
                ]}
                onPress={() => handleSelectSize(size)}
              >
                      <Text style={[styles.sizeButtonTextLarge, { color: colors.text }]} numberOfLines={2}>
                        {t(size.label)}
                      </Text>
                      <Text style={[styles.sizeButtonSubtextLarge, { color: colors.textSecondary }]}>
                        {size.volume}ml
                      </Text>
              </TouchableOpacity>
                  );
                })}
              </View>
          </View>
          
            {/* 🌟 Pulsante Aggiungi/Rimuovi dai Preferiti */}
            {selectedDrink && volume && alcoholPercentage && (
              <TouchableOpacity
                style={[styles.favoriteButton, { 
                  backgroundColor: isFavoriteDrink ? colors.primary + '20' : colors.cardBackground,
                  borderColor: isFavoriteDrink ? colors.primary : colors.border
                }]}
                onPress={toggleFavorite}
              >
                <FontAwesome5 
                  name={isFavoriteDrink ? "heart" : "heart"} 
                  size={18} 
                  color={isFavoriteDrink ? colors.primary : colors.textSecondary}
                  solid={isFavoriteDrink}
                />
                <Text style={[styles.favoriteButtonText, { 
                  color: isFavoriteDrink ? colors.primary : colors.text 
                }]}>
                  {isFavoriteDrink 
                    ? t('favorites.removeFromFavorites', { ns: 'session', defaultValue: 'Rimuovi dai Preferiti' }) 
                    : t('favorites.addToFavorites', { ns: 'session', defaultValue: 'Aggiungi ai Preferiti' })}
                </Text>
              </TouchableOpacity>
            )}
          
            {/* Personalizzazione dettagli */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('customizeDetails', { defaultValue: 'Personalizza dettagli' })}
              </Text>
              
              <View style={styles.detailsRow}>
                {/* Volume */}
                <View style={[styles.formGroup, {flex: 1, marginRight: 8}]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {t('formLabels.volume', { defaultValue: 'Volume' })}
            </Text>
            <View style={[
              styles.inputContainer, 
              { backgroundColor: colors.cardBackground },
              volumeManuallyEdited && { 
                borderWidth: 2, 
                borderColor: colors.primary 
              }
            ]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={volume}
                onChangeText={(text) => {
                  setVolume(text);
                  setVolumeManuallyEdited(true);
                }}
                keyboardType="numeric"
                placeholder="330"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
              />
              <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}>ml</Text>
              {volumeManuallyEdited && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              )}
            </View>
          </View>
          
                {/* Percentuale alcolica */}
                <View style={[styles.formGroup, {flex: 1}]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {t('formLabels.alcoholPercentage', { defaultValue: '% Alcol' })}
            </Text>
            <View style={[
              styles.inputContainer, 
              { backgroundColor: colors.cardBackground },
              percentageManuallyEdited && { 
                borderWidth: 2, 
                borderColor: colors.primary 
              }
            ]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={alcoholPercentage}
                onChangeText={(text) => {
                  setAlcoholPercentage(text);
                  setPercentageManuallyEdited(true);
                }}
                keyboardType="numeric"
                placeholder="5.0"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
              />
              <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}>%</Text>
              {percentageManuallyEdited && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              )}
                  </View>
            </View>
          </View>
          
              {/* Info valori personalizzati */}
          {(volumeManuallyEdited || percentageManuallyEdited) && (
            <View style={styles.manualEditIndicator}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.manualEditText, { color: colors.primary }]}>
                    {t('manualValuesUsed', { defaultValue: 'Valori personalizzati attivi' })}
              </Text>
            </View>
          )}
            </View>
          </View>
        );
    }
  };
  
  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <AppHeader
        title="addDrink"
        translationNamespace="session"
        isMainScreen={false}
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
          {currentStep === 0 && t('selectCategory', { defaultValue: 'Scegli la categoria' })}
          {currentStep === 1 && t('selectBeverage', { defaultValue: 'Scegli la bevanda' })}
          {currentStep === 2 && t('adjustDetails', { defaultValue: 'Personalizza dettagli' })}
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
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
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
            
            {currentStep < totalSteps - 1 ? (
              <TouchableOpacity 
                style={[
                  styles.nextButton, 
                  {
                    backgroundColor: colors.primary
                  }
                ]} 
                onPress={goToNextStep}
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
            ) : (
              <TouchableOpacity 
                style={[
                  styles.dashboardButton, 
                  {
                    backgroundColor: colors.primary
                  }
          ]}
          onPress={handleSaveDrink}
        >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{marginRight: 8}} />
                <Text style={[styles.dashboardButtonText, { color: '#FFFFFF' }]}>
            {t('confirmDrink', { defaultValue: 'Conferma Bevanda' })}
          </Text>
        </TouchableOpacity>
            )}
          </View>
        ) : (
          // Pulsanti "Annulla" e "Avanti" per il primo step
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                styles.backButton, 
                { 
                  borderColor: colors.border, 
                  backgroundColor: 'transparent' 
                }
              ]} 
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.backButtonText, {color: colors.primary}]}>
                {t('cancel', { defaultValue: 'Annulla' })}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.nextButton, 
                {
                  backgroundColor: colors.primary,
                  opacity: selectedDrink ? 1 : 0.5
                }
              ]} 
              onPress={goToNextStep}
              disabled={!selectedDrink}
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
    </GestureHandlerRootView>
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
  contentContainer: {
    flexGrow: 1,
    paddingBottom: SIZES.padding
  },
  contentWrapper: {
    flex: 1, 
    padding: SIZES.padding,
  },
  scrollViewContent: {
    flexGrow: 1,
    width: '300%',  // Per gestire i 3 step affiancati
    flexDirection: 'row',
  },
  stepContainer: {
    width: '33.33%',
    flex: 1,
  },
  stepContent: {
    flex: 1,
    padding: 0,
  },
  sectionContainer: {
    marginBottom: SIZES.marginSmall,
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
    marginBottom: SIZES.marginSmall,
  },
  drinkPreset: {
    width: '48%',
    padding: SIZES.paddingSmall,
    marginBottom: SIZES.marginSmall,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
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
    marginTop: 6,
    fontSize: SIZES.body,
    fontWeight: '500',
    textAlign: 'center',
  },
  drinkSizes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.marginSmall,
  },
  sizeButton: {
    flex: 1,
    margin: 3,
    padding: SIZES.paddingSmall,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    height: 55,
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
    fontWeight: '500',
    marginBottom: 2,
  },
  sizeButtonSubtext: {
    fontSize: 11,
    opacity: 0.7,
  },
  formGroup: {
    marginBottom: SIZES.marginSmall,
  },
  label: {
    fontSize: SIZES.body,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.paddingSmall,
    height: 45,
  },
  input: {
    flex: 1,
    fontSize: SIZES.body,
    height: 45,
  },
  inputSuffix: {
    fontSize: SIZES.body,
    paddingLeft: SIZES.paddingSmall,
  },
  resultContainer: {
    marginTop: SIZES.marginSmall,
    marginBottom: SIZES.marginSmall,
    padding: SIZES.paddingSmall,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  resultLabel: {
    fontSize: SIZES.body,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: SIZES.title,
    fontWeight: 'bold',
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
    height: isIPad ? 44 : 50, // iPad: ridotto per evitare taglio
    borderRadius: isIPad ? 22 : 25,
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
    fontSize: isIPad ? 14 : 16, // iPad: ridotto
    fontWeight: 'bold',
  },
  editIndicator: {
    marginLeft: 8,
    padding: 4,
  },
  manualEditIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  manualEditText: {
    marginLeft: 8,
    fontSize: 13,
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
  errorContainer: {
    marginVertical: 8,
    padding: 8,
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderRadius: 5,
  },
  errorText: {
    color: '#ff0000',
    textAlign: 'center',
  },
  categoryTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  categoryTabActive: {
    borderBottomWidth: 3,
  },
  categoryTabText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  drinksScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  drinkSelector: {
    marginBottom: SIZES.marginSmall,
  },
  drinkExamples: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  sizeInfoContainer: {
    marginBottom: SIZES.marginSmall,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: SIZES.radiusSmall,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sizeInfoText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  categoryGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SIZES.marginSmall,
  },
  categoryGridButton: {
    width: '48%',
    padding: SIZES.padding,
    paddingVertical: SIZES.padding * 1.2,
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
  categoryButtonText: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  // 🎨 Stili per categorie compatte (grid 2x2 o 3x2)
  categoryCompactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SIZES.marginSmall,
  },
  categoryCompactButton: {
    width: '23%', // 4 colonne su unica riga
    aspectRatio: 1.0,
    padding: SIZES.paddingSmall,
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
  categoryCompactText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailsContainer: {
    marginTop: SIZES.marginSmall,
    marginBottom: SIZES.marginSmall,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.paddingSmall,
  },
  drinkDescription: {
    marginTop: 4,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 2,
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
  compactContainer: {
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: SIZES.marginSmall,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // 🌟 STILI BEVANDE PREFERITE E RECENTI
  shortcutsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.marginSmall,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  manageButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  shortcutsScrollView: {
    maxHeight: 110,
  },
  shortcutsScroll: {
    paddingBottom: 4,
  },
  shortcutItem: {
    width: 100,
    marginRight: 10,
    padding: 10,
    borderRadius: SIZES.radius,
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
  shortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  shortcutName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  shortcutDetails: {
    fontSize: 10,
    textAlign: 'center',
  },
  // 🔧 NUOVI STILI PER BOTTONI DIMENSIONI GRANDI
  drinkSizesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SIZES.marginSmall,
    gap: 8,
  },
  sizeButtonLarge: {
    width: '48%',
    padding: SIZES.padding,
    paddingVertical: SIZES.padding * 1.2,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 85,
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
  sizeButtonTextLarge: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  sizeButtonSubtextLarge: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
    textAlign: 'center',
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.marginSmall,
    borderWidth: 1.5,
    gap: 8,
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
  favoriteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 