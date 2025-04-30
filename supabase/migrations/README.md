# Migrazioni del Database Bacchus

Questa cartella contiene le migrazioni SQL per il database Supabase di Bacchus.

## Problema di chiave esterna nelle sessioni

È stato riscontrato un problema con il vincolo di chiave estera `sessions_profile_id_fkey` che causava il seguente errore:

```
"(NOBRIDGE) ERROR Error saving session to Supabase: {"code": "23503", "details": "Key is not present in table \"profiles\".", "hint": null, "message": "insert or update on table \"sessions\" violates foreign key constraint \"sessions_profile_id_fkey\""}
```

## Soluzione

La migrazione `20240702_fix_sessions_structure.sql` risolve questo problema:

1. Elimina la tabella `sessions` esistente
2. Verifica che la tabella `profiles` abbia una chiave primaria
3. Ricrea la tabella `sessions` rimuovendo il vincolo di chiave esterna su `profile_id` ma mantenendo il campo
4. Configura indici, trigger e politiche di sicurezza

## Come applicare la migrazione

### Opzione 1: Tramite lo script Node.js

1. Assicurati di avere Node.js installato
2. Configura le variabili d'ambiente per Supabase:
   ```
   export SUPABASE_URL=https://tuo-progetto.supabase.co
   export SUPABASE_SERVICE_KEY=chiave-del-servizio
   ```
3. Esegui lo script:
   ```
   node scripts/apply_migration.js
   ```

### Opzione 2: Manualmente tramite l'Editor SQL di Supabase

1. Accedi alla dashboard di Supabase
2. Vai alla sezione "SQL Editor"
3. Crea una nuova query
4. Copia e incolla il contenuto del file `20240702_fix_sessions_structure.sql`
5. Esegui la query

### Opzione 3: Tramite Supabase CLI

Se hai installato la CLI di Supabase:

```
supabase db reset
```

## Verificare l'applicazione della migrazione

Dopo aver applicato la migrazione, puoi verificare la struttura della tabella eseguendo:

```sql
SELECT * FROM information_schema.tables WHERE table_name = 'sessions';
```

## Note importanti

Questa migrazione:
- **Elimina tutti i dati** dalla tabella `sessions` esistente
- Rimuove i vincoli di chiave esterna tra `sessions` e `profiles` 
- È una soluzione temporanea che consente il funzionamento dell'app, ma in futuro sarebbe preferibile ripristinare il vincolo di integrità referenziale

Se hai bisogno di mantenere i dati esistenti, contatta l'amministratore del database prima di applicare questa migrazione. 