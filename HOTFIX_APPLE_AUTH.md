# 🔥 HOTFIX - APPLE AUTHENTICATION DEBUG

## Problema
Login Apple mostra "pagina non trovata" dopo le modifiche.

## Modifiche Applicate per il Debug

### 1. ✅ Aggiornato Redirect URI
- **Prima**: `bacchus://auth-callback` (hardcoded)
- **Dopo**: `config.getAuthCallbackUrl()` (dinamico con Expo Linking)

### 2. ✅ Migliorato +not-found.tsx
- Aggiunto debug dettagliato dei parametri OAuth
- Cattura tutti i possibili formati di parametri Apple
- Redirect automatico a `/auth/auth-callback`

### 3. ✅ Potenziato auth-callback.tsx  
- Debug completo dei parametri ricevuti
- Gestione diretta dei token OAuth se presenti
- Timeout aumentato a 2 secondi per processamento
- Messaggi di stato chiari

## Come Testare

### Test 1: Verifica Deep Linking
```bash
# In un terminale, simula un deep link
npx uri-scheme open bacchus://auth-callback --ios
```

### Test 2: Debug Console
1. Apri l'app in development mode
2. Prova il login Apple
3. Controlla i log nella console per:
   - `🔍 NOT_FOUND: Parametri ricevuti:`
   - `🔄 AUTH_CALLBACK: === INIZIO GESTIONE CALLBACK ===`

### Test 3: Verifica Redirect URL
Il redirect URL ora dovrebbe essere generato dinamicamente:
- **Dev**: `bacchus://auth-callback`  
- **Prod**: URL generato con `Linking.createURL()`

## Debug Steps

Se vedi ancora "pagina non trovata":

1. **Controlla Console Logs**
   ```
   🔍 NOT_FOUND: Parametri ricevuti: {...}
   🔍 NOT_FOUND: Tutte le chiavi: [...]
   ```

2. **Verifica Redirect**
   - Il callback dovrebbe passare da `+not-found.tsx` a `auth-callback.tsx`
   - Se non passa, il problema è nel routing di Expo

3. **Controlla Supabase Settings**
   - Vai su Supabase Dashboard > Authentication > Settings
   - Verifica che il redirect URL sia autorizzato
   - Aggiungi: `bacchus://auth-callback`

## Recovery Plan

Se il problema persiste:

1. **Fallback Method**: Tornare al redirect URI originale
2. **Alternative**: Usare Supabase Auth con Universal Links
3. **Emergency**: Disabilitare temporaneamente Apple Auth

## Files Modificati
- ✅ `app/lib/services/auth.service.ts` - Redirect URI dinamico
- ✅ `app/+not-found.tsx` - Debug e routing migliorato  
- ✅ `app/auth/auth-callback.tsx` - Gestione parametri OAuth 