-- Migrazione finale per correggere completamente lo schema profiles
-- Data: 2025-01-25

-- Verifica e correzione schema tabella profiles
-- Questo script assicura che la tabella profiles abbia tutti i campi necessari

-- Prima controlla se la tabella esiste
CREATE TABLE IF NOT EXISTS "profiles" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "gender" TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  "weightKg" NUMERIC NOT NULL,
  "age" INTEGER NOT NULL,
  "height" NUMERIC NOT NULL,
  "drinkingFrequency" TEXT NOT NULL CHECK (drinkingFrequency IN ('rarely', 'occasionally', 'regularly', 'frequently')),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aggiunge i campi appearance se non esistono
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS "profileColor" VARCHAR(7) DEFAULT '#00bcd7',
  ADD COLUMN IF NOT EXISTS "profileEmoji" VARCHAR(10) DEFAULT '🍷';

-- Crea indici se non esistono
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

-- Enable Row Level Security
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

-- Drop e ricrea le policy per essere sicuri che siano corrette
DROP POLICY IF EXISTS "Users can view their own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profiles" ON profiles;

-- Crea policy aggiornate
CREATE POLICY "Users can view their own profiles" 
ON "profiles" FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profiles" 
ON "profiles" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles" 
ON "profiles" FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles" 
ON "profiles" FOR DELETE 
USING (auth.uid() = user_id);

-- Crea o sostituisce la funzione di aggiornamento
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop e ricrea il trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Commenti per documentare i campi
COMMENT ON COLUMN profiles."profileColor" IS 'Colore selezionato dall''utente per il profilo (formato hex)';
COMMENT ON COLUMN profiles."profileEmoji" IS 'Emoji selezionata dall''utente per il profilo'; 