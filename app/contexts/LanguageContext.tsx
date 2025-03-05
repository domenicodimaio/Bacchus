import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import i18n from '../localization/i18n';

type Language = 'it' | 'en' | 'ar';

type LanguageContextType = {
  language: Language;
  isRTL: boolean;
  changeLanguage: (lang: Language) => Promise<void>;
};

const LANGUAGE_STORAGE_KEY = 'alcoltest_language';

export const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  isRTL: false,
  changeLanguage: async () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [isRTL, setIsRTL] = useState(false);

  // Carica la lingua dalle preferenze salvate
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage && (savedLanguage === 'it' || savedLanguage === 'en' || savedLanguage === 'ar')) {
          await applyLanguage(savedLanguage as Language);
        } else {
          // Usa la lingua di default del dispositivo o la lingua predefinita
          await applyLanguage('it');
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
        // In caso di errore, usa l'italiano come lingua predefinita
        await applyLanguage('it');
      }
    };

    loadLanguage();
  }, []);

  // Applica la lingua all'app
  const applyLanguage = async (lang: Language) => {
    try {
      // Aggiorna la lingua in i18n
      await i18n.changeLanguage(lang);
      
      // Verifica se la lingua è RTL (right-to-left)
      const isRightToLeft = lang === 'ar';
      
      // Imposta la direzione RTL se necessario
      if (I18nManager.isRTL !== isRightToLeft) {
        I18nManager.forceRTL(isRightToLeft);
      }
      
      // Aggiorna lo stato
      setLanguage(lang);
      setIsRTL(isRightToLeft);
      
      // Salva la preferenza
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      console.error('Error applying language:', error);
    }
  };

  // Funzione per cambiare lingua
  const changeLanguage = async (lang: Language) => {
    await applyLanguage(lang);
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