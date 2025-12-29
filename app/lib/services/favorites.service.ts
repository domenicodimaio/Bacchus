import supabase from '../supabase/client';
import { Drink } from '../../types/session';

// 🎯 SERVIZIO BEVANDE PREFERITE E RECENTI
// Gestisce lo storage su Supabase delle bevande preferite dall'utente
// e tiene traccia delle ultime bevande aggiunte
// 🔐 ISOLAMENTO UTENTE: RLS di Supabase garantisce separazione tra utenti
// ☁️ SYNC MULTI-DISPOSITIVO: Dati sincronizzati automaticamente

/**
 * 🔍 Ottiene l'ID utente corrente da Supabase Auth
 */
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error('❌ FAVORITES: Errore ottenimento user ID:', error);
    return null;
  }
};

export interface FavoriteDrink {
  id: string;
  user_id?: string;
  name: string;
  category: string;
  volume: number;
  percentage: number;
  icon?: string;
  icon_color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RecentDrink {
  id: string;
  user_id?: string;
  name: string;
  category: string;
  volume: number;
  percentage: number;
  icon?: string;
  icon_color?: string;
  usage_count: number;
  last_used: string;
  created_at?: string;
  updated_at?: string;
}

// Limiti storage
const MAX_FAVORITES = 20;
const MAX_RECENT = 10;

/**
 * 🌟 Aggiunge una bevanda ai preferiti (Supabase)
 */
export const addToFavorites = async (drink: Partial<FavoriteDrink>): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('❌ FAVORITES: Utente non autenticato');
      return false;
    }
    
    console.log('💖 FAVORITES: Aggiungendo bevanda ai preferiti per utente:', userId, '- bevanda:', drink.name);
    
    // Controlla se già presente
    const { data: existing } = await supabase
      .from('favorite_drinks')
      .select('id')
      .eq('user_id', userId)
      .eq('name', drink.name || 'Bevanda')
      .eq('volume', drink.volume || 330)
      .eq('percentage', drink.percentage || 5.0)
      .single();
    
    if (existing) {
      console.log('⚠️ FAVORITES: Bevanda già nei preferiti');
      return false;
    }
    
    // Controlla limite MAX_FAVORITES
    const { count } = await supabase
      .from('favorite_drinks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (count && count >= MAX_FAVORITES) {
      // Rimuovi la più vecchia
      const { data: oldest } = await supabase
        .from('favorite_drinks')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (oldest) {
        await supabase
          .from('favorite_drinks')
          .delete()
          .eq('id', oldest.id);
      }
    }
    
    // Inserisci nuova bevanda
    const { data, error } = await supabase
      .from('favorite_drinks')
      .insert({
        user_id: userId,
        name: drink.name || 'Bevanda',
        category: drink.category || 'beer',
        volume: drink.volume || 330,
        percentage: drink.percentage || 5.0,
        icon: drink.icon,
        icon_color: drink.icon_color
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ FAVORITES: Errore inserimento:', error);
      return false;
    }
    
    console.log(`✅ FAVORITES: Bevanda aggiunta su Supabase per utente ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ FAVORITES: Errore aggiunta bevanda:', error);
    return false;
  }
};

/**
 * 🗑️ Rimuove una bevanda dai preferiti (Supabase)
 */
export const removeFromFavorites = async (drinkId: string): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('❌ FAVORITES: Utente non autenticato');
      return false;
    }
    
    console.log('💔 FAVORITES: Rimuovendo bevanda dai preferiti per utente:', userId, '- drinkId:', drinkId);
    
    const { error } = await supabase
      .from('favorite_drinks')
      .delete()
      .eq('id', drinkId)
      .eq('user_id', userId); // RLS check extra
    
    if (error) {
      console.error('❌ FAVORITES: Errore rimozione:', error);
      return false;
    }
    
    console.log(`✅ FAVORITES: Bevanda rimossa da Supabase per utente ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ FAVORITES: Errore rimozione bevanda:', error);
    return false;
  }
};

/**
 * 📋 Ottiene tutte le bevande preferite (Supabase)
 */
export const getFavorites = async (): Promise<FavoriteDrink[]> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('⚠️ FAVORITES: Utente non autenticato');
      return [];
    }
    
    const { data, error } = await supabase
      .from('favorite_drinks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_FAVORITES);
    
    if (error) {
      console.error('❌ FAVORITES: Errore caricamento:', error);
      return [];
    }
    
    console.log(`📋 FAVORITES: Caricate ${data?.length || 0} bevande preferite da Supabase per utente ${userId}`);
    return data || [];
  } catch (error) {
    console.error('❌ FAVORITES: Errore caricamento preferiti:', error);
    return [];
  }
};

/**
 * ❓ Controlla se una bevanda è nei preferiti (Supabase)
 */
export const isFavorite = async (name: string, volume: number, percentage: number): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    
    console.log('🔍 isFavorite check:', { userId, name, volume, percentage });
    
    const { data, error } = await supabase
      .from('favorite_drinks')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name)
      .eq('volume', volume)
      .eq('percentage', percentage)
      .limit(1);
    
    if (error) {
      console.error('❌ FAVORITES: Errore controllo preferito:', error);
      return false;
    }
    
    const isFav = data && data.length > 0;
    console.log('✅ isFavorite result:', isFav, 'data:', data);
    return isFav;
  } catch (error) {
    console.error('❌ FAVORITES: Errore controllo preferito:', error);
    return false;
  }
};

/**
 * ⏱️ Aggiunge/aggiorna una bevanda nelle recenti (Supabase)
 */
export const addToRecent = async (drink: Partial<FavoriteDrink>): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('❌ RECENT: Utente non autenticato');
      return false;
    }
    
    console.log('🕐 RECENT: Aggiornando bevande recenti per utente:', userId, '- bevanda:', drink.name);
    
    // Controlla se già presente
    const { data: existing } = await supabase
      .from('recent_drinks')
      .select('*')
      .eq('user_id', userId)
      .eq('name', drink.name || 'Bevanda')
      .eq('volume', drink.volume || 330)
      .eq('percentage', drink.percentage || 5.0)
      .single();
    
    if (existing) {
      // Aggiorna contatore e timestamp
      const { error } = await supabase
        .from('recent_drinks')
        .update({
          usage_count: existing.usage_count + 1,
          last_used: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (error) {
        console.error('❌ RECENT: Errore aggiornamento:', error);
        return false;
      }
      
      console.log(`🔄 RECENT: Bevanda aggiornata (count: ${existing.usage_count + 1})`);
      return true;
    }
    
    // Controlla limite MAX_RECENT
    const { count } = await supabase
      .from('recent_drinks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (count && count >= MAX_RECENT) {
      // Rimuovi la meno usata recentemente
      const { data: oldest } = await supabase
        .from('recent_drinks')
        .select('id')
        .eq('user_id', userId)
        .order('last_used', { ascending: true })
        .limit(1)
        .single();
      
      if (oldest) {
        await supabase
          .from('recent_drinks')
          .delete()
          .eq('id', oldest.id);
      }
    }
    
    // Inserisci nuova bevanda
    const { error } = await supabase
      .from('recent_drinks')
      .insert({
        user_id: userId,
        name: drink.name || 'Bevanda',
        category: drink.category || 'beer',
        volume: drink.volume || 330,
        percentage: drink.percentage || 5.0,
        icon: drink.icon,
        icon_color: drink.icon_color,
        usage_count: 1,
        last_used: new Date().toISOString()
      });
    
    if (error) {
      console.error('❌ RECENT: Errore inserimento:', error);
      return false;
    }
    
    console.log(`✅ RECENT: Nuova bevanda aggiunta su Supabase`);
    return true;
  } catch (error) {
    console.error('❌ RECENT: Errore aggiornamento recenti:', error);
    return false;
  }
};

/**
 * 📋 Ottiene le bevande recenti (Supabase)
 */
export const getRecent = async (): Promise<RecentDrink[]> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('⚠️ RECENT: Utente non autenticato');
      return [];
    }
    
    const { data, error } = await supabase
      .from('recent_drinks')
      .select('*')
      .eq('user_id', userId)
      .order('last_used', { ascending: false })
      .limit(MAX_RECENT);
    
    if (error) {
      console.error('❌ RECENT: Errore caricamento:', error);
      return [];
    }
    
    console.log(`📋 RECENT: Caricate ${data?.length || 0} bevande recenti da Supabase per utente ${userId}`);
    return data || [];
  } catch (error) {
    console.error('❌ RECENT: Errore caricamento recenti:', error);
    return [];
  }
};

/**
 * 🔥 Ottiene le bevande "popolari" (più usate) (Supabase)
 */
export const getPopular = async (): Promise<RecentDrink[]> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    
    const { data, error } = await supabase
      .from('recent_drinks')
      .select('*')
      .eq('user_id', userId)
      .gt('usage_count', 1)
      .order('usage_count', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ POPULAR: Errore caricamento:', error);
      return [];
    }
    
    console.log(`🔥 POPULAR: Trovate ${data?.length || 0} bevande popolari`);
    return data || [];
  } catch (error) {
    console.error('❌ POPULAR: Errore caricamento popolari:', error);
    return [];
  }
};

/**
 * 🧹 Pulisce le bevande vecchie dalle recenti (> 30 giorni) (Supabase)
 */
export const cleanOldRecent = async (): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { error } = await supabase
      .from('recent_drinks')
      .delete()
      .eq('user_id', userId)
      .lt('last_used', thirtyDaysAgo.toISOString());
    
    if (error) {
      console.error('❌ RECENT: Errore pulizia vecchie bevande:', error);
    } else {
      console.log(`🧹 RECENT: Rimosse bevande vecchie (> 30 giorni) per utente ${userId}`);
    }
  } catch (error) {
    console.error('❌ RECENT: Errore pulizia vecchie bevande:', error);
  }
};

/**
 * 🗑️ Pulisce tutti i preferiti per l'utente corrente (Supabase)
 */
export const clearAllFavorites = async (): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    
    const { error } = await supabase
      .from('favorite_drinks')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ FAVORITES: Errore pulizia preferiti:', error);
    } else {
      console.log(`🗑️ FAVORITES: Tutti i preferiti puliti per utente ${userId}`);
    }
  } catch (error) {
    console.error('❌ FAVORITES: Errore pulizia preferiti:', error);
  }
};

/**
 * 🗑️ Pulisce tutte le bevande recenti per l'utente corrente (Supabase)
 */
export const clearRecentDrinks = async (): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    
    const { error } = await supabase
      .from('recent_drinks')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ RECENT: Errore pulizia recenti:', error);
    } else {
      console.log(`🗑️ RECENT: Tutte le bevande recenti pulite per utente ${userId}`);
    }
  } catch (error) {
    console.error('❌ RECENT: Errore pulizia recenti:', error);
  }
};

// Export default per uso semplificato
export default {
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  isFavorite,
  addToRecent,
  getRecent,
  getPopular,
  cleanOldRecent,
  clearAllFavorites,
  clearRecentDrinks
};

