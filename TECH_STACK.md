# 🍷 Bacchus - Struttura Tecnica dell'App

## 📋 Indice
1. [Overview](#overview)
2. [Stack Tecnologico](#stack-tecnologico)
3. [Architettura](#architettura)
4. [Struttura del Progetto](#struttura-del-progetto)
5. [Servizi e Integrazioni](#servizi-e-integrazioni)
6. [Database](#database)
7. [Gestione Stato](#gestione-stato)
8. [Internazionalizzazione](#internazionalizzazione)
9. [Build e Deploy](#build-e-deploy)

---

## Overview

**Bacchus** è un'applicazione mobile nativa per iOS che permette agli utenti di monitorare il consumo di alcol, calcolare il tasso alcolemico (BAC) in tempo reale utilizzando algoritmi scientifici avanzati, e gestire sessioni di consumo con sincronizzazione real-time tra dispositivi.

**Piattaforma**: iOS (iPhone e iPad)  
**Versione corrente**: Build in fase di rilascio su App Store  
**Linguaggio principale**: TypeScript  
**Framework**: React Native + Expo

---

## Stack Tecnologico

### Core Framework
- **React Native** `0.76.9` - Framework per sviluppo mobile cross-platform
- **Expo SDK** `~52.0.20` - Piattaforma di sviluppo e deployment
- **TypeScript** `~5.3.3` - Type safety e developer experience

### UI/UX
- **React Native Reanimated** `~3.16.1` - Animazioni fluide e performanti
- **React Native Gesture Handler** `~2.20.2` - Gestione avanzata dei gesti
- **Expo Router** `~4.0.14` - Navigazione file-based
- **React Native SVG** `15.9.0` - Rendering di grafiche vettoriali
- **@shopify/react-native-skia** `1.5.0` - Rendering avanzato per grafici

### Grafici e Visualizzazioni
- **Victory Native** `37.3.2` - Libreria per grafici interattivi
- **Victory Native XL** - Estensioni per grafici avanzati
- **react-native-svg-charts** - Grafici SVG personalizzati

### Backend as a Service
- **Supabase** `^2.49.2` - Backend completo (database, auth, realtime)
  - PostgreSQL database
  - Realtime subscriptions
  - Authentication & Authorization
  - Storage
  - Row Level Security (RLS)

### In-App Purchases & Monetization
- **RevenueCat** `8.8.1` - Gestione abbonamenti e premium features
  - iOS StoreKit integration
  - Subscription management
  - Customer info sync

### Form Management
- **Formik** `^2.4.6` - Gestione form e validazione
- **Yup** `^1.4.0` - Schema validation

### State Management & Context
- **React Context API** - Gestione stato globale
  - `AuthContext` - Autenticazione e profili utente
  - `PurchaseContext` - Stato premium e acquisti
  - `SessionContext` - Sessioni attive e BAC in tempo reale

### Internationalization
- **i18next** `^24.0.5` - Framework i18n
- **react-i18next** `^15.4.1` - React bindings
- **expo-localization** `~16.0.0` - Locale detection

### Device & Platform
- **expo-device** `~7.0.1` - Device information e detection
- **expo-haptics** `~14.0.0` - Feedback tattile
- **@react-native-async-storage/async-storage** `1.23.1` - Storage locale

### Development Tools
- **Jest** `^29.2.1` - Testing framework
- **@testing-library/react-native** `^12.0.0` - Testing utilities
- **ESLint** `^8.57.0` - Linting
- **Prettier** - Code formatting

---

## Architettura

### Pattern Architetturale
L'app segue un'architettura **modular-service-oriented** con separazione delle responsabilità:

```
┌─────────────────────────────────────────┐
│           UI Layer (Screens)            │
│  File-based routing with expo-router    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        Context Layer (State)            │
│  AuthContext, PurchaseContext, etc.     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Service Layer (Logic)           │
│  session, profile, purchase services    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│     Data Layer (Supabase + Local)       │
│  PostgreSQL + AsyncStorage              │
└─────────────────────────────────────────┘
```

### Principi di Design
1. **Separation of Concerns** - Logica di business nei services, UI nei componenti
2. **Single Source of Truth** - Stato centralizzato nei Context
3. **Type Safety** - TypeScript strict mode
4. **Realtime First** - Sincronizzazione istantanea tra dispositivi
5. **Offline Capable** - Funzionalità critiche disponibili offline

---

## Struttura del Progetto

```
/Users/Domenico/Downloads/Bacchus/
├── app/                          # Main application code
│   ├── (tabs)/                   # Tab-based navigation
│   │   ├── index.tsx            # Home/Session screen
│   │   ├── statistics.tsx       # Statistics screen
│   │   └── account.tsx          # Account screen
│   │
│   ├── auth/                     # Authentication screens
│   │   ├── login.tsx
│   │   └── signup.tsx
│   │
│   ├── onboarding/               # Onboarding flow
│   │   ├── welcome.tsx
│   │   ├── profile.tsx
│   │   └── subscription-offer.tsx
│   │
│   ├── session/                  # Session management
│   │   ├── add-drink.tsx        # Add drink wizard
│   │   ├── add-food.tsx         # Add food screen
│   │   └── session-history.tsx  # Past sessions
│   │
│   ├── profile/                  # Profile management
│   │   ├── edit-profile.tsx
│   │   ├── create-profile.tsx
│   │   └── profile-list.tsx
│   │
│   ├── components/               # Reusable UI components
│   │   ├── DrinkTypeCard.tsx
│   │   ├── BACMeter.tsx
│   │   ├── ProfileCard.tsx
│   │   └── ...
│   │
│   ├── contexts/                 # React Context providers
│   │   ├── AuthContext.tsx      # Auth & profiles
│   │   ├── PurchaseContext.tsx  # Premium features
│   │   └── SessionContext.tsx   # Active session
│   │
│   ├── lib/                      # Core libraries
│   │   ├── services/            # Business logic services
│   │   │   ├── session.service.ts
│   │   │   ├── profile.service.ts
│   │   │   ├── purchase.service.ts
│   │   │   ├── favorites.service.ts
│   │   │   └── supabase.ts
│   │   │
│   │   ├── utils/               # Utility functions
│   │   │   ├── deviceDetection.ts
│   │   │   ├── bacCalculation.ts
│   │   │   └── ...
│   │   │
│   │   └── types/               # TypeScript definitions
│   │       └── ...
│   │
│   ├── i18n/                     # Internationalization
│   │   ├── locales/
│   │   │   ├── it/              # Italian translations
│   │   │   └── en/              # English translations
│   │   └── index.ts
│   │
│   └── _layout.tsx               # Root layout with providers
│
├── assets/                       # Static assets
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── app.config.js                 # Expo configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
└── eas.json                      # EAS Build config
```

---

## Servizi e Integrazioni

### 1. Session Service (`session.service.ts`)
**Responsabilità**:
- Gestione sessioni di consumo (creazione, salvataggio, sincronizzazione)
- Calcolo BAC in tempo reale con algoritmo Widmark
- Salvataggio locale + sincronizzazione Supabase
- Gestione cronologia sessioni

**Funzionalità chiave**:
```typescript
- createNewSession()
- addDrinkToSession()
- addFoodToSession()
- endSession()
- syncWithSupabase()
- calculateCurrentBAC()
```

**Storage**:
- Local: AsyncStorage per cache e offline
- Remote: Supabase `drinking_sessions` table

### 2. Profile Service (`profile.service.ts`)
**Responsabilità**:
- CRUD operazioni sui profili utente
- Gestione profilo attivo
- Sincronizzazione real-time profili tra dispositivi

**Funzionalità chiave**:
```typescript
- createProfile()
- updateProfile()
- deleteProfile()
- setActiveProfile()
- loadUserProfiles()
```

**Storage**:
- Supabase `profiles` table con RLS

### 3. Purchase Service (`purchase.service.ts`)
**Responsabilità**:
- Integrazione RevenueCat
- Gestione stato premium
- Acquisti in-app (abbonamenti mensili/annuali)
- Validazione entitlements

**Funzionalità chiave**:
```typescript
- initializePurchases()
- checkPremiumStatus()
- purchasePackage()
- restorePurchases()
- setUserForPurchases()
```

**Integrazioni**:
- RevenueCat SDK
- Apple StoreKit

### 4. Favorites Service (`favorites.service.ts`)
**Responsabilità**:
- Gestione bevande preferite (per utente)
- Tracking bevande recenti (per utente)
- Storage locale user-specific

**Funzionalità chiave**:
```typescript
- addFavoriteDrink()
- removeFavoriteDrink()
- getFavoriteDrinks()
- addRecentDrink()
- getRecentDrinks()
- clearRecentDrinks()
```

**Storage**:
- AsyncStorage con chiavi user-specific
- Pattern: `bacchus_favorite_drinks_user_{userId}`

### 5. Supabase Service (`supabase.ts`)
**Responsabilità**:
- Configurazione client Supabase
- Gestione autenticazione
- Real-time subscriptions

**Features utilizzate**:
- PostgreSQL database
- Row Level Security (RLS)
- Realtime channels
- Auth (email/password)

---

## Database

### Schema Supabase (PostgreSQL)

#### Tabella: `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  weight DECIMAL,
  height DECIMAL,
  birth_date DATE,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS: Users can only see their own profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

#### Tabella: `drinking_sessions`
```sql
CREATE TABLE drinking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  profile_id UUID REFERENCES profiles(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  drinks JSONB DEFAULT '[]',
  foods JSONB DEFAULT '[]',
  max_bac DECIMAL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS: Users can only see their own sessions
ALTER TABLE drinking_sessions ENABLE ROW LEVEL SECURITY;
```

#### Realtime Subscriptions
L'app utilizza Supabase Realtime per sincronizzazione istantanea:

```typescript
// Profile updates
supabase
  .channel('profiles_changes')
  .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'profiles' },
      handleProfileChange)
  .subscribe();

// Session updates
supabase
  .channel('sessions_changes')
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'drinking_sessions' },
      handleSessionChange)
  .subscribe();
```

---

## Gestione Stato

### Context Architecture

#### 1. AuthContext
**Stato globale**:
```typescript
{
  user: User | null;              // Current authenticated user
  profiles: Profile[];            // User's profiles
  activeProfile: Profile | null;  // Currently selected profile
  loading: boolean;
  isAuthenticated: boolean;
}
```

**Actions**:
- `login(email, password)`
- `signup(email, password, userData)`
- `logout()`
- `loadUserProfiles()`
- `setActiveProfile(profileId)`

#### 2. PurchaseContext
**Stato globale**:
```typescript
{
  isPremium: boolean;
  isLoading: boolean;
  offerings: Offerings | null;
  customerInfo: CustomerInfo | null;
}
```

**Actions**:
- `checkPremiumStatus()`
- `purchasePackage(packageToPurchase)`
- `restorePurchases()`

#### 3. SessionContext
**Stato globale**:
```typescript
{
  activeSession: DrinkingSession | null;
  currentBAC: number;
  sessionHistory: DrinkingSession[];
  isLoading: boolean;
}
```

**Actions**:
- `startNewSession()`
- `addDrink(drinkData)`
- `addFood(foodData)`
- `endSession()`
- `syncSession()`

---

## Internazionalizzazione

### Lingue Supportate
- 🇮🇹 **Italiano** (default)
- 🇬🇧 **Inglese**

### Struttura i18n
```
app/i18n/locales/
├── it/
│   ├── common.json          # Testi comuni
│   ├── auth.json            # Autenticazione
│   ├── session.json         # Sessioni e bevande
│   ├── profile.json         # Profili
│   ├── account.json         # Account settings
│   └── onboarding.json      # Onboarding flow
│
└── en/
    ├── common.json
    ├── auth.json
    ├── session.json
    ├── profile.json
    ├── account.json
    └── onboarding.json
```

### Utilizzo
```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation('session');
  
  return <Text>{t('addDrink.title')}</Text>;
};
```

---

## Build e Deploy

### EAS Build Configuration

#### Profili di Build
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  }
}
```

### Expo Account
- **Owner**: `dimaiodomenico95`
- **Project ID**: Configurato in `app.config.js`

### Deployment Process
1. **Development**: `eas build --profile development --platform ios`
2. **Preview/TestFlight**: `eas build --profile preview --platform ios`
3. **Production**: `eas build --profile production --platform ios`
4. **Submit to App Store**: `eas submit --platform ios`

### App Store Configuration
- **Bundle ID**: Configurato come iPhone-only app
- **Device Family**: `[1]` (iPhone)
- **iPad Support**: Compatibility mode (non nativo)
- **Minimum iOS Version**: Definito in `app.config.js`

---

## Algoritmi Scientifici

### Calcolo BAC (Blood Alcohol Content)
L'app utilizza la **formula di Widmark** per calcolare il tasso alcolemico:

```typescript
BAC = (A × 5.14 / W × r) - β × t

Dove:
- A = grammi di alcol consumato
- W = peso corporeo (kg)
- r = costante di distribuzione (0.68 per uomini, 0.55 per donne)
- β = tasso di eliminazione (0.015 per ora)
- t = tempo trascorso (ore)
```

### Fattori considerati
- **Genere**: Diversa distribuzione dell'acqua corporea
- **Peso**: Maggiore massa = maggiore diluizione
- **Tempo**: Eliminazione graduale dell'alcol
- **Cibo**: Rallentamento dell'assorbimento

---

## Sicurezza e Privacy

### Autenticazione
- Email/Password con Supabase Auth
- JWT tokens
- Secure session management

### Data Protection
- **Row Level Security (RLS)** su tutte le tabelle Supabase
- Ogni utente può accedere solo ai propri dati
- Encryption in transit (HTTPS)
- Local data encryption (AsyncStorage)

### Privacy
- Nessun tracking di terze parti
- Dati sensibili (BAC, consumo alcol) non condivisi
- Conformità GDPR

---

## Performance Optimization

### Strategie implementate
1. **Data Preloading**: Premium status e sessione attiva caricate durante splash screen
2. **Realtime Sync**: Aggiornamenti istantanei senza polling
3. **Local Caching**: AsyncStorage per accesso rapido offline
4. **Memoization**: React.memo e useMemo per componenti pesanti
5. **Lazy Loading**: Caricamento graduale della cronologia

### Gestione Offline
- Sessioni salvate localmente
- Sincronizzazione automatica al ripristino della connessione
- Calcolo BAC funziona sempre offline

---

## Testing

### Test Coverage
- **Unit Tests**: Logica di calcolo BAC, utility functions
- **Integration Tests**: Services e Context
- **Component Tests**: React Testing Library

### Continuous Integration
- Automated builds con EAS
- Pre-commit hooks per linting
- Type checking automatico

---

## Roadmap Tecnico

### Features in sviluppo
- [ ] Notifiche push per promemoria idratazione
- [ ] Export dati in CSV/PDF
- [ ] Integrazione Apple Health
- [ ] Widget iOS
- [ ] Siri Shortcuts

### Miglioramenti pianificati
- [ ] Ottimizzazione ulteriore sincronizzazione realtime
- [ ] Caching più aggressivo per statistiche
- [ ] Supporto iPad nativo (attualmente in compatibility mode)
- [ ] Dark mode automatico

---

## Contatti e Supporto

**Developer**: Domenico Di Maio  
**Expo Account**: `dimaiodomenico95`  
**Platform**: iOS (App Store)

---

*Documento aggiornato: Dicembre 2024*

