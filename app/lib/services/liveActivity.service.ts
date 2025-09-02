import { NativeModules, Platform } from 'react-native';

const { BacchusNativeModules } = NativeModules;

export interface LiveActivityData {
  currentBAC: number;
  targetBAC: number; // 0.00 se < 0.5, altrimenti 0.51 (limite legale)
  timeToSober: string; // "2h 15min" 
  userName: string;
}

class LiveActivityService {
  private activeActivityId: string | null = null;

  /**
   * Avvia una nuova Live Activity
   */
  async startLiveActivity(data: LiveActivityData): Promise<string | null> {
    if (Platform.OS !== 'ios' || !BacchusNativeModules) {
      console.log('🍎 Live Activity not available on this platform');
      return null;
    }

    try {
      console.log('🔴 Live Activity Start:', data);
      
      const activityId = await BacchusNativeModules.startLiveActivity({
        currentBAC: data.currentBAC,
        timeToSober: data.timeToSober,
        userName: data.userName,
        targetBAC: data.targetBAC,
      });
      
      this.activeActivityId = activityId;
      console.log('✅ Live Activity started:', activityId);
      return activityId;
      
    } catch (error) {
      console.error('❌ Live Activity Start Error:', error);
      return null;
    }
  }

  /**
   * Aggiorna la Live Activity esistente
   */
  async updateLiveActivity(data: LiveActivityData): Promise<void> {
    if (Platform.OS !== 'ios' || !BacchusNativeModules) {
      return;
    }

    if (!this.activeActivityId) {
      console.warn('⚠️ No active Live Activity to update');
      return;
    }

    try {
      console.log('🔄 Live Activity Update:', data);
      
      await BacchusNativeModules.updateLiveActivity({
        currentBAC: data.currentBAC,
        timeToSober: data.timeToSober,
        targetBAC: data.targetBAC,
      });
      
      console.log('✅ Live Activity updated: BAC', data.currentBAC);
    } catch (error) {
      console.error('❌ Live Activity Update Error:', error);
    }
  }

  /**
   * Termina la Live Activity
   */
  async endLiveActivity(): Promise<void> {
    if (Platform.OS !== 'ios' || !BacchusNativeModules) {
      return;
    }

    if (!this.activeActivityId) {
      return;
    }

    try {
      console.log('⏹️ Live Activity End:', this.activeActivityId);
      
      await BacchusNativeModules.endLiveActivity();
      this.activeActivityId = null;
      console.log('✅ Live Activity ended');
      
    } catch (error) {
      console.error('❌ Live Activity End Error:', error);
    }
  }

  /**
   * Verifica se c'è una Live Activity attiva
   */
  get hasActiveActivity(): boolean {
    return this.activeActivityId !== null;
  }
}

export const liveActivityService = new LiveActivityService();