-- Creazione della tabella per le sessioni attive dell'utente
CREATE TABLE IF NOT EXISTS "public"."active_sessions" (
  "id" TEXT PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "profile_id" TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "session_data" JSONB NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creazione della tabella per la cronologia delle sessioni
CREATE TABLE IF NOT EXISTS "public"."session_history" (
  "id" TEXT PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "profile_id" TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "session_data" JSONB NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creazione degli indici per le query più comuni
CREATE INDEX IF NOT EXISTS active_sessions_user_id_idx ON "public"."active_sessions"(user_id);
CREATE INDEX IF NOT EXISTS active_sessions_profile_id_idx ON "public"."active_sessions"(profile_id);
CREATE INDEX IF NOT EXISTS session_history_user_id_idx ON "public"."session_history"(user_id);
CREATE INDEX IF NOT EXISTS session_history_profile_id_idx ON "public"."session_history"(profile_id);

-- Creazione di una funzione trigger per aggiornare updated_at quando una sessione viene modificata
CREATE OR REPLACE FUNCTION update_session_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Creazione di un trigger per aggiornare updated_at quando active_sessions viene modificato
CREATE TRIGGER update_active_sessions_updated_at
BEFORE UPDATE ON "public"."active_sessions"
FOR EACH ROW
EXECUTE FUNCTION update_session_updated_at_column();

-- Creazione di un trigger per aggiornare updated_at quando session_history viene modificato
CREATE TRIGGER update_session_history_updated_at
BEFORE UPDATE ON "public"."session_history"
FOR EACH ROW
EXECUTE FUNCTION update_session_updated_at_column();

-- Configurazione RLS (Row Level Security)
ALTER TABLE "public"."active_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."session_history" ENABLE ROW LEVEL SECURITY;

-- Politiche RLS per active_sessions
CREATE POLICY "Users can view their own active sessions" 
ON "public"."active_sessions" FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own active sessions" 
ON "public"."active_sessions" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own active sessions" 
ON "public"."active_sessions" FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own active sessions" 
ON "public"."active_sessions" FOR DELETE 
USING (auth.uid() = user_id);

-- Politiche RLS per session_history
CREATE POLICY "Users can view their own session history" 
ON "public"."session_history" FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own session history" 
ON "public"."session_history" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own session history" 
ON "public"."session_history" FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own session history" 
ON "public"."session_history" FOR DELETE 
USING (auth.uid() = user_id);
