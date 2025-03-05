/**
 * Costanti per i limiti di tasso alcolemico (BAC) in Italia
 * Valori espressi in g/L secondo l'Articolo 186 del Codice della Strada
 */

// Tasso di metabolismo dell'alcol (g/L per ora) - valore aggiornato basato su studi scientifici
// Adjusted for more accuracy based on scientific studies
export const METABOLISM_RATE = 0.015; // Most realistic value according to recent studies

// Limite legale in Italia per guidare (per conducenti standard)
export const LEGAL_DRIVING_LIMIT = 0.5;

// Limite zero per neopatentati, minori di 21 anni e conducenti professionali
export const ZERO_TOLERANCE_LIMIT = 0.0;

// Fasce di sanzione secondo l'articolo 186 del Codice della Strada
export const BAC_LIMITS = {
  // Limite per guidare (standard)
  legalLimit: 0.5,
  
  // Fascia amministrativa: 0.5-0.8 g/L
  cautionThreshold: 0.5, // Multa da 543 a 2.170€, sospensione patente 3-6 mesi
  
  // Fascia penale lieve: 0.8-1.5 g/L
  penalLowThreshold: 0.8, // Ammenda 800-3.200€, arresto fino a 6 mesi, sospensione patente 6-12 mesi
  
  // Fascia penale grave: >1.5 g/L
  penalHighThreshold: 1.5, // Ammenda 1.500-6.000€, arresto da 6 mesi a 1 anno, sospensione patente 1-2 anni
};

// Colori per le diverse fasce di BAC
export const BAC_COLORS = {
  safe: '#33CC66',      // Verde - sotto il limite legale
  caution: '#FFCC33',   // Giallo - fascia amministrativa
  warning: '#FF9933',   // Arancione - fascia penale lieve
  danger: '#FF3333',    // Rosso - fascia penale grave
  critical: '#CC3333',  // Rosso scuro - fascia critica
};

// Interfaccia per i colori BAC
export interface BacColors {
  safe: string;
  caution: string;
  warning: string;
  danger: string;
  critical: string;
}

// Funzione per ottenere il livello di pericolo BAC basato sul valore
export function getBACLevel(bac: number): 'safe' | 'caution' | 'warning' | 'danger' | 'critical' {
  // Ensure BAC is a valid non-negative number
  const validBac = isNaN(bac) || bac < 0 ? 0 : bac;
  
  if (validBac < BAC_LIMITS.cautionThreshold) return 'safe';
  if (validBac < BAC_LIMITS.penalLowThreshold) return 'caution';
  if (validBac < BAC_LIMITS.penalHighThreshold) return 'warning';
  if (validBac < 2.0) return 'danger';
  return 'critical'; // Livelli estremamente pericolosi
}

// Funzione per ottenere le informazioni sul livello BAC
export function getBACInfo(bac: number): { 
  level: 'safe' | 'caution' | 'warning' | 'danger' | 'critical',
  color: string,
  message: string,
  legalStatus: string
} {
  // Ensure BAC is a valid non-negative number
  const validBac = isNaN(bac) || bac < 0 ? 0 : bac;
  
  const level = getBACLevel(validBac);
  const color = BAC_COLORS[level];
  
  let message = '';
  let legalStatus = '';
  
  switch(level) {
    case 'safe':
      message = 'Livello sicuro per la maggior parte degli adulti.';
      legalStatus = 'Legale per guidare (conducenti standard).';
      break;
    case 'caution':
      message = 'Capacità di reazione ridotta. Non guidare.';
      legalStatus = 'Sanzione amministrativa (543-2.170€), sospensione patente 3-6 mesi.';
      break;
    case 'warning':
      message = 'Compromissione significativa delle capacità. Pericolo.';
      legalStatus = 'Reato penale. Ammenda 800-3.200€, arresto fino a 6 mesi, sospensione patente 6-12 mesi.';
      break;
    case 'danger':
      message = 'Grave compromissione. Rischio elevato.';
      legalStatus = 'Reato penale grave. Ammenda 1.500-6.000€, arresto da 6 mesi a 1 anno, sospensione patente 1-2 anni.';
      break;
    case 'critical':
      message = 'Estremamente pericoloso. Rischio di coma etilico.';
      legalStatus = 'Reato penale grave con aggravanti. Possibile revoca della patente.';
      break;
  }
  
  return { level, color, message, legalStatus };
}

// Esportiamo un componente vuoto come default per soddisfare Expo Router
export default function BACConstants() {
  return null;
} 