-- =============================================
-- MIGRAZIONE: LIMITI SESSIONI GRATUITE PER UTENTE
-- =============================================
-- Questa migrazione crea una tabella per gestire i limiti delle sessioni
-- gratuite settimanali per ogni utente, sostituendo il sistema locale AsyncStorage
-- con una soluzione basata sul database collegata all'account.

-- Creazione della tabella per i limiti settimanali degli utenti
CREATE TABLE IF NOT EXISTS "public"."user_weekly_limits" (
  "user_id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "sessions_count" INTEGER NOT NULL DEFAULT 0,
  "week_start_date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "last_session_date" DATE DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS user_weekly_limits_user_id_idx ON "public"."user_weekly_limits"(user_id);
CREATE INDEX IF NOT EXISTS user_weekly_limits_week_start_idx ON "public"."user_weekly_limits"(week_start_date);

-- Funzione per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_user_weekly_limits_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per updated_at (rimuovi se esiste, poi ricrea)
DROP TRIGGER IF EXISTS update_user_weekly_limits_updated_at ON "public"."user_weekly_limits";
CREATE TRIGGER update_user_weekly_limits_updated_at
BEFORE UPDATE ON "public"."user_weekly_limits"
FOR EACH ROW
EXECUTE FUNCTION update_user_weekly_limits_updated_at_column();

-- RLS Policies
ALTER TABLE "public"."user_weekly_limits" ENABLE ROW LEVEL SECURITY;

-- Rimuovi policies esistenti se ci sono
DROP POLICY IF EXISTS "Users can view their own weekly limits" ON "public"."user_weekly_limits";
DROP POLICY IF EXISTS "Users can insert their own weekly limits" ON "public"."user_weekly_limits";
DROP POLICY IF EXISTS "Users can update their own weekly limits" ON "public"."user_weekly_limits";

CREATE POLICY "Users can view their own weekly limits" 
ON "public"."user_weekly_limits" FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly limits" 
ON "public"."user_weekly_limits" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly limits" 
ON "public"."user_weekly_limits" FOR UPDATE 
USING (auth.uid() = user_id);

-- =============================================
-- FUNZIONI HELPER PER GESTIONE SESSIONI
-- =============================================

-- Rimuovi funzioni esistenti per assicurarsi versioni aggiornate
DROP FUNCTION IF EXISTS reset_weekly_sessions_if_needed(UUID);
DROP FUNCTION IF EXISTS increment_user_session_count(UUID);
DROP FUNCTION IF EXISTS get_remaining_sessions(UUID);

-- Funzione per resettare il contatore settimanale se necessario
CREATE OR REPLACE FUNCTION reset_weekly_sessions_if_needed(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_week_start DATE;
  user_record RECORD;
  sessions_count INTEGER;
BEGIN
  -- Calcola l'inizio della settimana corrente (lunedì)
  current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  
  -- Ottieni il record dell'utente
  SELECT * INTO user_record 
  FROM user_weekly_limits 
  WHERE user_id = p_user_id;
  
  -- Se l'utente non esiste, crealo
  IF NOT FOUND THEN
    INSERT INTO user_weekly_limits (user_id, sessions_count, week_start_date)
    VALUES (p_user_id, 0, current_week_start);
    RETURN 0;
  END IF;
  
  -- Se è una nuova settimana, resetta il contatore
  IF user_record.week_start_date < current_week_start THEN
    UPDATE user_weekly_limits 
    SET sessions_count = 0, 
        week_start_date = current_week_start,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN 0;
  END IF;
  
  -- Altrimenti ritorna il contatore attuale
  RETURN user_record.sessions_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per incrementare il contatore sessioni
CREATE OR REPLACE FUNCTION increment_user_session_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Prima controlla e resetta se necessario
  PERFORM reset_weekly_sessions_if_needed(p_user_id);
  
  -- Incrementa il contatore (max 2 per utenti free)
  UPDATE user_weekly_limits 
  SET sessions_count = LEAST(sessions_count + 1, 2),
      last_session_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING sessions_count INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per ottenere le sessioni rimanenti
CREATE OR REPLACE FUNCTION get_remaining_sessions(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Controlla e resetta se necessario, poi ottieni il contatore
  current_count := reset_weekly_sessions_if_needed(p_user_id);
  
  -- Ritorna le sessioni rimanenti (2 - contatore attuale)
  RETURN GREATEST(0, 2 - current_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTI E LOGGING
-- =============================================

-- Commenti (safe per re-esecuzione)
DO $$
BEGIN
  -- Commenti tabella e colonne
  PERFORM pg_catalog.obj_description('"public"."user_weekly_limits"'::regclass, 'pg_class');
  
  COMMENT ON TABLE "public"."user_weekly_limits" IS 
  'Tabella per gestire i limiti delle sessioni gratuite settimanali per ogni utente. Sostituisce il sistema AsyncStorage locale con una soluzione database collegata all''account.';

  COMMENT ON COLUMN "public"."user_weekly_limits"."sessions_count" IS 
  'Numero di sessioni utilizzate questa settimana (max 2 per utenti free)';

  COMMENT ON COLUMN "public"."user_weekly_limits"."week_start_date" IS 
  'Data di inizio della settimana corrente (lunedì)';

  -- Commenti funzioni (se esistono)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reset_weekly_sessions_if_needed') THEN
    COMMENT ON FUNCTION reset_weekly_sessions_if_needed(UUID) IS 
    'Controlla se è una nuova settimana e resetta il contatore se necessario';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_user_session_count') THEN
    COMMENT ON FUNCTION increment_user_session_count(UUID) IS 
    'Incrementa il contatore delle sessioni per l''utente (max 2)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_remaining_sessions') THEN
    COMMENT ON FUNCTION get_remaining_sessions(UUID) IS 
    'Ritorna il numero di sessioni gratuite rimanenti per l''utente';
  END IF;
END $$;

-- Migrazione completata: user_weekly_limits table e funzioni create 