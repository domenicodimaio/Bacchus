import AsyncStorage from '@react-native-async-storage/async-storage';

// Chiavi di storage
const FREE_SESSION_COUNT = 'free_session_count';
const USER_FREE_SESSION_PREFIX = 'user_free_session_';
const LAST_SESSION_DATE = 'last_session_date';
const SUPABASE_AUTH_KEY = 'supabase-auth';
const MAX_FREE_SESSIONS = 10;

// Ottiene l'ID utente corrente (se disponibile)
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    // Prova a ottenere lo user da AsyncStorage
    const authData = await AsyncStorage.getItem(SUPABASE_AUTH_KEY);
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed?.user?.id) {
        return parsed.user.id;
      }
    }
    return null;
  } catch (error) {
    console.error('Errore nell\'ottenere l\'ID utente:', error);
    return null;
  }
};

// Ottiene la chiave di storage corretta in base all'utente
const getSessionKey = async (): Promise<string> => {
  const userId = await getCurrentUserId();
  return userId ? `${USER_FREE_SESSION_PREFIX}${userId}` : FREE_SESSION_COUNT;
};

// Inizializza un nuovo contatore sessioni per un utente
export const initFreeSessionCount = async (): Promise<void> => {
  try {
    const key = await getSessionKey();
    await AsyncStorage.setItem(key, '0');
    await AsyncStorage.setItem(LAST_SESSION_DATE, new Date().toISOString());
  } catch (error) {
    console.error('Errore nell\'inizializzazione del contatore delle sessioni gratuite:', error);
  }
};

// Incrementa il contatore delle sessioni gratuite
export const incrementFreeSessionCount = async (): Promise<number> => {
  try {
    const key = await getSessionKey();
    
    // Controlla se è un nuovo giorno
    const lastSessionDateStr = await AsyncStorage.getItem(LAST_SESSION_DATE);
    const currentDate = new Date();
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).toISOString();
    
    // Se è un nuovo giorno, reimpostiamo il contatore
    if (lastSessionDateStr) {
      const lastDate = new Date(lastSessionDateStr);
      const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).toISOString();
      
      if (lastDay !== today) {
        await AsyncStorage.setItem(key, '0');
      }
    }
    
    // Aggiorna la data dell'ultima sessione
    await AsyncStorage.setItem(LAST_SESSION_DATE, currentDate.toISOString());
    
    // Incrementa il contatore
    const countStr = await AsyncStorage.getItem(key) || '0';
    const newCount = Math.min(parseInt(countStr, 10) + 1, MAX_FREE_SESSIONS);
    await AsyncStorage.setItem(key, newCount.toString());
    
    return newCount;
  } catch (error) {
    console.error('Errore nell\'incremento del contatore delle sessioni gratuite:', error);
    return 0;
  }
};

// Ottiene il conteggio delle sessioni gratuite
export const getFreeSessionCount = async (): Promise<number> => {
  try {
    const key = await getSessionKey();
    const countStr = await AsyncStorage.getItem(key);
    return countStr ? parseInt(countStr, 10) : 0;
  } catch (error) {
    console.error('Errore nel recupero del contatore delle sessioni gratuite:', error);
    return 0;
  }
};

// Verifica se l'utente ha raggiunto il limite di sessioni gratuite
export const hasReachedFreeSessionLimit = async (): Promise<boolean> => {
  const count = await getFreeSessionCount();
  return count >= MAX_FREE_SESSIONS;
};

// Reimposta il contatore delle sessioni gratuite
export const resetFreeSessionCount = async (): Promise<void> => {
  try {
    const key = await getSessionKey();
    await AsyncStorage.setItem(key, '0');
  } catch (error) {
    console.error('Errore nel reset del contatore delle sessioni gratuite:', error);
  }
};

export default {
  initFreeSessionCount,
  incrementFreeSessionCount,
  getFreeSessionCount,
  hasReachedFreeSessionLimit,
  resetFreeSessionCount,
}; 