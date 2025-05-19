import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Appearance } from 'react-native';
import { LIGHT_THEME, DARK_THEME } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Chiave di storage per il tema
const THEME_STORAGE_KEY = 'APP_THEME';

// Interfaccia del contesto del tema
interface ThemeContextProps {
  isDarkMode: boolean;
  currentTheme: typeof LIGHT_THEME | typeof DARK_THEME;
  toggleDarkMode: () => Promise<void>;
  setDarkMode: (value: boolean) => Promise<void>;
  isThemeReady: boolean;
}

// Creazione del contesto del tema con valori di default
const ThemeContext = createContext<ThemeContextProps>({
  isDarkMode: false,
  currentTheme: LIGHT_THEME,
  toggleDarkMode: async () => {},
  setDarkMode: async () => {},
  isThemeReady: false,
});

// Provider di contesto del tema
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Stato del tema
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isThemeReady, setIsThemeReady] = useState<boolean>(false);
  
  // Determina il tema corrente in base al valore di isDarkMode
  const currentTheme = isDarkMode ? DARK_THEME : LIGHT_THEME;

  // Carica il tema dalle preferenze salvate o dal sistema
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Tenta di caricare il tema dalle preferenze salvate
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        
        if (savedTheme !== null) {
          // Se esiste una preferenza salvata, usala
          setIsDarkMode(savedTheme === 'dark');
        } else {
          // Altrimenti usa le preferenze di sistema
          const colorScheme = Appearance.getColorScheme();
          setIsDarkMode(colorScheme === 'dark');
          
          // Salva la preferenza iniziale
          await AsyncStorage.setItem(THEME_STORAGE_KEY, colorScheme || 'light');
        }
        
        // Imposta il tema come pronto
        setIsThemeReady(true);
      } catch (error) {
        console.error('Errore nel caricamento del tema:', error);
        
        // In caso di errore, usa un valore di default e imposta comunque come pronto
        setIsDarkMode(false);
        setIsThemeReady(true);
      }
    };

    loadTheme();
  }, []);
  
  // Listener per i cambiamenti del tema di sistema
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Se non c'è una preferenza salvata, aggiorna il tema in base al sistema
      AsyncStorage.getItem(THEME_STORAGE_KEY).then((savedTheme) => {
        if (savedTheme === null) {
          setIsDarkMode(colorScheme === 'dark');
        }
      });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Funzione per cambiare il tema
  const toggleDarkMode = async () => {
    try {
      const newValue = !isDarkMode;
      setIsDarkMode(newValue);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newValue ? 'dark' : 'light');
    } catch (error) {
      console.error('Errore nel cambio del tema:', error);
    }
  };
  
  // Funzione per impostare direttamente la modalità scura
  const setDarkMode = async (value: boolean) => {
    try {
      setIsDarkMode(value);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, value ? 'dark' : 'light');
    } catch (error) {
      console.error('Errore nell\'impostazione del tema:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        currentTheme,
        toggleDarkMode,
        setDarkMode,
        isThemeReady,
      }}
    >
      {isThemeReady ? children : null}
    </ThemeContext.Provider>
  );
};

// Hook personalizzato per utilizzare il tema
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext; 