/**
 * Funzioni di utilità per la manipolazione dei colori
 */

/**
 * Converte un colore esadecimale in RGBA con opacità specificata
 * @param hex Colore esadecimale in formato #RRGGBB o #RGB
 * @param opacity Valore di opacità da 0 a 1
 * @returns Stringa RGBA
 */
export function hexToRGBA(hex: string, opacity: number): string {
  // Rimuovi il carattere # se presente
  hex = hex.replace('#', '');
  
  // Gestisci sia il formato #RGB che #RRGGBB
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  
  // Assicurati che opacity sia tra 0 e 1
  opacity = Math.max(0, Math.min(1, opacity));
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Genera un colore casuale in formato HEX
 * @returns Stringa colore esadecimale
 */
export function generateRandomColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

/**
 * Verifica se un colore è scuro
 * @param hex Colore esadecimale
 * @returns true se il colore è scuro
 */
export function isDarkColor(hex: string): boolean {
  // Rimuovi il carattere # se presente
  hex = hex.replace('#', '');
  
  // Gestisci sia il formato #RGB che #RRGGBB
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  
  // Calcola la luminosità percepita (formula YIQ)
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Se la luminosità è inferiore a 128, il colore è considerato scuro
  return luminance < 128;
} 