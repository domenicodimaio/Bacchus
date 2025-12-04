import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

/**
 * ProfileContext con funzionalità di base (evita operazioni complesse)
 */
interface ProfileContextType {
  userProfile: any | null;
  setUserProfile: (profile: any) => Promise<void>;
  updateUserProfile: (profile: any) => Promise<void>;
  activeProfiles: any[];
  currentProfileId: string | null;
  setCurrentProfile: (profileId: string) => Promise<void>;
  addActiveProfile: (profileId: string) => Promise<void>;
  removeActiveProfile: (profileId: string) => Promise<void>;
  clearAllActiveSessions: () => Promise<void>;
  isActiveProfile: (profileId: string) => boolean;
}

export const ProfileContext = createContext<ProfileContextType>({
  userProfile: null,
  setUserProfile: async () => {},
  updateUserProfile: async () => {},
  activeProfiles: [],
  currentProfileId: null,
  setCurrentProfile: async () => {},
  addActiveProfile: async () => {},
  removeActiveProfile: async () => {},
  clearAllActiveSessions: async () => {},
  isActiveProfile: () => false,
});

export const useActiveProfiles = () => useContext(ProfileContext);

export const useUserProfile = () => {
  const context = useContext(ProfileContext);
  return {
    profile: context.userProfile,
    setProfile: context.setUserProfile,
    updateProfile: context.updateUserProfile
  };
};

export const ActiveProfilesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfileState] = useState<any | null>(null);
  const [activeProfiles, setActiveProfiles] = useState<any[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

  // 🔧 FIX CRITICO: Sincronizzazione automatica con AuthContext
  const { profiles: authProfiles, activeProfile: authActiveProfile } = useAuth();

  // Sincronizza i profili da AuthContext quando cambiano
  useEffect(() => {
    console.log('[PROFILE_CONTEXT] 🔄 Sincronizzazione con AuthContext...');
    console.log('[PROFILE_CONTEXT] AuthContext profili:', authProfiles?.length || 0);
    console.log('[PROFILE_CONTEXT] AuthContext profilo attivo:', authActiveProfile?.name || 'nessuno');

    if (authProfiles && authProfiles.length > 0) {
      // Aggiorna activeProfiles con i profili da AuthContext
      setActiveProfiles(authProfiles);
      console.log('[PROFILE_CONTEXT] ✅ Sincronizzati', authProfiles.length, 'profili');
      
      // Aggiorna il profilo corrente se presente
      if (authActiveProfile) {
        setCurrentProfileId(authActiveProfile.id);
        setUserProfileState(authActiveProfile);
        console.log('[PROFILE_CONTEXT] ✅ Profilo attivo sincronizzato:', authActiveProfile.name);
      } else if (authProfiles.length > 0) {
        // Se non c'è profilo attivo ma ci sono profili, usa il primo
        setCurrentProfileId(authProfiles[0].id);
        setUserProfileState(authProfiles[0]);
        console.log('[PROFILE_CONTEXT] ✅ Usando primo profilo:', authProfiles[0].name);
      }
    } else {
      console.log('[PROFILE_CONTEXT] ⚠️ Nessun profilo da AuthContext');
      setActiveProfiles([]);
      setCurrentProfileId(null);
      setUserProfileState(null);
    }
  }, [authProfiles, authActiveProfile]);

  // Funzioni BASE (senza operazioni database complesse)
  const setUserProfile = async (profile: any) => {
    try {
      console.log('[PROFILE_CONTEXT] setUserProfile:', profile?.name || 'unnamed');
      setUserProfileState(profile);
    } catch (error) {
      console.error('[PROFILE_CONTEXT] Error in setUserProfile:', error);
    }
  };
  
  const updateUserProfile = async (profile: any) => {
    try {
      console.log('[PROFILE_CONTEXT] updateUserProfile:', profile?.name || 'unnamed');
      setUserProfileState(profile);
    } catch (error) {
      console.error('[PROFILE_CONTEXT] Error in updateUserProfile:', error);
    }
  };

  const setCurrentProfile = async (profileId: string) => {
    try {
      console.log('[PROFILE_CONTEXT] setCurrentProfile:', profileId);
      setCurrentProfileId(profileId);
    } catch (error) {
      console.error('[PROFILE_CONTEXT] Error in setCurrentProfile:', error);
    }
  };

  const addActiveProfile = async (profileId: string) => {
    try {
      console.log('[PROFILE_CONTEXT] addActiveProfile:', profileId);
      setActiveProfiles(prev => {
        if (!prev.find(p => p.id === profileId)) {
          return [...prev, { id: profileId }];
        }
        return prev;
      });
    } catch (error) {
      console.error('[PROFILE_CONTEXT] Error in addActiveProfile:', error);
    }
  };

  const removeActiveProfile = async (profileId: string) => {
    try {
      console.log('[PROFILE_CONTEXT] removeActiveProfile:', profileId);
      setActiveProfiles(prev => prev.filter(p => p.id !== profileId));
    } catch (error) {
      console.error('[PROFILE_CONTEXT] Error in removeActiveProfile:', error);
    }
  };

  const clearAllActiveSessions = async () => {
    try {
      console.log('[PROFILE_CONTEXT] clearAllActiveSessions');
      setActiveProfiles([]);
      setCurrentProfileId(null);
    } catch (error) {
      console.error('[PROFILE_CONTEXT] Error in clearAllActiveSessions:', error);
    }
  };

  const isActiveProfile = (profileId: string) => {
    return activeProfiles.some(p => p.id === profileId);
  };

  const value: ProfileContextType = {
    userProfile,
    setUserProfile,
    updateUserProfile,
    activeProfiles,
    currentProfileId,
    setCurrentProfile,
    addActiveProfile,
    removeActiveProfile,
    clearAllActiveSessions,
    isActiveProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}; 