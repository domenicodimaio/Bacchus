/**
 * Live Activity Service per iOS
 * Gestisce la Dynamic Island e Lock Screen per mostrare il progresso BAC
 */

import { Platform } from 'react-native';
import { calculateBACProgress } from '../bac/calculator';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Chiavi storage per Live Activities
const STORAGE_KEYS = {
  LIVE_ACTIVITY_ID: 'bacchus_live_activity_id',
  LIVE_ACTIVITY_ENABLED: 'bacchus_live_activity_enabled'
};

export interface BACLiveActivityData {
  currentBAC: number;
  targetBAC: number;
  targetDescription: string;
  timeRemaining: string;
  progressPercentage: number;
  isAboveLegalLimit: boolean;
  userProfile: {
    name: string;
    emoji: string;
  };
  lastUpdated: string;
}

/**
 * Service per gestire le Live Activities di iOS
 */
class LiveActivityService {
  private currentActivityId: string | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.loadSettings();
  }

  private async loadSettings() {
    try {
      const savedActivityId = await AsyncStorage.getItem(STORAGE_KEYS.LIVE_ACTIVITY_ID);
      const savedEnabled = await AsyncStorage.getItem(STORAGE_KEYS.LIVE_ACTIVITY_ENABLED);
      
      this.currentActivityId = savedActivityId;
      this.isEnabled = savedEnabled === 'true';
    } catch (error) {
      console.error('Error loading Live Activity settings:', error);
    }
  }

  /**
   * Verifica se Live Activities sono supportate
   */
  isSupported(): boolean {
    return Platform.OS === 'ios' && Platform.Version >= '16.1';
  }

  /**
   * Abilita/Disabilita Live Activities
   */
  async setEnabled(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;
    await AsyncStorage.setItem(STORAGE_KEYS.LIVE_ACTIVITY_ENABLED, enabled.toString());
    
    if (!enabled && this.currentActivityId) {
      await this.stopLiveActivity();
    }
  }

  /**
   * Avvia una Live Activity per il BAC
   */
  async startLiveActivity(data: BACLiveActivityData): Promise<boolean> {
    if (!this.isSupported() || !this.isEnabled) {
      console.log('Live Activities not supported or disabled');
      return false;
    }

    try {
      console.log('🟡 LIVE ACTIVITY: Starting BAC Live Activity...', data);

      // Usa il modulo nativo iOS per avviare l'activity
      const { BACLiveActivity } = require('../../native/ios');
      
      if (BACLiveActivity && BACLiveActivity.startActivity) {
        const activityId = await BACLiveActivity.startActivity({
          // Dati per la Dynamic Island (minimal)
          dynamicIslandData: {
            leading: {
              image: 'glass.fill', // SF Symbol
              text: `${data.currentBAC.toFixed(2)}`
            },
            trailing: {
              image: 'clock.fill',
              text: data.timeRemaining
            },
            bottom: {
              text: `Target: ${data.targetDescription}`
            }
          },
          
          // Dati per la Lock Screen (dettagliato)
          lockScreenData: {
            title: `🍷 Bacchus - BAC Monitoring`,
            subtitle: `${data.userProfile.emoji} ${data.userProfile.name}`,
            content: {
              currentBAC: data.currentBAC,
              targetBAC: data.targetBAC,
              targetDescription: data.targetDescription,
              timeRemaining: data.timeRemaining,
              progressPercentage: data.progressPercentage,
              status: data.isAboveLegalLimit ? 'ABOVE_LIMIT' : 'BELOW_LIMIT',
              lastUpdated: data.lastUpdated
            }
          },

          // Configurazione update
          staleDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 ore
          relevanceScore: data.currentBAC > 0 ? 1.0 : 0.5
        });

        this.currentActivityId = activityId;
        await AsyncStorage.setItem(STORAGE_KEYS.LIVE_ACTIVITY_ID, activityId);
        
        console.log('✅ LIVE ACTIVITY: Started successfully with ID:', activityId);
        return true;
      }
    } catch (error) {
      console.error('❌ LIVE ACTIVITY: Error starting activity:', error);
    }

    return false;
  }

  /**
   * Aggiorna una Live Activity esistente
   */
  async updateLiveActivity(data: BACLiveActivityData): Promise<boolean> {
    if (!this.currentActivityId || !this.isSupported() || !this.isEnabled) {
      return false;
    }

    try {
      console.log('🔄 LIVE ACTIVITY: Updating activity...', data.currentBAC);

      const { BACLiveActivity } = require('../../native/ios');
      
      if (BACLiveActivity && BACLiveActivity.updateActivity) {
        await BACLiveActivity.updateActivity(this.currentActivityId, {
          dynamicIslandData: {
            leading: {
              image: 'glass.fill',
              text: `${data.currentBAC.toFixed(2)}`
            },
            trailing: {
              image: 'clock.fill', 
              text: data.timeRemaining
            },
            bottom: {
              text: `Target: ${data.targetDescription}`
            }
          },
          
          lockScreenData: {
            title: `🍷 Bacchus - BAC Monitoring`,
            subtitle: `${data.userProfile.emoji} ${data.userProfile.name}`,
            content: {
              currentBAC: data.currentBAC,
              targetBAC: data.targetBAC,
              targetDescription: data.targetDescription,
              timeRemaining: data.timeRemaining,
              progressPercentage: data.progressPercentage,
              status: data.isAboveLegalLimit ? 'ABOVE_LIMIT' : 'BELOW_LIMIT',
              lastUpdated: data.lastUpdated
            }
          }
        });

        console.log('✅ LIVE ACTIVITY: Updated successfully');
        return true;
      }
    } catch (error) {
      console.error('❌ LIVE ACTIVITY: Error updating activity:', error);
    }

    return false;
  }

  /**
   * Termina la Live Activity corrente
   */
  async stopLiveActivity(): Promise<void> {
    if (!this.currentActivityId) {
      return;
    }

    try {
      console.log('🛑 LIVE ACTIVITY: Stopping activity...', this.currentActivityId);

      const { BACLiveActivity } = require('../../native/ios');
      
      if (BACLiveActivity && BACLiveActivity.endActivity) {
        await BACLiveActivity.endActivity(this.currentActivityId);
      }

      this.currentActivityId = null;
      await AsyncStorage.removeItem(STORAGE_KEYS.LIVE_ACTIVITY_ID);
      
      console.log('✅ LIVE ACTIVITY: Stopped successfully');
    } catch (error) {
      console.error('❌ LIVE ACTIVITY: Error stopping activity:', error);
    }
  }

  /**
   * Crea i dati per la Live Activity dal BAC corrente
   */
  createLiveActivityData(
    currentBAC: number,
    userProfile: { name: string; emoji: string }
  ): BACLiveActivityData {
    const progress = calculateBACProgress(currentBAC);
    
    return {
      currentBAC,
      targetBAC: progress.targetBAC,
      targetDescription: progress.targetDescription,
      timeRemaining: progress.timeRemainingFormatted,
      progressPercentage: progress.progressPercentage,
      isAboveLegalLimit: progress.isAboveLegalLimit,
      userProfile,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Aggiorna automaticamente la Live Activity se è attiva
   */
  async updateIfActive(currentBAC: number, userProfile?: { name: string; emoji: string }): Promise<void> {
    if (!this.currentActivityId || !this.isEnabled) {
      return;
    }

    const defaultProfile = { name: 'User', emoji: '👤' };
    const profile = userProfile || defaultProfile;
    
    // Se BAC è 0, termina la Live Activity
    if (currentBAC <= 0.01) {
      await this.stopLiveActivity();
      return;
    }

    const data = this.createLiveActivityData(currentBAC, profile);
    await this.updateLiveActivity(data);
  }

  /**
   * Avvia automaticamente la Live Activity quando inizia una sessione
   */
  async startIfNeeded(currentBAC: number, userProfile: { name: string; emoji: string }): Promise<void> {
    if (!this.isEnabled || this.currentActivityId || currentBAC <= 0.01) {
      return;
    }

    const data = this.createLiveActivityData(currentBAC, userProfile);
    await this.startLiveActivity(data);
  }
}

// Esporta l'istanza singleton
export const liveActivityService = new LiveActivityService();
export default liveActivityService;
