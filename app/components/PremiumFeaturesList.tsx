import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { usePurchase } from '../contexts/PurchaseContext';

interface PremiumFeaturesListProps {
  compact?: boolean;
}

/**
 * Componente che mostra un riepilogo delle funzionalità premium e lo stato di accesso
 * Implementato con gestione errori robusta per evitare crash in TestFlight
 */
const PremiumFeaturesList = ({ compact = true }: PremiumFeaturesListProps) => {
  try {
    const { t } = useTranslation(['purchases', 'settings', 'common']);
    const { currentTheme } = useTheme();
    const purchaseContext = usePurchase();
    const colors = currentTheme.COLORS;
    
    // Verifichiamo che il context esista prima di utilizzarlo
    if (!purchaseContext) {
      console.error('PurchaseContext non disponibile');
      return null;
    }
    
    // Estraggo le funzioni in modo sicuro
    const { 
      isPremium = false, 
      getPremiumFeatures,
      showSubscriptionScreen,
      toggleSimulatePremium
    } = purchaseContext;
    
    // Ottieni le feature in modo sicuro
    let features;
    try {
      features = getPremiumFeatures();
    } catch (error) {
      console.error('Errore ottenendo le funzionalità premium:', error);
      features = {
        canUseWidgets: false,
        canUseLiveActivities: false,
        canCreateUnlimitedSessions: false,
        sessionLimit: 2,
        remainingSessions: 0,
        canExportData: false,
        hasDetailedStatistics: false,
        hasPersonalizedMetabolism: false,
        canRemoveAds: false
      };
    }
    
    // Lista delle funzionalità premium
    const premiumFeatures = [
      {
        id: 'unlimitedSessions',
        name: t('unlimitedSessions', { ns: 'purchases', defaultValue: 'Sessioni illimitate' }),
        description: t('unlimitedSessionsDesc', { ns: 'purchases', defaultValue: 'Crea quante sessioni vuoi senza limiti settimanali' }),
        icon: 'infinite-outline',
        available: features.canCreateUnlimitedSessions
      },
      {
        id: 'exportData',
        name: t('exportData', { ns: 'purchases', defaultValue: 'Esporta dati' }),
        description: t('exportDataDesc', { ns: 'purchases', defaultValue: 'Esporta i tuoi dati in formato CSV o PDF' }),
        icon: 'download-outline',
        available: features.canExportData
      },
      {
        id: 'detailedStats',
        name: t('detailedStats', { ns: 'purchases', defaultValue: 'Statistiche dettagliate' }),
        description: t('detailedStatsDesc', { ns: 'purchases', defaultValue: 'Statistiche avanzate e approfondite sul tuo consumo' }),
        icon: 'stats-chart-outline',
        available: features.hasDetailedStatistics
      },
      {
        id: 'personalizedMetabolism',
        name: t('personalizedMetabolism', { ns: 'purchases', defaultValue: 'Metabolismo personalizzato' }),
        description: t('personalizedMetabolismDesc', { ns: 'purchases', defaultValue: 'Calcolo personalizzato del metabolismo dell\'alcol' }),
        icon: 'body-outline',
        available: features.hasPersonalizedMetabolism
      }
    ];
  
    // Handler per mostrare la schermata premium in modo sicuro
    const handleShowPremiumScreen = () => {
      try {
        if (showSubscriptionScreen) {
          showSubscriptionScreen();
        }
      } catch (error) {
        console.error('Errore mostrando la schermata premium:', error);
      }
    };
    
    // Handler per testare le funzionalità premium in modo sicuro
    const handleTestPremium = async () => {
      try {
        if (toggleSimulatePremium) {
          await toggleSimulatePremium(!isPremium);
        }
      } catch (error) {
        console.error('Errore nel toggle premium:', error);
      }
    };
    
    return (
      <LinearGradient
        colors={isPremium 
          ? [colors.cardBackground, colors.cardBackground] 
          : [colors.cardElevated, colors.cardBackground]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, { 
          borderColor: isPremium ? colors.premium : colors.border,
          borderWidth: isPremium ? 1 : 0,
          ...Platform.select({
            ios: {
              shadowColor: isPremium ? colors.premium : colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isPremium ? 0.6 : 0.3,
              shadowRadius: isPremium ? 8 : 4,
            },
            android: {
              elevation: isPremium ? 6 : 3,
            },
          }),
        }]}
      >
        {/* Premium Badge */}
        {isPremium && (
          <View style={[styles.premiumBadge, { backgroundColor: colors.premium }]}>
            <Ionicons name="star" size={14} color="#FFFFFF" />
            <Text style={styles.premiumBadgeText}>Premium</Text>
          </View>
        )}
        
        <View style={styles.headerContainer}>
          <View style={styles.titleContainer}>
            <LinearGradient
              colors={[colors.premium, colors.warning]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.iconBackground}
            >
              <Ionicons name="star" size={20} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.title, { color: colors.text }]}>
              {isPremium 
                ? t('premiumActive', { ns: 'purchases', defaultValue: 'Premium Attivo' })
                : t('premiumFeatures', { ns: 'purchases', defaultValue: 'Funzionalità Premium' })
              }
            </Text>
          </View>
          
          {!compact && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isPremium 
                ? t('enjoyPremium', { ns: 'purchases', defaultValue: 'Goditi tutti i vantaggi del premium!' })
                : t('upgradeToUnlock', { ns: 'purchases', defaultValue: 'Passa a Premium per sbloccare:' })
              }
            </Text>
          )}
        </View>
        
        {compact ? (
          // Versione compatta per la schermata impostazioni
          <View style={styles.compactFeaturesContainer}>
            {premiumFeatures.map((feature) => (
              <View
                key={feature.id}
                style={[
                  styles.compactFeature,
                  {
                    backgroundColor: feature.available 
                      ? `${colors.cardElevated}` 
                      : `${colors.cardBackground}`,
                    borderColor: feature.available 
                      ? colors.success + '40' 
                      : colors.border
                  }
                ]}
              >
                <View style={[
                  styles.featureIconContainer, 
                  { 
                    backgroundColor: feature.available 
                      ? colors.success + '20' 
                      : colors.danger + '20'
                  }
                ]}>
                  <Ionicons
                    name={feature.available ? 'checkmark' : 'close'}
                    size={14}
                    color={feature.available ? colors.success : colors.danger}
                  />
                </View>
                <Text style={[
                  styles.compactFeatureName, 
                  { 
                    color: feature.available ? colors.text : colors.textSecondary,
                    fontWeight: feature.available ? '600' : '400'
                  }]} 
                  numberOfLines={2}
                >
                  {feature.name}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          // Versione estesa
          <View style={styles.featuresContainer}>
            {premiumFeatures.map((feature) => (
              <View key={feature.id} style={styles.featureRow}>
                <View style={[
                  styles.iconContainer, 
                  { 
                    backgroundColor: feature.available 
                      ? colors.success + '20' 
                      : colors.cardBackground 
                  }
                ]}>
                  <Ionicons name={feature.icon as any} size={20} color={feature.available ? colors.success : colors.primary} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={[
                    styles.featureName, 
                    { 
                      color: colors.text,
                      fontWeight: feature.available ? '600' : '400'
                    }
                  ]}>
                    {feature.name}
                  </Text>
                  <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                    {feature.description}
                  </Text>
                </View>
                <Ionicons
                  name={feature.available ? 'checkmark-circle' : 'close-circle'}
                  size={22}
                  color={feature.available ? colors.success : colors.danger}
                />
              </View>
            ))}
          </View>
        )}
        
        <View style={styles.actionsContainer}>
          {!isPremium && showSubscriptionScreen && (
            <TouchableOpacity 
              style={styles.upgradeButton}
              onPress={handleShowPremiumScreen}
            >
              <LinearGradient
                colors={[colors.premium, '#D4A017']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Ionicons name="star" size={16} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>
                  {t('getPremium', { ns: 'purchases', defaultValue: 'Passa a Premium' })}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          {/* Pulsante per testare il premium - solo in modalità sviluppo */}
          {__DEV__ && toggleSimulatePremium && (
            <TouchableOpacity 
              style={[styles.testButton, { 
                borderColor: colors.border,
                backgroundColor: colors.cardElevated + '80'
              }]}
              onPress={handleTestPremium}
            >
              <Ionicons
                name={isPremium ? 'flask-outline' : 'flask'}
                size={15}
                color={colors.primary}
                style={styles.testIcon}
              />
              <Text style={[styles.testButtonText, { color: colors.text }]}>
                {isPremium 
                  ? t('disablePremiumTest', { ns: 'purchases', defaultValue: 'Disattiva Test Premium' })
                  : t('testPremium', { ns: 'purchases', defaultValue: 'Testa Premium' })
                }
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    );
  } catch (error) {
    console.error('Errore fatale in PremiumFeaturesList:', error);
    // In caso di errore fatale, restituiamo un componente minimo che non crasherà
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    padding: 0,
    position: 'relative',
  },
  premiumBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    zIndex: 10,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  headerContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBackground: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 42,
  },
  compactFeaturesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  compactFeature: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    minHeight: 42,
  },
  featureIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  compactFeatureName: {
    fontSize: 13,
    flex: 1,
  },
  featuresContainer: {
    padding: 16,
    paddingTop: 0,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureName: {
    fontSize: 15,
  },
  featureDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  actionsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  upgradeButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  testButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  testIcon: {
    marginRight: 6,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default PremiumFeaturesList; 