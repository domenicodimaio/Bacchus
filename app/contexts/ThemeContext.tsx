import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_THEME, LIGHT_THEME } from '../constants/theme';

export type ThemeType = 'dark' | 'light' | 'system';
export const THEME_STORAGE_KEY = '@alcoltest_theme';

type ThemeContextType = {
  theme: ThemeType;
  currentTheme: typeof DARK_THEME | typeof LIGHT_THEME;
  setTheme: (theme: ThemeType) => Promise<void>;
  isDarkMode: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeType>('system');
  
  // Determina se è attiva la dark mode basandosi sulle impostazioni
  const isDarkMode = theme === 'system' 
    ? colorScheme === 'dark' 
    : theme === 'dark';

  // Il tema attuale basato sulla modalità
  const currentTheme = isDarkMode ? DARK_THEME : LIGHT_THEME;

  useEffect(() => {
    // Carica il tema salvato all'avvio
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system')) {
          setThemeState(savedTheme as ThemeType);
        }
      } catch (error) {
        console.error('Errore nel caricare il tema:', error);
      }
    };

    loadTheme();
  }, []);

  // Funzione per cambiare tema
  const setTheme = async (newTheme: ThemeType) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Errore nel salvare il tema:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, currentTheme, setTheme, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personalizzato per utilizzare il tema
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Esportiamo un componente vuoto come default per soddisfare Expo Router
export default function ThemeContextExport() {
  return null;
} 