import { NativeModules, Platform } from 'react-native';

const { BacchusNativeModules } = NativeModules;

export interface LiveActivityData {
  currentBAC: number;
  targetBAC: number; // 0.00 se < 0.5, altrimenti 0.51 (limite legale)
  timeToSober: string; // "2h 15min" 
  timeToLegal: string; // "1h 30min" - tempo per tornare sotto 0.5g/l
  userName: string;
  status: 'safe' | 'caution' | 'danger';
  progressPercentage: number; // 0-100 per la barra di progresso
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
        timeToLegal: data.timeToLegal,
        userName: data.userName,
        targetBAC: data.targetBAC,
        status: data.status,
        progressPercentage: data.progressPercentage,
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
        timeToLegal: data.timeToLegal,
        targetBAC: data.targetBAC,
        status: data.status,
        progressPercentage: data.progressPercentage,
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

  /**
   * Calcola i dati per la Live Activity basati sulla sessione corrente
   */
  calculateLiveActivityData(session: any): LiveActivityData {
    const currentBAC = session.currentBAC || 0;
    const timeToSober = session.soberTime || '0h 0m';
    const timeToLegal = session.legalTime || '0h 0m';
    const userName = session.profile?.name || 'User';
    const status = session.status || 'safe';
    
    // Determina il target BAC e il tempo appropriato
    let targetBAC = 0.0;
    let displayTime = timeToSober;
    let progressPercentage = 0;
    
    if (currentBAC > 0.05) {
      // Se sopra il limite legale (0.5g/l), mostra tempo per tornare sotto 0.5g/l
      targetBAC = 0.05;
      displayTime = timeToLegal;
      
      // Calcola progresso: da currentBAC a 0.05
      const totalProgress = Math.max(currentBAC - 0.05, 0);
      const maxBAC = Math.max(currentBAC, 0.1); // Assumiamo un max ragionevole
      progressPercentage = Math.min(100, (totalProgress / (maxBAC - 0.05)) * 100);
    } else {
      // Se sotto 0.5g/l, mostra tempo per tornare a 0.0g/l
      targetBAC = 0.0;
      displayTime = timeToSober;
      
      // Calcola progresso: da currentBAC a 0.0
      const maxBAC = Math.max(currentBAC, 0.05);
      progressPercentage = Math.min(100, (currentBAC / maxBAC) * 100);
    }
    
    return {
      currentBAC,
      targetBAC,
      timeToSober: displayTime,
      timeToLegal,
      userName,
      status,
      progressPercentage: Math.round(progressPercentage)
    };
  }
}

export const liveActivityService = new LiveActivityService();