import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export const getLoginStyles = (isDarkMode: boolean) => {
  const colors = {
    background: isDarkMode ? '#0c1620' : '#f5f5f5',
    card: isDarkMode ? '#1a2634' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    textSecondary: isDarkMode ? '#9ea3b0' : '#505050',
    inputBackground: isDarkMode ? '#141f2a' : '#f0f0f0',
    inputBorder: isDarkMode ? '#2c3846' : '#e0e0e0',
    divider: isDarkMode ? '#2c3846' : '#e0e0e0',
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    logo: {
      width: width * 0.4,
      height: width * 0.4,
      resizeMode: 'contain',
      marginBottom: 16,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 24,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    passwordContainer: {
      position: 'relative',
    },
    eyeIcon: {
      position: 'absolute',
      right: 12,
      top: 12,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginTop: 8,
      marginBottom: 16,
    },
    forgotPasswordText: {
      color: COLORS.primary,
      fontSize: 14,
    },
    loginButton: {
      backgroundColor: COLORS.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
    },
    loginButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    orContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
    },
    orLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.divider,
    },
    orText: {
      color: colors.textSecondary,
      marginHorizontal: 12,
      fontSize: 14,
    },
    socialButtonsContainer: {
      marginBottom: 16,
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    socialButtonIcon: {
      marginRight: 12,
    },
    socialButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '500',
    },
    guestButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.divider,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    guestButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '500',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 16,
      marginBottom: 24,
    },
    footerText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    signupText: {
      color: COLORS.primary,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 4,
    },
    errorText: {
      color: '#ff3b30',
      fontSize: 14,
      marginTop: 4,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
    },
  });
}; 