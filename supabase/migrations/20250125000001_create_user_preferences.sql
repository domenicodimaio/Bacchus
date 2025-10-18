-- Creazione della tabella user_preferences per salvare le preferenze utente
-- Data: 2025-01-25
-- Scopo: Salvare lo stato premium e altre preferenze utente per persistenza tra riavvii

-- Crea la tabella user_preferences
CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "premium_status" BOOLEAN DEFAULT FALSE,
  "preferences" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Vincolo di unicità per user_id
  CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
);

-- Crea indici per performance
CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON "public"."user_preferences"(user_id);
CREATE INDEX IF NOT EXISTS user_preferences_premium_status_idx ON "public"."user_preferences"(premium_status);

-- Enable Row Level Security
ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di vedere solo le proprie preferenze
CREATE POLICY "Users can view their own preferences" 
ON "public"."user_preferences" FOR SELECT 
USING (auth.uid() = user_id);

-- Policy per permettere agli utenti di creare le proprie preferenze
CREATE POLICY "Users can create their own preferences" 
ON "public"."user_preferences" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy per permettere agli utenti di aggiornare le proprie preferenze
CREATE POLICY "Users can update their own preferences" 
ON "public"."user_preferences" FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy per permettere agli utenti di eliminare le proprie preferenze
CREATE POLICY "Users can delete their own preferences" 
ON "public"."user_preferences" FOR DELETE 
USING (auth.uid() = user_id);

-- Funzione trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare updated_at automaticamente
CREATE TRIGGER user_preferences_updated_at_trigger
  BEFORE UPDATE ON "public"."user_preferences"
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Commenti per documentazione
COMMENT ON TABLE "public"."user_preferences" IS 'Tabella per salvare le preferenze utente, incluso lo stato premium';
COMMENT ON COLUMN "public"."user_preferences"."premium_status" IS 'Stato premium dell''utente (true/false)';
COMMENT ON COLUMN "public"."user_preferences"."preferences" IS 'JSON con altre preferenze utente';
