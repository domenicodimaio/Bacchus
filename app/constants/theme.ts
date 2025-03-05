/**
 * AlcolTest App Theme
 * 
 * Sistema di temi per l'app AlcolTest con supporto per dark mode e light mode
 * Include palette colori, dimensioni, effetti neon e stili comuni
 */

// Tema base con valori condivisi
const BASE_THEME = {
  // Dimensioni per tipografia e spaziatura
  SIZES: {
    // Font sizes
    title: 28,
    subtitle: 20,
    body: 18,
    small: 15,
    tiny: 13,
    medium: 18,
    extraLarge: 42,
    large: 32,
    xlarge: 42,
    
    // Spacing
    padding: 18,
    paddingSmall: 10,
    paddingLarge: 28,
    margin: 18,
    marginSmall: 10,
    marginLarge: 28,
    radius: 18,
    radiusSmall: 10,
    radiusLarge: 28,
    
    // Button sizes
    buttonHeight: 60,
    inputHeight: 60,
    iconSize: 32,
    
    // Navigation sizes
    tabBarHeight: 64,
    headerHeight: 60,
  },
  
  // Valori BAC
  BAC_LIMITS: {
    legalLimit: 0.5, // g/L
    cautionThreshold: 0.3, // g/L
  },
  
  // Costanti applicazione
  APP_CONSTANTS: {
    standardDrinkGrams: 10, // 10g di alcol per drink standard
  },
  
  // Timing per animazioni
  ANIMATION: {
    duration: {
      short: 200,
      medium: 300,
      long: 500,
    },
    easing: {
      standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
      decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    }
  }
};

// Tema scuro (default) - Aggiornato per essere più simile all'app Quotidiano
export const DARK_THEME = {
  COLORS: {
    // Colori principali - resi più vivaci e contrastanti
    primary: '#00F7FF',
    primaryDark: '#00C8FF',
    primaryNeon: 'rgba(0, 247, 255, 0.9)',
    
    secondary: '#FF4D4D',
    secondaryLight: '#FF9999',
    secondaryDark: '#FF1A1A',
    secondaryNeon: 'rgba(255, 77, 77, 0.9)',
    
    tertiary: '#FF1A59',
    tertiaryLight: '#FF9999',
    tertiaryDark: '#E60000',
    tertiaryNeon: 'rgba(255, 26, 89, 0.9)',
    
    warning: '#FFC000',
    warningLight: '#FFD699',
    warningDark: '#FF8000',
    warningNeon: 'rgba(255, 192, 0, 0.9)',
    
    // Sfondi - aggiornati per essere più scuri e simili a Quotidiano
    background: '#14233B', // Blu scuro come Quotidiano
    surface: '#1E2E45',    // Leggermente più chiaro per elementi sovrapposti
    card: '#1E2E45',       // Colore per le card
    cardBackground: '#1E2E45',
    cardElevated: '#283A57', // Elementi elevati leggermente più chiari
    modalBackground: 'rgba(20, 35, 59, 0.97)',
    
    // Testo - maggiore contrasto
    text: '#FFFFFF',       // Bianco per testo primario
    textSecondary: '#B3C5E5', // Azzurrino chiaro per testo secondario
    textTertiary: '#8090B0', // Ancora più chiaro per testo terziario
    textDisabled: 'rgba(255, 255, 255, 0.6)',
    
    // Status colors - più vivaci
    safe: '#4DFF4D',       // Verde brillante
    caution: '#FFDD00',    // Giallo brillante
    danger: '#FF4040',     // Rosso brillante
    error: '#FF4040',
    info: '#00F7FF',       // Ciano brillante
    success: '#4DFF4D',
    
    // Elementi UI
    border: '#2D3D59',     // Bordi più visibili
    divider: '#2D3D59',    // Divisori più visibili
    shadow: '#0A1020',     // Ombra più scura
    overlay: 'rgba(10, 16, 32, 0.8)',
    backdrop: 'rgba(10, 16, 32, 0.7)',
    ripple: 'rgba(255, 255, 255, 0.25)',
    
    // Grafici e visualizzazioni
    chartLine: '#00F7FF',
    chartGrid: '#2D3D59',
    chartLabel: '#B3C5E5',
    chartAxis: '#3E5060',
    
    // Navigazione - specifiche per tab bar e header
    navBackground: '#14233B',       // Sfondo barra di navigazione
    navActive: '#00F7FF',           // Colore tab attivo
    navInactive: '#8090B0',         // Colore tab inattivo
    tabBackground: '#192942',       // Sfondo della tab bar
    tabActiveBackground: '#283A57', // Sfondo tab attiva
    tabIcon: '#8090B0',             // Colore icone tab inattive
    tabActiveIcon: '#00F7FF',       // Colore icone tab attive
    tabText: '#8090B0',             // Colore testo tab inattive
    tabActiveText: '#00F7FF',       // Colore testo tab attive
    headerBackground: '#14233B',    // Sfondo header
    headerText: '#FFFFFF',          // Testo header
    headerIcon: '#FFFFFF',          // Icone header
  },
  
  // Ombre per l'effetto neon - rese più pronunciate
  SHADOWS: {
    sm: {
      shadowColor: '#0A1020',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 4,
    },
    md: {
      shadowColor: '#0A1020',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 5,
      elevation: 7,
    },
    lg: {
      shadowColor: '#0A1020',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 10,
    },
    
    neonBlue: {
      shadowColor: '#00F7FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.95,
      shadowRadius: 12,
      elevation: 15,
    },
    neonRed: {
      shadowColor: '#FF4040',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.95,
      shadowRadius: 12,
      elevation: 15,
    },
    neonGreen: {
      shadowColor: '#4DFF4D',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.95,
      shadowRadius: 12,
      elevation: 15,
    },
    neonOrange: {
      shadowColor: '#FFDD00',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.95,
      shadowRadius: 12,
      elevation: 15,
    },
  },
  
  ...BASE_THEME
};

// Tema chiaro - meno rilevante per ora visto che Quotidiano usa tema scuro
export const LIGHT_THEME = {
  COLORS: {
    // Colori principali
    primary: '#0091EA',
    primaryLight: '#B3E5FC',
    primaryDark: '#0277BD',
    primaryNeon: 'rgba(0, 145, 234, 0.4)',
    
    secondary: '#FF1744',
    secondaryLight: '#FF8A80',
    secondaryDark: '#D50000',
    secondaryNeon: 'rgba(255, 23, 68, 0.4)',
    
    tertiary: '#FF1744',
    tertiaryLight: '#FF8A80',
    tertiaryDark: '#D50000',
    tertiaryNeon: 'rgba(255, 23, 68, 0.4)',
    
    warning: '#FF9100',
    warningLight: '#FFD180',
    warningDark: '#FF6D00',
    warningNeon: 'rgba(255, 145, 0, 0.4)',
    
    // Sfondi
    background: '#F5F5F7',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardBackground: '#FFFFFF',
    cardElevated: '#F8F9FA',
    modalBackground: 'rgba(250, 250, 250, 0.95)',
    
    // Testo
    text: '#1A202C',
    textSecondary: '#4A5568',
    textTertiary: '#718096',
    textDisabled: 'rgba(0, 0, 0, 0.38)',
    
    // Status colors
    safe: '#00C853',
    caution: '#FFD600',
    danger: '#FF1744',
    error: '#FF1744',
    info: '#0091EA',
    success: '#00C853',
    
    // Elementi UI
    border: '#E2E8F0',
    divider: '#EEEEEE',
    shadow: 'rgba(0, 0, 0, 0.12)',
    overlay: 'rgba(0, 0, 0, 0.25)',
    backdrop: 'rgba(0, 0, 0, 0.2)',
    ripple: 'rgba(0, 0, 0, 0.05)',
    
    // Grafici e visualizzazioni
    chartLine: '#0091EA',
    chartGrid: '#EEEEEE',
    chartLabel: '#757575',
    chartAxis: '#BDBDBD',
    
    // Navigazione - specifiche per tab bar e header
    navBackground: '#FFFFFF',
    navActive: '#0091EA',
    navInactive: '#718096',
    tabBackground: '#FFFFFF',
    tabActiveBackground: '#EBF8FF',
    tabIcon: '#718096',
    tabActiveIcon: '#0091EA',
    tabText: '#718096',
    tabActiveText: '#0091EA',
    headerBackground: '#FFFFFF',
    headerText: '#1A202C',
    headerIcon: '#1A202C',
  },
  
  // Ombre per l'effetto elevazione
  SHADOWS: {
    neonBlue: {
      shadowColor: 'rgba(0, 145, 234, 0.4)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
      elevation: 10,
    },
    neonGreen: {
      shadowColor: 'rgba(0, 200, 83, 0.4)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
      elevation: 10,
    },
    neonRed: {
      shadowColor: 'rgba(255, 23, 68, 0.4)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
      elevation: 10,
    },
    neonOrange: {
      shadowColor: 'rgba(255, 145, 0, 0.4)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
      elevation: 10,
    },
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 5,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  
  ...BASE_THEME
};

// Esporta il tema di default (Dark Mode)
export const COLORS = DARK_THEME.COLORS;
export const SIZES = BASE_THEME.SIZES;
export const SHADOWS = DARK_THEME.SHADOWS;
export const BAC_LIMITS = BASE_THEME.BAC_LIMITS;
export const APP_CONSTANTS = BASE_THEME.APP_CONSTANTS;
export const ANIMATION = BASE_THEME.ANIMATION;

// Layout comuni per la navigazione
export const LAYOUTS = {
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.background,
  },
  screenWithTabBar: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: SIZES.tabBarHeight,
  },
  header: {
    height: SIZES.headerHeight,
    backgroundColor: COLORS.headerBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
};

// Stili comuni per form e componenti UI
export const FORM_STYLES = {
  input: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 18,
    marginBottom: 20,
    color: COLORS.text,
    height: SIZES.inputHeight,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primaryNeon,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    height: SIZES.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: SIZES.medium,
    fontWeight: 'bold',
  },
};

// Size for the BAC circle progress indicator
export const CIRCLE_SIZE = 220; // Diametro del cerchio in pixel

// Esportiamo un componente vuoto come default per soddisfare Expo Router
export default function ThemeConstants() {
  return null;
} 