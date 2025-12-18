import AsyncStorage from '@react-native-async-storage/async-storage';
import { Drink } from '../../types/session';

// 🎯 SERVIZIO BEVANDE PREFERITE E RECENTI
// Gestisce lo storage locale delle bevande preferite dall'utente
// e tiene traccia delle ultime bevande aggiunte

const STORAGE_KEYS = {
  FAVORITE_DRINKS: 'bacchus_favorite_drinks',
  RECENT_DRINKS: 'bacchus_recent_drinks',
};

export interface FavoriteDrink {
  id: string;
  name: string;
  category: string;
  volume: number;
  percentage: number;
  icon?: string;
  iconColor?: string;
  timestamp: number; // Quando è stata aggiunta ai preferiti
}

export interface RecentDrink extends FavoriteDrink {
  lastUsed: number; // Ultima volta che è stata usata
  usageCount: number; // Quante volte è stata usata
}

// Limiti storage
const MAX_FAVORITES = 20;
const MAX_RECENT = 10;

/**
 * 🌟 Aggiunge una bevanda ai preferiti
 */
export const addToFavorites = async (drink: Partial<FavoriteDrink>): Promise<boolean> => {
  try {
    console.log('💖 FAVORITES: Aggiungendo bevanda ai preferiti:', drink.name);
    
    const favorites = await getFavorites();
    
    // Genera ID univoco se non presente
    const favDrink: FavoriteDrink = {
      id: drink.id || `fav_${Date.now()}`,
      name: drink.name || 'Bevanda',
      category: drink.category || 'beer',
      volume: drink.volume || 330,
      percentage: drink.percentage || 5.0,
      icon: drink.icon,
      iconColor: drink.iconColor,
      timestamp: Date.now()
    };
    
    // Controlla se già presente
    const existingIndex = favorites.findIndex(f => 
      f.name === favDrink.name && 
      f.volume === favDrink.volume && 
      f.percentage === favDrink.percentage
    );
    
    if (existingIndex >= 0) {
      console.log('⚠️ FAVORITES: Bevanda già nei preferiti');
      return false;
    }
    
    // Aggiungi all'inizio
    favorites.unshift(favDrink);
    
    // Mantieni solo le ultime MAX_FAVORITES
    if (favorites.length > MAX_FAVORITES) {
      favorites.splice(MAX_FAVORITES);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_DRINKS, JSON.stringify(favorites));
    console.log(`✅ FAVORITES: Bevanda aggiunta (totale: ${favorites.length})`);
    
    return true;
  } catch (error) {
    console.error('❌ FAVORITES: Errore aggiunta bevanda:', error);
    return false;
  }
};

/**
 * 🗑️ Rimuove una bevanda dai preferiti
 */
export const removeFromFavorites = async (drinkId: string): Promise<boolean> => {
  try {
    console.log('💔 FAVORITES: Rimuovendo bevanda dai preferiti:', drinkId);
    
    const favorites = await getFavorites();
    const filteredFavorites = favorites.filter(f => f.id !== drinkId);
    
    if (filteredFavorites.length === favorites.length) {
      console.log('⚠️ FAVORITES: Bevanda non trovata nei preferiti');
      return false;
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_DRINKS, JSON.stringify(filteredFavorites));
    console.log(`✅ FAVORITES: Bevanda rimossa (totale: ${filteredFavorites.length})`);
    
    return true;
  } catch (error) {
    console.error('❌ FAVORITES: Errore rimozione bevanda:', error);
    return false;
  }
};

/**
 * 📋 Ottiene tutte le bevande preferite
 */
export const getFavorites = async (): Promise<FavoriteDrink[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_DRINKS);
    if (!data) return [];
    
    const favorites: FavoriteDrink[] = JSON.parse(data);
    console.log(`📋 FAVORITES: Caricate ${favorites.length} bevande preferite`);
    
    return favorites;
  } catch (error) {
    console.error('❌ FAVORITES: Errore caricamento preferiti:', error);
    return [];
  }
};

/**
 * ❓ Controlla se una bevanda è nei preferiti
 */
export const isFavorite = async (name: string, volume: number, percentage: number): Promise<boolean> => {
  try {
    const favorites = await getFavorites();
    return favorites.some(f => 
      f.name === name && 
      f.volume === volume && 
      f.percentage === percentage
    );
  } catch (error) {
    console.error('❌ FAVORITES: Errore controllo preferito:', error);
    return false;
  }
};

/**
 * ⏱️ Aggiunge/aggiorna una bevanda nelle recenti
 */
export const addToRecent = async (drink: Partial<FavoriteDrink>): Promise<boolean> => {
  try {
    console.log('🕐 RECENT: Aggiornando bevande recenti:', drink.name);
    
    const recent = await getRecent();
    
    // Genera ID univoco se non presente
    const recentDrink: RecentDrink = {
      id: drink.id || `recent_${Date.now()}`,
      name: drink.name || 'Bevanda',
      category: drink.category || 'beer',
      volume: drink.volume || 330,
      percentage: drink.percentage || 5.0,
      icon: drink.icon,
      iconColor: drink.iconColor,
      timestamp: Date.now(),
      lastUsed: Date.now(),
      usageCount: 1
    };
    
    // Controlla se già presente
    const existingIndex = recent.findIndex(r => 
      r.name === recentDrink.name && 
      r.volume === recentDrink.volume && 
      r.percentage === recentDrink.percentage
    );
    
    if (existingIndex >= 0) {
      // Aggiorna contatore e sposta in cima
      const existing = recent[existingIndex];
      existing.lastUsed = Date.now();
      existing.usageCount += 1;
      recent.splice(existingIndex, 1);
      recent.unshift(existing);
      console.log(`🔄 RECENT: Bevanda già presente, aggiornata (count: ${existing.usageCount})`);
    } else {
      // Aggiungi all'inizio
      recent.unshift(recentDrink);
      console.log('✅ RECENT: Nuova bevanda aggiunta');
    }
    
    // Mantieni solo le ultime MAX_RECENT
    if (recent.length > MAX_RECENT) {
      recent.splice(MAX_RECENT);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.RECENT_DRINKS, JSON.stringify(recent));
    console.log(`✅ RECENT: Lista aggiornata (totale: ${recent.length})`);
    
    return true;
  } catch (error) {
    console.error('❌ RECENT: Errore aggiornamento recenti:', error);
    return false;
  }
};

/**
 * 📋 Ottiene le bevande recenti
 */
export const getRecent = async (): Promise<RecentDrink[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_DRINKS);
    if (!data) return [];
    
    const recent: RecentDrink[] = JSON.parse(data);
    console.log(`📋 RECENT: Caricate ${recent.length} bevande recenti`);
    
    // Ordina per ultima usata (più recente prima)
    recent.sort((a, b) => b.lastUsed - a.lastUsed);
    
    return recent;
  } catch (error) {
    console.error('❌ RECENT: Errore caricamento recenti:', error);
    return [];
  }
};

/**
 * 🔥 Ottiene le bevande "popolari" (più usate di recente)
 */
export const getPopular = async (): Promise<RecentDrink[]> => {
  try {
    const recent = await getRecent();
    
    // Filtra solo quelle usate più di una volta
    const popular = recent.filter(r => r.usageCount > 1);
    
    // Ordina per contatore uso (più usate prima)
    popular.sort((a, b) => b.usageCount - a.usageCount);
    
    console.log(`🔥 POPULAR: Trovate ${popular.length} bevande popolari`);
    
    return popular.slice(0, 5); // Top 5
  } catch (error) {
    console.error('❌ POPULAR: Errore caricamento popolari:', error);
    return [];
  }
};

/**
 * 🧹 Pulisce le bevande vecchie dalle recenti (> 30 giorni)
 */
export const cleanOldRecent = async (): Promise<void> => {
  try {
    const recent = await getRecent();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const filteredRecent = recent.filter(r => r.lastUsed > thirtyDaysAgo);
    
    if (filteredRecent.length < recent.length) {
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_DRINKS, JSON.stringify(filteredRecent));
      console.log(`🧹 RECENT: Rimosse ${recent.length - filteredRecent.length} bevande vecchie`);
    }
  } catch (error) {
    console.error('❌ RECENT: Errore pulizia vecchie bevande:', error);
  }
};

/**
 * 🗑️ Pulisce tutto lo storage
 */
export const clearAllFavorites = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.FAVORITE_DRINKS);
    await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_DRINKS);
    console.log('🗑️ FAVORITES: Storage pulito completamente');
  } catch (error) {
    console.error('❌ FAVORITES: Errore pulizia storage:', error);
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
  clearAllFavorites
};

