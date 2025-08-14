import supabase from '../supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  category?: string;
  metadata?: any;
  stack_trace?: string;
  user_id?: string;
  device_info?: any;
  app_version?: string;
  timestamp?: string;
}

class RemoteLoggingService {
  private isEnabled = true;
  private maxRetries = 3;
  private logQueue: LogEntry[] = [];
  private isUploading = false;

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    // Abilita logging solo in produzione o quando specificato
    const isDev = __DEV__;
    const forceEnable = await AsyncStorage.getItem('enable_remote_logging');
    
    this.isEnabled = !isDev || forceEnable === 'true';
    
    if (this.isEnabled) {
      console.log('🔍 Remote Logging Service attivato');
      this.setupGlobalErrorHandlers();
      this.startPeriodicUpload();
    }
  }

  private setupGlobalErrorHandlers() {
    // Cattura errori JavaScript non gestiti
    const globalAny = global as any;
    const originalHandler = globalAny.ErrorUtils?.getGlobalHandler();
    
    if (globalAny.ErrorUtils) {
      globalAny.ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
        this.logError('Global JS Error', error, {
          isFatal,
          source: 'ErrorUtils'
        });
        
        // Chiama il gestore originale
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }

    // Cattura promise rejections non gestite
    const originalRejectionHandler = globalAny.onunhandledrejection;
    globalAny.onunhandledrejection = (event: any) => {
      this.logError('Unhandled Promise Rejection', event.reason, {
        source: 'Promise',
        event: event
      });
      
      if (originalRejectionHandler) {
        originalRejectionHandler(event);
      }
    };
  }

  private async getDeviceInfo() {
    return {
      platform: Platform.OS,
      platformVersion: Platform.Version,
      deviceName: Device.deviceName,
      deviceType: Device.deviceType,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      appVersion: Constants.expoConfig?.version,
      buildNumber: Platform.OS === 'ios' 
        ? Constants.expoConfig?.ios?.buildNumber 
        : Constants.expoConfig?.android?.versionCode,
      isDevice: Device.isDevice,
      brand: Device.brand,
      manufacturer: Device.manufacturer,
    };
  }

  private async getCurrentUserId(): Promise<string | null> {
    try {
      const userData = await AsyncStorage.getItem('bacchus_user_data');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || null;
      }
    } catch (error) {
      // Ignora errori nel recupero user ID
    }
    return null;
  }

  async logError(message: string, error?: any, metadata?: any) {
    const logEntry: LogEntry = {
      level: 'error',
      message,
      category: 'application_error',
      metadata: {
        ...metadata,
        errorName: error?.name,
        errorMessage: error?.message,
        errorCode: error?.code,
      },
      stack_trace: error?.stack || new Error().stack,
      user_id: await this.getCurrentUserId(),
      device_info: await this.getDeviceInfo(),
      app_version: Constants.expoConfig?.version,
      timestamp: new Date().toISOString(),
    };

    // Log locale per debug immediato
    console.error('🔴 [REMOTE LOG]', message, error);
    
    // Aggiungi alla coda per upload
    this.logQueue.push(logEntry);
    
    // Se è un errore critico, prova upload immediato
    if (metadata?.isFatal || metadata?.critical) {
      this.uploadLogs();
    }
  }

  async logInfo(message: string, metadata?: any) {
    const logEntry: LogEntry = {
      level: 'info',
      message,
      category: 'application_info',
      metadata,
      user_id: await this.getCurrentUserId(),
      device_info: await this.getDeviceInfo(),
      app_version: Constants.expoConfig?.version,
      timestamp: new Date().toISOString(),
    };

    console.log('🔵 [REMOTE LOG]', message);
    this.logQueue.push(logEntry);
  }

  async logWarning(message: string, metadata?: any) {
    const logEntry: LogEntry = {
      level: 'warn',
      message,
      category: 'application_warning',
      metadata,
      user_id: await this.getCurrentUserId(),
      device_info: await this.getDeviceInfo(),
      app_version: Constants.expoConfig?.version,
      timestamp: new Date().toISOString(),
    };

    console.warn('🟡 [REMOTE LOG]', message);
    this.logQueue.push(logEntry);
  }

  private async uploadLogs() {
    if (!this.isEnabled || this.isUploading || this.logQueue.length === 0) {
      return;
    }

    this.isUploading = true;
    const logsToUpload = [...this.logQueue];
    this.logQueue = [];

    try {
      console.log(`📤 Uploading ${logsToUpload.length} log entries...`);
      
      const { error } = await supabase
        .from('app_logs')
        .insert(logsToUpload);

      if (error) {
        console.error('❌ Failed to upload logs:', error);
        // Rimetti i log nella coda per riprova successiva
        this.logQueue.unshift(...logsToUpload);
      } else {
        console.log('✅ Logs uploaded successfully');
      }
    } catch (uploadError) {
      console.error('❌ Upload error:', uploadError);
      // Rimetti i log nella coda
      this.logQueue.unshift(...logsToUpload);
    } finally {
      this.isUploading = false;
    }
  }

  private startPeriodicUpload() {
    // Upload ogni 30 secondi se ci sono log in coda
    setInterval(() => {
      if (this.logQueue.length > 0) {
        this.uploadLogs();
      }
    }, 30000);
  }

  // Metodo per forzare l'upload (utile per test)
  async forceUpload() {
    await this.uploadLogs();
  }

  // Metodo per abilitare/disabilitare il logging
  async setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    await AsyncStorage.setItem('enable_remote_logging', enabled.toString());
  }

  // Metodo per ottenere statistiche sui log
  getStats() {
    return {
      queueLength: this.logQueue.length,
      isEnabled: this.isEnabled,
      isUploading: this.isUploading,
    };
  }
}

// Esporta istanza singleton
export const remoteLogger = new RemoteLoggingService();

// Funzioni di convenienza
export const logError = (message: string, error?: any, metadata?: any) => 
  remoteLogger.logError(message, error, metadata);

export const logInfo = (message: string, metadata?: any) => 
  remoteLogger.logInfo(message, metadata);

export const logWarning = (message: string, metadata?: any) => 
  remoteLogger.logWarning(message, metadata);

export default remoteLogger; 