import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BAC_LIMITS, APP_CONSTANTS } from '../constants/theme';
import { METABOLISM_RATE } from '../constants/bac';
import { useActiveProfiles } from './ProfileContext';
import * as profileService from '../lib/services/profile.service';
import { Session, Drink, BacData, FoodRecord } from '../types/session';
import { calculateAlcoholGrams } from '../lib/bac/calculator';

// Chiavi di storage
const ACTIVE_SESSIONS_KEY = 'bacchus_active_sessions';
const CURRENT_SESSION_ID_KEY = 'bacchus_current_session_id';
const PAST_SESSIONS_KEY = 'bacchus_past_sessions';

// Definizione del contesto
interface SessionContextType {
  activeSessions: Session[];
  currentSession: Session | null;
  isLoading: boolean;
  pastSessions: Session[];
  bacData: BacData | null;
  startSession: (profileId: string) => Promise<void>;
  endSession: (profileId?: string) => Promise<void>;
  addDrink: (drink: Omit<Drink, 'id' | 'timestamp'>) => Promise<void>;
  removeDrink: (drinkId: string) => Promise<void>;
  addFood: (food: Omit<FoodRecord, 'id' | 'timeConsumed' | 'time'>) => Promise<void>;
  removeFood: (foodId: string) => Promise<void>;
  calculateCurrentBAC: () => Promise<number>;
  refreshBacData: () => Promise<void>;
  getSessionByProfileId: (profileId: string) => Session | null;
  switchToSession: (profileId: string) => void;
  deleteSession: (sessionId: string) => Promise<void>;
}

// Creazione del contesto
export const SessionContext = createContext<SessionContextType>({
  activeSessions: [],
  currentSession: null,
  isLoading: true,
  pastSessions: [],
  bacData: null,
  startSession: async () => {},
  endSession: async () => {},
  addDrink: async () => {},
  removeDrink: async () => {},
  addFood: async () => {},
  removeFood: async () => {},
  calculateCurrentBAC: async () => 0,
  refreshBacData: async () => {},
  getSessionByProfileId: () => null,
  switchToSession: () => {},
  deleteSession: async () => {}
});

// Hook personalizzato per utilizzare il contesto
export const useSession = () => useContext(SessionContext);

// Provider del contesto
export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeProfiles, currentProfileId } = useActiveProfiles();
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [bacData, setBacData] = useState<BacData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Ottieni la sessione corrente dall'ID
  const currentSession = activeSessions.find(s => s.id === currentSessionId) || null;
  
  // Filtriamo le sessioni attive per il profilo corrente
  const currentProfileActiveSessions = activeSessions.filter(
    session => session.profileId === currentProfileId
  );
  
  // Salva le sessioni nello storage locale
  const saveSessions = async () => {
    try {
      await AsyncStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(activeSessions));
      await AsyncStorage.setItem(PAST_SESSIONS_KEY, JSON.stringify(pastSessions));
      console.log('Sessioni salvate con successo');
      return true;
    } catch (error) {
      console.error('Errore durante il salvataggio delle sessioni:', error);
      return false;
    }
  };
  
  // Ottieni il profilo corrente
  const getCurrentProfile = async () => {
    if (!currentProfileId) return null;
    return activeProfiles.find(p => p.id === currentProfileId) || null;
  };

  // Carica le sessioni dal local storage all'avvio
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setIsLoading(true);
        
        // Verifica se l'utente è autenticato
        const authService = require('../lib/services/auth.service');
        const sessionService = require('../lib/services/session.service');
        const currentUser = await authService.getCurrentUser();
        const offlineService = require('../lib/services/offline.service');
        const isOffline = await offlineService.isOffline();
        
        if (currentUser && !isOffline) {
          console.log('Utente autenticato e online, caricamento sessioni da Supabase');
          
          // Carica le sessioni attive da Supabase
          const activeSessions = await sessionService.loadActiveSessionsFromSupabase();
          if (activeSessions && activeSessions.length > 0) {
            // Converti le sessioni nel formato utilizzato dal context
            const formattedActiveSessions = activeSessions.map(session => ({
              id: session.id,
              profileId: session.profile.id,
              drinks: session.drinks.map(drink => ({
                id: drink.id,
                name: drink.name,
                alcoholPercentage: drink.alcoholPercentage,
                volumeInMl: drink.volume,
                timestamp: drink.time
              })),
              startTime: session.startTime.toISOString(),
              isActive: true
            }));
            
            setActiveSessions(formattedActiveSessions);
          }
          
          // Carica la cronologia delle sessioni da Supabase
          const historySessions = await sessionService.loadSessionHistoryFromSupabase();
          if (historySessions && historySessions.length > 0) {
            // Converti le sessioni nel formato utilizzato dal context
            const formattedHistorySessions = historySessions.map(session => ({
              id: session.id,
              profileId: session.profile.id,
              drinks: session.drinks.map(drink => ({
                id: drink.id,
                name: drink.name,
                alcoholPercentage: drink.alcoholPercentage,
                volumeInMl: drink.volume,
                timestamp: drink.time
              })),
              startTime: session.startTime.toISOString(),
              endTime: session.sessionStartTime.toISOString(),
              maxBac: session.currentBAC,
              isActive: false
            }));
            
            setPastSessions(formattedHistorySessions);
          }
          
          // Se non ci sono sessioni caricate, prova a caricarle da locale
          if (activeSessions.length === 0) {
            // Carica le sessioni attive dal local storage
            const storedActiveSessions = await AsyncStorage.getItem(ACTIVE_SESSIONS_KEY);
            if (storedActiveSessions) {
              const sessions = JSON.parse(storedActiveSessions);
              setActiveSessions(sessions);
            }
          }
          
          if (historySessions.length === 0) {
            // Carica le sessioni passate dal local storage
            const storedPastSessions = await AsyncStorage.getItem(PAST_SESSIONS_KEY);
            if (storedPastSessions) {
              const sessions = JSON.parse(storedPastSessions);
              setPastSessions(sessions);
            }
          }
        } else {
          // Utente non autenticato o offline, carica dallo storage locale
          console.log('Utente non autenticato o offline, caricamento sessioni da locale');
          
          // Carica le sessioni attive
          const storedActiveSessions = await AsyncStorage.getItem(ACTIVE_SESSIONS_KEY);
          if (storedActiveSessions) {
            const sessions = JSON.parse(storedActiveSessions);
            
            // Controlla e termina le sessioni inattive per più di 12 ore
            const now = new Date();
            const updatedSessions = sessions.map(session => {
              // Controlla l'ultima attività (ultimo drink o start time)
              const lastActivityTime = session.drinks && session.drinks.length > 0 
                ? new Date(session.drinks[session.drinks.length - 1].timestamp)
                : new Date(session.startTime);
              
              // Se sono passate più di 12 ore dall'ultima attività, termina la sessione
              const hoursElapsed = (now.getTime() - lastActivityTime.getTime()) / (1000 * 60 * 60);
              if (hoursElapsed > 12 && session.isActive) {
                return {
                  ...session,
                  isActive: false,
                  endTime: now.toISOString()
                };
              }
              return session;
            });
            
            // Filtra le sessioni ancora attive
            const activeSes = updatedSessions.filter(s => s.isActive);
            const pastSes = updatedSessions.filter(s => !s.isActive);
            
            setActiveSessions(activeSes);
            
            // Aggiunge le sessioni terminate alle sessioni passate
            const storedPastSessions = await AsyncStorage.getItem(PAST_SESSIONS_KEY);
            let allPastSessions = pastSes;
            if (storedPastSessions) {
              const existingPastSessions = JSON.parse(storedPastSessions);
              allPastSessions = [...existingPastSessions, ...pastSes];
            }
            
            if (pastSes.length > 0) {
              await AsyncStorage.setItem(PAST_SESSIONS_KEY, JSON.stringify(allPastSessions));
            }
            
            setPastSessions(allPastSessions);
          }
          
          // Carica le sessioni passate se non ci sono sessioni terminate
          const storedPastSessions = await AsyncStorage.getItem(PAST_SESSIONS_KEY);
          if (storedPastSessions && pastSessions.length === 0) {
            const sessions = JSON.parse(storedPastSessions);
            setPastSessions(sessions);
          }
        }
        
        // Carica l'ID della sessione corrente (se c'è un profilo corrente)
        if (currentProfileId) {
          const session = activeSessions.find(s => s.profileId === currentProfileId);
          if (session) {
            setCurrentSessionId(session.id);
          }
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSessions();
    
    // Imposta un timer per controllare e terminare le sessioni inattive ogni ora
    const sessionCleanupTimer = setInterval(() => {
      checkAndTerminateInactiveSessions();
    }, 60 * 60 * 1000); // Ogni ora
    
    return () => {
      clearInterval(sessionCleanupTimer);
    };
  }, []);

  // Effetto per gestire il cambio di profilo
  useEffect(() => {
    const handleProfileChange = async () => {
      if (currentProfileId) {
        // Quando cambiamo profilo, cambiamo la sessione corrente in base al nuovo profilo
        const profileSession = activeSessions.find(s => s.profileId === currentProfileId);
        if (profileSession) {
          setCurrentSessionId(profileSession.id);
          await AsyncStorage.setItem(CURRENT_SESSION_ID_KEY, profileSession.id);
        } else {
          // Se non c'è una sessione per questo profilo, impostiamo currentSessionId a null
          setCurrentSessionId(null);
          await AsyncStorage.removeItem(CURRENT_SESSION_ID_KEY);
        }
      }
    };
    
    handleProfileChange();
  }, [currentProfileId, activeSessions]);

  // Aggiorna i dati BAC quando cambia la sessione corrente
  useEffect(() => {
    if (currentSession) {
      refreshBacData().catch(error => 
        console.error('Error refreshing BAC data:', error)
      );
    } else {
      setBacData(null);
    }
  }, [currentSession]);

  // Salva le sessioni attive nel local storage
  useEffect(() => {
    const saveActiveSessions = async () => {
      try {
        if (activeSessions.length > 0) {
          await AsyncStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(activeSessions));
        } else {
          await AsyncStorage.removeItem(ACTIVE_SESSIONS_KEY);
        }
      } catch (error) {
        console.error('Error saving active sessions:', error);
      }
    };
    
    if (!isLoading) {
      saveActiveSessions();
    }
  }, [activeSessions, isLoading]);

  // Salva l'id della sessione corrente nel local storage
  useEffect(() => {
    const saveCurrentSessionId = async () => {
      try {
        if (currentSessionId) {
          await AsyncStorage.setItem(CURRENT_SESSION_ID_KEY, currentSessionId);
        } else {
          await AsyncStorage.removeItem(CURRENT_SESSION_ID_KEY);
        }
      } catch (error) {
        console.error('Error saving current session ID:', error);
      }
    };
    
    if (!isLoading) {
      saveCurrentSessionId();
    }
  }, [currentSessionId, isLoading]);

  // Salva le sessioni passate nel local storage
  useEffect(() => {
    const savePastSessions = async () => {
      try {
        await AsyncStorage.setItem(PAST_SESSIONS_KEY, JSON.stringify(pastSessions));
      } catch (error) {
        console.error('Error saving past sessions:', error);
      }
    };
    
    if (!isLoading) {
      savePastSessions();
    }
  }, [pastSessions, isLoading]);

  // Trova una sessione attiva per un profilo
  const getSessionByProfileId = (profileId: string): Session | null => {
    return activeSessions.find(s => s.profileId === profileId) || null;
  };
  
  // Passa a una sessione specifica
  const switchToSession = (profileId: string) => {
    const session = getSessionByProfileId(profileId);
    if (session) {
      setCurrentSessionId(session.id);
    }
  };

  // Avvia una nuova sessione
  const startSession = async (profileId: string) => {
    try {
      // Verifica se esiste già una sessione attiva per questo profilo
      const existingSession = activeSessions.find(
        s => s.profileId === profileId && s.isActive
      );
      
      if (existingSession) {
        // Se esiste già, imposta questa come sessione corrente
        setCurrentSessionId(existingSession.id);
        await AsyncStorage.setItem(CURRENT_SESSION_ID_KEY, existingSession.id);
        console.log(`Sessione esistente impostata come corrente: ${existingSession.id}`);
        return;
      }
      
      // Ottieni i dettagli del profilo
      const profile = activeProfiles.find(p => p.id === profileId);
      if (!profile) {
        console.error('Profilo non trovato:', profileId);
        return;
      }
      
      // Crea la nuova sessione
      const newSession: Session = {
        id: Date.now().toString(),
        profileId,
        profile: profile, // Aggiungi il profilo completo
        startTime: new Date().toISOString(),
        sessionStartTime: new Date().toISOString(), // Aggiunto per compatibilità
        drinks: [],
        foods: [], // Aggiunto per compatibilità
        isActive: true,
        currentBAC: 0, // Aggiunto per compatibilità
        status: 'safe', // Aggiunto per compatibilità
        bacTimePoints: [], // Aggiunto per compatibilità
        soberTime: '0:00', // Aggiunto per compatibilità
        sessionDuration: '0:00', // Aggiunto per compatibilità
      };
      
      // Verifica se l'utente è autenticato
      const authService = require('../lib/services/auth.service');
      const sessionService = require('../lib/services/session.service');
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser) {
        // Se l'utente è autenticato, usa il servizio di sessione
        try {
          await sessionService.createSession(profile);
          console.log('Nuova sessione creata tramite servizio');
        } catch (error) {
          console.error('Errore durante la creazione della sessione tramite servizio:', error);
          // Continua con la creazione locale come fallback
        }
      }
      
      // Aggiorna l'array delle sessioni attive
      setActiveSessions(prev => [...prev, newSession]);
      
      // Imposta questa come sessione corrente
      setCurrentSessionId(newSession.id);
      await AsyncStorage.setItem(CURRENT_SESSION_ID_KEY, newSession.id);
      
      // Salva le sessioni attive
      await saveSessions();
      
      console.log(`Nuova sessione creata: ${newSession.id}`);
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  // Termina una sessione
  const endSession = async (profileId?: string) => {
    try {
      // Se profileId non è specificato, usa il profilo corrente
      const targetProfileId = profileId || currentProfileId;
      
      if (!targetProfileId) return;
      
      const sessionToEnd = getSessionByProfileId(targetProfileId);
      
      if (sessionToEnd) {
        // Calcola il BAC massimo
        let maxBac = 0;
        if (sessionToEnd.id === currentSessionId && bacData) {
          maxBac = bacData.max;
        } else {
          // Se non c'è un valore BAC calcolato, usa 0
          maxBac = 0;
        }
        
        const endedSession: Session = {
          ...sessionToEnd,
          endTime: new Date().toISOString(),
          isActive: false,
          maxBac: maxBac,
        };
        
        // Verifica se l'utente è autenticato
        const authService = require('../lib/services/auth.service');
        const sessionService = require('../lib/services/session.service');
        const currentUser = await authService.getCurrentUser();
        
        if (currentUser) {
          // Se l'utente è autenticato, usa la funzione del servizio
          sessionService.endSession();
        }
        
        // Aggiungi alla lista delle sessioni passate
        setPastSessions([...pastSessions, endedSession]);
        
        // Rimuovi dalle sessioni attive
        const updatedActiveSessions = activeSessions.filter(s => s.id !== sessionToEnd.id);
        setActiveSessions(updatedActiveSessions);
        
        // Se era la sessione corrente, imposta il currentSessionId a null
        if (sessionToEnd.id === currentSessionId) {
          setCurrentSessionId(null);
        }
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  // Aggiungi un drink alla sessione corrente
  const addDrink = async (drink: Omit<Drink, 'id' | 'timestamp'>) => {
    if (currentSession) {
      const newDrink: Drink = {
        ...drink,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };
      
      const updatedSession: Session = {
        ...currentSession,
        drinks: [...currentSession.drinks, newDrink],
      };
      
      // Aggiorna la sessione nell'array delle sessioni attive
      const updatedActiveSessions = activeSessions.map(s => 
        s.id === currentSession.id ? updatedSession : s
      );
      
      setActiveSessions(updatedActiveSessions);
      
      // Aggiorna immediatamente i dati BAC
      try {
        await refreshBacData();
      } catch (error) {
        console.error('Error refreshing BAC data after adding drink:', error);
      }
    }
  };

  // Rimuovi un drink dalla sessione corrente
  const removeDrink = async (drinkId: string) => {
    if (currentSession) {
      const updatedSession: Session = {
        ...currentSession,
        drinks: currentSession.drinks.filter(d => d.id !== drinkId),
      };
      
      // Aggiorna la sessione nell'array delle sessioni attive
      const updatedActiveSessions = activeSessions.map(s => 
        s.id === currentSession.id ? updatedSession : s
      );
      
      setActiveSessions(updatedActiveSessions);
      
      // Aggiorna immediatamente i dati BAC
      try {
        await refreshBacData();
      } catch (error) {
        console.error('Error refreshing BAC data after removing drink:', error);
      }
    }
  };

  // Aggiungi una food alla sessione corrente
  const addFood = async (food: Omit<FoodRecord, 'id' | 'timeConsumed' | 'time'>) => {
    if (currentSession) {
      const now = new Date();
      const newFood: FoodRecord = {
        ...food,
        id: Date.now().toString(),
        timeConsumed: now,
        time: now.toISOString(),
      };
      
      const updatedSession: Session = {
        ...currentSession,
        foods: [...currentSession.foods, newFood],
      };
      
      // Aggiorna la sessione nell'array delle sessioni attive
      const updatedActiveSessions = activeSessions.map(s => 
        s.id === currentSession.id ? updatedSession : s
      );
      
      setActiveSessions(updatedActiveSessions);
      
      // Aggiorna immediatamente i dati BAC
      try {
        await refreshBacData();
      } catch (error) {
        console.error('Error refreshing BAC data after adding food:', error);
      }
    }
  };

  // Rimuovi una food dalla sessione corrente
  const removeFood = async (foodId: string) => {
    if (currentSession) {
      const updatedSession: Session = {
        ...currentSession,
        foods: currentSession.foods.filter(f => f.id !== foodId),
      };
      
      // Aggiorna la sessione nell'array delle sessioni attive
      const updatedActiveSessions = activeSessions.map(s => 
        s.id === currentSession.id ? updatedSession : s
      );
      
      setActiveSessions(updatedActiveSessions);
      
      // Aggiorna immediatamente i dati BAC
      try {
        await refreshBacData();
      } catch (error) {
        console.error('Error refreshing BAC data after removing food:', error);
      }
    }
  };

  // Calcola la concentrazione di alcol nel sangue corrente usando la formula di Widmark
  const calculateCurrentBAC = async () => {
    if (!currentSession) return 0;
    
    const activeProfile = await getCurrentProfile();
    if (!activeProfile) return 0;
    
    // Fattore di distribuzione di Widmark
    // Il fattore è diverso per uomini e donne
    const r = activeProfile.gender === 'male' ? 0.68 : 0.55;
    
    // Tempo attuale in millisecondi
    const now = new Date().getTime();
    
    // Debug
    console.log('BAC Calculation - Profile:', { 
      gender: activeProfile.gender, 
      weight: activeProfile.weightKg,
      r
    });
    
    // Calcola il BAC per ogni drink e poi sommali
    let totalBac = 0;
    
    currentSession.drinks.forEach(drink => {
      // Calcola i grammi di alcol
      const alcoholGrams = calculateAlcoholGrams(
        parseFloat(String(drink.volumeInMl)) || 0, 
        parseFloat(String(drink.alcoholPercentage)) || 0
      );
      
      // Calcola il BAC per questo drink (formula di Widmark)
      const peakBac = alcoholGrams / (activeProfile.weightKg * r);
      
      // Tempo trascorso dall'assunzione del drink in ore
      const drinkTime = new Date(drink.timestamp).getTime();
      const hoursSinceDrink = (now - drinkTime) / (1000 * 60 * 60);
      
      // Tasso di eliminazione dell'alcol (~0.015 g/L all'ora)
      const eliminationRate = 0.015;
      
      // BAC rimanente dopo eliminazione
      const remainingBac = Math.max(peakBac - (eliminationRate * hoursSinceDrink), 0);
      
      // Debug dei valori per ogni drink
      console.log('BAC Calculation - Drink:', { 
        volumeInMl: drink.volumeInMl,
        alcoholPercentage: drink.alcoholPercentage,
        alcoholGrams,
        peakBac,
        hoursSinceDrink,
        remainingBac
      });
      
      // Aggiungi al BAC totale
      totalBac += remainingBac;
    });
    
    // Converte il risultato in g/L
    const bacInGramsPerLiter = totalBac * 10;
    
    // Limita a 2 cifre decimali
    const roundedBac = Math.round(bacInGramsPerLiter * 100) / 100;
    
    // Debug del risultato finale
    console.log('BAC Calculation - Final:', { 
      totalBac,
      bacInGramsPerLiter,
      roundedBac
    });
    
    return roundedBac;
  };

  // Calcola il tempo necessario per tornare sobri
  const calculateSoberTime = (currentBac: number) => {
    if (currentBac <= 0.01) return null;
    
    // Utilizziamo il tasso di metabolismo dalle costanti
    // Aggiungiamo un fattore di sicurezza (5%)
    const safetyFactor = 1.05;
    const adjustedMetabolismRate = METABOLISM_RATE / safetyFactor;
    
    // Ore necessarie
    const hoursToSober = currentBac / adjustedMetabolismRate;
    
    // Calcola la data
    const soberTime = new Date();
    
    // Aggiunta più precisa delle ore e minuti
    const hours = Math.floor(hoursToSober);
    const minutes = Math.round((hoursToSober - hours) * 60);
    
    soberTime.setHours(soberTime.getHours() + hours);
    soberTime.setMinutes(soberTime.getMinutes() + minutes);
    
    // Debug
    console.log('BAC Calculation - Sober Time:', { 
      currentBac, 
      metabolismRate: adjustedMetabolismRate, 
      hoursToSober, 
      soberTime: soberTime.toISOString(),
      valid: !isNaN(soberTime.getTime())
    });
    
    // Verifica che la data sia valida
    if (isNaN(soberTime.getTime())) {
      console.warn('calculateSoberTime: Data non valida generata!');
      return null;
    }
    
    return soberTime;
  };

  // Calcola il tempo necessario per raggiungere il limite legale
  const calculateLegalTime = (currentBac: number) => {
    if (currentBac <= BAC_LIMITS.legalLimit) return null;
    
    // Utilizziamo il tasso di metabolismo dalle costanti
    // Aggiungiamo un fattore di sicurezza (5%)
    const safetyFactor = 1.05;
    const adjustedMetabolismRate = METABOLISM_RATE / safetyFactor;
    
    // Ore necessarie (considerando che serve eliminare solo l'alcol oltre il limite legale)
    const hoursToLegal = (currentBac - BAC_LIMITS.legalLimit) / adjustedMetabolismRate;
    
    // Calcola la data
    const legalTime = new Date();
    
    // Aggiunta più precisa delle ore e minuti
    const hours = Math.floor(hoursToLegal);
    const minutes = Math.round((hoursToLegal - hours) * 60);
    
    legalTime.setHours(legalTime.getHours() + hours);
    legalTime.setMinutes(legalTime.getMinutes() + minutes);
    
    // Debug
    console.log('BAC Calculation - Legal Time:', { 
      currentBac, 
      legalLimit: BAC_LIMITS.legalLimit, 
      metabolismRate: adjustedMetabolismRate, 
      hoursToLegal, 
      legalTime: legalTime.toISOString(),
      valid: !isNaN(legalTime.getTime())
    });
    
    // Verifica che la data sia valida
    if (isNaN(legalTime.getTime())) {
      console.warn('calculateLegalTime: Data non valida generata!');
      return null;
    }
    
    return legalTime;
  };

  // Determina lo stato corrente del BAC
  const getBacStatus = (bac: number): 'safe' | 'caution' | 'danger' => {
    if (bac < BAC_LIMITS.cautionThreshold) return 'safe';
    if (bac < BAC_LIMITS.legalLimit) return 'caution';
    return 'danger';
  };

  // Genera una serie temporale di valori BAC
  const generateTimeSeries = async () => {
    if (!currentSession) return [];
    
    const activeProfile = await getCurrentProfile();
    if (!activeProfile) return [];
    
    // Se non ci sono drink, restituisci una serie vuota
    if (currentSession.drinks.length === 0) return [];
    
    // Ordina i drink per timestamp
    const sortedDrinks = [...currentSession.drinks].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Trova il primo e l'ultimo timestamp
    const firstDrinkTime = new Date(sortedDrinks[0].timestamp);
    const now = new Date();
    
    // Crea una serie di punti temporali (ogni 15 minuti)
    const timePoints: Date[] = [];
    let currentTime = new Date(firstDrinkTime);
    
    while (currentTime <= now) {
      timePoints.push(new Date(currentTime));
      currentTime.setMinutes(currentTime.getMinutes() + 15);
    }
    
    // Calcola il BAC per ogni punto temporale
    const series = timePoints.map(time => {
      const timeMs = time.getTime();
      
      // Fattore di distribuzione di Widmark
      const r = activeProfile.gender === 'male' ? 0.68 : 0.55;
      
      // Calcola il BAC per ogni drink fino a questo punto temporale e poi sommali
      let totalBac = 0;
      
      sortedDrinks
        .filter(drink => new Date(drink.timestamp).getTime() <= timeMs)
        .forEach(drink => {
          // Calcola i grammi di alcol
          const alcoholGrams = calculateAlcoholGrams(
            parseFloat(String(drink.volumeInMl)) || 0, 
            parseFloat(String(drink.alcoholPercentage)) || 0
          );
          
          // Calcola il BAC per questo drink (formula di Widmark)
          const peakBac = alcoholGrams / (activeProfile.weightKg * r);
          
          // Tempo trascorso dall'assunzione del drink in ore
          const drinkTime = new Date(drink.timestamp).getTime();
          const hoursSinceDrink = (timeMs - drinkTime) / (1000 * 60 * 60);
          
          // Tasso di eliminazione dell'alcol (~ 0.015 g/L all'ora)
          const eliminationRate = 0.015;
          
          // BAC rimanente dopo eliminazione
          const remainingBac = Math.max(peakBac - (eliminationRate * hoursSinceDrink), 0);
          
          // Aggiungi al BAC totale
          totalBac += remainingBac;
        });
      
      // Converte il risultato in g/L
      const bacInGramsPerLiter = totalBac * 10;
      
      return {
        time,
        bac: Math.round(bacInGramsPerLiter * 100) / 100,
      };
    });
    
    return series;
  };

  // Aggiorna i dati BAC
  const refreshBacData = async () => {
    if (!currentSession) {
      setBacData(null);
      return;
    }
    
    const activeProfile = await getCurrentProfile();
    if (!activeProfile) {
      setBacData(null);
      return;
    }
    
    const current = await calculateCurrentBAC();
    const timeSeries = await generateTimeSeries();
    
    // Trova il BAC massimo
    const max = timeSeries.reduce(
      (maxBac, point) => Math.max(maxBac, point.bac),
      current
    );
    
    // Calcola i tempi di ritorno a 0 e al limite legale
    const soberTime = calculateSoberTime(current);
    const legalTime = calculateLegalTime(current);
    
    // Debug
    console.log('SessionContext - Refreshing BAC data:', { 
      current, 
      max,
      soberTime: soberTime ? soberTime.toISOString() : null,
      legalTime: legalTime ? legalTime.toISOString() : null
    });
    
    const bacData: BacData = {
      current,
      max,
      soberTime,
      legalTime,
      status: getBacStatus(current),
      timeSeries,
    };
    
    setBacData(bacData);
  };

  // Controlla e termina le sessioni inattive per più di 12 ore
  const checkAndTerminateInactiveSessions = () => {
    const now = new Date();
    
    // Verifica ogni sessione attiva
    const updatedSessions = activeSessions.map(session => {
      // Controlla l'ultima attività (ultimo drink o startTime)
      const lastActivityTime = session.drinks && session.drinks.length > 0 
        ? new Date(session.drinks[session.drinks.length - 1].timestamp)
        : new Date(session.startTime);
      
      // Se sono passate più di 12 ore dall'ultima attività, termina la sessione
      const hoursElapsed = (now.getTime() - lastActivityTime.getTime()) / (1000 * 60 * 60);
      if (hoursElapsed > 12 && session.isActive) {
        return {
          ...session,
          isActive: false,
          endTime: now.toISOString()
        };
      }
      return session;
    });
    
    // Aggiorna le sessioni
    const stillActiveSessions = updatedSessions.filter(s => s.isActive);
    const newlyEndedSessions = updatedSessions.filter(s => !s.isActive && activeSessions.find(as => as.id === s.id)?.isActive);
    
    if (newlyEndedSessions.length > 0) {
      // Aggiorna le sessioni attive
      setActiveSessions(stillActiveSessions);
      
      // Aggiungi le sessioni terminate alle sessioni passate
      setPastSessions([...pastSessions, ...newlyEndedSessions]);
      
      // Aggiorna lo storage
      (async () => {
        try {
          await AsyncStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(stillActiveSessions));
          await AsyncStorage.setItem(PAST_SESSIONS_KEY, JSON.stringify([...pastSessions, ...newlyEndedSessions]));
        } catch (error) {
          console.error('Error saving sessions after auto-termination:', error);
        }
      })();
    }
  };

  // Implementa la funzione deleteSession
  const deleteSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      
      const sessionToDelete = [...activeSessions, ...pastSessions].find(
        session => session.id === sessionId
      );
      
      if (!sessionToDelete) {
        console.error(`Sessione con ID ${sessionId} non trovata`);
        return;
      }
      
      // Se è la sessione corrente, termina la sessione
      if (currentSession && currentSession.id === sessionId) {
        await endSession();
      }
      
      // Rimuovi la sessione dall'array appropriato
      if (activeSessions.some(s => s.id === sessionId)) {
        const updatedActiveSessions = activeSessions.filter(s => s.id !== sessionId);
        setActiveSessions(updatedActiveSessions);
        await AsyncStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(updatedActiveSessions));
      } else {
        const updatedPastSessions = pastSessions.filter(s => s.id !== sessionId);
        setPastSessions(updatedPastSessions);
        await AsyncStorage.setItem(PAST_SESSIONS_KEY, JSON.stringify(updatedPastSessions));
      }
      
      // Se è l'unica sessione attiva per un profilo, considera di aggiornare il profilo corrente
      if (activeSessions.length === 1 && activeSessions[0].id === sessionId) {
        // Se non ci sono altre sessioni attive, imposta il currentSessionId a null
        setCurrentSessionId(null);
        await AsyncStorage.setItem(CURRENT_SESSION_ID_KEY, '');
      }
      
      // Aggiorna i dati del BAC
      await refreshBacData();
      
      console.log(`Sessione ${sessionId} eliminata con successo`);
    } catch (error) {
      console.error('Errore durante l\'eliminazione della sessione:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        activeSessions: currentProfileActiveSessions,
        currentSession,
        isLoading,
        pastSessions,
        bacData,
        startSession,
        endSession,
        addDrink,
        removeDrink,
        addFood,
        removeFood,
        calculateCurrentBAC,
        refreshBacData,
        getSessionByProfileId,
        switchToSession,
        deleteSession
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export default SessionProvider; 