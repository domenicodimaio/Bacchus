-- Stored procedure per creare la tabella delle categorie di bevande
CREATE OR REPLACE FUNCTION create_drink_categories_table()
RETURNS void AS $$
BEGIN
  -- Verifica se la tabella esiste già
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'drink_categories'
  ) THEN
    -- Crea la tabella
    CREATE TABLE drink_categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      color TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Crea un indice sulla colonna name
    CREATE INDEX idx_drink_categories_name ON drink_categories(name);
    
    RAISE NOTICE 'Tabella drink_categories creata con successo';
  ELSE
    RAISE NOTICE 'La tabella drink_categories esiste già';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Stored procedure per creare la tabella delle bevande standard
CREATE OR REPLACE FUNCTION create_standard_drinks_table()
RETURNS void AS $$
BEGIN
  -- Verifica se la tabella esiste già
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'standard_drinks'
  ) THEN
    -- Crea la tabella
    CREATE TABLE standard_drinks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      alcohol_percentage FLOAT NOT NULL,
      volume_ml INTEGER NOT NULL,
      image_url TEXT,
      description TEXT,
      is_standard BOOLEAN DEFAULT TRUE,
      alcohol_grams FLOAT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      CONSTRAINT fk_category
        FOREIGN KEY(category)
        REFERENCES drink_categories(name)
        ON DELETE CASCADE
    );
    
    -- Crea indici
    CREATE INDEX idx_standard_drinks_name ON standard_drinks(name);
    CREATE INDEX idx_standard_drinks_category ON standard_drinks(category);
    
    RAISE NOTICE 'Tabella standard_drinks creata con successo';
  ELSE
    RAISE NOTICE 'La tabella standard_drinks esiste già';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Stored procedure per creare la tabella dei profili utente
CREATE OR REPLACE FUNCTION create_user_profiles_table()
RETURNS void AS $$
BEGIN
  -- Verifica se la tabella esiste già
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) THEN
    -- Crea la tabella
    CREATE TABLE user_profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT,
      gender TEXT CHECK (gender IN ('male', 'female', 'other')),
      weight FLOAT,
      height FLOAT,
      birth_date DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Crea un indice sulla colonna id
    CREATE INDEX idx_user_profiles_id ON user_profiles(id);
    
    -- Crea un trigger per aggiornare updated_at
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
    
    RAISE NOTICE 'Tabella user_profiles creata con successo';
  ELSE
    RAISE NOTICE 'La tabella user_profiles esiste già';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Stored procedure per creare la tabella delle sessioni di consumo
CREATE OR REPLACE FUNCTION create_drinking_sessions_table()
RETURNS void AS $$
BEGIN
  -- Verifica se la tabella esiste già
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'drinking_sessions'
  ) THEN
    -- Crea la tabella
    CREATE TABLE drinking_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      end_time TIMESTAMP WITH TIME ZONE,
      location TEXT,
      notes TEXT,
      total_alcohol_grams FLOAT DEFAULT 0,
      max_bac FLOAT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE
    );
    
    -- Crea indici
    CREATE INDEX idx_drinking_sessions_user_id ON drinking_sessions(user_id);
    CREATE INDEX idx_drinking_sessions_start_time ON drinking_sessions(start_time);
    
    -- Crea un trigger per aggiornare updated_at
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON drinking_sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
    
    RAISE NOTICE 'Tabella drinking_sessions creata con successo';
  ELSE
    RAISE NOTICE 'La tabella drinking_sessions esiste già';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Stored procedure per creare la tabella dei consumi di bevande
CREATE OR REPLACE FUNCTION create_drink_consumptions_table()
RETURNS void AS $$
BEGIN
  -- Verifica se la tabella esiste già
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'drink_consumptions'
  ) THEN
    -- Crea la tabella
    CREATE TABLE drink_consumptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      session_id UUID,
      drink_id UUID NOT NULL,
      quantity INTEGER DEFAULT 1,
      consumption_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      alcohol_grams FLOAT NOT NULL,
      custom_volume_ml INTEGER,
      custom_alcohol_percentage FLOAT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE,
        
      CONSTRAINT fk_session
        FOREIGN KEY(session_id)
        REFERENCES drinking_sessions(id)
        ON DELETE SET NULL,
        
      CONSTRAINT fk_drink
        FOREIGN KEY(drink_id)
        REFERENCES standard_drinks(id)
        ON DELETE CASCADE
    );
    
    -- Crea indici
    CREATE INDEX idx_drink_consumptions_user_id ON drink_consumptions(user_id);
    CREATE INDEX idx_drink_consumptions_session_id ON drink_consumptions(session_id);
    CREATE INDEX idx_drink_consumptions_consumption_time ON drink_consumptions(consumption_time);
    
    -- Crea un trigger per aggiornare updated_at
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON drink_consumptions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
    
    RAISE NOTICE 'Tabella drink_consumptions creata con successo';
  ELSE
    RAISE NOTICE 'La tabella drink_consumptions esiste già';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Funzione per aggiornare il timestamp updated_at
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funzione per eseguire query SQL dinamiche
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql; 