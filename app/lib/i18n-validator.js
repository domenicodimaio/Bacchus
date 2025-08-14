/**
 * Validatore di traduzioni
 * 
 * Questo script verifica la coerenza delle traduzioni tra le lingue supportate.
 * - Controlla che tutte le chiavi presenti in una lingua siano presenti anche nell'altra
 * - Verifica che le traduzioni siano definite correttamente
 */

const fs = require('fs');
const path = require('path');

const SUPPORTED_LANGUAGES = ['it', 'en'];
const NAMESPACES = ['common', 'auth', 'dashboard', 'profile', 'session', 'settings', 'purchases'];

// Funzione per leggere un file di traduzione
function readTranslationFile(language, namespace) {
  try {
    const filePath = path.join(__dirname, '../locales', language, `${namespace}.json`);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Errore nel leggere ${language}/${namespace}.json:`, error.message);
    return null;
  }
}

// Funzione per verificare le chiavi mancanti tra due oggetti di traduzione
function findMissingKeys(source, target, prefix = '') {
  const missingKeys = [];

  Object.keys(source).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    // Se la chiave non esiste nell'oggetto target
    if (!(key in target)) {
      missingKeys.push(fullKey);
    }
    // Se entrambi sono oggetti (non array), controlla ricorsivamente
    else if (
      typeof source[key] === 'object' && 
      source[key] !== null && 
      !Array.isArray(source[key]) &&
      typeof target[key] === 'object' && 
      target[key] !== null && 
      !Array.isArray(target[key])
    ) {
      missingKeys.push(...findMissingKeys(source[key], target[key], fullKey));
    }
  });

  return missingKeys;
}

// Funzione principale per validare tutte le traduzioni
function validateTranslations() {
  console.log('Validazione delle traduzioni...');
  
  let hasErrors = false;
  const errorsPerNamespace = {};

  // Per ogni namespace
  NAMESPACES.forEach(namespace => {
    console.log(`\nValidazione namespace: ${namespace}`);
    errorsPerNamespace[namespace] = { missing: {} };
    
    // Carica tutte le traduzioni per questo namespace
    const translations = {};
    SUPPORTED_LANGUAGES.forEach(lang => {
      translations[lang] = readTranslationFile(lang, namespace);
    });
    
    // Salta il namespace se manca una traduzione
    if (Object.values(translations).some(t => t === null)) {
      console.log(`  - Impossibile validare ${namespace}, file mancante`);
      hasErrors = true;
      return;
    }
    
    // Confronta ogni lingua con ogni altra
    SUPPORTED_LANGUAGES.forEach(sourceLang => {
      SUPPORTED_LANGUAGES.filter(l => l !== sourceLang).forEach(targetLang => {
        const missingKeys = findMissingKeys(translations[sourceLang], translations[targetLang]);
        
        if (missingKeys.length > 0) {
          hasErrors = true;
          errorsPerNamespace[namespace].missing[`${sourceLang}->${targetLang}`] = missingKeys;
          console.log(`  - Chiavi presenti in ${sourceLang} ma mancanti in ${targetLang}: ${missingKeys.length}`);
        }
      });
    });
  });

  console.log('\nRiepilogo della validazione:');
  if (hasErrors) {
    console.log('❌ Sono stati trovati errori nelle traduzioni!');
    
    Object.entries(errorsPerNamespace).forEach(([namespace, errors]) => {
      if (Object.keys(errors.missing).length > 0) {
        console.log(`\nNamespace: ${namespace}`);
        
        Object.entries(errors.missing).forEach(([langPair, missingKeys]) => {
          if (missingKeys.length > 0) {
            const [sourceLang, targetLang] = langPair.split('->');
            console.log(`  - ${missingKeys.length} chiavi presenti in ${sourceLang} mancano in ${targetLang}:`);
            missingKeys.forEach(key => {
              console.log(`    - ${key}`);
            });
          }
        });
      }
    });
    
    console.log('\nSuggerimento: assicurati che tutte le chiavi siano presenti in tutte le lingue.');
  } else {
    console.log('✅ Tutte le traduzioni sono coerenti!');
  }
}

// Esegue la validazione
validateTranslations(); 