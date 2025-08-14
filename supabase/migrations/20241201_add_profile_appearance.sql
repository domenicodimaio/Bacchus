-- Aggiunge i campi per la personalizzazione del profilo
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS "profileColor" VARCHAR(7) DEFAULT '#00bcd7',
  ADD COLUMN IF NOT EXISTS "profileEmoji" VARCHAR(10) DEFAULT '🍷';

-- Commenti per documentare i nuovi campi
COMMENT ON COLUMN profiles."profileColor" IS 'Colore selezionato dall''utente per il profilo (formato hex)';
COMMENT ON COLUMN profiles."profileEmoji" IS 'Emoji selezionata dall''utente per il profilo'; 