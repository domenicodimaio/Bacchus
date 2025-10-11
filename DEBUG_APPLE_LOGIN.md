# 🔍 Debug Apple Sign In - Checklist Diagnostica

## Passo 1: Verifica i Log dell'App

Quando provi il login con Apple, controlla i log della console per vedere esattamente dove si blocca:

### Log da Cercare (in ordine):
```
🍎 AUTH: Avvio autenticazione con apple...
🍎 AUTH: Iniziando processo Apple Sign In...
🍎 AUTH: Apple Sign In disponibile: true
🍎 AUTH: Richiesta credenziali Apple...
🍎 AUTH: Credenziali Apple ricevute: { user: ..., email: ..., hasIdentityToken: true }
🍎 AUTH: Inviando token a Supabase per autenticazione...
🍎 AUTH: Risposta Supabase: { hasUser: true, hasSession: true, userId: ... }
```

### ❌ Se vedi questo errore:
- `Apple Sign In disponibile: false` → Stai usando simulatore (usa dispositivo fisico)
- `ERR_REQUEST_CANCELED` → Hai annullato il login
- `ERR_REQUEST_NOT_HANDLED` → Configurazione Apple Developer sbagliata
- `Invalid client_id` → Services ID errato in Supabase
- `Invalid JWT` → Secret Key JWT malformata

## Passo 2: Verifica Configurazione Apple Developer

### Checklist Apple Developer Portal:
- [ ] **App ID** ha "Sign In with Apple" abilitato
- [ ] **Services ID** creato con identificatore `com.bacchus.signin`
- [ ] **Services ID** ha "Sign In with Apple" configurato
- [ ] **Primary App ID** selezionato nel Services ID
- [ ] **Dominio Supabase** aggiunto: `tuoprogetto.supabase.co`
- [ ] **Return URL** aggiunto: `https://tuoprogetto.supabase.co/auth/v1/callback`
- [ ] **Chiave privata .p8** scaricata e Key ID annotato

## Passo 3: Verifica Configurazione Supabase

### Vai su Supabase → Authentication → Providers → Apple:
- [ ] **Apple enabled** = ✅ Abilitato
- [ ] **Client ID** = `com.bacchus.signin` (esatto, senza spazi)
- [ ] **Secret Key** = JWT generato correttamente (vedi sotto)

### Verifica JWT Secret Key:
Il JWT deve avere questa struttura:
```json
{
  "iss": "79P6XEQFGB",  // Il tuo Team ID
  "iat": 1640995200,    // Timestamp corrente
  "exp": 1956355200,    // Timestamp futuro (es: 2032)
  "aud": "https://appleid.apple.com",
  "sub": "com.bacchus.signin"  // Il tuo Services ID
}
```

**🔧 Rigenera JWT se necessario:**
1. Vai su [jwt.io](https://jwt.io/)
2. Seleziona algoritmo **ES256**
3. Inserisci il payload sopra con i tuoi dati
4. Incolla il contenuto del file `.p8` nel campo "Private Key"
5. Copia il JWT e aggiornalo in Supabase

## Passo 4: Verifica Configurazione App

### Nel file `app.config.js`:
```javascript
export default {
  expo: {
    scheme: "bacchus",  // ← Deve corrispondere al Site URL
    ios: {
      bundleIdentifier: "com.tuodominio.bacchus"  // ← Deve corrispondere all'App ID
    }
  }
}
```

### Nel file `app/lib/supabase/client.ts`:
- [ ] URL Supabase corretto
- [ ] Chiave anonima corretta

## Passo 5: Test Sistematico

### 1. Test Base
- [ ] Stai testando su **dispositivo fisico iOS** (non simulatore)
- [ ] Sei loggato con un **Apple ID valido** sul dispositivo
- [ ] L'Apple ID ha **autenticazione a due fattori** abilitata

### 2. Test Connessione
Prova prima un login normale (email/password) per verificare che Supabase funzioni.

### 3. Test Apple Sign In
1. Tocca "Sign in with Apple"
2. **Controlla i log** - dove si ferma?
3. Se si apre il popup Apple, inserisci le credenziali
4. **Controlla di nuovo i log** dopo l'inserimento

## Passo 6: Errori Comuni e Soluzioni

### "Apple Sign In non disponibile"
```bash
# Soluzione: Usa dispositivo fisico
# Il simulatore iOS non supporta Apple Sign In
```

### "Invalid client_id"
```bash
# Problema: Services ID errato in Supabase
# Soluzione: Verifica che sia esattamente "com.bacchus.signin"
```

### "Invalid JWT" / "Invalid Secret Key"
```bash
# Problema: JWT malformato
# Soluzione: Rigenera il JWT su jwt.io con i parametri corretti
```

### "ERR_REQUEST_NOT_HANDLED"
```bash
# Problema: Configurazione Apple Developer incompleta
# Soluzione: Verifica che tutti i passaggi Apple Developer siano completati
```

### Login si apre ma poi fallisce
```bash
# Problema: Configurazione Supabase
# Soluzione: Verifica URL di callback e configurazione provider
```

## Passo 7: Debug Avanzato

Se il problema persiste, aggiungi questo codice temporaneo nel file `app/lib/services/auth.service.ts` alla riga 451:

```typescript
console.log('🍎 AUTH: Credenziali Apple ricevute:', {
  user: credential.user,
  email: credential.email,
  hasIdentityToken: !!credential.identityToken,
  hasAuthorizationCode: !!credential.authorizationCode,
  fullName: credential.fullName,
  identityTokenPreview: credential.identityToken?.substring(0, 50) + '...'
});
```

Questo ti mostrerà esattamente cosa ricevi da Apple.

## 🆘 Se Niente Funziona

1. **Cancella e ricrea** il Services ID in Apple Developer
2. **Rigenera** la chiave privata .p8
3. **Riconfigura** tutto in Supabase da zero
4. **Verifica** che il Bundle ID nell'app corrisponda esattamente

## 📞 Dimmi Cosa Vedi

Dopo aver seguito questi passaggi, dimmi:
1. **Quale log specifico** vedi quando provi il login
2. **Dove si ferma** il processo
3. **Quale errore esatto** appare nei log

Con queste informazioni posso aiutarti a risolvere il problema specifico!
