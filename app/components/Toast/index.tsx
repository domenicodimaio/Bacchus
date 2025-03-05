import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

// Tipi di toast
type ToastType = 'success' | 'error' | 'info' | 'warning';

// Interfaccia per il toast
interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

// Contesto per il toast
interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Provider del toast
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('info');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const insets = useSafeAreaInsets();

  // Funzione per mostrare il toast
  const showToast = useCallback(({ message, type = 'info', duration = 3000 }: ToastOptions) => {
    setMessage(message);
    setToastType(type);
    setVisible(true);
    
    // Animazione di fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Nascondi il toast dopo la durata specificata
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
      });
    }, duration);
    
    return () => clearTimeout(timer);
  }, [fadeAnim]);
  
  // Colori in base al tipo di toast
  const getToastColor = () => {
    switch (toastType) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.danger;
      case 'warning':
        return colors.caution;
      case 'info':
      default:
        return colors.primary;
    }
  };
  
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {visible && (
        <Animated.View 
          style={[
            styles.container, 
            { 
              opacity: fadeAnim,
              backgroundColor: colors.cardBackground,
              borderLeftColor: getToastColor(),
              top: insets.top + 10
            }
          ]}
        >
          <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

// Hook per utilizzare il toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Stili
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 9999,
  },
  message: {
    fontSize: 16,
    flex: 1,
  },
});

// Aggiungi l'export default in fondo al file
export default ToastProvider; 