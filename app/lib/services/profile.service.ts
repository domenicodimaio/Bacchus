/**
 * Profile Service
 * 
 * Manages user profiles for BAC calculations
 */

import { UserProfile } from './session.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Chiavi per il local storage
const PROFILES_STORAGE_KEY = 'alcoltest_profiles';

// Store profiles locally
let profiles: UserProfile[] = [];

// Funzione per salvare i profili nel local storage
async function saveProfilesToStorage() {
  try {
    await AsyncStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    console.log('Profili salvati con successo');
  } catch (error) {
    console.error('Errore nel salvataggio dei profili:', error);
  }
}

// Funzione per caricare i profili dal local storage
async function loadProfilesFromStorage() {
  try {
    const storedProfiles = await AsyncStorage.getItem(PROFILES_STORAGE_KEY);
    if (storedProfiles) {
      profiles = JSON.parse(storedProfiles);
      console.log('Profili caricati con successo:', profiles.length);
    }
  } catch (error) {
    console.error('Errore nel caricamento dei profili:', error);
    // In caso di errore, inizializza con un array vuoto
    profiles = [];
  }
}

// Inizializza il servizio caricando i profili
loadProfilesFromStorage();

/**
 * Get all available profiles
 */
export function getProfiles(): UserProfile[] {
  return [...profiles];
}

/**
 * Get a profile by ID
 */
export function getProfileById(id: string): UserProfile | null {
  const profile = profiles.find(p => p.id === id);
  return profile ? { ...profile } : null;
}

/**
 * Get the first profile (se disponibile)
 * Questa funzione sostituisce il vecchio getDefaultProfile
 */
export function getFirstProfile(): UserProfile | null {
  if (profiles.length > 0) {
    return { ...profiles[0] };
  }
  
  return null;
}

/**
 * Create a new profile
 */
export function createProfile(profile: Omit<UserProfile, 'id'>): UserProfile {
  const newProfile: UserProfile = {
    ...profile,
    id: Date.now().toString()
  };
  
  profiles.push(newProfile);
  
  // Salva i cambiamenti
  saveProfilesToStorage();
  
  return { ...newProfile };
}

/**
 * Update an existing profile
 */
export function updateProfile(profile: UserProfile): UserProfile | null {
  const index = profiles.findIndex(p => p.id === profile.id);
  
  if (index === -1) return null;
  
  profiles[index] = { ...profile };
  saveProfilesToStorage();
  
  return { ...profile };
}

/**
 * Delete a profile
 */
export function deleteProfile(profileId: string): boolean {
  // Ottieni i profili esistenti
  const existingProfiles = getProfiles();
  
  // Filtra il profilo da eliminare
  const updatedProfiles = existingProfiles.filter(profile => profile.id !== profileId);
  
  // Se non è cambiato nulla, il profilo non esisteva
  if (updatedProfiles.length === existingProfiles.length) {
    return false;
  }
  
  // Aggiorna la variabile globale
  profiles = updatedProfiles;
  
  // Salva i profili aggiornati
  saveProfilesToStorage();
  
  return true;
}

/**
 * Imposta un profilo come predefinito
 * In realtà, questo metodo si limita a spostare il profilo in cima all'array
 */
export function setDefaultProfile(id: string): boolean {
  const profileIndex = profiles.findIndex(p => p.id === id);
  
  if (profileIndex === -1) {
    return false;
  }
  
  // Estrai il profilo e posizionalo in cima all'array
  const profile = profiles.splice(profileIndex, 1)[0];
  profiles.unshift(profile);
  
  // Salva i cambiamenti
  saveProfilesToStorage();
  
  return true;
}

/**
 * Conta i profili
 * Utile per verificare se l'utente ha già almeno un profilo
 */
export function hasProfiles(): boolean {
  return profiles.length > 0;
} 