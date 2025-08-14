/**
 * Profile Service
 * 
 * Gestisce la creazione, il recupero e l'aggiornamento dei profili utente.
 * I profili possono essere salvati localmente o nel database Supabase, a seconda 
 * che l'utente sia un ospite o un utente autenticato.
 */

// Import the crypto polyfill directly
import 'react-native-get-random-values';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../supabase/client';
import offlineService from './offline.service';

// Chiavi per lo storage
const PROFILES_KEY = 'bacchus_profiles';
const GUEST_PROFILES_KEY = 'bacchus_guest_profiles';
const ACTIVE_PROFILE_KEY = 'bacchus_active_profile';
const CURRENT_PROFILE_KEY = 'bacchus_current_profile';
const USER_DATA_KEY = 'bacchus_user_data';

// Cache invalidation variables
let _profileCacheTimestamp: number = 0;
const CACHE_EXPIRY_MS = 1000 * 60 * 5; // 5 minuti

/**
 * Ottiene l'utente corrente senza dipendenze circolari
 */
const getCurrentUserSafe = async () => {
  try {
    // Prima verifica offline - controlla AsyncStorage
    const userJson = await AsyncStorage.getItem(USER_DATA_KEY);
    if (userJson) {
      const userData = JSON.parse(userJson);
      if (userData && userData.id) {
        return userData;
      }
    }
    
    // Se non troviamo nulla in AsyncStorage, verifica direttamente con Supabase
    if (!(await offlineService.isOffline())) {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current user safely:', error);
    return null;
  }
};

// Funzione alternativa per generare ID univoci senza usare crypto.getRandomValues()
const generateSimpleId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Interfaccia per un profilo utente
 */
export interface UserProfile {
  id: string;
  userId?: string;
  name: string;
  gender: 'male' | 'female';
  weightKg: number;
  age: number;
  height: number;
  drinkingFrequency: 'rarely' | 'occasionally' | 'regularly' | 'frequently';
  emoji?: string;
  color?: string;
  isDefault?: boolean;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
  hasCompletedWizard: boolean;
}

// Prepara i dati del profilo
interface ProfileData {
  id: string;
  user_id: string;
  name: string;
  gender: 'male' | 'female';
  weightKg: number;
  age: number;
  height: number;
  drinkingFrequency: 'rarely' | 'occasionally' | 'regularly' | 'frequently';
  emoji?: string;
  color?: string;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
  has_completed_wizard?: boolean;
}

/**
 * Crea un nuovo profilo
 */
export const createProfile = async (profileData: Partial<UserProfile>, isGuest: boolean = false): Promise<UserProfile | null> => {
  try {
    console.log('🔍 PROFILE_SERVICE: === INIZIO CREAZIONE PROFILO ===');
    console.log('🔍 PROFILE_SERVICE: Modalità guest:', isGuest);
    console.log('🔍 PROFILE_SERVICE: Dati ricevuti:', JSON.stringify(profileData, null, 2));
    
    // Verifica che i dati richiesti siano presenti
    if (!profileData.name || !profileData.gender || !profileData.weightKg || !profileData.age || !profileData.height) {
      console.error('🔴 PROFILE_SERVICE: Dati mancanti per la creazione del profilo');
      return null;
    }
    
    // Ottieni l'utente corrente solo se non siamo in modalità guest
    let currentUser = null;
    if (!isGuest) {
      currentUser = await getCurrentUserSafe();
      console.log('🔍 PROFILE_SERVICE: Utente corrente:', currentUser ? currentUser.id : 'NESSUNO');
    } else {
      console.log('🔍 PROFILE_SERVICE: Modalità guest - nessun utente richiesto');
    }
    
    // Controlla connessione
    const isOffline = await offlineService.isOffline();
    console.log('🔍 PROFILE_SERVICE: È offline?', isOffline);
    
    // Validazione e conversione dei dati
    const weightKg = typeof profileData.weightKg === 'string' ? 
      parseFloat(profileData.weightKg) : profileData.weightKg;
    const age = typeof profileData.age === 'string' ? 
      parseInt(profileData.age) : profileData.age;
    const height = typeof profileData.height === 'string' ? 
      parseInt(profileData.height) : profileData.height;
    
    // Verifica che i valori convertiti siano numeri validi e nel range accettabile
    if (isNaN(weightKg) || weightKg < 30 || weightKg > 300) {
      console.error('🔴 PROFILE_SERVICE: Peso non valido:', weightKg);
      throw new Error('Peso non valido (deve essere tra 30 e 300 kg)');
    }
    
    if (isNaN(age) || age < 18 || age > 120) {
      console.error('🔴 PROFILE_SERVICE: Età non valida:', age);
      throw new Error('Età non valida (deve essere tra 18 e 120 anni)');
    }
    
    if (isNaN(height) || height < 100 || height > 250) {
      console.error('🔴 PROFILE_SERVICE: Altezza non valida:', height);
      throw new Error('Altezza non valida (deve essere tra 100 e 250 cm)');
    }
    
    // Crea l'oggetto profilo
    const newProfile: UserProfile = {
      id: uuidv4(),
      userId: currentUser?.id,
      name: profileData.name.trim(),
      gender: profileData.gender,
      weightKg: weightKg,
      age: age,
      height: height,
      drinkingFrequency: profileData.drinkingFrequency || 'occasionally',
      emoji: profileData.emoji || '😀',
      color: profileData.color || '#FF5252',
      isDefault: profileData.isDefault !== undefined ? profileData.isDefault : true,
      isGuest: isGuest,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hasCompletedWizard: profileData.hasCompletedWizard !== undefined ? profileData.hasCompletedWizard : true
    };
    
    console.log('🟢 PROFILE_SERVICE: Profilo creato con dati:', newProfile);
    
    // Se l'utente è autenticato e online, salva nel database
    if (!isGuest && !(await offlineService.isOffline())) {
      console.log('🔍 PROFILE_SERVICE: === INIZIO SALVATAGGIO DATABASE ===');
      console.log('🔍 PROFILE_SERVICE: User ID per database:', currentUser.id);
      
      try {
        // CRITICAL: Verifica che l'utente abbia una sessione attiva
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('🔴 PROFILE_SERVICE: Nessuna sessione attiva per RLS:', sessionError);
          throw new Error('Sessione non valida per il salvataggio del profilo');
        }
        
        console.log('🔍 PROFILE_SERVICE: Sessione RLS valida:', session.user.id);
        
        // Prepara i dati del profilo per il database
        const dbProfileData: any = {
          id: newProfile.id,
          user_id: currentUser.id,
          name: newProfile.name,
          gender: newProfile.gender,
          weight: newProfile.weightKg,  // 🔧 FIX: DB usa 'weight' non 'weightKg'
          age: newProfile.age,
          height: newProfile.height,
          drinking_frequency: newProfile.drinkingFrequency,  // 🔧 FIX: DB usa 'drinking_frequency' snake_case
          emoji: newProfile.emoji,
          color: newProfile.color,
          is_default: newProfile.isDefault,  // 🔧 FIX: DB usa 'is_default' snake_case
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('🔍 PROFILE_SERVICE: Dati per database:', JSON.stringify(dbProfileData, null, 2));
        
        // Test connessione Supabase
        console.log('🔍 PROFILE_SERVICE: Test connessione Supabase...');
        const { data: testData, error: testError } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);
        
        if (testError) {
          console.error('🔴 PROFILE_SERVICE: Errore test connessione:', testError);
        } else {
          console.log('🔍 PROFILE_SERVICE: Connessione Supabase OK');
        }
        
        console.log('🔍 PROFILE_SERVICE: Tentativo inserimento nel database...');
        const { data, error } = await supabase
          .from('profiles')
          .insert(dbProfileData)
          .select()
          .single();
        
        if (error) {
          console.error('🔴 PROFILE_SERVICE: Errore database primario:', JSON.stringify(error, null, 2));
          
          // Se l'errore è dovuto alla mancanza della colonna has_completed_wizard, riproviamo senza
          if (error.code === '42703' || 
              (error.message && error.message.includes('has_completed_wizard')) ||
              (error.message && error.message.includes('column')) ||
              (error.message && error.message.includes('does not exist'))) {
            console.log('🟡 PROFILE_SERVICE: Colonna has_completed_wizard non esiste, riprovo senza...');
            
            // Rimuovi has_completed_wizard dai dati
            delete dbProfileData.has_completed_wizard;
            console.log('🔍 PROFILE_SERVICE: Dati senza has_completed_wizard:', JSON.stringify(dbProfileData, null, 2));
            
            // Riprova l'inserimento
            const { data: retryData, error: retryError } = await supabase
              .from('profiles')
              .insert(dbProfileData)
              .select()
              .single();
            
            if (retryError) {
              console.error('🔴 PROFILE_SERVICE: Errore database retry:', JSON.stringify(retryError, null, 2));
              console.log('🟡 PROFILE_SERVICE: Continuazione con salvataggio locale...');
            } else {
              console.log('🟢 PROFILE_SERVICE: Profilo salvato nel database (senza has_completed_wizard):', retryData);
            }
          } else {
            console.error('🔴 PROFILE_SERVICE: Errore database non recuperabile:', JSON.stringify(error, null, 2));
            console.log('🟡 PROFILE_SERVICE: Continuazione con salvataggio locale...');
          }
        } else {
          console.log('🟢 PROFILE_SERVICE: Profilo salvato nel database con successo:', data);
        }
      } catch (dbError) {
        console.error('🔴 PROFILE_SERVICE: Errore fatale database:', dbError);
        console.log('🟡 PROFILE_SERVICE: Continuazione con salvataggio locale...');
      }
    } else {
      console.log('🟡 PROFILE_SERVICE: Utente ospite o offline, salvataggio solo locale');
    }
    
    // Salva il profilo localmente (sia per ospiti che per utenti autenticati)
    console.log('🟢 PROFILE_SERVICE: Salvataggio profilo localmente...');
    const localSaveResult = await saveProfileLocally(newProfile);
    
    if (!localSaveResult) {
      console.error('🔴 PROFILE_SERVICE: Errore nel salvataggio locale');
      throw new Error('Errore nel salvataggio locale del profilo');
    }
    
    console.log('🟢 PROFILE_SERVICE: Profilo salvato localmente con successo');
    
    // Imposta come profilo attivo se richiesto
    if (newProfile.isDefault) {
      console.log('🟢 PROFILE_SERVICE: Impostazione come profilo attivo...');
      const activeResult = await setActiveProfile(newProfile.id);
      if (activeResult) {
        console.log('🟢 PROFILE_SERVICE: Profilo impostato come attivo con successo');
      } else {
        console.error('🔴 PROFILE_SERVICE: Errore nell\'impostazione come profilo attivo');
      }
    }
    
    // Invalida la cache per forzare il refresh
    _profileCacheTimestamp = 0;
    
    console.log('🟢 PROFILE_SERVICE: Profilo creato completamente con successo:', newProfile.id);
    return newProfile;
  } catch (error) {
    console.error('🔴 PROFILE_SERVICE: Errore nella creazione del profilo:', error);
    return null;
  }
};

/**
 * Salva un profilo localmente
 */
export const saveProfileLocally = async (profile: UserProfile): Promise<boolean> => {
  try {
    // Determina la chiave di storage corretta in base al tipo di profilo
    const storageKey = profile.isGuest ? GUEST_PROFILES_KEY : PROFILES_KEY;
    
    // Ottieni i profili esistenti
    const existingProfilesJson = await AsyncStorage.getItem(storageKey);
    const existingProfiles: UserProfile[] = existingProfilesJson 
      ? JSON.parse(existingProfilesJson) 
      : [];
    
    // Aggiorna il profilo esistente o aggiunge un nuovo profilo
    const profileIndex = existingProfiles.findIndex(p => p.id === profile.id);
    
    if (profileIndex >= 0) {
      existingProfiles[profileIndex] = {
        ...existingProfiles[profileIndex],
        ...profile,
        updatedAt: new Date().toISOString()
      };
      } else {
      existingProfiles.push(profile);
    }
    
    // Salva i profili aggiornati
    await AsyncStorage.setItem(storageKey, JSON.stringify(existingProfiles));
    
    // Se il profilo è impostato come predefinito, imposta tutti gli altri come non predefiniti
    if (profile.isDefault) {
      await setDefaultProfile(profile.id, profile.isGuest);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving profile locally:', error);
      return false;
    }
};

/**
 * Imposta un profilo come predefinito
 */
export const setDefaultProfile = async (profileId: string, isGuest: boolean): Promise<boolean> => {
  try {
    const storageKey = isGuest ? GUEST_PROFILES_KEY : PROFILES_KEY;
    
    // Ottieni i profili esistenti
    const existingProfilesJson = await AsyncStorage.getItem(storageKey);
    if (!existingProfilesJson) return false;
    
    const existingProfiles: UserProfile[] = JSON.parse(existingProfilesJson);
    
    // Aggiorna l'attributo isDefault per tutti i profili
    const updatedProfiles = existingProfiles.map(profile => ({
      ...profile,
      isDefault: profile.id === profileId
    }));
    
    // Salva i profili aggiornati
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedProfiles));
    
    // Se l'utente è autenticato e online, aggiorna anche il database
    const currentUser = await getCurrentUserSafe();
    if (currentUser && !isGuest && !(await offlineService.isOffline())) {
      // Aggiorna il database: prima resetta tutti i profili dell'utente
      await supabase
        .from('profiles')
        .update({ is_default: false })
        .eq('user_id', currentUser.id);
      
      // Poi imposta quello selezionato come predefinito
      await supabase
        .from('profiles')
        .update({ is_default: true })
        .eq('id', profileId);
    }
    
    return true;
  } catch (error) {
    console.error('Error setting default profile:', error);
    return false;
  }
};

/**
 * Imposta un profilo come attivo
 */
export const setActiveProfile = async (profileId: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
    return true;
  } catch (error) {
    console.error('Error setting active profile:', error);
    return false;
  }
};

/**
 * Ottiene il profilo attivo
 */
export const getActiveProfile = async (): Promise<UserProfile | null> => {
  try {
    const activeProfileId = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
    if (!activeProfileId) return null;
    
    // Cerca prima nei profili utente
    const userProfiles = await getProfiles();
    const activeUserProfile = userProfiles.find(profile => profile.id === activeProfileId);
    if (activeUserProfile) return activeUserProfile;
    
    // Se non trovato, cerca nei profili ospite
    const guestProfiles = await getGuestProfiles();
    const activeGuestProfile = guestProfiles.find(profile => profile.id === activeProfileId);
    if (activeGuestProfile) return activeGuestProfile;
    
    return null;
  } catch (error) {
    console.error('Error getting active profile:', error);
      return null;
    }
};

/**
 * Ottiene tutti i profili dell'utente corrente
 * Versione migliorata con invalidazione della cache
 */
export const getProfiles = async (forceRefresh = false): Promise<UserProfile[]> => {
  try {
    // Verifica se l'utente è autenticato
    const currentUser = await getCurrentUserSafe();
    
    // Forza refresh se: è richiesto esplicitamente, siamo online, l'utente è autenticato
    // e la cache è scaduta o non è mai stata caricata
    const shouldRefreshFromDatabase = 
      (forceRefresh || (Date.now() - _profileCacheTimestamp > CACHE_EXPIRY_MS)) && 
      currentUser && 
      !(await offlineService.isOffline());
    
    // Se dobbiamo/possiamo aggiornare da database
    if (shouldRefreshFromDatabase) {
      console.log('Ottengo profili aggiornati dal database per utente:', currentUser.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id);
        
      if (error) {
        console.error('Errore recupero profili dal database:', error);
      } else if (data && data.length > 0) {
        console.log('Recuperati profili dal database:', data.length);
        
        // 🔧 MAPPATO ALLA SCHEMA REALE DEL DATABASE (snake_case → camelCase)
        const profiles: UserProfile[] = data.map(dbProfile => ({
          id: dbProfile.id,
          userId: dbProfile.user_id,
          name: dbProfile.name,
          gender: dbProfile.gender,
          weightKg: dbProfile.weight,              // DB: weight → APP: weightKg ✅
          age: dbProfile.age,
          height: dbProfile.height,
          drinkingFrequency: dbProfile.drinking_frequency, // DB: drinking_frequency → APP: drinkingFrequency ✅
          emoji: dbProfile.emoji || '😀',          // DB: emoji → APP: emoji ✅ + FALLBACK
          color: dbProfile.color || '#FF5252',     // DB: color → APP: color ✅ + FALLBACK  
          isDefault: dbProfile.is_default,         // DB: is_default → APP: isDefault ✅
          isGuest: false,
          createdAt: dbProfile.created_at,
          updatedAt: dbProfile.updated_at,
          hasCompletedWizard: true                 // 🔧 HARDCODED perché campo non esiste nel DB
        }));
        
        // Aggiorna il timestamp della cache
        _profileCacheTimestamp = Date.now();
        
        // Aggiorna anche lo storage locale
        await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
        
        return profiles;
      }
    }
    
    // Se non abbiamo potuto aggiornare dal database, o non è necessario,
    // ottieni i profili dallo storage locale
    const profilesJson = await AsyncStorage.getItem(PROFILES_KEY);
    if (profilesJson) {
      try {
        const profiles: UserProfile[] = JSON.parse(profilesJson);
        // Verifica che i profili siano dell'utente corrente (ulteriore sicurezza)
        if (currentUser && profiles.length > 0) {
          const validProfiles = profiles.filter(p => 
            !p.userId || p.userId === currentUser.id
          );
          
          if (validProfiles.length !== profiles.length) {
            console.warn('Rimossi profili non appartenenti all\'utente corrente');
            // Aggiorna lo storage con i profili validi
            await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(validProfiles));
            return validProfiles;
          }
        }
        return profiles;
      } catch (parseError) {
        console.error('Errore parsing profili da localStorage:', parseError);
        // In caso di errore, elimina il valore corrotto
        await AsyncStorage.removeItem(PROFILES_KEY);
        return [];
      }
    }
    
    return [];
  } catch (error) {
    console.error('Errore durante il recupero dei profili:', error);
    return [];
  }
};

/**
 * Ottiene tutti i profili ospite
 */
export const getGuestProfiles = async (): Promise<UserProfile[]> => {
  try {
    const profilesJson = await AsyncStorage.getItem(GUEST_PROFILES_KEY);
    if (profilesJson) {
      return JSON.parse(profilesJson);
    }
    return [];
  } catch (error) {
    console.error('Error getting guest profiles:', error);
    return [];
  }
};

/**
 * Ottiene un profilo specifico per ID
 */
export const getProfileById = async (profileId: string): Promise<UserProfile | null> => {
  try {
    // Cerca prima nei profili utente
    const userProfiles = await getProfiles();
    const userProfile = userProfiles.find(profile => profile.id === profileId);
    if (userProfile) return userProfile;
    
    // Se non trovato, cerca nei profili ospite
    const guestProfiles = await getGuestProfiles();
    const guestProfile = guestProfiles.find(profile => profile.id === profileId);
    if (guestProfile) return guestProfile;
    
    return null;
  } catch (error) {
    console.error('Error getting profile by ID:', error);
      return null;
    }
};

/**
 * Aggiorna un profilo esistente
 */
export const updateProfile = async (profileId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> => {
  try {
    // Ottieni il profilo corrente
    const currentProfile = await getProfileById(profileId);
    if (!currentProfile) return null;
    
    // Assicuriamoci che i valori numerici siano numeri validi
    const weightKg = updates.weightKg !== undefined ? Number(updates.weightKg) : currentProfile.weightKg;
    const age = updates.age !== undefined ? Number(updates.age) : currentProfile.age;
    const height = updates.height !== undefined ? Number(updates.height) : currentProfile.height;
    
    // Verifica che i valori convertiti siano numeri validi
    if (isNaN(weightKg) || isNaN(age) || isNaN(height)) {
      console.error('Valori numerici non validi:', { weightKg, age, height });
      throw new Error('Valori numerici non validi');
    }
    
    const updatedProfile: UserProfile = {
      ...currentProfile,
      ...updates,
      weightKg: weightKg,
      age: age,
      height: height,
      updatedAt: new Date().toISOString()
    };
    
    // Se il profilo non è ospite e l'utente è autenticato e online, aggiorna nel database
    const currentUser = await getCurrentUserSafe();
    if (!updatedProfile.isGuest && currentUser && !(await offlineService.isOffline())) {
      console.log('Updating profile in database:', profileId);
      
      // Includi has_completed_wizard solo se è definito negli aggiornamenti
      const hasCompletedWizard = updates.hasCompletedWizard !== undefined ? 
        updates.hasCompletedWizard : 
        (currentProfile.hasCompletedWizard || false);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updatedProfile.name,
          gender: updatedProfile.gender,
          weight: Number(updatedProfile.weightKg),
          age: Number(updatedProfile.age),
          height: Number(updatedProfile.height),
          drinking_frequency: updatedProfile.drinkingFrequency,
          emoji: updatedProfile.emoji,
          color: updatedProfile.color,
          is_default: updatedProfile.isDefault,
          has_completed_wizard: hasCompletedWizard,
          updated_at: updatedProfile.updatedAt
        })
        .eq('id', profileId);
      
      if (error) {
        console.error('Error updating profile in database:', error);
        
        // Se l'errore è dovuto alla colonna has_completed_wizard, riprova senza
        if (error.code === '42703' || 
            (error.message && error.message.includes('has_completed_wizard')) ||
            (error.message && error.message.includes('column')) ||
            (error.message && error.message.includes('does not exist'))) {
          console.log('Colonna has_completed_wizard non esiste, riprovo senza...');
          
          const { error: retryError } = await supabase
            .from('profiles')
            .update({
              name: updatedProfile.name,
              gender: updatedProfile.gender,
              weight: Number(updatedProfile.weightKg),
              age: Number(updatedProfile.age),
              height: Number(updatedProfile.height),
              drinking_frequency: updatedProfile.drinkingFrequency,
              emoji: updatedProfile.emoji,
              color: updatedProfile.color,
              is_default: updatedProfile.isDefault,
              updated_at: updatedProfile.updatedAt
            })
            .eq('id', profileId);
          
          if (retryError) {
            console.error('Error updating profile in database (retry):', retryError);
            // Non lanciare errore, continua con salvataggio locale
          }
        } else {
          // Non lanciare errore per altri tipi di errore, continua con salvataggio locale
          console.log('Continuazione con salvataggio locale dopo errore database');
        }
      }
    }
    
    // Aggiorna il profilo localmente
    await saveProfileLocally(updatedProfile);
    
    // Se il profilo è impostato come predefinito, imposta tutti gli altri come non predefiniti
    if (updatedProfile.isDefault) {
      await setDefaultProfile(profileId, updatedProfile.isGuest);
    }
    
    return updatedProfile;
  } catch (error) {
    console.error('Error updating profile:', error);
    return null;
  }
};

/**
 * Elimina un profilo
 */
export const deleteProfile = async (profileId: string): Promise<boolean> => {
  try {
    // Ottieni il profilo da eliminare
    const profileToDelete = await getProfileById(profileId);
    if (!profileToDelete) return false;
    
    // Elimina il profilo dallo storage locale appropriato
    const storageKey = profileToDelete.isGuest ? GUEST_PROFILES_KEY : PROFILES_KEY;
    const profilesJson = await AsyncStorage.getItem(storageKey);
    
    if (profilesJson) {
      const profiles: UserProfile[] = JSON.parse(profilesJson);
      const filteredProfiles = profiles.filter(profile => profile.id !== profileId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(filteredProfiles));
    }
    
    // Se il profilo non è ospite e l'utente è autenticato e online, elimina dal database
    const currentUser = await getCurrentUserSafe();
    if (!profileToDelete.isGuest && currentUser && !(await offlineService.isOffline())) {
      console.log('Deleting profile from database:', profileId);

    const { error } = await supabase
        .from('profiles')
      .delete()
      .eq('id', profileId);
      
    if (error) {
        console.error('Error deleting profile from database:', error);
        throw error;
      }
    }
    
    // Se il profilo eliminato era attivo, imposta un altro profilo come attivo
    const activeProfileId = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
    if (activeProfileId === profileId) {
      // Trova un altro profilo da impostare come attivo
      const profiles = profileToDelete.isGuest 
        ? await getGuestProfiles() 
        : await getProfiles();
      
      if (profiles.length > 0) {
        // Preferibilmente un profilo predefinito, altrimenti il primo disponibile
        const defaultProfile = profiles.find(p => p.isDefault);
        const newActiveProfile = defaultProfile || profiles[0];
        await setActiveProfile(newActiveProfile.id);
      } else {
        // Se non ci sono più profili, rimuovi il profilo attivo
        await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting profile:', error);
    return false;
  }
};

/**
 * Converte un profilo ospite in un profilo utente
 */
export const convertGuestProfileToUser = async (profileId: string, userId: string): Promise<UserProfile | null> => {
  try {
    // Ottieni il profilo ospite
    const guestProfiles = await getGuestProfiles();
    const guestProfile = guestProfiles.find(profile => profile.id === profileId);
    
    if (!guestProfile) {
      console.error('Guest profile not found:', profileId);
      return null;
    }
    
    // Converti il profilo in profilo utente
    const userProfile: UserProfile = {
      ...guestProfile,
      userId,
      isGuest: false,
      updatedAt: new Date().toISOString()
    };
    
    // Rimuovi il profilo ospite
    const updatedGuestProfiles = guestProfiles.filter(profile => profile.id !== profileId);
    await AsyncStorage.setItem(GUEST_PROFILES_KEY, JSON.stringify(updatedGuestProfiles));
    
    // Salva il profilo utente localmente
    await saveProfileLocally(userProfile);
    
    // Se l'utente è online, salva il profilo nel database
    if (!(await offlineService.isOffline())) {
      console.log('Saving converted profile to database');
      
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userProfile.id,
          user_id: userId,
          name: userProfile.name,
          gender: userProfile.gender,
          weight: userProfile.weightKg,
          age: userProfile.age,
          height: userProfile.height,
          drinking_frequency: userProfile.drinkingFrequency,
          emoji: userProfile.emoji,
          color: userProfile.color,
          is_default: userProfile.isDefault,
          created_at: userProfile.createdAt,
          updated_at: userProfile.updatedAt
        });
      
      if (error) {
        console.error('Error saving converted profile to database:', error);
        throw error;
      }
    }
    
    return userProfile;
  } catch (error) {
    console.error('Error converting guest profile to user:', error);
    return null;
  }
};

/**
 * Resetta tutti i profili locali
 */
export const resetLocalProfiles = async (): Promise<boolean> => {
  try {
    console.log('=== RESET COMPLETO PROFILI LOCALI ===');
    
    // 1. Svuota le cache in memoria
    _profileCacheTimestamp = 0;
    
    // 2. Rimuovi TUTTE le chiavi di storage relative ai profili
    await AsyncStorage.removeItem(PROFILES_KEY);
    await AsyncStorage.removeItem(GUEST_PROFILES_KEY);
    await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
    await AsyncStorage.removeItem(CURRENT_PROFILE_KEY);
    
    // 3. Pulisci anche le chiavi legacy/di compatibilità se presenti
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filtra tutte le chiavi che potrebbero contenere informazioni sul profilo
    const profileKeys = allKeys.filter(key => 
      key.includes('profile') || 
      key.includes('active') || 
      key.includes('current') ||
      key.includes('user_') ||
      key.includes('bacchus_')
    );
    
    if (profileKeys.length > 0) {
      console.log('Rimozione chiavi aggiuntive profilo:', profileKeys);
      await AsyncStorage.multiRemove(profileKeys);
    }
    
    console.log('Reset completo profili locali completato');
    return true;
  } catch (error) {
    console.error('Errore durante il reset dei profili locali:', error);
    return false;
  }
};

/**
 * Ottiene il profilo dell'utente corrente
 * Restituisce il profilo corrente se l'utente è autenticato, altrimenti null
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    // Ottieni i profili dell'utente
    const userProfiles = await getProfiles();
    
    // Cerca un profilo predefinito
    let userProfile = userProfiles.find(profile => profile.isDefault);
    
    // Se non c'è un profilo predefinito ma ci sono profili, usa il primo
    if (!userProfile && userProfiles.length > 0) {
      userProfile = userProfiles[0];
    }
    
    return userProfile || null;
  } catch (error) {
    console.error('Error getting current user profile:', error);
    return null;
  }
};

/**
 * Imposta il profilo dell'utente corrente
 * Questo imposta il profilo come predefinito e attivo
 */
export const setCurrentUserProfile = async (profile: UserProfile): Promise<boolean> => {
  try {
    // Imposta il profilo come predefinito
    if (!profile.isDefault) {
      profile.isDefault = true;
      await setDefaultProfile(profile.id, profile.isGuest);
    }
    
    // Imposta il profilo come attivo
    await setActiveProfile(profile.id);
    
    return true;
  } catch (error) {
    console.error('Error setting current user profile:', error);
    return false;
  }
};

/**
 * Carica tutti i profili dal database Supabase per l'utente corrente
 */
export const loadProfilesFromSupabase = async (): Promise<UserProfile[]> => {
  try {
    // Verifica se l'utente è autenticato
    const currentUser = await getCurrentUserSafe();
    if (!currentUser || (await offlineService.isOffline())) {
      return [];
    }
    
    // Ottieni i profili dal database
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', currentUser.id);
    
    if (error) {
      console.error('Error loading profiles from Supabase:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Converti i profili dal formato database al formato app
    const profiles: UserProfile[] = data.map(dbProfile => ({
      id: dbProfile.id,
      userId: dbProfile.user_id,
      name: dbProfile.name,
      gender: dbProfile.gender,
      weightKg: dbProfile.weight,
      age: dbProfile.age,
      height: dbProfile.height,
      drinkingFrequency: dbProfile.drinking_frequency,
      emoji: dbProfile.emoji,
      color: dbProfile.color,
      isDefault: dbProfile.is_default,
      isGuest: false,
      createdAt: dbProfile.created_at,
      updatedAt: dbProfile.updated_at,
      hasCompletedWizard: dbProfile.has_completed_wizard
    }));
    
    // Aggiorna anche lo storage locale
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    
    return profiles;
  } catch (error) {
    console.error('Error loading profiles from Supabase:', error);
    return [];
  }
};

/**
 * Sincronizza i profili locali con quelli su Supabase
 * Versione migliorata che forza sempre il refresh dei profili dal database
 */
export const syncProfiles = async (): Promise<boolean> => {
  try {
    console.log('=== SINCRONIZZAZIONE PROFILI INIZIATA ===');
    
    // Verifica se l'utente è autenticato
    const currentUser = await getCurrentUserSafe();
    if (!currentUser || (await offlineService.isOffline())) {
      console.log('Utente non autenticato o offline, sincronizzazione saltata');
      return false;
    }
    
    console.log('Sincronizzazione profili per utente:', currentUser.id);
    
    // Forza il reset e pulizia completa prima della sincronizzazione
    // Questo è importante per garantire che dati di altri account non persistano
    console.log('Pulizia di cache e profili non validi...');
    await resetLocalProfiles();
    
    // Forza il refresh dei profili dal database
    const profiles = await getProfiles(true);
    
    if (profiles.length === 0) {
      console.log('Nessun profilo trovato su Supabase');
      return false;
    }
    
    // Imposta il profilo predefinito come attivo
    const defaultProfile = profiles.find(p => p.isDefault);
    if (defaultProfile) {
      console.log('Impostazione profilo predefinito come attivo:', defaultProfile.id);
      await setActiveProfile(defaultProfile.id);
    } else if (profiles.length > 0) {
      // Se non c'è un profilo predefinito, imposta il primo come attivo
      console.log('Nessun profilo predefinito, uso il primo:', profiles[0].id);
      await setActiveProfile(profiles[0].id);
    }
    
    // Verifica l'integrità delle sessioni dopo aver sincronizzato i profili
    // Importa dinamicamente per evitare dipendenze circolari
    try {
      const sessionService = require('./session.service');
      if (sessionService.ensureSessionIntegrity) {
        console.log('Verifica integrità sessioni dopo cambio profilo...');
        await sessionService.ensureSessionIntegrity();
      }
    } catch (err) {
      console.warn('Impossibile verificare integrità sessioni:', err);
    }
    
    console.log(`Sincronizzati ${profiles.length} profili da Supabase`);
    return true;
  } catch (error) {
    console.error('Errore nella sincronizzazione dei profili:', error);
    return false;
  }
};

/**
 * Verifica se l'utente ha almeno un profilo
 * @returns {Promise<boolean>} - true se l'utente ha almeno un profilo, false altrimenti
 */
export const hasProfiles = async (): Promise<boolean> => {
  try {
    // Ottieni i profili dell'utente
    const profiles = await getProfiles();
    
    // Verifica se ci sono profili
    return profiles.length > 0;
  } catch (error) {
    console.error('Errore nella verifica dei profili:', error);
    return false;
  }
};

// Esporta le funzioni come oggetto
export default {
  createProfile,
  updateProfile,
  getProfileById,
  getProfiles,
  getGuestProfiles,
  setActiveProfile,
  getActiveProfile,
  deleteProfile,
  resetLocalProfiles,
  getCurrentUserProfile,
  setCurrentUserProfile,
  loadProfilesFromSupabase,
  syncProfiles,
  hasProfiles
}; 