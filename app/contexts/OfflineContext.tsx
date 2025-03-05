import React, { createContext, useContext, useEffect, useState } from 'react';
import offlineService from '../lib/services/offline.service';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';

interface OfflineContextType {
  isOffline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingOperations: number;
  forceSynchronization: () => Promise<void>;
  enableForcedOfflineMode: (enabled: boolean) => Promise<void>;
  isForcedOfflineModeEnabled: () => Promise<boolean>;
  toggleOfflineMode: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({
  isOffline: false,
  isSyncing: false,
  lastSyncTime: null,
  pendingOperations: 0,
  forceSynchronization: async () => {},
  enableForcedOfflineMode: async () => {},
  isForcedOfflineModeEnabled: async () => false,
  toggleOfflineMode: async () => {},
});

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [pendingOperations, setPendingOperations] = useState(0);
  const toast = useToast();
  const { t } = useTranslation(['common']);

  // Inizializza il servizio offline
  useEffect(() => {
    const initOffline = async () => {
      await offlineService.initOfflineService();
      updateOfflineStatus();
    };

    initOffline();

    // Controlla lo stato offline ogni 30 secondi
    const interval = setInterval(updateOfflineStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Aggiorna lo stato offline
  const updateOfflineStatus = async () => {
    const offline = await offlineService.isOffline();
    if (offline !== isOffline) {
      setIsOffline(offline);
      
      // Mostra un toast quando cambia lo stato della connessione
      if (offline) {
        toast.show(t('offlineMode'), {
          type: 'warning',
          placement: 'top',
          duration: 3000,
        });
      } else {
        toast.show(t('onlineMode'), {
          type: 'success',
          placement: 'top',
          duration: 3000,
        });
        
        // Sincronizza i dati quando torna online
        forceSynchronization();
      }
    }
    
    // Aggiorna l'ultimo timestamp di sincronizzazione
    const lastSync = await offlineService.getLastSyncTimestamp();
    setLastSyncTime(lastSync);
  };

  // Forza la sincronizzazione manuale
  const forceSynchronization = async () => {
    if (isOffline) {
      toast.show(t('cannotSyncOffline'), {
        type: 'danger',
        placement: 'top',
        duration: 3000,
      });
      return;
    }
    
    setIsSyncing(true);
    
    try {
      await offlineService.forceSynchronization();
      toast.show(t('syncComplete'), {
        type: 'success',
        placement: 'top',
        duration: 3000,
      });
      
      // Aggiorna lo stato
      updateOfflineStatus();
    } catch (error) {
      console.error('Error during forced synchronization:', error);
      toast.show(t('syncError'), {
        type: 'danger',
        placement: 'top',
        duration: 3000,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Abilita la modalità offline forzata
  const enableForcedOfflineMode = async (enabled: boolean) => {
    await offlineService.enableForcedOfflineMode(enabled);
    updateOfflineStatus();
  };

  // Verifica se la modalità offline forzata è attiva
  const isForcedOfflineModeEnabled = async () => {
    return await offlineService.isForcedOfflineModeEnabled();
  };

  // Toggle della modalità offline
  const toggleOfflineMode = async () => {
    const isCurrentlyForced = await isForcedOfflineModeEnabled();
    await enableForcedOfflineMode(!isCurrentlyForced);
    
    // Mostra un toast per confermare l'azione
    const newState = !isCurrentlyForced;
    toast.show(newState ? t('offlineModeEnabled') : t('offlineModeDisabled'), {
      type: newState ? 'warning' : 'success',
      placement: 'top',
      duration: 3000,
    });
  };

  return (
    <OfflineContext.Provider
      value={{
        isOffline,
        isSyncing,
        lastSyncTime,
        pendingOperations,
        forceSynchronization,
        enableForcedOfflineMode,
        isForcedOfflineModeEnabled,
        toggleOfflineMode,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}; 