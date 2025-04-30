# Istruzioni per il reset del database Bacchus

Questo file contiene le istruzioni necessarie per reimpostare il database dell'applicazione Bacchus, correggendo eventuali problemi strutturali e garantendo che le tabelle utilizzino i nomi delle colonne corretti.

## Prerequisiti

Assicurati di avere accesso amministrativo al tuo database Supabase prima di eseguire queste operazioni.

## Procedura di reset

1. Accedi alla dashboard di Supabase.
2. Vai alla sezione "SQL Editor".
3. Copia l'intero contenuto del file `reset_database.sql` e incollalo nell'editor SQL.
4. Prima di eseguire la query, esamina attentamente il codice per assicurarti che corrisponda alla struttura desiderata.
5. Esegui la query. Questo:
   - Eliminerà le tabelle esistenti se presenti
   - Creerà nuove tabelle con la struttura corretta
   - Imposterà indici, trigger e politiche di sicurezza
   - Definirà funzioni per la gestione delle sessioni

## Struttura delle tabelle

### Tabella `profiles`

La tabella principale che memorizza i profili utente con i seguenti campi:
- `id`: Identificatore univoco del profilo
- `user_id`: ID dell'utente Supabase
- `name`: Nome del profilo
- `gender`: Genere (male/female)
- `weightKg`: Peso in kg
- `age`: Età
- `height`: Altezza in cm
- `drinkingFrequency`: Frequenza di consumo (rarely/occasionally/regularly/frequently)
- `emoji`: Emoji del profilo (opzionale)
- `color`: Colore del profilo (opzionale)
- `is_default`: Indica se è il profilo predefinito
- `created_at`: Data di creazione
- `updated_at`: Data di ultimo aggiornamento

### Tabella `user_sessions`

Memorizza le sessioni di utilizzo dell'app:
- `id`: ID univoco della sessione
- `user_id`: ID dell'utente
- `profile_id`: ID del profilo utilizzato
- `start_time`: Orario di inizio
- `end_time`: Orario di fine (quando la sessione viene terminata)
- `status`: Stato della sessione (active/completed/cancelled)

### Tabella `profile_history`

Registra le modifiche ai profili:
- `id`: ID univoco della modifica
- `profile_id`: ID del profilo modificato
- `user_id`: ID dell'utente
- `change_type`: Tipo di modifica (create/update/delete)
- `changes`: JSON con i cambiamenti

## Note importanti

- **ATTENZIONE**: L'esecuzione di questo script eliminerà tutti i dati esistenti nelle tabelle menzionate.
- Assicurati di avere un backup del database prima di procedere, se contiene dati che vuoi conservare.
- Dopo l'esecuzione delle query, potrebbe essere necessario ricreareì i dati degli utenti. 