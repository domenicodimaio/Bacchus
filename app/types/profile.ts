/**
 * Profile Types
 * 
 * Definizione estesa dei tipi di profilo utente
 */

import { UserProfile as BaseUserProfile } from '../lib/services/profile.service';

/**
 * Estensione del tipo UserProfile con supporto per immagini ed emoji
 */
export interface ExtendedUserProfile extends BaseUserProfile {
  // Campi opzionali per visualizzazione
  image?: string;     // URI dell'immagine profilo
  emoji?: string;     // Emoji usata come avatar
  color?: string;     // Colore di sfondo per l'avatar
  
  // Per compatibilità con il codice esistente
  weight?: number;    // Alias di weightKg per compatibilità
}

/**
 * Converte un profilo base in un profilo esteso
 */
export function extendProfile(profile: BaseUserProfile): ExtendedUserProfile {
  return {
    ...profile,
    weight: profile.weightKg, // Alias per compatibilità
    // Controlla se ci sono attributi aggiuntivi nel profilo originale
    emoji: profile.emoji || '',
    color: profile.color || '#FF5252'
  };
} 