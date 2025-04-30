-- SCRIPT DI PULIZIA TOTALE
-- Questo script elimina tutte le sessioni attive e rimuove le associazioni di autenticazione

-- 1. Elimina tutte le sessioni attualmente attive per tutti gli utenti
DELETE FROM auth.sessions;

-- 2. Pulizia della tabella profili (opzionale - rimuovere il commento se necessario)
-- DELETE FROM public.profiles;

-- 3. Aggiungiamo un trigger per impedire la creazione di profili con ID null
CREATE OR REPLACE FUNCTION ensure_profile_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id = CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS TEXT);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_profile_id_trigger ON public.profiles;
CREATE TRIGGER ensure_profile_id_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION ensure_profile_id(); 