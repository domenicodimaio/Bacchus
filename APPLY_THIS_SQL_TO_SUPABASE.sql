-- =====================================
-- 🚀 MIGRAZIONE SUPABASE: PREFERITI E RECENTI
-- =====================================
-- ISTRUZIONI:
-- 1. Vai su Supabase Dashboard
-- 2. Seleziona il progetto Bacchus
-- 3. Vai su "SQL Editor"
-- 4. Copia e incolla TUTTO questo file
-- 5. Clicca "Run"
-- =====================================

-- =====================================
-- STEP 1: CREA TABELLA FAVORITE_DRINKS
-- =====================================
CREATE TABLE IF NOT EXISTS "public"."favorite_drinks" (
    -- Identificatori
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Dati bevanda
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL CHECK (category IN ('beer', 'wine', 'spirits', 'cocktail', 'other')),
    "volume" NUMERIC NOT NULL, -- ml
    "percentage" NUMERIC NOT NULL, -- % alcol
    
    -- Metadati UI
    "icon" TEXT,
    "icon_color" TEXT,
    
    -- Timestamp
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================
-- STEP 2: CREA TABELLA RECENT_DRINKS
-- =====================================
CREATE TABLE IF NOT EXISTS "public"."recent_drinks" (
    -- Identificatori
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Dati bevanda
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL CHECK (category IN ('beer', 'wine', 'spirits', 'cocktail', 'other')),
    "volume" NUMERIC NOT NULL, -- ml
    "percentage" NUMERIC NOT NULL, -- % alcol
    
    -- Metadati UI
    "icon" TEXT,
    "icon_color" TEXT,
    
    -- Tracking utilizzo
    "usage_count" INTEGER DEFAULT 1 NOT NULL,
    "last_used" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Timestamp
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================
-- STEP 3: CREA INDICI OTTIMIZZATI
-- =====================================

-- Favorite drinks
CREATE INDEX IF NOT EXISTS favorite_drinks_user_id_idx ON favorite_drinks(user_id);
CREATE INDEX IF NOT EXISTS favorite_drinks_created_at_idx ON favorite_drinks(created_at DESC);

-- Recent drinks
CREATE INDEX IF NOT EXISTS recent_drinks_user_id_idx ON recent_drinks(user_id);
CREATE INDEX IF NOT EXISTS recent_drinks_last_used_idx ON recent_drinks(last_used DESC);
CREATE INDEX IF NOT EXISTS recent_drinks_usage_count_idx ON recent_drinks(usage_count DESC);

-- =====================================
-- STEP 4: ABILITA ROW LEVEL SECURITY
-- =====================================

-- Enable RLS
ALTER TABLE "favorite_drinks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recent_drinks" ENABLE ROW LEVEL SECURITY;

-- =====================================
-- STEP 5: CREA POLICIES PER FAVORITE_DRINKS
-- =====================================

-- Drop existing policies se esistono
DROP POLICY IF EXISTS "Users can view their own favorite drinks" ON favorite_drinks;
DROP POLICY IF EXISTS "Users can insert their own favorite drinks" ON favorite_drinks;
DROP POLICY IF EXISTS "Users can update their own favorite drinks" ON favorite_drinks;
DROP POLICY IF EXISTS "Users can delete their own favorite drinks" ON favorite_drinks;

-- Crea policies
CREATE POLICY "Users can view their own favorite drinks" 
ON "favorite_drinks" FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorite drinks" 
ON "favorite_drinks" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorite drinks" 
ON "favorite_drinks" FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite drinks" 
ON "favorite_drinks" FOR DELETE 
USING (auth.uid() = user_id);

-- =====================================
-- STEP 6: CREA POLICIES PER RECENT_DRINKS
-- =====================================

-- Drop existing policies se esistono
DROP POLICY IF EXISTS "Users can view their own recent drinks" ON recent_drinks;
DROP POLICY IF EXISTS "Users can insert their own recent drinks" ON recent_drinks;
DROP POLICY IF EXISTS "Users can update their own recent drinks" ON recent_drinks;
DROP POLICY IF EXISTS "Users can delete their own recent drinks" ON recent_drinks;

-- Crea policies
CREATE POLICY "Users can view their own recent drinks" 
ON "recent_drinks" FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recent drinks" 
ON "recent_drinks" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recent drinks" 
ON "recent_drinks" FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recent drinks" 
ON "recent_drinks" FOR DELETE 
USING (auth.uid() = user_id);

-- =====================================
-- STEP 7: CREA TRIGGER PER UPDATED_AT
-- =====================================

-- Funzione per favorite_drinks
CREATE OR REPLACE FUNCTION update_favorite_drinks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per favorite_drinks
DROP TRIGGER IF EXISTS trigger_favorite_drinks_updated_at ON favorite_drinks;
CREATE TRIGGER trigger_favorite_drinks_updated_at
    BEFORE UPDATE ON favorite_drinks
    FOR EACH ROW
    EXECUTE FUNCTION update_favorite_drinks_updated_at();

-- Funzione per recent_drinks
CREATE OR REPLACE FUNCTION update_recent_drinks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per recent_drinks
DROP TRIGGER IF EXISTS trigger_recent_drinks_updated_at ON recent_drinks;
CREATE TRIGGER trigger_recent_drinks_updated_at
    BEFORE UPDATE ON recent_drinks
    FOR EACH ROW
    EXECUTE FUNCTION update_recent_drinks_updated_at();

-- =====================================
-- STEP 8: AGGIUNGI COMMENTI DOCUMENTAZIONE
-- =====================================

COMMENT ON TABLE favorite_drinks IS 'Bevande preferite degli utenti - sincronizzate multi-dispositivo';
COMMENT ON TABLE recent_drinks IS 'Bevande recenti degli utenti con tracking utilizzo - sincronizzate multi-dispositivo';

COMMENT ON COLUMN favorite_drinks.user_id IS 'Riferimento all''utente proprietario';
COMMENT ON COLUMN favorite_drinks.category IS 'Categoria bevanda: beer, wine, spirits, cocktail, other';
COMMENT ON COLUMN favorite_drinks.volume IS 'Volume in millilitri';
COMMENT ON COLUMN favorite_drinks.percentage IS 'Percentuale alcol';

COMMENT ON COLUMN recent_drinks.usage_count IS 'Numero di volte che la bevanda è stata usata';
COMMENT ON COLUMN recent_drinks.last_used IS 'Ultima volta che la bevanda è stata aggiunta';

-- =====================================
-- ✅ MIGRAZIONE COMPLETATA!
-- =====================================
-- Verifica che tutto sia andato a buon fine:
-- 1. Vai su "Table Editor"
-- 2. Dovresti vedere "favorite_drinks" e "recent_drinks"
-- 3. Clicca su una tabella → "Policies" → Dovresti vedere 4 policies per tabella
-- 4. Clicca su "Indexes" → Dovresti vedere gli indici creati
-- =====================================

