/**
 * Offline Service
 * 
 * Gestisce la sincronizzazione dei dati quando l'app è offline
 * e la sincronizzazione con il server quando la connessione viene ripristinata
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Chiavi per lo storage
const OFFLINE_QUEUE_KEY = 'alcoltest_offline_queue';
const LAST_SYNC_KEY = 'alcoltest_last_sync';
const OFFLINE_MODE_KEY = 'alcoltest_offline_mode';

// Tipi di operazioni
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

// Interfaccia per le operazioni in coda
export interface QueuedOperation {
  id: string;
  type: OperationType;
  entity: string;
  data: any;
  timestamp: number;
}

// Stato della connessione
let isConnected = true;
let isInitialized = false;

// Coda delle operazioni offline
let operationQueue: QueuedOperation[] = [];

// Callback per la sincronizzazione
type SyncCallback = () => Promise<void>;
const syncCallbacks: SyncCallback[] = [];

/**
 * Inizializza il servizio offline
 */
export const initOfflineService = async (): Promise<void> => {
  if (isInitialized) return;
  
  try {
    // Carica la coda delle operazioni
    const queueData = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (queueData) {
      operationQueue = JSON.parse(queueData);
    }
    
    // Configura il listener per i cambiamenti di connettività
    NetInfo.addEventListener(state => {
      const newConnectionStatus = !!state.isConnected;
      
      // Se la connessione è stata ripristinata
      if (!isConnected && newConnectionStatus) {
        synchronizeData();
      }
      
      isConnected = newConnectionStatus;
      
      // Salva lo stato offline
      AsyncStorage.setItem(OFFLINE_MODE_KEY, JSON.stringify(!isConnected));
    });
    
    // Controlla lo stato iniziale della connessione
    const connectionState = await NetInfo.fetch();
    isConnected = !!connectionState.isConnected;
    
    isInitialized = true;
    console.log('Offline service initialized, connection status:', isConnected);
  } catch (error) {
    console.error('Error initializing offline service:', error);
  }
};

/**
 * Verifica se il dispositivo è attualmente offline
 */
export const isOffline = async (): Promise<boolean> => {
  try {
    const connectionState = await NetInfo.fetch();
    return !connectionState.isConnected;
  } catch (error) {
    console.error('Error checking connection status:', error);
    return false;
  }
};

/**
 * Aggiunge un'operazione alla coda offline
 */
export const queueOperation = async (
  type: OperationType,
  entity: string,
  data: any
): Promise<string> => {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const operation: QueuedOperation = {
    id,
    type,
    entity,
    data,
    timestamp: Date.now()
  };
  
  operationQueue.push(operation);
  await saveQueue();
  
  return id;
};

/**
 * Salva la coda nel local storage
 */
const saveQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(operationQueue));
  } catch (error) {
    console.error('Error saving offline queue:', error);
  }
};

/**
 * Registra una callback per la sincronizzazione
 */
export const registerSyncCallback = (callback: SyncCallback): void => {
  syncCallbacks.push(callback);
};

/**
 * Sincronizza i dati con il server
 */
export const synchronizeData = async (): Promise<void> => {
  if (operationQueue.length === 0) {
    console.log('No operations to synchronize');
    return;
  }
  
  console.log(`Synchronizing ${operationQueue.length} operations...`);
  
  try {
    // Esegui tutte le callback di sincronizzazione
    for (const callback of syncCallbacks) {
      await callback();
    }
    
    // Aggiorna l'ultimo timestamp di sincronizzazione
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    
    // Svuota la coda
    operationQueue = [];
    await saveQueue();
    
    console.log('Synchronization completed successfully');
  } catch (error) {
    console.error('Error during synchronization:', error);
  }
};

/**
 * Ottiene l'ultimo timestamp di sincronizzazione
 */
export const getLastSyncTimestamp = async (): Promise<number> => {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return timestamp ? parseInt(timestamp, 10) : 0;
  } catch (error) {
    console.error('Error getting last sync timestamp:', error);
    return 0;
  }
};

/**
 * Forza la sincronizzazione manuale
 */
export const forceSynchronization = async (): Promise<void> => {
  if (await isOffline()) {
    console.log('Cannot synchronize while offline');
    return;
  }
  
  await synchronizeData();
};

/**
 * Abilita la modalità offline forzata
 */
export const enableForcedOfflineMode = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(OFFLINE_MODE_KEY, JSON.stringify(enabled));
};

/**
 * Verifica se la modalità offline forzata è attiva
 */
export const isForcedOfflineModeEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(OFFLINE_MODE_KEY);
    return value ? JSON.parse(value) : false;
  } catch (error) {
    console.error('Error checking forced offline mode:', error);
    return false;
  }
};

export default {
  initOfflineService,
  isOffline,
  queueOperation,
  registerSyncCallback,
  synchronizeData,
  getLastSyncTimestamp,
  forceSynchronization,
  enableForcedOfflineMode,
  isForcedOfflineModeEnabled,
  OperationType
}; 