/**
 * Bacchus App Theme
 * 
 * Sistema di temi per l'app Bacchus con supporto per dark mode e light mode
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
    
    // Colore per funzionalità premium
    premium: '#FFD700', // Oro
    
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

// Tema chiaro - migliorato per avere maggiore contrasto e migliore leggibilità
export const LIGHT_THEME = {
  COLORS: {
    // Colori principali - più vivaci e con maggior contrasto
    primary: '#0078D4', // Blu più scuro e vibrante (come Microsoft blue)
    primaryLight: '#47A0E3', // Versione più chiara ma ancora visibile
    primaryDark: '#005BA1', // Versione più scura per elementi di rilievo
    primaryNeon: 'rgba(0, 120, 212, 0.7)', // Effetto neon più visibile
    
    secondary: '#E74856', // Rosso più vivace (stile Microsoft red)
    secondaryLight: '#FF8086', // Rosa più intenso
    secondaryDark: '#C4314B', // Rosso più scuro
    secondaryNeon: 'rgba(231, 72, 86, 0.7)', // Effetto neon più visibile
    
    tertiary: '#FF4081', // Fucsia più moderno
    tertiaryLight: '#FF80AB', // Rosa più intenso
    tertiaryDark: '#C60055', // Fucsia più scuro
    tertiaryNeon: 'rgba(255, 64, 129, 0.7)', // Effetto neon più visibile
    
    warning: '#FF8C00', // Arancione più vibrante
    warningLight: '#FFB74D', // Arancione più chiaro
    warningDark: '#E67700', // Arancione più scuro
    warningNeon: 'rgba(255, 140, 0, 0.7)', // Effetto neon più visibile
    
    // Colore per funzionalità premium
    premium: '#D4AF37', // Oro più morbido per tema chiaro
    
    // Sfondi - più eleganti e moderni
    background: '#F5F9FC', // Azzurrino chiaro più elegante
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardBackground: '#FFFFFF',
    cardElevated: '#F0F5FA', // Leggero blue tint per elementi elevati
    modalBackground: 'rgba(245, 249, 252, 0.98)',
    
    // Testo - contrasto maggiore e più leggibile
    text: '#252A31', // Quasi nero con sfumatura blu
    textSecondary: '#5B6B7C', // Grigio blu più leggibile
    textTertiary: '#8096B0', // Grigio azzurro più chiaro
    textDisabled: 'rgba(37, 42, 49, 0.4)',
    
    // Status colors - più vivaci e con migliore leggibilità
    safe: '#107C10', // Verde Microsoft
    caution: '#F7630C', // Arancione Microsoft
    danger: '#E74856', // Rosso Microsoft
    error: '#E74856', // Rosso Microsoft
    info: '#0078D4', // Blu Microsoft
    success: '#107C10', // Verde Microsoft
    
    // Elementi UI - ombreggiature e bordi più evidenti
    border: '#D1E0ED', // Bordo azzurrino molto chiaro
    divider: '#E1EBF5', // Divisore ancora più chiaro
    shadow: 'rgba(0, 0, 0, 0.12)', // Ombra più sottile
    overlay: 'rgba(27, 44, 61, 0.25)', // Overlay più sottile
    backdrop: 'rgba(27, 44, 61, 0.2)', // Backdrop più sottile
    ripple: 'rgba(0, 120, 212, 0.08)', // Effetto ripple più sottile
    
    // Grafici e visualizzazioni - migliore leggibilità e stile visivo
    chartLine: '#0078D4', // Blu Microsoft
    chartGrid: '#E1EBF5', // Griglia molto chiara
    chartLabel: '#5B6B7C', // Grigio blu più leggibile
    chartAxis: '#8096B0', // Grigio azzurro più chiaro
    
    // Navigazione - specifiche per tab bar e header
    navBackground: '#FFFFFF',
    navActive: '#0078D4', // Blu Microsoft
    navInactive: '#5B6B7C', // Grigio blu più leggibile
    tabBackground: '#FFFFFF',
    tabActiveBackground: '#E5F1FB', // Azzurrino molto chiaro
    tabIcon: '#5B6B7C', // Grigio blu più leggibile
    tabActiveIcon: '#0078D4', // Blu Microsoft
    tabText: '#5B6B7C', // Grigio blu più leggibile
    tabActiveText: '#0078D4', // Blu Microsoft
    headerBackground: '#FFFFFF',
    headerText: '#252A31', // Quasi nero con sfumatura blu
    headerIcon: '#252A31', // Quasi nero con sfumatura blu
  },
  
  // Ombre per l'effetto elevazione - più delicate ma efficaci
  SHADOWS: {
    sm: {
      shadowColor: 'rgba(0, 0, 0, 0.08)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: 'rgba(0, 0, 0, 0.08)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 4,
    },
    lg: {
      shadowColor: 'rgba(0, 0, 0, 0.08)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
  
    neonBlue: {
      shadowColor: 'rgba(0, 120, 212, 0.6)', // Blu Microsoft
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 8,
      elevation: 8,
    },
    neonGreen: {
      shadowColor: 'rgba(16, 124, 16, 0.6)', // Verde Microsoft
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 8,
      elevation: 8,
    },
    neonRed: {
      shadowColor: 'rgba(231, 72, 86, 0.6)', // Rosso Microsoft
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 8,
      elevation: 8,
    },
    neonOrange: {
      shadowColor: 'rgba(247, 99, 12, 0.6)', // Arancione Microsoft
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
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