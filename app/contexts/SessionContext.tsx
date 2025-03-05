import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BAC_LIMITS, APP_CONSTANTS } from '../constants/theme';
import { METABOLISM_RATE } from '../constants/bac';

// Tipo per un drink
export type Drink = {
  id: string;
  name: string;
  alcoholPercentage: number; // percentuale di alcol (es. 5% = 0.05)
  volumeInMl: number;
  timestamp: string;
};

// Tipo per una sessione
export type Session = {
  id: string;
  profileId: string;
  drinks: Drink[];
  startTime: string;
  endTime?: string;
  maxBac?: number;
  isActive: boolean;
};

// Tipo per i dati di tasso alcolemico
export type BacData = {
  current: number;
  max: number;
  soberTime: Date | null;
  legalTime: Date | null;
  status: 'safe' | 'caution' | 'danger';
  timeSeries: { time: Date; bac: number }[];
};

// Definizione del contesto
interface SessionContextType {
  currentSession: Session | null;
  isLoading: boolean;
  pastSessions: Session[];
  bacData: BacData | null;
  startSession: (profileId: string) => Promise<void>;
  endSession: () => Promise<void>;
  addDrink: (drink: Omit<Drink, 'id' | 'timestamp'>) => Promise<void>;
  removeDrink: (drinkId: string) => Promise<void>;
  calculateCurrentBAC: () => number;
  refreshBacData: () => void;
}

// Creazione del contesto
export const SessionContext = createContext<SessionContextType>({
  currentSession: null,
  isLoading: true,
  pastSessions: [],
  bacData: null,
  startSession: async () => {},
  endSession: async () => {},
  addDrink: async () => {},
  removeDrink: async () => {},
  calculateCurrentBAC: () => 0,
  refreshBacData: () => {},
});

// Storage keys
const CURRENT_SESSION_KEY = 'alcoltest_current_session';
const PAST_SESSIONS_KEY = 'alcoltest_past_sessions';

// Hook personalizzato per utilizzare il contesto
export const useSession = () => useContext(SessionContext);

// Provider del contesto
export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [bacData, setBacData] = useState<BacData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Al posto di useProfile, usiamo un profilo predefinito
  const activeProfile = {
    id: 'default-profile',
    name: 'Default Profile',
    weight: 70, // peso medio in kg
    gender: 'male'
  };

  // Carica le sessioni dal local storage all'avvio
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const storedCurrentSession = await AsyncStorage.getItem(CURRENT_SESSION_KEY);
        const storedPastSessions = await AsyncStorage.getItem(PAST_SESSIONS_KEY);
        
        if (storedCurrentSession) {
          const session = JSON.parse(storedCurrentSession) as Session;
          setCurrentSession(session);
        }
        
        if (storedPastSessions) {
          const sessions = JSON.parse(storedPastSessions) as Session[];
          setPastSessions(sessions);
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSessions();
  }, []);

  // Aggiorna i dati BAC quando cambia la sessione corrente
  useEffect(() => {
    if (currentSession && activeProfile) {
      refreshBacData();
    } else {
      setBacData(null);
    }
  }, [currentSession, activeProfile]);

  // Salva la sessione corrente nel local storage
  useEffect(() => {
    const saveCurrentSession = async () => {
      try {
        if (currentSession) {
          await AsyncStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(currentSession));
        } else {
          await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
        }
      } catch (error) {
        console.error('Error saving current session:', error);
      }
    };
    
    if (!isLoading) {
      saveCurrentSession();
    }
  }, [currentSession, isLoading]);

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

  // Inizia una nuova sessione
  const startSession = async (profileId: string) => {
    // Se c'è già una sessione attiva, terminala
    if (currentSession) {
      await endSession();
    }
    
    const newSession: Session = {
      id: Date.now().toString(),
      profileId,
      drinks: [],
      startTime: new Date().toISOString(),
      isActive: true,
    };
    
    setCurrentSession(newSession);
  };

  // Termina la sessione corrente
  const endSession = async () => {
    if (currentSession) {
      const endedSession: Session = {
        ...currentSession,
        endTime: new Date().toISOString(),
        isActive: false,
        maxBac: bacData?.max || calculateCurrentBAC(),
      };
      
      // Aggiungi alla lista delle sessioni passate
      setPastSessions([...pastSessions, endedSession]);
      setCurrentSession(null);
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
      
      setCurrentSession(updatedSession);
      // Aggiorna immediatamente i dati BAC
      setTimeout(refreshBacData, 0);
    }
  };

  // Rimuovi un drink dalla sessione corrente
  const removeDrink = async (drinkId: string) => {
    if (currentSession) {
      const updatedSession: Session = {
        ...currentSession,
        drinks: currentSession.drinks.filter(d => d.id !== drinkId),
      };
      
      setCurrentSession(updatedSession);
      // Aggiorna immediatamente i dati BAC
      setTimeout(refreshBacData, 0);
    }
  };

  // Calcola i grammi di alcol da un drink
  const calculateAlcoholGrams = (drink: Drink) => {
    // formula: volume (ml) * gradazione alcolica (%) * 0.8 (densità dell'alcol)
    return drink.volumeInMl * drink.alcoholPercentage * 0.8;
  };

  // Calcola la concentrazione di alcol nel sangue corrente usando la formula di Widmark
  const calculateCurrentBAC = () => {
    if (!currentSession || !activeProfile) return 0;
    
    // Fattore di distribuzione di Widmark
    // Il fattore è diverso per uomini e donne
    const r = activeProfile.gender === 'male' ? 0.68 : 0.55;
    
    // Tempo attuale in millisecondi
    const now = new Date().getTime();
    
    // Debug
    console.log('BAC Calculation - Profile:', { 
      gender: activeProfile.gender, 
      weight: activeProfile.weight,
      r
    });
    
    // Calcola il BAC per ogni drink e poi sommali
    let totalBac = 0;
    
    currentSession.drinks.forEach(drink => {
      // Calcola i grammi di alcol
      const alcoholGrams = calculateAlcoholGrams(drink);
      
      // Calcola il BAC per questo drink (formula di Widmark)
      const peakBac = alcoholGrams / (activeProfile.weight * r);
      
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
  const generateTimeSeries = () => {
    if (!currentSession || !activeProfile) return [];
    
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
          const alcoholGrams = calculateAlcoholGrams(drink);
          
          // Calcola il BAC per questo drink (formula di Widmark)
          const peakBac = alcoholGrams / (activeProfile.weight * r);
          
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
  const refreshBacData = () => {
    if (!currentSession || !activeProfile) {
      setBacData(null);
      return;
    }
    
    const current = calculateCurrentBAC();
    const timeSeries = generateTimeSeries();
    
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

  return (
    <SessionContext.Provider
      value={{
        currentSession,
        isLoading,
        pastSessions,
        bacData,
        startSession,
        endSession,
        addDrink,
        removeDrink,
        calculateCurrentBAC,
        refreshBacData,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export default SessionProvider; 