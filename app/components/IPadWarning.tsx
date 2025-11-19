/**
 * iPad Warning Component
 * 
 * Mostra un warning quando l'app viene utilizzata su iPad,
 * spiegando che è ottimizzata per iPhone
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { shouldShowIPadWarning, getIPadWarningMessage } from '../lib/utils/deviceUtils';

const IPAD_WARNING_SHOWN_KEY = 'bacchus_ipad_warning_shown';

interface IPadWarningProps {
  onDismiss?: () => void;
}

export const IPadWarning: React.FC<IPadWarningProps> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { i18n } = useTranslation();
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;

  useEffect(() => {
    checkAndShowWarning();
  }, []);

  const checkAndShowWarning = async () => {
    try {
      // Solo su iPad
      if (!shouldShowIPadWarning()) {
        return;
      }

      // Controlla se il warning è già stato mostrato
      const hasShownWarning = await AsyncStorage.getItem(IPAD_WARNING_SHOWN_KEY);
      
      if (!hasShownWarning) {
        setIsVisible(true);
      }
    } catch (error) {
      console.warn('Error checking iPad warning:', error);
    }
  };

  const handleDismiss = async () => {
    try {
      // Salva che il warning è stato mostrato
      await AsyncStorage.setItem(IPAD_WARNING_SHOWN_KEY, 'true');
      setIsVisible(false);
      onDismiss?.();
    } catch (error) {
      console.warn('Error saving iPad warning state:', error);
      setIsVisible(false);
      onDismiss?.();
    }
  };

  const showDetailedInfo = () => {
    const language = i18n.language as 'it' | 'en';
    const messages = getIPadWarningMessage(language);
    
    Alert.alert(
      messages.title,
      `${messages.message}\n\n${language === 'it' 
        ? 'Problemi noti su iPad:\n• Layout potrebbe essere tagliato\n• Alcuni pulsanti potrebbero sovrapporsi\n• Esperienza non ottimale\n\nL\'app è configurata come iPhone-only nelle impostazioni Apple.'
        : 'Known issues on iPad:\n• Layout may be cut off\n• Some buttons may overlap\n• Suboptimal experience\n\nThe app is configured as iPhone-only in Apple settings.'
      }`,
      [{ text: messages.button, onPress: handleDismiss }]
    );
  };

  if (!isVisible) {
    return null;
  }

  const language = i18n.language as 'it' | 'en';
  const messages = getIPadWarningMessage(language);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.header}>
            <Ionicons 
              name="warning" 
              size={32} 
              color="#FF9500" 
              style={styles.icon}
            />
            <Text style={[styles.title, { color: colors.text }]}>
              {messages.title}
            </Text>
          </View>

          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {messages.message}
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.infoButton, { borderColor: colors.border }]}
              onPress={showDetailedInfo}
            >
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoButtonText, { color: colors.primary }]}>
                {language === 'it' ? 'Dettagli' : 'Details'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dismissButton, { backgroundColor: colors.primary }]}
              onPress={handleDismiss}
            >
              <Text style={styles.dismissButtonText}>
                {messages.button}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Componente per mostrare un banner persistente (opzionale)
export const IPadBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { i18n } = useTranslation();
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;

  useEffect(() => {
    setIsVisible(shouldShowIPadWarning());
  }, []);

  if (!isVisible) {
    return null;
  }

  const language = i18n.language as 'it' | 'en';
  
  return (
    <View style={[styles.banner, { backgroundColor: '#FF950020', borderColor: '#FF9500' }]}>
      <Ionicons name="tablet-portrait" size={16} color="#FF9500" />
      <Text style={[styles.bannerText, { color: colors.text }]}>
        {language === 'it' 
          ? 'App ottimizzata per iPhone' 
          : 'iPhone-optimized app'
        }
      </Text>
      <TouchableOpacity onPress={() => setIsVisible(false)}>
        <Ionicons name="close" size={16} color="#FF9500" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  infoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
});
