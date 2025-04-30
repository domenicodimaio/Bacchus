-- SOLUZIONE DEFINITIVA COMPLETA (V2):
-- 1. Eliminazione delle sessioni sul server
-- 2. Creazione di trigger per prevenire ID null
-- 3. Ricostruzione completa della tabella con tutte le colonne

-- Fase 0: Eliminazione delle sessioni attive sul server
DELETE FROM auth.sessions;

-- Fase 1: Elimina la tabella se esiste
DROP TABLE IF EXISTS "public"."profiles";

-- Fase 2: Crea la tabella con tutte le colonne necessarie
CREATE TABLE "public"."profiles" (
  "id" TEXT NOT NULL PRIMARY KEY, -- Vincolo NOT NULL esplicito
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "gender" TEXT NOT NULL,
  "weightKg" NUMERIC NOT NULL,
  "age" INTEGER NOT NULL,
  "height" NUMERIC NOT NULL,
  "drinkingFrequency" TEXT NOT NULL,
  "color" TEXT,
  "emoji" TEXT,
  "_h" TEXT,
  "_i" TEXT,
  "_j" TEXT,
  "_k" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fase 3: Crea gli indici necessari
CREATE INDEX "profiles_user_id_idx" ON "public"."profiles"("user_id");

-- Fase 4: Abilita Row Level Security
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- Fase 5: Crea le policy di sicurezza
BEGIN;
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

-- Fase 6: Crea un trigger per assicurarsi che l'ID non sia mai NULL
CREATE OR REPLACE FUNCTION ensure_profile_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id = CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS TEXT);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_profile_id_trigger ON public.profiles;
CREATE TRIGGER ensure_profile_id_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION ensure_profile_id(); 