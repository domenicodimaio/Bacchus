-- =====================================
-- MIGRAZIONE DI STANDARDIZZAZIONE FINALE (SMART)
-- Data: 2025-01-27
-- =====================================
-- 
-- Risolve definitivamente i conflitti di schema nella tabella profiles
-- INTELLIGENTE: controlla quali colonne esistono prima di migrarle
-- =====================================

BEGIN;

-- STEP 1: BACKUP - Salva i dati esistenti in una tabella temporanea
CREATE TEMP TABLE profiles_backup AS 
SELECT * FROM profiles;

-- STEP 2: CONTROLLO INTELLIGENTE - Verifica quali colonne esistono
DO $$
DECLARE
    has_weightKg BOOLEAN := FALSE;
    has_weight BOOLEAN := FALSE;
    has_drinkingFrequency BOOLEAN := FALSE;
    has_drinking_frequency BOOLEAN := FALSE;
    has_profileColor BOOLEAN := FALSE;
    has_color BOOLEAN := FALSE;
    has_profileEmoji BOOLEAN := FALSE;
    has_emoji BOOLEAN := FALSE;
    has_is_default BOOLEAN := FALSE;
BEGIN
    -- Controlla esistenza colonne
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'weightKg'
    ) INTO has_weightKg;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'weight'
    ) INTO has_weight;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'drinkingFrequency'
    ) INTO has_drinkingFrequency;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'drinking_frequency'
    ) INTO has_drinking_frequency;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'profileColor'
    ) INTO has_profileColor;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'color'
    ) INTO has_color;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'profileEmoji'
    ) INTO has_profileEmoji;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'emoji'
    ) INTO has_emoji;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_default'
    ) INTO has_is_default;

    -- Log dello stato attuale
    RAISE NOTICE 'Schema attuale: weightKg=%, weight=%, drinkingFrequency=%, drinking_frequency=%, profileColor=%, color=%, profileEmoji=%, emoji=%, is_default=%',
        has_weightKg, has_weight, has_drinkingFrequency, has_drinking_frequency, 
        has_profileColor, has_color, has_profileEmoji, has_emoji, has_is_default;

    -- STEP 3: PULIZIA INTELLIGENTE - Rimuovi solo colonne conflittuali che esistono
    IF has_weightKg THEN
        ALTER TABLE profiles DROP COLUMN "weightKg";
        RAISE NOTICE 'Rimossa colonna weightKg';
    END IF;
    
    IF has_drinkingFrequency THEN
        ALTER TABLE profiles DROP COLUMN "drinkingFrequency";
        RAISE NOTICE 'Rimossa colonna drinkingFrequency';
    END IF;
    
    IF has_profileColor THEN
        ALTER TABLE profiles DROP COLUMN "profileColor";
        RAISE NOTICE 'Rimossa colonna profileColor';
    END IF;
    
    IF has_profileEmoji THEN
        ALTER TABLE profiles DROP COLUMN "profileEmoji";
        RAISE NOTICE 'Rimossa colonna profileEmoji';
    END IF;

    -- Rimuovi sempre colonne misteriose
    ALTER TABLE profiles DROP COLUMN IF EXISTS "_h";
    ALTER TABLE profiles DROP COLUMN IF EXISTS "_i";
    ALTER TABLE profiles DROP COLUMN IF EXISTS "_j";
    ALTER TABLE profiles DROP COLUMN IF EXISTS "_k";

    -- STEP 4: STANDARDIZZAZIONE - Assicura schema snake_case corretto
    IF NOT has_weight THEN
        ALTER TABLE profiles ADD COLUMN "weight" NUMERIC;
        RAISE NOTICE 'Aggiunta colonna weight';
    END IF;
    
    IF NOT has_drinking_frequency THEN
        ALTER TABLE profiles ADD COLUMN "drinking_frequency" TEXT;
        RAISE NOTICE 'Aggiunta colonna drinking_frequency';
    END IF;
    
    IF NOT has_color THEN
        ALTER TABLE profiles ADD COLUMN "color" TEXT DEFAULT '#00bcd7';
        RAISE NOTICE 'Aggiunta colonna color';
    END IF;
    
    IF NOT has_emoji THEN
        ALTER TABLE profiles ADD COLUMN "emoji" TEXT DEFAULT '🍷';
        RAISE NOTICE 'Aggiunta colonna emoji';
    END IF;
    
    IF NOT has_is_default THEN
        ALTER TABLE profiles ADD COLUMN "is_default" BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Aggiunta colonna is_default';
    END IF;

    -- STEP 5: MIGRAZIONE DATI INTELLIGENTE
    -- Solo se abbiamo colonne da migrare
    IF has_weightKg OR has_drinkingFrequency OR has_profileColor OR has_profileEmoji THEN
        RAISE NOTICE 'Migrazione dati da schema camelCase...';
        
        UPDATE profiles SET
            weight = CASE 
                WHEN has_weightKg THEN (SELECT "weightKg" FROM profiles_backup WHERE profiles_backup.id = profiles.id)
                ELSE COALESCE(weight, 70)
            END,
            drinking_frequency = CASE 
                WHEN has_drinkingFrequency THEN (SELECT "drinkingFrequency" FROM profiles_backup WHERE profiles_backup.id = profiles.id)
                ELSE COALESCE(drinking_frequency, 'occasionally')
            END,
            color = CASE 
                WHEN has_profileColor THEN (SELECT "profileColor" FROM profiles_backup WHERE profiles_backup.id = profiles.id)
                ELSE COALESCE(color, '#00bcd7')
            END,
            emoji = CASE 
                WHEN has_profileEmoji THEN (SELECT "profileEmoji" FROM profiles_backup WHERE profiles_backup.id = profiles.id)
                ELSE COALESCE(emoji, '🍷')
            END,
            is_default = COALESCE(is_default, FALSE);
    ELSE
        RAISE NOTICE 'Schema già corretto, aggiorno solo valori NULL...';
        
        -- Se schema già corretto, aggiorna solo valori NULL
        UPDATE profiles SET
            weight = COALESCE(weight, 70),
            drinking_frequency = COALESCE(drinking_frequency, 'occasionally'),
            color = COALESCE(color, '#00bcd7'),
            emoji = COALESCE(emoji, '🍷'),
            is_default = COALESCE(is_default, FALSE);
    END IF;
END
$$;

-- STEP 6: VALIDAZIONE - Aggiungi constraints (rimuovi se esistono)
DO $$
BEGIN
    -- Rimuovi constraints esistenti se ci sono
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_drinking_frequency_check;
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_color_check;
    
    -- Aggiungi constraints nuovi
    ALTER TABLE profiles 
        ALTER COLUMN weight SET NOT NULL,
        ALTER COLUMN drinking_frequency SET NOT NULL,
        ADD CONSTRAINT profiles_gender_check CHECK (gender IN ('male', 'female')),
        ADD CONSTRAINT profiles_drinking_frequency_check CHECK (drinking_frequency IN ('rarely', 'occasionally', 'regularly', 'frequently')),
        ADD CONSTRAINT profiles_color_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
        
    RAISE NOTICE 'Constraints applicati';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Alcuni constraints potrebbero già esistere: %', SQLERRM;
END
$$;

-- STEP 7: INDICI OTTIMIZZATI
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_is_default_idx ON profiles(is_default) WHERE is_default = TRUE;

-- STEP 8: TRIGGER per updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- STEP 9: ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profiles" ON profiles;

-- Create standardized policies
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profiles_delete_own" ON profiles
    FOR DELETE USING (auth.uid() = user_id);

-- STEP 10: DOCUMENTAZIONE
COMMENT ON TABLE profiles IS 'Profili utente con dati fisici per calcolo BAC (schema snake_case standard)';
COMMENT ON COLUMN profiles.weight IS 'Peso in kilogrammi (snake_case)';
COMMENT ON COLUMN profiles.height IS 'Altezza in centimetri';  
COMMENT ON COLUMN profiles.drinking_frequency IS 'Frequenza di consumo alcol (snake_case)';
COMMENT ON COLUMN profiles.color IS 'Colore profilo in formato hex (snake_case)';
COMMENT ON COLUMN profiles.emoji IS 'Emoji identificativa del profilo (snake_case)';

-- STEP 11: LOG COMPLETAMENTO
INSERT INTO app_logs (level, message, category, created_at)
VALUES ('info', 'Schema profiles standardized to snake_case successfully (intelligent migration)', 'migration', NOW())
ON CONFLICT DO NOTHING;

-- STEP 12: REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =====================================
-- SCHEMA FINALE STANDARDIZZATO ✅
-- weight, drinking_frequency, color, emoji ✅
-- MIGRAZIONE INTELLIGENTE COMPLETATA ✅
-- ===================================== 