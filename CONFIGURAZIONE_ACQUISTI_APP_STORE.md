# 🛒 **CONFIGURAZIONE ACQUISTI IN-APP - APP STORE CONNECT**

## 📱 **PRODOTTI DA CONFIGURARE**

### **🔑 Product IDs Corretti:**
- **Mensile**: `com.bacchusapp.app.premium.monthly`
- **Annuale**: `com.bacchusapp.app.premium.yearly`

---

## 🎯 **STEP-BY-STEP CONFIGURAZIONE**

### **1. Accesso App Store Connect**
1. Vai su [App Store Connect](https://appstoreconnect.apple.com)
2. Accedi con il tuo Apple ID sviluppatore
3. Seleziona la tua app **Bacchus**

### **2. Creazione Subscription Group**
1. Vai su **"Features"** → **"In-App Purchases"**
2. Clicca **"Manage"** accanto a "Auto-Renewable Subscriptions"
3. Clicca **"Create Subscription Group"**
4. **Nome**: "Bacchus Premium Subscriptions"
5. **Reference Name**: "premium_subscriptions"

### **3. Creazione Abbonamento Mensile**
1. Nel Subscription Group, clicca **"Create Subscription"**
2. **Product ID**: `com.bacchusapp.app.premium.monthly`
3. **Reference Name**: "Premium Monthly"
4. **Subscription Duration**: 1 Month
5. **Price**: €2.99 (o il prezzo che preferisci)

**Localizzazioni (Italiano):**
- **Display Name**: "Bacchus Premium Mensile"
- **Description**: "Accesso completo a tutte le funzionalità premium di Bacchus per un mese"

**Localizzazioni (Inglese):**
- **Display Name**: "Bacchus Premium Monthly"
- **Description**: "Full access to all Bacchus premium features for one month"

### **4. Creazione Abbonamento Annuale**
1. Nel Subscription Group, clicca **"Create Subscription"**
2. **Product ID**: `com.bacchusapp.app.premium.yearly`
3. **Reference Name**: "Premium Yearly"
4. **Subscription Duration**: 1 Year
5. **Price**: €29.99 (sconto del 17% rispetto al mensile)

**Localizzazioni (Italiano):**
- **Display Name**: "Bacchus Premium Annuale"
- **Description**: "Accesso completo a tutte le funzionalità premium di Bacchus per un anno intero. Risparmia il 17%!"

**Localizzazioni (Inglese):**
- **Display Name**: "Bacchus Premium Yearly"
- **Description**: "Full access to all Bacchus premium features for one full year. Save 17%!"

### **5. Configurazioni Aggiuntive**

#### **Family Sharing**
- ✅ Abilita "Family Sharing" per entrambi i prodotti

#### **Introductory Offers**
- **Mensile**: 3 giorni gratis, poi €2.99/mese
- **Annuale**: 1 settimana gratis, poi €29.99/anno

#### **Promotional Offers**
- Configura offerte promozionali se desideri

---

## 🔧 **FUNZIONALITÀ PREMIUM BACCHUS**

### **✨ Cosa Ottiene l'Utente Premium:**
- 🚀 **Sessioni illimitate** (vs 2 a settimana per free)
- 📊 **Statistiche dettagliate** e cronologia completa
- 🎯 **Metabolismo personalizzato** basato sui dati utente
- 📱 **Widget iOS** per monitoraggio rapido
- 🔴 **Live Activities** per tracking in tempo reale
- 📤 **Esportazione dati** in CSV/PDF
- 🎨 **Temi premium** e personalizzazioni avanzate
- 🚫 **Rimozione pubblicità** (quando implementate)

---

## 🧪 **TESTING**

### **Sandbox Testing**
1. Crea **Sandbox Testers** in App Store Connect
2. Usa email di test diversi dal tuo account principale
3. Testa acquisti su dispositivo fisico (non simulatore)

### **TestFlight Testing**
1. Carica build su TestFlight
2. Invita tester esterni
3. Testa flusso completo di acquisto

---

## 📋 **CHECKLIST FINALE**

### **Prima del Release:**
- [ ] Prodotti creati e approvati in App Store Connect
- [ ] Subscription Group configurato
- [ ] Localizzazioni completate (IT/EN)
- [ ] Prezzi impostati correttamente
- [ ] Family Sharing abilitato
- [ ] Introductory offers configurate
- [ ] Sandbox testing completato
- [ ] TestFlight testing completato
- [ ] Termini di servizio e privacy policy aggiornati

### **Dopo il Release:**
- [ ] Monitoraggio metriche di conversione
- [ ] Analisi feedback utenti
- [ ] Ottimizzazione prezzi se necessario
- [ ] Implementazione offerte promozionali

---

## 🚨 **IMPORTANTE**

⚠️ **I prodotti devono essere APPROVATI da Apple prima di funzionare in produzione!**

⚠️ **Il processo di approvazione può richiedere 24-48 ore**

⚠️ **Testa sempre su dispositivo fisico, mai su simulatore**

---

## 💡 **PREZZI SUGGERITI**

### **Strategia di Pricing:**
- **Mensile**: €2.99 (accessibile per provare)
- **Annuale**: €29.99 (sconto significativo per fidelizzare)
- **Trial**: 3-7 giorni gratis (per aumentare conversioni)

### **Benchmark di Mercato:**
- App simili: €1.99-€4.99/mese
- Bacchus è premium: €2.99 è competitivo
- Sconto annuale del 17% è attraente

---

**🎯 Una volta configurati questi prodotti, l'app tenterà acquisti reali e farà fallback a mock solo se necessario!**
