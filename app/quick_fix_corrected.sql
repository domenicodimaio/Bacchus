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
  ADD COLUMN IF NOT EXISTS "_h" TEXT;
  
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

-- Funzione per creare la tabella dei profili
CREATE OR REPLACE FUNCTION create_profiles_table()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create the table if it doesn't exist
  CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" TEXT PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "weightKg" NUMERIC NOT NULL,
    "age" INTEGER NOT NULL,
    "height" NUMERIC NOT NULL,
    "drinkingFrequency" TEXT NOT NULL,
    "color" TEXT,
    "_h" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  -- Create indexes
  CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
  
  -- Enable Row Level Security
  ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
  
  -- Create policies
  BEGIN
    CREATE POLICY "Users can view their own profiles" 
    ON "public"."profiles" FOR SELECT 
    USING (auth.uid() = user_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Users can create their own profiles" 
    ON "public"."profiles" FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Users can update their own profiles" 
    ON "public"."profiles" FOR UPDATE 
    USING (auth.uid() = user_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Users can delete their own profiles" 
    ON "public"."profiles" FOR DELETE 
    USING (auth.uid() = user_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating profiles table: %', SQLERRM;
    RETURN false;
END;
$$;

-- Soluzione radicale: Crea o aggiorna la tabella con tutte le colonne necessarie
-- NOTA: Questa versione è semplificata e non usa la verifica delle policy che causa errori

-- Crea la tabella se non esiste
CREATE TABLE IF NOT EXISTS "public"."profiles" (
  "id" TEXT PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "gender" TEXT NOT NULL,
  "weightKg" NUMERIC NOT NULL,
  "age" INTEGER NOT NULL,
  "height" NUMERIC NOT NULL,
  "drinkingFrequency" TEXT NOT NULL,
  "color" TEXT,
  "_h" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crea gli indici
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON "public"."profiles"(user_id);

-- Abilita Row Level Security
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- Crea le policy di sicurezza senza verifiche di esistenza (gestirà eventuali duplicati con TRY-CATCH)
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Users can view their own profiles" 
    ON "public"."profiles" FOR SELECT 
    USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN
    -- La policy esiste già, va bene così
  END;
END $$;

DO $$
BEGIN
  BEGIN
    CREATE POLICY "Users can create their own profiles" 
    ON "public"."profiles" FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN
    -- La policy esiste già, va bene così
  END;
END $$;

DO $$
BEGIN
  BEGIN
    CREATE POLICY "Users can update their own profiles" 
    ON "public"."profiles" FOR UPDATE 
    USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN
    -- La policy esiste già, va bene così
  END;
END $$;

DO $$
BEGIN
  BEGIN
    CREATE POLICY "Users can delete their own profiles" 
    ON "public"."profiles" FOR DELETE 
    USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN
    -- La policy esiste già, va bene così
  END;
END $$;

-- Aggiungi le colonne mancanti per sicurezza
ALTER TABLE IF EXISTS "public"."profiles" 
ADD COLUMN IF NOT EXISTS "color" TEXT,
ADD COLUMN IF NOT EXISTS "_h" TEXT; 