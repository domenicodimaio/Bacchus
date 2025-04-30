-- Creazione della tabella user_sessions per memorizzare le sessioni degli utenti
CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "profile_id" TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "start_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "end_time" TIMESTAMP WITH TIME ZONE,
  "status" TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creazione della tabella profile_history per tracciare i cambiamenti dei profili
CREATE TABLE IF NOT EXISTS "public"."profile_history" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "profile_id" TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "change_type" TEXT NOT NULL, -- create, update, delete
  "changes" JSONB, -- JSON con i cambiamenti
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creazione degli indici per le query più comuni
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON "public"."user_sessions"(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_profile_id_idx ON "public"."user_sessions"(profile_id);
CREATE INDEX IF NOT EXISTS profile_history_profile_id_idx ON "public"."profile_history"(profile_id);

-- Aggiungiamo un campo last_profile_id alla tabella users di Supabase
ALTER TABLE "auth"."users" 
ADD COLUMN IF NOT EXISTS "last_profile_id" TEXT REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Creazione di una funzione trigger per aggiornare updated_at quando una sessione viene modificata
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Creazione di un trigger per aggiornare updated_at quando user_sessions viene modificato
CREATE TRIGGER update_user_sessions_updated_at
BEFORE UPDATE ON "public"."user_sessions"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Creazione di un trigger per aggiornare updated_at quando profiles viene modificato
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON "public"."profiles"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Creazione di una funzione trigger per registrare la storia dei profili
CREATE OR REPLACE FUNCTION log_profile_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO profile_history (profile_id, user_id, change_type, changes)
    VALUES (NEW.id, NEW.user_id, 'create', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    -- Creare un nuovo oggetto JSON con solo i campi che sono cambiati
    INSERT INTO profile_history (profile_id, user_id, change_type, changes)
    VALUES (
      NEW.id, 
      NEW.user_id, 
      'update', 
      jsonb_build_object(
        'name', CASE WHEN NEW.name <> OLD.name THEN NEW.name ELSE NULL END,
        'gender', CASE WHEN NEW.gender <> OLD.gender THEN NEW.gender ELSE NULL END,
        'weightKg', CASE WHEN NEW.weightKg <> OLD.weightKg THEN NEW.weightKg ELSE NULL END,
        'age', CASE WHEN NEW.age <> OLD.age THEN NEW.age ELSE NULL END,
        'height', CASE WHEN NEW.height <> OLD.height THEN NEW.height ELSE NULL END,
        'drinkingFrequency', CASE WHEN NEW.drinkingFrequency <> OLD.drinkingFrequency THEN NEW.drinkingFrequency ELSE NULL END,
        'emoji', CASE WHEN NEW.emoji <> OLD.emoji THEN NEW.emoji ELSE NULL END,
        'color', CASE WHEN NEW.color <> OLD.color THEN NEW.color ELSE NULL END,
        'is_default', CASE WHEN NEW.is_default <> OLD.is_default THEN NEW.is_default ELSE NULL END,
        'updated_at', NEW.updated_at
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO profile_history (profile_id, user_id, change_type, changes)
    VALUES (OLD.id, OLD.user_id, 'delete', to_jsonb(OLD));
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Creazione di un trigger per registrare la storia dei profili
CREATE TRIGGER log_profile_changes
AFTER INSERT OR UPDATE OR DELETE ON "public"."profiles"
FOR EACH ROW
EXECUTE FUNCTION log_profile_history();

-- Policies per l'accesso sicuro alla tabella user_sessions
ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own sessions
CREATE POLICY "Users can view their own sessions" 
ON "public"."user_sessions" FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy to allow users to create their own sessions
CREATE POLICY "Users can create their own sessions" 
ON "public"."user_sessions" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own sessions
CREATE POLICY "Users can update their own sessions" 
ON "public"."user_sessions" FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own sessions
CREATE POLICY "Users can delete their own sessions" 
ON "public"."user_sessions" FOR DELETE 
USING (auth.uid() = user_id);

-- Policies per l'accesso sicuro alla tabella profile_history
ALTER TABLE "public"."profile_history" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own profile history
CREATE POLICY "Users can view their own profile history" 
ON "public"."profile_history" FOR SELECT 
USING (auth.uid() = user_id);

-- Funzioni per gestire automaticamente le sessioni

-- Funzione per iniziare una nuova sessione
CREATE OR REPLACE FUNCTION start_user_session(
  profile_id TEXT
) RETURNS UUID AS $$
DECLARE
  new_session_id UUID;
BEGIN
  INSERT INTO public.user_sessions (user_id, profile_id, status)
  VALUES (auth.uid(), profile_id, 'active')
  RETURNING id INTO new_session_id;
  
  RETURN new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per terminare una sessione
CREATE OR REPLACE FUNCTION end_user_session(
  session_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.user_sessions
  SET status = 'completed', end_time = NOW()
  WHERE id = session_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 