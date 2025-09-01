/**
 * Live Activity Service - iOS Dynamic Island & Lock Screen
 * Gestisce le Live Activities per la Dynamic Island e Lock Screen
 */

export interface LiveActivityData {
  currentBAC: number;
  targetBAC: number; // 0.00 se < 0.5, altrimenti 0.51 (limite legale)
  timeToTarget: string; // "2h 15min" 
  sessionId: string;
  userName: string;
}

class LiveActivityService {
  private activeActivityId: string | null = null;

  /**
   * Avvia una nuova Live Activity
   */
  async startLiveActivity(data: LiveActivityData): Promise<string | null> {
    try {
      console.log('🔴 Live Activity Start:', data);
      
      // TODO: Implementare avvio Live Activity
      // const activityId = await NativeModules.BacchusLiveActivityModule?.startActivity(data);
      // this.activeActivityId = activityId;
      
      // Per ora simuliamo un ID
      this.activeActivityId = `activity_${Date.now()}`;
      return this.activeActivityId;
      
    } catch (error) {
      console.error('❌ Live Activity Start Error:', error);
      return null;
    }
  }

  /**
   * Aggiorna la Live Activity esistente
   */
  async updateLiveActivity(data: LiveActivityData): Promise<void> {
    if (!this.activeActivityId) {
      console.warn('⚠️ No active Live Activity to update');
      return;
    }

    try {
      console.log('🔄 Live Activity Update:', data);
      
      // TODO: Implementare aggiornamento Live Activity
      // await NativeModules.BacchusLiveActivityModule?.updateActivity(this.activeActivityId, data);
      
    } catch (error) {
      console.error('❌ Live Activity Update Error:', error);
    }
  }

  /**
   * Termina la Live Activity
   */
  async endLiveActivity(): Promise<void> {
    if (!this.activeActivityId) {
      return;
    }

    try {
      console.log('⏹️ Live Activity End:', this.activeActivityId);
      
      // TODO: Implementare fine Live Activity
      // await NativeModules.BacchusLiveActivityModule?.endActivity(this.activeActivityId);
      
      this.activeActivityId = null;
      
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