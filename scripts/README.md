# Script di Inizializzazione Database Bacchus

Questa directory contiene gli script necessari per inizializzare il database dell'applicazione Bacchus.

## Prerequisiti

Prima di eseguire gli script, assicurati di avere:

1. Node.js e npm installati
2. Un progetto Supabase attivo
3. Le credenziali di accesso al database Supabase (URL, chiave anonima e chiave di servizio)
4. TypeScript e ts-node installati globalmente o localmente nel progetto

## Configurazione

1. Crea un file `.env` nella root del progetto con le seguenti variabili:

```
EXPO_PUBLIC_SUPABASE_URL=https://tuo-progetto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=chiave-anonima-pubblica
SUPABASE_SERVICE_KEY=chiave-servizio-privata
```

## Script Disponibili

### 1. Inizializzazione del Database

Lo script `seed-database.ts` crea le tabelle necessarie e inserisce dati di esempio nel database.

Per eseguire lo script:

```bash
npx ts-node scripts/seed-database.ts
```

Questo script eseguirà le seguenti operazioni:

- Creazione delle tabelle necessarie (se non esistono già)
- Inserimento delle categorie di bevande
- Inserimento delle bevande standard
- Creazione delle stored procedures e funzioni SQL

### 2. SQL Queries

La directory `sql/` contiene le query SQL utilizzate per creare le tabelle e le funzioni nel database:

- `create-tables.sql`: Contiene le stored procedure per la creazione delle tabelle

## Struttura del Database

Il database è composto dalle seguenti tabelle:

1. **drink_categories**: Categorie di bevande (es. Birra, Vino, Cocktail)
2. **standard_drinks**: Bevande standard predefinite
3. **user_profiles**: Profili utente con informazioni personali
4. **drinking_sessions**: Sessioni di consumo di bevande
5. **drink_consumptions**: Singoli consumi di bevande

## Funzioni SQL

Lo script crea anche alcune funzioni SQL utili:

- `calculate_bac`: Calcola il tasso alcolemico (BAC) in base al peso, genere, grammi di alcol e tempo trascorso
- `set_updated_at_timestamp`: Aggiorna automaticamente il campo `updated_at` quando un record viene modificato
- `execute_sql`: Permette di eseguire query SQL dinamiche

## Risoluzione dei Problemi

Se incontri problemi durante l'esecuzione degli script:

1. Verifica che le credenziali Supabase siano corrette
2. Assicurati di avere i permessi necessari per creare tabelle e funzioni
3. Controlla i log per eventuali errori specifici

Per ulteriori informazioni, consulta la documentazione di Supabase: https://supabase.io/docs 