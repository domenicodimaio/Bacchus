-- Migrazione per correggere la struttura delle tabelle per Bacchus
-- Risolve i problemi di chiave esterna nella tabella sessions

-- 1. Elimina la tabella sessions esistente se presente
DROP TABLE IF EXISTS "public"."sessions";

-- 2. Verifica la tabella dei profili
DO $$
BEGIN
  -- Assicurati che la tabella profiles abbia l'ID come PRIMARY KEY
  IF NOT EXISTS (
    SELECT FROM information_schema.table_constraints 
    WHERE constraint_type = 'PRIMARY KEY' 
    AND table_name = 'profiles'
  ) THEN
    -- Se non c'è una chiave primaria sulla tabella profiles, aggiungila
    ALTER TABLE profiles ADD PRIMARY KEY (id);
  END IF;
END
$$;

-- 3. Crea la tabella sessions con riferimento corretto ai profili
CREATE TABLE "public"."sessions" (
  "id" TEXT PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "profile_id" TEXT NOT NULL,  -- Riferimento al profilo ma senza vincolo di chiave esterna per ora
  "data" JSONB NOT NULL,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crea indici per query comuni
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON "public"."sessions"(user_id);
CREATE INDEX IF NOT EXISTS sessions_profile_id_idx ON "public"."sessions"(profile_id);
CREATE INDEX IF NOT EXISTS sessions_is_active_idx ON "public"."sessions"(is_active);
CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON "public"."sessions"(created_at);

-- 5. Crea trigger per aggiornare automatically updated_at
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON "public"."sessions"
FOR EACH ROW
EXECUTE FUNCTION update_sessions_updated_at();

-- 6. Configura le politiche di sicurezza Row Level Security
ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;

-- 7. Definisci le politiche RLS
CREATE POLICY "Users can view their own sessions" 
ON "public"."sessions" FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" 
ON "public"."sessions" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON "public"."sessions" FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" 
ON "public"."sessions" FOR DELETE 
USING (auth.uid() = user_id);

-- 8. Aggiorna la cache dello schema di PostgREST
NOTIFY pgrst, 'reload schema'; 