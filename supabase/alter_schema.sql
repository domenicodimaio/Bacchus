-- Aggiungi la colonna has_completed_wizard alla tabella profiles 
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "has_completed_wizard" BOOLEAN DEFAULT false;

-- Aggiorna gli indici per migliorare le prestazioni
CREATE INDEX IF NOT EXISTS profiles_has_completed_wizard_idx ON profiles(has_completed_wizard);

-- Aggiorna i permessi per consentire l'aggiornamento di this campo
GRANT UPDATE(has_completed_wizard) ON profiles TO authenticated; 