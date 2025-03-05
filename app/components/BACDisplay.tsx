import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, useColorScheme, TouchableOpacity, Modal } from 'react-native';
import { Svg, Circle, Path, G, Text as SvgText, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
  useAnimatedProps,
  useDerivedValue,
} from 'react-native-reanimated';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

// Importo il contesto del tema
import { useTheme } from '../contexts/ThemeContext';
// Importo le costanti BAC
import { BAC_LIMITS, getBACLevel, getBACInfo, LEGAL_DRIVING_LIMIT } from '../constants/bac';
// Importo i colori
import { COLORS } from '../constants/colors';

// Define legal limits for displaying BAC levels
const LEGAL_LIMITS = {
  LEGAL: LEGAL_DRIVING_LIMIT,  // From constants (0.5)
  HIGH: BAC_LIMITS.penalLowThreshold,  // From constants (0.8)
  DANGEROUS: BAC_LIMITS.penalHighThreshold // From constants (1.5)
};

// Constants for the circular display
const { width } = Dimensions.get('window');
// Riduciamo leggermente il cerchio per lasciare più spazio ai marker
const CIRCLE_SIZE = width * 0.72; 
const STROKE_WIDTH = 16; // Spessore della traccia di base - più spessa
const FILL_STROKE_WIDTH = 10; // Spessore dell'indicatore di riempimento più sottile
const CIRCLE_RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// Costanti per i valori specifici di BAC
const BAC_MAX = 1.5;  // valore massimo di BAC da visualizzare (corrisponde a 360 gradi)
const BAC_LEGAL = 0.5; // valore legale (corrisponde a 120 gradi)
const BAC_WARNING = 0.8; // valore di allerta (corrisponde a 192 gradi)

// Colore neutro per le stanghette e label (più visibile)
const MARKER_COLOR = '#607D8B'; // Grigio blu neutro

// Testi statici (non dipendono da traduzioni)
const STATIC_TEXT = {
  // Valori temporali
  timeToLegalDriving: 'Ritorno sotto limite legale',
  completelyClean: 'Ritorno a 0.00',
  estimatedEnd: 'Fine Stimata',
  notAvailable: 'Non disponibile',
  now: 'Adesso',
  currentBAC: 'Tasso alcolemico',
  
  // Livelli BAC
  bacSafe: 'Sicuro',
  bacCaution: 'Attenzione',
  bacWarning: 'Rischio',
  bacDanger: 'Pericolo',
  bacCritical: 'Critico',
  
  // Sanzioni
  legalInfo: 'Info sanzioni',
  legalLevels: 'Livelli e sanzioni',
  closeButton: 'Chiudi',
  // Nuovi testi per le sanzioni
  cautionSanction: 'Sanzione amministrativa: da €543 a €2.170 e sospensione patente da 3 a 6 mesi',
  warningSanction: 'Ammenda: da €800 a €3.200 e arresto fino a 6 mesi, sospensione patente da 6 mesi a 1 anno',
  dangerSanction: 'Ammenda: da €1.500 a €6.000 e arresto da 6 mesi a 1 anno, sospensione patente da 1 a 2 anni',
  sanctionTitle: 'Conseguenze legali'
};

// Funzione per normalizzare il BAC per la visualizzazione
const normalizeBac = (bac: number): number => {
  // Limitiamo il BAC al valore massimo per la visualizzazione
  const clampedBac = Math.min(Math.max(0, bac), BAC_MAX);
  // Convertiamo in gradi (da 0 a 360)
  return (clampedBac / BAC_MAX) * 360;
};

// Angoli dei marker in gradi
const MARKER_ANGLES = [
  0,                              // 0.0 g/L (0 gradi)
  normalizeBac(BAC_LEGAL),        // 0.5 g/L (120 gradi)
  normalizeBac(BAC_WARNING),      // 0.8 g/L (192 gradi)
  normalizeBac(BAC_MAX),          // 1.5 g/L (360 gradi)
];

// MinAnimatedCircle is a small circle visible even at 0 BAC to provide visual feedback
const MIN_CIRCLE_SIZE = 20; // Minimum visible circle size
const MIN_PROGRESS = 0.025; // Minimum progress value to ensure visibility

// Maximum BAC value for the scale (1.5 g/L)
const MAX_BAC_VALUE = BAC_MAX;

export interface BACDisplayProps {
  bac: number;
  timeToSober?: string;
  timeToLegal?: Date | null | string;
  showTimeToSober?: boolean;
  isDarkTheme?: boolean; // Optional prop per override del tema
  timeToZero?: Date | null | string;
}

// Create animated Circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const BACDisplay: React.FC<BACDisplayProps> = ({
  bac,
  timeToSober,
  timeToLegal,
  showTimeToSober = true,
  isDarkTheme: forceDarkTheme,
  timeToZero,
}) => {
  // Stato per modal informativo
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  
  // Get system/app theme
  const systemColorScheme = useColorScheme();
  const { isDarkMode } = useTheme();
  
  // For tracking updates
  const lastUpdateRef = useRef(new Date().getTime());
  const lastBacRef = useRef(bac);
  
  // Usa il tema fornito dalla prop, dal context o dal sistema
  const isDarkTheme = forceDarkTheme !== undefined 
    ? forceDarkTheme 
    : isDarkMode !== undefined 
      ? isDarkMode 
      : systemColorScheme === 'dark';
  
  // Animated values
  const progressValue = useSharedValue(0);
  
  // Ottieni il valore BAC valido (non negativo)
  const validBac = Math.max(0, bac);
  
  // Debug
  console.log('BACDisplay - Props:', { 
    bac: validBac, 
    timeToSober, 
    timeToLegal, 
    timeToZero 
  });
  
  // Determina il livello BAC
  const bacLevel = getBACLevel(validBac);
  
  // Calcola la percentuale di progresso per l'animazione
  const progress = Math.min(1, validBac / MAX_BAC_VALUE);
  
  // Assicurati che ci sia sempre un minimo di progresso visibile
  const visualProgress = validBac > 0 ? Math.max(MIN_PROGRESS, progress) : 0;
  
  // Normalize BAC for circular display (0 to 1.0)
  // Correzione: usiamo BAC_MAX (1.5) per normalizzare
  const normalizedBac = Math.min(validBac / BAC_MAX, 1);
  
  // Apply minimum visible progress value for UI feedback when BAC is very low
  // Se BAC è 0, deve mostrare 0. Altrimenti minimo un valore piccolo per visualizzare qualcosa
  const displayProgress = validBac <= 0.001 ? 0 : Math.max(normalizedBac, 0.01);
  
  // Creare un valore derivato che verrà aggiornato quando cambia il BAC
  const derivedProgress = useDerivedValue(() => {
    // Inizia l'animazione dal valore corrente verso il nuovo valore target
    return withTiming(displayProgress, {
      duration: 750,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [displayProgress]);
  
  // Force update to initial value on first render - garantisce partenza da zero
  useEffect(() => {
    // Inizializza sempre da 0 per garantire l'animazione
    progressValue.value = 0;
    
    // Poi esegui l'animazione al valore corretto
    setTimeout(() => {
      progressValue.value = displayProgress;
    }, 100);
  }, []); // Solo al mount iniziale
  
  // Update value when BAC changes
  useEffect(() => {
    // Aggiornamento diretto del valore condivido che innesca l'animazione tramite derivedProgress
    progressValue.value = displayProgress;
    
    // Aggiorna i riferimenti
    lastBacRef.current = validBac;
    lastUpdateRef.current = Date.now();
  }, [validBac, displayProgress]);
  
  // Determina lo stato BAC usando le funzioni da constants/bac.ts
  const bacInfo = getBACInfo(validBac);
  
  // Define theme-based colors
  const theme = {
    background: 'transparent',
    textPrimary: isDarkTheme ? '#FFFFFF' : '#121212',
    textSecondary: isDarkTheme ? '#A0A0A0' : '#777777',
    backgroundTrack: isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    
    // Use colors from constants
    safeColor: COLORS.bacSafe,
    cautionColor: COLORS.bacCaution,
    warningColor: COLORS.bacWarning,
    dangerColor: COLORS.bacDanger,
    criticalColor: COLORS.error,
    
    // Status backgrounds
    safeBackground: isDarkTheme ? 'rgba(51, 204, 102, 0.15)' : 'rgba(51, 204, 102, 0.1)',
    cautionBackground: isDarkTheme ? 'rgba(255, 204, 51, 0.15)' : 'rgba(255, 204, 51, 0.1)',
    warningBackground: isDarkTheme ? 'rgba(255, 153, 51, 0.15)' : 'rgba(255, 153, 51, 0.1)',
    dangerBackground: isDarkTheme ? 'rgba(255, 51, 51, 0.15)' : 'rgba(255, 51, 51, 0.1)',
    criticalBackground: isDarkTheme ? 'rgba(204, 51, 51, 0.15)' : 'rgba(204, 51, 51, 0.1)',
  };

  // Debug per verificare la corrispondenza tra BAC e angoli
  useEffect(() => {
    // Solo durante lo sviluppo
    if (__DEV__) {
      console.log('BAC CIRCLE DEBUG:', {
        bac: validBac,
        ratio: validBac / BAC_MAX,
        normalizedBac,
        gradi: normalizedBac * 360,
        percentoCirconferenza: normalizedBac * CIRCLE_CIRCUMFERENCE,
        marker_05: (0.5/BAC_MAX) * 360,  // Deve essere 120 gradi
        marker_08: (0.8/BAC_MAX) * 360,  // Deve essere 192 gradi
        marker_15: (1.5/BAC_MAX) * 360   // Deve essere 360 gradi
      });
    }
  }, [validBac, normalizedBac]);

  // Props animati per il cerchio - usiamo derivedProgress per animare fluidamente
  const animatedProps = useAnimatedProps(() => {
    // Il valore derivato controlla l'animazione
    const progress = derivedProgress.value;
    
    // Calcola lo strokeDashoffset per visualizzare la porzione corretta del cerchio
    // 0 = cerchio completo, CIRCLE_CIRCUMFERENCE = cerchio vuoto
    const offsetValue = CIRCLE_CIRCUMFERENCE * (1 - progress);
    
    // Debug per identificare eventuali problemi di animazione
    if (isNaN(offsetValue)) {
      console.warn('ERRORE BAC CIRCLE: offset value is NaN', {
        derivedValue: progress,
        normalizedBac,
        circumference: CIRCLE_CIRCUMFERENCE
      });
      return { strokeDashoffset: CIRCLE_CIRCUMFERENCE };
    }
    
    return { strokeDashoffset: offsetValue };
  });

  // Get color based on BAC level
  const getColor = () => {
    switch (bacLevel) {
      case 'critical': return theme.criticalColor;
      case 'danger': return theme.dangerColor;
      case 'warning': return theme.warningColor;
      case 'caution': return theme.cautionColor;
      case 'safe': return theme.safeColor;
      default: return theme.safeColor;
    }
  };
  
  // Get background color based on BAC level
  const getBackgroundColor = (level: string) => {
    switch (level) {
      case 'safe': return theme.safeBackground;
      case 'caution': return theme.cautionBackground;
      case 'warning': return theme.warningBackground;
      case 'danger': return theme.dangerBackground;
      case 'critical': return theme.criticalBackground;
      default: return theme.safeBackground;
    }
  };
  
  const activeColor = getColor();
  const statusBackground = getBackgroundColor(bacLevel);
  
  // Ottieni le informazioni sulle sanzioni in base al BAC
  const getLegalInfo = () => {
    if (validBac <= 0.5) {
      return null; // Nessuna sanzione sotto 0.5
    } else if (validBac <= 0.8) {
      return STATIC_TEXT.cautionSanction;
    } else if (validBac <= 1.5) {
      return STATIC_TEXT.warningSanction;
    } else {
      return STATIC_TEXT.dangerSanction;
    }
  };

  // Converte una stringa o un Date in un formato leggibile (ora:minuti)
  const formatTime = (dateValue: Date | null | undefined | string) => {
    if (!dateValue) {
      console.log('BACDisplay: formatTime ricevuto valore nullo o undefined');
      return STATIC_TEXT.notAvailable;
    }
    
    try {
      // Mostro il valore esatto ricevuto per debug
      console.log('BACDisplay: formatTime ricevuto valore', {
        type: typeof dateValue,
        value: dateValue,
        isDate: dateValue instanceof Date,
        isString: typeof dateValue === 'string'
      });
      
      // Gestione di diversi tipi di input
      let date: Date | null = null;
      
      if (typeof dateValue === 'string') {
        // Se è una stringa formattata come HH:MM, la mostriamo direttamente
        if (/^\d{1,2}h \d{2}m$/.test(dateValue) || /^\d{1,2}:\d{2}$/.test(dateValue)) {
          return dateValue; 
        }
        
        // Altrimenti proviamo a convertirla in Date
        const timestamp = Date.parse(dateValue);
        console.log('BACDisplay: parsing string date', { dateValue, timestamp });
        
        if (isNaN(timestamp)) {
          console.warn('BACDisplay: impossibile convertire la stringa in data', dateValue);
          return STATIC_TEXT.notAvailable;
        }
        date = new Date(timestamp);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        console.warn('BACDisplay: tipo di dato non supportato', typeof dateValue);
        return STATIC_TEXT.notAvailable;
      }
      
      // Verifica che la data sia valida
      if (!date || isNaN(date.getTime())) {
        console.warn('BACDisplay: data non valida', date);
        return STATIC_TEXT.notAvailable;
      }
      
      // Se la data è nel passato, consideriamola non valida
      const now = new Date();
      if (date < now) {
        console.log('BACDisplay: data nel passato', { 
          date: date.toISOString(), 
          now: now.toISOString(),
          diff: (now.getTime() - date.getTime()) / 1000 / 60,  // differenza in minuti
        });
        return STATIC_TEXT.notAvailable;
      }
      
      // Formatta la data come ora:minuti
      const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      console.log('BACDisplay: data formattata', { date, formattedTime });
      
      return formattedTime;
    } catch (error) {
      console.warn('BACDisplay: Errore nella formattazione della data', error);
      return STATIC_TEXT.notAvailable;
    }
  };

  return (
    <Card style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.circleContainer}>
          <Svg width={CIRCLE_SIZE + 40} height={CIRCLE_SIZE + 40} style={styles.svgContainer}>
            {/* Defs for gradients */}
            <Defs>
              <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={activeColor} stopOpacity="0.8" />
                <Stop offset="100%" stopColor={activeColor} />
              </LinearGradient>
            </Defs>
            
            {/* Circle background track - SPESSO */}
            <Circle
              cx={(CIRCLE_SIZE + 40) / 2}
              cy={(CIRCLE_SIZE + 40) / 2}
              r={CIRCLE_RADIUS}
              stroke={theme.backgroundTrack}
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
            />
            
            {/* Marker lines - migliorati per visibilità */}
            {MARKER_ANGLES.map((angle, index) => {
              // Converti angoli in radianti (partendo da 90° in alto)
              const angleInRadians = (angle - 90) * (Math.PI / 180);
              
              // Calcola le coordinate x,y delle stanghette - circonferenza esterna
              const outerX = (CIRCLE_SIZE + 40) / 2 + (CIRCLE_RADIUS + STROKE_WIDTH/2 + 3) * Math.cos(angleInRadians);
              const outerY = (CIRCLE_SIZE + 40) / 2 + (CIRCLE_RADIUS + STROKE_WIDTH/2 + 3) * Math.sin(angleInRadians);
              
              // Calcola le coordinate x,y delle stanghette - circonferenza interna
              const innerX = (CIRCLE_SIZE + 40) / 2 + (CIRCLE_RADIUS - STROKE_WIDTH/2 - 3) * Math.cos(angleInRadians);
              const innerY = (CIRCLE_SIZE + 40) / 2 + (CIRCLE_RADIUS - STROKE_WIDTH/2 - 3) * Math.sin(angleInRadians);
              
              // Posizione del testo - più distante dal cerchio per evitare taglio
              let textRadiusOffset = STROKE_WIDTH * 2.5;
              // Aggiungiamo offset specifici per ogni marker per evitare che le etichette vengano tagliate
              if (index === 1) { // 0.5
                textRadiusOffset = STROKE_WIDTH * 2.6;
              } else if (index === 2) { // 0.8
                textRadiusOffset = STROKE_WIDTH * 2.8;
              } else if (index === 3) { // 1.5
                textRadiusOffset = STROKE_WIDTH * 2.7;
              }
              
              const textX = (CIRCLE_SIZE + 40) / 2 + (CIRCLE_RADIUS + textRadiusOffset) * Math.cos(angleInRadians);
              const textY = (CIRCLE_SIZE + 40) / 2 + (CIRCLE_RADIUS + textRadiusOffset) * Math.sin(angleInRadians);
              
              // Calcoliamo la dimensione del testo in base alle dimensioni del cerchio
              const fontSize = Math.max(12, CIRCLE_SIZE / 26);
              
              let labelValue = '';
              
              // Assegna i valori ai marker
              if (index === 0) {
                labelValue = '0.0';
              } else if (index === 1) {
                labelValue = '0.5';
              } else if (index === 2) {
                labelValue = '0.8';
              } else if (index === 3) {
                labelValue = '1.5';
              }
              
              return (
                <G key={`marker-${index}`}>
                  {/* Stanghetta che va da circonferenza esterna a interna */}
                  <Path
                    d={`M${outerX},${outerY} L${innerX},${innerY}`}
                    stroke={MARKER_COLOR}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  
                  {/* Etichetta con il valore in posizione adeguata */}
                  <SvgText
                    x={textX}
                    y={textY}
                    fill={isDarkTheme ? '#FFFFFF' : '#333333'}
                    fontSize={fontSize}
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="central"
                    // Migliore visibilità
                    opacity={1}
                    stroke={isDarkTheme ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)'}
                    strokeWidth={1}
                  >
                    {labelValue}
                  </SvgText>
                </G>
              );
            })}
            
            {/* Circle fill indicator - con strokeDashoffset corretto */}
            <AnimatedCircle
              cx={(CIRCLE_SIZE + 40) / 2}
              cy={(CIRCLE_SIZE + 40) / 2}
              r={CIRCLE_RADIUS}
              stroke="url(#progressGradient)"
              strokeWidth={FILL_STROKE_WIDTH}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={`${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`}
              animatedProps={animatedProps}
              // IMPORTANTE: Assicuriamo che parta da angolo 0 (in alto)
              transform={`rotate(-90, ${(CIRCLE_SIZE + 40)/2}, ${(CIRCLE_SIZE + 40)/2})`}
            />
          </Svg>
          
          {/* BAC value display */}
          <View style={styles.valueContainer}>
            <Text style={[styles.valueLabel, { color: theme.textSecondary }]}>
              {STATIC_TEXT.currentBAC}
            </Text>
            <Text
              style={[
                styles.bacValue,
                { color: activeColor }
              ]}
            >
              {validBac.toFixed(2)}
            </Text>
            <Text style={[styles.bacUnit, { color: theme.textSecondary }]}>
              g/L
            </Text>
            
            {/* Status label */}
            <View style={[styles.statusContainer, { backgroundColor: statusBackground }]}>
              <Text style={[styles.statusText, { color: activeColor }]}>
                {(() => {
                  switch (bacLevel) {
                    case 'safe': return STATIC_TEXT.bacSafe;
                    case 'caution': return STATIC_TEXT.bacCaution;
                    case 'warning': return STATIC_TEXT.bacWarning;
                    case 'danger': return STATIC_TEXT.bacDanger;
                    case 'critical': return STATIC_TEXT.bacCritical;
                    default: return STATIC_TEXT.bacSafe;
                  }
                })()}
              </Text>
            </View>
            
            {/* Time estimation info */}
            <View style={styles.timeInfoContainer}>
              <Text style={[styles.timeInfoLabel, { color: theme.textSecondary }]}>
                {validBac > 0.5 ? STATIC_TEXT.timeToLegalDriving : STATIC_TEXT.completelyClean}
              </Text>
              <View style={styles.timeValueRow}>
                <Text style={[styles.timeValue, { color: theme.textPrimary }]}>
                  {validBac > 0.5 
                    ? formatTime(timeToLegal)
                    : formatTime(timeToZero)}
                </Text>
                
                {/* Info button for legal consequences */}
                {validBac > 0.5 && (
                  <TouchableOpacity 
                    style={styles.infoButton}
                    onPress={() => {
                      console.log('BACDisplay - Opening info modal');
                      setInfoModalVisible(true);
                    }}
                  >
                    <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
      
      {/* Legal Info Modal */}
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkTheme ? '#222' : 'white' }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {STATIC_TEXT.sanctionTitle}
            </Text>
            
            <View style={styles.legalLevelsContainer}>
              {/* Livello 0.5 - 0.8 */}
              <View style={[styles.legalLevel, { borderColor: theme.cautionColor }]}>
                <Text style={[styles.legalLevelTitle, { color: theme.cautionColor }]}>
                  0.5 - 0.8 g/L
                </Text>
                <Text style={[styles.legalLevelText, { color: theme.textPrimary }]}>
                  {STATIC_TEXT.cautionSanction}
                </Text>
              </View>
              
              {/* Livello 0.8 - 1.5 */}
              <View style={[styles.legalLevel, { borderColor: theme.warningColor }]}>
                <Text style={[styles.legalLevelTitle, { color: theme.warningColor }]}>
                  0.8 - 1.5 g/L
                </Text>
                <Text style={[styles.legalLevelText, { color: theme.textPrimary }]}>
                  {STATIC_TEXT.warningSanction}
                </Text>
              </View>
              
              {/* Livello > 1.5 */}
              <View style={[styles.legalLevel, { borderColor: theme.dangerColor }]}>
                <Text style={[styles.legalLevelTitle, { color: theme.dangerColor }]}>
                  {'>'} 1.5 g/L
                </Text>
                <Text style={[styles.legalLevelText, { color: theme.textPrimary }]}>
                  {STATIC_TEXT.dangerSanction}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: activeColor }]}
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>
                {STATIC_TEXT.closeButton}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Card>
  );
};

// Stili
const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3
  },
  content: {
    alignItems: 'center',
    padding: 16
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    // Assicura che ci sia spazio sufficiente per tutti i marker
    paddingHorizontal: 20
  },
  svgContainer: {
    transform: [{ rotate: '0deg' }]
  },
  valueContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  valueLabel: {
    fontSize: 14,
    marginBottom: 4
  },
  bacValue: {
    fontSize: 42,
    fontWeight: 'bold'
  },
  bacUnit: {
    fontSize: 16,
    marginTop: -4
  },
  statusContainer: {
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 16
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600'
  },
  timeInfoContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  timeInfoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoButton: {
    marginLeft: 6,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  legalLevelsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  legalLevel: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  legalLevelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  legalLevelText: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default BACDisplay; 