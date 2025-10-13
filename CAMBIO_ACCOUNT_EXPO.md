# Cambio Account Expo - domedima1995

## ✅ Modifiche Completate

1. **Owner cambiato** in `app.config.js`:
   - Da: `"domedima95"`
   - A: `"domedima1995"`

2. **Project ID aggiornato** in `app.config.js`:
   - Da: `"5df3e2bc-d6a4-4d90-a4ef-63972d12c8d3"`
   - A: `"9b240d71-6547-43b8-90f3-3266d9f286f1"`

## 🔧 Passi da Completare Manualmente

### 1. Login con il nuovo account
```bash
npx eas login
# Inserisci le credenziali per domedima1995
```

### 2. Verifica account attivo
```bash
npx eas whoami
# Dovrebbe mostrare: domedima1995
```

### 3. Inizializza il progetto con il nuovo account
```bash
npx eas project:init
# Conferma il project ID: 9b240d71-6547-43b8-90f3-3266d9f286f1
```

### 4. Verifica configurazione
```bash
npx eas project:info
```

### 5. Test build (opzionale)
```bash
npx eas build --platform ios --profile development --non-interactive
```

## 📝 Note Importanti

- Il bundle identifier rimane: `com.bacchusapp.app`
- Le configurazioni App Store Connect rimangono invariate
- Il progetto Supabase rimane lo stesso
- Tutte le chiavi API e configurazioni rimangono invariate

## ⚠️ Possibili Problemi

Se ricevi errori di permessi:
1. Assicurati che l'account `domedima1995` abbia accesso al progetto
2. Verifica che il project ID sia corretto
3. Controlla che l'owner nel `app.config.js` corrisponda all'account loggato

## 🚀 Dopo il Cambio

Una volta completati i passi manuali, potrai:
- Fare build normalmente con il nuovo account
- Avere più build disponibili nel piano Free
- Continuare lo sviluppo senza interruzioni
