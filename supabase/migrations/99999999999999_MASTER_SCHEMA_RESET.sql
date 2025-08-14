-- =====================================
-- MIGRAZIONE MASTER DEFINITIVA
-- Data: 2025-01-26
-- =====================================
-- 
-- BASTA con le migrazioni infinite!
-- Questa migrazione risolve definitivamente tutto il casino
-- e stabilisce lo schema finale una volta per tutte.
--
-- NON AGGIUNGERE PIU' MIGRAZIONI DOPO QUESTA!
-- =====================================

-- STEP 1: PULIZIA COMPLETA
-- Rimuove tutte le tabelle esistenti per ricominciare pulito
DROP TABLE IF EXISTS "public"."active_sessions" CASCADE;
DROP TABLE IF EXISTS "public"."session_history" CASCADE;
DROP TABLE IF EXISTS "public"."sessions" CASCADE;
DROP TABLE IF EXISTS "public"."user_sessions" CASCADE;
DROP TABLE IF EXISTS "public"."profile_history" CASCADE;
DROP TABLE IF EXISTS "public"."app_logs" CASCADE;
DROP TABLE IF EXISTS "public"."profiles" CASCADE;

-- Rimuove funzioni duplicate
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_session_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_sessions_updated_at() CASCADE;
DROP FUNCTION IF EXISTS log_profile_history() CASCADE;
DROP FUNCTION IF EXISTS start_user_session(TEXT) CASCADE;
DROP FUNCTION IF EXISTS end_user_session(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_active_session(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_session_history(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_profiles_table() CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_logs() CASCADE;

-- =====================================
-- STEP 2: SCHEMA DEFINITIVO
-- =====================================

-- Funzione universale per updated_at (UNA SOLA VOLTA)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TABELLA PROFILES (Schema finale e definitivo)
CREATE TABLE "public"."profiles" (
    -- Identificatori
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Dati profilo base
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    "weight" NUMERIC NOT NULL, -- Peso in kg
    "age" INTEGER NOT NULL,
    "height" NUMERIC NOT NULL, -- Altezza in cm
    "drinking_frequency" TEXT NOT NULL CHECK (drinking_frequency IN ('rarely', 'occasionally', 'regularly', 'frequently')),
    
    -- Personalizzazione (nomi definitivi)
    "color" TEXT DEFAULT '#00bcd7' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    "emoji" TEXT DEFAULT '🍷',
    
    -- Flags
    "is_default" BOOLEAN DEFAULT FALSE,
    
    -- Timestamp
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- TABELLA SESSIONS (Schema finale e definitivo)
CREATE TABLE "public"."sessions" (
    -- Identificatori
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "profile_id" TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Dati sessione
    "session_data" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Timestamp
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- TABELLA APP_LOGS (Per debug e monitoraggio)
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

-- =====================================
-- STEP 3: INDICI OTTIMIZZATI
-- =====================================

-- Profiles indexes
CREATE INDEX profiles_user_id_idx ON profiles(user_id);
CREATE INDEX profiles_is_default_idx ON profiles(is_default) WHERE is_default = TRUE;

-- Sessions indexes
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_profile_id_idx ON sessions(profile_id);
CREATE INDEX sessions_is_active_idx ON sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX sessions_created_at_idx ON sessions(created_at);

-- App logs indexes
CREATE INDEX app_logs_user_id_idx ON app_logs(user_id);
CREATE INDEX app_logs_level_idx ON app_logs(level);
CREATE INDEX app_logs_created_at_idx ON app_logs(created_at);
CREATE INDEX app_logs_category_idx ON app_logs(category);

-- =====================================
-- STEP 4: TRIGGERS
-- =====================================

-- Auto-update updated_at per profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at per sessions
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================
-- STEP 5: ROW LEVEL SECURITY
-- =====================================

-- Abilita RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profiles_delete_own" ON profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY "sessions_select_own" ON sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own" ON sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_update_own" ON sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sessions_delete_own" ON sessions
    FOR DELETE USING (auth.uid() = user_id);

-- App logs policies (permissive per debugging)
CREATE POLICY "app_logs_insert_own" ON app_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "app_logs_select_own" ON app_logs
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- =====================================
-- STEP 6: FUNZIONI UTILITY
-- =====================================

-- Funzione per ottenere profilo default utente
CREATE OR REPLACE FUNCTION get_default_profile(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    id TEXT,
    name TEXT,
    gender TEXT,
    weight NUMERIC,
    age INTEGER,
    height NUMERIC,
    drinking_frequency TEXT,
    color TEXT,
    emoji TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.name, p.gender, p.weight, p.age, p.height, 
        p.drinking_frequency, p.color, p.emoji
    FROM profiles p
    WHERE p.user_id = p_user_id
      AND p.is_default = TRUE
    LIMIT 1;
END;
$$;

-- Funzione per ottenere sessione attiva
CREATE OR REPLACE FUNCTION get_active_session(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    id TEXT,
    profile_id TEXT,
    session_data JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.profile_id, s.session_data, s.created_at, s.updated_at
    FROM sessions s
    WHERE s.user_id = p_user_id
      AND s.is_active = TRUE
    ORDER BY s.updated_at DESC
    LIMIT 1;
END;
$$;

-- Funzione per pulizia automatica logs vecchi
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM app_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- =====================================
-- STEP 7: COMMENTI DOCUMENTAZIONE
-- =====================================

COMMENT ON TABLE profiles IS 'Profili utente con dati fisici per calcolo BAC';
COMMENT ON COLUMN profiles.weight IS 'Peso in kilogrammi';
COMMENT ON COLUMN profiles.height IS 'Altezza in centimetri';
COMMENT ON COLUMN profiles.color IS 'Colore profilo in formato hex (#RRGGBB)';
COMMENT ON COLUMN profiles.emoji IS 'Emoji identificativa del profilo';

COMMENT ON TABLE sessions IS 'Sessioni di consumo bevande alcoliche';
COMMENT ON COLUMN sessions.session_data IS 'Dati sessione in formato JSON (drinks, food, etc.)';
COMMENT ON COLUMN sessions.is_active IS 'TRUE se sessione in corso, FALSE se completata';

COMMENT ON TABLE app_logs IS 'Log applicazione per debugging e monitoraggio';

-- =====================================
-- STEP 8: NOTIFICA FINE MIGRAZIONE
-- =====================================

-- Refresh schema PostgREST
NOTIFY pgrst, 'reload schema';

-- Log completamento
INSERT INTO app_logs (level, message, category, created_at)
VALUES ('info', 'Master schema migration completed successfully', 'migration', NOW());

-- =====================================
-- FINE MIGRAZIONE MASTER
-- =====================================
--
-- SCHEMA DEFINITIVO CREATO ✅
-- STOP ALLE MIGRAZIONI INFINITE ✅
-- NON AGGIUNGERE PIU' NULLA DOPO QUESTO! ✅
--
-- ===================================== 