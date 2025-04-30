/**
 * useBACWidget.ts
 * 
 * Hook per l'integrazione del calcolo BAC con i widget e le Live Activities
 */

import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { 
  updateBACWidgetData, 
  startBACLiveActivity, 
  endBACLiveActivity,
  BACWidgetData 
} from '../widget/BACWidgetService';
import { getBACDangerLevel } from '../lib/bac/calculator';

interface UseBACWidgetOptions {
  enabled?: boolean;
  autoStartLiveActivity?: boolean;
}

/**
 * Hook per integrare calcolo BAC con i widget di iOS
 */
export function useBACWidget(
  currentBAC: number,
  timeToZero: number,
  timeToLegal: number,
  options: UseBACWidgetOptions = {}
) {
  const { enabled = true, autoStartLiveActivity = false } = options;

  // Crea i dati per il widget
  const createWidgetData = useCallback((): BACWidgetData => {
    return {
      currentBAC,
      timeToZero,
      timeToLegal,
      lastUpdated: Date.now(),
      dangerLevel: getBACDangerLevel(currentBAC),
    };
  }, [currentBAC, timeToZero, timeToLegal]);

  // Aggiorna i dati del widget
  const updateWidget = useCallback(async () => {
    if (!enabled || Platform.OS !== 'ios') return;
    
    try {
      const data = createWidgetData();
      await updateBACWidgetData(data);
    } catch (error) {
      console.error('Errore nell\'aggiornamento del widget:', error);
    }
  }, [enabled, createWidgetData]);

  // Avvia una Live Activity
  const startLiveActivity = useCallback(async () => {
    if (!enabled || Platform.OS !== 'ios') return false;
    
    try {
      const data = createWidgetData();
      return await startBACLiveActivity(data);
    } catch (error) {
      console.error('Errore nell\'avvio della Live Activity:', error);
      return false;
    }
  }, [enabled, createWidgetData]);

  // Termina la Live Activity
  const endLiveActivity = useCallback(async () => {
    if (Platform.OS !== 'ios') return;
    
    try {
      await endBACLiveActivity();
    } catch (error) {
      console.error('Errore nella terminazione della Live Activity:', error);
    }
  }, []);

  // Automatizza l'aggiornamento dei widget
  useEffect(() => {
    if (!enabled) return;
    
    // Aggiorna i widget quando cambiano i valori BAC
    updateWidget();
    
    // Avvia automaticamente una Live Activity se richiesto
    if (autoStartLiveActivity && currentBAC > 0) {
      startLiveActivity();
    } else if (currentBAC <= 0) {
      // Termina la Live Activity se il BAC è tornato a zero
      endLiveActivity();
    }
  }, [enabled, currentBAC, timeToZero, timeToLegal, autoStartLiveActivity, updateWidget, startLiveActivity, endLiveActivity]);

  return {
    updateWidget,
    startLiveActivity,
    endLiveActivity
  };
} 