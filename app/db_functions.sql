-- Funzione per aggiungere le colonne mancanti
CREATE OR REPLACE FUNCTION add_missing_columns()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Aggiungi le colonne mancanti
  ALTER TABLE IF EXISTS "public"."profiles" 
  ADD COLUMN IF NOT EXISTS "color" TEXT,
  ADD COLUMN IF NOT EXISTS "emoji" TEXT,
  ADD COLUMN IF NOT EXISTS "_h" TEXT,
  ADD COLUMN IF NOT EXISTS "_i" TEXT,
  ADD COLUMN IF NOT EXISTS "_j" TEXT;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Errore durante l''aggiunta delle colonne: %', SQLERRM;
    RETURN false;
END;
$$;

-- Funzione per eseguire SQL dinamico
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Errore durante l''esecuzione della query: %', SQLERRM;
END;
$$; 