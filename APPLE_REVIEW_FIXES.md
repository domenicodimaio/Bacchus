# 🍎 RISOLUZIONE PROBLEMI APPLE REVIEW

## ✅ **PROBLEMI RISOLTI**

### 1. **Compatibilità iPad RIMOSSA**
- ✅ Modificato `app.config.js`: `supportsTablet: false`
- ⚠️ **AZIONE RICHIESTA**: Rimuovere supporto iPad da App Store Connect

### 2. **Link Terms of Use e Privacy Policy AGGIUNTI**
- ✅ Aggiunti link funzionanti nella schermata subscription-offer
- ✅ Informazioni complete su durata e prezzo abbonamenti
- ✅ Link esterni a `https://bacchus.app/terms` e `https://bacchus.app/privacy`

### 3. **Validazione Receipt Server-Side IMPLEMENTATA**
- ✅ Creato endpoint `/server/receipt-validation.js`
- ✅ Gestisce produzione + sandbox come richiesto da Apple
- ✅ Configurazione Vercel pronta

---

## 🎯 **AZIONI RICHIESTE DA TE**

### **A. App Store Connect - Rimuovere iPad**

1. **Vai su App Store Connect** → Bacchus App
2. **App Information** → **Supported Device Families**
3. **DESELEZIONA "iPad"** - lascia solo iPhone
4. **App Store** → **Screenshots and App Previews**
5. **ELIMINA tutti gli screenshot iPad**
6. **Salva le modifiche**

### **B. Descrizione App Store - Aggiungere Link Terms**

Nella **descrizione dell'app** su App Store Connect, aggiungi:

```
Termini di Servizio: https://bacchus.app/terms
Privacy Policy: https://bacchus.app/privacy
```

### **C. Deploy Server Receipt Validation**

**Opzione 1: Vercel (Consigliato)**
```bash
# Installa Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Opzione 2: Netlify Functions**
```bash
# Installa Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

**Opzione 3: Server Express**
```javascript
// Usa il file server/receipt-validation.js
// Chiama expressHandler(req, res) nel tuo endpoint
```

### **D. Configurare URL Server nell'App**

Dopo il deploy, aggiorna l'URL del server nell'app:

```typescript
// In app/lib/services/purchase.service.ts
const RECEIPT_VALIDATION_URL = 'https://tuo-dominio.vercel.app/api/validate-receipt';
```

### **E. Aggiorna Metadata App Store Connect**

1. **Privacy Policy URL**: `https://github.com/domenicodimaio/bacchus-urls/wiki/Privacy-Policy`
2. **App Description**: Aggiungi "Termini di Servizio: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
3. **Oppure**: Seleziona "Standard Apple EULA" nel campo EULA

### **F. Nuovi Screenshot iPhone**

Crea screenshot **SOLO per iPhone** che mostrino:
- App in uso (non splash screen)
- Funzionalità principali
- UI reale dell'app

---

## 🔧 **DETTAGLI TECNICI**

### **Endpoint Receipt Validation**

```
POST /api/validate-receipt
Content-Type: application/json

{
  "receiptData": "base64_receipt_data",
  "sharedSecret": "your_shared_secret" // opzionale
}
```

### **Risposta**

```json
{
  "success": true,
  "environment": "production|sandbox",
  "data": { /* Apple response */ }
}
```

### **Informazioni Abbonamento nell'App**

Ora l'app mostra:
- ✅ Titolo abbonamento
- ✅ Durata (1 mese / 1 anno)
- ✅ Prezzo e prezzo per unità
- ✅ Link funzionanti a Terms e Privacy
- ✅ Informazioni rinnovo automatico

---

## 📋 **CHECKLIST FINALE**

- [ ] Rimuovere iPad da App Store Connect
- [ ] Eliminare screenshot iPad
- [ ] Aggiungere link Terms nella descrizione App Store
- [ ] Deploy server receipt validation
- [ ] Verificare link web attivi
- [ ] Creare nuovi screenshot iPhone
- [ ] Ricompilare e caricare nuova build
- [ ] Sottomettere per review

Una volta completati tutti questi passi, l'app dovrebbe superare la review di Apple! 🎉
