import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import i18n from '../i18n'; // Importa il sistema i18n unificato
import { LANGUAGE_STORAGE_KEY, loadLanguageFromStorage, saveLanguageToStorage } from '../i18n';

type Language = 'it' | 'en';

type LanguageContextType = {
  language: Language;
  isRTL: boolean;
  changeLanguage: (lang: Language) => Promise<void>;
};

export const LanguageContext = createContext<LanguageContextType>({
  language: 'it', // Default è italiano come specificato in i18n
  isRTL: false,
  changeLanguage: async () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('it');
  const [isRTL, setIsRTL] = useState(false);

  // Carica la lingua dalle preferenze salvate
  useEffect(() => {
    const initLanguage = async () => {
      try {
        console.log('🌍 [LanguageContext] Inizializzazione lingua...');
        // Utilizza la funzione dal sistema i18n unificato
        const savedLanguage = await loadLanguageFromStorage();
        if (savedLanguage && (savedLanguage === 'it' || savedLanguage === 'en')) {
          setLanguage(savedLanguage as Language);
          // La direzione RTL non è più supportata, ora solo IT e EN
          setIsRTL(false);
          console.log(`🌍 [LanguageContext] Lingua caricata: ${savedLanguage}`);
        }
      } catch (error) {
        console.error('🌍 [LanguageContext] Errore nel caricare le preferenze di lingua:', error);
      }
    };

    initLanguage();
  }, []);

  // Funzione per cambiare lingua
  const changeLanguage = async (lang: Language) => {
    try {
      console.log(`🌍 [LanguageContext] Cambio lingua a: ${lang}`);
      
      // Verifica se la lingua è supportata
      if (lang !== 'it' && lang !== 'en') {
        console.warn(`🌍 [LanguageContext] Lingua non supportata: ${lang}, uso il default (it)`);
        lang = 'it';
      }
      
      // Utilizza la funzione dal sistema i18n unificato
      await saveLanguageToStorage(lang);
      
      // Aggiorna lo stato del context
      setLanguage(lang);
      
      console.log(`🌍 [LanguageContext] Lingua cambiata con successo a: ${lang}`);
      return;
    } catch (error) {
      console.error('🌍 [LanguageContext] Errore nel cambiare lingua:', error);
      throw error;
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        isRTL,
        changeLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageProvider; 