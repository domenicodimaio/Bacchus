# Bugfix TestFlight e Ambiente di Produzione

Questo documento descrive le soluzioni implementate per risolvere i problemi che si manifestano in TestFlight o in produzione ma non nell'ambiente di sviluppo locale.

## Problemi riscontrati

1. **Traduzioni mancanti o errate in TestFlight**
   - In TestFlight, alcune traduzioni non venivano caricate correttamente
   - Il sistema i18n non gestiva correttamente il fallback per le chiavi mancanti

2. **Crash nella schermata Impostazioni**
   - In TestFlight, la schermata Impostazioni causava crash dell'app
   - Il problema era legato al caricamento asincrono dei bundle in produzione

3. **Login con Apple che non funziona**
   - Gli URL di redirect e gli schemi URL non erano gestiti correttamente tra dev e prod
   - Le verifiche di disponibilità del servizio non erano robuste

## Soluzioni implementate

### 1. Configurazione centralizzata

È stato creato un modulo di configurazione centralizzato (`app/lib/config.ts`) che gestisce le differenze tra ambiente di sviluppo e produzione:

- Rilevamento corretto dell'ambiente (dev/TestFlight/produzione)
- Gestione unificata dei bundle ID
- Configurazione coerente degli URL di callback OAuth
- Strategie di fallback per traduzioni mancanti

```typescript
// Esempio di utilizzo
import config from '../lib/config';

// Verifica se siamo in produzione
if (config.isProduction) {
  // Logica specifica per produzione
}

// Ottieni URL di reindirizzamento configurati correttamente
const redirectUrl = config.getRedirectUrl('apple');
```

### 2. Sistema di traduzione robusto

Il sistema i18n è stato migliorato per:

- Validare le risorse di traduzione all'avvio
- Aggiungere traduzioni di fallback statiche per i termini più importanti
- Gestire diversamente gli errori di traduzione tra dev e prod
- Migliorare il log delle chiavi mancanti

### 3. Bundle ID uniformi

Abbiamo uniformato i bundle ID tra iOS e Android per:

- Garantire che gli schemi URL siano consistenti
- Evitare problemi con i deep link
- Migliorare la compatibilità delle librerie di autenticazione

### 4. Gestione robusta degli errori

Abbiamo migliorato la gestione degli errori per:

- Mostrare messaggi utente appropriati in caso di errore
- Evitare crash dell'app in produzione
- Fornire log dettagliati per il debugging

### 5. Login Apple più affidabile

Per il login con Apple:

- Utilizziamo sia `expo-apple-authentication` che `@invertase/react-native-apple-authentication` con fallback
- Gestiamo correttamente gli URL di reindirizzamento 
- Miglioriamo la gestione degli errori durante il processo di autenticazione

## Differenze fondamentali tra sviluppo e produzione

1. **Caricamento dei bundle**: 
   - In sviluppo: caricamento sincrono, in-memory
   - In produzione: caricamento asincrono, distribuito

2. **Gestione degli errori**:
   - In sviluppo: crash immediato con stack trace completo
   - In produzione: necessità di gestire tutti gli errori per evitare crash

3. **Percorsi di file**:
   - In sviluppo: percorsi relativi funzionano sempre
   - In produzione: i percorsi possono cambiare e richiedono una gestione speciale

4. **Schemi URL**:
   - In sviluppo: schemi semplificati funzionano
   - In produzione: necessità di schemi URL completi con bundle ID

## Considerazioni per il futuro

1. **Test di integrazione**:
   - Aggiungere test che simulano l'ambiente di produzione
   - Verificare che i bundle siano caricati correttamente

2. **Monitoraggio degli errori**:
   - Implementare un sistema di monitoraggio degli errori remoto
   - Catturare e analizzare gli errori che si verificano solo in produzione

3. **Modalità di pre-prod**:
   - Implementare una modalità che simula il comportamento di produzione ma in ambiente di sviluppo
   - Utile per testare le ottimizzazioni e i fallback 