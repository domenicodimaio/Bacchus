/**
 * Script di validazione pre-build
 * 
 * Questo script esegue controlli di validazione prima della build per assicurare 
 * che non ci siano problemi con le traduzioni o altri elementi critici
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurazione
const SUPPORTED_LANGUAGES = ['it', 'en'];
const NAMESPACES = ['common', 'auth', 'dashboard', 'profile', 'session', 'settings', 'purchases'];
const LOCALES_DIR = path.join(__dirname, 'app', 'locales');
const IS_PRODUCTION_BUILD = process.argv.includes('--production');

console.log(`🛠️  Avvio validazione pre-build${IS_PRODUCTION_BUILD ? ' (PRODUZIONE)' : ''}`);

// Funzione per leggere un file di traduzione
function readTranslationFile(language, namespace) {
  try {
    const filePath = path.join(LOCALES_DIR, language, `${namespace}.json`);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`❌ Errore nel leggere ${language}/${namespace}.json:`, error.message);
    return null;
  }
}

// Funzione per scrivere un file di traduzione
function writeTranslationFile(language, namespace, data) {
  try {
    const filePath = path.join(LOCALES_DIR, language, `${namespace}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ Errore nello scrivere ${language}/${namespace}.json:`, error.message);
    return false;
  }
}

// Funzione per verificare le chiavi mancanti tra due oggetti di traduzione
function findMissingKeys(source, target, prefix = '') {
  const missingKeys = [];

  Object.keys(source).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    // Se la chiave non esiste nell'oggetto target
    if (!(key in target)) {
      missingKeys.push({ fullKey, key, value: source[key] });
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
  console.log('🔍 Validazione delle traduzioni...');
  
  let hasErrors = false;
  let fixedErrors = 0;
  const errorsPerNamespace = {};

  // Per ogni namespace
  NAMESPACES.forEach(namespace => {
    console.log(`\n📂 Validazione namespace: ${namespace}`);
    errorsPerNamespace[namespace] = { missing: {} };
    
    // Carica tutte le traduzioni per questo namespace
    const translations = {};
    SUPPORTED_LANGUAGES.forEach(lang => {
      translations[lang] = readTranslationFile(lang, namespace);
    });
    
    // Salta il namespace se manca una traduzione
    if (Object.values(translations).some(t => t === null)) {
      console.log(`  ⚠️ Impossibile validare ${namespace}, file mancante`);
      hasErrors = true;
      return;
    }
    
    // Confronta ogni lingua con ogni altra
    let changesMade = false;
    
    SUPPORTED_LANGUAGES.forEach(sourceLang => {
      SUPPORTED_LANGUAGES.filter(l => l !== sourceLang).forEach(targetLang => {
        const missingKeys = findMissingKeys(translations[sourceLang], translations[targetLang]);
        
        if (missingKeys.length > 0) {
          hasErrors = true;
          errorsPerNamespace[namespace].missing[`${sourceLang}->${targetLang}`] = missingKeys;
          console.log(`  ❓ Chiavi presenti in ${sourceLang} ma mancanti in ${targetLang}: ${missingKeys.length}`);
          
          // In produzione, correggi automaticamente aggiungendo le chiavi mancanti
          if (IS_PRODUCTION_BUILD) {
            // Copia le chiavi mancanti dall'origine alla destinazione
            missingKeys.forEach(({ key, fullKey, value }) => {
              if (fullKey.includes('.')) {
                // Gestisci chiavi nidificate (questa è una semplificazione)
                const parts = fullKey.split('.');
                let current = translations[targetLang];
                for (let i = 0; i < parts.length - 1; i++) {
                  if (!current[parts[i]]) current[parts[i]] = {};
                  current = current[parts[i]];
                }
                current[parts[parts.length - 1]] = value;
              } else {
                // Chiavi di primo livello
                translations[targetLang][key] = value;
              }
              fixedErrors++;
            });
            
            // Scrivi il file aggiornato
            if (writeTranslationFile(targetLang, namespace, translations[targetLang])) {
              console.log(`  ✅ Aggiunte ${missingKeys.length} chiavi mancanti a ${targetLang}/${namespace}.json`);
              changesMade = true;
            }
          }
        }
      });
    });
    
    if (changesMade) {
      console.log(`  🔄 File del namespace ${namespace} aggiornati con successo`);
    }
  });

  console.log('\n📊 Riepilogo della validazione:');
  if (hasErrors) {
    if (IS_PRODUCTION_BUILD && fixedErrors > 0) {
      console.log(`✅ Corretti automaticamente ${fixedErrors} problemi di traduzione!`);
    } else {
      console.log('❌ Sono stati trovati errori nelle traduzioni!');
      
      if (!IS_PRODUCTION_BUILD) {
        console.log('\n⚠️ Per risolvere automaticamente i problemi, esegui con --production');
      }
      
      Object.entries(errorsPerNamespace).forEach(([namespace, errors]) => {
        if (Object.keys(errors.missing).length > 0) {
          console.log(`\nNamespace: ${namespace}`);
          
          Object.entries(errors.missing).forEach(([langPair, missingKeys]) => {
            if (missingKeys.length > 0) {
              const [sourceLang, targetLang] = langPair.split('->');
              console.log(`  - ${missingKeys.length} chiavi presenti in ${sourceLang} mancano in ${targetLang}`);
            }
          });
        }
      });
    }
  } else {
    console.log('✅ Tutte le traduzioni sono coerenti!');
  }
  
  return { hasErrors, fixedErrors };
}

// Funzione per eseguire la build EAS
function runEasBuild(platform = 'ios', profile = 'production') {
  try {
    console.log(`\n🚀 Avvio build EAS per ${platform} con profilo ${profile}...`);
    
    // Comando di build
    const buildCommand = `eas build --platform ${platform} --profile ${profile} --non-interactive`;
    
    // Esegui il comando
    execSync(buildCommand, { stdio: 'inherit' });
    
    console.log(`\n✅ Build completata con successo per ${platform}!`);
    return true;
  } catch (error) {
    console.error(`\n❌ Errore durante la build per ${platform}:`, error);
    return false;
  }
}

// Funzione principale
async function main() {
  try {
    // Validazione traduzioni
    const { hasErrors, fixedErrors } = validateTranslations();
    
    // Se ci sono errori in modalità non-produzione, esci
    if (hasErrors && !IS_PRODUCTION_BUILD && fixedErrors === 0) {
      console.error('\n❌ Ci sono errori nelle traduzioni. Correggili prima di procedere con la build.');
      process.exit(1);
    }
    
    // In produzione, procedi con la build anche se ci sono stati errori corretti
    if (IS_PRODUCTION_BUILD) {
      console.log('\n🔄 Preparazione alla build in modalità PRODUZIONE...');
      
      // Esegui la build iOS
      const iosBuildSuccess = runEasBuild('ios', 'production');
      
      // Se iOS ha avuto successo e vogliamo fare anche Android
      if (iosBuildSuccess && process.argv.includes('--android')) {
        runEasBuild('android', 'production');
      }
    } else {
      console.log('\n✅ Validazione completata. Esegui con --production per avviare la build.');
    }
    
  } catch (error) {
    console.error('\n❌ Errore imprevisto:', error);
    process.exit(1);
  }
}

// Esegui lo script
main().catch(err => {
  console.error('Errore fatale:', err);
  process.exit(1);
}); 