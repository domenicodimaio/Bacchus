/**
 * Widget Service per iOS
 * Gestisce i widget della home screen per mostrare il BAC corrente
 */

import { Platform } from 'react-native';
import { calculateBACProgress } from '../bac/calculator';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Chiavi storage per Widget
const STORAGE_KEYS = {
  WIDGET_ENABLED: 'bacchus_widget_enabled',
  WIDGET_SIZE: 'bacchus_widget_size', // small, medium, large
  LAST_WIDGET_UPDATE: 'bacchus_last_widget_update'
};

export interface BACWidgetData {
  currentBAC: number;
  targetBAC: number;
  targetDescription: string;
  timeRemaining: string;
  progressPercentage: number;
  status: 'safe' | 'caution' | 'danger';
  userProfile: {
    name: string;
    emoji: string;
    color: string;
  };
  lastUpdated: string;
  timestamp: number;
}

/**
 * Service per gestire i Widget iOS
 */
class WidgetService {
  private isEnabled: boolean = true;
  private preferredSize: 'small' | 'medium' | 'large' = 'medium';

  constructor() {
    this.loadSettings();
  }

  private async loadSettings() {
    try {
      const savedEnabled = await AsyncStorage.getItem(STORAGE_KEYS.WIDGET_ENABLED);
      const savedSize = await AsyncStorage.getItem(STORAGE_KEYS.WIDGET_SIZE);
      
      this.isEnabled = savedEnabled !== 'false'; // Default enabled
      this.preferredSize = (savedSize as any) || 'medium';
    } catch (error) {
      console.error('Error loading Widget settings:', error);
    }
  }

  /**
   * Verifica se i Widget sono supportati
   */
  isSupported(): boolean {
    return Platform.OS === 'ios' && Platform.Version >= '14.0';
  }

  /**
   * Abilita/Disabilita Widget
   */
  async setEnabled(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;
    await AsyncStorage.setItem(STORAGE_KEYS.WIDGET_ENABLED, enabled.toString());
    
    if (enabled) {
      // Forza un aggiornamento quando viene riabilitato
      await this.reloadAllTimelines();
    }
  }

  /**
   * Imposta la dimensione preferita del widget
   */
  async setPreferredSize(size: 'small' | 'medium' | 'large'): Promise<void> {
    this.preferredSize = size;
    await AsyncStorage.setItem(STORAGE_KEYS.WIDGET_SIZE, size);
    await this.reloadAllTimelines();
  }

  /**
   * Crea i dati per il widget dal BAC corrente
   */
  createWidgetData(
    currentBAC: number,
    userProfile: { name: string; emoji: string; color: string }
  ): BACWidgetData {
    const progress = calculateBACProgress(currentBAC);
    
    // Determina lo status basato sui limiti italiani
    let status: 'safe' | 'caution' | 'danger' = 'safe';
    if (currentBAC >= 0.8) {
      status = 'danger';
    } else if (currentBAC >= 0.5) {
      status = 'caution';
    }
    
    return {
      currentBAC,
      targetBAC: progress.targetBAC,
      targetDescription: progress.targetDescription,
      timeRemaining: progress.timeRemainingFormatted,
      progressPercentage: progress.progressPercentage,
      status,
      userProfile,
      lastUpdated: new Date().toISOString(),
      timestamp: Date.now()
    };
  }

  /**
   * Aggiorna il widget con i nuovi dati BAC
   */
  async updateWidget(data: BACWidgetData): Promise<boolean> {
    if (!this.isSupported() || !this.isEnabled) {
      console.log('Widget not supported or disabled');
      return false;
    }

    try {
      console.log('🔧 WIDGET: Updating with BAC:', data.currentBAC);

      const { BACWidget } = require('../../native/ios');
      
      if (BACWidget && BACWidget.updateWidget) {
        await BACWidget.updateWidget({
          // Dati per widget piccolo (solo BAC)
          smallWidget: {
            currentBAC: data.currentBAC.toFixed(2),
            emoji: data.userProfile.emoji,
            status: data.status,
            color: data.userProfile.color
          },
          
          // Dati per widget medio (BAC + tempo)
          mediumWidget: {
            currentBAC: data.currentBAC.toFixed(2),
            targetBAC: data.targetBAC.toFixed(2),
            timeRemaining: data.timeRemaining,
            emoji: data.userProfile.emoji,
            name: data.userProfile.name,
            status: data.status,
            progressPercentage: Math.round(data.progressPercentage),
            color: data.userProfile.color
          },
          
          // Dati per widget grande (dettagli completi)
          largeWidget: {
            currentBAC: data.currentBAC.toFixed(2),
            targetBAC: data.targetBAC.toFixed(2),
            targetDescription: data.targetDescription,
            timeRemaining: data.timeRemaining,
            emoji: data.userProfile.emoji,
            name: data.userProfile.name,
            status: data.status,
            progressPercentage: Math.round(data.progressPercentage),
            lastUpdated: new Date(data.lastUpdated).toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            color: data.userProfile.color,
            statusText: this.getStatusText(data.status, data.currentBAC)
          },
          
          // Metadati
          metadata: {
            timestamp: data.timestamp,
            preferredSize: this.preferredSize
          }
        });

        // Salva timestamp ultimo aggiornamento
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_WIDGET_UPDATE, data.timestamp.toString());
        
        console.log('✅ WIDGET: Updated successfully');
        return true;
      }
    } catch (error) {
      console.error('❌ WIDGET: Error updating widget:', error);
    }

    return false;
  }

  /**
   * Ricarica tutte le timeline dei widget
   */
  async reloadAllTimelines(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    try {
      console.log('🔄 WIDGET: Reloading all timelines...');

      const { BACWidget } = require('../../native/ios');
      
      if (BACWidget && BACWidget.reloadAllTimelines) {
        await BACWidget.reloadAllTimelines();
        console.log('✅ WIDGET: All timelines reloaded');
      }
    } catch (error) {
      console.error('❌ WIDGET: Error reloading timelines:', error);
    }
  }

  /**
   * Aggiorna automaticamente il widget se abilitato
   */
  async updateIfEnabled(currentBAC: number, userProfile?: { name: string; emoji: string; color: string }): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    const defaultProfile = { 
      name: 'User', 
      emoji: '👤', 
      color: '#FF5252' 
    };
    const profile = userProfile || defaultProfile;
    
    const data = this.createWidgetData(currentBAC, profile);
    await this.updateWidget(data);
  }

  /**
   * Ottiene il testo di stato localizzato
   */
  private getStatusText(status: 'safe' | 'caution' | 'danger', bac: number): string {
    switch (status) {
      case 'safe':
        return bac > 0 ? 'Sotto il limite' : 'Sobrio';
      case 'caution':
        return 'Attenzione - Limite superato';
      case 'danger':
        return 'Pericolo - Non guidare';
      default:
        return 'Monitoraggio BAC';
    }
  }

  /**
   * Pulisce i dati del widget quando non c'è sessione attiva
   */
  async clearWidget(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    const emptyData = this.createWidgetData(0, {
      name: 'User',
      emoji: '😊',
      color: '#33CC66'
    });

    await this.updateWidget(emptyData);
  }

  /**
   * Ottiene l'ultimo timestamp di aggiornamento
   */
  async getLastUpdateTimestamp(): Promise<number | null> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_WIDGET_UPDATE);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('Error getting last widget update timestamp:', error);
      return null;
    }
  }
}

// Esporta l'istanza singleton
export const widgetService = new WidgetService();
export default widgetService;
