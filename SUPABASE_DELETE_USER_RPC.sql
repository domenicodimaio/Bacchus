-- Funzione RPC per eliminare completamente un utente da Supabase
-- Da eseguire nell'SQL Editor di Supabase

CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica che l'utente che chiama la funzione sia lo stesso da eliminare
  IF auth.uid() != user_id_to_delete THEN
    RAISE EXCEPTION 'Non autorizzato a eliminare questo account';
  END IF;
  
  -- Elimina tutti i dati dell'utente dalle tabelle
  DELETE FROM public.sessions WHERE user_id = user_id_to_delete;
  DELETE FROM public.profiles WHERE user_id = user_id_to_delete;
  DELETE FROM public.app_logs WHERE user_id = user_id_to_delete;
  
  -- Elimina l'utente dalla tabella auth.users
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log dell'errore
    RAISE NOTICE 'Errore eliminazione account: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Concedi i permessi necessari
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
