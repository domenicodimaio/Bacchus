-- SOLUZIONE DEFINITIVA: 
-- 1. Elimina la tabella se esiste (per un reset completo)
-- 2. Ricrea la tabella con TUTTE le colonne necessarie
-- 3. Imposta correttamente le policy di sicurezza

-- Fase 1: Elimina la tabella esistente
DROP TABLE IF EXISTS "public"."profiles";

-- Fase 2: Crea la tabella con tutte le colonne necessarie
CREATE TABLE IF NOT EXISTS "public"."profiles" (
  "id" TEXT PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "gender" TEXT NOT NULL,
  "weightKg" NUMERIC NOT NULL,
  "age" INTEGER NOT NULL,
  "height" NUMERIC NOT NULL,
  "drinkingFrequency" TEXT NOT NULL,
  "color" TEXT,
  "_h" TEXT,
  "_i" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fase 3: Crea gli indici necessari
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON "public"."profiles"(user_id);

-- Fase 4: Abilita Row Level Security
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- Fase 5: Crea le policy di sicurezza
BEGIN;
  -- Elimina le policy esistenti se ci sono
  DROP POLICY IF EXISTS "Users can view their own profiles" ON "public"."profiles";
  DROP POLICY IF EXISTS "Users can create their own profiles" ON "public"."profiles";
  DROP POLICY IF EXISTS "Users can update their own profiles" ON "public"."profiles";
  DROP POLICY IF EXISTS "Users can delete their own profiles" ON "public"."profiles";
  
  -- Crea le policy necessarie
  CREATE POLICY "Users can view their own profiles" 
  ON "public"."profiles" FOR SELECT 
  USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can create their own profiles" 
  ON "public"."profiles" FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Users can update their own profiles" 
  ON "public"."profiles" FOR UPDATE 
  USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can delete their own profiles" 
  ON "public"."profiles" FOR DELETE 
  USING (auth.uid() = user_id);
COMMIT;

-- Funzione per aggiungere colonne mancanti (utile per il futuro)
CREATE OR REPLACE FUNCTION add_missing_columns()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Aggiungi le colonne mancanti
  ALTER TABLE IF EXISTS "public"."profiles" 
  ADD COLUMN IF NOT EXISTS "color" TEXT,
  ADD COLUMN IF NOT EXISTS "_h" TEXT,
  ADD COLUMN IF NOT EXISTS "_i" TEXT;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Errore durante l''aggiunta delle colonne: %', SQLERRM;
    RETURN false;
END;
$$; 