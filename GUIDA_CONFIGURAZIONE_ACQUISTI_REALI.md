# Guida Configurazione Acquisti In-App Reali

## Problema Attuale
L'app attualmente usa acquisti mock per il testing. Per la produzione, devi configurare acquisti reali tramite App Store Connect e RevenueCat.

## Opzione 1: RevenueCat (Consigliata)

RevenueCat semplifica la gestione degli acquisti cross-platform e fornisce analytics avanzate.

### 1. Configurazione RevenueCat

#### Registrazione e Setup Progetto
1. Vai su [RevenueCat](https://www.revenuecat.com/) e crea un account
2. Crea un nuovo progetto: **"Bacchus"**
3. Nella dashboard, vai su **Apps** → **+ New App**
4. Configura:
   - **App name**: Bacchus
   - **Bundle ID**: Il tuo bundle ID (es: `com.tuodominio.bacchus`)
   - **Platform**: iOS
   - **App Store Connect**: Collega il tuo account developer

#### Configurazione Prodotti
1. Vai su **Products** → **+ New Product**
2. Crea i prodotti per gli abbonamenti:

**Abbonamento Mensile:**
- **Product ID**: `bacchus_premium_monthly`
- **Type**: Subscription
- **Duration**: 1 month

**Abbonamento Annuale:**
- **Product ID**: `bacchus_premium_yearly`
- **Type**: Subscription
- **Duration**: 1 year

3. Vai su **Entitlements** → **+ New Entitlement**
4. Crea entitlement: `premium` 
5. Associa entrambi i prodotti all'entitlement `premium`

#### Ottenere le API Keys
1. Vai su **Apps** → **Bacchus** → **API Keys**
2. Copia le chiavi:
   - **iOS Key**: `appl_xxxxxxxxx`
   - **Android Key**: `goog_xxxxxxxxx` (se supporti Android)

### 2. Configurazione App Store Connect

#### Creazione Prodotti In-App
1. Vai su [App Store Connect](https://appstoreconnect.apple.com/)
2. Seleziona la tua app **Bacchus**
3. Vai su **Features** → **In-App Purchases**
4. Clicca **+** per creare nuovo prodotto

**Abbonamento Mensile:**
- **Type**: Auto-Renewable Subscription
- **Reference Name**: Bacchus Premium Monthly
- **Product ID**: `bacchus_premium_monthly` (deve corrispondere a RevenueCat)
- **Subscription Group**: Crea nuovo gruppo "Bacchus Premium"
- **Subscription Duration**: 1 Month
- **Price**: Scegli il prezzo (es: €4.99)

**Abbonamento Annuale:**
- **Type**: Auto-Renewable Subscription
- **Reference Name**: Bacchus Premium Yearly
- **Product ID**: `bacchus_premium_yearly`
- **Subscription Group**: Stesso gruppo "Bacchus Premium"
- **Subscription Duration**: 1 Year
- **Price**: Scegli il prezzo (es: €39.99)

#### Configurazione Subscription Group
1. Nel gruppo "Bacchus Premium", configura:
   - **Localizations**: Aggiungi descrizioni in italiano e inglese
   - **App Store Review Information**: Compila le informazioni richieste

### 3. Configurazione App

#### Aggiornare le Chiavi API
Nel file `app/lib/services/purchase.service.ts`, sostituisci le chiavi dummy:

```typescript
const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'appl_LA_TUA_CHIAVE_IOS_QUI',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'goog_LA_TUA_CHIAVE_ANDROID_QUI',
};
```

#### Configurare Variabili d'Ambiente
Nel file `.env` (crea se non esiste):

```env
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_la_tua_chiave_ios_reale
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_la_tua_chiave_android_reale
```

#### Aggiornare Product IDs
Nel file `app/types/purchases.ts`, verifica che i Product IDs corrispondano:

```typescript
export const PRODUCT_IDS = {
  PREMIUM_SUBSCRIPTION_MONTHLY: {
    ios: 'bacchus_premium_monthly',
    android: 'bacchus_premium_monthly'
  },
  PREMIUM_SUBSCRIPTION_YEARLY: {
    ios: 'bacchus_premium_yearly', 
    android: 'bacchus_premium_yearly'
  }
};
```

## Opzione 2: Expo In-App Purchases (Più Semplice)

Se preferisci non usare RevenueCat, puoi usare direttamente Expo In-App Purchases.

### 1. Installazione
```bash
npx expo install expo-in-app-purchases
```

### 2. Configurazione App Store Connect
Segui gli stessi passaggi della sezione RevenueCat per creare i prodotti in App Store Connect.

### 3. Modifica del Codice
Nel file `app/lib/services/purchase.service.ts`, rimuovi la logica mock e usa solo Expo In-App Purchases:

```typescript
// Rimuovi questa sezione mock
export const purchasePackage = async (pkg: any) => {
  try {
    if (!isInAppPurchasesAvailable) {
      throw new Error('In-App Purchases non disponibili');
    }

    const productId = pkg.identifier || pkg.productId;
    const result = await ExpoInAppPurchases.purchaseItemAsync(productId);
    
    if (result.responseCode === ExpoInAppPurchases.IAPResponseCode.OK) {
      // Salva lo stato premium nel database utente (non in AsyncStorage)
      await saveUserPremiumStatus(true);
      return { success: true };
    }
    
    throw new Error('Acquisto fallito');
  } catch (error) {
    return { success: false, error };
  }
};
```

## Rimozione Acquisti Mock

### 1. Rimuovi Logica Mock
Nel file `app/lib/services/purchase.service.ts`:

1. **Rimuovi** la sezione che salva in `STORAGE_KEYS.MOCK_PREMIUM`
2. **Rimuovi** il fallback agli acquisti mock
3. **Rimuovi** la simulazione premium in `PurchaseContext.tsx`

### 2. Aggiorna isPremium()
Modifica la funzione per controllare solo acquisti reali:

```typescript
export const isPremium = async (): Promise<boolean> => {
  try {
    // Solo acquisti reali - niente mock
    if (isRevenueCatAvailable) {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.entitlements.active.premium !== undefined;
    }
    
    if (isInAppPurchasesAvailable) {
      const purchases = await ExpoInAppPurchases.getPurchaseHistoryAsync();
      return purchases.results.some(p => 
        p.productId.includes('premium') && 
        p.purchaseState === ExpoInAppPurchases.IAPPurchaseState.PURCHASED
      );
    }
    
    return false; // Nessun acquisto mock
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
};
```

### 3. Rimuovi Pulsanti di Test
Nel file `app/components/PremiumFeaturesList.tsx`, rimuovi i pulsanti "Test Premium" e "Disable Premium Test".

## Testing

### 1. Sandbox Testing
1. In App Store Connect, vai su **Users and Access** → **Sandbox Testers**
2. Crea account di test con email diverse dal tuo Apple ID principale
3. Sul dispositivo iOS, vai su **Settings** → **App Store** → **Sandbox Account**
4. Accedi con l'account sandbox

### 2. Test su Dispositivo
⚠️ **IMPORTANTE**: Gli acquisti in-app funzionano SOLO su dispositivi fisici, non su simulatore!

1. Installa l'app sul dispositivo fisico
2. Assicurati di essere loggato con l'account sandbox
3. Testa il flusso di acquisto completo
4. Verifica che lo stato premium venga salvato correttamente

### 3. Verifica Webhook (Solo RevenueCat)
1. In RevenueCat, vai su **Integrations** → **Webhooks**
2. Configura webhook per sincronizzare con il tuo backend se necessario

## Checklist Finale

### RevenueCat:
- [ ] Account RevenueCat creato e app configurata
- [ ] Prodotti creati in RevenueCat con entitlement "premium"
- [ ] API Keys copiate e configurate nell'app
- [ ] Prodotti creati in App Store Connect con stessi Product IDs
- [ ] Subscription Group configurato
- [ ] Logica mock rimossa dal codice
- [ ] Test su dispositivo fisico con account sandbox

### Expo In-App Purchases:
- [ ] Dipendenza `expo-in-app-purchases` installata
- [ ] Prodotti creati in App Store Connect
- [ ] Product IDs aggiornati nel codice
- [ ] Logica mock rimossa
- [ ] Funzioni di verifica acquisti implementate
- [ ] Test su dispositivo fisico con account sandbox

## Note Importanti

1. **Approval Process**: I prodotti in-app devono essere approvati da Apple insieme all'app
2. **Sandbox vs Production**: Usa sempre account sandbox per il testing
3. **Restore Purchases**: Implementa sempre la funzione di ripristino acquisti
4. **Error Handling**: Gestisci tutti i possibili errori (cancellazione utente, problemi di rete, etc.)
5. **Privacy**: Assicurati che la Privacy Policy menzioni gli acquisti in-app

## Supporto
- **RevenueCat**: [Documentazione ufficiale](https://docs.revenuecat.com/)
- **Expo In-App Purchases**: [Documentazione Expo](https://docs.expo.dev/versions/latest/sdk/in-app-purchases/)
- **App Store Connect**: [Guida Apple](https://developer.apple.com/app-store-connect/)
