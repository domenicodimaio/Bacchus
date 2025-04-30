# Guida alla Migrazione del Database

## Aggiunta del campo `has_completed_wizard` alla tabella `profiles`

Per migliorare la persistenza dello stato di completamento del wizard del profilo, abbiamo implementato una soluzione che salva questo stato nel database Supabase invece di utilizzare solo lo storage locale.

## Istruzioni per l'Esecuzione Manuale della Migrazione

Se si desidera aggiungere manualmente la colonna `has_completed_wizard` al database, seguire queste istruzioni:

1. Accedere alla dashboard di Supabase (https://app.supabase.io/)
2. Selezionare il progetto AlcolTest
3. Navigare alla sezione "SQL Editor"
4. Creare una nuova query e incollare il seguente codice SQL:

```sql
-- Aggiungi la colonna has_completed_wizard se non esiste già
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "has_completed_wizard" BOOLEAN DEFAULT FALSE;

-- Crea un indice per velocizzare le query che filtrano per has_completed_wizard
CREATE INDEX IF NOT EXISTS profiles_has_completed_wizard_idx ON "public"."profiles"(has_completed_wizard);
```

5. Eseguire la query cliccando sul pulsante "Run"

## Note sulla Compatibilità

L'applicazione è progettata per funzionare indipendentemente dalla presenza di questa colonna nel database:

- Se la colonna `has_completed_wizard` è presente nel database, l'app utilizzerà quella per memorizzare lo stato del wizard.
- Se la colonna non esiste, l'app utilizzerà automaticamente AsyncStorage come fallback.

Questa soluzione garantisce la retrocompatibilità con installazioni esistenti e permette una migrazione graduale al nuovo sistema di storage.

## Verifica dell'Esecuzione della Migrazione

Per verificare che la migrazione sia stata eseguita correttamente, puoi eseguire la seguente query SQL:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'has_completed_wizard';
```

Se la migrazione è stata eseguita con successo, questa query restituirà una riga che indica che la colonna `has_completed_wizard` è di tipo BOOLEAN. 