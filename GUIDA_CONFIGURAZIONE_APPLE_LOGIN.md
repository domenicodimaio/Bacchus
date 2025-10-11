# Guida Configurazione Apple Sign In

## Problema Attuale
L'app mostra l'errore "Accesso fallito, errore durante l'accesso con Apple" quando si tenta di usare il login con Apple.

## Configurazione App Store Connect

### 1. Configurazione App ID
1. Vai su [Apple Developer Portal](https://developer.apple.com/account/)
2. Vai su **Certificates, Identifiers & Profiles**
3. Seleziona **Identifiers** → **App IDs**
4. Trova il tuo App ID (dovrebbe essere qualcosa come `com.tuodominio.bacchus`)
5. Clicca su **Edit** o **Configure**
6. Nella sezione **Capabilities**, assicurati che **Sign In with Apple** sia **ABILITATO**
7. Clicca **Save**

### 2. Configurazione Services ID (per web/redirect)
1. Sempre in **Identifiers**, clicca il **+** per creare un nuovo identifier
2. Seleziona **Services IDs** e clicca **Continue**
3. Inserisci:
   - **Description**: `Bacchus Apple Sign In Service`
   - **Identifier**: `com.bacchus.signin` (deve essere diverso dall'App ID)
   - ⚠️ **NOTA**: Senza dominio personalizzato, puoi usare `com.bacchus.signin` - è perfettamente valido!
4. Clicca **Continue** e **Register**
5. Seleziona il Services ID appena creato
6. Abilita **Sign In with Apple**
7. Clicca **Configure** accanto a "Sign In with Apple"
8. Configura:
   - **Primary App ID**: Seleziona il tuo App ID principale
   - **Domains and Subdomains**: Aggiungi il dominio Supabase: `tuoprogetto.supabase.co`
   - **Return URLs**: Aggiungi: `https://tuoprogetto.supabase.co/auth/v1/callback`
9. Clicca **Save** e **Continue**

**💡 Suggerimento per Services ID senza dominio:**
Il Services ID può essere qualsiasi identificatore unico in formato reverse-domain. Non è necessario possedere il dominio! Esempi validi:
- `com.bacchus.signin` ✅
- `com.yourname.bacchus.auth` ✅  
- `app.bacchus.apple.signin` ✅

### 3. Generazione Private Key
1. Vai su **Keys** nel menu laterale
2. Clicca il **+** per creare una nuova key
3. Inserisci un nome: `Bacchus Apple Sign In Key`
4. Abilita **Sign In with Apple**
5. Clicca **Configure** e seleziona il tuo Primary App ID
6. Clicca **Save**, **Continue**, **Register**
7. **IMPORTANTE**: Scarica la chiave `.p8` - non potrai scaricarla di nuovo!
8. Annota il **Key ID** (es: `ABC123DEF4`)

## Configurazione Supabase

### 1. Configurazione Provider Apple
1. Vai nel tuo progetto Supabase
2. Vai su **Authentication** → **Providers**
3. Trova **Apple** e clicca **Configure**
4. Abilita **Apple enabled**
5. Inserisci i seguenti campi:

**Client ID (OAuth):**
- Inserisci il **Services ID** creato sopra (es: `com.bacchus.signin`)
- ⚠️ **NOTA**: Senza dominio personalizzato, puoi usare `com.bacchus.signin` - va benissimo!

**Secret Key (for OAuth):**
- Qui devi inserire una **chiave JWT generata**, NON il contenuto del file `.p8` direttamente
- Vedi la sezione "Generazione Secret Key JWT" qui sotto per i dettagli

**Campi aggiuntivi (se richiesti):**
- **Key ID**: Il Key ID annotato sopra (es: `ABC123DEF4`)
- **Team ID**: Il tuo Team ID Apple (lo trovi in alto a destra nel Developer Portal)

6. Clicca **Save**

### 1.1. Generazione Secret Key JWT (IMPORTANTE!)
Supabase richiede una chiave JWT, non il file `.p8` diretto. Hai due opzioni:

**Opzione A - Generatore Online (Più Semplice):**
1. Vai su [jwt.io](https://jwt.io/)
2. Nella sezione "Payload", inserisci:
```json
{
  "iss": "79P6XEQFGB",
  "iat": 1234567890,
  "exp": 1234567890,
  "aud": "https://appleid.apple.com",
  "sub": "com.bacchus.signin"
}
```
3. Sostituisci `IL_TUO_TEAM_ID` con il tuo Team ID Apple
4. Nella sezione "Verify Signature", seleziona **ES256**
5. Incolla il contenuto del file `.p8` nel campo "Private Key"
6. Copia il JWT generato e usalo come "Secret Key" in Supabase

**Opzione B - Lascia che Supabase generi automaticamente:**
Alcuni progetti Supabase più recenti generano automaticamente il JWT se fornisci:
- Team ID
- Key ID  
- Il contenuto del file `.p8` in un campo separato

Se vedi questi campi separati, usali invece del JWT manuale.

### 2. Configurazione URL di Callback
1. Sempre in **Authentication** → **Settings**

**Site URL:**
- Supabase dovrebbe mostrare automaticamente `bacchus://auth-callback` 
- ✅ **Lascialo così com'è!** È corretto per un'app mobile
- Questo è il deep link della tua app, non un URL web

**Redirect URLs:**
Per evitare redirect esterni indesiderati, configura solo:
- `https://tuoprogetto.supabase.co/auth/v1/callback` (necessario per il backend)
- `bacchus://auth-callback` (per tornare alla tua app)

⚠️ **IMPORTANTE - Evitare Redirect Esterni:**
- NON aggiungere URL web come `https://myapp.com/callback`
- Il login Apple dovrebbe rimanere nativo nell'app
- Il flusso corretto è: App → Apple Sign In nativo → Ritorno diretto all'app

**🔄 Flusso di Autenticazione Corretto:**
1. Utente tocca "Sign in with Apple" nell'app
2. Si apre il popup nativo Apple (rimane nell'app)
3. Utente inserisce credenziali Apple
4. Apple restituisce token direttamente all'app
5. App invia token a Supabase per validazione
6. Utente rimane nell'app - nessun browser esterno!

## Configurazione App React Native

### 1. Verifica Bundle ID e Deep Linking
Nel file `app.config.js`, assicurati che il `bundleIdentifier` corrisponda esattamente all'App ID configurato:

```javascript
export default {
  expo: {
    // ...
    scheme: "bacchus", // Deve corrispondere al Site URL in Supabase
    ios: {
      bundleIdentifier: "com.tuodominio.bacchus", // Deve corrispondere all'App ID
      // ...
    }
  }
}
```

**Verifica Deep Link:**
- Il `scheme: "bacchus"` nell'app.config.js deve corrispondere al Site URL `bacchus://auth-callback` in Supabase
- Questo permette all'app di ricevere il callback di autenticazione

### 2. Verifica Configurazione Supabase
Nel file `app/lib/supabase/client.ts`, verifica che l'URL e la chiave siano corretti:

```typescript
const supabaseUrl = 'https://tuoprogetto.supabase.co'
const supabaseAnonKey = 'la-tua-chiave-anonima'
```

### 3. Verifica Dipendenze
Assicurati che le dipendenze per Apple Sign In siano installate:

```bash
npx expo install expo-apple-authentication
```

## Test e Debug

### 1. Test su Dispositivo Fisico
⚠️ **IMPORTANTE**: Apple Sign In funziona SOLO su dispositivi fisici iOS, non su simulatore!

### 2. Verifica Account Apple
- Assicurati di essere loggato con un Apple ID valido sul dispositivo
- L'Apple ID deve avere l'autenticazione a due fattori abilitata

### 3. Debug Logs
Controlla i log dell'app per errori specifici. I log dovrebbero mostrare:
- `🍎 AUTH: Apple Sign In disponibile: true`
- `🍎 AUTH: Richiesta credenziali Apple...`
- `🍎 AUTH: Inviando token a Supabase...`

### 4. Errori Comuni

#### "Apple Sign In non disponibile"
- Stai testando su simulatore → Usa dispositivo fisico
- Apple Sign In non abilitato nell'App ID → Segui punto 1 sopra

#### "Invalid client_id"
- Services ID non configurato correttamente → Segui punto 2 sopra
- Bundle ID non corrisponde → Verifica punto 1 configurazione app

#### "Invalid key"
- Chiave privata `.p8` non corretta → Rigenera la chiave
- Key ID errato → Verifica il Key ID nel Developer Portal

#### "Invalid redirect_uri"
- URL di callback non configurato → Segui configurazione Supabase
- Dominio non autorizzato → Aggiungi il dominio Supabase nel Services ID

#### "Invalid JWT" o "Invalid Secret Key"
- JWT malformato → Rigenera il JWT su jwt.io con i parametri corretti
- Timestamp errati nel JWT → Usa timestamp correnti per `iat` e `exp`
- Algoritmo errato → Assicurati di usare **ES256**, non RS256 o HS256
- File `.p8` corrotto → Scarica di nuovo la chiave privata da Apple Developer

#### "Client ID mismatch"
- Services ID errato in Supabase → Deve corrispondere esattamente a quello creato in Apple Developer
- Spazi extra nel Client ID → Verifica che non ci siano spazi prima/dopo l'ID

## Checklist Finale

- [ ] App ID ha Sign In with Apple abilitato
- [ ] Services ID creato e configurato con dominio Supabase
- [ ] Chiave privata `.p8` generata e scaricata
- [ ] Supabase configurato con Services ID, chiave, Key ID e Team ID
- [ ] Bundle ID nell'app corrisponde all'App ID
- [ ] URL Supabase e chiave corretti nell'app
- [ ] Test su dispositivo fisico iOS (non simulatore)
- [ ] Apple ID con 2FA abilitato sul dispositivo

## Supporto
Se dopo aver seguito tutti questi passaggi il problema persiste, controlla:
1. I log dettagliati dell'app
2. I log di Supabase nella sezione Logs
3. Che tutti gli ID e le chiavi siano stati copiati correttamente (senza spazi extra)

Il login con Apple è complesso da configurare, ma seguendo questa guida passo-passo dovrebbe funzionare correttamente.
