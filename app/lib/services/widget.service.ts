import { NativeModules, Platform } from 'react-native';

const { BacchusNativeModules } = NativeModules;

export interface WidgetData {
  currentBAC: number;
  sessionActive: boolean;
  userName: string;
  timeToSober: string;
  timeToLegal: string;
  status: 'safe' | 'caution' | 'danger';
  sessionDuration?: string;
  drinksCount?: number;
  lastDrinkTime?: string;
}

class WidgetService {
  /**
   * Aggiorna i dati del widget iOS
   */
  async updateWidget(data: WidgetData): Promise<void> {
    if (Platform.OS !== 'ios' || !BacchusNativeModules) {
      console.log('🍎 Widget not available on this platform');
      return;
    }

    try {
      console.log('📱 Widget Update:', data);
      
      await BacchusNativeModules.updateWidget({
        currentBAC: data.currentBAC,
        sessionActive: data.sessionActive,
        userName: data.userName,
        timeToSober: data.timeToSober,
        timeToLegal: data.timeToLegal,
        status: data.status,
        sessionDuration: data.sessionDuration || '0h 0m',
        drinksCount: data.drinksCount || 0,
        lastDrinkTime: data.lastDrinkTime || '',
      });
      
      console.log('✅ Widget updated: BAC', data.currentBAC, 'Active:', data.sessionActive);
    } catch (error) {
      console.error('❌ Widget Update Error:', error);
    }
  }

  /**
   * Rimuove tutti i widget dalla home screen
   */
  async clearWidgets(): Promise<void> {
    if (Platform.OS !== 'ios' || !BacchusNativeModules) {
      return;
    }

    try {
      console.log('🗑️ Widget Clear');
      
      await BacchusNativeModules.clearWidget();
      console.log('✅ Widget cleared');
      
    } catch (error) {
      console.error('❌ Widget Clear Error:', error);
    }
  }

  /**
   * Calcola i dati per il widget basati sulla sessione corrente
   */
  calculateWidgetData(session: any | null): WidgetData {
    if (!session) {
      // Nessuna sessione attiva - mostra widget informativo
      return {
        currentBAC: 0,
        sessionActive: false,
        userName: 'Bacchus',
        timeToSober: '0h 0m',
        timeToLegal: '0h 0m',
        status: 'safe',
        sessionDuration: '0h 0m',
        drinksCount: 0,
        lastDrinkTime: ''
      };
    }

    const currentBAC = session.currentBAC || 0;
    const timeToSober = session.soberTime || '0h 0m';
    const timeToLegal = session.legalTime || '0h 0m';
    const userName = session.profile?.name || 'User';
    const status = session.status || 'safe';
    const sessionDuration = session.sessionDuration || '0h 0m';
    const drinksCount = session.drinks?.length || 0;
    
    // Calcola l'ora dell'ultimo drink
    let lastDrinkTime = '';
    if (session.drinks && session.drinks.length > 0) {
      const lastDrink = session.drinks[session.drinks.length - 1];
      const drinkTime = new Date(lastDrink.time || lastDrink.timestamp);
      lastDrinkTime = drinkTime.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }

    return {
      currentBAC,
      sessionActive: true,
      userName,
      timeToSober,
      timeToLegal,
      status,
      sessionDuration,
      drinksCount,
      lastDrinkTime
    };
  }
}

export const widgetService = new WidgetService();