# Changelog

## [Build 445] - 2024-09-XX
### Miglioramenti
- 🔧 Correzione problemi di traduzione nelle schermate dell'app
- 🛠️ Migliorato il sistema di caricamento delle traduzioni per evitare testi mancanti
- 🐛 Risolti vari problemi di crash nella schermata Impostazioni
- 🧩 Migliorata la stabilità e la robustezza del sistema di gestione temi
- 🔄 Ottimizzata l'inizializzazione dell'app per evitare schermate vuote o flash
- 💾 Sistema di caricamento risorse migliorato per evitare crash durante la navigazione

### Cambiamenti strutturali
- 🚫 Rimossa completamente la modalità ospite dall'app
- 🔒 Accesso all'app possibile solo con autenticazione completa
- 🧹 Pulizia del codice da riferimenti non più necessari
- 🔨 Risolti errori di bundling in ambiente di produzione

### Build
- ⬆️ Numero build aggiornato a 445 (da 300)
- 📝 Creato script per aggiornamento automatico del numero di build `update-build-number.sh`

### Correzioni di bug
- 🐛 Risolto il problema dell'API key di Supabase
- 🔧 Corretto l'errore che mostrava il vecchio wizard dopo la registrazione di un nuovo account
- 🛠️ Migliorate le performance delle animazioni
- 🚀 Incrementata la stabilità nell'utilizzo delle API di Supabase
- 💬 Corrette traduzioni mancanti in session, dashboard e impostazioni
- 🧠 Risolti problemi di rendering durante il primo avvio dell'app

## [Build 300] - 2024-08-XX
### Miglioramenti
- Aggiunta modalità ospite
- Aggiunto supporto multilingua (Italiano e Inglese)
- Aggiornata UI per maggiore coerenza

### Correzioni di bug
- Risolti problemi di crash durante la navigazione
- Migliorato il sistema di autenticazione
- Corretti problemi di layout su dispositivi più piccoli

## v1.2.0 (24-05-2024)

### Miglioramenti alle traduzioni

- **Sistema di fallback robusto**: Implementato un sistema di fallback per le traduzioni che garantisce coerenza tra ambiente di sviluppo e TestFlight.
- **Validatore di traduzioni**: Creato uno strumento (`build-validate.js`) che verifica e corregge automaticamente le incoerenze nelle traduzioni tra le diverse lingue.
- **Traduzioni ampliate**: Aggiunte 139 chiavi di traduzione mancanti per garantire che tutte le stringhe siano tradotte in entrambe le lingue.
- **Fallback hardcoded**: Aggiunto un sistema di fallback hardcoded per le stringhe critiche che garantisce la visualizzazione anche in caso di errori di caricamento.

### Gestione degli errori migliorata

- **ErrorBoundary migliorato**: Implementato un componente ErrorBoundary più robusto che cattura gli errori e offre opzioni di recupero.
- **Gestione dei crash**: L'app ora gestisce meglio i crash, offrendo informazioni diagnostiche (in dev) e opzioni di ripristino.
- **Gestione interruzioni**: Migliorata la resilienza durante le interruzioni di rete o errori di backend.

### Navigazione migliorata

- **Wizard profilo**: Risolti problemi che causavano loop infiniti o flash di schermate durante la creazione del profilo.
- **Prevenzione reindirizzamenti multipli**: Aggiunto un sistema di flag per prevenire navigation loop o reindirizzamenti multipli.
- **Debounce azioni**: Implementati meccanismi di debounce per prevenire azioni duplicate.

### Sistema di build migliorato

- **Build script**: Creato un processo di build automatizzato che verifica e corregge le traduzioni prima del deployment.
- **Validazione pre-build**: Le build ora includono una fase di validazione che garantisce la qualità del pacchetto.
- **Script NPM**: Aggiunti script NPM per facilitare il processo di validazione e build.

### Componenti migliorati

- **FixedFooter**: Creato un componente per un footer fisso utilizzato nel wizard e in altre parti dell'app.
- **SegmentedControl**: Implementato un componente per la selezione di opzioni in stile segmentato.
- **GradientButton**: Creato un componente per pulsanti con sfondo a gradiente.

### Inizializzazione dell'app

- **Caricamento risorse**: Migliorato il processo di caricamento delle risorse all'avvio dell'app.
- **Gestione splash screen**: Migliorata la gestione della splash screen per prevenire blocchi.
- **Caricamento lingua**: La lingua viene caricata in modo più affidabile durante l'avvio.

### Stabilità e correzioni per TestFlight

- **Miglioramento della stabilità nella schermata Sessione**
  - Corretti errori critici che causavano crash nell'app in TestFlight
  - Implementata gestione robusta degli stati nulli o non definiti
  - Migliorata la compatibilità tra ambiente di sviluppo e produzione

- **Correzioni al calcolo BAC**
  - Aggiunta gestione dei valori non validi o mancanti nel calcolo del tasso alcolemico
  - Implementate validazioni robuste per prevenire crash con valori non validi
  - Limitati i valori di BAC in intervalli di sicurezza

- **Miglioramenti all'ErrorBoundary**
  - Implementato un sistema di rilevamento avanzato per errori specifici legati alle sessioni
  - Aggiunta logica di recupero automatico per errori critici
  - Migliorata navigazione di emergenza in caso di errori non recuperabili

- **Correzioni al sistema di navigazione**
  - Risolti problemi di navigazione nelle transizioni tra schermate
  - Implementati fallback sicuri per prevenire loop di navigazione
  - Migliorata gestione delle schede quando non è presente una sessione attiva

Queste modifiche garantiscono una maggiore stabilità dell'app, soprattutto quando distribuita tramite TestFlight, risolvendo i problemi di traduzioni incoerenti, blocchi UI e reindirizzamenti infiniti che si verificavano in precedenza. 