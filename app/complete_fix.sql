-- SOLUZIONE DEFINITIVA COMPLETA:
-- 1. Elimina la tabella se esiste
-- 2. Ricrea la tabella con TUTTE le colonne necessarie

-- Fase 1: Elimina la tabella esistente
DROP TABLE IF EXISTS "public"."profiles";

-- Fase 2: Crea la tabella con tutte le colonne necessarie
CREATE TABLE "public"."profiles" (
  "id" TEXT PRIMARY KEY,
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