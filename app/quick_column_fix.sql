-- Script di emergenza per aggiungere solo la colonna _k senza ricreare tutta la tabella

-- Aggiungi la colonna _k se non esiste
ALTER TABLE IF EXISTS "public"."profiles" 
ADD COLUMN IF NOT EXISTS "_k" TEXT;

-- Verifica che la colonna sia stata aggiunta
DO $$
BEGIN
  RAISE NOTICE 'Colonna _k aggiunta con successo alla tabella profiles';
END $$; 