-- Script per reimpostare l'intero database Bacchus
-- Rimuovi le tabelle esistenti se ci sono
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.profile_history CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Ricrea la tabella dei profili
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  "weightKg" NUMERIC NOT NULL,
  age INTEGER NOT NULL,
  height NUMERIC NOT NULL,
  "drinkingFrequency" TEXT NOT NULL CHECK ("drinkingFrequency" IN ('rarely', 'occasionally', 'regularly', 'frequently')),
  emoji TEXT DEFAULT NULL,
  color TEXT DEFAULT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crea indici per la tabella dei profili
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

-- Crea la tabella per le sessioni degli utenti
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crea la tabella per la cronologia dei profili
CREATE TABLE IF NOT EXISTS public.profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL, -- create, update, delete
  changes JSONB, -- JSON con i cambiamenti
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crea indici per le query comuni
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_profile_id_idx ON public.user_sessions(profile_id);
CREATE INDEX IF NOT EXISTS profile_history_profile_id_idx ON public.profile_history(profile_id);

-- Aggiungi un campo last_profile_id alla tabella users di Supabase
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS last_profile_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Imposta automaticamente la data di aggiornamento
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare la data di modifica
CREATE TRIGGER update_user_sessions_updated_at
BEFORE UPDATE ON public.user_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Funzione per registrare la storia dei profili
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
        'weightKg', CASE WHEN NEW."weightKg" <> OLD."weightKg" THEN NEW."weightKg" ELSE NULL END,
        'age', CASE WHEN NEW.age <> OLD.age THEN NEW.age ELSE NULL END,
        'height', CASE WHEN NEW.height <> OLD.height THEN NEW.height ELSE NULL END,
        'drinkingFrequency', CASE WHEN NEW."drinkingFrequency" <> OLD."drinkingFrequency" THEN NEW."drinkingFrequency" ELSE NULL END,
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

-- Trigger per registrare la storia dei profili
CREATE TRIGGER log_profile_changes
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION log_profile_history();

-- Abilita Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_history ENABLE ROW LEVEL SECURITY;

-- Policies per i profili
CREATE POLICY "Users can view their own profiles" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles" 
ON public.profiles FOR DELETE 
USING (auth.uid() = user_id);

-- Policies per le sessioni
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
ON public.user_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.user_sessions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" 
ON public.user_sessions FOR DELETE 
USING (auth.uid() = user_id);

-- Policies per la cronologia
CREATE POLICY "Users can view their own profile history" 
ON public.profile_history FOR SELECT 
USING (auth.uid() = user_id);

-- NUOVA POLICY: Permette trigger di inserire nella cronologia
CREATE POLICY "Allow trigger-based inserts to profile history"
ON public.profile_history FOR INSERT
WITH CHECK (true);

-- Funzioni per gestire le sessioni
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