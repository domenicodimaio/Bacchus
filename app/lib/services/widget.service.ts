import { NativeModules, Platform } from 'react-native';

const { BacchusNativeModules } = NativeModules;

export interface WidgetData {
  currentBAC: number;
  sessionActive: boolean;
  userName: string;
  timeToSober: string;
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
}

export const widgetService = new WidgetService();