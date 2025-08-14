-- Rimuove le colonne duplicate aggiunte per errore
-- Usiamo le colonne esistenti 'color' e 'emoji'
ALTER TABLE profiles 
  DROP COLUMN IF EXISTS "profileColor",
  DROP COLUMN IF EXISTS "profileEmoji";

-- Verifica che le colonne originali esistano
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT '#00bcd7',
  ADD COLUMN IF NOT EXISTS "emoji" TEXT DEFAULT '🍷'; 