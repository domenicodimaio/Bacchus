-- MIGRAZIONE FINALE DI STANDARDIZZAZIONE
-- Data: 2025-01-26
-- Standardizza la tabella profiles con campi unificati

-- Step 1: Rimuove colonne inconsistenti se esistono
ALTER TABLE profiles DROP COLUMN IF EXISTS "profileColor";
ALTER TABLE profiles DROP COLUMN IF EXISTS "profileEmoji";
ALTER TABLE profiles DROP COLUMN IF EXISTS "_h";
ALTER TABLE profiles DROP COLUMN IF EXISTS "_i";
ALTER TABLE profiles DROP COLUMN IF EXISTS "_j";
ALTER TABLE profiles DROP COLUMN IF EXISTS "_k";

-- Step 2: Aggiunge i campi standardizzati
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT '#00bcd7',
  ADD COLUMN IF NOT EXISTS "emoji" TEXT DEFAULT '🍷';

-- Step 3: Commenti per documentazione
COMMENT ON COLUMN profiles."color" IS 'Colore selezionato dall''utente per il profilo (formato hex)';
COMMENT ON COLUMN profiles."emoji" IS 'Emoji selezionata dall''utente per il profilo';

-- Step 4: Aggiorna record esistenti che potrebbero avere valori NULL
UPDATE profiles 
SET 
  color = COALESCE(color, '#00bcd7'),
  emoji = COALESCE(emoji, '🍷')
WHERE color IS NULL OR emoji IS NULL; 