# Preparazione e Pubblicazione di Bacchus negli App Store

Questo documento elenca tutti i passaggi necessari per completare la configurazione e pubblicare l'app Bacchus sia su App Store che su Google Play Store.

## Riepilogo Stato Attuale
- **Autenticazione Apple**: 2/3 passaggi completati (67%)
- **Configurazione Localizzazione**: 2/2 passaggi completati (100%)
- **Acquisti In-App**: 0/7 passaggi completati (0%)
- **Pubblicazione su App Store**: 2/8 passaggi completati (25%)
- **Pubblicazione su Google Play**: 2/8 passaggi completati (25%)
- **Funzionalità specifiche iOS**: 1/4 passaggi completati (25%)
- **Funzionalità specifiche Android**: 0/2 passaggi completati (0%)
- **Marketing e Visibilità**: 0/3 passaggi completati (0%)
- **Monitoraggio post-lancio**: 0/3 passaggi completati (0%)

**Completamento totale**: 9/40 passaggi (22.5%)

## Prerequisiti Generali
- [ ] Account sviluppatore Apple ($99/anno) - In attesa di approvazione
- [ ] Account sviluppatore Google Play ($25 una tantum) - Da registrare
- [ ] Xcode installato per la build iOS
- [ ] Android Studio installato per la build Android

## Autenticazione Apple
- [ ] Completare la configurazione "Sign in with Apple":
  - [X] Aggiungere l'entitlement `com.apple.developer.applesignin` nel file `ios/AlcolTest/AlcolTest.entitlements`
  - [ ] Configurare "Sign in with Apple" nel portale Apple Developer
  - [X] Implementare l'autenticazione Apple utilizzando `@invertase/react-native-apple-authentication` (già installato)

## Configurazione Localizzazione
- [X] Italiano come lingua predefinita per gli utenti in Italia
- [X] Inglese come lingua predefinita per tutti gli altri paesi

## Acquisti In-App
- [ ] Configurare i prodotti in App Store Connect:
  - [ ] Abbonamento mensile (`com.bacchus.app.premium.monthly`)
  - [ ] Abbonamento annuale (`com.bacchus.app.premium.yearly`)
  - [ ] Acquisto una tantum per rimozione pubblicità (`com.bacchus.app.removeads`) 
- [ ] Configurare i prodotti sulla Google Play Console:
  - [ ] Abbonamento mensile (`com.bacchus.app.premium.monthly`)
  - [ ] Abbonamento annuale (`com.bacchus.app.premium.yearly`)
  - [ ] Acquisto una tantum per rimozione pubblicità (`com.bacchus.app.removeads`)
- [ ] Testare gli acquisti in modalità Sandbox (iOS) e Test (Android)

## Pubblicazione su App Store
- [ ] Completare le informazioni dell'app in App Store Connect:
  - [ ] Schede prodotto (screenshot, descrizione, parole chiave)
  - [ ] Informazioni sulla privacy
  - [ ] Classificazione età
- [ ] Preparare la build per TestFlight:
  - [X] Aggiornare versione e build number in `app.json`
  - [X] Configurare `eas.json` per il build di produzione
  - [ ] Eseguire `eas build --platform ios --profile production`
  - [ ] Testare su TestFlight prima del rilascio pubblico
- [ ] Inviare per revisione Apple

## Pubblicazione su Google Play
- [ ] Configurare la console Google Play:
  - [ ] Schede prodotto (screenshot, descrizione, parole chiave) 
  - [ ] Informazioni sulla privacy
  - [ ] Classificazione contenuti
- [ ] Preparare la build:
  - [X] Aggiornare versione e versionCode in `app.json`
  - [X] Configurare `eas.json` per il build di produzione
  - [ ] Eseguire `eas build --platform android --profile production`
  - [ ] Testare con un track interno/alfa
- [ ] Pubblicare sul track beta/produzione

## Funzionalità specifiche iOS
- [X] Script di configurazione per i widget già presenti nel progetto (`scripts/setup-widgets.js`)
- [ ] Implementare i widget per iOS (eseguire `npm run setup-widgets` dopo expo prebuild)
- [ ] Configurare le Live Activities
- [ ] Verificare l'integrazione con Apple Health (se applicabile)

## Funzionalità specifiche Android
- [ ] Ottimizzare per diversi formati di schermo
- [ ] Verificare il funzionamento su vari dispositivi Android

## Marketing e Visibilità
- [ ] Preparare un sito web per l'app
- [ ] Configurare canali social per promozione
- [ ] Considerare campagne di marketing mirate

## Monitoraggio post-lancio
- [ ] Implementare analisi degli utilizzi (Firebase, Amplitude, ecc.)
- [ ] Configurare sistema di segnalazione crash
- [ ] Pianificare aggiornamenti regolari

## Prossimi Passi
1. Completare la registrazione agli account sviluppatore Apple e Google
2. Configurare "Sign in with Apple" nel portale Apple Developer
3. Preparare le informazioni e gli asset per le schede prodotto
4. Configurare i prodotti in-app negli store 