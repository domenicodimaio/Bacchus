-- Migrazione per aggiungere il campo has_completed_wizard alla tabella profiles
-- Questo campo serve a memorizzare lo stato di completamento del wizard del profilo

-- Aggiungi la colonna has_completed_wizard se non esiste già
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "has_completed_wizard" BOOLEAN DEFAULT FALSE;

-- Crea un indice per velocizzare le query che filtrano per has_completed_wizard
CREATE INDEX IF NOT EXISTS profiles_has_completed_wizard_idx ON "public"."profiles"(has_completed_wizard); 