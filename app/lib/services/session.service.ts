/**
 * Session Service
 * 
 * Gestisce la creazione, il salvataggio e il recupero delle sessioni di consumo.
 * Le sessioni possono essere salvate localmente o sincronizzate con Supabase.
 */

// Import the crypto polyfill directly
import 'react-native-get-random-values';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../supabase/client';
import { calculateBAC, calculateTimeToSober, calculateTimeToLegalLimit } from '../../utils/bacCalculator';
import { DrinkRecord } from '../bac/visualization';
import { Session, UserProfile, Drink, FoodRecord } from '../../types/session';

// ===== VARIABILI GLOBALI =====
let _initialized = false;
let activeSession: Session | null = null;
let sessionHistory: Session[] = [];
let _currentUserId: string | null = null;
// Aggiunta: flag per evitare chiamate multiple ravvicinate
let _initializationInProgress = false;
let _lastInitTime = 0;

// ===== CHIAVI STORAGE =====
// Migliora la gestione delle chiavi di storage con prefissi per utenti
const getStorageKeyPrefix = (userId: string | null): string => {
  if (!userId) return 'guest_';
  return `user_${userId}_`;
};

// Recupera la chiave completa per l'active session
const getActiveSessionKey = (userId: string | null): string => {
  return `${getStorageKeyPrefix(userId)}active_session`;
};

// Recupera la chiave completa per la session history
const getSessionHistoryKey = (userId: string | null): string => {
  if (!userId) return 'guest_session_history';
  return `user_${userId}_session_history`;
};

// ===== FUNZIONI DI BASE =====

// Ottiene la sessione attiva
export function getActiveSession(): Session | null {
  // Se non esiste nessuna sessione in memoria, restituisci null
  if (!activeSession) {
    return null;
  }
  
  // Se la sessione esiste ma è contrassegnata come chiusa, non restituirla
  // ma pianifica la pulizia e restituisci null
  if (activeSession.isClosed === true) {
    // Pulisci la sessione asincrona senza attendere
    setTimeout(() => {
      console.log('Sessione chiusa trovata in memoria, pulizia in corso...');
      activeSession = null;
      
      // Rimuovi anche da AsyncStorage
      getCurrentUserId().then(userId => {
        const key = getActiveSessionKey(userId);
        AsyncStorage.removeItem(key).then(() => {
          console.log('Sessione chiusa rimossa da AsyncStorage');
        });
      });
    }, 0);
    
    return null;
  }
  
  return activeSession;
}

// Ottiene la cronologia delle sessioni
export function getSessionHistory(): Session[] {
  console.log(`📊 DIAGNOSTICA: getSessionHistory chiamato, restituisce ${sessionHistory.length} sessioni`);
  return sessionHistory;
}

// Imposta la cronologia delle sessioni - nuova funzione per aggiornare esplicitamente la variabile globale
export function setSessionHistory(history: Session[]): void {
  if (Array.isArray(history)) {
    sessionHistory = history;
    console.log(`📌 DIAGNOSTICA: Variabile globale sessionHistory aggiornata esplicitamente con ${history.length} sessioni`);
  } else {
    console.error('📌 DIAGNOSTICA: Tentativo di impostare sessionHistory con un valore non valido:', history);
  }
}

// Nuova funzione asincrona per caricare la cronologia
export async function loadSessionHistoryFromStorage(): Promise<Session[]> {
  try {
    console.log('[loadSessionHistoryFromStorage] Caricamento forzato della cronologia da localStorage');
    const userId = await getCurrentUserId();
    const { history } = await loadSessionsFromLocalStorage(userId);
      
    // Aggiorna la variabile globale con la cronologia caricata
    sessionHistory = history;
    console.log(`[loadSessionHistoryFromStorage] Caricati ${sessionHistory.length} elementi nella cronologia`);
    
    return sessionHistory;
  } catch (error) {
    console.error('[loadSessionHistoryFromStorage] Errore nel caricamento della cronologia:', error);
    return [];
  }
}

// Inizializza il servizio delle sessioni
export async function initSessionService(userId?: string): Promise<void> {
  try {
    // Verifica se un'inizializzazione è già in corso o se è stata completata recentemente
    const currentTime = Date.now();
    if (_initializationInProgress) {
      console.log('Inizializzazione sessioni già in corso, richiesta ignorata');
      return;
    }
    
    // Previeni chiamate multiple troppo ravvicinate (entro 3 secondi)
    if (_initialized && currentTime - _lastInitTime < 3000) {
      console.log('Servizio sessioni già inizializzato recentemente, controllo ignorato');
      return;
    }
    
    _initializationInProgress = true;
    
    // Imposto un timeout per evitare che un'operazione troppo lunga blocchi l'UI
    const initPromise = new Promise<void>(async (resolve, reject) => {
      try {
        console.log('Initializing session service');
        
        // Ottieni l'ID dell'utente corrente se non fornito
        let currentUserId = userId;
        if (!currentUserId) {
          const currentUser = await getCurrentUser();
          currentUserId = currentUser?.id || null;
        }
        
        _currentUserId = currentUserId;
        console.log('Session service initialized for user:', _currentUserId || 'guest');
        
        // Se già inizializzato, facciamo solo un controllo rapido
        if (_initialized) {
          console.log('Servizio sessioni già inizializzato, eseguendo controllo leggero');
          
          // Se c'è una sessione attiva, verifica che appartenga all'utente corrente
          if (activeSession && currentUserId && activeSession.user_id && 
              activeSession.user_id !== currentUserId) {
            console.log('Active session belongs to a different user, resetting it');
            activeSession = null;
            
            // Rimuovi da AsyncStorage, ma senza attendere
            const key = getActiveSessionKey(currentUserId);
            AsyncStorage.removeItem(key);
          }
          
          resolve();
          return;
        }
        
        // OTTIMIZZAZIONE: Carica solo la sessione attiva invece di tutta la cronologia
        // quando stiamo facendo l'inizializzazione durante il completamento del wizard
        // La cronologia può essere caricata in un secondo momento quando necessaria
        const activeKey = getActiveSessionKey(currentUserId);
        const activeData = await AsyncStorage.getItem(activeKey);
        
        if (activeData) {
          try {
            const parsedSession = JSON.parse(activeData);
            
            // Verifica che la sessione appartenga all'utente corrente
            if (currentUserId && parsedSession.user_id && 
                parsedSession.user_id !== currentUserId) {
              console.log('Active session belongs to a different user, ignoring it');
              activeSession = null;
            } else {
              activeSession = parsedSession;
              
              // Converti le date in oggetti Date
              if (activeSession.startTime) {
                activeSession.startTime = new Date(activeSession.startTime);
              }
              if (activeSession.sessionStartTime) {
                activeSession.sessionStartTime = new Date(activeSession.sessionStartTime);
              }
              if (activeSession.endTime) {
                activeSession.endTime = new Date(activeSession.endTime);
              }
              
              // Se c'è una sessione attiva, aggiorna il BAC
              updateSessionBAC();
            }
          } catch (parseError) {
            console.error('Error parsing active session:', parseError);
            activeSession = null;
          }
        } else {
          activeSession = null;
        }
        
        // Imposta il flag di inizializzazione
        _initialized = true;
        _lastInitTime = Date.now(); // Salva il timestamp dell'ultima inizializzazione
        console.log('Session service initialized with', 
          activeSession ? '1 active session' : 'no active sessions');
        
        // Carica la cronologia in background
        setTimeout(() => {
          loadSessionHistoryInBackground(currentUserId);
        }, 100);
        
        resolve();
      } catch (error) {
        console.error('Error in session service initialization:', error);
        reject(error);
      }
    });
    
    // Imposta un timeout per evitare che l'operazione blocchi indefinitamente
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        _initialized = true; // Forza l'inizializzazione anche in caso di timeout
        _lastInitTime = Date.now(); // Salva il timestamp dell'ultima inizializzazione
        reject(new Error('Session service initialization timed out'));
      }, 5000); // 5 secondi di timeout
    });
    
    // Attendiamo che l'inizializzazione termini o vada in timeout
    await Promise.race([initPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error initializing session service:', error);
    // Forziamo l'inizializzazione anche in caso di errore per non bloccare l'app
    _initialized = true;
    _lastInitTime = Date.now(); // Salva il timestamp dell'ultima inizializzazione
  } finally {
    _initializationInProgress = false; // Resetta il flag di inizializzazione in corso
  }
}

// Funzione per caricare la cronologia delle sessioni in background
async function loadSessionHistoryInBackground(userId: string | null = null): Promise<void> {
  try {
    console.log('🔴🔴🔴 DIAGNOSTICA: loadSessionHistoryInBackground chiamato per userId:', userId || 'guest', '🔴🔴🔴');
    
    // Verifichiamo tutte le chiavi per assicurarci di trovare la giusta
    const allKeys = await AsyncStorage.getAllKeys();
    console.log(`🔴 DIAGNOSTICA: Tutte le chiavi in AsyncStorage: ${allKeys.join(', ')}`);
    
    // Chiave standard
    const historyKey = getSessionHistoryKey(userId);
    console.log(`🔴 DIAGNOSTICA: Tentativo caricamento cronologia con chiave: ${historyKey}`);
    
    // Ricerchiamo anche chiavi simili se l'utente ha un ID
    const possibleKeys = userId 
      ? allKeys.filter(key => key.includes(userId) && key.includes('session_history'))
      : [];
    
    if (possibleKeys.length > 0 && !allKeys.includes(historyKey)) {
      console.log(`🔴 DIAGNOSTICA: Trovate chiavi alternative per session_history: ${possibleKeys.join(', ')}`);
    }
    
    // Prova prima la chiave standard
    let historyData = await AsyncStorage.getItem(historyKey);
    
    // Se non trova nulla con la chiave standard e ci sono chiavi alternative, prova quelle
    if (!historyData && possibleKeys.length > 0) {
      for (const altKey of possibleKeys) {
        console.log(`🔴 DIAGNOSTICA: Tentativo con chiave alternativa: ${altKey}`);
        const altData = await AsyncStorage.getItem(altKey);
        if (altData) {
          historyData = altData;
          console.log(`🔴 DIAGNOSTICA: Dati trovati con chiave alternativa: ${altKey}`);
          
          // Facciamo una migrazione della chiave per le future chiamate
          await AsyncStorage.setItem(historyKey, altData);
          console.log(`🔴 DIAGNOSTICA: Migrazione dati da chiave ${altKey} a ${historyKey} completata`);
          break;
        }
      }
    }
    
    if (historyData) {
      try {
        const history = JSON.parse(historyData);
        // Filtra le sessioni per l'utente corrente se necessario
        if (userId) {
          sessionHistory = history.filter(session => 
            !session.user_id || session.user_id === userId
          );
        } else {
          sessionHistory = history;
        }
        
        console.log(`🔴 DIAGNOSTICA: Loaded ${sessionHistory.length} sessions into history`);
      } catch (parseError) {
        console.error('🔴 DIAGNOSTICA: Error parsing session history:', parseError);
        sessionHistory = [];
      }
    } else {
      sessionHistory = [];
      console.log('🔴 DIAGNOSTICA: No session history found in storage');
    }
  } catch (error) {
    console.error('🔴 DIAGNOSTICA: Error loading session history in background:', error);
  }
}

// Carica le sessioni dal localStorage
export async function loadSessionsFromLocalStorage(userId: string | null = null): Promise<{active: Session | null, history: Session[]}> {
  try {
    console.log(`📣📣📣 DIAGNOSTICA: loadSessionsFromLocalStorage chiamato per user: ${userId || 'guest'} 📣📣📣`);
    
    // Carica la sessione attiva
    let active: Session | null = null;
    try {
      const activeKey = getActiveSessionKey(userId);
      console.log(`📣 DIAGNOSTICA: Tentativo caricamento sessione attiva con chiave: ${activeKey}`);
      const activeData = await AsyncStorage.getItem(activeKey);
      if (activeData) {
        active = JSON.parse(activeData);
        // Converti le date in oggetti Date
        if (active.startTime) {
          active.startTime = new Date(active.startTime);
        }
        if (active.sessionStartTime) {
          active.sessionStartTime = new Date(active.sessionStartTime);
        }
        if (active.endTime) {
          active.endTime = new Date(active.endTime);
        }
        if (active.drinks) {
          active.drinks = active.drinks.map(drink => ({
            ...drink,
            time: drink.time
          }));
        }
        console.log(`📣 DIAGNOSTICA: Sessione attiva caricata: ${active.id}`);
      } else {
        console.log(`📣 DIAGNOSTICA: Nessuna sessione attiva trovata per user: ${userId || 'guest'}`);
      }
    } catch (error) {
      console.error('📣 DIAGNOSTICA: Errore caricamento sessione attiva:', error);
    }
    
    // Carica la cronologia
    let history: Session[] = [];
    try {
      // Verifichiamo tutte le chiavi per assicurarci di trovare la giusta
      const allKeys = await AsyncStorage.getAllKeys();
      console.log(`📣 DIAGNOSTICA: Tutte le chiavi in AsyncStorage: ${allKeys.join(', ')}`);
      
      // Chiave standard
      const historyKey = getSessionHistoryKey(userId);
      console.log(`📣 DIAGNOSTICA: Tentativo caricamento cronologia con chiave: ${historyKey}`);
      
      // Ricerchiamo anche chiavi simili se l'utente ha un ID
      const possibleKeys = userId 
        ? allKeys.filter(key => key.includes(userId) && key.includes('session_history'))
        : [];
      
      if (possibleKeys.length > 0 && !allKeys.includes(historyKey)) {
        console.log(`📣 DIAGNOSTICA: Trovate chiavi alternative per session_history: ${possibleKeys.join(', ')}`);
      }
      
      // Prova prima la chiave standard
      let historyData = await AsyncStorage.getItem(historyKey);
      
      // Se non trova nulla con la chiave standard e ci sono chiavi alternative, prova quelle
      if (!historyData && possibleKeys.length > 0) {
        for (const altKey of possibleKeys) {
          console.log(`📣 DIAGNOSTICA: Tentativo con chiave alternativa: ${altKey}`);
          const altData = await AsyncStorage.getItem(altKey);
          if (altData) {
            historyData = altData;
            console.log(`📣 DIAGNOSTICA: Dati trovati con chiave alternativa: ${altKey}`);
            break;
          }
        }
      }
      
      if (historyData) {
        try {
        history = JSON.parse(historyData);
        // Converti le date in oggetti Date
        history = history.map(session => ({
          ...session,
          startTime: new Date(session.startTime),
          sessionStartTime: new Date(session.sessionStartTime),
          endTime: session.endTime ? new Date(session.endTime) : undefined,
          drinks: session.drinks.map(drink => ({
            ...drink,
            time: drink.time
          }))
        }));
          console.log(`📣 DIAGNOSTICA: Caricate ${history.length} sessioni nella cronologia da localStorage`);
          
          // Aggiorniamo anche la variabile globale sessionHistory
          sessionHistory = history;
          console.log(`📣 DIAGNOSTICA: Variabile globale sessionHistory aggiornata con ${sessionHistory.length} sessioni`);
        } catch (parseError) {
          console.error('📣 DIAGNOSTICA: Errore nel parsing dei dati della cronologia:', parseError);
        }
      } else {
        console.log(`📣 DIAGNOSTICA: Nessuna cronologia trovata in localStorage per user: ${userId || 'guest'}`);
      }
  } catch (error) {
      console.error('📣 DIAGNOSTICA: Errore caricamento cronologia sessioni:', error);
    }
    
    return { active, history };
  } catch (error) {
    console.error('📣 DIAGNOSTICA: Errore generale in loadSessionsFromLocalStorage:', error);
    return { active: null, history: [] };
  }
}

// Salva la sessione localmente
export async function saveSessionLocally(session: Session | Session[] | null, type: 'active' | 'history' = 'active'): Promise<boolean> {
  try {
    const userId = session && 'user_id' in session ? session.user_id : null;
    
    if (type === 'active') {
      if (!session || Array.isArray(session)) {
        console.error('Invalid session for active storage');
        return false;
      }
      
      const key = getActiveSessionKey(userId);
      console.log(`🔵 DIAGNOSTICA: Salvando sessione attiva con chiave: ${key}`);
      await AsyncStorage.setItem(key, JSON.stringify(session));
      activeSession = session;
      console.log(`Active session saved with ID: ${session.id}`);
      return true;
    } else {
      if (!session) {
        console.error('Invalid session(s) for history storage');
        return false;
      }
      
      const key = getSessionHistoryKey(userId);
      console.log(`🔵 DIAGNOSTICA: Salvando cronologia sessioni con chiave: ${key}, user_id: ${userId || 'guest'}`);
      const sessionsToSave = Array.isArray(session) ? session : [session];
      await AsyncStorage.setItem(key, JSON.stringify(sessionsToSave));
      sessionHistory = sessionsToSave;
      console.log(`Saved ${sessionsToSave.length} sessions to history`);
      
      // Verifica di salvataggio (debug)
      try {
        const saved = await AsyncStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          console.log(`🔵 DIAGNOSTICA: Verifica salvataggio cronologia: ${parsed.length} sessioni salvate correttamente`);
        } else {
          console.error(`🔵 DIAGNOSTICA: ERRORE: Nessun dato trovato dopo il salvataggio della cronologia!`);
        }
      } catch (verifyError) {
        console.error(`🔵 DIAGNOSTICA: Errore verifica salvataggio: ${verifyError}`);
      }
      
      return true;
    }
  } catch (error) {
    console.error('Error in saveSessionLocally:', error);
    return false;
  }
}

// Ottiene l'utente corrente
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Ottiene l'ID dell'utente corrente
let _currentUserIdCache: string | null = null;

export async function getCurrentUserId() {
  try {
    // Se abbiamo già un ID in cache, restituiscilo
    if (_currentUserIdCache) {
      return _currentUserIdCache;
    }
    
    const user = await getCurrentUser();
    
    // Se c'è un utente autenticato, usa il suo ID
    if (user) {
      _currentUserIdCache = user.id;
      return user.id;
    }
    
    // Altrimenti, restituisci null (utente ospite)
    return null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
}

// Salva una sessione su Supabase
export async function saveSessionToSupabase(session: Session, is_active: boolean = false): Promise<boolean> {
  try {
    // Ottieni l'ID utente attuale dal servizio di autenticazione
    const userId = await getCurrentUserId();
    
    // Se non c'è un utente autenticato, non salvare su Supabase
    if (!userId) {
      console.log('No authenticated user, skipping Supabase save');
      return false;
    }
    
    // Preparazione dati per il formato JSONB richiesto dalla tabella sessions
    const { bacSeries, ...sessionWithoutBacSeries } = session;
    
    // Normalizza i drinks per assicurarsi che siano serializzabili
    const normalizedDrinks = session.drinks?.map(drink => {
      // drink.time è una stringa secondo l'interfaccia Drink
      const formattedTime = drink.time || new Date().toISOString();

      return {
        id: drink.id,
        name: drink.name,
        volume: typeof drink.volume === 'string' ? drink.volume : String(drink.volume || 0),
        volumeInMl: typeof drink.volumeInMl === 'number' ? drink.volumeInMl : parseFloat(String(drink.volumeInMl || 0)),
        alcoholPercentage: typeof drink.alcoholPercentage === 'number' ? drink.alcoholPercentage : parseFloat(String(drink.alcoholPercentage || 0)),
        alcoholGrams: typeof drink.alcoholGrams === 'number' ? drink.alcoholGrams : parseFloat(String(drink.alcoholGrams || 0)),
        time: formattedTime
      };
    }) || [];
    
    // Normalizza i foods per assicurarsi che siano serializzabili
    const normalizedFoods = session.foods?.map(food => {
      // Per food.time, dobbiamo convertirlo in stringa
      let formattedTime: string;
      
      if (food.time) {
        formattedTime = food.time;
      } else if (food.timeConsumed instanceof Date) {
        formattedTime = food.timeConsumed.toISOString();
      } else {
        formattedTime = new Date().toISOString();
      }

      return {
        id: food.id,
        name: food.name,
        absorptionFactor: food.absorptionFactor || 1.0,
        time: formattedTime
      };
    }) || [];
    
    // Prepara i dati della sessione in un formato compatibile con il database
    const sessionData = {
      id: session.id,
      user_id: userId, // Usa sempre l'ID dell'utente correntemente autenticato
      profile_id: session.profile.id,
      data: {
        start_time: new Date(session.startTime).toISOString(),
        end_time: session.endTime ? new Date(session.endTime).toISOString() : null,
        max_bac: session.currentBAC || 0,
        current_bac: session.currentBAC || 0,
        mode: 'advanced',
        drinks: normalizedDrinks,
        foods: normalizedFoods,
        status: session.status || 'safe',
        soberTime: session.soberTime || '0:00',
        legalTime: session.legalTime || '0:00'
      },
      is_active: is_active,
      updated_at: new Date().toISOString()
    };
    
    console.log(`Saving session to Supabase: ${session.id} for user: ${userId}, profile: ${session.profile.id}`);
    
    // Salva o aggiorna la sessione
    const { data, error } = await supabase
      .from('sessions')
      .upsert(sessionData, { onConflict: 'id' });
      
    if (error) {
      console.error('Error saving session to Supabase:', error);
      return false;
    }
    
    console.log(`Session saved successfully: ${session.id}`);
    return true;
  } catch (error) {
    console.error('Error in saveSessionToSupabase:', error);
    return false;
  }
}

// Sincronizza le sessioni con Supabase
export async function syncWithSupabase(userId: string): Promise<boolean> {
  try {
    console.log('Starting sync with Supabase');
    
    // Verifica che l'ID utente sia valido
    if (!userId) {
      console.error('Invalid user ID for syncing with Supabase');
      return false;
    }
    
    // Se c'è una sessione attiva, salvala su Supabase
    if (activeSession) {
      console.log('Saving active session to Supabase');
      await saveSessionToSupabase(activeSession, !activeSession.isClosed);
    }
    
    // Sincronizza la cronologia delle sessioni
    if (sessionHistory.length > 0) {
      console.log(`Syncing ${sessionHistory.length} sessions with Supabase`);
      
      for (const session of sessionHistory) {
        await saveSessionToSupabase(session, false);
      }
    }
    
    // Carica le sessioni da Supabase per l'utente corrente
    const { data: supabaseSessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error loading sessions from Supabase:', error);
      return false;
    }
    
    // Se non ci sono sessioni su Supabase, non fare niente
    if (!supabaseSessions || supabaseSessions.length === 0) {
      console.log('No sessions found in Supabase');
      return true;
    }
    
    console.log(`Loaded ${supabaseSessions.length} sessions from Supabase for user ${userId}`);
    
    // Trova la sessione attiva su Supabase
    const activeSessionFromSupabase = supabaseSessions.find(s => s.is_active);
    
    // Se c'è una sessione attiva su Supabase ma non localmente, usala
    if (activeSessionFromSupabase && !activeSession) {
      console.log('Using active session from Supabase');
      
      // Carica i dettagli del profilo per la sessione attiva
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', activeSessionFromSupabase.profile_id)
          .single();
          
        if (profileData) {
          // Integra i dati del profilo nella sessione
          const completeSession = mapSupabaseSessionToLocal(activeSessionFromSupabase);
          
          // Aggiorna i dati del profilo se disponibili
          completeSession.profile = {
            ...completeSession.profile,
            name: profileData.name || '',
            gender: profileData.gender || 'male',
            weightKg: profileData.weightKg || 0,
            age: profileData.age || 0,
            height: profileData.height || 0,
            drinkingFrequency: profileData.drinkingFrequency || 'occasionally',
            emoji: profileData.emoji || '',
            color: profileData.color || ''
          };
          
          // Salva la sessione attiva localmente
          activeSession = completeSession;
          await saveSessionLocally(activeSession, 'active');
        }
      } catch (profileError) {
        console.error('Error loading profile for active session:', profileError);
        // Continua comunque con i dati di base
        activeSession = mapSupabaseSessionToLocal(activeSessionFromSupabase);
        await saveSessionLocally(activeSession, 'active');
      }
    }
    
    // Aggiorna la cronologia delle sessioni
    const historySessions = supabaseSessions.filter(s => !s.is_active);
    
    // Converti le sessioni remote in formato locale
    const remoteHistorySessions = await Promise.all(
      historySessions.map(async (session) => {
        const localSession = mapSupabaseSessionToLocal(session);
        
        // Carica i dettagli del profilo per arricchire i dati
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.profile_id)
            .single();
            
          if (profileData) {
            // Aggiorna i dati del profilo
            localSession.profile = {
              ...localSession.profile,
              name: profileData.name || '',
              gender: profileData.gender || 'male',
              weightKg: profileData.weightKg || 0,
              age: profileData.age || 0,
              height: profileData.height || 0,
              drinkingFrequency: profileData.drinkingFrequency || 'occasionally',
              emoji: profileData.emoji || '',
              color: profileData.color || ''
            };
          }
        } catch (profileError) {
          console.error(`Error loading profile for session ${session.id}:`, profileError);
          // Continue with basic data
        }
        
        return localSession;
      })
    );
    
    // Inizializza la cronologia unendo le sessioni locali e remote
    // Stiamo sovrascrivendo completamente con le sessioni remote per garantire coerenza
    sessionHistory = remoteHistorySessions;
    
    // Salvataggio sessioni in cronologia
    await saveSessionLocally(sessionHistory, 'history');
    
    console.log(`Syncronized ${sessionHistory.length} sessions in history`);
    return true;
  } catch (error) {
    console.error('Error syncing with Supabase:', error);
    return false;
  }
}

// Funzione di utilità per mappare una sessione da Supabase al formato locale
function mapSupabaseSessionToLocal(supabaseSession: any): Session {
  // Estrai i dati della sessione dal campo data
  const sessionData = supabaseSession.data || {};
  
  // Crea un oggetto di sessione locale dal formato Supabase
  return {
    id: supabaseSession.id,
    profile: {
      id: supabaseSession.profile_id,
      // Questi campi verranno popolati quando necessario
      name: '',
      gender: 'male',
      weightKg: 0,
      age: 0,
      height: 0,
      drinkingFrequency: 'occasionally',
      emoji: '',
      color: '',
    },
    user_id: supabaseSession.user_id,
    startTime: sessionData.start_time ? new Date(sessionData.start_time) : new Date(),
    sessionStartTime: sessionData.start_time ? new Date(sessionData.start_time) : new Date(),
    endTime: sessionData.end_time ? new Date(sessionData.end_time) : undefined,
    isClosed: !supabaseSession.is_active,
    drinks: sessionData.drinks || [],
    foods: sessionData.foods || [],
    currentBAC: sessionData.current_bac || 0,
    maxBac: sessionData.max_bac || 0,
    bacSeries: [],
    // Campi mancanti richiesti dal tipo Session
    status: 'safe',
    bacTimePoints: [],
    soberTime: '0:00',
    sessionDuration: '0:00',
    timeToSober: 0,
    legalTime: '0:00',
    timeToLegal: 0
  };
}

// Termina una sessione
export async function endSession(): Promise<boolean> {
  try {
    // Se non c'è una sessione attiva, non fare niente
    if (!activeSession) {
      console.log('No active session to end');
      return false;
    }
    
    console.log(`=== TERMINAZIONE SESSIONE ${activeSession.id} ===`);
    
    // Imposta prima il flag isClosed
    activeSession.isClosed = true;
    
    // Aggiorna il tasso alcolemico un'ultima volta
    updateSessionBAC();
    
    // Crea una copia della sessione da salvare nella cronologia
    const sessionToSave = {...activeSession};
    
    // Imposta l'ora di fine
    sessionToSave.endTime = new Date();
    // Il flag isClosed dovrebbe già essere true, ma lo impostiamo di nuovo per sicurezza
    sessionToSave.isClosed = true;
    
    // Salva la sessione nella cronologia
    sessionHistory.push(sessionToSave);
    await saveSessionLocally(sessionHistory, 'history');
    
    // Salva su Supabase se l'utente è autenticato
    const userId = await getCurrentUserId();
    if (userId) {
      await saveSessionToSupabase(sessionToSave, false);
    }
    
    // Ottieni la chiave corretta per la sessione attiva
    const activeSessionKey = getActiveSessionKey(userId);
    console.log('Rimozione sessione attiva con chiave:', activeSessionKey);
    
    // Pulizia completa della sessione attiva
    // 1. Elimina dalla memoria
    activeSession = null;
    
    // 2. Elimina da AsyncStorage con doppio controllo di rimozione
    await AsyncStorage.removeItem(activeSessionKey);
    
    // 3. Verifica che sia stata rimossa correttamente
    const checkRemoval = await AsyncStorage.getItem(activeSessionKey);
    if (checkRemoval) {
      console.warn('La sessione attiva non è stata rimossa correttamente, nuovo tentativo');
      await AsyncStorage.removeItem(activeSessionKey);
    }
    
    // 4. Verifica una seconda volta
    const doubleCheck = await AsyncStorage.getItem(activeSessionKey);
    if (doubleCheck) {
      console.error('ERRORE CRITICO: Impossibile rimuovere la sessione attiva');
      // Tenta una pulizia più aggressiva
      const allKeys = await AsyncStorage.getAllKeys();
      const sessionActiveKeys = allKeys.filter(key => 
        key.includes('active_session') || 
        key.includes(activeSessionKey)
      );
      
      if (sessionActiveKeys.length > 0) {
        console.log('Tentativo di pulizia aggressiva con queste chiavi:', sessionActiveKeys);
        await AsyncStorage.multiRemove(sessionActiveKeys);
      }
    } else {
      console.log('Sessione attiva rimossa con successo dalla memoria e dallo storage');
    }
    
    return true;
  } catch (error) {
    console.error('Error ending session:', error);
    return false;
  }
}

// Aggiorna il tasso alcolemico della sessione attiva
export function updateSessionBAC(): Session | null {
  try {
    if (!activeSession || !activeSession.profile) {
      console.log('updateSessionBAC: Nessuna sessione attiva');
      return null;
    }

    // Funzione di supporto per parse delle date
    const safeParseDate = (dateValue: any): Date => {
      if (!dateValue) return new Date();
      
      try {
        if (dateValue instanceof Date) return dateValue;
        if (typeof dateValue === 'string') return new Date(dateValue);
        return new Date();
      } catch (error) {
        console.error('Error parsing date:', error);
        return new Date();
      }
    };

    const now = new Date();
    const { gender, weightKg } = activeSession.profile;
    const drinks = activeSession.drinks || [];
    const foods = activeSession.foods || [];

    if (drinks.length === 0) {
      // Se non ci sono bevande, il BAC è 0
      activeSession.currentBAC = 0;
      activeSession.soberTime = '0h 0m';
      activeSession.timeToSober = 0;
      activeSession.status = 'safe';
      return activeSession;
    }

    // Prepara i drink per il calcolo del BAC
    const drinksForBac = drinks.map(drink => {
      // Assicurati che tutti i valori siano numeri
      let alcoholGrams: number;
      
      if (typeof drink.alcoholGrams === 'string') {
        alcoholGrams = parseFloat(drink.alcoholGrams);
      } else {
        alcoholGrams = drink.alcoholGrams as number || 0;
      }
      
      // Se i grammi sono troppo bassi (probabilmente un errore), ricalcola
      if (alcoholGrams < 0.1) {
        const volume = parseFloat(drink.volume);
        const alcoholPercentage = typeof drink.alcoholPercentage === 'string' 
          ? parseFloat(drink.alcoholPercentage) 
          : drink.alcoholPercentage as number;
        
        // Formula: volume (ml) * percentuale (%) * 0.789 (densità alcol) / 100
        alcoholGrams = (volume * alcoholPercentage * 0.789) / 100;
      }
      
      const drinkTime = safeParseDate(drink.time);
      const timeSinceDrink = (now.getTime() - drinkTime.getTime()) / (1000 * 60 * 60);
      
      console.log(`updateSessionBAC: Bevanda ${drink.name}, grammi alcol: ${alcoholGrams}, tempo trascorso: ${timeSinceDrink.toFixed(2)}h`);
      
      return {
        alcoholGrams: alcoholGrams,
        hoursSinceDrink: timeSinceDrink,
        time: drinkTime
      };
    });
    
    // Calcola il BAC totale
    let totalAlcoholGrams = drinksForBac.reduce((total, drink) => total + drink.alcoholGrams, 0);
    console.log(`updateSessionBAC: Totale grammi alcol: ${totalAlcoholGrams}`);
    
    // Usa la formula di Widmark per calcolare il BAC
    // Fattore r (distribuzione dell'alcol nel corpo)
    const r = gender === 'male' ? 0.68 : 0.55;
    
    // Calcola il BAC iniziale (senza considerare l'eliminazione)
    // BAC = A / (r * W * 10) dove:
    // A = grammi di alcol
    // r = fattore di distribuzione (L/kg)
    // W = peso in kg
    // 10 = fattore di conversione per ottenere g/L
    const initialBAC = totalAlcoholGrams / (r * weightKg);
    
    // Calcola il fattore di assorbimento in base ai cibi consumati
    let foodAbsorptionFactor = 1.0; // Default: nessun effetto del cibo (fattore 1.0)
    
    if (foods && foods.length > 0) {
      // Ordina i cibi per orario di consumo (dal più recente)
      const sortedFoods = [...foods].sort((a, b) => {
        const timeA = safeParseDate(a.time || a.timeConsumed).getTime();
        const timeB = safeParseDate(b.time || b.timeConsumed).getTime();
        return timeB - timeA; // Ordine decrescente (più recente prima)
      });
      
      // Prendi il cibo più recente
      const mostRecentFood = sortedFoods[0];
      if (mostRecentFood) {
        const foodTime = safeParseDate(mostRecentFood.time || mostRecentFood.timeConsumed);
        const hoursSinceFood = (now.getTime() - foodTime.getTime()) / (1000 * 60 * 60);
        
        // L'effetto del cibo diminuisce nel tempo (massimo 4 ore)
        if (hoursSinceFood <= 4) {
          // L'effetto del cibo è massimo subito dopo averlo consumato e diminuisce gradualmente
          const effectStrength = Math.max(0, 1 - (hoursSinceFood / 4));
          
          // Applica il fattore di assorbimento corretto
          // I valori tipici sono tra 0.3 (pasto abbondante) e 0.8 (snack leggero)
          // Più basso è il fattore, più forte è l'effetto di riduzione del BAC
          foodAbsorptionFactor = 1.0 - ((1.0 - mostRecentFood.absorptionFactor) * effectStrength);
          
          console.log(`updateSessionBAC: Cibo recente (${hoursSinceFood.toFixed(2)}h fa): ${mostRecentFood.name}, fattore: ${mostRecentFood.absorptionFactor}, effetto: ${foodAbsorptionFactor.toFixed(2)}`);
        }
      }
    }
    
    // Applica il fattore di assorbimento del cibo al BAC iniziale
    let calculatedBAC = initialBAC * foodAbsorptionFactor;
    
    // Sottrai l'alcol metabolizzato nel tempo
    // Per ogni drink, considera quanto alcol è stato metabolizzato dal momento dell'assunzione
    const metabolismRate = 0.015; // g/L all'ora
    
    drinksForBac.forEach(drink => {
      const metabolizedAmount = Math.min(drink.alcoholGrams / (r * weightKg), metabolismRate * drink.hoursSinceDrink);
      calculatedBAC -= metabolizedAmount;
    });
    
    // Assicurati che il BAC non sia negativo
    calculatedBAC = Math.max(0, calculatedBAC);
    
    // Arrotonda a 2 decimali
    calculatedBAC = Math.round(calculatedBAC * 100) / 100;
    
    console.log(`updateSessionBAC: BAC calcolato: ${calculatedBAC}, con fattore cibo: ${foodAbsorptionFactor.toFixed(2)}`);
    
    // Aggiorna il BAC della sessione
    activeSession.currentBAC = calculatedBAC;
    
    // Aggiorna il BAC time point attuale se esiste
    if (activeSession.bacTimePoints && activeSession.bacTimePoints.length > 0) {
      activeSession.bacTimePoints[activeSession.bacTimePoints.length - 1] = calculatedBAC;
    }
    
    // Calcola il tempo per tornare sobri (BAC < 0.01)
    if (calculatedBAC > 0.01) {
      const hoursToSober = calculatedBAC / metabolismRate;
      const hours = Math.floor(hoursToSober);
      const minutes = Math.round((hoursToSober - hours) * 60);
      activeSession.soberTime = `${hours}h ${minutes}m`;
      activeSession.timeToSober = Math.ceil(hoursToSober * 60); // In minuti
    } else {
      activeSession.soberTime = '0h 0m';
      activeSession.timeToSober = 0;
    }
    
    // Aggiorna lo stato della sessione in base al BAC
    if (calculatedBAC < 0.03) {
      activeSession.status = 'safe';
    } else if (calculatedBAC < 0.08) {
      activeSession.status = 'caution';
    } else if (calculatedBAC < 0.15) {
      activeSession.status = 'warning';
    } else if (calculatedBAC < 0.3) {
      activeSession.status = 'danger';
    } else {
      activeSession.status = 'critical';
    }
    
    return activeSession;
  } catch (error) {
    console.error('Error updating session BAC:', error);
    return null;
  }
}

// Funzione per generare i dati del grafico BAC
function generateBacSeriesForChart(session: Session, drinks: Drink[], currentTime: Date, r: number, weightKg: number, metabolismRate: number): void {
  try {
    // Se non ci sono drink, imposta un grafico vuoto
    if (!drinks || drinks.length === 0) {
      session.bacSeries = [];
      return;
    }
    
    // Ordina i drink per orario
    const sortedDrinks = [...drinks].sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    
    // Punti iniziali per il grafico
    const bacSeries = [];
    
    // 1. Punto iniziale 15 minuti prima del primo drink (BAC = 0)
    const firstDrinkTime = new Date(sortedDrinks[0].time);
    const startTime = new Date(firstDrinkTime.getTime() - 15 * 60 * 1000);
    
    bacSeries.push({
      time: startTime.toISOString(),
      bac: 0,
      isDrinkPoint: false,
      drinksCount: 0
    });
    
    // 2. Punto per ogni bevanda con BAC calcolato fino a quel momento
    let runningBAC = 0;
    let drinksSoFar = 0;
    
    for (const drink of sortedDrinks) {
      const drinkTime = new Date(drink.time);
      drinksSoFar++;
      
      // Calcola il BAC per tutte le bevande fino a questo momento
      let totalBAC = 0;
      
      // Per ogni drink consumato fino a questo punto
      for (let i = 0; i < drinksSoFar; i++) {
        const previousDrink = sortedDrinks[i];
        const prevDrinkTime = new Date(previousDrink.time);
        
        // Calcola i grammi di alcol
        let alcoholGrams = typeof previousDrink.alcoholGrams === 'string'
          ? parseFloat(previousDrink.alcoholGrams)
          : (previousDrink.alcoholGrams as number || 0);
        
        // Ricalcola i grammi se sembrano troppo bassi
        if (alcoholGrams < 0.1) {
          const volume = parseFloat(previousDrink.volume);
          const alcoholPercentage = typeof previousDrink.alcoholPercentage === 'string'
            ? parseFloat(previousDrink.alcoholPercentage)
            : (previousDrink.alcoholPercentage as number || 0);
          
          alcoholGrams = (volume * alcoholPercentage * 0.789) / 100;
        }
        
        // Calcola il BAC iniziale per questo drink
        const initialBac = alcoholGrams / (r * weightKg);
        
        // Calcola quanto tempo è passato da quando è stato consumato questo drink (in ore)
        const hoursSinceDrink = (drinkTime.getTime() - prevDrinkTime.getTime()) / (1000 * 60 * 60);
        
        // Calcola il BAC metabolizzato (se negativo, non è stato metabolizzato nulla)
        const metabolizedBac = Math.max(0, metabolismRate * hoursSinceDrink);
        
        // BAC rimanente = BAC iniziale - metabolizzato
        const remainingBac = Math.max(0, initialBac - metabolizedBac);
        
        // Aggiungi al BAC totale
        totalBAC += remainingBac;
      }
      
      // Punto per questa bevanda
      bacSeries.push({
        time: drinkTime.toISOString(),
        bac: parseFloat(totalBAC.toFixed(4)),
        isDrinkPoint: true,
        drinksCount: drinksSoFar
      });
      
      // Aggiorna il running BAC
      runningBAC = totalBAC;
    }
    
    // 3. Punto per il momento attuale
    // Calcola il BAC al momento attuale basato sull'ultima bevanda e il tempo passato
    let currentBAC = 0;
    for (const drink of sortedDrinks) {
      const drinkTime = new Date(drink.time);
      
      // Calcola i grammi di alcol
      let alcoholGrams = typeof drink.alcoholGrams === 'string'
        ? parseFloat(drink.alcoholGrams)
        : (drink.alcoholGrams as number || 0);
      
      // Ricalcola i grammi se sembrano troppo bassi
      if (alcoholGrams < 0.1) {
        const volume = parseFloat(drink.volume);
        const alcoholPercentage = typeof drink.alcoholPercentage === 'string'
          ? parseFloat(drink.alcoholPercentage)
          : (drink.alcoholPercentage as number || 0);
        
        alcoholGrams = (volume * alcoholPercentage * 0.789) / 100;
      }
      
      // Calcola il BAC iniziale per questo drink
      const initialBac = alcoholGrams / (r * weightKg);
      
      // Calcola quanto tempo è passato da quando è stato consumato questo drink (in ore)
      const hoursSinceDrink = (currentTime.getTime() - drinkTime.getTime()) / (1000 * 60 * 60);
      
      // Calcola il BAC metabolizzato
      const metabolizedBac = Math.max(0, metabolismRate * hoursSinceDrink);
      
      // BAC rimanente = BAC iniziale - metabolizzato
      const remainingBac = Math.max(0, initialBac - metabolizedBac);
      
      // Aggiungi al BAC totale
      currentBAC += remainingBac;
    }
    
    // Aggiungi punto per il momento attuale se è diverso dall'ultimo drink
    const lastDrinkTime = new Date(sortedDrinks[sortedDrinks.length - 1].time);
    if (Math.abs(currentTime.getTime() - lastDrinkTime.getTime()) > 60000) { // Se passato più di 1 minuto
      bacSeries.push({
        time: currentTime.toISOString(),
        bac: parseFloat(currentBAC.toFixed(4)),
        isDrinkPoint: false,
        drinksCount: sortedDrinks.length
      });
    }
    
    // 4. Punto di sobrietà (BAC = 0)
    if (session.timeToSober && session.timeToSober > 0) {
      const soberTime = new Date(currentTime.getTime() + session.timeToSober * 60 * 1000);
      bacSeries.push({
        time: soberTime.toISOString(),
        bac: 0,
        isDrinkPoint: false,
        drinksCount: sortedDrinks.length
      });
    }
    
    // Ordina i punti per timestamp per sicurezza
    bacSeries.sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    
    // Imposta la serie BAC nella sessione
    session.bacSeries = bacSeries;
    
  } catch (error) {
    console.error('Error generating BAC series:', error);
    
    // Grafico di fallback in caso di errore
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const soberTime = new Date(now.getTime() + (session.timeToSober || 0) * 60 * 1000);
    
    session.bacSeries = [
      { time: oneHourAgo.toISOString(), bac: 0, isDrinkPoint: false, drinksCount: 0 },
      { time: now.toISOString(), bac: session.currentBAC, isDrinkPoint: false, drinksCount: drinks.length },
      { time: soberTime.toISOString(), bac: 0, isDrinkPoint: false, drinksCount: drinks.length }
    ];
  }
}

// Ripulisce tutte le sessioni dalla memoria e dal localStorage
// Utile quando si cambia account o si fa logout
export async function clearAllSessions(): Promise<boolean> {
  try {
    console.log('Pulizia completa di tutte le sessioni...');
    
    // Resetta le variabili globali
    activeSession = null;
    sessionHistory = [];
    _initialized = false;
    _currentUserId = null;
    _currentUserIdCache = null;
    
    // Rimuovi dal localStorage tutte le chiavi correlate alle sessioni
    const allKeys = await AsyncStorage.getAllKeys();
    const sessionKeys = allKeys.filter(key => 
      key.includes('session') || 
      key.includes('_active_') || 
      key.includes('_history_')
    );
    
    if (sessionKeys.length > 0) {
      console.log(`Rimozione di ${sessionKeys.length} chiavi di sessione:`, sessionKeys);
      await AsyncStorage.multiRemove(sessionKeys);
    }
    
    console.log('Pulizia sessioni completata');
    return true;
  } catch (error) {
    console.error('Errore durante la pulizia delle sessioni:', error);
    return false;
  }
}

// Elimina i dati utente
export const clearUserData = async (userId: string): Promise<void> => {
  try {
    console.log(`Clearing data for user ${userId}`);
    
    // Elimina le sessioni
    const sessionKeys = [
      getActiveSessionKey(userId),
      getSessionHistoryKey(userId)
    ];
    
    for (const key of sessionKeys) {
      await AsyncStorage.removeItem(key);
    }
    
    // Azzera lo stato in memoria
    if (_currentUserIdCache === userId) {
      _currentUserIdCache = null;
    }
    
    // Reimposta il servizio
    activeSession = null;
    sessionHistory = [];
    _initialized = false;
    
    console.log('User data cleared successfully');
  } catch (error) {
    console.error('Error clearing user data:', error);
    throw error;
  }
};

// Funzione per eliminare una sessione specifica
export function deleteSession(sessionId: string): boolean {
  try {
    // Se è la sessione attiva, cancellala
    if (activeSession && activeSession.id === sessionId) {
      console.log(`Deleting active session ${sessionId}`);
      activeSession = null;
      
      // Rimuovi da localStorage in modo asincrono
      getCurrentUserId().then(userId => {
        const key = getActiveSessionKey(userId);
        AsyncStorage.removeItem(key);
      });
    }
    
    // Se è nella cronologia, rimuovila
    const index = sessionHistory.findIndex(s => s.id === sessionId);
    if (index >= 0) {
      sessionHistory.splice(index, 1);
      
      // Salva la cronologia aggiornata
      getCurrentUserId().then(userId => {
        const key = getSessionHistoryKey(userId);
        AsyncStorage.setItem(key, JSON.stringify(sessionHistory));
      });
      
      // Elimina anche da Supabase se l'utente è autenticato
      getCurrentUserId().then(userId => {
        if (userId) {
          deleteSessionFromSupabase(sessionId);
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

// Funzione per eliminare una sessione da Supabase
export async function deleteSessionFromSupabase(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .match({ id: sessionId });
      
    if (error) {
      console.error('Error deleting session from Supabase:', error);
      return false;
    }
    
    console.log(`Session ${sessionId} deleted from Supabase`);
    return true;
  } catch (error) {
    console.error('Error deleting session from Supabase:', error);
    return false;
  }
}

// Funzioni helper

// Formatta la durata in minuti in un formato leggibile
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

// Formatta il tempo per tornare sobri in un formato leggibile
function formatTimeToSober(minutes: number): string {
  if (minutes <= 0) return "Adesso";
  return formatDuration(minutes);
}

// Crea una nuova sessione per un profilo
export async function createSession(profile: UserProfile): Promise<Session | null> {
  try {
    console.log('=== CREAZIONE NUOVA SESSIONE ===');
    
    if (!profile || !profile.id) {
      console.error('Dati del profilo non validi');
      return null;
    }
    
    // Ottieni informazioni sull'utente corrente
    const currentUser = await getCurrentUser();
    const currentUserId = currentUser?.id;
    
    console.log('--Dettagli sessione--');
    console.log('ID Profilo selezionato:', profile.id);
    console.log('Nome Profilo:', profile.name);
    console.log('ID Utente Corrente:', currentUserId);
    console.log('ID Utente Profilo:', profile.userId);
    
    // CONTROLLO RIGOROSO: verifica che il profilo appartenga all'utente corrente
    let profileToUse = profile;
    let useInternalProfile = false;
    
    if (currentUserId) { // L'utente è autenticato
      // Se il profilo NON appartiene all'utente corrente, oppure non ha un userId assegnato
      if (!profile.userId || profile.userId !== currentUserId) {
        console.warn('ERRORE: Il profilo selezionato non appartiene all\'utente corrente!');
        useInternalProfile = true;
      }
    } else { // L'utente è ospite
      // Se il profilo ha un userId ma l'utente è ospite, il profilo non è valido
      if (profile.userId) {
        console.warn('ERRORE: Il profilo selezionato è di un utente autenticato ma l\'utente corrente è ospite!');
        useInternalProfile = true;
      }
    }
    
    // Se è necessario utilizzare un profilo interno, trova il profilo corretto
    if (useInternalProfile) {
      console.log('Ricerca profilo valido per l\'utente corrente...');
      
      // Forza un aggiornamento dal database se l'utente è autenticato
      if (currentUserId) {
        try {
          // Esegui una query diretta al database per ottenere i profili dell'utente
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', currentUserId);
          
          if (error) {
            throw new Error(`Errore nel caricamento dei profili dal database: ${error.message}`);
          }
          
          if (data && data.length > 0) {
            console.log(`Trovati ${data.length} profili validi nel database`);
            
            // Converti il profilo dal database al formato locale
            const dbProfile = data[0]; // Usa il primo profilo trovato
            profileToUse = {
              id: dbProfile.id,
              userId: dbProfile.user_id,
              name: dbProfile.name,
              gender: dbProfile.gender,
              weightKg: dbProfile.weightKg,
              age: dbProfile.age,
              height: dbProfile.height,
              drinkingFrequency: dbProfile.drinkingFrequency,
              emoji: dbProfile.emoji,
              color: dbProfile.color,
              isDefault: dbProfile.is_default,
              isGuest: false,
              createdAt: dbProfile.created_at,
              updatedAt: dbProfile.updated_at,
              hasCompletedWizard: dbProfile.has_completed_wizard
            };
            
            console.log('Utilizzerò il profilo dal database:', profileToUse.id, profileToUse.name);
          } else {
            console.warn('Nessun profilo trovato nel database, creazione sessione annullata');
            return null;
          }
        } catch (dbError) {
          console.error('Errore nel recupero dei profili dal database:', dbError);
          // Continua con il tentativo di trovare un profilo locale
        }
      } else {
        // Per utenti ospiti, cerca profili ospite locali
        try {
          // Importa direttamente le funzioni dal servizio dei profili per evitare dipendenze circolari
          const profileService = require('./profile.service').default;
          
          // Ottieni profili ospite
          const guestProfiles = await profileService.getGuestProfiles();
          
          if (guestProfiles && guestProfiles.length > 0) {
            profileToUse = guestProfiles[0]; // Usa il primo profilo ospite trovato
            console.log('Utilizzerò il profilo ospite:', profileToUse.id, profileToUse.name);
          } else {
            console.warn('Nessun profilo ospite trovato, creazione sessione annullata');
            return null;
          }
        } catch (profileError) {
          console.error('Errore nel recupero dei profili ospite:', profileError);
          return null;
        }
      }
    }
    
    // Doppio controllo finale che il profilo sia valido
    if (!profileToUse || !profileToUse.id) {
      console.error('Impossibile trovare un profilo valido per la sessione');
      return null;
    }
    
    // Crea un ID univoco per la sessione
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Assicurati che user_id sia corretto
    const user_id = currentUserId || null;
    
    console.log('Creazione sessione con:');
    console.log('- ID Sessione:', uniqueId);
    console.log('- ID Utente:', user_id);
    console.log('- Profilo:', profileToUse.id, profileToUse.name);
    
    // Crea una nuova sessione
    const newSession: Session = {
      id: uniqueId,
      startTime: new Date(),
      sessionStartTime: new Date(),
      profile: profileToUse,
      drinks: [],
      foods: [],
      currentBAC: 0,
      status: 'safe',
      bacTimePoints: [],
      soberTime: '0:00',
      sessionDuration: '0:00',
      timeToSober: 0,
      legalTime: '0:00',
      timeToLegal: 0,
      bacSeries: [],
      user_id: user_id,
      updated_at: new Date().toISOString(),
      isClosed: false
    };

    // Imposta la sessione come attiva in memoria
    activeSession = newSession;
    console.log('Nuova sessione creata con successo');

    // Salva la sessione localmente
    await saveSessionLocally(newSession, 'active');

    // Sincronizza con Supabase se l'utente è autenticato
    if (user_id) {
      await saveSessionToSupabase(newSession, true);
    }
    
    return newSession;
  } catch (error) {
    console.error('Errore durante la creazione della sessione:', error);
    return null;
  }
}

/**
 * Funzione di riparazione per verificare e correggere l'integrità delle sessioni
 * Utile per risolvere problemi dopo cambio account, logout, ecc.
 */
export async function ensureSessionIntegrity(): Promise<boolean> {
  try {
    console.log('=== VERIFICA INTEGRITÀ SESSIONI ===');
    
    // 1. Ottieni l'utente corrente
    const currentUser = await getCurrentUser();
    const currentUserId = currentUser?.id;
    console.log('Utente corrente:', currentUserId || 'ospite');
    
    let sessionsFixed = false;
    
    // 2. Controlla la sessione attiva
    if (activeSession) {
      console.log('Sessione attiva trovata:', activeSession.id);
      
      // Se l'utente è autenticato...
      if (currentUserId) {
        // ...ma la sessione non ha user_id o ha un user_id diverso
        if (!activeSession.user_id || activeSession.user_id !== currentUserId) {
          console.log('Riparazione: la sessione attiva appartiene a un altro utente');
          
          // Se il profilo non appartiene all'utente corrente, termina la sessione
          if (activeSession.profile.userId && activeSession.profile.userId !== currentUserId) {
            console.log('Terminazione sessione attiva non valida');
            activeSession = null;
            await AsyncStorage.removeItem(getActiveSessionKey(currentUserId));
            sessionsFixed = true;
          } else {
            // Altrimenti, associa la sessione all'utente corrente
            activeSession.user_id = currentUserId;
            await saveSessionLocally(activeSession, 'active');
            sessionsFixed = true;
          }
        }
      } else { // Se l'utente è ospite...
        // ...ma la sessione ha un user_id
        if (activeSession.user_id) {
          console.log('Riparazione: la sessione attiva appartiene a un utente autenticato ma l\'utente è ospite');
          activeSession = null;
          await AsyncStorage.removeItem(getActiveSessionKey(null));
          sessionsFixed = true;
        }
      }
    }
    
    // 3. Controlla la cronologia delle sessioni
    if (sessionHistory.length > 0) {
      console.log(`Verifica di ${sessionHistory.length} sessioni nella cronologia`);
      
      let validHistory: Session[] = [];
      
      if (currentUserId) {
        // L'utente è autenticato, mantieni solo le sessioni di questo utente
        validHistory = sessionHistory.filter(s => !s.user_id || s.user_id === currentUserId);
        
        if (validHistory.length !== sessionHistory.length) {
          console.log(`Rimozione di ${sessionHistory.length - validHistory.length} sessioni non valide dalla cronologia`);
          sessionHistory = validHistory;
          await saveSessionLocally(sessionHistory, 'history');
          sessionsFixed = true;
        }
      } else {
        // L'utente è ospite, mantieni solo le sessioni senza user_id
        validHistory = sessionHistory.filter(s => !s.user_id);
        
        if (validHistory.length !== sessionHistory.length) {
          console.log(`Rimozione di ${sessionHistory.length - validHistory.length} sessioni non valide dalla cronologia dell'ospite`);
          sessionHistory = validHistory;
          await saveSessionLocally(sessionHistory, 'history');
          sessionsFixed = true;
        }
      }
    }
    
    console.log(sessionsFixed ? 'Riparazioni effettuate con successo' : 'Nessuna riparazione necessaria');
    return true;
  } catch (error) {
    console.error('Errore durante la verifica dell\'integrità delle sessioni:', error);
    return false;
  }
}

/**
 * Ottiene o crea una sessione con il primo profilo trovato
 */
export async function getOrCreateSessionWithFirstProfile(): Promise<Session | null> {
  try {
    // Controlla se c'è già una sessione attiva
    if (activeSession) {
      return activeSession;
    }
    
    // Verifica l'integrità delle sessioni prima di crearne una nuova
    await ensureSessionIntegrity();
    
    // Importa direttamente le funzioni dal servizio dei profili
    const profileService = require('./profile.service').default;
    
    // Ottieni l'utente corrente
    const currentUser = await getCurrentUser();
    
    // Scegli la funzione giusta in base al tipo di utente
    const profiles = currentUser 
      ? await profileService.getProfiles(true) // Ottieni profili utente forzando il refresh
      : await profileService.getGuestProfiles(); // Ottieni profili ospite
    
    if (!profiles || profiles.length === 0) {
      console.log('Nessun profilo trovato per creare una sessione');
      return null;
    }
    
    // Prendi il profilo predefinito o il primo disponibile
    const profileToUse = profiles.find(p => p.isDefault) || profiles[0];
    
    // Crea una sessione con il profilo trovato
    return await createSession(profileToUse);
  } catch (error) {
    console.error('Errore in getOrCreateSessionWithFirstProfile:', error);
    return null;
  }
}

/**
 * Aggiunge una bevanda alla sessione attiva e aggiorna il BAC
 */
export async function addDrink(drink: Drink): Promise<boolean> {
  try {
    console.log('Tentativo di aggiungere bevanda alla sessione:', drink);
    
    // Verifica se esiste una sessione attiva
    if (!activeSession) {
      console.error('Nessuna sessione attiva trovata');
      return false;
    }
    
    // Assicurati che alcoholGrams sia un numero corretto
    let alcoholGrams: number;
    if (typeof drink.alcoholGrams === 'string') {
      alcoholGrams = parseFloat(drink.alcoholGrams);
    } else {
      alcoholGrams = drink.alcoholGrams as number || 0;
    }
    
    // Verifica che il valore sia ragionevole (minimo 1g per bevanda alcolica)
    if (alcoholGrams < 0.1) {
      // Ricalcola in base a volume e percentuale se il valore è troppo basso
      const volume = parseFloat(drink.volume);
      const alcoholPercentage = typeof drink.alcoholPercentage === 'string' 
        ? parseFloat(drink.alcoholPercentage) 
        : drink.alcoholPercentage as number;
      
      // Formula: volume (ml) * percentuale (%) * 0.789 (densità alcol) / 100
      alcoholGrams = (volume * alcoholPercentage * 0.789) / 100;
      console.log(`Grammi di alcol ricalcolati: ${alcoholGrams.toFixed(2)}g`);
    }
    
    // Assicurati che volumeInMl sia presente per il calcolo del BAC
    const volumeInMl = drink.volumeInMl || parseFloat(drink.volume) || 0;
    
    // Assicurati che alcoholPercentage sia un numero
    const alcoholPercentage = typeof drink.alcoholPercentage === 'string'
      ? parseFloat(drink.alcoholPercentage)
      : drink.alcoholPercentage as number || 0;
    
    // Prepara un oggetto drink completo e normalizzato
    const completeDrink: Drink = {
      ...drink,
      alcoholGrams: alcoholGrams,
      alcoholPercentage: alcoholPercentage,
      volumeInMl: volumeInMl
    };
    
    console.log(`Bevanda normalizzata: ${JSON.stringify({
      nome: completeDrink.name,
      volume: completeDrink.volume + 'ml',
      percentuale: alcoholPercentage + '%',
      grammi: alcoholGrams + 'g'
    })}`);
    
    // Aggiungi il drink alla sessione
    activeSession.drinks.push(completeDrink);
    
    console.log(`Bevanda aggiunta, totale bevande: ${activeSession.drinks.length}, calcolo BAC in corso...`);
    
    // Aggiorna il BAC
    updateSessionBAC();
    
    console.log(`BAC aggiornato a: ${activeSession.currentBAC}`);
    
    // Salva la sessione aggiornata
    await saveSessionLocally(activeSession, 'active');
    
    // Se l'utente è autenticato, sincronizza con Supabase
    if (_currentUserId) {
      try {
        await saveSessionToSupabase(activeSession, true);
      } catch (supabaseError) {
        console.error('Errore durante il salvataggio su Supabase:', supabaseError);
        // Continua comunque, poiché il salvataggio locale è riuscito
      }
    }
    
    console.log('Bevanda aggiunta con successo');
    return true;
  } catch (error) {
    console.error('Errore durante l\'aggiunta della bevanda:', error);
    return false;
  }
}

export async function addFood(food: FoodRecord): Promise<boolean> {
  try {
    if (!activeSession) {
      console.error('No active session found');
      return false;
    }

    // Aggiungi il cibo alla sessione
    activeSession.foods = [...(activeSession.foods || []), food];

    // Aggiorna il BAC considerando l'effetto del cibo
    updateSessionBAC();
    
    // Salva la sessione aggiornata
    await saveSessionLocally(activeSession);
    
    console.log('Food added to session, absorption factor:', food.absorptionFactor);
    console.log('Updated session BAC:', activeSession.currentBAC);
    
    return true;
  } catch (error) {
    console.error('Error adding food to session:', error);
    return false;
  }
}

export async function removeFood(foodId: string): Promise<boolean> {
  try {
    if (!activeSession) {
      console.error('No active session found');
      return false;
    }

    // Verifica se l'elemento cibo esiste
    const foodItem = activeSession.foods?.find(f => f.id === foodId);
    if (!foodItem) {
      console.error('Food item not found');
      return false;
    }

    // Rimuovi il cibo dalla sessione
    activeSession.foods = activeSession.foods?.filter(f => f.id !== foodId) || [];

    // Aggiorna il BAC della sessione
    updateSessionBAC();

    // Salva la sessione aggiornata
    await saveSessionLocally(activeSession);
    
    console.log('Food removed successfully');
    return true;
  } catch (error) {
    console.error('Error removing food from session:', error);
    return false;
  }
}

// Default export - Esporta tutte le funzioni del servizio
export default {
  getActiveSession,
  getSessionHistory,
  setSessionHistory,
  initSessionService,
  loadSessionsFromLocalStorage,
  saveSessionLocally,
  getCurrentUser,
  getCurrentUserId,
  saveSessionToSupabase,
  syncWithSupabase,
  endSession,
  updateSessionBAC,
  clearUserData,
  deleteSession,
  deleteSessionFromSupabase,
  createSession,
  getOrCreateSessionWithFirstProfile,
  addDrink,
  clearAllSessions,
  ensureSessionIntegrity,
  addFood,
  removeFood
};