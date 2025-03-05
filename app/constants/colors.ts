/**
 * App Colors constants
 * 
 * Contains all color definitions used in the app both for light and dark themes
 */

// General application colors
export const COLORS = {
  // Primary branding colors
  primary: '#3498db',       // Blue
  secondary: '#e74c3c',     // Red
  tertiary: '#27ae60',      // Green
  
  // Neutral shades
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  mediumGray: '#CCCCCC',
  darkGray: '#666666',
  black: '#000000',
  
  // Text colors
  textPrimary: '#333333',
  textSecondary: '#666666',
  textLight: '#FFFFFF',
  textMuted: '#999999',
  
  // Background colors
  background: '#F9F9F9',
  card: '#FFFFFF',
  cardAlt: '#F2F2F2',
  
  // Status colors
  success: '#27AE60',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',
  
  // Specific BAC colors (used in the BACDisplay component)
  bacSafe: '#33CC66',      // Green - Below legal limit 
  bacCaution: '#FFCC33',   // Yellow - Approaching legal limit
  bacWarning: '#FF9933',   // Orange - Above legal limit
  bacDanger: '#FF3333',    // Red - Dangerous level
  bacCritical: '#CC3333',  // Dark red - Critical level
  
  // Gradient colors
  gradientStart: '#3498db',
  gradientEnd: '#2980b9',
  
  // Overlay colors
  overlayDark: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(255, 255, 255, 0.5)',
  
  // Border colors
  border: '#E0E0E0',
  borderDark: '#BBBBBB',
  
  // Shadow color
  shadow: 'rgba(0, 0, 0, 0.1)',
};

// Light theme specific colors
export const LIGHT_THEME = {
  ...COLORS,
  background: '#F9F9F9',
  card: '#FFFFFF',
  text: '#333333',
  border: '#E0E0E0',
  
  // BAC Display specific
  bacDisplay: {
    background: '#FFFFFF',
    text: '#333333',
    border: '#E0E0E0',
    safe: COLORS.bacSafe,
    caution: COLORS.bacCaution,
    warning: COLORS.bacWarning,
    danger: COLORS.bacDanger,
  }
};

// Dark theme specific colors
export const DARK_THEME = {
  ...COLORS,
  background: '#121212',
  card: '#1E1E1E',
  text: '#FFFFFF',
  border: '#333333',
  
  // BAC Display specific
  bacDisplay: {
    background: '#1E1E1E',
    text: '#FFFFFF',
    border: '#333333',
    safe: COLORS.bacSafe,
    caution: COLORS.bacCaution,
    warning: COLORS.bacWarning,
    danger: COLORS.bacDanger,
  }
};

export default COLORS; 