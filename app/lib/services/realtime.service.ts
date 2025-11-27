/**
 * Servizio Supabase Realtime per sincronizzazione istantanea sessioni
 * 
 * Gestisce subscriptions in tempo reale per:
 * - Sessioni attive modificate da altri dispositivi
 * - Profili modificati da altri dispositivi
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import supabase from '../supabase/client';
import * as sessionService from './session.service';
import * as profileService from './profile.service';

let sessionChannel: RealtimeChannel | null = null;
let profileChannel: RealtimeChannel | null = null;

/**
 * Inizializza Realtime subscriptions per un utente
 */
export const initRealtimeForUser = async (userId: string): Promise<void> => {
  try {
    console.log('🔴 REALTIME: Inizializzazione subscriptions per utente:', userId);
    
    // Cleanup eventuali subscriptions precedenti
    await cleanupRealtime();
    
    // 1. SUBSCRIPTION SESSIONI
    // Ascolta modifiche alla tabella sessions per questo utente
    sessionChannel = supabase
      .channel(`sessions:user_id=eq.${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'sessions',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('🔴 REALTIME SESSION: Evento ricevuto:', payload.eventType);
          console.log('🔴 REALTIME SESSION: Dati:', payload.new);
          
          // Quando una sessione viene modificata da un altro dispositivo
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updatedSession = payload.new;
            
            // Se è una sessione attiva, aggiorna la sessione locale
            if (updatedSession.is_active) {
              console.log('🔴 REALTIME: Sessione attiva aggiornata da altro dispositivo');
              
              // Forza sync completo per ottenere tutti i dettagli
              await sessionService.syncWithSupabase(userId);
              console.log('✅ REALTIME: Sessione sincronizzata');
              
              // Notifica la UI dell'update
              sessionService.notifySessionUpdate();
            }
          }
          
          // Quando una sessione viene eliminata
          if (payload.eventType === 'DELETE') {
            console.log('🔴 REALTIME: Sessione eliminata da altro dispositivo');
            await sessionService.syncWithSupabase(userId);
            
            // Notifica la UI dell'update
            sessionService.notifySessionUpdate();
          }
        }
      )
      .subscribe((status) => {
        console.log('🔴 REALTIME SESSION: Subscription status:', status);
      });
    
    // 2. SUBSCRIPTION PROFILI
    // Ascolta modifiche ai profili per evitare logout automatico
    profileChannel = supabase
      .channel(`profiles:user_id=eq.${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Solo UPDATE per non causare logout
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('🔴 REALTIME PROFILE: Profilo aggiornato da altro dispositivo');
          
          // Aggiorna profili SENZA fare logout
          // Solo scarica i nuovi dati senza reset
          try {
            const profiles = await profileService.getProfiles(true);
            console.log('✅ REALTIME PROFILE: Profili aggiornati:', profiles.length);
          } catch (error) {
            console.error('❌ REALTIME PROFILE: Errore aggiornamento:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔴 REALTIME PROFILE: Subscription status:', status);
      });
    
    console.log('✅ REALTIME: Subscriptions attive per utente:', userId);
  } catch (error) {
    console.error('❌ REALTIME: Errore inizializzazione:', error);
  }
};

/**
 * Pulisce tutte le subscriptions realtime
 */
export const cleanupRealtime = async (): Promise<void> => {
  try {
    console.log('🧹 REALTIME: Pulizia subscriptions...');
    
    if (sessionChannel) {
      await sessionChannel.unsubscribe();
      sessionChannel = null;
      console.log('✅ REALTIME: Session channel rimosso');
    }
    
    if (profileChannel) {
      await profileChannel.unsubscribe();
      profileChannel = null;
      console.log('✅ REALTIME: Profile channel rimosso');
    }
  } catch (error) {
    console.error('❌ REALTIME: Errore cleanup:', error);
  }
};

/**
 * Controlla se Realtime è attivo
 */
export const isRealtimeActive = (): boolean => {
  return sessionChannel !== null || profileChannel !== null;
};

