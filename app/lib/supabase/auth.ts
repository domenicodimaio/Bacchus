import { clearUserSessions, handleLogout, handleUserLogin } from '../services/session.service';
import supabase from './client';

/**
 * Funzione per gestire il login di un utente
 */
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Error signing in:', error);
      return { error };
    }

    // Gestisci il login nell'app
    if (data?.user?.id) {
      await handleUserLogin(data.user.id);
    }

    return { data };
  } catch (e) {
    console.error('Exception during sign in:', e);
    return { error: e };
  }
}

/**
 * Funzione per gestire il logout di un utente
 */
export async function signOut() {
  try {
    // Prima esegui la pulizia corretta delle sessioni
    await handleLogout();
    
    // Poi esegui l'effettivo logout da Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      return { error };
    }
    
    return { success: true };
  } catch (e) {
    console.error('Exception during sign out:', e);
    return { error: e };
  }
} 