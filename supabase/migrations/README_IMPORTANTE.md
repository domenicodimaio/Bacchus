# 🚨 IMPORTANTE - STOP ALLE MIGRAZIONI! 🚨

## ⛔ REGOLA ASSOLUTA: NO PIÙ MIGRAZIONI

**DOPO LA MIGRAZIONE MASTER `99999999999999_MASTER_SCHEMA_RESET.sql` È VIETATO AGGIUNGERE NUOVE MIGRAZIONI!**

## 📊 Storia del disastro (da non ripetere)

Prima della migrazione master avevamo:
- ✅ **14 file di migrazione** per lo stesso schema base
- ✅ **Conflitti nomenclatura**: `profileColor` vs `color`, `profileEmoji` vs `emoji`  
- ✅ **Tabelle duplicate**: `sessions` → `active_sessions` → `user_sessions` → `sessions`
- ✅ **Trigger ridefiniti**: `update_updated_at_column()` definito 5+ volte
- ✅ **Foreign keys instabili**: aggiunte e rimosse continuamente
- ✅ **Colonne misteriose**: `_h`, `_i`, `_j`, `_k` di origine sconosciuta

## ✅ Schema finale (DEFINITIVO)

### Tabella `profiles`
```sql
CREATE TABLE "public"."profiles" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    "weight" NUMERIC NOT NULL, -- kg
    "age" INTEGER NOT NULL,
    "height" NUMERIC NOT NULL, -- cm
    "drinking_frequency" TEXT NOT NULL CHECK (drinking_frequency IN ('rarely', 'occasionally', 'regularly', 'frequently')),
    "color" TEXT DEFAULT '#00bcd7' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    "emoji" TEXT DEFAULT '🍷',
    "is_default" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Tabella `sessions`
```sql
CREATE TABLE "public"."sessions" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "profile_id" TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    "session_data" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Tabella `app_logs`
```sql
CREATE TABLE "public"."app_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    "level" TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
    "message" TEXT NOT NULL,
    "category" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "stack_trace" TEXT,
    "device_info" JSONB DEFAULT '{}',
    "app_version" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

## 🛠️ Come applicare la migrazione master

### Opzione 1: Supabase Dashboard (RACCOMANDATO)
1. Vai alla dashboard Supabase
2. Sezione "SQL Editor"
3. Copia il contenuto di `99999999999999_MASTER_SCHEMA_RESET.sql`
4. Esegui la query

### Opzione 2: Script automatico
```bash
# Dalla root del progetto
node scripts/apply_master_migration.js
```

## 🚫 Cosa NON fare MAI PIÙ

❌ **NON creare nuovi file di migrazione**  
❌ **NON modificare lo schema con ALTER TABLE**  
❌ **NON aggiungere nuove colonne senza discussione team**  
❌ **NON creare funzioni SQL duplicate**  
❌ **NON cambiare nomi di colonne esistenti**  

## ✅ Cosa fare per modifiche schema

Se hai ASSOLUTO bisogno di modificare lo schema:

1. **STOP!** Prima discuti con il team
2. **Valuta alternative** lato applicazione
3. **Se proprio necessario**: modifica il file master e ri-applica completamente
4. **Documenta** il motivo del cambiamento

## 📝 Funzioni utility disponibili

```sql
-- Ottieni profilo default utente
SELECT * FROM get_default_profile();

-- Ottieni sessione attiva
SELECT * FROM get_active_session();

-- Pulisci log vecchi (automatico)
SELECT cleanup_old_logs(); -- Ritorna numero record eliminati
```

## 🔍 Monitoring schema

Per verificare che lo schema sia corretto:

```sql
-- Verifica tabelle esistenti
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verifica colonne profiles
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Verifica RLS policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## ⚖️ Responsabilità

**Chi viola questa regola deve:**
1. Spiegare al team perché ha creato una nuova migrazione
2. Risolvere eventuali conflitti causati  
3. Pagare un caffè a tutto il team ☕

## 📞 Contatti

Per dubbi o emergenze schema:
- Discuti nel team prima di modificare qualsiasi cosa
- Documenta ogni modifica nel changelog del progetto

---

**🎯 RICORDA: Schema stabile = App stabile = Utenti felici** 