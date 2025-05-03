# Tracker dei problemi dell'app Bacchus

Questo file tiene traccia di tutti i problemi identificati e del loro stato di risoluzione.

## Problemi di build
- [x] Errore buildType in eas.json per iOS
- [x] Errore riferimento a immagine inesistente (logo-white.png/bacchus-logo.png)

## Problemi di UI
- [x] Ripristinare il logo originale dell'app (sostituire l'icona del calice)
- [x] Sistemare la schermata di login (ripristinare com'era prima)
- [x] Sistemare la schermata di registrazione (rimosso titolo "BACCHUS" ridondante)
- [x] Traduzioni mancanti in diverse parti dell'app
  - [x] Aggiunte traduzioni mancanti per la schermata delle impostazioni
  - [ ] Correggere i testi in inglese nella conferma di uscita dal wizard di creazione profilo

## Problemi funzionali
- [x] Crash nella sezione "Impostazioni" - risolto con la rifattorizzazione completa e aggiunta di una gestione errori robusta
- [x] Problemi di reindirizzamento dopo logout - risolto con la pulizia completa dei flag di navigazione
- [ ] Errore "errore nel salvare il profilo" quando si completa il wizard del profilo ospite e quando si registra un nuovo account
- [x] Pulsante "X" nel wizard di creazione profilo che chiede conferma in inglese ma non funziona correttamente
  - [x] Assicurarsi che il pulsante X porti all'azione corretta

## Note aggiuntive
- [x] Soluzione globale per la gestione dei flag di navigazione e reindirizzamento implementata
- [x] Aggiunta gestione sicura delle traduzioni per prevenire crash
- [ ] Verificare se ci sono problemi con gli store Redux che persistono anche dopo il logout 