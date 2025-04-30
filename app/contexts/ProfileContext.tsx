import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as profileService from '../lib/services/profile.service';
import { UserProfile } from '../lib/services/profile.service';
import { useAuth } from './AuthContext';

/**
 * Contesto per i profili utente
 * Modificato per supportare un singolo profilo per utente
 * Mantenuto compatibile con il vecchio sistema multi-profilo
 */
interface ProfileContextType {
  // Stato attuale - profilo singolo
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => Promise<void>;
  updateUserProfile: (profile: UserProfile) => Promise<void>;
  
  // Compatibilità con sistema multi-profilo
  activeProfiles: UserProfile[];
  currentProfileId: string | null;
  setCurrentProfile: (profileId: string) => Promise<void>;
  addActiveProfile: (profileId: string) => Promise<void>;
  removeActiveProfile: (profileId: string) => Promise<void>;
  clearAllActiveSessions: () => Promise<void>;
  isActiveProfile: (profileId: string) => boolean;
}

// Chiavi per lo storage
const ACTIVE_PROFILES_KEY = 'bacchus_active_profiles';
const CURRENT_PROFILE_KEY = 'bacchus_current_profile';

export const ProfileContext = createContext<ProfileContextType>({
  // Profilo singolo
  userProfile: null,
  setUserProfile: async () => {},
  updateUserProfile: async () => {},
  
  // Compatibilità multi-profilo
  activeProfiles: [],
  currentProfileId: null,
  setCurrentProfile: async () => {},
  addActiveProfile: async () => {},
  removeActiveProfile: async () => {},
  clearAllActiveSessions: async () => {},
  isActiveProfile: () => false,
});

export const useActiveProfiles = () => useContext(ProfileContext);

// Nuovo hook per accedere direttamente al profilo dell'utente
export const useUserProfile = () => {
  const context = useContext(ProfileContext);
  return {
    profile: context.userProfile,
    setProfile: context.setUserProfile,
    updateProfile: context.updateUserProfile
  };
};

export const ActiveProfilesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [activeProfiles, setActiveProfiles] = useState<UserProfile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

  // Carica il profilo dell'utente e mantiene i profili attivi per compatibilità
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        // Prima carica il profilo dell'utente corrente
        const currentUserProfile = await profileService.getCurrentUserProfile();
        setUserProfileState(currentUserProfile);
        
        // Se c'è un profilo utente, usalo anche come profilo attivo per compatibilità
        if (currentUserProfile) {
          setCurrentProfileId(currentUserProfile.id);
          
          // Se il profilo non è già tra quelli attivi, lo aggiungiamo
          let updatedProfiles = [...activeProfiles];
          if (!updatedProfiles.some(p => p.id === currentUserProfile.id)) {
            updatedProfiles = [currentUserProfile, ...updatedProfiles];
          }
          setActiveProfiles(updatedProfiles);
        }
        
        // Per compatibilità, carica anche i profili attivi dal vecchio sistema
        const storedActiveProfiles = await AsyncStorage.getItem(ACTIVE_PROFILES_KEY);
        let profileIds: string[] = [];
        
        if (storedActiveProfiles) {
          profileIds = JSON.parse(storedActiveProfiles);
          
          // Converti gli ID dei profili in oggetti profilo completi
          const profilePromises = profileIds.map(id => profileService.getProfileById(id));
          const profiles = (await Promise.all(profilePromises)).filter(p => p !== null) as UserProfile[];
          
          // Assicuriamoci di non avere duplicati
          const uniqueProfiles = profiles.filter(
            (profile, index, self) => 
              index === self.findIndex(p => p.id === profile.id)
          );
          
          setActiveProfiles(uniqueProfiles);
        }
        
        // Carica l'ID del profilo corrente
        const storedCurrentProfileId = await AsyncStorage.getItem(CURRENT_PROFILE_KEY);
        if (storedCurrentProfileId) {
          setCurrentProfileId(JSON.parse(storedCurrentProfileId));
        } else if (currentUserProfile) {
          // Se non c'è un ID salvato ma abbiamo un profilo utente, usiamo quello
          setCurrentProfileId(currentUserProfile.id);
        }
      } catch (error) {
        console.error('Errore nel caricamento dei profili attivi:', error);
      }
    };
    
    loadProfiles();
  }, [user]); // Dipendenza da user per ricaricare quando cambia l'utente

  // Imposta il profilo corrente dell'utente
  const setUserProfile = async (profile: UserProfile) => {
    try {
      // Memorizza il profilo nel servizio
      await profileService.setCurrentUserProfile(profile);
      setUserProfileState(profile);
      
      // Aggiorna anche il profilo corrente (compatibilità)
      await setCurrentProfile(profile.id);
    } catch (error) {
      console.error('Errore nell\'impostare il profilo utente:', error);
    }
  };
  
  // Aggiorna il profilo dell'utente
  const updateUserProfile = async (profile: UserProfile) => {
    try {
      // Aggiorna il profilo nel servizio
      const updatedProfile = await profileService.updateProfile(profile.id, profile);
      if (updatedProfile) {
        setUserProfileState(updatedProfile);
        
        // Aggiorna anche gli array di compatibilità
        const updatedProfiles = activeProfiles.map(p => 
          p.id === profile.id ? updatedProfile : p
        );
        setActiveProfiles(updatedProfiles);
      }
    } catch (error) {
      console.error('Errore nell\'aggiornare il profilo utente:', error);
    }
  };

  // Compatibilità: imposta il profilo corrente
  const setCurrentProfile = async (profileId: string) => {
    try {
      const profile = await profileService.getProfileById(profileId);
      if (!profile) return;
      
      // Memorizza l'ID nel local storage
      await AsyncStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profileId));
      setCurrentProfileId(profileId);
      
      // Assicuriamoci che il profilo sia anche tra i profili attivi
      if (!activeProfiles.some(p => p.id === profileId)) {
        await addActiveProfile(profileId);
      }
      
      // Nuovo comportamento: imposta anche come profilo utente
      await profileService.setCurrentUserProfile(profile);
      setUserProfileState(profile);
    } catch (error) {
      console.error('Errore nell\'impostazione del profilo corrente:', error);
    }
  };

  // Compatibilità: aggiunge un profilo attivo
  const addActiveProfile = async (profileId: string) => {
    try {
      const profile = await profileService.getProfileById(profileId);
      if (!profile) return;
      
      // Verifica se il profilo è già attivo
      if (activeProfiles.some(p => p.id === profileId)) {
        console.log(`Profilo ${profileId} già attivo, nessuna azione necessaria`);
        return;
      }
      
      // Aggiungi il profilo all'array dei profili attivi
      const updatedProfiles = [profile, ...activeProfiles];
      setActiveProfiles(updatedProfiles);
      
      // Salva gli ID nel local storage
      const profileIds = updatedProfiles.map(p => p.id);
      await AsyncStorage.setItem(ACTIVE_PROFILES_KEY, JSON.stringify(profileIds));
      
      // Se non c'è un profilo corrente, imposta questo come corrente
      if (!currentProfileId) {
        await setCurrentProfile(profileId);
      }
      
      // Nuovo comportamento: imposta come profilo utente se non ce n'è già uno
      if (!userProfile) {
        await profileService.setCurrentUserProfile(profile);
        setUserProfileState(profile);
      }
    } catch (error) {
      console.error('Errore nell\'aggiunta del profilo attivo:', error);
    }
  };

  // Compatibilità: rimuove un profilo attivo
  const removeActiveProfile = async (profileId: string) => {
    try {
      // Rimuovi il profilo dall'array dei profili attivi
      const updatedProfiles = activeProfiles.filter(p => p.id !== profileId);
      setActiveProfiles(updatedProfiles);
      
      // Aggiorna il local storage
      const profileIds = updatedProfiles.map(p => p.id);
      await AsyncStorage.setItem(ACTIVE_PROFILES_KEY, JSON.stringify(profileIds));
      
      // Se il profilo rimosso era quello corrente, imposta un altro profilo come corrente
      if (currentProfileId === profileId && updatedProfiles.length > 0) {
        await setCurrentProfile(updatedProfiles[0].id);
      } else if (currentProfileId === profileId) {
        await AsyncStorage.removeItem(CURRENT_PROFILE_KEY);
        setCurrentProfileId(null);
      }
      
      // Nuovo comportamento: se era il profilo utente, pulisci il riferimento
      if (userProfile && userProfile.id === profileId) {
        setUserProfileState(null);
      }
    } catch (error) {
      console.error('Errore nella rimozione del profilo attivo:', error);
    }
  };

  // Compatibilità: pulisce tutti i profili attivi
  const clearAllActiveSessions = async () => {
    try {
      setActiveProfiles([]);
      await AsyncStorage.removeItem(ACTIVE_PROFILES_KEY);
      await AsyncStorage.removeItem(CURRENT_PROFILE_KEY);
      setCurrentProfileId(null);
      
      // Non rimuoviamo il profilo utente in questo caso, dato che ora è legato all'account
    } catch (error) {
      console.error('Errore nella pulizia di tutte le sessioni attive:', error);
    }
  };

  // Compatibilità: controlla se un profilo è attivo
  const isActiveProfile = (profileId: string) => {
    return activeProfiles.some(p => p.id === profileId);
  };

  return (
    <ProfileContext.Provider
      value={{
        // Nuovo contesto per profilo singolo
        userProfile,
        setUserProfile,
        updateUserProfile,
        
        // Compatibilità con sistema multi-profilo
        activeProfiles,
        currentProfileId,
        setCurrentProfile,
        addActiveProfile,
        removeActiveProfile,
        clearAllActiveSessions,
        isActiveProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}; 