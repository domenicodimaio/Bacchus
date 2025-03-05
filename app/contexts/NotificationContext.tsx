import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NotificationPermission = 'granted' | 'denied' | 'undetermined';

type NotificationSettings = {
  enableSessionReminders: boolean;
  enableSobrietyAlerts: boolean;
  enableDailySummary: boolean;
};

type NotificationContextType = {
  hasPermission: boolean;
  permissionStatus: NotificationPermission;
  settings: NotificationSettings;
  requestPermissions: () => Promise<boolean>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
};

const SETTINGS_STORAGE_KEY = 'alcoltest_notification_settings';

// Definisci i valori di default
const defaultSettings: NotificationSettings = {
  enableSessionReminders: true,
  enableSobrietyAlerts: true,
  enableDailySummary: false,
};

export const NotificationContext = createContext<NotificationContextType>({
  hasPermission: false,
  permissionStatus: 'undetermined',
  settings: defaultSettings,
  requestPermissions: async () => false,
  updateSettings: async () => {},
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('undetermined');
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  // Controlla i permessi e carica le impostazioni all'avvio
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Carica le impostazioni salvate
        const storedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (storedSettings) {
          setSettings(JSON.parse(storedSettings));
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    };

    loadSettings();
    // Simuliamo lo stato dei permessi
    setPermissionStatus('granted');
  }, []);

  // Richiedi i permessi per le notifiche
  const requestPermissions = async () => {
    // Simulazione della richiesta di permessi
    setPermissionStatus('granted');
    return true;
  };

  // Aggiorna le impostazioni delle notifiche
  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
  };

  return (
    <NotificationContext.Provider
      value={{
        hasPermission: permissionStatus === 'granted',
        permissionStatus,
        settings,
        requestPermissions,
        updateSettings,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider; 