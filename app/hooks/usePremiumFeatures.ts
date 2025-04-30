import { useMemo } from 'react';
import { usePurchase } from '../contexts/PurchaseContext';
import { PremiumFeatures } from '../types/purchases';

/**
 * Hook personalizzato per verificare se l'utente ha accesso alle funzionalità premium
 * @returns Un oggetto con gli stati delle funzionalità premium e una funzione per verificare l'accesso
 */
export function usePremiumFeatures() {
  const { isPremium, isAdFree, remainingFreeSessions, getPremiumFeatures, showUpgradePrompt } = usePurchase();
  
  // Memorizza le funzionalità premium per evitare ricalcoli inutili
  const features = useMemo<PremiumFeatures>(() => {
    return getPremiumFeatures();
  }, [isPremium, isAdFree, remainingFreeSessions, getPremiumFeatures]);
  
  /**
   * Verifica se l'utente ha accesso a una funzionalità e, in caso contrario, mostra un prompt di upgrade
   * @param feature La funzionalità da verificare
   * @param showPrompt Se mostrare il prompt in caso di accesso negato
   * @param source Una stringa che identifica la fonte della richiesta per i log
   * @returns true se l'utente ha accesso, false altrimenti
   */
  const checkAccess = (
    feature: keyof PremiumFeatures, 
    showPrompt: boolean = true,
    source: string = 'unknown'
  ): boolean => {
    const hasAccess = !!features[feature];
    
    if (!hasAccess && showPrompt) {
      showUpgradePrompt(feature, source);
    }
    
    return hasAccess;
  };
  
  return {
    features,
    isPremium,
    isAdFree,
    remainingFreeSessions,
    
    // Funzioni di utilità
    checkAccess,
    
    // Funzioni helper per casi d'uso specifici
    canExportData: (showPrompt = true) => checkAccess('canExportData', showPrompt, 'export'),
    canUseWidgets: (showPrompt = true) => checkAccess('canUseWidgets', showPrompt, 'widgets'),
    canUseDetailed: (showPrompt = true) => checkAccess('hasDetailedStatistics', showPrompt, 'statistics'),
    canCreateSession: () => features.canCreateUnlimitedSessions || features.remainingSessions > 0,
  };
}

export default usePremiumFeatures; 