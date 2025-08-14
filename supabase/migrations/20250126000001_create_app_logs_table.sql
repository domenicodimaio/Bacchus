-- Crea la tabella per i log dell'applicazione
CREATE TABLE IF NOT EXISTS app_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
  message TEXT NOT NULL,
  category TEXT,
  metadata JSONB,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_info JSONB,
  app_version TEXT,
  timestamp TIMESTAMPTZ
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);
CREATE INDEX IF NOT EXISTS idx_app_logs_user_id ON app_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_app_logs_category ON app_logs(category);

-- RLS policies
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di inserire i propri log
CREATE POLICY "Users can insert their own logs" ON app_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

-- Policy per permettere agli admin di leggere tutti i log
CREATE POLICY "Admins can read all logs" ON app_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Policy per permettere agli utenti di leggere i propri log
CREATE POLICY "Users can read their own logs" ON app_logs
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Funzione per pulire vecchi log (mantieni solo ultimi 30 giorni)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM app_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crea un trigger per pulire automaticamente i vecchi log
-- (da eseguire manualmente o con un cron job)
COMMENT ON FUNCTION cleanup_old_logs() IS 'Pulisce i log più vecchi di 30 giorni'; 