import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { usePurchase } from '../contexts/PurchaseContext';

type PremiumFeatureBlockProps = {
  featureName: string;
  icon: string;
  message?: string;
  onPress?: () => void;
};

/**
 * Componente che mostra un blocco grafico quando una funzionalità è disponibile solo per utenti premium
 */
const PremiumFeatureBlock = ({ 
  featureName, 
  icon, 
  message, 
  onPress 
}: PremiumFeatureBlockProps) => {
  const { t } = useTranslation(['purchases', 'common']);
  const { currentTheme } = useTheme();
  const { showSubscriptionScreen } = usePurchase();
  const colors = currentTheme.COLORS;
  
  const handleUpgrade = () => {
    if (onPress) {
      onPress();
    } else {
      showSubscriptionScreen();
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name={icon as any} size={36} color={colors.primary} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('premiumRequired')}
          </Text>
          
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {message || t('featureNeedsPremium', { feature: featureName })}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleUpgrade}
      >
        <Ionicons name="star" size={16} color="#FFFFFF" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>
          {t('upgradeToPremium')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default PremiumFeatureBlock; 