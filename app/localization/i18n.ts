/**
 * IMPORTANTE: Questo file è stato deprecato e sostituito con app/i18n/index.ts
 * 
 * Per retrocompatibilità, questo file ora esporta semplicemente l'istanza i18n
 * definita correttamente in app/i18n/index.ts.
 */

import i18next from '../i18n';
import { loadLanguageFromStorage } from '../i18n';

// Riesportiamo la funzione con il nome originale per retrocompatibilità
export const loadStoredLanguage = loadLanguageFromStorage;

// Esportiamo l'istanza i18n configurata correttamente
export default i18next; 