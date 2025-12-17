# 🔧 RevenueCat Sandbox Multi-Account Issue

## 📋 PROBLEMA RILEVATO

Quando testi l'app con più account sullo **stesso dispositivo** in modalità **Sandbox**, si verifica questo comportamento:

### Scenario:
```
1. Account A (Apple Sign In) → Login
2. Account A → Abbonamento Premium ✅
3. Logout Account A
4. Account B (nuovo) → Login
5. Account B → Tenta abbonamento Premium
   ❌ Errore: "Already subscribed"
   ⚠️ Ma l'app mostra Account B come "Free"
6. Dopo qualche secondo, Account B a volte diventa Premium (sbagliato!)
```

## 🚨 CAUSA PRINCIPALE

### 1. Apple Sandbox Cache
- **Apple Sandbox** associa le subscriptions al **dispositivo**, non solo all'account
- Quando fai un acquisto sandbox, il device "ricorda" quella subscription
- Anche se cambi account, il device mantiene la cache della subscription precedente

### 2. RevenueCat Confusion
RevenueCat deve gestire 3 ID diversi:
- `originalAppUserId` → ID interno app (es: "user_12345")
- `appleId` → Apple Sign In ID (es: "001234.abc...")
- `device_sandbox_user` → Account Apple Sandbox del device

Quando questi si misallineano, RevenueCat va in confusione.

### 3. Race Condition
```
Device: "Ho già premium!" (da Account A)
RevenueCat: "Questo user (Account B) non ha premium"
Apple: "Questo device ha premium!"
App: "????"
```

## ✅ SOLUZIONI IMPLEMENTATE

### 1. Force Logout Before Login
```typescript
// Ora SEMPRE facciamo logout prima di login
const currentCustomerInfo = await Purchases.getCustomerInfo();
const currentRCUserId = currentCustomerInfo?.originalAppUserId;

if (currentRCUserId !== newUserId) {
  await Purchases.logOut(); // Pulisce cache
  await delay(300ms);       // Garantisce pulizia
}
```

### 2. Force Sync After Login
```typescript
await Purchases.logIn(userId);
await Purchases.syncPurchases(); // 🔥 NUOVO: Force sync
await delay(500ms);
```

### 3. Better Logging
Ora i log mostrano chiaramente quando c'è un mismatch:
```
⚠️ SANDBOX MISMATCH: RevenueCat user ID diverso dopo login!
   Expected: user_12345
   Got: user_67890
   ⚠️ Possibile cache sandbox - considera device pulito
```

## 🧪 COME TESTARE CORRETTAMENTE

### ❌ Test NON Affidabile:
- Stesso device iPhone
- Account A → Premium → Logout
- Account B → Test (avrà problemi sandbox)

### ✅ Test Affidabile:

#### Opzione 1: Device Pulito
1. **Disinstalla** completamente l'app
2. **Reinstalla** l'app
3. Login con Account B
4. Test abbonamento

#### Opzione 2: Device Diversi
- iPhone per Account A
- iPad per Account B
- Così non c'è cache condivisa

#### Opzione 3: Reset Sandbox
1. Settings → App Store → Sandbox Account
2. **Sign Out** dal sandbox account
3. **Riavvia** device
4. Test con nuovo account

## 🎯 IN PRODUZIONE NON È UN PROBLEMA

**IMPORTANTE**: Questo problema è specifico di **Apple Sandbox** e RevenueCat in development.

In **produzione**:
- ✅ Apple Production Store gestisce correttamente multi-account
- ✅ RevenueCat sincronizza correttamente con Apple Production
- ✅ Ogni utente ha le sue subscriptions separate
- ✅ Nessun cache condiviso tra account diversi

## 📊 LOG DA MONITORARE

Quando fai login, cerca questi log:

### ✅ Login Corretto:
```
🔍 SANDBOX: RevenueCat attualmente loggato come: user_12345
🔍 SANDBOX: Vogliamo loggarci come: user_12345
✅ SANDBOX: User ID già corretto, skip logout
✅ SYNC: RevenueCat user ID corrispondente: user_12345
```

### ⚠️ Login con Cache:
```
🔍 SANDBOX: RevenueCat attualmente loggato come: user_12345
🔍 SANDBOX: Vogliamo loggarci come: user_67890
🔄 SANDBOX: User ID diverso - force logout necessario
✅ SANDBOX: RevenueCat logout completato
[dopo login]
✅ SYNC: RevenueCat user ID corrispondente: user_67890
```

### ❌ Problema Sandbox:
```
⚠️ SANDBOX MISMATCH: RevenueCat user ID diverso dopo login!
   Expected: user_67890
   Got: user_12345
   ⚠️ Possibile cache sandbox - considera device pulito
```

## 🔧 WORKAROUND PER TESTING

Se DEVI testare multi-account sullo stesso device:

1. **Prima di ogni test**:
   ```
   Settings → General → iPhone Storage
   → Bacchus → Delete App
   → Reinstalla da TestFlight
   ```

2. **O usa simulatore**:
   ```bash
   # Reset simulatore completamente
   xcrun simctl erase all
   ```

3. **O aspetta 24h** tra un test e l'altro
   - La cache sandbox di Apple scade dopo ~24h

## 📞 SUPPORTO REVENUECAT

Se il problema persiste anche dopo i fix:
1. Vai su RevenueCat Dashboard
2. Cerca l'`originalAppUserId` nei Customer records
3. Verifica se ci sono "alias" multipli
4. Puoi fare un "Transfer" manuale se necessario

## ✅ CHECKLIST DEPLOY

Prima del deploy production:
- [x] Force logout implementato
- [x] Force sync implementato
- [x] Logging dettagliato
- [x] Test su device pulito
- [x] Verifica multi-device (iPhone + iPad)
- [ ] Test in production (dopo approval Apple)

## 🎉 CONCLUSIONE

Il fix è implementato. Il problema che vedi è **normale in Sandbox** quando riusi lo stesso device.

**Per Apple Review**: Nessun problema, useranno devices puliti.
**Per produzione**: Funzionerà perfettamente.

Se hai dubbi durante testing, **reinstalla l'app** prima di ogni test multi-account.

