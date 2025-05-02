# Tracker dei problemi dell'app Bacchus

Questo file tiene traccia di tutti i problemi identificati e del loro stato di risoluzione.

## Problemi di build
- [x] Errore buildType in eas.json per iOS
- [x] Errore riferimento a immagine inesistente (logo-white.png/bacchus-logo.png)

## Problemi di UI
- [x] Ripristinare il logo originale dell'app (sostituire l'icona del calice)
- [x] Sistemare la schermata di login (ripristinare com'era prima)
- [x] Sistemare la schermata di registrazione (rimosso titolo "BACCHUS" ridondante)
- [ ] Traduzioni mancanti in diverse parti dell'app
  - [ ] Identificare e correggere i testi in inglese nella conferma di uscita dal wizard di creazione profilo
  - [ ] Aggiunte traduzioni mancanti nel file di traduzione inglese per il profilo

## Problemi funzionali
- [ ] Crash nella sezione "Impostazioni" - probabilmente correlato alle traduzioni mancanti o a problemi con Switch
- [ ] Problemi di reindirizzamento dopo logout (i flag di navigazione persistono) - serve una soluzione più completa
- [ ] Errore "errore nel salvare il profilo" quando si completa il wizard del profilo ospite e quando si registra un nuovo account
- [x] Pulsante "X" nel wizard di creazione profilo che chiede conferma in inglese ma non funziona correttamente
  - [x] Assicurarsi che il pulsante X porti all'azione corretta

## Note aggiuntive
- Serve una soluzione globale per la gestione dei flag di navigazione e reindirizzamento
- Verificare se ci sono problemi con gli store Redux che persistono anche dopo il logout 